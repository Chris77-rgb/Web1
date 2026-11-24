package app.forjapp.shell

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Hosts the Forjapp runtime (assets/www) in a WebView served from a secure
 * virtual origin, and exposes a small native bridge (`ForjappNative`).
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var container: FrameLayout
    private var customView: View? = null
    private val io = Executors.newFixedThreadPool(4)
    private var pendingPushCallback: String? = null

    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private const val START_URL = "https://$HOST/assets/www/index.html"
        private const val MAX_BYTES = 5 * 1024 * 1024
        private const val REQ_NOTIFICATIONS = 42
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        container = FrameLayout(this)
        webView = WebView(this)
        container.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(container)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }
        webView.addJavascriptInterface(Bridge(), "ForjappNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                if (!request.isForMainFrame) return false
                openExternal(request.url.toString())
                return true
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                customView = view
                container.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                webView.visibility = View.GONE
            }

            override fun onHideCustomView() {
                customView?.let { container.removeView(it) }
                customView = null
                webView.visibility = View.VISIBLE
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (customView != null) {
                    webView.webChromeClient?.onHideCustomView()
                    return
                }
                webView.evaluateJavascript("(window.forjappBack && window.forjappBack()) ? 'y' : 'n'") { result ->
                    if (result?.contains("y") != true) {
                        if (webView.canGoBack()) webView.goBack() else finish()
                    }
                }
            }
        })

        if (savedInstanceState == null) webView.loadUrl(START_URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        io.shutdownNow()
        webView.destroy()
        super.onDestroy()
    }

    private fun openExternal(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) { /* no app can handle it */ }
    }

    private fun callback(id: String, ok: Boolean, body: String) {
        val js = "window.__forjappCallback && window.__forjappCallback(${JSONObject.quote(id)}, $ok, ${JSONObject.quote(body)})"
        runOnUiThread { webView.evaluateJavascript(js, null) }
    }

    private fun requestPushToken(id: String) {
        if (!BuildConfig.PUSH_ENABLED) {
            callback(id, false, "Las notificaciones push no están configuradas en esta app.")
            return
        }
        try {
            val provider = Class.forName("app.forjapp.shell.FirebasePushProvider").getDeclaredConstructor().newInstance() as PushProvider
            provider.getToken { ok, value -> callback(id, ok, value) }
        } catch (e: Exception) {
            callback(id, false, e.message ?: "Error de notificaciones")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_NOTIFICATIONS) return
        val id = pendingPushCallback ?: return
        pendingPushCallback = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) requestPushToken(id)
        else callback(id, false, "Permiso de notificaciones denegado")
    }

    /** Methods callable from JavaScript as window.ForjappNative.* */
    inner class Bridge {
        @JavascriptInterface
        fun platform(): String = "android"

        @JavascriptInterface
        fun openExternal(url: String) {
            val scheme = Uri.parse(url).scheme?.lowercase()
            if (scheme in setOf("http", "https", "tel", "mailto", "geo", "whatsapp")) runOnUiThread { this@MainActivity.openExternal(url) }
        }

        @JavascriptInterface
        fun httpGet(url: String, callbackId: String) {
            io.execute {
                try {
                    val u = URL(url)
                    require(u.protocol == "https" || u.protocol == "http") { "Protocolo no permitido" }
                    var conn = u.openConnection() as HttpURLConnection
                    var redirects = 0
                    while (true) {
                        conn.connectTimeout = 10000
                        conn.readTimeout = 15000
                        conn.instanceFollowRedirects = false
                        conn.setRequestProperty("User-Agent", "ForjappApp/1.0 (Android)")
                        val code = conn.responseCode
                        if (code in 300..399 && redirects < 5) {
                            val next = URL(u, conn.getHeaderField("Location"))
                            conn.disconnect()
                            conn = next.openConnection() as HttpURLConnection
                            redirects++
                            continue
                        }
                        if (code !in 200..299) throw IllegalStateException("HTTP $code")
                        break
                    }
                    val out = ByteArrayOutputStream()
                    conn.inputStream.use { input ->
                        val buf = ByteArray(16 * 1024)
                        while (true) {
                            val n = input.read(buf)
                            if (n < 0) break
                            out.write(buf, 0, n)
                            if (out.size() > MAX_BYTES) throw IllegalStateException("Respuesta demasiado grande")
                        }
                    }
                    callback(callbackId, true, out.toString("UTF-8"))
                } catch (e: Exception) {
                    callback(callbackId, false, e.message ?: "Error de red")
                }
            }
        }

        @JavascriptInterface
        fun enablePush(callbackId: String) {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= 33 &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                ) {
                    pendingPushCallback = callbackId
                    ActivityCompat.requestPermissions(this@MainActivity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTIFICATIONS)
                } else {
                    requestPushToken(callbackId)
                }
            }
        }
    }
}
