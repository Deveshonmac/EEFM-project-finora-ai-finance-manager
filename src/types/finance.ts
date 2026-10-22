export type NavigationTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'reports'
  | 'assistant'
  | 'alerts'
  | 'settings';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountType = 'Bank Account' | 'UPI Wallet' | 'Cash' | 'Credit Card' | 'Savings';

export type PaymentMethod = 'Cash' | 'UPI' | 'Debit Card' | 'Credit Card' | 'Bank Transfer' | 'Other';

export type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'yearly';

export type NotificationType = 'budget' | 'spending' | 'low_balance' | 'reminder' | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type ReportPeriod =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export interface NotificationPreferences {
  budgetAlerts: boolean;
  spendingAlerts: boolean;
  lowBalanceAlerts: boolean;
  billReminders: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  currency: string;
  onboardingCompleted: boolean;
  monthlyIncome: number;
  monthlyBudget: number;
  financialMonthStartDay: number;
  lowBalanceThreshold: number;
  preferredPeriod: string;
  notificationPrefs: NotificationPreferences;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  openingBalance: number;
  currency: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AccountWithBalance extends Account {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  netTransfers: number;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  transactionType: 'income' | 'expense';
  icon: string;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  destinationAccountId: string;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  notes: string;
  tags: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  categoryId: string; // 'OVERALL' or category id / name
  categoryName: string; // 'Overall Monthly Budget' or category name
  periodStart: string;
  periodEnd: string;
  budgetMonth: string; // YYYY-MM
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetProgress extends Budget {
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentSavedAmount: number;
  targetDate: string; // YYYY-MM-DD
  description: string;
  icon: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GoalContribution {
  id: string;
  userId: string;
  goalId: string;
  amount: number;
  type: 'contribution' | 'withdrawal';
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt?: unknown;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  recurrence: RecurrenceType;
  notes: string;
  notifyInApp: boolean;
  completed: boolean;
  nextOccurrence: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  isRead: boolean;
  relatedEntityId: string;
  deduplicationKey: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AIConversationMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: unknown;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Other',
];

export const ACCOUNT_TYPES: AccountType[] = [
  'Bank Account',
  'UPI Wallet',
  'Cash',
  'Credit Card',
  'Savings',
];

export const DEFAULT_INCOME_CATEGORIES: Array<{ id: string; name: string; icon: string }> = [
  { id: 'cat_inc_salary', name: 'Salary', icon: 'Briefcase' },
  { id: 'cat_inc_pocket', name: 'Pocket Money', icon: 'Wallet' },
  { id: 'cat_inc_freelance', name: 'Freelance', icon: 'Laptop' },
  { id: 'cat_inc_scholarship', name: 'Scholarship', icon: 'GraduationCap' },
  { id: 'cat_inc_interest', name: 'Interest', icon: 'TrendingUp' },
  { id: 'cat_inc_gifts', name: 'Gifts', icon: 'Gift' },
  { id: 'cat_inc_other', name: 'Other Income', icon: 'PlusCircle' },
];

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ id: string; name: string; icon: string }> = [
  { id: 'cat_exp_food', name: 'Food & Dining', icon: 'Utensils' },
  { id: 'cat_exp_groceries', name: 'Groceries', icon: 'ShoppingBag' },
  { id: 'cat_exp_transport', name: 'Travel & Transport', icon: 'Car' },
  { id: 'cat_exp_education', name: 'Education', icon: 'BookOpen' },
  { id: 'cat_exp_shopping', name: 'Shopping', icon: 'ShoppingCart' },
  { id: 'cat_exp_entertainment', name: 'Entertainment', icon: 'Film' },
  { id: 'cat_exp_bills', name: 'Bills & Utilities', icon: 'Zap' },
  { id: 'cat_exp_rent', name: 'Rent', icon: 'Home' },
  { id: 'cat_exp_healthcare', name: 'Healthcare', icon: 'HeartPulse' },
  { id: 'cat_exp_subscriptions', name: 'Subscriptions', icon: 'Repeat' },
  { id: 'cat_exp_personal', name: 'Personal Care', icon: 'Smile' },
  { id: 'cat_exp_other', name: 'Other Expenses', icon: 'MoreHorizontal' },
];

export const REMINDER_CATEGORIES = [
  'Rent',
  'Electricity Bill',
  'Internet Bill',
  'Phone Bill',
  'College Fees',
  'EMI',
  'Subscription',
  'Other Recurring Payment',
];
