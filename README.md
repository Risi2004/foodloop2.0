# 🟢 FoodLoop 2.0 — Zero Waste. Infinite Impact.

FoodLoop 2.0 is a highly styled, advanced circular food economy platform that connects **Commercial Food Suppliers**, **Contracted Logistics Couriers (Drivers)**, **Verified NGO Receivers**, and **Marketplace Customers** into a single, high-performance ecosystem. 

Powered by real-time WebSocket state synchronizations, Google Gemini AI features, and localized route navigation, FoodLoop 2.0 empowers communities to dynamically rescue surplus food, distribute donations, access cheap fresh groceries, and audit environmental impact metrics.

---

## 👥 Collaborative Team Members

This project is a collaborative effort developed and maintained by:

* **Jegatheesan Risikesan**
* **Mohammed Jaufer Mohammed jazeel**
* **Ahamed Umar Jiffry**

---

## 📁 Repository Directory Structure

```text
FoodLoop2.0/
├── backend/                       # Node.js + Express API Backend server
│   ├── config/                    # Mongoose database & Cloudflare R2 storage drivers
│   ├── controllers/               # Business logic controllers (donations, payouts, tracking)
│   ├── models/                    # MongoDB Schemas (User, Donation, CustomerOrder, etc.)
│   ├── routes/                    # Secure API Routing layers (JWT restricted)
│   ├── scripts/                   # Seeding, backfilling, and PDF compilation scripts
│   ├── socket.js                  # Real-time event handling system (Socket.IO)
│   ├── uploads/                   # Local profile image storage (dev fallback when R2 not configured)
│   └── knowledge/                 # RAG corpus source files & PDF help manuals
├── frontend/                      # React 19 + Vite Frontend SPA application
│   ├── public/                    # Static assets & map markers
│   └── src/
│       ├── components/            # Reusable UI components & dashboard cards
│       ├── contexts/              # Centralized React global states (Auth, Marketplace)
│       └── pages/                 # Specialized dashboard pages for all 5 roles
├── DEPLOYMENT.md                  # Detailed production deployment guide
└── FoodLoop_2.0_User_Manual.pdf   # Complete 8-page compiled PDF Operations Manual
```

---

## 🛠️ Technology Stack & Core Ecosystem

### **Frontend Client**
* **Core & Logic**: React 19, JavaScript (ES6+), React Context API
* **Build System & Compiler**: Vite + Babel React Compiler
* **Routing**: React Router DOM (v7)
* **Styling**: Modern, responsive Custom HSL CSS (No styling framework dependencies)
* **Interactive Maps**: Leaflet & React Leaflet (OpenStreetMap API)
* **Progressive Web App (PWA)**: `vite-plugin-pwa` (offline caching, service workers, manifest generation)

### **Backend Server & Services**
* **Runtime & Framework**: Node.js, Express.js
* **Database**: MongoDB (Mongoose Object Modeling)
* **Real-time Engine**: Socket.IO (Event-driven socket mergers)
* **Object Store**: Cloudflare R2 (S3-compatible serverless asset storage) with local disk fallback
* **AI Orchestration**: Google Gemini AI (RAG Search, Vision Rejections, Tomorrow Forecasts, Document Verification)
* **Weather Integration**: OpenWeather API (Weather metrics cache)
* **Operational Reporting**: PDFKit (Programmatic vector PDF compiler)
* **Email System**: Nodemailer SMTP (OTP signups, transactional logs, approval notifications)

---

## ⚡ Step-by-Step Local Setup & Execution Guide

Follow these steps to configure your environment and start the development servers locally.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher)
* **MongoDB** (Local Community Edition or MongoDB Atlas cloud instance URI)
* **Cloudflare R2 Bucket** *(Optional for local dev — profile images fall back to local disk storage)*
* **APIs**: Google Gemini API key and OpenWeather API key

---

### 2. Configure Backend Services

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
3. Edit the newly created `backend/.env` file and populate the environment variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/foodloop           # Or your MongoDB Atlas URI
JWT_SECRET=your_long_random_jwt_signing_key_secret

FRONTEND_URL=http://localhost:5173                     # Dev Vite URL

# Transactional Email (Google App Password recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=586
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password

# Cloudflare R2 Bucket Credentials (optional for local dev)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=foodloop-uploads
R2_PUBLIC_BASE_URL=https://pub-yourbucket.r2.dev

# AI & Weather Services
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash                          # Defaults to gemini-1.5-flash
WEATHER_API_KEY=your_openweather_api_key
```

4. Install the required Node packages:
   ```bash
   npm install
   ```

---

### 3. Configure Frontend Client

1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
3. Edit the `frontend/.env` file:
   ```env
   # Leave VITE_API_URL blank for local dev to use Vite's internal proxies:
   VITE_API_URL=
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

---

### 4. Database Seeding & RAG Ingestion

Before launching the servers, seed the default administrator account and compile the AI chatbot search index.

1. **Seed Administrator Credentials**:
   Run the following script inside the `backend/` folder to seed the admin account:
   ```bash
   cd ../backend
   npm run seed:admin
   ```
   > [!NOTE]
   > This generates a default admin user:
   > * **Email**: `admin`
   > * **Password**: `admin123`
   > * **Role**: `Admin`

2. **Ingest Chatbot Knowledge Corpus**:
   If utilizing the 24/7 automated client chatbot, ingest your knowledge bases into the vectorized search index:
   ```bash
   npm run chat:ingest
   ```

---

### 5. Running the Application

Start both development servers to boot the platform.

#### **Start Backend API & Socket Server**
Inside the `backend/` directory:
```bash
npm run dev
```
* The API will boot on `http://localhost:5000`.

#### **Start Frontend Client**
Inside the `frontend/` directory in a new terminal window:
```bash
npm run dev
```
* The React client will boot on `http://localhost:5173`. Open this URL in your web browser.

---

## 🤖 Advanced AI Features

### 🔍 1. Gemini Vision Rejection Gate
To guarantee food safety and database sanity, photo uploads of posted donations are vetted in real-time. The Gemini vision models instantly audit uploaded files, rejecting synthetic (CGI) renders, spoiled food, and non-food content before writing to Cloudflare R2.

### 🌤️ 2. Tomorrow's Weather-Aware Suggestion Panel
Allows commercial suppliers to request weather-integrated food preparation recommendations. Combines live OpenWeather coordinates with the Gemini API to suggest optimal inventory volumes (e.g., advising warm hot beverages/soups during cold/rainy spells) to reduce municipal food waste.

### 💬 3. 24/7 Multi-Lingual Help Chatbot
An internal RAG (Retrieval-Augmented Generation) chatbot. Ingests all project Help manuals, FAQ texts, and localized guidelines to respond instantly in **English**, **Tamil**, or **Sinhala** for immediate, self-managed user onboarding.

### 🧠 4. AI-Powered Document Verification (Admin)
When an admin reviews a pending user registration, an **"Analyse with AI"** button triggers the Gemini API to:
- Read and extract text from all submitted documents (business registration, address proof, NIC, driving licence, etc.)
- Cross-reference the documents against the user's stated details (name, address, business type)
- Produce a structured **Approve / Reject recommendation** with a written justification
- Highlight specific discrepancies or missing information

> [!NOTE]
> The AI recommendation is advisory — admins retain full control over the final approval decision.

---

## 🚀 Key Operational Flows

* **Low-Income Monthly Discount System**: Eligible low-income customers receive a 20% discount on up to 20 fresh products per calendar month. The frontend cart applies the discount, and the backend verifies monthly allocations dynamically on upsert to prevent double-spending or rate exploitation.

* **Driver Logistics Routing & Capacity Limits**: Pickups are automatically filtered by vehicle capacity tiers (Bicycle, Scooter, Car, Van). Drivers can simulate active routes using "Demo Simulation", which updates coordinates dynamically via WebSockets, transferring statuses on receivers' tracking panels instantly.

* **Admin Auditing & Financial Withdrawals**: System administrators audit platform card inflows and payout requests. Clicking review loads details in a slide drawer, letting admins approve or reject withdrawals before marking them as fully paid.

* **Post-Rejection Re-Approval Notifications**: If a previously rejected user is later approved by an admin, an automated email is dispatched to the user notifying them their account is now active and they can log in.

* **Admin User Management**: Admins can delete any user account from the users management panel. Rows for rejected users display both an **Approve** and a **Delete** button for streamlined remediation workflows.

---

## 📱 PWA Support & Mobile Responsiveness

FoodLoop 2.0 is fully optimized as an installable **Progressive Web App (PWA)**, providing a native app experience on both desktop and mobile devices.

### 🌟 PWA Capabilities
* **Fully Installable:** Users can add FoodLoop directly to their home screens (iOS/Android) or desktops (Windows/macOS) from any compatible browser, bypassing the need for app store downloads.
* **Offline Functionality:** Powered by a background **Service Worker** (via `vite-plugin-pwa`), essential assets (HTML, CSS, JavaScript, fonts, and key images) are cached locally, allowing the shell of the app to load instantly even without an internet connection.
* **App Branding & Aesthetics:** Includes custom web app manifests setting brand colors (`#4CAF50`), standalone display mode (removes browser URL bar), and specialized splash screens/launcher icons:
  * `192x192` and `512x512` launcher and splash screen icons.
  * `180x180` high-resolution iOS `apple-touch-icon` for Apple device home screens.
* **Background Updates:** Updates are automatically fetched in the background and applied seamlessly on the next app load (`registerType: 'autoUpdate'`).

### 📱 Responsive Layout Enhancements
To support PWA installation on a wide variety of mobile displays, the user interface features tailored responsive CSS styling:
* **Dynamic Wrapping for Cards:** Large layout card containers (such as **My Claims** and **Donation Cards**) dynamically scale down from desktop sizes (e.g., `560px` or `424px`) to fluid percentage-based widths on smaller devices to prevent horizontal scroll overflow.
* **Form Wrapping & Stacking:** Grid-aligned multi-column form fields (such as first/last name grids on the **Signup Page**) wrap into a single vertical stack below `600px` screen width, preventing input squishing on mobile views.
* **Mobile-Optimized Profile Editing:** The sidebar navigation and form panels on the Edit Profile screens collapse into a vertical stack below `900px`, allowing quick and clean updates.
* **Fluid Chatbot UI:** The pop-out AI chatbot panel scales dynamically to fit screen sizes down to `320px` width while retaining comfortable outer margins.

---

## 👤 Profile Management

All authenticated roles can edit their profile information directly from their dashboard. Changes are persisted to the database immediately.

### Editable Fields Per Role

| Role | Editable Fields |
|------|----------------|
| Restaurant / Supermarket / Business | Business name, Business type, Contact number, Address, Email, Profile photo |
| Individual Supplier | Username, NIC number, Startup name, Startup details, Contact number, Address, Email, Profile photo |
| Receiver (NGO) | Organization name, Organization type, About us, Contact number, Address, Email, Profile photo |
| Driver | Full name, Vehicle type, Vehicle number, Contact number, Address, Email, Profile photo |

> [!NOTE]
> **Single-attribute updates are supported** — users can update just one field (e.g. only their contact number) without submitting the entire form. The backend only applies fields that are explicitly provided in the request.

### Profile Image Storage
- **Production (R2 configured)**: Profile images are uploaded to Cloudflare R2 and served from the public CDN URL.
- **Development (R2 not configured)**: Images are saved locally to `backend/uploads/profiles/` and served via the Express static middleware at `/uploads/profiles/*`.
