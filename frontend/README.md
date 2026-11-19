# AI Study Portal — Frontend Client

> Modern, responsive React Single-Page Application (SPA) built with **Vite**, **Tailwind CSS**, and **Lucide Icons** for the Christ University academic community.

[![Live App on Vercel](https://img.shields.io/badge/Vercel-Live_App-black?logo=vercel)](https://study-portal-final-123.vercel.app)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?logo=tailwindcss)](https://tailwindcss.com)

---

## 🌐 Production Deployment

The frontend is continuously deployed on **Vercel**:
* **Production URL:** [https://study-portal-final-123.vercel.app](https://study-portal-final-123.vercel.app)
* **Backend API (Upstream):** [https://intel-ai-backend-zk22.onrender.com](https://intel-ai-backend-zk22.onrender.com)

### Same-Origin Reverse Proxy Architecture
To avoid cross-origin issues and aggressive third-party tracker blocking (e.g., **Brave Shields**, **Safari ITP**, and browser adblockers), production API requests route through Vercel's edge network:

```
[Browser / Client]
       │
       ▼ (Same-Origin HTTPS)
https://study-portal-final-123.vercel.app
       ├── /dashboard, /login, /viewer (React SPA routing)
       ├── /health ──────► Proxied to Render: intel-ai-backend-zk22.onrender.com/health
       └── /api/v1/* ────► Proxied to Render: intel-ai-backend-zk22.onrender.com/api/v1/*
```

---

## 🚀 Key Features

* **Hierarchical Academic Discovery:** Filter study materials across Course, Subject, Semester, and Category with dependency locking.
* **Mobile-First Responsive Design:** Slide-up filter drawer on mobile with active filter counter badges, and responsive tables/cards.
* **Smart Cold-Start Handling (`SystemContext`):** Automatically detects Render free-tier cold starts, displaying a polite animated waking screen while auto-reconnecting in the background.
* **Role-Based Protected Routes (`AuthGuard`):** Granular access control for Students, Teachers, Admins, and Developers.
* **Document Viewer & Syllabus AI Chat:** In-browser PDF viewing, search, and RAG-assisted contextual chat.
* **Privacy & Telemetry:** Integrated with Sentry for error tracking (with PII scrubbing) and Umami for privacy-friendly analytics.

---

## 🛠️ Tech Stack

| Layer | Library / Tool |
| :--- | :--- |
| **Framework** | React 18 |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS v3 + Custom Glassmorphism / Festive Animations |
| **Icons** | Lucide React |
| **HTTP Client** | Axios (configured with same-origin dynamic proxy & JWT interceptor) |
| **Router** | React Router v6 |
| **Token Decoder** | `jwt-decode` |
| **Monitoring** | Sentry React SDK (`@sentry/react`) |
| **Analytics** | Umami Cloud Analytics |

---

## 📦 Project Structure

```
frontend/
├── index.html                  # HTML entry point with Umami analytics script
├── package.json
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind theme & animation extensions
├── vercel.json                 # Vercel edge reverse proxy & SPA rewrites
│
└── src/
    ├── main.jsx                # React root with Sentry initialization
    ├── App.jsx                 # Route definitions & SystemProvider wrapper
    ├── index.css               # Global Tailwind directives & animations
    │
    ├── components/
    │   ├── common/             # ErrorPage, ErrorBoundary, Onboarding, Skeleton, Toast
    │   ├── layout/             # Navbar, Footer, AuthGuard
    │   └── classroom/          # Classroom management & submission panels
    │
    ├── context/
    │   ├── AuthContext.jsx     # User authentication state
    │   ├── SystemContext.jsx   # Cloud health check & cold-start recovery
    │   ├── NotificationContext.jsx # Toast & notification management
    │   └── ThemeContext.jsx    # Light / dark theme support
    │
    ├── pages/
    │   ├── auth/               # Login.jsx, Register.jsx (domain-locked)
    │   ├── Dashboard.jsx       # Student dashboard & birthday celebrations
    │   ├── Materials.jsx       # Study material catalog & filter drawer
    │   ├── Viewer.jsx          # Embedded PDF viewer with AI summary
    │   ├── Chat.jsx            # RAG AI study assistant interface
    │   ├── Contributions.jsx   # Note submission pipeline
    │   ├── Favorites.jsx       # Bookmarked materials
    │   ├── Admin.jsx           # Review queue & audit logs
    │   ├── Profile.jsx         # User settings & avatar management
    │   └── classroom/          # Classroom list & detail views
    │
    └── services/
        ├── api.js              # Axios client with automatic proxy detection
        └── analytics.js        # Umami event tracking helpers
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `frontend` folder for local development:

```env
# API Base URL (defaults to localhost:8000/api/v1 locally)
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Monitoring & Analytics
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_UMAMI_WEBSITE_ID=your_umami_id_here
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js

# Google Drive Integration (Classroom attachments)
VITE_GOOGLE_DRIVE_API_KEY=your_google_drive_api_key
VITE_GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_DRIVE_APP_ID=your_google_app_id
```

> [!NOTE]
> In production on Vercel, `api.js` automatically uses `${window.location.origin}/api/v1` via Vercel's edge rewrites in `vercel.json`.

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

---

## 📄 License

Part of the **AI Study Portal** repository. Licensed under the [MIT License](../LICENSE).
