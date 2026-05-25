# FoodLoop Backend

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

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

API base: `http://localhost:5000`

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

Uses `SMTP_*` and `FRONTEND_URL` from `.env`. Email failures are logged but do not block API responses.

### Forgot password (frontend)

1. `/forgot-password` — enter email; unregistered emails show a red error.
2. `/reset-password` — enter OTP from email, then set a new password (same strength rules as signup).

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
