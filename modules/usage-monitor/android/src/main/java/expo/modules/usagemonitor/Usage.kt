package expo.modules.usagemonitor

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import java.util.Calendar
import java.util.Locale

enum class Cat(val js: String) {
  VIDEO("video"), SOCIAL("social"), GAMES("games"), STUDY("study"), OTHER("other");

  val distracting get() = this == VIDEO || this == SOCIAL || this == GAMES
}

/** App → category. Android's own category first, then a curated list. Names never leave the phone. */
object Categories {
  private val VIDEO = setOf(
    "com.google.android.youtube", "com.google.android.apps.youtube.kids", "com.google.android.apps.youtube.music",
    "com.zhiliaoapp.musically", "com.zhiliaoapp.musically.go", "com.ss.android.ugc.trill", "com.ss.android.ugc.aweme",
    "com.netflix.mediaclient", "tv.twitch.android.app", "com.amazon.avod.thirdpartyclient", "com.disney.disneyplus",
    "com.iqiyi.i18n", "com.viu.phone", "com.vivamax.app", "com.kwai.video", "com.snackvideo.app", "com.lemon.lvoverseas",
    "com.bilibili.app.in", "com.tubitv", "com.hbo.hbonow", "com.wbd.stream",
  )
  private val SOCIAL = setOf(
    "com.facebook.katana", "com.facebook.lite", "com.instagram.android", "com.instagram.lite", "com.instagram.barcelona",
    "com.twitter.android", "com.snapchat.android", "com.reddit.frontpage", "com.pinterest", "com.tumblr",
    "com.bereal.ft", "com.lemon8.android",
  )
  private val GAMES = setOf(
    "com.mobile.legends", "com.dts.freefireth", "com.dts.freefiremax", "com.tencent.ig", "com.pubg.imobile",
    "com.roblox.client", "com.supercell.clashofclans", "com.supercell.clashroyale", "com.supercell.brawlstars",
    "com.miHoYo.GenshinImpact", "com.HoYoverse.hkrpgoversea", "com.activision.callofduty.shooter",
    "com.levelinfinite.sgameGlobal", "com.innersloth.spacemafia", "com.kiloo.subwaysurf", "com.mojang.minecraftpe",
  )
  private val STUDY = setOf(
    "com.google.android.apps.classroom", "com.microblink.photomath", "org.khanacademy.android", "com.duolingo",
    "com.quizlet.quizletandroid", "com.google.android.apps.docs", "com.google.android.apps.docs.editors.docs",
    "com.microsoft.teams", "us.zoom.videomeetings", "com.brainly",
  )

  private val cache = HashMap<String, Cat>()
  private val labels = HashMap<String, String>()

  /** The app's name as shown on the home screen (e.g. "TikTok"). */
  fun label(ctx: Context, pkg: String): String = labels.getOrPut(pkg) {
    try {
      val pm = ctx.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString().take(80)
    } catch (_: Exception) {
      pkg
    }
  }

  fun of(ctx: Context, pkg: String): Cat = cache.getOrPut(pkg) { lookup(ctx, pkg) }

  private fun lookup(ctx: Context, pkg: String): Cat {
    if (pkg == ctx.packageName) return Cat.STUDY
    if (pkg in VIDEO) return Cat.VIDEO
    if (pkg in SOCIAL) return Cat.SOCIAL
    if (pkg in GAMES) return Cat.GAMES
    if (pkg in STUDY) return Cat.STUDY
    return try {
      val info = ctx.packageManager.getApplicationInfo(pkg, 0)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        when (info.category) {
          ApplicationInfo.CATEGORY_VIDEO -> Cat.VIDEO
          ApplicationInfo.CATEGORY_SOCIAL -> Cat.SOCIAL
          ApplicationInfo.CATEGORY_GAME -> Cat.GAMES
          else -> if (info.flags and ApplicationInfo.FLAG_IS_GAME != 0) Cat.GAMES else Cat.OTHER
        }
      } else if (info.flags and ApplicationInfo.FLAG_IS_GAME != 0) Cat.GAMES else Cat.OTHER
    } catch (_: PackageManager.NameNotFoundException) {
      Cat.OTHER
    }
  }

  /** Home screen apps; time on them doesn't count as screen time. */
  fun launchers(ctx: Context): Set<String> {
    val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return ctx.packageManager.queryIntentActivities(i, 0).map { it.activityInfo.packageName }.toSet() +
      setOf("com.android.systemui")
  }
}

object Perms {
  fun hasUsageAccess(ctx: Context): Boolean {
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }
}

// Raw event types (same values on all supported API levels).
private const val RESUMED = 1 // MOVE_TO_FOREGROUND / ACTIVITY_RESUMED
private const val PAUSED = 2 // MOVE_TO_BACKGROUND / ACTIVITY_PAUSED
private const val SCREEN_ON = 15
private const val SCREEN_OFF = 16
private const val UNLOCKED = 18 // KEYGUARD_HIDDEN

/** Leaving a distracting app for less than this keeps the same session going. */
private const val GAP_MS = 2 * 60 * 1000L

data class Live(val pkg: String?, val cat: Cat, val sessionMin: Double, val unlocksLastHour: Int)

/** Follows the foreground app incrementally, so each tick reads only new events. */
class Tracker(private val ctx: Context) {
  private val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
  private var lastQuery = 0L
  private var fgPkg: String? = null
  private var sessionStart = 0L
  private var lastDistracting = 0L
  private val unlocks = ArrayDeque<Long>()

  fun update(now: Long): Live {
    if (lastQuery == 0L) lastQuery = now - 3 * 3600 * 1000L
    val events = usm.queryEvents(lastQuery, now)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      val t = e.timeStamp
      when (e.eventType) {
        RESUMED -> {
          val pkg = e.packageName ?: continue
          val cat = Categories.of(ctx, pkg)
          if (cat.distracting) {
            if (sessionStart == 0L || t - lastDistracting > GAP_MS) sessionStart = t
            lastDistracting = t
          }
          fgPkg = pkg
        }
        PAUSED -> if (e.packageName == fgPkg) {
          if (fgPkg?.let { Categories.of(ctx, it).distracting } == true) lastDistracting = t
          fgPkg = null
        }
        SCREEN_OFF -> {
          if (fgPkg?.let { Categories.of(ctx, it).distracting } == true) lastDistracting = t
          fgPkg = null
        }
        SCREEN_ON -> {}
        UNLOCKED -> unlocks.addLast(t)
      }
    }
    lastQuery = now
    val cat = fgPkg?.let { Categories.of(ctx, it) } ?: Cat.OTHER
    if (cat.distracting) lastDistracting = now
    if (now - lastDistracting > GAP_MS) sessionStart = 0L
    while (unlocks.isNotEmpty() && unlocks.first() < now - 3600 * 1000L) unlocks.removeFirst()
    val minutes = if (cat.distracting && sessionStart > 0L) (now - sessionStart) / 60000.0 else 0.0
    return Live(fgPkg, cat, minutes, unlocks.size)
  }
}

data class DaySummary(
  val day: String,
  val total: Int,
  val video: Int,
  val social: Int,
  val games: Int,
  val late: Int,
  val sessions: Int,
  val unlocks: Int,
  val offAt: Int?,
  /** Package → foreground milliseconds that day. */
  val apps: Map<String, Long> = emptyMap(),
)

object Days {
  fun key(c: Calendar) = String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))

  fun minuteOfDay(t: Long): Int {
    val c = Calendar.getInstance().apply { timeInMillis = t }
    return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
  }

  /** Foreground time per category for one calendar day (0 = today, 1 = yesterday...). */
  fun summary(ctx: Context, daysAgo: Int, cfg: Config): DaySummary {
    val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val start = Calendar.getInstance().apply {
      add(Calendar.DAY_OF_YEAR, -daysAgo)
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val from = start.timeInMillis
    val to = minOf(System.currentTimeMillis(), from + 24 * 3600 * 1000L)
    val ignore = Categories.launchers(ctx) + ctx.packageName
    val ms = LongArray(Cat.values().size)
    val perApp = HashMap<String, Long>()
    var lateMs = 0L
    var sessions = 0
    var unlocks = 0
    var offAt: Int? = null
    var fg: String? = null
    var fgSince = 0L
    var lastDistracting = 0L

    fun close(t: Long) {
      val pkg = fg ?: return
      if (pkg !in ignore && t > fgSince) {
        val cat = Categories.of(ctx, pkg)
        ms[cat.ordinal] += t - fgSince
        perApp[pkg] = (perApp[pkg] ?: 0L) + (t - fgSince)
        lateMs += lateOverlap(fgSince, t, cfg)
        if (cat.distracting) lastDistracting = t
      }
      fg = null
    }

    // Start a little early so an app already open at midnight is counted.
    val events = usm.queryEvents(from - 30 * 60 * 1000L, to)
    val e = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(e)
      val t = maxOf(e.timeStamp, from)
      when (e.eventType) {
        RESUMED -> {
          close(t)
          val pkg = e.packageName ?: continue
          fg = pkg
          fgSince = t
          if (e.timeStamp >= from && pkg !in ignore && Categories.of(ctx, pkg).distracting && t - lastDistracting > GAP_MS) sessions++
        }
        PAUSED -> if (e.packageName == fg) close(t)
        SCREEN_OFF -> {
          close(t)
          if (e.timeStamp >= from) {
            val m = minuteOfDay(e.timeStamp)
            if (m >= 18 * 60) offAt = m
          }
        }
        UNLOCKED -> if (e.timeStamp >= from) unlocks++
      }
    }
    close(to)
    val min = { x: Long -> (x / 60000L).toInt() }
    val total = ms.sum()
    return DaySummary(
      day = key(start),
      total = min(total),
      video = min(ms[Cat.VIDEO.ordinal]),
      social = min(ms[Cat.SOCIAL.ordinal]),
      games = min(ms[Cat.GAMES.ordinal]),
      late = min(lateMs),
      sessions = sessions,
      unlocks = unlocks,
      offAt = offAt,
      apps = perApp,
    )
  }

  /** Milliseconds of [a, b) that fall inside the bedtime window. */
  private fun lateOverlap(a: Long, b: Long, cfg: Config): Long {
    var late = 0L
    var t = a
    while (t < b) {
      val step = minOf(b, t + 60_000L)
      if (Schedule.inWindow(minuteOfDay(t), cfg.bedtimeStart, cfg.bedtimeEnd)) late += step - t
      t = step
    }
    return late
  }
}

object Schedule {
  fun inWindow(m: Int, start: Int, end: Int): Boolean =
    if (start == end) false else if (start < end) m in start until end else m >= start || m < end

  /** Weekday Monday–Friday. */
  fun schoolDay(c: Calendar = Calendar.getInstance()): Boolean {
    val d = c.get(Calendar.DAY_OF_WEEK)
    return d in Calendar.MONDAY..Calendar.FRIDAY
  }

  /** Whether tonight's bedtime applies, given which nights the student chose. */
  fun bedtimeApplies(cfg: Config, clock: Int): Boolean {
    if (cfg.bedtimeDays == "every") return true
    // After midnight, the night belongs to the evening before.
    val evening = Calendar.getInstance().apply { if (clock < cfg.bedtimeEnd) add(Calendar.DAY_OF_YEAR, -1) }
    val d = evening.get(Calendar.DAY_OF_WEEK)
    val schoolNight = d in Calendar.SUNDAY..Calendar.THURSDAY
    return if (cfg.bedtimeDays == "school") schoolNight else !schoolNight
  }
}
