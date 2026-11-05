# Vibe - Anonymous Social Media Platform

Vibe is a modern, community-driven anonymous social media platform built using the MERN stack (MongoDB, Express.js, React.js, Node.js).

It empowers users to share authentic thoughts, controversial hot takes, questions, and polls without ever exposing their real identities, while maintaining strict content safety through an integrated Google Gemini AI moderation pipeline.

---

## Tech Stack
- **Frontend**: React 18, Vite, React Router DOM, Axios, Lucide React, CSS Modules
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT (Access & Refresh Tokens)
- **Content Moderation**: Google Gemini API & Deterministic Rule Engine
- **Media Storage**: Cloudinary (with offline fallback)
- **Architecture**: Modular feature-based structure as specified in `ProjectDesignDocument/`

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### 2. Backend Setup
```bash
cd backend
npm install
# configure .env from .env.example
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Client runs on http://localhost:5173
```

---

## Standard API Response Envelope
All API endpoints return:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "error": null
}
```
