# IntellMeet - AI-Powered Enterprise Meeting & Collaboration Platform

🌐 **Live Application URL**: [https://intellmeet-ai-meet-frontend.vercel.app/](https://intellmeet-ai-meet-frontend.vercel.app/)  
🛢️ **Production Backend API**: [https://intellmeet-ai-meet.onrender.com/](https://intellmeet-ai-meet.onrender.com/)

IntellMeet is a modern, premium enterprise web application that integrates real-time WebRTC audio/video conferencing, collaborative canvas whiteboards, interactive Kanban board task management, and deep AI-driven analytics. 

It is designed with strict performance optimizations, security principles, and robust database persistence.

---

## 🚀 Key Features

1. **Real-Time Video & Audio Conferencing**: Powered by WebRTC stream signaling, local and remote media selectors, and low-latency audio mixing.
2. **Collaborative Whiteboard**: Synchronized canvas drew paths allowing real-time sketches and wireframing during ongoing calls.
3. **End-to-End Encrypted (E2EE) Chat**: Secure, room-based chat utilizing XOR encryption bound to the unique meeting passcode key. Ciphertexts are transmitted/stored in encrypted format, visible only to room members.
4. **AI-Driven Transcription & Summaries**: Extract live transcripts, auto-generate call summaries, list action items, and compute speaker sentiment timelines.
5. **Integrated Kanban Board**: Full-featured Task Hub to assign, sort, and manage action items extracted by the AI during meetings.
6. **AI Productivity Analytics**: Spline charts depicting sentiment trends, speech share ratios, weekly meeting density, and team velocity metrics.
7. **Production Security (OWASP Top 10)**:
   * **JWT Access & Refresh Token Rotation**: Strict token lifetimes (15m Access Token, 7d Refresh Token) rotating dynamically on boot.
   * **Helmet CSP Headers**: Guarding against Cross-Site Scripting (XSS) and Clickjacking.
   * **Express Rate Limiting**: Safeguarding APIs against brute-force attacks and abuse.
   * **Client-Side Captcha Validation**: Preventing automated script bots on login/registration forms.
8. **Low-Bandwidth Throttling**: Automatically lowers local stream frames down to 2 FPS when network bandwidth constraints are detected.

---

## 📁 Repository Structure

The project is structured as a modular monorepo:

```text
├── /frontend               # Vite + React + TypeScript App
│   ├── /src
│   │   ├── /components     # UI components and canvas panels
│   │   ├── App.tsx         # Main Application wrapper
│   │   ├── index.css       # Core design system and HSL variables
│   │   └── supabase.ts     # Supabase connection fallback
│   ├── tsconfig.json       # Strict TypeScript configuration
│   └── package.json
│
├── /backend                # Node.js + Express + WebSocket Server
│   ├── /src
│   │   ├── /controllers    # Express controllers (auth, meetings, tasks)
│   │   ├── /routes         # API endpoint definitions
│   │   ├── /tests          # Integration and RBAC integration tests
│   │   └── server.ts       # Server boot, Socket.io signaling
│   ├── Dockerfile          # Production multi-stage Docker build config
│   ├── tsconfig.json       # TS configuration for Node runtime
│   └── package.json
```

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
Ensure you have the following installed locally:
* **Node.js** (v18 or higher recommended)
* **MongoDB** (running on port `27017` locally, or a remote connection string)
* **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/Pramodh-1309/Intellmeet-AI-meet.git
cd Intellmeet-AI-meet
```

### 3. Install Dependencies
Install modules using legacy-peer-deps to align packages:

**Install Root & Backend Modules:**
```bash
npm install --legacy-peer-deps
```

**Install Frontend Modules:**
```bash
cd frontend
npm install --legacy-peer-deps
cd ..
```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the `/backend` folder:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/intellmeet
JWT_SECRET=supersecret_intellmeet_token_2026
JWT_REFRESH_SECRET=supersecret_intellmeet_refresh_token_2026

# Optional settings for Redis Cache & SMTP Mailers:
# REDIS_URL=redis://127.0.0.1:6379
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=587
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_pass
```

Create a `.env` file in the `/frontend` folder to point to your backend:
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 🏃 Running the Application

### Start MongoDB
Ensure your local MongoDB service is active:
* **Windows**: Run `net start MongoDB` or use the Services utility.
* **Mac**: `brew services start mongodb-community`

### Run Services
You can spin up both servers concurrently from the root directory:
```bash
# Start backend in dev mode (listening on port 5000)
npm run dev:backend

# Start frontend (listening on port 3000)
npm run dev:frontend
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Running Tests & Checks

Confirm your code compiles cleanly and matches style criteria:

### 1. Compile Check (TypeScript Lint)
```bash
cd frontend
npx tsc --noEmit
```

### 2. Run Route Integration Tests
The backend contains a test suite asserting auth controls and route scopes:
```bash
cd backend
npm run test
```

---

## 🌐 Production Deployment Guide

This project is optimized for deployment on Vercel (Frontend) and Render (Backend).

### 1. Frontend Deployment on Vercel
1. Link your GitHub repository to **Vercel**.
2. Set the **Root Directory** setting to **`frontend`**.
3. Keep the default framework presets (**Vite** is automatically detected).
4. Add the following **Environment Variable**:
   * **Key**: `VITE_API_BASE_URL`
   * **Value**: *Your deployed Render backend URL* (e.g. `https://intellmeet-ai-meet.onrender.com`).
5. Click **Deploy**.

### 2. Backend Deployment on Render (Docker Container)
1. Go to **Render.com** and click **New Web Service**.
2. Select the repository and set the **Language/Runtime** to **`Docker`**.
3. Configure these path settings:
   * **Root Directory**: `backend`
   * **Dockerfile Path**: `Dockerfile`
4. Choose the **Free** instance tier.
5. In the **Environment Variables** section, add:
   * `PORT`: `5000`
   * `MONGO_URI`: *Your MongoDB Atlas connection URL (remember to URL-encode special characters in passwords, e.g. `@` becomes `%40`)*
   * `JWT_SECRET`: *Your JWT access key secret*
   * `JWT_REFRESH_SECRET`: *Your JWT refresh rotation secret*
6. Set the **Health Check Path** to **`/health`**.
7. Click **Create Web Service**.

---

## 🤝 Code & Repository Expectations
To keep the codebase modular and compliant:
* **Semantic Commit Messages**: Prefix commits with standard scopes (e.g., `feat:`, `fix:`, `docs:`, `style:`, `refactor:`).
* **Environment Separation**: Never commit secret keys or access tokens. Load configuration properties strictly from variables.
* **Responsive Styling**: Use the pre-defined HSL color variables (`--primary`, `--accent`, `--background`) to support seamless light/dark mode adjustments.