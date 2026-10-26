# Learn Flow AI — The Focus Haven 🎓

> An AI-powered EdTech web application transforming passive YouTube learning into an active, structured, and measurable curriculum.

---

## 🌟 Key Features

- **Automated Curriculum Generation**: Import any YouTube playlist or single video into a modular course pathway.
- **Resilient 4-Tier Speech Transcription**: Multi-tiered fallback pipeline (`youtube-transcript-api` → mobile client `yt-dlp` automatic subtitles → audio extraction with Groq `whisper-large-v3`).
- **AI Studio**:
  - Structured, high-density study notes synthesized with Groq (`llama-3.3-70b-versatile`).
  - Active-recall MCQ quizzes with explanations.
  - Analogy-based Concept Clarifier for simplifying difficult topics.
- **Personal Knowledge Library**: Save and search summaries, custom study guides, and quizzes.
- **Interactive Notes Manager**: Create standalone notes or edit video-associated notes with Markdown support.
- **Assessment & Practice**: Test recall with hidden answers, server-side scoring, and historical attempt tracking.
- **Real Analytics**: Live study streaks, completed lesson counters, study duration, and curriculum flow mapping.
- **Global Search**: Instant categorized search (`⌘K` / `Ctrl+K`) across courses, notes, saved resources, and quizzes.
- **Customizable Preferences**: Dark, light, and system theme modes, customizable daily study goals, and secure password updates.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons, Axios.
- **Backend**: FastAPI (Python 3.12), Uvicorn, Motor (Async MongoDB), PyJWT, Passlib / Bcrypt.
- **Database**: MongoDB (`learn_flow_db`).
- **AI & ML**: Groq SDK (`llama-3.3-70b-versatile`, `whisper-large-v3-turbo`), `yt-dlp`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB installed and running locally on `mongodb://localhost:27017`

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY and optional YOUTUBE_API_KEY

# Start backend server
python -m uvicorn main:app --reload --port 8000
```
Backend API will be available at `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`).

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 🛡️ Environment Variables (`backend/.env`)

```env
SECRET_KEY=your_secret_key_here
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=learn_flow_db
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
WHISPER_MODEL=whisper-large-v3-turbo
YOUTUBE_API_KEY=your_youtube_api_key_here
```

---

## 🧪 Testing

Run automated route verification and unit tests:

```bash
cd backend
python -m unittest test_suite.py
python test_all_routes.py
```
