# FoodLoop 2.0 — Deployment (Render + Vercel)

This monorepo deploys in two parts:

| App | Platform | Folder | URL example |
|-----|----------|--------|-------------|
| API + Socket.IO | [Render](https://render.com) | `backend/` | `https://foodloop-api.onrender.com` |
| React SPA | [Vercel](https://vercel.com) | `frontend/` | `https://your-app.vercel.app` |

Local development is unchanged: run the backend on port 5000 and the Vite dev server with an empty `VITE_API_URL` (proxy handles `/api` and `/socket.io`).

---

## Prerequisites

1. **GitHub** repository with this code pushed.
2. **MongoDB Atlas** cluster (free tier is fine).
3. **Cloudflare R2** bucket for uploads (see [backend/README.md](backend/README.md)).
4. **Gmail** app password for SMTP.
5. **Google Gemini** API key for donation image analysis.
6. Accounts on **Render** and **Vercel**, both connected to GitHub.

---

## 1. MongoDB Atlas

1. Create a cluster and database user (username + password).
2. **Network Access** → allow `0.0.0.0/0` (or restrict to Render outbound IPs if you prefer).
3. Copy the connection string, e.g.  
   `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/foodloop?retryWrites=true&w=majority`
4. Use this as `MONGO_URI` on Render.

**Seed admin (once):** from your machine with production `MONGO_URI` in `backend/.env`:

```bash
cd backend
npm run seed:admin
```

Default admin: `admin` / `admin123` (change after first login).

---

## 2. Backend on Render

### Option A — Blueprint (`render.yaml`)

1. Render Dashboard → **New** → **Blueprint**.
2. Connect the repo; Render reads [render.yaml](render.yaml) at the repo root.
3. Fill in secret env vars when prompted (`MONGO_URI`, `FRONTEND_URL`, SMTP, R2, Gemini, etc.).
4. Deploy and note the service URL: `https://<service-name>.onrender.com`.

### Option B — Manual Web Service

| Setting | Value |
|---------|--------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/` |

### Render environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | Auto | Set by Render; do not override |
| `MONGO_URI` | Yes | Atlas connection string |
| `JWT_SECRET` | Yes | Long random string |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `FRONTEND_URL` | Yes | Production Vercel URL, no trailing slash |
| `CORS_ORIGINS` | No | Comma-separated extra origins (Vercel previews) |
| `SMTP_HOST` | Yes | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Yes | e.g. `587` |
| `SMTP_USER` | Yes | Gmail address |
| `SMTP_PASS` | Yes | Google app password |
| `SMTP_FROM` | Yes | e.g. `FoodLoop <you@gmail.com>` |
| `R2_ACCOUNT_ID` | Yes | Cloudflare |
| `R2_ACCESS_KEY_ID` | Yes | |
| `R2_SECRET_ACCESS_KEY` | Yes | |
| `R2_BUCKET_NAME` | Yes | |
| `R2_PUBLIC_BASE_URL` | Yes | Public R2 URL, no trailing slash |
| `GEMINI_API_KEY` | Yes | |
| `GEMINI_MODEL` | No | e.g. `gemini-3.5-flash` |
| `OSRM_BASE_URL` | No | Default `https://router.project-osrm.org`; set to self-hosted OSRM for production scale |
| `WEATHER_API_KEY` | Yes | OpenWeather API key used by `/api/weather/*` backend proxy |

**CORS (required):**

```env
FRONTEND_URL=https://your-production-app.vercel.app
```

- `FRONTEND_URL` is used for email links and as an allowed browser origin.
- **Vercel preview URLs** (`https://*-youruser.vercel.app`) are allowed automatically unless you set `ALLOW_VERCEL_PREVIEWS=false`.
- Optional extra origins: `CORS_ORIGINS=https://app.example.com,https://staging.example.com`

After the frontend is live, set `FRONTEND_URL` to your **production** Vercel URL and **redeploy** the Render service.

**Free tier:** the service sleeps after inactivity; the first request may take 30–60 seconds.

**WebSockets:** Socket.IO works on Render Web Services with no extra config.

---

## 3. Frontend on Vercel

1. Vercel Dashboard → **Add New** → **Project** → import the same GitHub repo.
2. **Root Directory:** `frontend`
3. Framework: **Vite** (auto-detected).
4. Build: `npm run build` → output `dist` (defaults).

### Vercel environment variables

Set for **Production** and **Preview** (recommended):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://<your-render-service>.onrender.com` |

No trailing slash. Example: `https://foodloop-api.onrender.com`

**Important:** Vite embeds `VITE_*` at build time. After changing `VITE_API_URL`, trigger a **Redeploy**.

[frontend/vercel.json](frontend/vercel.json) already routes all paths to `index.html` for React Router.

---

## 4. Wire frontend and backend

1. Deploy **backend** on Render → copy URL.
2. Set Vercel `VITE_API_URL` to that URL → deploy **frontend**.
3. Set Render `FRONTEND_URL` to your Vercel production URL → **redeploy backend**.
4. Optional: add Vercel preview URLs to Render `CORS_ORIGINS`.

---

## 5. Smoke test

| Check | How |
|-------|-----|
| API up | Open `https://<render-url>/` → “FoodLoop 2.0 API is running...” |
| Login | Vercel app → `/login` with seeded admin |
| CORS | Browser devtools: no CORS errors on `/api/auth/login` |
| Uploads | Signup or donation image → R2 public URL loads |
| Email | OTP / notification links point to Vercel (`FRONTEND_URL`) |
| Socket.IO | Driver delivery list / live tracking (network tab: `socket.io` websocket) |

---

## 6. Custom domains (optional)

| Host | Platform | Update env |
|------|----------|------------|
| `api.yourdomain.com` | Render → Custom Domain | Vercel `VITE_API_URL=https://api.yourdomain.com` |
| `app.yourdomain.com` | Vercel → Domains | Render `FRONTEND_URL=https://app.yourdomain.com` |

Redeploy both apps after DNS propagates.

---

## 7. Local development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # edit MONGO_URI, secrets
npm install
npm run dev

# Terminal 2 — frontend
cd frontend
cp .env.example .env   # leave VITE_API_URL empty
npm install
npm run dev
```

Open `http://localhost:5173`. API requests proxy to `http://localhost:5000` via [frontend/vite.config.js](frontend/vite.config.js).

---

## Sell listing payments (mock)

Receivers claiming **cash** listings (`listingType: sell`) pay through an in-app checkout modal (demo only — no real card processing). The backend exposes:

- `POST /api/payments/claim/checkout` (JWT receiver) — creates a pending payment
- `POST /api/payments/claim/confirm` (JWT receiver) — marks payment paid after UI validation

No extra environment variables are required for this flow.

---

## Driver routing (OSRM + traffic model)

Road distances and ETAs use **OSRM** via `GET /api/routing/route` and `POST /api/routing/table` (JWT required). The public OSRM demo server has **no live traffic** and rate limits; the app applies a **Colombo time-of-day traffic heuristic** for adjusted ETAs.

- If routing fails, the UI falls back to straight-line (Haversine) distance at ~30 km/h.
- For heavy demo/production use, self-host [OSRM](http://project-osrm.org/) with a Sri Lanka map extract and set `OSRM_BASE_URL` on Render.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Match `FRONTEND_URL` / `CORS_ORIGINS` on Render to the exact origin in the address bar |
| API 404 from Vercel | `VITE_API_URL` must be the Render URL, not the Vercel URL |
| Socket fails to connect | Same `VITE_API_URL`; check Render service is awake |
| Mongo connection failed | Atlas IP allowlist; correct `MONGO_URI` user/password |
| Upload fails | All `R2_*` vars set; bucket public URL works |
| Stale frontend API URL | Redeploy Vercel after changing `VITE_API_URL` |
| Routing / ETA fails | Check Render logs; OSRM demo may be rate-limited; set `OSRM_BASE_URL` or wait and retry |
| “Approximate route” in UI | OSRM unavailable; app used straight-line fallback |

---

## Repo layout reference

```text
FoodLoop2.0/
├── DEPLOYMENT.md      # this file
├── render.yaml        # Render Blueprint (backend)
├── backend/           # → Render
└── frontend/          # → Vercel
```
