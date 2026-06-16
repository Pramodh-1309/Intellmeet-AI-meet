# IntellMeet - AI Enterprise Meeting Platform

## Features
- AI Meeting Assistant
- Meeting Scheduling
- Real-time Collaboration
- Analytics Dashboard
- Recordings
- Action Items

## Tech Stack
- React + Vite
- Node.js + Express
- MongoDB
- TypeScript

## Installation

### Clone repository

```bash
git clone https://github.com/Pramodh-1309/Intellmeet-AI-meet.git
cd Intellmeet
```

### Install dependencies

```bash
npm install --legacy-peer-deps
cd frontend
npm install --legacy-peer-deps

cd ..
cd backend
npm install --legacy-peer-deps
```

### Configure environment

Copy:

```bash
copy .env.example .env
```

Edit `.env` values.

### Start MongoDB

Ensure MongoDB service is running.

### Start backend

```bash
npm run dev:backend
```

### Start frontend

```bash
npm run dev:frontend
```

Open:

```
http://localhost:3000
```