# Finora Project Documentation

## 1. Project Overview

Finora is a personal finance management application for college students and young professionals in India. It brings accounts, transactions, budgets, savings goals, reports, reminders, and financial guidance into one focused interface.

The application is designed to answer a practical question: **where is my money going, and what can I do next?**

Finora uses an Indian-focused experience with Indian Rupee (`₹`) formatting, `en-IN` number formatting, and support for bank accounts, UPI wallets, cash, credit cards, and savings accounts.

## 2. Main Goals

- Make daily income and expense tracking simple.
- Give users a clear view of their current financial position.
- Help users create and follow realistic monthly budgets.
- Turn savings goals into measurable progress.
- Explain spending patterns with charts and comparisons.
- Provide responsible AI-assisted financial insights.
- Keep authenticated user data isolated and protected.
- Offer a fictional demo experience for evaluation without requiring sign-in.

## 3. Core Features

### Dashboard

The dashboard summarizes the user's financial health:

- Total balance across accounts.
- Current-month income and expenses.
- Net savings and savings rate.
- Overall monthly budget and remaining amount.
- Budget usage percentage.
- Recent transactions.
- Category spending summaries.
- Alerts and reminders.

### Accounts

Users can manage multiple sources of money:

- Bank accounts.
- UPI wallets.
- Cash.
- Credit cards.
- Savings accounts.

Balances are calculated across accounts while internal transfers are handled without double-counting the same money.

### Transactions

Users can:

- Add income and expense entries.
- Assign categories.
- Select a payment method or source account.
- Add descriptions and notes.
- Edit transactions.
- Delete transactions.
- Search and filter transaction history.
- Review transactions by date and category.

### Budgets

Budget management includes:

- Monthly category budgets.
- Budget amount and spent amount.
- Remaining budget.
- Percentage used.
- Status indicators for healthy, warning, and exceeded budgets.
- Budget alerts based on configured preferences.

### Savings Goals

Users can create goals for items such as laptops, travel, emergency funds, or education:

- Goal name.
- Target amount.
- Saved amount.
- Remaining amount.
- Completion percentage.
- Target date.
- Recommended monthly contribution.
- Progress and status notes.

### Reports and Analytics

Reports help users understand financial behavior over time:

- Income and expense trends.
- Monthly net savings.
- Current-month versus previous-month comparisons.
- Spending by category.
- Weekly expense summaries.
- Category percentages.
- Hypothetical savings calculations.
- Charts and visualizations powered by Recharts.

### Alerts and Reminders

The application can surface:

- Budget warnings.
- Budget limit alerts.
- Spending alerts.
- Low-balance alerts.
- Upcoming bill reminders.
- Savings-goal reminders.

Notification preferences are managed from the settings area.

### AI Financial Assistant

The AI assistant uses the server-side Gemini integration to provide insights based on the user's calculated financial context.

It can help users:

- Understand current spending.
- Review monthly budgets.
- Identify high-spending categories.
- Compare the current month with the previous month.
- Review savings progress.
- Think through practical budgeting changes.
- Ask questions about recorded financial activity.

The assistant is intentionally constrained:

- It uses application-computed figures rather than guessing arithmetic.
- It treats descriptions and notes as untrusted user data.
- It does not transfer money.
- It does not initiate financial transactions.
- It does not change budgets.
- It does not delete records.
- It does not promise investment returns or guaranteed outcomes.
- It does not reveal another user's information.

### Interactive Demo Mode

Demo mode provides fictional sample data for presentations, testing, and evaluation:

- Indian student income.
- Pocket money and freelance income.
- Bank, UPI, and cash accounts.
- Multiple months of transactions.
- Category budgets.
- Savings goals.
- Spending history.

Demo data is isolated in memory. It is not written to Firestore and is never mixed with authenticated user data. The demo can be launched from the landing page using **Launch Demo Mode** or **Explore Demo Data**.

## 4. Application Flow

### New User Flow

1. Open the application.
2. Sign in with Google or email/password.
3. Complete onboarding.
4. Configure currency, monthly income, monthly budget, and notification preferences.
5. Add accounts.
6. Add transactions.
7. Create budgets and savings goals.
8. Review the dashboard and reports.

### Demo Flow

1. Open the application.
2. Select **Launch Demo Mode**.
3. Explore the preloaded fictional data.
4. Add or edit in-memory records if desired.
5. Reset the demo or exit to return to the login screen.

## 5. Technology Stack

### Frontend

- React 19.
- TypeScript.
- Vite.
- Tailwind CSS.
- Recharts for data visualizations.
- Lucide React for icons.
- Motion for interface animations.
- jsPDF for document export functionality.

### Backend

- Node.js.
- Express.
- `tsx` for running the TypeScript server.
- Google GenAI SDK for Gemini requests.
- `dotenv` for local environment configuration.

### Cloud Services

- Firebase Authentication.
- Cloud Firestore.
- Google Gemini API.

## 6. Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── AIAssistantView.tsx
│   │   ├── AlertsRemindersView.tsx
│   │   ├── AuthAndOnboarding.tsx
│   │   ├── BudgetsView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── ReportsView.tsx
│   │   ├── SavingsGoalsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── TransactionModal.tsx
│   │   └── TransactionsView.tsx
│   ├── context/
│   │   └── FinanceContext.tsx
│   ├── data/
│   │   └── demoData.ts
│   ├── types/
│   │   └── finance.ts
│   ├── utils/
│   │   └── calculations.ts
│   ├── App.tsx
│   ├── firebase.ts
│   ├── index.css
│   └── main.tsx
├── firebase-applet-config.json
├── firestore.rules
├── server.ts
├── vite.config.ts
├── package.json
└── DOCUMENTATION.md
```

## 7. Important Files

| File | Responsibility |
|---|---|
| `src/App.tsx` | Main application shell and navigation |
| `src/context/FinanceContext.tsx` | Authentication, Firestore state, demo state, and finance operations |
| `src/firebase.ts` | Firebase initialization and Firestore error handling |
| `src/data/demoData.ts` | Fictional demo dataset |
| `src/utils/calculations.ts` | Shared financial calculations |
| `src/types/finance.ts` | TypeScript domain models |
| `src/components/DashboardView.tsx` | Dashboard summaries |
| `src/components/TransactionsView.tsx` | Transaction history and management |
| `src/components/BudgetsView.tsx` | Budget creation and tracking |
| `src/components/SavingsGoalsView.tsx` | Savings goal management |
| `src/components/ReportsView.tsx` | Reports and charts |
| `src/components/AIAssistantView.tsx` | AI assistant interface |
| `server.ts` | Express server, Gemini endpoint, and Vite middleware |
| `firestore.rules` | Firestore authorization and validation rules |
| `firebase-applet-config.json` | Firebase web application configuration |

## 8. Local Development

### Requirements

- Node.js 18 or newer.
- npm.
- A Firebase project for authenticated cloud data.
- A Gemini API key for live AI responses.

### Installation

```bash
npm install --legacy-peer-deps
```

The legacy peer-dependency option may be needed because the Vite and esbuild versions in the project have peer dependency differences.

### Environment Configuration

Create a local `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
APP_URL=http://localhost:3000
```

`.env` is ignored by Git and must never be committed. Use `.env.example` as a safe template.

### Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The Express server hosts the API and Vite serves the React application through the same local process.

## 9. Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run start` | Start the application server |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run TypeScript checking with no emitted files |
| `npm run clean` | Remove generated build output |

## 10. Firebase Configuration

Firebase configuration is loaded by `src/firebase.ts` from `firebase-applet-config.json`.

To configure a different Firebase project:

1. Create a Firebase project.
2. Register a web application.
3. Enable Google Authentication.
4. Enable Email/Password Authentication if email login is required.
5. Create a Firestore database.
6. Replace the Firebase web configuration values.
7. Deploy the rules from `firestore.rules`.
8. Add the local development domain to Firebase authorized domains if necessary.

The Firebase client configuration is intended for browser use. The Gemini API key is different: it is a private server secret and must only be stored in `.env` or a deployment secret manager.

## 11. Firestore Data and Security

Firestore rules provide a deny-by-default safety net and validate authenticated writes.

The rules enforce:

- Authenticated access.
- Verified email requirements where configured.
- User ownership of records.
- Valid document IDs.
- Allowed field names.
- Field types and size limits.
- Valid account types.
- Valid financial values.
- Valid notification preferences.
- Protection against adding unexpected fields.

Important collections include user profiles, accounts, categories, transactions, budgets, savings goals, and reminders. Each record is associated with the authenticated user's ID.

Never deploy a modified ruleset without reviewing the authorization behavior and testing it against both allowed and denied operations.

## 12. Backend API

### Health Check

```http
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "geminiConfigured": true,
  "model": "gemini-3.8-flash"
}
```

### AI Assistant

```http
POST /api/ai/assistant
Content-Type: application/json
```

Request shape:

```json
{
  "question": "How can I reduce my spending this month?",
  "history": [
    {
      "role": "user",
      "content": "What is my biggest spending category?"
    },
    {
      "role": "assistant",
      "content": "Your biggest category is food."
    }
  ],
  "financialContext": {
    "currencySymbol": "₹",
    "currentMonthLabel": "October 2026",
    "previousMonthLabel": "September 2026",
    "totalBalance": 25000,
    "accounts": [],
    "currentMonth": {},
    "previousMonth": {},
    "thisWeekExpenses": {},
    "categoryBreakdown": [],
    "budgets": [],
    "savingsGoals": [],
    "recentTransactions": [],
    "upcomingReminders": []
  }
}
```

The frontend normally supplies the complete strongly typed financial context. The server formats trusted, application-computed values before sending them to Gemini.

Possible responses:

- `200`: AI response generated.
- `400`: Question is missing or invalid.
- `429`: Gemini quota or rate limit reached.
- `500`: Unexpected Gemini or server error.
- `503`: Gemini API key is not configured.

## 13. AI Safety Design

The server-side system instruction tells Gemini to:

- Use only trusted application-provided financial data.
- Avoid inventing records.
- Explain limitations when data is incomplete.
- Distinguish facts from estimates.
- Provide conservative budgeting guidance.
- Avoid guaranteed financial outcomes.
- Never perform financial operations through chat.
- Treat transaction descriptions as untrusted data.
- Protect user privacy.

The API key is never sent to the browser. The browser calls the local Express endpoint, and the server calls Gemini.

## 14. Privacy and Security Practices

- Never commit `.env` or API keys.
- Keep secrets in environment variables or a secret manager.
- Do not place Gemini credentials in React code.
- Review Firestore rules before deployment.
- Use demo mode when showing the application publicly.
- Do not use real financial data in screenshots or demonstrations.
- Treat transaction descriptions and notes as untrusted content.
- Keep dependencies updated and review audit warnings.

## 15. Production Build and Deployment

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
NODE_ENV=production npm run start
```

The production server serves the generated `dist` directory and exposes the backend API.

For a production deployment:

1. Install dependencies with a clean lockfile.
2. Configure `GEMINI_API_KEY` using the hosting provider's secret settings.
3. Configure `GEMINI_MODEL` if a different supported model is required.
4. Set `APP_URL` to the public application URL.
5. Configure Firebase authorized domains.
6. Deploy and verify `GET /api/health`.
7. Test authentication, Firestore reads and writes, demo mode, and the AI assistant.

## 16. Troubleshooting

### Dependencies do not install

Try:

```bash
npm install --legacy-peer-deps
```

### The app does not load

Check that:

- Node.js is installed.
- Dependencies are installed.
- Port `3000` is available.
- The development server output does not show a TypeScript or Vite error.

### Gemini is unavailable

Check:

```bash
curl http://localhost:3000/api/health
```

If `geminiConfigured` is `false`, check `.env` and restart the server.

### Firebase sign-in fails

Check:

- The provider is enabled in Firebase Authentication.
- The Firebase configuration belongs to the intended project.
- The current domain is authorized.
- Email/password provider is enabled when using email login.

### Firestore permission errors

Check:

- The user is authenticated.
- The user's email is verified if required by the rules.
- The correct Firestore database is selected.
- The deployed rules match `firestore.rules`.
- Records contain the required fields and correct types.

### Demo mode does not show data

Refresh the page and select **Launch Demo Mode** again. Demo state is intentionally in-memory and is not persisted between sessions.

## 17. Testing and Quality Checks

Before opening a pull request or deploying:

```bash
npm run lint
npm run build
```

Also manually verify:

- Demo mode launches.
- Dashboard calculations are visible.
- Transactions can be added and edited.
- Budgets and savings goals update correctly.
- Reports render without console errors.
- Authentication works with enabled providers.
- Firestore rules prevent unauthorized access.
- `/api/health` reports the expected configuration.
- The AI assistant responds without exposing the API key.

## 18. Limitations

- Demo data is fictional and stored only in memory.
- Live AI responses require a valid Gemini API key and available quota.
- Firebase authentication and Firestore require a correctly configured Firebase project.
- AI responses are general financial guidance, not professional financial advice.
- Bank, UPI, and payment-provider data is entered by the user; automatic institution synchronization is not included.

## 19. Future Enhancements

Potential improvements include:

- Recurring transactions.
- Subscription tracking.
- Bill payment scheduling.
- CSV and PDF export improvements.
- Custom categories.
- Multi-currency support.
- Financial calendar.
- Budget recommendations.
- Bank and UPI integrations.
- Mobile applications.
- More detailed notification delivery.
- Expanded automated tests.

## 20. Disclaimer

Finora is a personal finance organization and education tool. It is not a bank, investment adviser, tax adviser, or financial planner. The application does not guarantee financial outcomes. Users should verify important financial, investment, tax, and legal decisions with a qualified professional.

## 21. Repository

GitHub repository:

https://github.com/Deveshonmac/EEFM-project-finora-ai-finance-manager
