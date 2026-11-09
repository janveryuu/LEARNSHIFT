package expo.modules.usagemonitor

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** Settings the app pushes down (bedtime, lock, language, server details). */
data class Config(
  val enabled: Boolean,
  val url: String,
  val key: String,
  val deviceToken: String,
  val lang: String,
  val bedtimeStart: Int,
  val bedtimeEnd: Int,
  val bedtimeDays: String,
  val lockEnabled: Boolean,
  val lockStart: Int,
  val lockEnd: Int,
  val unlockUntil: Long,
  val paused: Boolean,
  val focusUntil: Long,
  val rootSkill: String,
  val rootSkillName: String,
  val guardianName: String,
) {
  val fil get() = lang == "fil"

  companion object {
    fun from(o: JSONObject) = Config(
      enabled = o.optBoolean("enabled", false),
      url = o.optString("url", ""),
      key = o.optString("key", ""),
      deviceToken = o.optString("deviceToken", ""),
      lang = o.optString("lang", "en"),
      bedtimeStart = o.optInt("bedtimeStart", 1320),
      bedtimeEnd = o.optInt("bedtimeEnd", 360),
      bedtimeDays = o.optString("bedtimeDays", "school"),
      lockEnabled = o.optBoolean("lockEnabled", false),
      lockStart = o.optInt("lockStart", 1320),
      lockEnd = o.optInt("lockEnd", 360),
      unlockUntil = o.optLong("unlockUntil", 0L),
      paused = o.optBoolean("paused", false),
      focusUntil = o.optLong("focusUntil", 0L),
      rootSkill = o.optString("rootSkill", "fractions"),
      rootSkillName = o.optString("rootSkillName", "Fractions"),
      guardianName = o.optString("guardianName", ""),
    )
  }
}

/** Small persistent state: config, cooldowns and the outgoing event queue. */
object Store {
  private const val PREFS = "learnshift_monitor"

  private fun prefs(ctx: Context): SharedPreferences =
    ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun config(ctx: Context): Config =
    Config.from(runCatching { JSONObject(prefs(ctx).getString("config", "{}") ?: "{}") }.getOrDefault(JSONObject()))

  @Synchronized
  fun saveConfig(ctx: Context, json: String) {
    prefs(ctx).edit().putString("config", json).apply()
  }

  fun getLong(ctx: Context, key: String, def: Long = 0L) = prefs(ctx).getLong(key, def)
  fun putLong(ctx: Context, key: String, v: Long) = prefs(ctx).edit().putLong(key, v).apply()
  fun getString(ctx: Context, key: String) = prefs(ctx).getString(key, null)
  fun putString(ctx: Context, key: String, v: String) = prefs(ctx).edit().putString(key, v).apply()

  // ── Event queue (nudges waiting to be reported) ──

  @Synchronized
  fun queue(ctx: Context): JSONArray =
    runCatching { JSONArray(prefs(ctx).getString("queue", "[]") ?: "[]") }.getOrDefault(JSONArray())

  /** Adds or replaces an event by client_id. Keeps the newest 100. */
  @Synchronized
  fun enqueue(ctx: Context, ev: JSONObject) {
    val q = queue(ctx)
    val out = JSONArray()
    val id = ev.optString("client_id")
    for (i in 0 until q.length()) {
      val e = q.optJSONObject(i) ?: continue
      if (e.optString("client_id") != id) out.put(e)
    }
    out.put(ev)
    val trimmed = JSONArray()
    val start = maxOf(0, out.length() - 100)
    for (i in start until out.length()) trimmed.put(out.get(i))
    prefs(ctx).edit().putString("queue", trimmed.toString()).apply()
  }

  @Synchronized
  fun findEvent(ctx: Context, id: String): JSONObject? {
    val q = queue(ctx)
    for (i in 0 until q.length()) {
      val e = q.optJSONObject(i) ?: continue
      if (e.optString("client_id") == id) return e
    }
    return null
  }

  /** Drops events that were sent, unless they changed since (e.g. a later snooze). */
  @Synchronized
  fun removeSent(ctx: Context, sent: Map<String, String>) {
    val q = queue(ctx)
    val out = JSONArray()
    for (i in 0 until q.length()) {
      val e = q.optJSONObject(i) ?: continue
      if (sent[e.optString("client_id")] != e.toString()) out.put(e)
    }
    prefs(ctx).edit().putString("queue", out.toString()).apply()
  }
}
