/**
 * POST /api/verify-membership
 * Body: { channel_username: "rewardhubzone", telegram_user_id: 123456789 }
 * Returns: { is_member: true|false }
 *
 * This is the ONLY server call this app needs. It exists purely because
 * checking channel membership requires the bot token, which must never
 * be exposed in frontend/localStorage code. Everything else (coin
 * count, task-completed state) lives in the user's browser localStorage
 * — fine here since coins have no real payout value.
 */
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { channel_username, telegram_user_id } = req.body || {};
  if (!channel_username || !telegram_user_id) {
    return res.status(400).json({ error: "channel_username and telegram_user_id required" });
  }

  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember` +
      `?chat_id=@${channel_username}&user_id=${telegram_user_id}`;
    const r = await fetch(url);
    const data = await r.json();

    if (!data.ok) {
      // Common cause: bot isn't admin in the channel, or wrong handle.
      console.error("getChatMember failed:", data.description);
      return res.status(200).json({ is_member: false });
    }

    const status = data.result.status; // 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
    return res.status(200).json({ is_member: ["creator", "administrator", "member"].includes(status) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
};
