# Habitat housing app

Habitat is a Kenyan house-hunting app with a React frontend, Express API, and SQLite database.

## Run locally

Install dependencies:

```bash
npm install
```

Start the backend and frontend together:

```bash
npm run dev:full
```

The frontend runs at `http://localhost:5173/` and the API runs at `http://localhost:3001/`. The SQLite database is created automatically at `data/habitat.db` and is seeded with the Kenyan sample properties on first start.

To run them separately:

```bash
npm run server
npm run dev
```

## Backend routes

- `GET /api/health` checks API availability.
- `GET /api/homes` returns available properties and supports `region`, `type`, and `search` filters.
- `POST /api/auth/register` creates a user with a hashed password.
- `POST /api/auth/login` returns a session token.
- `POST /api/bookings` creates an authenticated tenant booking.
- `GET /api/bookings` lists the signed-in user's bookings.
- `PATCH /api/bookings/:id/cancel` cancels and marks a booking refunded.
- `GET/PATCH /api/profile` manages the signed-in tenant or agent profile.
- `POST /api/applications` lets a tenant apply without paying.
- `GET /api/applications/mine` shows tenant application status, contract, and paybill.
- `GET /api/agent/applications` lets an agent review tenant applications.
- `PATCH /api/agent/applications/:id` approves or declines an application and sends contract/paybill details.
- `PATCH /api/applications/:id/payment` records payment after approval.
- `PATCH /api/applications/:id/cancel` cancels an application or marks an already-paid deposit refunded.
- `POST /api/uploads/document` stores agent contract and paybill PDF files.

## Rental application flow

1. A tenant completes their profile and submits an application from a property page.
2. The agent reviews the tenant details in the Agent workspace.
3. The agent approves or declines the application. Approval requires contract text and an M-Pesa paybill number.
4. The tenant sees the contract and paybill, then confirms that they sent the deposit.

The payment form records the tenant phone number and amount and returns a prompt-sent state. To send a real M-Pesa STK prompt, configure Safaricom Daraja consumer credentials, shortcode, passkey, callback URL, and a production HTTPS endpoint in the backend.

The prototype currently uses in-memory sessions. For production, use a persistent session/token store and HTTPS.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
