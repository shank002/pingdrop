// api/location/[roomId].js — Vercel Serverless Function
// GET /api/location/:roomId
// Returns the last known location for a given room

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { roomId } = req.query;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }

  try {
    const key = `room:${roomId}`;
    const raw = await redis.get(key);

    if (!raw) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }

    // Upstash may return already-parsed object or string
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json({
      roomId,
      lat: data.lat,
      lng: data.lng,
      timestamp: data.timestamp,
    });
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).json({ error: 'Failed to fetch location' });
  }
}
