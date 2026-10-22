# Finora — Personal Finance Manager

Finora is a modern personal finance management application built for college students and young professionals in India.

It helps users understand where their money goes, manage daily transactions, set realistic budgets, track savings goals, and make better financial decisions through clear dashboards and AI-powered insights.

## Why Finora?

Managing personal finances can be difficult when income and expenses are spread across bank accounts, UPI payments, cash, subscriptions, and everyday spending.

Finora brings everything together in one simple dashboard so users can:

- Track money coming in and going out
- Understand their spending habits
- Stay within monthly budgets
- Monitor savings progress
- Compare financial performance month over month
- Receive practical financial insights
- Manage finances using an Indian-focused experience with ₹ formatting

## Features

### Financial Dashboard

Get a complete overview of your financial health from one place:

- Total balance across accounts
- Current-month income
- Current-month expenses
- Net savings
- Savings rate
- Monthly budget usage
- Remaining budget
- Recent transactions
- Spending summaries
- Financial alerts and reminders

### Transaction Management

Track and organize all financial activity:

- Add income and expense transactions
- Categorize spending
- Add transaction descriptions and notes
- Record transactions from bank accounts, UPI, or cash
- Edit existing transactions
- Delete transactions
- Search and filter transactions
- View transaction history

### Account Management

Keep track of multiple sources of money:

- Bank accounts
- UPI balances
- Cash wallets
- Separate account balances
- Internal transfers without double-counting money

### Budget Management

Create monthly spending plans and stay in control:

- Create category-based budgets
- Set monthly spending limits
- Track how much has been spent
- View remaining budget amounts
- Monitor budget usage percentages
- Identify categories that are close to or over budget

### Savings Goals

Plan and monitor important financial goals:

- Create savings goals
- Set target amounts
- Track saved amounts
- View remaining amounts
- Monitor goal completion progress
- Set target dates
- Track goals such as laptops, emergency funds, travel, or education

### Reports and Analytics

Understand financial patterns over time:

- Monthly income and expense comparisons
- Net savings analysis
- Category-based spending breakdowns
- Month-over-month expense changes
- Weekly spending summaries
- Visual charts and graphs
- Hypothetical savings analysis
- Spending trends across multiple months

### AI Financial Assistant

Finora includes a Gemini-powered financial assistant that provides insights based on the user's actual financial data.

The assistant can help users:

- Understand their spending patterns
- Review budget performance
- Identify high-spending categories
- Compare current and previous months
- Think through savings opportunities
- Receive practical budgeting suggestions
- Ask questions about their recorded financial activity

The AI assistant is designed to provide conservative, easy-to-understand guidance. It does not initiate transactions, move money, modify budgets, or delete financial records.

### Alerts and Reminders

Stay informed about important financial events:

- Budget warnings
- Budget limit alerts
- Savings goal reminders
- Financial notifications
- Upcoming reminders
- Spending-related insights

### Interactive Demo Mode

Finora includes a ready-to-use demo mode for evaluation and presentations.

The demo includes fictional Indian student financial data such as:

- Monthly pocket money
- Freelance income
- Bank, UPI, and cash accounts
- Multiple months of transactions
- Category budgets
- Savings goals
- Realistic spending patterns

Demo mode allows users to explore the application without creating an account or connecting personal financial data.

All demo changes are isolated in memory and are not saved to real user accounts.

### Authentication and Data Privacy

Finora supports Firebase authentication and user-specific financial data:

- Google Sign-In
- Email and password authentication
- User-isolated Firestore data
- Secure Firestore access rules
- Separate authenticated and demo experiences

Each user's financial records are protected and associated with their own account.

### Indian-Focused Experience

Finora is designed with Indian users in mind:

- Indian Rupee formatting using `₹`
- `en-IN` number formatting
- Support for UPI, bank, and cash transactions
- Sample data based on common student finances in India
- Categories and financial goals relevant to Indian users

## Tech Stack

- React
- TypeScript
- Vite
- Express
- Firebase Authentication
- Cloud Firestore
- Google Gemini API
- Tailwind CSS
- Recharts
- Lucide React
- Motion
- jsPDF

## Application Sections

Finora is organized into the following main sections:

- Dashboard
- Transactions
- Budgets
- Savings Goals
- Reports
- Alerts and Reminders
- AI Assistant
- Settings

## Typical User Journey

1. Sign in with Google or email.
2. Add financial accounts.
3. Record income and expenses.
4. Create monthly budgets.
5. Set savings goals.
6. Review the dashboard.
7. Analyze spending reports.
8. Check alerts and reminders.
9. Ask the AI assistant for financial insights.
10. Adjust spending and savings plans based on the results.

## Project Vision

Finora is designed to make personal finance less intimidating and more actionable.

Instead of presenting users with complicated financial terminology, the application focuses on:

- Clear visual summaries
- Simple financial language
- Practical budgeting guidance
- Transparent calculations
- Goal-oriented saving
- Daily awareness of spending
- Responsible use of AI
