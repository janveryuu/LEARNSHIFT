package expo.modules.usagemonitor

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.exp
import kotlin.math.roundToInt

/** Same weighted logistic as the app's risk model (src/services/ai/riskModel.ts). */
object Risk {
  private fun weight(c: Cat) = when (c) {
    Cat.VIDEO -> 0.7
    Cat.SOCIAL -> 0.5
    Cat.GAMES -> 0.6
    Cat.OTHER -> 0.1
    Cat.STUDY -> -1.4
  }

  fun score(clock: Int, sessionMin: Double, cat: Cat, unlocks: Int, schoolDay: Boolean, inBedtime: Boolean): Double {
    val hour = clock / 60.0
    val evening = if (hour >= 20) (hour - 20) * 0.35 else 0.0
    val z = -4.1 + 0.052 * sessionMin + weight(cat) + (if (inBedtime) 2.6 else evening) +
      (if (schoolDay) 0.45 else 0.0) + 0.045 * unlocks + 0.012 * sessionMin
    return 1.0 / (1.0 + exp(-z))
  }

  /** Reasons in the same JSON shape the app shows as chips. */
  fun reasons(clock: Int, sessionMin: Double, cat: Cat, unlocks: Int, schoolDay: Boolean, inBedtime: Boolean): JSONArray {
    val r = JSONArray()
    if (sessionMin >= 15) r.put(JSONObject().put("key", "minutes").put("value", sessionMin.roundToInt()))
    if (cat == Cat.VIDEO) r.put(JSONObject().put("key", "videos"))
    r.put(JSONObject().put("key", if (schoolDay) "schoolDay" else "weekend"))
    r.put(JSONObject().put("key", "clock").put("value", clock))
    if (inBedtime) r.put(JSONObject().put("key", "pastBedtime"))
    if (unlocks >= 12) r.put(JSONObject().put("key", "unlocks").put("value", unlocks))
    return r
  }
}

object Notifier {
  const val CH_MONITOR = "ls_monitor"
  // A new id: an older "nudges" channel may exist at a quiet importance, and
  // Android never raises a channel's importance once it is created.
  const val CH_NUDGES = "ls_breaks"
  const val CH_COUNTDOWN = "ls_countdown"
  private const val COUNTDOWN_ID = 4212
  const val MONITOR_ID = 4210
  private const val NUDGE_ID = 4211
  const val ACTION_SNOOZE = "expo.modules.usagemonitor.SNOOZE"

  fun channels(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(
      NotificationChannel(CH_MONITOR, "Looking out for you", NotificationManager.IMPORTANCE_MIN).apply {
        description = "Shows while LearnShift notices long sessions"
        setShowBadge(false)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CH_NUDGES, "Break reminders", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Learning breaks, limits and wind-down reminders"
        enableVibration(true)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CH_COUNTDOWN, "Time left", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Live countdown to the next break while a limit is running"
        setShowBadge(false)
      },
    )
  }

  private fun open(ctx: Context, url: String, req: Int): PendingIntent {
    val i = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      setPackage(ctx.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun monitor(ctx: Context, cfg: Config) = NotificationCompat.Builder(ctx, CH_MONITOR)
    .setSmallIcon(R.drawable.ls_notify)
    .setContentTitle(if (cfg.fil) "Nagbabantay si Tarsi" else "Tarsi is looking out for you")
    .setContentText(if (cfg.fil) "Paalala lang kapag matagal na sa videos." else "Only nudges you after long scrolls.")
    .setOngoing(true)
    .setSilent(true)
    .setPriority(NotificationCompat.PRIORITY_MIN)
    .setContentIntent(open(ctx, "learnshift://privacy", 1))
    .build()

  fun allowed(ctx: Context) =
    NotificationManagerCompat.from(ctx).areNotificationsEnabled() &&
      (Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)

  /** Whether break reminders can pop up: app notifications on and the channel not muted. */
  fun breaksEnabled(ctx: Context): Boolean {
    if (!allowed(ctx)) return false
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
    channels(ctx)
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val importance = nm.getNotificationChannel(CH_NUDGES)?.importance ?: NotificationManager.IMPORTANCE_NONE
    return importance != NotificationManager.IMPORTANCE_NONE
  }

  private fun clockOf(t: Long): String {
    val c = java.util.Calendar.getInstance().apply { timeInMillis = t }
    return clock(c.get(java.util.Calendar.HOUR_OF_DAY) * 60 + c.get(java.util.Calendar.MINUTE))
  }

  /** Ongoing "TikTok · break in 7:32" notification with a live countdown. */
  fun countdown(ctx: Context, cfg: Config, label: String, limit: Int, deadline: Long, now: Long) {
    if (!allowed(ctx)) return
    val total = limit * 60
    val left = ((deadline - now) / 1000L).toInt().coerceIn(0, total)
    val who = cfg.guardianName.ifEmpty { if (cfg.fil) "guardian mo" else "Your guardian" }
    val text = if (cfg.fil) "$limit-min na limit mula kay $who. Break nang ${clockOf(deadline)}."
    else "$who set $limit min. Break at ${clockOf(deadline)}."
    val b = NotificationCompat.Builder(ctx, CH_COUNTDOWN)
      .setSmallIcon(R.drawable.ls_notify)
      .setContentTitle(if (cfg.fil) "$label · break sa" else "$label · break in")
      .setContentText(text)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setWhen(deadline)
      .setShowWhen(true)
      .setProgress(total, total - left, false)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setContentIntent(open(ctx, "learnshift://home", 5))
    try {
      NotificationManagerCompat.from(ctx).notify(COUNTDOWN_ID, b.build())
    } catch (_: SecurityException) {
    }
  }

  fun cancelCountdown(ctx: Context) = NotificationManagerCompat.from(ctx).cancel(COUNTDOWN_ID)

  private fun catWord(cat: Cat, fil: Boolean) = when (cat) {
    Cat.VIDEO -> "videos"
    Cat.SOCIAL -> if (fil) "social media" else "social apps"
    Cat.GAMES -> "games"
    else -> "apps"
  }

  fun clock(m: Int): String {
    val h = (m / 60) % 24
    return "${if (h % 12 == 0) 12 else h % 12}:${(m % 60).toString().padStart(2, '0')} ${if (h < 12) "AM" else "PM"}"
  }

  /** Posts the nudge notification. Returns false when notifications are off. */
  fun nudge(ctx: Context, cfg: Config, level: String, id: String, cat: Cat, minutes: Int, clock: Int, lateMin: Int): Boolean {
    if (!allowed(ctx)) return false
    val fil = cfg.fil
    val skill = cfg.rootSkillName
    val word = catWord(cat, fil)
    val breakUrl = "learnshift://break/${cfg.rootSkill}?nudge=$id"
    val (title, body, url) = when (level) {
      "checkin" -> Triple(
        if (fil) "$minutes min ka na sa $word" else "$minutes min on $word",
        if (fil) "Break? 45 segundo ng $skill kasama si Tarsi." else "Break? 45 seconds of $skill with Tarsi.",
        breakUrl,
      )
      "break" -> Triple(
        if (fil) "Oras na para sa 45-segundong break" else "Time for a 45-second break",
        if (fil) "$minutes min ka na sa $word. Pinili ni Tarsi ang $skill para sa iyo." else "You’ve been on $word for $minutes min. Tarsi picked $skill for you.",
        breakUrl,
      )
      "limit" -> Triple(
        if (fil) "Naabot na ang $minutes-min na limit" else "$minutes-min limit reached",
        if (fil) "${cfg.guardianName.ifEmpty { "Ang guardian mo" }} ay nag-set ng $minutes min para sa $word. Oras na para sa 45-segundong break kasama si Tarsi."
        else "${cfg.guardianName.ifEmpty { "Your guardian" }} set $minutes min for $word. Time for a 45-second break with Tarsi.",
        breakUrl,
      )
      "winddown" -> Triple(
        if (fil) "${clock(clock)} na. Oras na para magpahinga" else "It’s ${clock(clock)}. Time to wind down",
        if (fil) "$lateMin min na mula nang oras ng tulog mo. May kalmadong wind-down si Tarsi." else "Bedtime started $lateMin min ago. Tarsi has a calm wind-down ready.",
        "learnshift://winddown?nudge=$id",
      )
      else -> Triple(
        if (fil) "Nagpapahinga ang mga app" else "Apps are resting",
        if (fil) "Night lock ni ${cfg.guardianName.ifEmpty { "guardian mo" }}. I-tap para buksan ang LearnShift." else "${cfg.guardianName.ifEmpty { "Your guardian" }} set the night lock. Tap to open LearnShift.",
        "learnshift://lock",
      )
    }
    val b = NotificationCompat.Builder(ctx, CH_NUDGES)
      .setSmallIcon(R.drawable.ls_notify)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setContentIntent(open(ctx, url, 2))
    if (level == "checkin" || level == "limit") {
      val snooze = Intent(ctx, NudgeActionReceiver::class.java).setAction(ACTION_SNOOZE).putExtra("id", id)
      b.addAction(0, if (fil) "Mag-break" else "Take a break", open(ctx, url, 3))
      b.addAction(
        0,
        if (fil) "5 min pa" else "5 more min",
        PendingIntent.getBroadcast(ctx, 4, snooze, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
      )
    }
    return try {
      NotificationManagerCompat.from(ctx).notify(NUDGE_ID, b.build())
      true
    } catch (_: SecurityException) {
      false
    }
  }

  fun cancelNudge(ctx: Context) = NotificationManagerCompat.from(ctx).cancel(NUDGE_ID)
}
