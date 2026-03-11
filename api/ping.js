// api/ping.js
// POST /api/ping  { roomId, lat, lng, timestamp }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { roomId, lat, lng, timestamp } = req.body || {};

  if (!roomId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing roomId, lat or lng' });
  }

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis env vars not set' });
  }

  const key   = 'room:' + roomId;
  const value = JSON.stringify({ lat, lng, timestamp: timestamp || Date.now() });
  const ttl   = 86400; // 24 hours

  try {
    // Correct Upstash REST format: POST with JSON array body
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + REDIS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SETEX', key, ttl, value]),
    });

    const data = await response.json();
    console.log('Upstash SETEX response:', JSON.stringify(data));

    if (!response.ok || data.error) {
      console.error('Upstash setex error:', data);
      return res.status(500).json({ error: 'Redis write failed', detail: data });
    }

    return res.status(200).json({ success: true, roomId });
  } catch (err) {
    console.error('Ping handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
