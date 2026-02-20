# Smart Waste Management System — Database & Workflow Documentation

---

## 1. Database Schema Overview

The system uses **6 tables** in Supabase (PostgreSQL):

| # | Table              | Purpose                                              |
|---|--------------------|------------------------------------------------------|
| 1 | `bins`             | Physical smart bins deployed in the field             |
| 2 | `sensor_readings`  | Raw data payloads from the ESP32 microcontroller      |
| 3 | `alerts`           | Auto-generated warnings when thresholds are exceeded  |
| 4 | `users`            | Admins, collectors, and operators                     |
| 5 | `collection_logs`  | Records of every bin emptying event                   |
| 6 | `notifications`    | SMS, email, and push messages sent to users           |

---

## 2. Table Definitions

### 2.1 `bins`

| Column        | Type              | Constraints / Default                  |
|---------------|-------------------|----------------------------------------|
| id            | UUID              | PRIMARY KEY, auto-generated            |
| bin_code      | TEXT              | NOT NULL, UNIQUE                       |
| location      | TEXT              | NOT NULL                               |
| latitude      | DOUBLE PRECISION  | nullable                               |
| longitude     | DOUBLE PRECISION  | nullable                               |
| bin_type      | TEXT              | DEFAULT `'general'`                    |
| status        | TEXT              | DEFAULT `'active'`                     |
| fill_level    | INTEGER           | DEFAULT `0` (current %, 0-100)         |
| last_emptied  | TIMESTAMP         | nullable                               |
| created_at    | TIMESTAMP         | DEFAULT `NOW()`                        |
| updated_at    | TIMESTAMP         | DEFAULT `NOW()`, auto-updated          |

**`bin_type` values:** `general`, `organic`, `recyclable`, `hazardous`
**`status` values:** `active`, `maintenance`, `decommissioned`

---

### 2.2 `sensor_readings`

| Column        | Type              | Constraints / Default                  |
|---------------|-------------------|----------------------------------------|
| id            | UUID              | PRIMARY KEY, auto-generated            |
| bin_id        | UUID              | FOREIGN KEY → `bins(id)`, CASCADE      |
| fill_level    | INTEGER           | NOT NULL, CHECK 0-100 (ultrasonic)     |
| waste_type    | TEXT              | nullable (IR sensor)                   |
| weight        | DOUBLE PRECISION  | nullable (load cell, kg)               |
| gas_level     | DOUBLE PRECISION  | nullable (gas sensor, ppm)             |
| temperature   | DOUBLE PRECISION  | nullable (°C)                          |
| moisture      | DOUBLE PRECISION  | nullable (moisture sensor, %)          |
| battery_level | INTEGER           | nullable (ESP32 battery %)             |
| created_at    | TIMESTAMP         | DEFAULT `NOW()`                        |

---

### 2.3 `alerts`

| Column        | Type              | Constraints / Default                  |
|---------------|-------------------|----------------------------------------|
| id            | UUID              | PRIMARY KEY, auto-generated            |
| bin_id        | UUID              | FOREIGN KEY → `bins(id)`, CASCADE      |
| alert_type    | TEXT              | NOT NULL                               |
| severity      | TEXT              | DEFAULT `'medium'`                     |
| message       | TEXT              | nullable                               |
| resolved      | BOOLEAN           | DEFAULT `FALSE`                        |
| resolved_at   | TIMESTAMP         | nullable                               |
| resolved_by   | UUID              | FOREIGN KEY → `users(id)`             |
| created_at    | TIMESTAMP         | DEFAULT `NOW()`                        |

**`alert_type` values:** `fill_warning`, `fill_critical`, `gas_detected`, `maintenance_needed`
**`severity` values:** `low`, `medium`, `high`, `critical`

---

### 2.4 `users`

| Column        | Type              | Constraints / Default                  |
|---------------|-------------------|----------------------------------------|
| id            | UUID              | PRIMARY KEY, auto-generated            |
| email         | TEXT              | NOT NULL, UNIQUE                       |
| full_name     | TEXT              | NOT NULL                               |
| phone         | TEXT              | nullable                               |
| role          | TEXT              | DEFAULT `'collector'`                  |
| avatar_url    | TEXT              | nullable                               |
| is_active     | BOOLEAN           | DEFAULT `TRUE`                         |
| created_at    | TIMESTAMP         | DEFAULT `NOW()`                        |
| updated_at    | TIMESTAMP         | DEFAULT `NOW()`, auto-updated          |

**`role` values:** `admin`, `collector`, `operator`

---

### 2.5 `collection_logs`

| Column             | Type              | Constraints / Default             |
|--------------------|-------------------|-----------------------------------|
| id                 | UUID              | PRIMARY KEY, auto-generated       |
| bin_id             | UUID              | FOREIGN KEY → `bins(id)`, CASCADE |
| collected_by       | UUID              | FOREIGN KEY → `users(id)`        |
| fill_level_before  | INTEGER           | nullable                          |
| fill_level_after   | INTEGER           | DEFAULT `0`                       |
| notes              | TEXT              | nullable                          |
| collected_at       | TIMESTAMP         | DEFAULT `NOW()`                   |

---

### 2.6 `notifications`

| Column        | Type              | Constraints / Default                  |
|---------------|-------------------|----------------------------------------|
| id            | UUID              | PRIMARY KEY, auto-generated            |
| user_id       | UUID              | FOREIGN KEY → `users(id)`, CASCADE     |
| alert_id      | UUID              | FOREIGN KEY → `alerts(id)`, SET NULL   |
| channel       | TEXT              | NOT NULL                               |
| message       | TEXT              | NOT NULL                               |
| status        | TEXT              | DEFAULT `'pending'`                    |
| sent_at       | TIMESTAMP         | nullable                               |
| created_at    | TIMESTAMP         | DEFAULT `NOW()`                        |

**`channel` values:** `sms`, `email`, `push`
**`status` values:** `pending`, `sent`, `failed`

---

## 3. Entity Relationship Diagram

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│    users     │       │       bins        │       │    alerts     │
├──────────────┤       ├───────────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)           │──┐    │ id (PK)      │
│ email        │       │ bin_code          │  │    │ bin_id (FK)  │──→ bins
│ full_name    │   ┌──→│ location          │  │    │ alert_type   │
│ phone        │   │   │ latitude          │  │    │ severity     │
│ role         │   │   │ longitude         │  │    │ resolved     │
│ is_active    │   │   │ bin_type          │  │    │ resolved_by  │──→ users
│ created_at   │   │   │ status            │  │    │ created_at   │
│ updated_at   │   │   │ fill_level        │  │    └──────────────┘
└──────┬───────┘   │   │ last_emptied      │  │           │
       │           │   │ created_at        │  │           │
       │           │   │ updated_at        │  │           ▼
       │           │   └───────────────────┘  │    ┌──────────────────┐
       │           │                          │    │  notifications   │
       │           │   ┌───────────────────┐  │    ├──────────────────┤
       │           │   │ sensor_readings   │  │    │ id (PK)          │
       │           │   ├───────────────────┤  │    │ user_id (FK)     │──→ users
       │           │   │ id (PK)           │  │    │ alert_id (FK)    │──→ alerts
       │           │   │ bin_id (FK)       │──┘    │ channel          │
       │           │   │ fill_level        │       │ message          │
       │           │   │ waste_type        │       │ status           │
       │           │   │ weight            │       │ sent_at          │
       │           │   │ gas_level         │       │ created_at       │
       │           │   │ temperature       │       └──────────────────┘
       │           │   │ moisture          │
       │           │   │ battery_level     │
       │           │   │ created_at        │
       │           │   └───────────────────┘
       │           │
       │           │   ┌───────────────────┐
       │           │   │ collection_logs   │
       │           │   ├───────────────────┤
       │           └───│ bin_id (FK)       │──→ bins
       └──────────────→│ collected_by (FK) │──→ users
                       │ id (PK)           │
                       │ fill_level_before │
                       │ fill_level_after  │
                       │ notes             │
                       │ collected_at      │
                       └───────────────────┘
```

---

## 4. System Workflow

### 4.1 Data Flow — End to End

```
  ┌───────────────┐    HTTP POST     ┌────────────────┐     INSERT      ┌──────────┐
  │  Smart Bin     │ ──────────────→ │  Node.js API   │ ─────────────→ │ Supabase │
  │  (ESP32)       │  /api/readings  │  (Express)     │                │ (Postgres)│
  └───────────────┘                  └───────┬────────┘                └──────────┘
                                             │
                                    ┌────────┴─────────┐
                                    │  Alert Engine     │
                                    │  (check thresholds)│
                                    └────────┬─────────┘
                                             │
                                  ┌──────────┴──────────┐
                                  ▼                     ▼
                          ┌──────────────┐     ┌──────────────────┐
                          │  WebSocket   │     │  Notification    │
                          │  (Dashboard) │     │  Service         │
                          └──────────────┘     │  (SMS/Email)     │
                                               └──────────────────┘
```

### 4.2 Step-by-Step Workflow

#### Step 1: Waste Disposal (Hardware)
1. User throws waste into the smart bin.
2. **IR sensor** detects and classifies waste type.
3. **Servo motor** activates the sorting mechanism, routing waste to the correct compartment.
4. **Ultrasonic sensor** measures the new fill level.
5. **Load cell** measures total weight.
6. **Gas sensor** checks for methane/toxic gases.
7. **Moisture sensor** reads humidity (helps classify organic waste).

#### Step 2: Data Transmission (ESP32 → Backend)
1. ESP32 packages all sensor readings into a JSON payload:
   ```json
   {
     "bin_code": "BIN-001",
     "fill_level": 72,
     "waste_type": "organic",
     "weight": 3.5,
     "gas_level": 120.5,
     "temperature": 28.3,
     "moisture": 65.2,
     "battery_level": 85
   }
   ```
2. ESP32 sends an **HTTP POST** request to `POST /api/readings`.
3. Backend validates the payload and identifies the bin by `bin_code`.

#### Step 3: Data Storage (Backend → Supabase)
1. Insert a new row into `sensor_readings` with the bin's UUID.
2. Update the `bins.fill_level` column with the latest fill percentage.

#### Step 4: Alert Engine (Backend Logic)
The backend checks thresholds after every new reading:

| Condition              | Alert Type          | Severity   | Action                    |
|------------------------|---------------------|------------|---------------------------|
| fill_level >= 50%      | `fill_warning`      | medium     | Dashboard turns **orange** |
| fill_level >= 80%      | `fill_critical`     | high       | Dashboard turns **red**    |
| fill_level >= 95%      | `fill_critical`     | critical   | **Flash alert** + notify   |
| gas_level > threshold  | `gas_detected`      | critical   | Immediate notification     |

If a threshold is exceeded:
1. Insert a new row into `alerts`.
2. Send notification to relevant users (collectors/admins).
3. Insert a row into `notifications` tracking delivery status.

#### Step 5: Real-Time Dashboard Update (WebSocket)
1. After storing data, backend emits a **WebSocket event** to all connected dashboard clients.
2. Dashboard receives the event and updates:
   - Fill-level progress bars (color-coded)
   - Sensor charts (gas, weight, temperature)
   - Alert badges / notification bell
   - Map markers (if using lat/lng)

#### Step 6: Collection (Collector Workflow)
1. Collector receives SMS/email alert that a bin needs emptying.
2. Collector opens the dashboard, sees the bin on the map.
3. Collector empties the bin.
4. Collector marks the bin as collected via the app → `POST /api/collections`.
5. Backend:
   - Inserts a row into `collection_logs`.
   - Updates `bins.fill_level` to `0`.
   - Updates `bins.last_emptied` to `NOW()`.
   - Resolves any open alerts for that bin.

---

## 5. API Endpoints (Suggested)

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| POST   | `/api/readings`       | Receive sensor data from ESP32       |
| GET    | `/api/bins`           | List all bins with current status    |
| GET    | `/api/bins/:id`       | Get single bin details + history     |
| GET    | `/api/alerts`         | List active alerts                   |
| PATCH  | `/api/alerts/:id`     | Resolve an alert                     |
| POST   | `/api/collections`    | Log a bin collection event           |
| GET    | `/api/collections`    | Collection history                   |
| POST   | `/api/auth/login`     | User login                           |
| POST   | `/api/auth/register`  | User registration                    |
| GET    | `/api/users`          | List users (admin only)              |

---

## 6. Alert Thresholds (Configurable)

| Sensor         | Warning    | Critical   |
|----------------|------------|------------|
| Fill Level     | >= 50%     | >= 80%     |
| Fill Level     | —          | >= 95% (flash) |
| Gas Level      | >= 200 ppm | >= 500 ppm |
| Temperature    | >= 45°C    | >= 60°C    |
| Battery Level  | <= 20%     | <= 10%     |

---

## 7. Setup Instructions

1. Open the **Supabase SQL Editor**.
2. Copy the entire contents of `backend/src/config/bins.db`.
3. Paste and run in the SQL editor.
4. All 6 tables, indexes, and triggers will be created.
5. Configure your `.env` file:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   PORT=3000
   ```
