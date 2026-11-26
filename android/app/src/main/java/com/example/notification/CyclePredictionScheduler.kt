package com.example.notification

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.example.util.UserPreferencesManager
import java.time.LocalDate
import java.time.ZoneId

/**
 * Maintains a single one-shot native alert three days before the forecast date.
 * The stored forecast is re-applied after reboot; the website remains the
 * source of truth and updates it whenever the cycle data changes.
 */
object CyclePredictionScheduler {
    private const val REQUEST_CODE = NotificationHelper.ALARM_REQUEST_PREDICTION
    private const val PREFS_NAME = "dd_webview_bridge"
    private const val KEY_NEXT_PERIOD_DATE = "next_period_date"

    fun schedule(context: Context, nextPeriodDate: LocalDate?) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_NEXT_PERIOD_DATE, nextPeriodDate?.toString())
            .apply()
        scheduleStoredDate(context, nextPeriodDate)
    }

    fun cancel(context: Context, clearSavedDate: Boolean = true) {
        cancelAlarm(context)
        if (clearSavedDate) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_NEXT_PERIOD_DATE)
                .apply()
        }
    }

    fun rescheduleFromPreferences(context: Context) {
        val stored = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_NEXT_PERIOD_DATE, null)
        val nextPeriodDate = runCatching { stored?.let { LocalDate.parse(it) } }.getOrNull()
        scheduleStoredDate(context, nextPeriodDate)
    }

    private fun scheduleStoredDate(context: Context, nextPeriodDate: LocalDate?) {
        cancelAlarm(context)
        if (!UserPreferencesManager.isNotificationsEnabled(context) ||
            !UserPreferencesManager.isNotify3DaysBefore(context) ||
            nextPeriodDate == null
        ) return

        val reminderDate = nextPeriodDate.minusDays(3)
        val today = LocalDate.now()
        if (!reminderDate.isAfter(today)) return

        val (hour, minute) = UserPreferencesManager.getNotificationTime(context)
        val triggerAtMillis = reminderDate.atTime(hour, minute)
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli()

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = createPendingIntent(context, PendingIntent.FLAG_UPDATE_CURRENT) ?: return

        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pendingIntent,
        )
    }

    private fun cancelAlarm(context: Context) {
        val existing = createPendingIntent(context, PendingIntent.FLAG_NO_CREATE) ?: return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(existing)
        existing.cancel()
    }

    private fun createPendingIntent(context: Context, flag: Int): PendingIntent? {
        val intent = Intent(context, CycleAlarmReceiver::class.java).apply {
            putExtra("title", "🌷 Previsão do Ciclo")
            putExtra("message", "Sua próxima menstruação está prevista para daqui a 3 dias.")
            putExtra("channelId", NotificationHelper.CHANNEL_PREDICTIONS)
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            flag or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
