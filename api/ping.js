// api/ping.js
// POST /api/ping  { roomId, lat, lng, timestamp, interval }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { roomId, lat, lng, timestamp, interval } = req.body || {};

  if (!roomId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing roomId, lat or lng' });
  }

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis env vars not set' });
  }

  const key   = 'room:' + roomId;
  const MAX   = 200; // store max 200 points
  const TTL   = 86400; // 24 hour expiry
  const point = JSON.stringify({
    lat,
    lng,
    timestamp: timestamp || Date.now(),
    interval:  interval  || 30000,
  });

  try {
    // Pipeline: RPUSH → LTRIM → EXPIRE (3 commands in one request)
    const response = await fetch(REDIS_URL + '/pipeline', {
      method: 'POST',
      headers: {
        Authorization:  'Bearer ' + REDIS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['RPUSH',  key, point],
        ['LTRIM',  key, -MAX, -1],
        ['EXPIRE', key, TTL],
      ]),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Upstash pipeline error:', data);
      return res.status(500).json({ error: 'Redis write failed', detail: data });
    }

    return res.status(200).json({ success: true, roomId });
  } catch (err) {
    console.error('Ping handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
