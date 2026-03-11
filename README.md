# 📍 PingDrop — Live Location Sharing

A minimal, serverless live location beacon. User A shares their GPS location, User B can view it anytime via a shared link — even if A is offline, they'll see the last known position.

**Stack:** Vanilla HTML/JS · Leaflet + OpenStreetMap · Vercel Serverless · Upstash Redis

---

## 🚀 Setup in 5 Minutes

### 1. Clone & Install
```bash
git clone <your-repo>
cd pingdrop
npm install
```

### 2. Create Upstash Redis Database
1. Go to [console.upstash.com](https://console.upstash.com)
2. Click **Create Database** → pick a region close to your users
3. Open the database → go to the **REST API** tab
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 3. Set Environment Variables
```bash
cp .env.example .env
# Edit .env and paste your Upstash credentials
```

### 4. Deploy to Vercel
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy (follow prompts)
vercel

# Add environment variables on Vercel dashboard:
# Settings → Environment Variables → add both UPSTASH_ keys
```

Or connect your GitHub repo directly at [vercel.com](https://vercel.com) for auto-deployments.

---

## 📁 Project Structure

```
/
├── index.html                  # Full frontend (Host + Viewer UI)
├── api/
│   ├── ping.js                 # POST /api/ping — saves location
│   └── location/
│       └── [roomId].js         # GET /api/location/:roomId — fetches location
├── vercel.json                 # Routing config
├── package.json
├── .env.example                # Credentials template
└── README.md
```

---

## 🔄 How It Works

### User A (Host — Sharing)
1. Opens the app → a Room ID is auto-generated
2. Clicks **Start Sharing Location** → GPS activates
3. Location is pinged to `/api/ping` every 30 seconds
4. Shares the link via **WhatsApp** or **Email** buttons

### User B (Viewer)
1. Opens the shared link (anytime — even hours later)
2. App auto-detects the Room ID from the URL
3. Switches to Viewer mode, polls `/api/location/:roomId` every 30s
4. Sees User A's pin on the map with a "Last seen X mins ago" timestamp

---

## 🔑 API Reference

### `POST /api/ping`
Save a location ping.
```json
{
  "roomId": "abc-xyz-123",
  "lat": 28.6139,
  "lng": 77.2090,
  "timestamp": 1700000000000
}
```
Response: `{ "success": true, "roomId": "abc-xyz-123" }`

### `GET /api/location/:roomId`
Get the last known location.
Response:
```json
{
  "roomId": "abc-xyz-123",
  "lat": 28.6139,
  "lng": 77.2090,
  "timestamp": 1700000000000
}
```

---

## ⚙️ Configuration

| Setting | Default | Where to change |
|---|---|---|
| Ping interval | 30 seconds | `PING_INTERVAL` in `index.html` |
| Poll interval | 30 seconds | `POLL_INTERVAL` in `index.html` |
| Location TTL | 24 hours | `setex` in `api/ping.js` |

---

## 🔒 Security Notes

- Room IDs are randomly generated (e.g. `x4ab-9yz2-k1qm`) — hard to guess
- Location data auto-expires after 24 hours (Upstash TTL)
- No user accounts or personal data stored
- HTTPS is enforced by Vercel by default (required for GPS access)
