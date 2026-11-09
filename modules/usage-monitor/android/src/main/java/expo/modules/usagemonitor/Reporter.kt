package expo.modules.usagemonitor

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sends queued nudge events and daily totals to the `ingest` edge function,
 * authenticated with this phone's device token. Runs on a worker thread.
 */
object Reporter {
  private const val TAG = "LearnShiftMonitor"

  /** Returns true when the server accepted the report. */
  fun report(ctx: Context, cfg: Config, withUsage: Boolean): Boolean {
    if (cfg.url.isEmpty() || cfg.deviceToken.isEmpty()) return false
    val queue = Store.queue(ctx)
    val usage = JSONArray()
    val apps = JSONArray()
    if (withUsage && Perms.hasUsageAccess(ctx)) {
      for (d in 0..1) {
        val s = runCatching { Days.summary(ctx, d, cfg) }.getOrNull() ?: continue
        usage.put(
          JSONObject()
            .put("day", s.day)
            .put("total_min", s.total)
            .put("video_min", s.video)
            .put("social_min", s.social)
            .put("games_min", s.games)
            .put("late_min", s.late)
            .put("sessions", s.sessions)
            .put("unlocks", s.unlocks)
            .put("off_at", s.offAt ?: JSONObject.NULL),
        )
        // The 25 apps used most that day, at least a minute each.
        s.apps.entries.sortedByDescending { it.value }.filter { it.value >= 60_000L }.take(25).forEach { (pkg, ms) ->
          apps.put(
            JSONObject()
              .put("day", s.day)
              .put("package", pkg)
              .put("label", Categories.label(ctx, pkg))
              .put("category", Categories.of(ctx, pkg).js)
              .put("minutes", (ms / 60_000L).toInt()),
          )
        }
      }
    }
    if (queue.length() == 0 && usage.length() == 0) return true

    val sent = HashMap<String, String>()
    for (i in 0 until queue.length()) {
      val e = queue.optJSONObject(i) ?: continue
      sent[e.optString("client_id")] = e.toString()
    }
    val body = JSONObject().put("platform", "android").put("events", queue).put("usage", usage).put("apps", apps)
    val ok = post(cfg, body)
    if (ok) {
      Store.removeSent(ctx, sent)
      Store.putLong(ctx, "lastReport", System.currentTimeMillis())
    }
    return ok
  }

  /** The app in front right now, for the guardian's "Using now". */
  fun live(ctx: Context, cfg: Config, live: JSONObject): Boolean {
    if (cfg.url.isEmpty() || cfg.deviceToken.isEmpty()) return false
    return post(cfg, JSONObject().put("platform", "android").put("live", live))
  }

  private fun post(cfg: Config, body: JSONObject): Boolean {
    return try {
      val conn = (URL("${cfg.url.trimEnd('/')}/functions/v1/ingest").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 15000
        readTimeout = 20000
        doOutput = true
        setRequestProperty("content-type", "application/json")
        setRequestProperty("apikey", cfg.key)
        setRequestProperty("x-device-token", cfg.deviceToken)
      }
      conn.outputStream.use { it.write(body.toString().toByteArray()) }
      val code = conn.responseCode
      conn.disconnect()
      if (code in 200..299) {
        true
      } else {
        Log.w(TAG, "ingest returned $code")
        false
      }
    } catch (e: Exception) {
      Log.w(TAG, "ingest failed: ${e.message}")
      false
    }
  }
}
