# Stomp - Push Notification Configuration

## WebSocket connection

| Environment     | URL                                   |
|-----------------|---------------------------------------|
| Local (gateway) | `ws://localhost:8183/ws/push`         |
| Remote dev      | `wss://api.safaricharger.com/ws/push` |

> **No SockJS fallback.** Raw WebSocket only — `addEndpoint("/ws/push")` without `.withSockJS()`.

---

## Authentication

Send JWT Bearer token in STOMP `CONNECT` frame header:

```
Authorization: Bearer <access_token>
```

Server decodes JWT on `CONNECT`. Rejected token → connection refused (no STOMP `CONNECTED` frame sent).

---

## Broker configuration

| Setting                  | Value                                    |
|--------------------------|------------------------------------------|
| Brokers enabled          | `/topic`, `/queue`                       |
| App destination prefix   | `/app`                                   |
| User destination prefix  | `/user`                                  |
| Heartbeat (send/receive) | 10 000 ms / 10 000 ms                    |
| Message converter        | `MappingJackson2MessageConverter` (JSON) |

---

## Subscription channels

All channels are user-specific (`/user` prefix). Spring routes messages using the authenticated user principal (JWT `sub` claim = `userId`).

| Channel            | Subscribe destination                                   | Payload type          |
|--------------------|---------------------------------------------------------|-----------------------|
| Wallet Balance     | `/user/queue/WalletBalance`                             | `NotificationRequest` |
| Wallet Transaction | `/user/queue/WalletTransaction`                         | `NotificationRequest` |
| Reservation        | `/user/queue/Reservation`                               | `Reservation`         |
| Charging Status    | `/user/queue/ChargingStatus/{chargerId}/{connectorId}`  | `ChargerStatus`       |
| Charging Session   | `/user/queue/ChargingSession/{chargerId}/{connectorId}` | `ChargingSession`     |

---

## Wallet Balance channel

**Destination:** `/user/queue/WalletBalance`

Signals wallet balance changed. **`payload` is always `null`** — client must fetch current balance from the Wallet REST API after receiving this event.

```json
{
  "to": "12345",
  "success": true,
  "message": "Wallet balance updated",
  "payload": null
}
```

| Field     | Type      | Description                         |
|-----------|-----------|-------------------------------------|
| `to`      | `String`  | Recipient userId (JWT `sub`)        |
| `success` | `boolean` | Operation success flag              |
| `message` | `String`  | Human-readable message              |
| `payload` | `null`    | Always null — fetch balance via API |

---

## Wallet Transaction channel

**Destination:** `/user/queue/WalletTransaction`

Signals new wallet transaction recorded. **`payload` is always `null`** — client must fetch transaction history from the Wallet REST API after receiving this event.

```json
{
  "to": "12345",
  "success": true,
  "message": "Transaction recorded",
  "payload": null
}
```

| Field     | Type      | Description                              |
|-----------|-----------|------------------------------------------|
| `to`      | `String`  | Recipient userId (JWT `sub`)             |
| `success` | `boolean` | Operation success flag                   |
| `message` | `String`  | Human-readable message                   |
| `payload` | `null`    | Always null — fetch transactions via API |

---

## Reservation channel

**Destination:** `/user/queue/Reservation`

Sends full `Reservation` entity directly (not wrapped in `NotificationRequest`).

```json
{
  "id": 1,
  "transactionId": 1001,
  "idTag": "TAG-ABC123",
  "startTime": "2026-04-22 08:00:00",
  "expiryDateTime": "2026-04-22 09:00:00",
  "status": "Accepted",
  "chargeBoxId": "SC-AC-001",
  "connectorId": 1,
  "reservationAmount": 150.00,
  "chargingAmount": 0.00,
  "walletAccount": "WLT-00001",
  "walletBalance": 850.00,
  "batteryLevel": 40,
  "batteryCapacity": 75,
  "connectorType": "AC_TYPE2_MENNEKES",
  "username": "john.doe@example.com"
}
```

| Field               | Type      | Description                                              |
|---------------------|-----------|----------------------------------------------------------|
| `id`                | `Long`    | Reservation primary key                                  |
| `transactionId`     | `Long`    | OCPP transaction ID (unique)                             |
| `idTag`             | `String`  | OCPP idTag used to authorize the session                 |
| `startTime`         | `String`  | Session start — format `yyyy-MM-dd HH:mm:ss` (EAT UTC+3) |
| `expiryDateTime`    | `String`  | Reservation expiry — same format                         |
| `status`            | `String`  | `Accepted` \| `Occupied` \| `Expired` \| `Cancelled`     |
| `chargeBoxId`       | `String`  | ChargeBox identifier                                     |
| `connectorId`       | `Long`    | Connector number on the charger                          |
| `reservationAmount` | `Double`  | KES amount held for reservation                          |
| `chargingAmount`    | `Double`  | KES amount billed for energy consumed                    |
| `walletAccount`     | `String`  | Wallet account number used                               |
| `walletBalance`     | `Double`  | Wallet balance after reservation hold                    |
| `batteryLevel`      | `Integer` | EV battery % at session start                            |
| `batteryCapacity`   | `Integer` | EV battery capacity in kWh                               |
| `connectorType`     | `String`  | Enum: connector type (e.g. `AC_TYPE2_MENNEKES`)          |
| `username`          | `String`  | User email / display name                                |

---

## Charging Status channel

**Destination:** `/user/queue/ChargingStatus/{chargerId}/{connectorId}`

Sends `ChargerStatus` directly (not wrapped in `NotificationRequest`). Subscribe with the exact `chargerId` and `connectorId` for the charger being monitored.

```json
{
  "chargerId": "SC-AC-001",
  "connectorId": 1,
  "status": "Charging"
}
```

| Field         | Type     | Description                                  |
|---------------|----------|----------------------------------------------|
| `chargerId`   | `String` | ChargeBox identifier                         |
| `connectorId` | `int`    | Connector number on the charger              |
| `status`      | `String` | OCPP 1.6 connector status (see values below) |

**OCPP 1.6 status values:**
`Available` | `Preparing` | `Charging` | `SuspendedEVSE` | `SuspendedEV` | `Finishing` | `Reserved` | `Unavailable` | `Faulted`

---

## Charging Session channel

**Destination:** `/user/queue/ChargingSession/{chargerId}/{connectorId}`

Sends `ChargingSession` directly (not wrapped in `NotificationRequest`). Contains live session data including energy consumed, cost, and SoC.

```json
{
  "chargerId": "SC-AC-001",
  "idTag": "TAG-ABC123",
  "connectorId": 1,
  "cost": 45.50,
  "energy": 12.3,
  "stateOfCharge": 78.5,
  "timeToFullCharge": 35.0,
  "status": "Charging"
}
```

| Field              | Type     | Description                                           |
|--------------------|----------|-------------------------------------------------------|
| `chargerId`        | `String` | ChargeBox identifier                                  |
| `idTag`            | `String` | OCPP idTag for the active session                     |
| `connectorId`      | `int`    | Connector number on the charger                       |
| `cost`             | `double` | Current session cost in KES                           |
| `energy`           | `double` | Energy delivered in kWh                               |
| `stateOfCharge`    | `double` | EV battery state of charge in %                       |
| `timeToFullCharge` | `double` | Estimated minutes to full charge                      |
| `status`           | `String` | OCPP 1.6 connector status (see Charging Status above) |

> **Note:** `null` fields are omitted from JSON (`@JsonInclude(NON_NULL)` on both `ChargerStatus` and `ChargingSession`).
