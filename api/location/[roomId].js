// api/location/[roomId].js
// GET /api/location/:roomId?points=50

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const roomId = req.query.roomId;
  const points = Math.min(parseInt(req.query.points) || 50, 200); // default 50, max 200

  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis env vars not set' });
  }

  const key = 'room:' + roomId;

  try {
    // LRANGE with negative index to get last N points
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization:  'Bearer ' + REDIS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['LRANGE', key, -points, -1]),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Upstash LRANGE error:', data);
      return res.status(500).json({ error: 'Redis read failed', detail: data });
    }

    // Empty list = room not found or expired
    if (!data.result || data.result.length === 0) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }

    // Parse each point
    const trail = data.result.map(function(item) {
      return typeof item === 'string' ? JSON.parse(item) : item;
    });

    // Latest point
    const latest = trail[trail.length - 1];

    return res.status(200).json({
      roomId,
      lat:       latest.lat,
      lng:       latest.lng,
      timestamp: latest.timestamp,
      interval:  latest.interval || 30000,
      trail:     trail,
      count:     trail.length,
    });
  } catch (err) {
    console.error('Location handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
