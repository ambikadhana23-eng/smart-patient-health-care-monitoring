# 🎬 5-Minute Demo — MediQueue Smart Healthcare System

**Problem ID: IH-02 — Smart Patient Queue & Medicine Reminder System**

**Live Demo URL:** [https://sites.super.myninja.ai/6cc1a77d-34d2-4598-8709-35f861cc3059/5f3f1dcb/index.html](https://sites.super.myninja.ai/6cc1a77d-34d2-4598-8709-35f861cc3059/5f3f1dcb/index.html)

* * *

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Doctor | [sarah@hospital.com](mailto:sarah@hospital.com) | doctor123 |
| Doctor | [james@hospital.com](mailto:james@hospital.com) | doctor123 |
| Doctor | [emily@hospital.com](mailto:emily@hospital.com) | doctor123 |
| Patient | _(register any email)_ | _(any password)_ |

* * *

## 5-Minute Demo Script

### Minute 0:00–0:30 — Landing Page & Overview

1.  Open the **Live Demo URL** in your browser.
2.  Show the landing page: hero banner, "How it works" steps, and the 6 feature cards (Digital Queue Tokens, Live Queue Status, Medicine Reminders, QR Code Check-in, Smart Notifications, Dark Mode).
3.  Point out the **Dark Mode toggle** in the header — click it to show the dark theme.
4.  Click **"I'm a Patient →"** to go to the registration page.

### Minute 0:30–1:30 — Patient Registration & Login

5.  Fill in the registration form:
    -   Full Name: `Demo Patient`
    -   Email: `demo@patient.com`
    -   Password: `pass123`
    -   Phone: `555-0100`
    -   Age: `35`
    -   Gender: `Male`
6.  Click **Create Account** — you're instantly logged in and redirected to the **Patient Dashboard**.
7.  Show the dashboard **Overview** tab: 4 stat cards (Total Appointments, Completed, Upcoming/Active, Active Reminders) and Quick Actions.

### Minute 1:30–2:30 — Book Appointment & Get QR Token

8.  Click the **Book Appointment** tab.
9.  Notice the 3 available doctors displayed as cards (Dr. Sarah Smith — General Physician, Dr. James Wilson — Cardiologist, Dr. Emily Davis — Pediatrician).
10.  Pick a date (today), type a reason: `Fever and headache`, and click on **Dr. Sarah Smith** to select her.
11.  Click **Book Appointment** — a **QR Code modal** pops up showing:
     -   Your **Token #1**
     -   A scannable **QR code**
     -   Date and doctor details
12.  Click **Got it!** to close the modal.

### Minute 2:30–3:00 — Live Queue Status

13.  Click the **Live Queue** tab.
14.  Show the live queue display:
     -   Doctor name and specialty
     -   Your **Token #1**
     -   **WAITING** status badge
     -   **Queue Position: 1**
     -   **0 patients ahead**
     -   **"You are next!"** message
15.  Explain that this auto-refreshes every 8 seconds to show real-time updates.

### Minute 3:00–3:30 — Set Medicine Reminders

16.  Click the **Medicine Reminders** tab.
17.  Click **\+ Add Reminder** and fill in:
     -   Medicine: `Paracetamol`
     -   Dosage: `500mg`
     -   Times: `08:00` and `20:00`
     -   Start date: today
18.  Click **Save** — the reminder appears in the list with active/pause controls.

### Minute 3:30–4:30 — Doctor Dashboard & Consultation

19.  **Open a new browser tab** (or log out and log in as a doctor).
20.  Go to the demo URL, click **Doctor Login**.
21.  Login with `sarah@hospital.com` / `doctor123`.
22.  Show the **Doctor Dashboard Overview**: stats (Total Today, Waiting, In Consultation, Completed) and charts.
23.  Click the **Patient Queue** tab.
24.  You'll see the patient who just booked (Demo Patient, Token #1, "Fever and headache").
25.  Click **Start Consultation** — the status changes to **In Consultation**.
26.  Click **Prescription** — type a prescription note (e.g., `Paracetamol 500mg twice daily for 5 days. Rest and plenty of fluids.`) and click **Save**.
27.  Click **Mark Completed** — the status changes to **Completed**.

### Minute 4:30–5:00 — Notifications & Wrap-up

28.  Switch back to the **patient browser tab**.
29.  Click the **Notifications** tab — you'll see alerts for:
     -   Consultation started
     -   Prescription added
     -   Consultation completed
30.  Click the **History** tab — the completed appointment shows with a **View Prescription** button. Click it to see the doctor's prescription.
31.  **Wrap up**: summarize the complete workflow — register → book → QR token → live queue → doctor consult → prescription → notification → history.

* * *

## Feature Checklist (All Implemented ✅)

### Core Features (Mandatory)

-   ✅ Patient & Doctor Login (JWT authentication)
-   ✅ Appointment Booking (date, doctor, reason)
-   ✅ Digital Queue Token (auto-incrementing per doctor per day)
-   ✅ Live Queue Status (auto-refresh every 8 seconds)
-   ✅ Medicine Reminder (CRUD with multiple daily times)
-   ✅ Responsive UI (mobile, tablet, desktop)

### Bonus Features (Optional)

-   ✅ QR Code Check-in (QR generated on every booking)
-   ✅ Notification Alerts (consultation started/completed, prescription added)
-   ✅ Appointment History (full history with prescription access)
-   ✅ Dashboard with Queue Statistics (stat cards + charts)
-   ✅ Dark Mode (toggle in header, persists in localStorage)

### Additional Features

-   ✅ Prescription Notes (doctor can add/edit per appointment)
-   ✅ Skip consultation option
-   ✅ Pause/Resume reminders
-   ✅ Reminder due-check API
-   ✅ Weekly bar chart & status distribution chart (doctor dashboard)

* * *

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js + Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| QR Codes | qrcode (npm) / in-browser SVG |
| Frontend | Vanilla HTML + CSS + JavaScript |
| Styling | CSS Custom Properties (light/dark) |
| Deployment | Static hosting (in-browser MockAPI) |

* * *

## Architecture

### Full-Stack Version (in this repo)

```
smart-healthcare/
├── backend/          # Node.js + Express + SQLite API server
│   ├── db.js         # Database initialization & seeding
│   ├── server.js     # Express server (serves API + static frontend)
│   ├── middleware/   # JWT auth middleware
│   └── routes/       # auth, appointments, reminders, notifications
├── public/           # Frontend (HTML/CSS/JS SPA)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── DATABASE_SCHEMA.md
├── README.md
├── render.yaml       # Render.com deployment config
└── .gitignore
```

### Static Deployment Version

```
smart-healthcare-deploy/
├── index.html        # Same UI, references local files
├── styles.css        # Same styles
├── db-local.js       # In-browser MockAPI (localStorage-based data layer)
└── app.js            # Same app logic, uses MockAPI.call() instead of fetch()
```

The static version replaces all backend API calls with an in-browser data layer (`db-local.js`) that uses `localStorage` to persist data. This allows the app to run on any static hosting service (Netlify, Vercel, GitHub Pages, S3) without a backend server.

* * *

## Database Schema (6 Tables)

1.  **doctors** — id, name, email (unique), password\_hash, specialty, created\_at
2.  **patients** — id, name, email (unique), password\_hash, phone, age, gender, created\_at
3.  **appointments** — id, patient\_id (FK), doctor\_id (FK), token\_number, appointment\_date, reason, status, queue\_position, qr\_data, created\_at
4.  **prescriptions** — id, appointment\_id (FK), notes, created\_at, updated\_at
5.  **reminders** — id, patient\_id (FK), medicine\_name, dosage, times (JSON), start\_date, end\_date, is\_active, created\_at
6.  **notifications** — id, user\_id, user\_role, type, message, is\_read, created\_at

See `DATABASE_SCHEMA.md` for full details including ER diagram and constraints.