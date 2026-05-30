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

### **Backend Server & Services**
* **Runtime & Framework**: Node.js, Express.js
* **Database**: MongoDB (Mongoose Object Modeling)
* **Real-time Engine**: Socket.IO (Event-driven socket mergers)
* **Object Store**: Cloudflare R2 (S3-compatible serverless asset storage)
* **AI Orchestration**: Google Gemini AI (RAG Search, Vision Rejections, Tomorrow Forecasts)
* **Weather Integration**: OpenWeather API (Weather metrics cache)
* **Operational Reporting**: PDFKit (Programmatic vector PDF compiler)
* **Email System**: Nodemailer SMTP (OTP signups, transactional logs)

---

## ⚡ Step-by-Step Local Setup & Execution Guide

Follow these steps to configure your environment and start the development servers locally.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher)
* **MongoDB** (Local Community Edition or MongoDB Atlas cloud instance URI)
* **Cloudflare R2 Bucket** (For avatar, PDF document, and food photo uploads)
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

# Cloudflare R2 Bucket Credentials
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=foodloop-uploads
R2_PUBLIC_BASE_URL=https://pub-yourbucket.r2.dev

# AI & Weather Services
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash                          # Defaults to gemini-3.5-flash
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

---

## 🚀 Key Operational Flows

* **Low-Income Monthly Discount System**: Eligible low-income customers receive a 20% discount on up to 20 fresh products per calendar month. The frontend cart applies the discount, and the backend verifies monthly allocations dynamically on upsert to prevent double-spending or rate exploitation.
* **Driver Logistics Routing & Capacity limits**: Pickups are automatically filtered by vehicle capacity tiers (Bicycle, Scooter, Car, Van). Cougars can simulate active routes using "Demo Simulation", which updates coordinates dynamically via WebSockets, transferring statuses on receivers' tracking panels instantly.
* **Admin Auditing & Financial Withdrawals**: System administrators audit platform card inflows and payout requests. Clicking review loads details in a slide drawer, letting admins approve or reject withdrawals before marking them as fully paid.

---

## 📄 Operational Manual
For detailed guides on utilizing the platform as a Supplier, NGO, Customer, Driver, or Admin, refer to the compiled document:
📘 **[FoodLoop 2.0 User Manual](file:///c:/Users/Risikesan/OneDrive/Desktop/FoodLoop2.0/FoodLoop_2.0_User_Manual.pdf)**
