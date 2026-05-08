# Prompt: Fix WebSocket 401 Error & Rebuild UI with Lazy Channel Subscriptions

## Problem

The current implementation subscribes to **all** WebSocket channels immediately on login. This causes `401 Unauthorized` errors because some channels require context (e.g., `chargerId`, `connectorId`) that isn't available yet. Channels must be subscribed to **lazily** — only when the user performs the relevant action.

## Architecture Overview

- **Protocol:** STOMP 1.2 over WebSocket (SockJS fallback)
- **WS Endpoint:** `ws://<host>/ws/push`
- **Auth:** Bearer JWT passed in STOMP `CONNECT` frame header
- **Notification pattern:** Server pushes a signal (`payload: null` for wallet topics, full entity for reservation/charging topics). On wallet signals, refresh data via REST. On reservation/charging signals, read the `payload` directly.

## Requirements

Build a single-page HTML/JS interface (Vanilla JS, SockJS + @stomp/stompjs) with four sections: **Login**, **Wallet**, **Reservation**, and **Charging**. The `baseUrl` for REST and `wsUrl` for WebSocket should be configurable constants at the top of the file.

---

### 1. Authentication (Login Section)

**Two-phase login flow:**

1. `POST /login` with `{ email, password }` → returns `{ identityToken, accounts[] }`
2. `POST /select-context` with `{ identityToken, contextId }` → returns `{ accessToken, refreshToken }`

After Phase 2 succeeds, store `accessToken` and `refreshToken`, then:
- Connect to the WebSocket at `wsUrl` with `Authorization: Bearer <accessToken>` in the STOMP `CONNECT` headers.
- Subscribe to **only these two channels** on connect:
  - `/user/queue/WalletBalance`
  - `/user/queue/WalletTransaction`
- Fetch initial wallet data via `GET /wallets/me`.
- Show the Wallet, Reservation, and Charging UI sections (hidden until login succeeds).

**Token refresh:** On any REST `401`, call `POST /refresh` with `{ refreshToken }`, update the stored tokens, and retry the original request. On refresh failure, redirect to login.

---

### 2. Wallet Section

**UI components:**

- **Wallet Account Summary** — Display `accountNumber`, `accountBalance`, `ownerEmail`, `active` status from `GET /wallets/me`.
- **Recent Transactions** — Display the 5 most recent transactions from `GET /wallets/accounts/{accountNumber}/transactions/recents`. Show `transactedAmount`, `type` (CREDIT/DEBIT), `status`, and `createdAt` for each.

**Real-time updates:**

- On `/user/queue/WalletBalance` notification → call `GET /wallets/me` and refresh the balance display. Show `message` as a toast (green if `success: true`, red if `false`).
- On `/user/queue/WalletTransaction` notification → call `GET /wallets/accounts/{accountNumber}/transactions/recents` and refresh the transaction list.

**REST endpoints (see `wallet-handling-docs.md` for full details):**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/wallets/me` | Get own wallet (balance, account number) |
| `GET` | `/wallets/accounts/{accountNumber}/transactions/recents` | Last 5 transactions |

---

### 3. Reservation Section

**UI components:**

- **Reservation Form** with four fields:
  - `chargeBoxId` (string, required) — Target charger ID
  - `connectorId` (integer, required) — Connector number
  - `plateNumber` (string, required) — Vehicle license plate
  - `currentBatteryLevel` (integer, required, range 0–95) — Current battery %

- **Two buttons:**
  - **"Create Reservation"** — enabled by default
  - **"Cancel Reservation"** — disabled by default

**Button behavior:**

1. **On click "Create Reservation":**
   - Call `POST /app/reservations` with the form data.
   - On REST success (status `Pending`): subscribe to `/user/queue/Reservation`, enable "Cancel Reservation" button, enable "Start Charging" button (in Charging section).
   - Wait for the WebSocket notification on `/user/queue/Reservation` with the final outcome (`Accepted`, `Faulted`, `Cancelled`, etc.). Display `message` as a toast. If `success: false`, revert button states.
   - Store the returned `reservation.id`, `chargeBoxId`, and `connectorId` for use in charging and cancel flows.

2. **On click "Cancel Reservation":**
   - Call `DELETE /app/reservations` with `{ chargeBoxId, connectorId }` from the active reservation.
   - On REST success: unsubscribe from `/user/queue/Reservation`, disable "Cancel Reservation" button, disable "Start Charging" button.
   - Show confirmation toast from the WebSocket notification.

**REST endpoints (see `reservation-handling-docs.md` for full details):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/app/reservations` | Create reservation (async — wait for WS confirmation) |
| `DELETE` | `/app/reservations` | Cancel reservation (body: `{ chargeBoxId, connectorId }`) |
| `GET` | `/app/reservations/active?walletAccount={acct}` | Get active reservation |
| `GET` | `/app/reservations/fees/{chargeBoxId}` | Get reservation fee (no auth required) |

**WebSocket topic:**

| Topic | Payload | Subscribed when |
|-------|---------|-----------------|
| `/user/queue/Reservation` | Full Reservation entity | After "Create Reservation" clicked |

---

### 4. Charging Section

**UI components:**

- **Two buttons:**
  - **"Start Charging"** — disabled by default, enabled only after a reservation is accepted
  - **"Stop Charging"** — disabled by default

- **Live Charging Display** (visible only while charging is active):
  - Cost so far (`cost`)
  - Energy delivered (`energy` kWh)
  - Battery level (`stateOfCharge` %)
  - Time to full charge (`timeToFullCharge` hours)
  - Connector status (`status`)

**Button behavior:**

1. **On click "Start Charging":**
   - Call `POST /app/charging/start/{reservationId}` using the stored reservation ID.
   - On REST success: subscribe to both channels below (using `chargeBoxId` and `connectorId` from the active reservation), enable "Stop Charging" button.
     - `/user/queue/ChargingSession/{chargeBoxId}/{connectorId}`
     - `/user/queue/ChargingStatus/{chargeBoxId}/{connectorId}`
   - On each `/user/queue/ChargingSession/...` notification → update the live charging display with `payload.cost`, `payload.energy`, `payload.stateOfCharge`, `payload.timeToFullCharge`, `payload.status`.
   - On each `/user/queue/ChargingStatus/...` notification → update the connector status display with `payload.status`.

2. **On click "Stop Charging":**
   - Call `POST /app/charging/stop/{reservationId}`.
   - On REST success: unsubscribe from both `/user/queue/ChargingSession/...` and `/user/queue/ChargingStatus/...`, disable "Stop Charging" button, disable "Start Charging" button.
   - Hide the live charging display.

**REST endpoints (see `charging-session-handling-docs.md` for full details):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/app/charging/start/{reservationId}` | Start charging session |
| `POST` | `/app/charging/stop/{reservationId}` | Stop charging session |

**WebSocket topics:**

| Topic | Payload | Subscribed when |
|-------|---------|-----------------|
| `/user/queue/ChargingSession/{chargeBoxId}/{connectorId}` | `{ cost, energy, stateOfCharge, timeToFullCharge, status }` | After "Start Charging" clicked |
| `/user/queue/ChargingStatus/{chargeBoxId}/{connectorId}` | `{ chargerId, connectorId, status }` | After "Start Charging" clicked |

---

## Subscription Lifecycle Summary

| Channel | Subscribe when | Unsubscribe when |
|---------|---------------|-----------------|
| `/user/queue/WalletBalance` | WebSocket connects (login) | Never (stays active) |
| `/user/queue/WalletTransaction` | WebSocket connects (login) | Never (stays active) |
| `/user/queue/Reservation` | "Create Reservation" button clicked | "Cancel Reservation" button clicked |
| `/user/queue/ChargingSession/{id}/{conn}` | "Start Charging" button clicked | "Stop Charging" button clicked |
| `/user/queue/ChargingStatus/{id}/{conn}` | "Start Charging" button clicked | "Stop Charging" button clicked |

## Button State Summary

| Button | Starts as | Enabled when | Disabled when |
|--------|-----------|-------------|--------------|
| Create Reservation | Enabled | Default state after login | — |
| Cancel Reservation | Disabled | Reservation created successfully | Reservation cancelled or charging stopped |
| Start Charging | Disabled | Reservation accepted (WS confirms `Accepted`) | Charging stopped |
| Stop Charging | Disabled | Charging started successfully | Charging stopped |

## Reference Docs

- `wallet-handling-docs.md` — Wallet REST endpoints, WS topics, payload shapes, top-up flow
- `reservation-handling-docs.md` — Reservation REST endpoints, form fields, WS topic, status values
- `charging-session-handling-docs.md` — Auth flow, charging REST endpoints, WS topics, payload shapes