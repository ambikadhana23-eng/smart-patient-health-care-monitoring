# 🏥 MediQueue — Smart Patient Queue & Medicine Reminder System

**Problem ID: IH-02 — Smart Healthcare**

A complete, full-stack web application that solves the problem of long waiting times and forgotten medicines in hospitals and clinics. Patients can book appointments, receive digital queue tokens, track their live queue position, and set medicine reminders. Doctors get a clean dashboard to manage their patient queue and complete consultations.

![Tech](https://img.shields.io/badge/Stack-Node.js%20%2B%20Express%20%2B%20SQLite-blue) ![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-green) ![Status](https://img.shields.io/badge/Status-Working%20Prototype-brightgreen)

* * *

## ✨ Features

### Patient Module

-   **Register / Login** — secure account creation with JWT authentication
-   **Book Appointment** — pick a date, choose a doctor, describe symptoms
-   **Digital Queue Token** — instant token number + scannable **QR code** for check-in
-   **Live Queue Status** — real-time queue position, patients ahead, estimated wait (auto-refreshes)
-   **Medicine Reminders** — add medicines with dosage, multiple daily times, start/end dates, pause/resume
-   **Appointment History** — full history with status and prescription access
-   **Notifications** — alerts when consultation starts, completes, or a prescription is added

### Doctor Module

-   **Login** — secure JWT login
-   **Patient Queue** — today's patients with token, position, demographics, and reason
-   **Mark Consultation** — Start → Complete (or Skip) with one click
-   **Prescription Notes** — add/edit free-text prescription notes per appointment
-   **Dashboard Statistics** — today's totals, weekly bar chart, status distribution

### Bonus Features (Implemented ✅)

-   ✅ **QR Code Check-in** — every booking generates a QR token
-   ✅ **Notification Alerts** — in-app toast + notifications center for patients & doctors
-   ✅ **Appointment History** — full patient history table
-   ✅ **Dashboard with Queue Statistics** — stat cards + charts for both roles
-   ✅ **Dark Mode** — toggle in header, persisted in localStorage
-   ✅ **Responsive UI** — works on mobile, tablet, and desktop

* * *

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js, Express.js |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| QR Codes | `qrcode` npm package |
| Frontend | Vanilla HTML5, CSS3, JavaScript (SPA, no framework needed) |
| Hosting | Render / Railway / any Node host (single deployable) |

* * *

## 📁 Project Structure

```
smart-healthcare/
├── backend/
│   ├── server.js            # Express server entry point
│   ├── db.js                # SQLite database setup + schema + seeding
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js          # JWT auth middleware
│   └── routes/
│       ├── auth.js          # Patient register/login, Doctor login
│       ├── appointments.js  # Booking, queue, status, prescriptions
│       ├── reminders.js     # Medicine reminder CRUD
│       └── notifications.js # Notifications + dashboard stats
├── public/                  # Static frontend (served by Express)
│   ├── index.html           # Single-page app with all views
│   ├── css/
│   │   └── styles.css       # All styling + light/dark themes
│   └── js/
│       └── app.js           # All frontend logic & API calls
├── DATABASE_SCHEMA.md       # Full database schema documentation
└── README.md
```

* * *

## 🌐 Live Demo

**Deployed URL:** [https://sites.super.myninja.ai/6cc1a77d-34d2-4598-8709-35f861cc3059/5f3f1dcb/index.html](https://sites.super.myninja.ai/6cc1a77d-34d2-4598-8709-35f861cc3059/5f3f1dcb/index.html)

The app is deployed as a static site with an in-browser data layer (localStorage-based MockAPI), so it runs entirely in the browser with no server needed. All features work identically to the full-stack version.

**Demo Accounts:**

-   **Doctors:** `sarah@hospital.com` / `doctor123`, `james@hospital.com` / `doctor123`, `emily@hospital.com` / `doctor123`
-   **Patients:** Register with any email and password, or use `john@test.com` / `pass123`

> **Note:** The full-stack version (Node.js + Express + SQLite) is in this repository. The static deployment uses the same UI with an in-browser data layer. To deploy the full-stack version, use the included `render.yaml` on Render.com (see [Deployment](#-deployment) below).

* * *

## 🚀 Running Locally

### Prerequisites

-   Node.js 18+ (tested on Node 20)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/smart-healthcare.git
cd smart-healthcare/backend

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open the app
#    http://localhost:3000
```

That's it! The database is created and seeded automatically on first run.

### Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Doctor | [sarah@hospital.com](mailto:sarah@hospital.com) | doctor123 |
| Doctor | [james@hospital.com](mailto:james@hospital.com) | doctor123 |
| Doctor | [emily@hospital.com](mailto:emily@hospital.com) | doctor123 |
| Patient | _(register any email)_ | _(your choice)_ |

* * *

## 🌐 Deployment

The app is a single Node.js server that serves both the API and the static frontend, so it deploys as **one service**.

### Option A — Render (recommended, free tier)

1.  Push the code to a public GitHub repository.
2.  Go to [render.com](https://render.com) → **New +** → **Web Service**.
3.  Connect your GitHub repo.
4.  Settings:
    -   **Root Directory:** `backend`
    -   **Build Command:** `npm install`
    -   **Start Command:** `npm start`
    -   **Environment:** `Node`
5.  Add environment variable (optional): `JWT_SECRET` = any random string.
6.  Click **Create Web Service**. Wait for deploy — you get a `https://<your-app>.onrender.com` URL.

> ⚠️ Render free tier sleeps after inactivity. The SQLite DB is ephemeral on free tier (resets on redeploy), which is fine for a demo. For persistence, attach a Render Disk (paid) or switch to PostgreSQL.

### Option B — Railway

1.  Go to [railway.app](https://railway.app) → **New Project** → deploy from GitHub repo.
2.  Set root to `backend`, Railway auto-detects Node and runs `npm start`.
3.  Add `PORT` and `JWT_SECRET` env vars if needed.

### Option C — Any Node host (Fly.io, Koyeb, etc.)

Same idea: point the host at the `backend` folder, run `npm install && npm start`, expose the port in `PORT` env var.

* * *

## 📡 API Reference

Base URL: `/api`

### Auth

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| POST | `/auth/patient/register` | Register a patient | — |
| POST | `/auth/patient/login` | Patient login | — |
| POST | `/auth/doctor/login` | Doctor login | — |
| GET | `/auth/doctors` | List all doctors (for booking) | — |
| GET | `/auth/me` | Current user profile | JWT |

### Appointments & Queue

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| POST | `/appointments` | Book appointment (returns token + QR) | Patient |
| GET | `/appointments/mine` | My appointment history | Patient |
| GET | `/appointments/:id` | Single appointment | JWT |
| GET | `/appointments/queue/:doctorId?date=` | Live queue for a doctor | JWT |
| GET | `/appointments/my-queue/:id` | My queue position | Patient |
| GET | `/appointments/doctor/today?date=` | Doctor's queue for a date | Doctor |
| PATCH | `/appointments/:id/status` | Update consultation status | Doctor |
| POST | `/appointments/:id/prescription` | Add/update prescription | Doctor |
| GET | `/appointments/:id/prescription` | View prescription | JWT |

### Reminders

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/reminders` | List my reminders | Patient |
| POST | `/reminders` | Create reminder | Patient |
| PUT | `/reminders/:id` | Update reminder | Patient |
| DELETE | `/reminders/:id` | Delete reminder | Patient |
| GET | `/reminders/due` | Reminders due now | Patient |

### Notifications & Stats

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| GET | `/notifications` | My notifications | JWT |
| PATCH | `/notifications/:id/read` | Mark one as read | JWT |
| PATCH | `/notifications/read-all` | Mark all as read | JWT |
| GET | `/notifications/doctor/stats?date=` | Doctor dashboard stats | Doctor |
| GET | `/notifications/patient/stats` | Patient dashboard stats | Patient |

* * *

## 🎬 5-Minute Demo Script

1.  **Open the app** → landing page with hero + features.
2.  **Patient flow:** Click _I'm a Patient_ → Register (e.g. `alice@demo.com / pass123`).
3.  **Book:** Go to _Book Appointment_ tab → pick today's date → select Dr. Sarah Smith → enter reason → submit. A **QR token modal** appears with Token #1.
4.  **Live Queue:** Go to _Live Queue_ tab → see Token #1, queue position 1, "You are next!"
5.  **Reminders:** Go to _Medicine Reminders_ → add "Paracetamol 500mg" at 08:00 & 20:00 → see it in the list with an ACTIVE badge.
6.  **Doctor flow:** Logout → click _I'm a Doctor_ → login `sarah@hospital.com / doctor123`.
7.  **Doctor dashboard:** See stats (1 patient, 1 waiting). Go to _Patient Queue_ → see Alice Johnson, Token #1, WAITING.
8.  **Consult:** Click _Start Consult_ → status becomes "In Consult". Click _Add Notes_ → write prescription → save.
9.  **Complete:** Click _Mark Complete_ → green COMPLETED badge.
10.  **Back to patient:** Logout → login as patient → _Live Queue_ shows completed + _View Prescription_ button → _History_ tab shows the full record.
11.  **Bonus:** Toggle 🌙 dark mode in the header.

* * *

## 📄 License

MIT — free to use for educational and hackathon purposes.