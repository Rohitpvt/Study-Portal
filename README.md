# Christ University Study Platform

> A production-grade, full-stack academic resource hub for Christ University students and faculty — built with **FastAPI**, **React (Vite + Tailwind CSS)**, and an **AI-powered RAG engine** for intelligent syllabus querying.

---

## 🗂️ Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Quick Start](#quick-start)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Frontend Pages](#frontend-pages)
10. [Responsive Design System](#responsive-design-system)
11. [RBAC & Security](#rbac--security)
12. [AI / RAG Engine](#ai--rag-engine)
13. [Changelog](#changelog)

---

## Overview

The Christ University Study Platform is a collaborative academic library that allows students to discover, bookmark, and download vetted study materials — organized by course, subject, semester, and category. Administrators govern content quality via an AI-assisted review queue that scores submissions for plagiarism and grammar before publication.

---

## Key Features

| Feature | Description |
| :--- | :--- |
| **Structured Academic Discovery** | Hierarchical filters: Course → Subject → Semester → Category with dependency locking |
| **Mobile-First Responsive UI** | Slide-up filter drawer on mobile; full filter bar on desktop |
| **AI Syllabus Assistant** | FAISS/RAG chatbot answers questions about uploaded study materials |
| **Vetted Contribution Pipeline** | Students submit notes → AI scores them → Admin approves/rejects |
| **Role-Based Access Control** | `student` and `admin` roles with JWT-protected routes |
| **Domain-Locked Registration** | Only `@christuniversity.in` and recognized sub-domain emails allowed |
| **Automated Department Detection** | Department assigned from email subdomain at registration |
| **Favorites / Bookmarks** | Students save and revisit favourite materials |
| **Audit Logging** | Every admin action is logged with timestamps |
| **Admin Review Queue** | Dual-mode view: card layout on mobile, data table on desktop |

---

## Tech Stack

### Backend
| Layer | Technology |
| :--- | :--- |
| Framework | FastAPI (Python 3.11) |
| ORM | SQLAlchemy 2.x (Async) |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose), Passlib (bcrypt) |
| Migrations | Alembic |
| AI / Vector DB | FAISS, Sentence Transformers / OpenAI |
| Text Extraction | PyMuPDF (fitz) |
| Server | Uvicorn (ASGI) |

### Frontend
| Layer | Technology |
| :--- | :--- |
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| HTTP Client | Axios (with JWT interceptor) |
| Routing | React Router v6 |
| Auth Decode | jwt-decode |

### Infrastructure
| Concern | Current | Production Target |
| :--- | :--- | :--- |
| Database | SQLite (`christ_uni_dev.db`) | PostgreSQL |
| File Storage | Local `uploads/` directory | AWS S3 / GCS |
| Deployment | Local dev (uvicorn + Vite) | Docker / Cloud Run |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                  │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │ Materials  │ │  Admin   │ │ AI Chat  │ │
│  │          │ │ + Drawer   │ │  Panel   │ │  (RAG)   │ │
│  └──────────┘ └────────────┘ └──────────┘ └──────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ Axios (JWT Bearer)
┌───────────────────────▼─────────────────────────────────┐
│              FastAPI Backend  (main.py)                   │
│                                                           │
│  CORS Middleware (outermost)                              │
│  Rate Limiter Middleware                                  │
│  Session Middleware                                       │
│                                                           │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ │
│  │  /auth   │ │/materials  │ │  /admin  │ │  /chat   │ │
│  │  /users  │ │/favorites  │ │  /contri-│ │          │ │
│  │          │ │            │ │  butions │ │          │ │
│  └──────────┘ └────────────┘ └──────────┘ └──────────┘ │
│                                                           │
│  SQLAlchemy Async ORM  ◄──►  SQLite / PostgreSQL         │
│  FAISS Index  ◄──────────►  Uploaded PDF Chunks          │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Intel AI Project/
├── main.py                     # FastAPI app entry point, middleware stack
├── requirements.txt
├── alembic/                    # DB migration history
├── alembic.ini
├── Dockerfile
├── docker-compose.yml
├── .env                        # Environment secrets (never commit)
│
├── app/
│   ├── ai/                     # RAG engine, FAISS indexing
│   ├── background/             # Background task runners
│   ├── core/                   # Config, security, dependencies
│   ├── db/                     # Async DB session factory
│   ├── models/                 # SQLAlchemy ORM models
│   ├── routes/
│   │   ├── auth.py             # Registration, Login, OTP
│   │   ├── materials.py        # List, filter, search, download
│   │   ├── contributions.py    # Student submissions + pending queue
│   │   ├── admin.py            # Review queue, audit logs
│   │   ├── favorites.py        # Bookmark CRUD
│   │   ├── chat.py             # RAG AI chat endpoint
│   │   └── users.py            # User profile
│   ├── schemas/                # Pydantic request/response schemas
│   ├── services/               # Business logic layer
│   └── utils/
│       └── text_extractor.py   # PDF → text extraction (PyMuPDF)
│
├── uploads/
│   ├── notes/                  # Admin-uploaded materials
│   └── contributions/          # Student-submitted PDFs
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Routes + layout wrapper
        ├── main.jsx
        ├── index.css           # Global styles
        ├── constants/
        │   └── academicData.js # ACADEMIC_DATA, CATEGORIES, SEMESTERS
        ├── services/
        │   └── api.js          # Axios instance with JWT interceptor
        ├── components/
        │   └── layout/
        │       └── Navbar.jsx  # Responsive navbar with mobile drawer
        └── pages/
            ├── auth/
            │   ├── Login.jsx
            │   └── Register.jsx
            ├── Dashboard.jsx   # Stats overview + quick links
            ├── Materials.jsx   # Discovery + mobile filter drawer
            ├── Contributions.jsx # Submit study notes
            ├── Favorites.jsx   # Bookmarked materials
            ├── Admin.jsx       # Review queue + audit logs
            └── Chat.jsx        # AI chat interface
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
# 1. Clone and enter project
cd "Intel AI Project"

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your values

# 5. Run migrations
alembic upgrade head

# 6. Create an admin user
python create_admin.py

# 7. Start server
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Visit `http://localhost:5173` — API docs at `http://localhost:8000/docs`

---

## Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SECRET_KEY` | JWT signing key | `your-secret-key-here` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite+aiosqlite:///./christ_uni_dev.db` |
| `ALLOWED_ORIGINS` | CORS origin whitelist | `http://localhost:5173` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | `sk-...` |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed domains | `christuniversity.in,mca.christuniversity.in` |

---

## API Reference

All endpoints require `Authorization: Bearer <token>` unless marked `[public]`.

### Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register with domain-locked email |
| `POST` | `/auth/login` | Returns JWT access token |
| `POST` | `/auth/verify-otp` | OTP email verification |

### Materials
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/materials` | List/search/filter approved materials |
| `POST` | `/materials` | Upload material `[admin only]` |

**Query params for `GET /materials`:** `search`, `course`, `subject`, `semester`, `category`, `sort`

### Contributions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/contributions` | Submit material for review |
| `GET` | `/contributions/pending` | List pending submissions `[admin]` |

### Admin
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `PATCH` | `/admin/contributions/{id}/review` | Approve or reject submission |
| `GET` | `/admin/logs` | Retrieve system audit log |

### Favorites
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/favorites` | List bookmarked materials |
| `POST` | `/favorites/{material_id}` | Add bookmark |
| `DELETE` | `/favorites/{material_id}` | Remove bookmark |

### Chat
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/chat` | Query the RAG AI assistant |

---

## Frontend Pages

| Page | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| Login | `/login` | Public | Email + password login |
| Register | `/register` | Public | Domain-locked registration with OTP |
| Dashboard | `/dashboard` | Auth | Stats, quick nav cards |
| Materials | `/materials` | Auth | Discovery + filter drawer + upload (admin) |
| Contributions | `/contributions` | Student | Submit notes for review |
| Favorites | `/favorites` | Auth | Bookmarked materials list |
| Admin Review | `/admin` | Admin | Review queue + audit logs |
| AI Chat | `/chat` | Auth | RAG-powered study assistant |

---

## Responsive Design System

The platform uses a **mobile-first Tailwind CSS** design strategy.

### Breakpoints Used
| Prefix | Width | Behaviour |
| :--- | :--- | :--- |
| *(default)* | `< 768px` | Mobile layout |
| `md:` | `≥ 768px` | Tablet / desktop layout |
| `xl:` | `≥ 1280px` | Wide desktop optimizations |

### Key Responsive Behaviours

#### Navbar
- **Mobile**: Hamburger icon → glassmorphism slide-in drawer with all nav links
- **Desktop**: Horizontal nav links inline

#### Materials Page — Filter System
- **Mobile**: Filters hidden by default. A single **"Filters" button** (indigo, with active-count badge) opens a **slide-up bottom drawer**
  - Drawer has smooth `translate-y` animation + dark backdrop blur overlay
  - Dropdowns inside drawer use temporary state; changes only committed on **"Apply Filters"**
  - Active filters shown as dismissible chip pills below the search bar
- **Desktop**: Full **"Refine Discovery"** bar always visible — compact `flex-wrap` row with `min-width`/`max-width` constrained selects, vertical divider, flex-1 search input

#### Materials Results
- **Mobile**: Responsive **card grid** — title, subject·semester, category badge, Download button
- **Desktop**: Dense **data table** — Title | Category | Semester | ⭐ Bookmark | Download

#### Admin Review Queue
- **Mobile**: Gesture-friendly **review cards** with Approve / Reject buttons
- **Desktop**: Full **data table** with plagiarism score, quality score, icon actions

#### Dashboard
- **Mobile → Desktop**: Stats grid transitions `grid-cols-1` → `grid-cols-2` → `grid-cols-4`

---

## RBAC & Security

### Roles
| Role | Permissions |
| :--- | :--- |
| `student` | Browse materials, bookmark, contribute notes, use AI chat |
| `admin` | All student permissions + upload materials directly, review/approve/reject contributions, view audit logs |

### Middleware Stack (order matters)
```python
# main.py — outermost first
app.add_middleware(CORSMiddleware, ...)      # 1st — handles preflight OPTIONS
app.add_middleware(RateLimitMiddleware, ...) # 2nd
app.add_middleware(SessionMiddleware, ...)   # 3rd
```

> **Critical**: CORS must be the outermost middleware. If placed inner, preflight `OPTIONS` requests hit rate-limiting before CORS headers are attached, causing `405` / `ERR_FAILED` errors in the admin panel.

### Auth Flow
1. User registers → OTP sent to email → verified
2. Login → server returns signed JWT
3. Frontend stores token in `localStorage`, attaches as `Authorization: Bearer` header via Axios interceptor
4. Protected routes decode JWT on backend using a `get_current_user` dependency

---

## AI / RAG Engine

| Component | Detail |
| :--- | :--- |
| **Indexing** | On startup, all approved materials are loaded; text extracted via PyMuPDF, chunked, embedded, and indexed into FAISS |
| **Query flow** | User query → embedded → FAISS similarity search → top-k chunks retrieved → context injected into LLM prompt |
| **Embedding model** | Sentence Transformers (local) or OpenAI `text-embedding-ada-002` (requires `OPENAI_API_KEY`) |
| **Index rebuild** | Triggered at startup; future: automatic rebuild on admin material approval |

---

## Changelog

### v3.0 — Mobile-First Responsive Overhaul *(March 2026)*
- **Materials page**: Complete mobile-first redesign
  - Slide-up bottom filter drawer with smooth animation + backdrop overlay
  - Active filter count badge on Filters button
  - Dismissible filter chip pills
  - Card-based mobile results view (replaces horizontal-scroll table)
  - Desktop filter bar: compact `flex-wrap` row with `min-width`/`max-width` constraints — fixes full-screen (1920px) text truncation
- **Admin Review page**: Dual-mode layout
  - Mobile: touch-friendly review cards with bold Approve/Reject buttons
  - Desktop: full data table with AI score badges
- **Navbar**: Glassmorphism mobile drawer with hamburger toggle
- **Dashboard**: Responsive stats grid (1 → 2 → 4 columns)
- **CORS fix**: Repositioned `CORSMiddleware` as outermost middleware, resolving `405` preflight failures on admin PATCH requests

### v2.0 — Academic Intelligence Engine *(March 2026)*
- FAISS/RAG AI chat assistant
- Hierarchical academic filtering (Course → Subject → Semester → Category)
- AI plagiarism + grammar scoring on contributions
- Favorites / bookmark system
- Native ORM-based system audit logging
- OTP email verification on registration

### v1.0 — Foundation *(March 2026)*
- FastAPI backend with JWT RBAC
- React + Vite + Tailwind frontend
- Material upload + listing
- Domain-locked registration
- SQLAlchemy async ORM + Alembic migrations

---

*Developed as a high-performance academic resource hub for Christ University.*
