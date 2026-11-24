package app.forjapp.shell

/** Implemented in src/push (only compiled when push notifications are enabled). */
interface PushProvider {
    fun getToken(onResult: (ok: Boolean, value: String) -> Unit)
}
