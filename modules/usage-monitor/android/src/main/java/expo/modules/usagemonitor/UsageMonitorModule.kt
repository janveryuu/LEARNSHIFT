package expo.modules.usagemonitor

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.util.Calendar

class UsageMonitorModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun launch(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val activity = appContext.currentActivity
    if (activity != null) activity.startActivity(intent) else ctx.startActivity(intent)
  }

  override fun definition() = ModuleDefinition {
    Name("UsageMonitor")

    Function("hasUsageAccess") { Perms.hasUsageAccess(ctx) }

    Function("openUsageAccessSettings") {
      // Some phones open straight to LearnShift's switch with the package URI.
      try {
        launch(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
      } catch (_: Exception) {
        launch(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
      }
    }

    Function("canDrawOverlays") { Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx) }

    Function("openOverlaySettings") {
      launch(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${ctx.packageName}")))
    }

    Function("isIgnoringBatteryOptimizations") {
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    Function("openBatterySettings") {
      try {
        @Suppress("BatteryLife")
        launch(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${ctx.packageName}")))
      } catch (_: Exception) {
        launch(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      }
    }

    Function("openAppSettings") {
      launch(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
    }

    Function("deviceBrand") { "${Build.MANUFACTURER}".lowercase() }

    /** True when break reminders can actually pop up on this phone. */
    Function("notificationsEnabled") { Notifier.breaksEnabled(ctx) }

    Function("openNotificationSettings") {
      try {
        launch(
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName),
        )
      } catch (_: Exception) {
        launch(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${ctx.packageName}")))
      }
    }

    /** Saves the config and starts or stops the background monitor to match. */
    Function("configure") { json: String ->
      Store.saveConfig(ctx, json)
      val cfg = Store.config(ctx)
      if (cfg.enabled && Perms.hasUsageAccess(ctx)) MonitorService.start(ctx) else MonitorService.stop(ctx)
      MonitorService.running || (cfg.enabled && Perms.hasUsageAccess(ctx))
    }

    Function("isRunning") { MonitorService.running }

    /** The session happening right now (for the Home screen's live gauge and risk chip). */
    AsyncFunction("getLive") {
      if (!Perms.hasUsageAccess(ctx)) return@AsyncFunction null
      val live = Tracker(ctx).update(System.currentTimeMillis())
      mapOf(
        "category" to live.cat.js,
        "sessionMinutes" to live.sessionMin,
        "unlocksLastHour" to live.unlocksLastHour,
      )
    }

    /** Daily totals, today first. */
    AsyncFunction("getDays") { count: Int ->
      if (!Perms.hasUsageAccess(ctx)) return@AsyncFunction emptyList<Map<String, Any?>>()
      val cfg = Store.config(ctx)
      (0 until count.coerceIn(1, 14)).map { d ->
        val s = Days.summary(ctx, d, cfg)
        mapOf(
          "day" to s.day,
          "total" to s.total,
          "video" to s.video,
          "social" to s.social,
          "games" to s.games,
          "late" to s.late,
          "sessions" to s.sessions,
          "unlocks" to s.unlocks,
          "offAt" to s.offAt,
        )
      }
    }

    /** Sends queued events and today's totals now. */
    AsyncFunction("reportNow") {
      Reporter.report(ctx, Store.config(ctx), true)
    }

    /** Debug info for the in-app status screen. */
    Function("status") {
      val q = Store.queue(ctx)
      mapOf(
        "running" to MonitorService.running,
        "queued" to q.length(),
        "lastReport" to Store.getLong(ctx, "lastReport"),
        "lastNudge" to Store.getLong(ctx, "lastNudge"),
        "lastNotifyFailed" to Store.getLong(ctx, "lastNotifyFailed"),
        "notifications" to Notifier.breaksEnabled(ctx),
      )
    }

    /** Fires a sample nudge so a tester can see what it looks like. */
    Function("testNudge") { level: String ->
      val cfg = Store.config(ctx)
      val c = Calendar.getInstance()
      val clock = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
      Notifier.channels(ctx)
      Notifier.nudge(ctx, cfg, level, "test-${System.currentTimeMillis().toString(36)}", Cat.VIDEO, 45, clock, 20)
    }

    Function("lastConfig") { JSONObject(Store.getString(ctx, "config") ?: "{}").toString() }
  }
}
