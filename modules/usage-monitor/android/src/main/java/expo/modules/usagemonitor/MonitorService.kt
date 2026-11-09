package expo.modules.usagemonitor

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.roundToInt

/**
 * The doomscroll detector. Every few seconds it reads which app is in front,
 * scores the session with the same risk model as the app, and — within
 * guardrails and cooldowns — posts a study nudge, a wind-down, or brings up
 * the guardian lock. Everything it decides is reported to the server.
 */
class MonitorService : Service() {
  private var thread: HandlerThread? = null
  private var handler: Handler? = null
  private var tracker: Tracker? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val cfg = Store.config(this)
    Notifier.channels(this)
    try {
      ServiceCompat.startForeground(
        this,
        Notifier.MONITOR_ID,
        Notifier.monitor(this, cfg),
        if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
      )
    } catch (e: Exception) {
      Log.w(TAG, "could not start in foreground: ${e.message}")
      stopSelf()
      return START_NOT_STICKY
    }
    if (thread == null) {
      thread = HandlerThread("learnshift-monitor").also { it.start() }
      handler = Handler(thread!!.looper)
      tracker = Tracker(this)
      running = true
      handler!!.post(tick)
    }
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    handler?.removeCallbacksAndMessages(null)
    thread?.quitSafely()
    thread = null
    handler = null
    super.onDestroy()
  }

  private val tick: Runnable = object : Runnable {
    override fun run() {
      val next = try {
        step()
      } catch (e: Exception) {
        Log.w(TAG, "tick failed: ${e.message}")
        30_000L
      }
      if (next < 0) {
        stopSelf()
        return
      }
      handler?.postDelayed(this, next)
    }
  }

  /** One detection pass. Returns the delay until the next pass, or -1 to stop. */
  private fun step(): Long {
    val cfg = Store.config(this)
    if (!cfg.enabled || !Perms.hasUsageAccess(this)) return -1
    val now = System.currentTimeMillis()
    val live = tracker!!.update(now)
    val cal = Calendar.getInstance()
    val clock = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
    val schoolDay = Schedule.schoolDay(cal)
    val inBed = Schedule.bedtimeApplies(cfg, clock) && Schedule.inWindow(clock, cfg.bedtimeStart, cfg.bedtimeEnd)
    val lockWindow = cfg.lockEnabled && Schedule.inWindow(clock, cfg.lockStart, cfg.lockEnd)
    val locked = lockWindow && now > cfg.unlockUntil
    val mine = live.pkg == packageName

    maybeReport(cfg, now)

    // 1. Guardian lock: a blocked app in front during lock hours.
    if (locked && live.cat.distracting && !mine) {
      if (canOverlay()) openLock()
      else if (now - Store.getLong(this, "lastLockNotice") > 60_000L) {
        Notifier.nudge(this, cfg, "lock", "lock", live.cat, 0, clock, 0)
        Store.putLong(this, "lastLockNotice", now)
      }
      if (now - Store.getLong(this, "lastLockEvent") > 30 * 60_000L) {
        record(cfg, "lock", Risk.reasons(clock, live.sessionMin, live.cat, live.unlocksLastHour, schoolDay, true), "locked", clock, 0)
        Store.putLong(this, "lastLockEvent", now)
      }
      return 2_500L
    }

    val idle = if (lockWindow) 4_000L else 15_000L
    // 2. Guardrails: paused, focusing, or not on a distracting app.
    if (cfg.paused || now < cfg.focusUntil || !live.cat.distracting || mine) return idle
    if (now < Store.getLong(this, "snoozeUntil")) return idle

    val minutes = live.sessionMin.roundToInt()
    val reasons = Risk.reasons(clock, live.sessionMin, live.cat, live.unlocksLastHour, schoolDay, inBed)

    // 3. After bedtime: wind-down, never a quiz.
    if (inBed) {
      if (live.sessionMin >= 5 && now - Store.getLong(this, "lastWinddown") > 30 * 60_000L) {
        val late = ((clock - cfg.bedtimeStart) % 1440 + 1440) % 1440
        val id = record(cfg, "winddown", reasons, "quiet", clock, late)
        Notifier.nudge(this, cfg, "winddown", id, live.cat, minutes, clock, late)
        Store.putLong(this, "lastWinddown", now)
        Store.putLong(this, "lastNudge", now)
        reportSoon(cfg)
      }
      return idle
    }

    // 4. Daytime: check-in, then a learning break, with cooldowns.
    if (now - Store.getLong(this, "lastNudge") < 15 * 60_000L) return idle
    if (nudgesToday(now) >= 8) return idle
    val risk = Risk.score(clock, live.sessionMin, live.cat, live.unlocksLastHour, schoolDay, false)
    val level = when {
      risk >= 0.66 && live.sessionMin >= 20 -> "break"
      risk >= 0.4 && live.sessionMin >= 15 -> "checkin"
      else -> null
    } ?: return idle
    val id = record(cfg, level, reasons, "quiet", clock, 0)
    Notifier.nudge(this, cfg, level, id, live.cat, minutes, clock, 0)
    Store.putLong(this, "lastNudge", now)
    countNudge(now)
    reportSoon(cfg)
    return idle
  }

  private fun record(cfg: Config, level: String, reasons: org.json.JSONArray, response: String, clock: Int, late: Int): String {
    val id = "mon-${System.currentTimeMillis().toString(36)}"
    Store.enqueue(
      this,
      JSONObject()
        .put("client_id", id)
        .put("at", iso(System.currentTimeMillis()))
        .put("level", level)
        .put("reasons", reasons)
        .put("response", response)
        .put("clock", clock)
        .put("late", late),
    )
    return id
  }

  private fun maybeReport(cfg: Config, now: Long) {
    val last = Store.getLong(this, "lastReport")
    val pending = Store.queue(this).length() > 0
    if (now - last > 15 * 60_000L || (pending && now - last > 60_000L)) {
      Store.putLong(this, "lastReport", now) // avoid hammering while offline
      Thread { Reporter.report(this, cfg, true) }.start()
    }
  }

  private fun reportSoon(cfg: Config) {
    Thread { Reporter.report(this, cfg, false) }.start()
  }

  private fun nudgesToday(now: Long): Int {
    val day = Days.key(Calendar.getInstance().apply { timeInMillis = now })
    return if (Store.getString(this, "nudgeDay") == day) Store.getLong(this, "nudgeCount").toInt() else 0
  }

  private fun countNudge(now: Long) {
    val day = Days.key(Calendar.getInstance().apply { timeInMillis = now })
    val n = nudgesToday(now)
    Store.putString(this, "nudgeDay", day)
    Store.putLong(this, "nudgeCount", (n + 1).toLong())
  }

  private fun canOverlay() = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(this)

  private fun openLock() {
    try {
      startActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse("learnshift://lock")).apply {
          setPackage(packageName)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        },
      )
    } catch (e: Exception) {
      Log.w(TAG, "could not open lock: ${e.message}")
    }
  }

  companion object {
    private const val TAG = "LearnShiftMonitor"

    @Volatile
    var running = false

    fun iso(t: Long): String =
      SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        .format(Date(t))

    fun start(ctx: Context) {
      val cfg = Store.config(ctx)
      if (!cfg.enabled || !Perms.hasUsageAccess(ctx)) return
      try {
        ContextCompat.startForegroundService(ctx, Intent(ctx, MonitorService::class.java))
      } catch (e: Exception) {
        Log.w(TAG, "could not start monitor: ${e.message}")
      }
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, MonitorService::class.java))
    }
  }
}

/** Restarts the monitor after a reboot or an app update. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    MonitorService.start(ctx)
  }
}

/** "5 more min" on a check-in: snooze, and remember the answer. */
class NudgeActionReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != Notifier.ACTION_SNOOZE) return
    Store.putLong(ctx, "snoozeUntil", System.currentTimeMillis() + 5 * 60_000L)
    // Next nudge may come right after the snooze ends.
    Store.putLong(ctx, "lastNudge", 0L)
    intent.getStringExtra("id")?.let { id ->
      val e = Store.findEvent(ctx, id)
      if (e != null) Store.enqueue(ctx, JSONObject(e.toString()).put("response", "snoozed"))
    }
    Notifier.cancelNudge(ctx)
  }
}
