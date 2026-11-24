package app.forjapp.shell

import com.google.firebase.messaging.FirebaseMessaging

@Suppress("unused") // Loaded by reflection from MainActivity
class FirebasePushProvider : PushProvider {
    override fun getToken(onResult: (ok: Boolean, value: String) -> Unit) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) onResult(true, task.result ?: "")
            else onResult(false, task.exception?.message ?: "No se pudo obtener el token")
        }
    }
}
