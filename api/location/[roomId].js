// api/location/[roomId].js
// GET /api/location/:roomId

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const roomId = req.query.roomId;

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
    // Correct Upstash REST format: POST with JSON array body
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + REDIS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    const data = await response.json();
    console.log('Upstash GET response:', JSON.stringify(data));

    if (!response.ok || data.error) {
      console.error('Upstash get error:', data);
      return res.status(500).json({ error: 'Redis read failed', detail: data });
    }

    if (data.result === null || data.result === undefined) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }

    const location = typeof data.result === 'string'
      ? JSON.parse(data.result)
      : data.result;

    return res.status(200).json({
      roomId,
      lat:       location.lat,
      lng:       location.lng,
      timestamp: location.timestamp,
    });
  } catch (err) {
    console.error('Location handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
