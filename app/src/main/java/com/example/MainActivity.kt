package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.lifecycle.lifecycleScope
import com.example.data.AppDatabase
import com.example.notification.CyclePredictionScheduler
import com.example.notification.DailyReminderScheduler
import com.example.notification.NotificationHelper
import com.example.util.UserPreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.LocalDate
import java.util.Base64

/**
 * Android shell for the DD website.
 *
 * The website is the single UI and application-logic implementation. Native
 * capabilities are exposed only to the exact HTTPS production origin through
 * WebViewCompat's origin-allowlisted WebMessage API.
 */
class MainActivity : ComponentActivity() {

    companion object {
        private const val APP_HOST = "dd.jeielmiranda.com.br"
        private const val APP_ORIGIN = "https://dd.jeielmiranda.com.br"
        private const val APP_URL = "$APP_ORIGIN/"
        private const val BRIDGE_NAME = "ddAndroid"
        private const val BRIDGE_PREFS = "dd_webview_bridge"
        private const val KEY_LEGACY_MIGRATION_COMPLETE = "legacy_migration_completed"
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionReply: PendingReply? = null
    private var pendingSave: PendingSave? = null

    private data class PendingReply(
        val id: String,
        val proxy: androidx.webkit.JavaScriptReplyProxy,
    )

    private data class PendingSave(
        val id: String,
        val proxy: androidx.webkit.JavaScriptReplyProxy,
        val filename: String,
        val bytes: ByteArray,
    )

    private val filePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        fileChooserCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileChooserCallback = null
    }

    private val createBackupFile = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/octet-stream")
    ) { uri ->
        val pending = pendingSave ?: return@registerForActivityResult
        pendingSave = null
        if (uri == null) {
            reply(pending.proxy, pending.id, ok = false, error = "Exportação cancelada.")
            return@registerForActivityResult
        }

        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    contentResolver.openOutputStream(uri)?.use { it.write(pending.bytes) }
                        ?: error("Não foi possível abrir o destino do arquivo.")
                }
            }
            result.onSuccess {
                reply(pending.proxy, pending.id, ok = true, data = JSONObject().put("saved", true))
            }.onFailure {
                reply(pending.proxy, pending.id, ok = false, error = "Não foi possível salvar o backup.")
            }
        }
    }

    private val requestNotifications = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val pending = pendingPermissionReply
        pendingPermissionReply = null
        if (pending != null) {
            val enabled = granted && androidx.core.app.NotificationManagerCompat
                .from(this).areNotificationsEnabled()
            reply(
                pending.proxy,
                pending.id,
                ok = true,
                data = JSONObject().put("granted", enabled),
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        NotificationHelper.createNotificationChannels(applicationContext)
        buildWebView()
        registerNativeBridge()
        configureBackNavigation()

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun buildWebView() {
        val container = FrameLayout(this)
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                mediaPlaybackRequiresUserGesture = true
                builtInZoomControls = false
                displayZoomControls = false
                loadsImagesAutomatically = true
                textZoom = 100
            }
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (3 * resources.displayMetrics.density).toInt().coerceAtLeast(2),
            )
            visibility = View.VISIBLE
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?,
            ): Boolean {
                val uri = request?.url ?: return true
                if (uri.scheme == "https" &&
                    uri.host.equals(APP_HOST, ignoreCase = true) &&
                    (uri.port == -1 || uri.port == 443)
                ) {
                    return false
                }
                openExternalLink(uri)
                return true
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?,
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                return try {
                    filePicker.launch(arrayOf("*/*"))
                    true
                } catch (_: Exception) {
                    fileChooserCallback = null
                    false
                }
            }
        }

        container.addView(webView)
        container.addView(progressBar)
        setContentView(container)

        if (WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_ENABLE)) {
            WebSettingsCompatBridge.enableSafeBrowsing(webView)
        }
    }

    private fun registerNativeBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            // The Web app detects the missing bridge and keeps its browser fallback.
            return
        }

        WebViewCompat.addWebMessageListener(
            webView,
            BRIDGE_NAME,
            setOf(APP_ORIGIN),
        ) { _, message, sourceOrigin, isMainFrame, replyProxy ->
            if (!isMainFrame ||
                sourceOrigin.scheme != "https" ||
                !sourceOrigin.host.equals(APP_HOST, ignoreCase = true) ||
                (sourceOrigin.port != -1 && sourceOrigin.port != 443)
            ) {
                return@addWebMessageListener
            }

            val request = runCatching { JSONObject(message.data ?: "") }.getOrNull()
            if (request == null) {
                reply(replyProxy, "", ok = false, error = "Solicitação inválida.")
                return@addWebMessageListener
            }

            val id = request.optString("id")
            val action = request.optString("action")
            val payload = request.optJSONObject("payload") ?: JSONObject()
            if (id.isBlank()) {
                reply(replyProxy, "", ok = false, error = "Identificador ausente.")
                return@addWebMessageListener
            }

            handleBridgeRequest(id, action, payload, replyProxy)
        }
    }

    private fun handleBridgeRequest(
        id: String,
        action: String,
        payload: JSONObject,
        proxy: androidx.webkit.JavaScriptReplyProxy,
    ) {
        when (action) {
            "getLegacyData" -> {
                lifecycleScope.launch {
                    val data = withContext(Dispatchers.IO) { readLegacyData() }
                    reply(proxy, id, ok = true, data = data)
                }
            }

            "completeLegacyMigration" -> {
                getSharedPreferences(BRIDGE_PREFS, MODE_PRIVATE)
                    .edit().putBoolean(KEY_LEGACY_MIGRATION_COMPLETE, true).apply()
                reply(proxy, id, ok = true, data = JSONObject().put("completed", true))
            }

            "requestNotificationPermission" -> requestNotificationAccess(id, proxy)

            "setNotificationsEnabled" -> {
                val enabled = payload.optBoolean("enabled", false)
                UserPreferencesManager.setNotificationsEnabled(this, enabled)
                if (!enabled) {
                    UserPreferencesManager.setNotifyDailyReminder(this, false)
                    DailyReminderScheduler.cancel(this)
                    CyclePredictionScheduler.cancel(this)
                }
                reply(proxy, id, ok = true, data = JSONObject().put("enabled", enabled))
            }

            "setDailyReminder" -> {
                val enabled = payload.optBoolean("enabled", false)
                val hour = payload.optInt("hour", 6).coerceIn(0, 23)
                val minute = payload.optInt("minute", 0).coerceIn(0, 59)
                UserPreferencesManager.setNotificationTime(this, hour, minute)
                UserPreferencesManager.setNotifyDailyReminder(this, enabled)
                if (enabled && UserPreferencesManager.isNotificationsEnabled(this)) {
                    DailyReminderScheduler.schedule(this, hour, minute)
                } else {
                    DailyReminderScheduler.cancel(this)
                }
                reply(proxy, id, ok = true, data = JSONObject().put("enabled", enabled))
            }

            "scheduleCyclePrediction" -> {
                val dateText = payload.optString("nextPeriodDate").takeIf { it.isNotBlank() }
                val nextPeriodDate = if (dateText == null) {
                    null
                } else {
                    runCatching { LocalDate.parse(dateText) }.getOrNull()
                }
                if (dateText != null && nextPeriodDate == null) {
                    reply(proxy, id, ok = false, error = "Data de previsão inválida.")
                    return
                }
                CyclePredictionScheduler.schedule(this, nextPeriodDate)
                reply(proxy, id, ok = true, data = JSONObject().put("scheduled", nextPeriodDate != null))
            }

            "showNotification" -> {
                if (!areNotificationsAvailable()) {
                    reply(proxy, id, ok = false, error = "Notificações não autorizadas pelo Android.")
                    return
                }
                NotificationHelper.showNotification(
                    context = this,
                    title = payload.optString("title", "DD • Diário Dela"),
                    message = payload.optString("body", "Você tem um lembrete do Diário Dela."),
                    channelId = NotificationHelper.CHANNEL_REMINDERS,
                    notificationId = NotificationHelper.NOTIFICATION_ID_REMINDER,
                )
                reply(proxy, id, ok = true, data = JSONObject().put("shown", true))
            }

            "saveFile" -> saveNativeFile(id, payload, proxy)

            else -> reply(proxy, id, ok = false, error = "Recurso nativo não reconhecido.")
        }
    }

    private fun requestNotificationAccess(
        id: String,
        proxy: androidx.webkit.JavaScriptReplyProxy,
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            reply(
                proxy,
                id,
                ok = true,
                data = JSONObject().put("granted", areNotificationsAvailable()),
            )
            return
        }

        pendingPermissionReply = PendingReply(id, proxy)
        requestNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun areNotificationsAvailable(): Boolean =
        (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED) &&
            androidx.core.app.NotificationManagerCompat.from(this).areNotificationsEnabled()

    private fun readLegacyData(): JSONObject {
        val completed = getSharedPreferences(BRIDGE_PREFS, MODE_PRIVATE)
            .getBoolean(KEY_LEGACY_MIGRATION_COMPLETE, false)
        if (completed) {
            return JSONObject()
                .put("migrated", true)
                .put("cycles", org.json.JSONArray())
                .put("dailyLogs", org.json.JSONArray())
                .put("preferences", JSONObject())
                .put("userName", "")
        }

        val database = AppDatabase.getDatabase(applicationContext)
        val cycles = database.cycleDao().getAllCyclesSync()
        val logs = database.dailyLogDao().getAllDailyLogsSync()
        val preferences = UserPreferencesManager.getAllPreferencesMap(applicationContext).toMutableMap()
        preferences.putIfAbsent(
            "notifications_enabled",
            UserPreferencesManager.isNotificationsEnabled(applicationContext).toString(),
        )
        preferences.putIfAbsent(
            "notify_daily_reminder",
            UserPreferencesManager.isNotifyDailyReminder(applicationContext).toString(),
        )

        val cycleArray = org.json.JSONArray()
        cycles.forEach { cycle ->
            cycleArray.put(
                JSONObject()
                    .put("uuid", cycle.uuid)
                    .put("startDate", LocalDate.ofEpochDay(cycle.startDateEpochDay).toString())
                    .put("periodLengthDays", cycle.periodLengthDays)
                    .put("flowIntensity", cycle.flowIntensity)
                    .put("symptoms", cycle.symptoms)
                    .put("notes", cycle.notes)
                    .put("createdAtEpochMilli", cycle.createdAtEpochMilli)
                    .put("updatedAtEpochMilli", cycle.updatedAtEpochMilli),
            )
        }

        val logArray = org.json.JSONArray()
        logs.forEach { log ->
            logArray.put(
                JSONObject()
                    .put("uuid", log.uuid)
                    .put("date", LocalDate.ofEpochDay(log.dateEpochDay).toString())
                    .put("flowIntensity", log.flowIntensity ?: JSONObject.NULL)
                    .put("painLevel", log.painLevel ?: JSONObject.NULL)
                    .put("symptoms", log.symptoms)
                    .put("mood", log.mood ?: JSONObject.NULL)
                    .put("energyLevel", log.energyLevel ?: JSONObject.NULL)
                    .put("sleepQuality", log.sleepQuality ?: JSONObject.NULL)
                    .put("cervicalMucus", log.cervicalMucus ?: JSONObject.NULL)
                    .put("notes", log.notes)
                    .put("createdAtEpochMilli", log.createdAtEpochMilli)
                    .put("updatedAtEpochMilli", log.updatedAtEpochMilli),
            )
        }

        val preferenceJson = JSONObject()
        preferences.forEach { (key, value) -> preferenceJson.put(key, value) }

        return JSONObject()
            .put("migrated", false)
            .put("cycles", cycleArray)
            .put("dailyLogs", logArray)
            .put("preferences", preferenceJson)
            .put("userName", UserPreferencesManager.getUserName(applicationContext))
    }

    private fun saveNativeFile(
        id: String,
        payload: JSONObject,
        proxy: androidx.webkit.JavaScriptReplyProxy,
    ) {
        val filename = payload.optString("filename", "diario-dela.ddwebbackup")
            .substringAfterLast('/')
            .substringAfterLast('\\')
            .ifBlank { "diario-dela.ddwebbackup" }
        val encoded = payload.optString("base64")
        val bytes = runCatching { Base64.getDecoder().decode(encoded) }.getOrNull()
        if (bytes == null) {
            reply(proxy, id, ok = false, error = "Conteúdo do backup inválido.")
            return
        }

        pendingSave = PendingSave(id, proxy, filename, bytes)
        createBackupFile.launch(filename)
    }

    private fun reply(
        proxy: androidx.webkit.JavaScriptReplyProxy,
        id: String,
        ok: Boolean,
        data: JSONObject? = null,
        error: String? = null,
    ) {
        val response = JSONObject()
            .put("id", id)
            .put("ok", ok)
        if (data != null) response.put("data", data)
        if (error != null) response.put("error", error)
        runCatching { proxy.postMessage(response.toString()) }
    }

    private fun openExternalLink(uri: Uri) {
        if (uri.scheme !in setOf("https", "http", "mailto", "tel")) return
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) webView.goBack()
                else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        if (::webView.isInitialized) {
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.destroy()
        }
        super.onDestroy()
    }

    private object WebSettingsCompatBridge {
        fun enableSafeBrowsing(view: WebView) {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_ENABLE)) {
                androidx.webkit.WebSettingsCompat.setSafeBrowsingEnabled(view.settings, true)
            }
        }
    }
}
