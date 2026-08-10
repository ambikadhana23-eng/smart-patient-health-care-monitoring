# Database Schema — Smart Healthcare System (MediQueue)

The application uses **SQLite** (via `better-sqlite3`) as its database. The database file `healthcare.db` is created automatically on first run and seeded with three demo doctors.

## Entity Relationship Overview

```
┌──────────┐     ┌─────────────────┐     ┌─────────────┐
│ patients │◄────│  appointments   │────►│   doctors   │
└──────────┘     └────────┬────────┘     └─────────────┘
     ▲                    │
     │           ┌────────┴─────────┐
     │           │                  │
┌────┴─────┐  ┌──┴──────────┐  ┌───┴──────────────┐
│reminders │  │prescriptions│  │  notifications   │
└──────────┘  └─────────────┘  └──────────────────┘
```

## Tables

### 1\. `doctors`

Stores doctor accounts. Seeded with demo data on first run.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique doctor ID |
| name | TEXT | NOT NULL | Doctor's full name |
| email | TEXT | UNIQUE NOT NULL | Login email |
| password | TEXT | NOT NULL | Bcrypt-hashed password |
| specialization | TEXT | NOT NULL | e.g. "General Physician", "Cardiologist" |
| created\_at | TEXT | DEFAULT current datetime | Account creation timestamp |

### 2\. `patients`

Stores patient accounts (self-registration).

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique patient ID |
| name | TEXT | NOT NULL | Patient's full name |
| email | TEXT | UNIQUE NOT NULL | Login email |
| password | TEXT | NOT NULL | Bcrypt-hashed password |
| phone | TEXT |   
 | Contact phone |
| age | INTEGER |   
 | Patient age |
| gender | TEXT |   
 | Male / Female / Other |
| created\_at | TEXT | DEFAULT current datetime | Account creation timestamp |

### 3\. `appointments`

Core table linking patients and doctors with queue tokens.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique appointment ID |
| patient\_id | INTEGER | NOT NULL, FK → patients(id) | Booking patient |
| doctor\_id | INTEGER | NOT NULL, FK → doctors(id) | Assigned doctor |
| token\_number | INTEGER | NOT NULL | Digital queue token (auto-incremented per doctor per day) |
| appointment\_date | TEXT | NOT NULL | Date of appointment (YYYY-MM-DD) |
| reason | TEXT |   
 | Reason for visit / symptoms |
| status | TEXT | DEFAULT 'waiting' | One of: `waiting`, `in_consultation`, `completed`, `skipped` |
| queue\_position | INTEGER |   
 | Live position in waiting queue (recomputed on each change) |
| qr\_code | TEXT |   
 | Base64 data-URL QR code image for check-in |
| created\_at | TEXT | DEFAULT current datetime | Booking timestamp |
| updated\_at | TEXT | DEFAULT current datetime | Last status change |

### 4\. `prescriptions`

Doctor's notes for a completed/ongoing consultation.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique prescription ID |
| appointment\_id | INTEGER | NOT NULL, FK → appointments(id) | Related appointment |
| doctor\_id | INTEGER | NOT NULL, FK → doctors(id) | Prescribing doctor |
| patient\_id | INTEGER | NOT NULL, FK → patients(id) | Patient |
| notes | TEXT |   
 | Free-text prescription / medicine instructions |
| created\_at | TEXT | DEFAULT current datetime | Creation timestamp |

### 5\. `reminders`

Patient medicine reminders.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique reminder ID |
| patient\_id | INTEGER | NOT NULL, FK → patients(id) | Owning patient |
| medicine\_name | TEXT | NOT NULL | e.g. "Paracetamol" |
| dosage | TEXT |   
 | e.g. "500mg" |
| times | TEXT | NOT NULL | Comma-separated times, e.g. "08:00,20:00" |
| start\_date | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| end\_date | TEXT |   
 | Optional end date (null = ongoing) |
| notes | TEXT |   
 | Extra notes (e.g. "after meals") |
| active | INTEGER | DEFAULT 1 | 1 = active, 0 = paused |
| created\_at | TEXT | DEFAULT current datetime | Creation timestamp |

### 6\. `notifications`

In-app notifications for both patients and doctors.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique notification ID |
| patient\_id | INTEGER | FK → patients(id) | Recipient patient (nullable for doctor notifications) |
| doctor\_id | INTEGER | FK → doctors(id) | Recipient doctor (nullable for patient notifications) |
| message | TEXT | NOT NULL | Notification text |
| type | TEXT | DEFAULT 'info' | One of: `new_appointment`, `status_update`, `prescription`, `info` |
| read | INTEGER | DEFAULT 0 | 0 = unread, 1 = read |
| created\_at | TEXT | DEFAULT current datetime | Timestamp |

## Queue Logic

The **token\_number** is auto-incremented per doctor per date (the highest existing token + 1). The **queue\_position** is recomputed every time an appointment's status changes: all `waiting` appointments are ordered by `token_number` ascending and assigned positions 1, 2, 3, … This gives patients a live, accurate view of how many people are ahead of them.

## Seeded Data (Demo Doctors)

On first run, three doctors are created with password `doctor123`:

| Name | Email | Specialization |
| --- | --- | --- |
| Dr. Sarah Smith | [sarah@hospital.com](mailto:sarah@hospital.com) | General Physician |
| Dr. James Wilson | [james@hospital.com](mailto:james@hospital.com) | Cardiologist |
| Dr. Emily Davis | [emily@hospital.com](mailto:emily@hospital.com) | Pediatrician |