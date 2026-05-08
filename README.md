# SafariCharger WebSocket Monitor

Real-time WebSocket notification dashboard for the SafariCharger platform. Connects to a STOMP broker and displays live events for wallet balance, reservations, charger status, and charging sessions.

## Prerequisites

- Node.js 18+
- npm
- Running SafariCharger backend at `https://api.safaricharger.com` (or update `baseURL` in `src/js/api-urls.js`)

## Setup

```shell
npm install
```

## Development

```shell
npm run dev
```

App runs at `http://localhost:5173`.

## Production Build

```shell
npm run build
# preview build locally
npm run preview
```

Output goes to `dist/`.

## Configuration

| Variable | File | Description |
| --- | --- | --- |
| `baseURL` | `src/js/api-urls.js` | Backend API base URL |
| `wsUrl` | `src/js/index.js` | WebSocket broker URL |

## Project Structure

```text
frontend/
├── src/
│   ├── css/          # Custom styles
│   ├── img/          # Static assets
│   ├── js/
│   │   ├── api-urls.js   # API endpoint definitions
│   │   └── index.js      # App logic (login, STOMP, notifications)
│   └── index.html    # Entry point
├── package.json
└── vite.config.js
```

## Features

- JWT login / logout with error feedback
- STOMP WebSocket subscriptions (wallet, reservation, charger status, charging session)
- Chronological notification cards with timestamps (capped at 100 entries each)
- Live STOMP message log panel (capped at 200 lines, auto-scroll)
- Responsive layout (stacks to 1 column on mobile)

## License

ISC
