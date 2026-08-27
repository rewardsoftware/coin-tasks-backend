/**
 * POST /api/daily-code
 * Body: { telegram_user_id: 123456789 }
 * Returns: { code: "A1B2C3D4", date: "2026-08-27" }
 *
 * Generates a proof code the user sends you (with their screenshot) after
 * completing the daily mission. It's an HMAC of (telegram_user_id + date)
 * signed with a server-only secret — so:
 *   - Users can't fake a code without knowing CODE_SECRET.
 *   - You don't need a database: to verify a code someone sends you, just
 *     recompute it yourself (same formula, same secret) for their
 *     telegram_user_id and today's date, and check it matches.
 *   - The code is naturally different every day (date is part of the input).
 *
 * NOTE: this only proves the code came from your server for that user+date —
 * it does NOT verify the screenshot is genuine or that tasks were actually
 * completed. Anyone with the Mini App open can call this endpoint. If you
 * need it to only fire after real task completion, tell the frontend to
 * call this endpoint only once its own completion check passes (already
 * wired that way in index.html), and optionally rate-limit this endpoint
 * per telegram_user_id per day if abuse becomes a problem.
 */
const crypto = require("crypto");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { telegram_user_id } = req.body || {};
  if (!telegram_user_id) {
    return res.status(400).json({ error: "telegram_user_id required" });
  }

  if (!process.env.CODE_SECRET) {
    return res.status(500).json({ error: "CODE_SECRET not configured" });
  }

  // UTC date so the code doesn't shift mid-day for users in different timezones.
  const date = new Date().toISOString().slice(0, 10); // "2026-08-27"

  const hmac = crypto
    .createHmac("sha256", process.env.CODE_SECRET)
    .update(`${telegram_user_id}:${date}`)
    .digest("hex");

  // Short, readable code — first 8 hex chars, uppercased.
  const code = hmac.slice(0, 8).toUpperCase();

  return res.status(200).json({ code, date });
};
