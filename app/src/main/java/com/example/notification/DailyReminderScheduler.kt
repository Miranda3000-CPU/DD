package com.example.notification

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.example.util.UserPreferencesManager
import java.time.LocalDateTime
import java.time.ZoneId

object DailyReminderScheduler {
    private const val ACTION_DAILY_REMINDER = "com.example.action.DD_DAILY_REMINDER"
    private const val REQUEST_CODE = 6306

    fun schedule(context: Context, hour: Int, minute: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = pendingIntent(context)
        val now = LocalDateTime.now()
        var next = now.toLocalDate().atTime(hour, minute)
        if (!next.isAfter(now)) next = next.plusDays(1)
        val firstTrigger = next.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setInexactRepeating(
                AlarmManager.RTC_WAKEUP,
                firstTrigger,
                AlarmManager.INTERVAL_DAY,
                pendingIntent,
            )
        } else {
            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                firstTrigger,
                AlarmManager.INTERVAL_DAY,
                pendingIntent,
            )
        }
    }

    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context))
    }

    fun rescheduleFromPreferences(context: Context) {
        if (!UserPreferencesManager.isNotificationsEnabled(context) ||
            !UserPreferencesManager.isNotifyDailyReminder(context)
        ) return
        val (hour, minute) = UserPreferencesManager.getNotificationTime(context)
        schedule(context, hour, minute)
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, DailyReminderReceiver::class.java).setAction(ACTION_DAILY_REMINDER)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    internal fun isDailyReminderAction(intent: Intent?): Boolean =
        intent?.action == ACTION_DAILY_REMINDER
}

class DailyReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            DailyReminderScheduler.rescheduleFromPreferences(context)
            CyclePredictionScheduler.rescheduleFromPreferences(context)
            return
        }
        if (!DailyReminderScheduler.isDailyReminderAction(intent)) return
        if (!UserPreferencesManager.isNotificationsEnabled(context) ||
            !UserPreferencesManager.isNotifyDailyReminder(context)
        ) return

        NotificationHelper.showNotification(
            context = context,
            title = "DD • Diário Dela",
            message = "Bom dia! Reserve um momento para registrar como você está se sentindo.",
            channelId = NotificationHelper.CHANNEL_REMINDERS,
            notificationId = NotificationHelper.NOTIFICATION_ID_REMINDER,
        )
    }
}
