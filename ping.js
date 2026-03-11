// api/ping.js — Vercel Serverless Function
// POST /api/ping
// Body: { roomId, lat, lng, timestamp }
// Saves location to Upstash Redis with a 24hr TTL

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { roomId, lat, lng, timestamp } = req.body;

  if (!roomId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing required fields: roomId, lat, lng' });
  }

  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const key = `room:${roomId}`;
    const payload = {
      lat,
      lng,
      timestamp: timestamp || Date.now(),
    };

    // Store with 24 hour expiry (86400 seconds)
    await redis.setex(key, 86400, JSON.stringify(payload));

    return res.status(200).json({ success: true, roomId });
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({ error: 'Failed to save location' });
  }
}
