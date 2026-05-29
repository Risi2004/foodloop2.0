# FoodLoop Backend

**Production hosting:** deploy this folder to [Render](https://render.com) with root directory `backend`. See [../DEPLOYMENT.md](../DEPLOYMENT.md) for full steps (Vercel frontend, Atlas, env vars).

## Setup

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:

   - `MONGO_URI` — MongoDB connection string
   - `JWT_SECRET` — long random string for signing tokens
   - `FRONTEND_URL` — Vite dev URL (default `http://localhost:5173`)
   - Gmail SMTP: `SMTP_USER`, `SMTP_PASS` (use a [Google App Password](https://support.google.com/accounts/answer/185833), not your normal Gmail password)
   - Cloudflare R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`
   - Google Gemini: `GEMINI_API_KEY` ([Google AI Studio](https://aistudio.google.com/apikey)), optional `GEMINI_MODEL` (default `gemini-3.5-flash`; falls back to `gemini-2.5-flash` then `gemini-1.5-flash` on quota errors)
   - OpenWeather: `WEATHER_API_KEY` (server-side weather widget source)

3. **FoodLoop AI chatbot (optional but recommended):** add curated markdown under `knowledge/website/`, place PDF help files in `knowledge/sources/`, then build the search index:

   ```bash
   npm run chat:ingest
   ```

   Re-run after changing PDFs or website knowledge files. See `knowledge/sources/README.md`.

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

API base: `http://localhost:5000`

## Weather endpoints (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/weather/current?lat=&lng=&units=metric` | Current weather at coordinates (`units`: `metric`, `imperial`, `standard`) |
| GET | `/api/weather/forecast?lat=&lng=&units=metric` | 3-hour forecast snapshot (next 8 entries) |

Weather responses are normalized by backend and cached in-memory for short durations to reduce OpenWeather request volume.

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Multipart registration + OTP email |
| POST | `/api/auth/verify-otp` | Verify 6-digit code |
| POST | `/api/auth/resend-otp` | Resend OTP |
| GET | `/api/auth/check-email` | `?email=` |
| GET | `/api/auth/check-contact` | `?contactNo=` |
| POST | `/api/auth/login` | Returns JWT + user |
| POST | `/api/auth/forgot-password` | `{ email }` — 404 if unregistered; sends 6-digit reset OTP |
| POST | `/api/auth/verify-reset-otp` | `{ email, otp }` — verifies reset code (10 min, 5 attempts) |
| POST | `/api/auth/resend-reset-otp` | `{ email }` — resend reset OTP |
| POST | `/api/auth/reset-password` | `{ email, password, retypePassword }` — after OTP verified (15 min window) |
| GET | `/api/auth/me` | Bearer token required |

## Chatbot endpoints (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/message` | `{ message, history?, language? }` — RAG answers about FoodLoop only (en/ta/si) |

Requires `GEMINI_API_KEY` and a built index (`npm run chat:ingest`). Rate limited per IP (~20 requests / 15 minutes).

## Supplier Tomorrow AI (JWT + supplier roles)

On `/supplier/my-donation`, suppliers can run weather-aware “tomorrow” product suggestions (OpenWeather + Gemini).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/supplier/ai-insights/status` | Free quota / unlimited subscription state (Asia/Colombo day) |
| POST | `/api/supplier/ai-insights/tomorrow` | `{ lat?, lng?, foodCategory?, itemName? }` — generate insights |
| POST | `/api/supplier/ai-insights/subscription/checkout` | Start LKR 5,000 mock card checkout (30 min TTL) |
| POST | `/api/supplier/ai-insights/subscription/confirm` | `{ orderId, cardNumber, expiry, cvv }` — activate unlimited until month end |

**Env (optional):** `SUPPLIER_AI_FREE_DAILY_LIMIT` (default `2`), `SUPPLIER_AI_SUBSCRIPTION_LKR` (default `5000`). Uses `GEMINI_API_KEY` and `WEATHER_API_KEY` like other AI/weather features.

**Business rules:** 2 free forecasts per supplier per calendar day (Colombo); paid tier unlocks unlimited runs until the last day of the current calendar month. Subscription payments use the same in-app mock card flow as claims and appear in admin **Card inflows** with context `supplier_ai_subscription`.

**Manual test:**

1. Log in as a supplier (Donor / Restaurant / etc.) and open **My donations** (`/supplier/my-donation`).
2. Call **Get tomorrow’s AI forecast** twice — status should show `0/2` then insights.
3. Third run returns `AI_QUOTA_EXCEEDED` and the paywall CTA.
4. Complete mock checkout (16-digit card, MM/YY expiry, 3-digit CVV) — status shows unlimited until month end; further runs do not consume the daily counter.
5. As Admin → **Platform Finance** → Card inflows: ledger row for LKR 5,000 with context **Supplier AI subscription**.

## Supplier ESG & CSR dashboard (JWT + supplier roles)

Premium impact reporting at `/supplier/esg-csr` — environmental, social, and governance metrics from donation history, optional Gemini executive summary, and **Print / Save PDF** (browser print).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/supplier/esg/status` | Subscription state (`unlocked`, `expiresAt`, auto-renew) |
| GET | `/api/supplier/esg/report?period=` | Full report (`this_month`, `last_30`, `this_quarter`, `all_time`) — requires active subscription |
| POST | `/api/supplier/esg/subscription/checkout` | Start LKR 5,000 mock checkout |
| POST | `/api/supplier/esg/subscription/confirm` | Confirm card + activate 1-month access |
| POST | `/api/supplier/esg/subscription/cancel-auto-renew` | Stop future monthly charges |

**Env (optional):** `SUPPLIER_ESG_SUBSCRIPTION_LKR` (default `5000`). Separate from Tomorrow AI subscription. Payments appear in admin **Card inflows** as `supplier_esg_subscription`.

**Manual test:**

1. Supplier opens **ESG & CSR** in the navbar (`/supplier/esg-csr`) — paywall if not subscribed.
2. Subscribe with mock card — dashboard loads with KPIs and pillar tabs.
3. Change period filter — metrics update from delivered listings.
4. Click **Download report** for a PDF file, or **Print** to use the browser print dialog.
5. Admin finance shows LKR 5,000 **Supplier ESG subscription**.

## Supplier Premium bundle (JWT + supplier roles)

On the supplier home page (`/supplier/dashboard`), after **Earn Your Status**, suppliers can choose **Free** (LKR 0) or **Premium bundle** (LKR 8,000/month). The bundle unlocks unlimited Tomorrow AI insights and the full ESG & CSR dashboard without separate LKR 5,000 products. Individual AI-only and ESG-only subscriptions remain available on their feature pages.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/supplier/bundle/status` | Bundle active, `expiresAt`, auto-renew |
| POST | `/api/supplier/bundle/subscription/checkout` | Start LKR 8,000 mock checkout |
| POST | `/api/supplier/bundle/subscription/confirm` | Confirm card + activate 1 month |
| POST | `/api/supplier/bundle/subscription/cancel-auto-renew` | Stop future monthly charges |

**Env (optional):** `SUPPLIER_BUNDLE_SUBSCRIPTION_LKR` (default `8000`). Card inflows context: `supplier_bundle_subscription` (**Supplier Premium bundle**).

**Manual test:**

1. Supplier home → **Grow with FoodLoop** — Free and Premium cards visible.
2. Subscribe to Premium (mock card) — status shows active until period end.
3. **My Listings** — unlimited AI forecasts; **ESG & CSR** — full dashboard without separate paywall.
4. Admin finance — LKR 8,000 **Supplier Premium bundle**.

## Signup file storage (Cloudflare R2)

All new signup uploads (PDFs and profile images) are stored in **Cloudflare R2**, not on the server disk. MongoDB stores the public URL (e.g. `https://pub-xxxx.r2.dev/users/{userId}/...`).

### R2 setup

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2** → create a bucket (e.g. `foodloop-uploads`).
2. **Manage R2 API tokens** → create token with Object Read & Write for that bucket.
3. Enable **public access** on the bucket (public development URL or custom domain). Copy the public base URL (no trailing slash).
4. Add to `backend/.env`:

   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET_NAME=foodloop-uploads
   R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
   ```

5. Restart the backend.

Object keys: `users/{userId}/{fieldname}-{timestamp}.pdf` (or `.jpg`/`.png` for profile photos).

Donation photos use `donations/{userId}/donation-{timestamp}.jpg` (or `.png`). Images are uploaded to R2 **only after** Gemini accepts the photo (rejects AI-generated, non-food, and spoiled images).

### Legacy local uploads

Older accounts may still reference `/uploads/...` on disk under `backend/uploads/`. The API serves that folder only if it exists, for backward compatibility.

## Transactional emails (Nodemailer / Gmail)

| When | Email subject (approx.) |
|------|-------------------------|
| OTP at signup | Verification code |
| OTP verified, account active (e.g. normal customer) | Your account is ready |
| OTP verified, pending admin approval | Account pending administrator approval |
| Admin approves registration | Your account has been approved |
| Admin rejects registration | Registration update |
| Admin deactivates active account | Your account has been deactivated |
| Admin reactivates deactivated account | Your account has been reactivated |
| Forgot password (registered email) | Password reset code (6-digit OTP) |
| Password reset completed | Your password was changed |
| Donation posted successfully | Donor: your listing is live (full food details) |
| New donation published | Receiver: new food available (full food details + link to Find Food) |

Uses `SMTP_*` and `FRONTEND_URL` from `.env`. Email failures are logged but do not block API responses.

### Forgot password (frontend)

1. `/forgot-password` — enter email; unregistered emails show a red error.
2. `/reset-password` — enter OTP from email, then set a new password (same strength rules as signup).

## Donation endpoints (JWT required)

### Receiver — browse and claim

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/donations/available?lat=&lng=` | Receiver | List `available` donations within **25 km** of receiver (lat/lng required). Excludes expired listings. |
| POST | `/api/donations/:id/claim` | Receiver | Claim donation (`available` → `claimed`). Body required: `receiverLatitude`, `receiverLongitude`, `receiverAddress`. Sends emails to donor, receiver, and all active drivers. |
| GET | `/api/donations/my-claims` | Receiver | List donations claimed by the current receiver. |

### Donor — create and manage


| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/donations/analyze-image` | Multipart field `image` (JPEG/PNG, max 10 MB). Gemini vision analyzes the photo, then stores it in R2. Returns `{ success, imageUrl, predictions }`. |
| POST | `/api/donations` | Create donation from form JSON (includes `imageUrl`, AI metadata, pickup window, `pickupAddress`, `donorLatitude`, `donorLongitude`, `listingType`, price). Sends the donor a confirmation email and notifies **all active, verified Receiver accounts** by email with full listing details (requires `SMTP_*`). |
| GET | `/api/donations/mine` | List current donor's donations (newest first). |
| GET | `/api/donations/:id` | Get one donation (owner only). |
| PATCH | `/api/donations/:id` | Update donation when `status` is `available` or `draft` (including `pickupAddress` and coordinates). |

List/detail responses include `pickupAddress` and `donorAddress` (same value) for maps and receiver UI.

## Real-time (Socket.IO)

Connect from the frontend with `auth: { token: <JWT> }` (same origin or proxy `/socket.io`).

| Event | Audience | When |
|-------|----------|------|
| `donation:created` | `receivers` room | New donation posted |
| `donation:claimed` | `receivers` room | `{ donationId }` |
| `donation:claimedForDonor` | `donor:{donorId}` room | `{ donationId, donorId, donation }` |
| `donation:newPickup` | `drivers` room | `{ donationId, donation }` |
| `donation:cancelled` | `receivers` room | `{ donationId }` |

Receivers join `receivers`; drivers join `drivers`; donor roles join `donor:{userId}` on connect.

| Donation claimed | Donor, receiver, and each active driver notified by email |
| DELETE | `/api/donations/:id` | Cancel donation (sets `status` to `cancelled`). |

**Analyze-image rejection codes (HTTP 400):**

| Code | Meaning |
|------|---------|
| `AI_GENERATED_IMAGE` | Synthetic/CGI/stock image (not a real photo) |

If `GEMINI_API_KEY` is missing, analyze-image returns **503** with `GEMINI_NOT_CONFIGURED`.

## Admin endpoints (JWT + role `Admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/pending-users` | Users awaiting approval |
| GET | `/api/admin/stats` | Dashboard counts |
| GET | `/api/admin/users` | All non-admin users |
| PATCH | `/api/admin/users/:id/status` | `{ "status": "completed" \| "rejected" \| "inactive" }` |

`completed` sets `accountStatus` to `active`; `rejected` / `inactive` map to `rejected` / `deactivated`.

## Signup approval policy (after email OTP)

| Role | Admin approval |
|------|----------------|
| Receiver, Driver, Restaurant, Supermarket, Business, Individual | Required |
| Customer — low income | Required |
| Customer — normal income | Not required (active immediately) |

## Default admin account

From the `backend` folder (with `MONGO_URI` set in `.env`):

```bash
npm run seed:admin
```

This creates or updates:

- **Email:** `admin`
- **Password:** `admin123`
- **Role:** `Admin` (active, email verified)

Log in at `/login`, then open `/admin/dashboard`.

## Create the first Admin user (manual)

There is no admin signup page. Alternatively, promote a user in MongoDB Atlas / Compass or the shell:

```javascript
// Example: promote by email (user must already exist from signup)
db.users.updateOne(
  { email: "your-admin@gmail.com" },
  { $set: { role: "Admin", accountStatus: "active", isEmailVerified: true } }
)
```

Or create one manually with a bcrypt-hashed password. Then log in at `/login` and open `/admin/dashboard`.

To hash a password in Node:

```bash
node -e "require('bcryptjs').hash('YourPassword123', 12).then(console.log)"
```
