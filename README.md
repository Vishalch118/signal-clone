# Signal Clone - SDE Fullstack Assignment

This project is a fully functional clone of the Signal messaging application, featuring real-time WebSockets, a Next.js (TypeScript) frontend, and a FastAPI (Python) backend with an SQLite database.

## 🚀 Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3, SQLAlchemy, WebSockets
- **Database**: SQLite

## ✨ Core Features
- **Authentic UI/UX**: Matches Signal's dark-mode chat layout, bubble styling, and layout.
- **Real-Time Messaging**: Instant 1-on-1 and Group chatting via WebSockets.
- **Mock Authentication**: OTP/Phone number based auto-registration and session handling.
- **Persistence**: All users, conversations, and messages are persisted in SQLite.

## 🛠 Setup Instructions

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Seed the database with mock users and conversations
python seed.py

# Start the server
uvicorn main:app --reload
```
The API will run at `http://localhost:8000` and the WebSocket at `ws://localhost:8000/ws`.

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:3000`.

## 📦 Database Schema
The database uses SQLAlchemy ORM to manage SQLite relationships:
- **Users**: `id`, `phone_number`, `display_name`, `avatar_url`
- **Conversations**: `id`, `is_group`, `name`
- **Messages**: `id`, `conversation_id`, `sender_id`, `content`, `status`, `created_at`

## 🌐 Deployment Notes
- **Frontend**: Designed for instant deployment on [Vercel](https://vercel.com).
- **Backend**: Can be deployed on Render, Railway, or Fly.io. Note: Since SQLite is file-based, deploying to an ephemeral file system (like Render's free tier) means messages will reset on spin-down unless a persistent disk volume is attached. For production, the database connection string in `.env` can easily be swapped to a managed PostgreSQL instance.

