# Finora - Personal Finance Manager

Finora is a personal finance dashboard for students and young professionals in India. It tracks income, expenses, accounts, budgets, savings goals, loans, subscriptions, reminders, and balance-sheet data while providing charts, reports, and a Gemini-powered financial assistant.

## Features

- Google and email/password authentication with Firebase Authentication
- Interactive demo mode with realistic Indian financial data
- Dashboard for balances, income, expenses, savings, and monthly trends
- Transaction, account, category, budget, and savings-goal management
- Loans, loan payments, subscriptions, reminders, notifications, and balance sheet
- Financial health score and downloadable reports
- Gemini assistant backed by trusted, application-computed financial context
- Firestore rules for user isolation, schema validation, bounded data, and timestamp integrity
- Indian Rupee formatting and `en-IN` locale support

## Technology

- React 19 and TypeScript
- Vite 8 and Tailwind CSS 4
- Express and `tsx` for the local/server runtime
- Firebase Authentication and Cloud Firestore
- Google Gemini API through the server-side `/api/ai/assistant` endpoint
- Recharts, Motion, Lucide React, jsPDF, and SheetJS

## Requirements

- Node.js 20 or newer
- npm
- A Firebase project configured for the application
- A Gemini API key for the AI assistant

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If npm reports a peer-dependency conflict on an older checkout, use:

```bash
npm install --legacy-peer-deps
```

The current dependency manifest pins `esbuild` to a Vite 8-compatible range, so a clean install should not require that fallback.

## Environment variables

The server reads environment variables with `dotenv`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI | Enables Gemini assistant responses |
| `GEMINI_MODEL` | No | Overrides the default Gemini model |
| `APP_URL` | Deployment-specific | Documents the application URL for hosting integrations |

Never commit `.env.local` or any file containing credentials. `.env.example` is the safe template.

## Firebase setup

The browser Firebase configuration is stored in [firebase-applet-config.json](./firebase-applet-config.json). Firebase web configuration values such as the API key and auth domain identify the web app, but access is still controlled by Firebase Authentication and Firestore rules.

Before testing login:

1. In Firebase Console, open **Authentication -> Sign-in method**.
2. Enable Google and Email/Password providers as needed.
3. Open **Authentication -> Settings -> Authorized domains**.
4. Add `localhost` for local development.
5. Add the exact production hostname, without a path, for deployment.
6. Confirm the application uses the same Firebase project as the authorized domain.

The `auth/unauthorized-domain` error means the current browser hostname is missing from this Firebase authorized-domain list. It is not caused by demo data or Firestore document rules.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express/Vite development server on port 3000 |
| `npm run start` | Start the application server |
| `npm run build` | Create a production client build in `dist/` |
| `npm run preview` | Preview the Vite production build |
| `npm run lint` | Run the TypeScript compiler without emitting files |
| `npm run clean` | Remove generated build artifacts |

## Architecture

```text
Browser
  React UI
    FinanceContext
      Firebase Auth + Firestore
      Demo dataset fallback
    Calculation utilities

Express server (port 3000)
  /api/health
  /api/ai/assistant -> Gemini API
  Vite middleware -> React application
```

- [src/App.tsx](./src/App.tsx) coordinates the application shell and views.
- [src/context/FinanceContext.tsx](./src/context/FinanceContext.tsx) owns authentication, Firestore synchronization, demo mode, and finance state.
- [src/firebase.ts](./src/firebase.ts) initializes Firebase and centralizes Firestore error metadata.
- [src/utils/calculations.ts](./src/utils/calculations.ts) contains derived financial calculations.
- [src/types/finance.ts](./src/types/finance.ts) contains domain types.
- [server.ts](./server.ts) serves the app and proxies trusted financial context to Gemini.

Detailed system documentation is in [docs/PROJECT_DOCUMENTATION.md](./docs/PROJECT_DOCUMENTATION.md).

## Data model

The Firestore blueprint in [firebase-blueprint.json](./firebase-blueprint.json) describes:

`users`, `accounts`, `transactions`, `categories`, `budgets`, `savingsGoals`, `goalContributions`, `reminders`, `loans`, `loanPayments`, `subscriptions`, `balanceSheetItems`, `notifications`, and `aiConversationMessages`.

All user-owned records include an owner identifier. The client scopes queries to the signed-in user, and [firestore.rules](./firestore.rules) independently validates ownership and payload shape.

## Security

- Firestore denies access by default.
- User-owned records require an authenticated owner.
- Ownership IDs and creation timestamps are immutable after creation.
- Financial values must be numeric and positive where applicable.
- Strings and arrays are bounded to prevent oversized payloads.
- The Gemini server prompt treats transaction text as untrusted data and prohibits financial actions through chat.

The security design and adversarial test cases are documented in [security_spec.md](./security_spec.md) and [firestore.rules.test.ts](./firestore.rules.test.ts).

## Validation

```bash
npm run lint
npm run build
```

The production build may report a bundle-size warning because the application includes charting, PDF, spreadsheet, and Firebase features. The build remains successful.

## Deployment notes

1. Build with `npm run build`.
2. Configure `GEMINI_API_KEY` in the hosting provider's secret manager.
3. Deploy the application server so it can serve the Vite output and `/api` routes.
4. Add the deployment hostname to Firebase Authentication authorized domains.
5. Deploy reviewed Firestore rules from `firestore.rules`.
6. Never deploy `.env.local`, service-account keys, or other private credentials.

## Project metadata

The app metadata is in [metadata.json](./metadata.json). The Firebase data blueprint is in [firebase-blueprint.json](./firebase-blueprint.json). These files describe the app identity and data contract; they do not contain runtime Gemini credentials.

## License

No license has been declared yet. Add a license before accepting external contributions or redistributing the project.
