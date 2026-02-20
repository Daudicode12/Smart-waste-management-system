# Smart Waste Management System — Backend

Node.js + Express REST API that powers the Smart Waste Management System. It receives real-time sensor data from ESP32-equipped smart bins, evaluates alert thresholds, pushes live updates to dashboards via WebSocket, and stores everything in Supabase (PostgreSQL).

---

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js (ES Modules)                |
| Framework      | Express 5                           |
| Database       | Supabase (PostgreSQL)               |
| Real-time      | Socket.IO                           |
| Auth (planned) | JSON Web Tokens + bcrypt            |
| Security       | Helmet, CORS                        |
| Logging        | Morgan                              |
| Validation     | express-validator                   |

---

## Project Structure

```
backend/
├── server.js                        # Entry point — HTTP server + WebSocket init
├── package.json
├── .env                             # Environment variables (not committed)
└── src/
    ├── app.js                       # Express app, middleware, route mounting
    ├── config/
    │   ├── supabase.js              # Supabase client + connection validator
    │   └── bins.db                  # SQL schema (copy into Supabase SQL Editor)
    ├── controllers/
    │   ├── deviceController.js      # ESP32 sensor data ingestion + queries
    │   ├── binController.js         # Bin CRUD + dashboard stats
    │   ├── alertController.js       # Alert queries, resolve, delete, stats
    │   ├── collectionController.js  # Collection logging + history
    │   └── userController.js        # User CRUD
    ├── routes/
    │   ├── deviceRoutes.js          # /api/devices/*
    │   ├── binRoutes.js             # /api/bins/*
    │   ├── alertRoutes.js           # /api/alerts/*
    │   ├── collectionRoutes.js      # /api/collections/*
    │   └── userRoutes.js            # /api/users/*
    └── services/
        ├── alertService.js          # Threshold engine (fill, gas, temp, battery)
        ├── notificationService.js   # Email / SMS / push stubs + DB logging
        └── websocketService.js      # Socket.IO real-time events
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- A **Supabase** project (free tier works)

### 1. Clone & install

```bash
git clone <repo-url>
cd smartWaste/backend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
```

### 3. Set up the database

1. Open the **Supabase SQL Editor**.
2. Copy the contents of `src/config/bins.db`.
3. Paste and run — all tables, indexes, RLS policies, and triggers will be created.

### 4. Start the server

```bash
npm start
```

Output:

```
[Supabase] Successfully connected!
[WebSocket] Socket.IO initialised
[Server] Running on port 5000
[Server] API:       http://localhost:5000/api
[Server] WebSocket: ws://localhost:5000
```

---

## API Endpoints

### Health Check

| Method | Endpoint       | Description           |
| ------ | -------------- | --------------------- |
| GET    | `/api/health`  | Returns `{ status: "ok" }` |

### Devices (ESP32 Sensor Data)

| Method | Endpoint                  | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| POST   | `/api/devices/data`       | Receive sensor payload from an ESP32    |
| GET    | `/api/devices/readings`   | List readings (`?bin_id=&limit=&offset=`) |
| GET    | `/api/devices/readings/:id` | Get a single reading                  |

**POST `/api/devices/data`** — example body:

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

### Bins

| Method | Endpoint                  | Description                             |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/api/bins`               | List bins (`?status=&bin_type=`)        |
| GET    | `/api/bins/stats/overview`| Dashboard summary (fill brackets, avgs) |
| GET    | `/api/bins/:id`           | Single bin + 10 latest readings         |
| POST   | `/api/bins`               | Register a new bin                      |
| PATCH  | `/api/bins/:id`           | Update bin details                      |
| DELETE | `/api/bins/:id`           | Remove a bin (cascades)                 |

### Alerts

| Method | Endpoint                    | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| GET    | `/api/alerts`               | List alerts (`?resolved=&severity=`)  |
| GET    | `/api/alerts/stats/overview`| Alert summary by severity/type        |
| GET    | `/api/alerts/:id`           | Single alert                          |
| PATCH  | `/api/alerts/:id`           | Resolve or update an alert            |
| DELETE | `/api/alerts/:id`           | Delete an alert                       |

### Collections

| Method | Endpoint              | Description                            |
| ------ | --------------------- | -------------------------------------- |
| GET    | `/api/collections`    | Collection history (`?bin_id=`)        |
| GET    | `/api/collections/:id`| Single collection log                  |
| POST   | `/api/collections`    | Log a bin emptying event               |

### Users

| Method | Endpoint          | Description                        |
| ------ | ----------------- | ---------------------------------- |
| GET    | `/api/users`      | List users (`?role=&is_active=`)   |
| GET    | `/api/users/:id`  | Single user                        |
| POST   | `/api/users`      | Create a user                      |
| PATCH  | `/api/users/:id`  | Update a user                      |
| DELETE | `/api/users/:id`  | Delete a user                      |

---

## Real-Time Events (WebSocket)

Connect to the server with a Socket.IO client:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");
```

### Events emitted by the server

| Event              | Payload         | When                                      |
| ------------------ | --------------- | ----------------------------------------- |
| `sensor_reading`   | reading object  | New sensor data received from any bin      |
| `bin_update`       | reading/bin obj | Update for a specific bin (room-scoped)    |
| `new_alert`        | alert object    | New alert generated                        |
| `bin_alert`        | alert object    | Alert for a specific bin (room-scoped)     |
| `bin_status_update`| bin object      | Bin status changed (e.g. after collection) |

### Subscribing to a specific bin

```js
socket.emit("subscribe_bin", "<bin-uuid>");
socket.on("bin_update", (data) => { /* update UI */ });
```

---

## Alert Thresholds

Alerts are auto-generated when sensor data crosses these thresholds:

| Sensor       | Warning          | Critical              |
| ------------ | ---------------- | --------------------- |
| Fill Level   | ≥ 50% (orange)   | ≥ 80% (red), ≥ 95% (flash) |
| Gas Level    | ≥ 200 ppm        | ≥ 500 ppm             |
| Temperature  | ≥ 45 °C          | ≥ 60 °C               |
| Battery      | ≤ 20%            | ≤ 10%                 |

High/critical alerts automatically trigger notifications (email + SMS) to admin and collector users.

---

## Data Flow

```
ESP32 Smart Bin
      │
      │  POST /api/devices/data
      ▼
┌─────────────────┐     INSERT     ┌──────────┐
│  Express API    │ ─────────────→ │ Supabase │
│  (Node.js)      │                │ (Postgres)│
└────────┬────────┘                └──────────┘
         │
    ┌────┴─────┐
    ▼          ▼
 Alert      WebSocket
 Engine     (Socket.IO)
    │          │
    ▼          ▼
Notifications  Dashboard
(SMS/Email)    (Real-time UI)
```

---

## Notification Service

The notification service records every attempt in the `notifications` table and calls channel-specific senders. Currently the senders are **stubs** that log to the console. To enable real delivery:

- **Email** — integrate Nodemailer, SendGrid, or Resend
- **SMS** — integrate Twilio or Africa's Talking
- **Push** — integrate Firebase Cloud Messaging or OneSignal

---

## Database

Six tables stored in Supabase with Row Level Security (RLS) enabled:

| Table              | Description                                |
| ------------------ | ------------------------------------------ |
| `users`            | Admins, collectors, operators              |
| `bins`             | Physical smart bins                        |
| `sensor_readings`  | Every ESP32 data payload                   |
| `alerts`           | Auto-generated threshold warnings          |
| `collection_logs`  | Bin emptying events                        |
| `notifications`    | SMS / email / push delivery tracking       |

Full SQL schema is in [`src/config/bins.db`](src/config/bins.db).

---

## License

ISC
