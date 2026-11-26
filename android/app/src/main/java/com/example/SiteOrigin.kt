package com.example

internal object SiteOrigin {
    private const val HOST = "dd.jeielmiranda.com.br"
    const val URL = "https://$HOST"

    fun accepts(scheme: String?, host: String?, port: Int): Boolean =
        scheme.equals("https", ignoreCase = true) &&
            host.equals(HOST, ignoreCase = true) &&
            (port == -1 || port == 443)
}
