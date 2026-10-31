import {
  Account,
  AccountWithBalance,
  AppNotification,
  BalanceSheetItem,
  Budget,
  BudgetProgress,
  Loan,
  LoanPayment,
  Reminder,
  ReportPeriod,
  SavingsGoal,
  Subscription,
  SubscriptionFrequency,
  Transaction,
  UserProfile,
} from '../types/finance';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function getCurrencySymbol(currencyCode = 'INR'): string {
  return CURRENCY_SYMBOLS[currencyCode] || '₹';
}

export function formatCurrency(amount: number, currencyCode = 'INR'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const hasDecimals = absAmount % 1 !== 0;

  const formatted = absAmount.toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function formatDateIN(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatShortMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getPreviousYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getLastNMonths(baseYearMonth: string, count: number): string[] {
  const [y, m] = baseYearMonth.split('-').map(Number);
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  upToDate?: string
): AccountWithBalance[] {
  const relevantTx = upToDate
    ? transactions.filter((tx) => tx.date <= upToDate)
    : transactions;

  return accounts.map((acc) => {
    let totalIncome = 0;
    let totalExpense = 0;
    let netTransfers = 0;

    for (const tx of relevantTx) {
      if (tx.type === 'income' && tx.accountId === acc.id) {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense' && tx.accountId === acc.id) {
        totalExpense += tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.accountId === acc.id) {
          netTransfers -= tx.amount;
        }
        if (tx.destinationAccountId === acc.id) {
          netTransfers += tx.amount;
        }
      }
    }

    const currentBalance = acc.openingBalance + totalIncome - totalExpense + netTransfers;
    return {
      ...acc,
      currentBalance,
      totalIncome,
      totalExpense,
      netTransfers,
    };
  });
}

export function computeTotalBalance(
  accounts: Account[],
  transactions: Transaction[]
): number {
  const withBalances = computeAccountBalances(accounts, transactions);
  return withBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
}

export function filterTransactionsByMonth(
  transactions: Transaction[],
  yearMonth: string
): Transaction[] {
  return transactions.filter((tx) => tx.date.startsWith(yearMonth));
}

export function computeMonthlySummary(
  transactions: Transaction[],
  yearMonth: string
): {
  income: number;
  expenses: number;
  netSavings: number;
  savingsRate: number;
} {
  const monthTx = filterTransactionsByMonth(transactions, yearMonth);
  let income = 0;
  let expenses = 0;

  for (const tx of monthTx) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else if (tx.type === 'expense') {
      expenses += tx.amount;
    }
    // Transfers between own accounts are never counted as income or expenses
  }

  const netSavings = income - expenses;
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

  return {
    income,
    expenses,
    netSavings,
    savingsRate,
  };
}

export function computeBudgetProgressList(
  budgets: Budget[],
  transactions: Transaction[],
  yearMonth: string,
  fallbackOverallBudgetAmount = 0
): {
  overallBudget: BudgetProgress | null;
  categoryBudgets: BudgetProgress[];
} {
  const monthExpenses = filterTransactionsByMonth(transactions, yearMonth).filter(
    (tx) => tx.type === 'expense'
  );
  const totalMonthExpense = monthExpenses.reduce((s, tx) => s + tx.amount, 0);

  const monthBudgets = budgets.filter((b) => b.budgetMonth === yearMonth);

  let overallRaw = monthBudgets.find((b) => b.categoryId === 'OVERALL');
  if (!overallRaw && fallbackOverallBudgetAmount > 0) {
    overallRaw = {
      id: `overall_${yearMonth}`,
      userId: 'current',
      name: 'Monthly Spending Budget',
      amount: fallbackOverallBudgetAmount,
      categoryId: 'OVERALL',
      categoryName: 'Overall Monthly Budget',
      periodStart: `${yearMonth}-01`,
      periodEnd: `${yearMonth}-31`,
      budgetMonth: yearMonth,
      description: 'Overall monthly spending limit',
    };
  }

  const evaluateStatus = (percent: number): 'normal' | 'warning' | 'exceeded' => {
    if (percent >= 100) return 'exceeded';
    if (percent >= 80) return 'warning';
    return 'normal';
  };

  let overallBudget: BudgetProgress | null = null;
  if (overallRaw && overallRaw.amount > 0) {
    const percentUsed = (totalMonthExpense / overallRaw.amount) * 100;
    overallBudget = {
      ...overallRaw,
      spentAmount: totalMonthExpense,
      remainingAmount: overallRaw.amount - totalMonthExpense,
      percentUsed,
      status: evaluateStatus(percentUsed),
    };
  }

  const categoryBudgets: BudgetProgress[] = monthBudgets
    .filter((b) => b.categoryId !== 'OVERALL')
    .map((b) => {
      const catSpent = monthExpenses
        .filter(
          (tx) =>
            tx.categoryId === b.categoryId ||
            tx.categoryName.toLowerCase() === b.categoryName.toLowerCase()
        )
        .reduce((s, tx) => s + tx.amount, 0);
      const percentUsed = b.amount > 0 ? (catSpent / b.amount) * 100 : 0;
      return {
        ...b,
        spentAmount: catSpent,
        remainingAmount: b.amount - catSpent,
        percentUsed,
        status: evaluateStatus(percentUsed),
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);

  return { overallBudget, categoryBudgets };
}

export function computeSavingsGoalMetrics(goal: SavingsGoal): {
  remainingAmount: number;
  completionPercent: number;
  monthsRemaining: number;
  daysRemaining: number;
  recommendedMonthlyContribution: number | null;
  statusMessage: string;
  isCompleted: boolean;
  isPastDue: boolean;
} {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentSavedAmount);
  const completionPercent =
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentSavedAmount / goal.targetAmount) * 100)
      : 0;
  const isCompleted = goal.currentSavedAmount >= goal.targetAmount && goal.targetAmount > 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = goal.targetDate.split('-').map(Number);
  const target =
    parts.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(goal.targetDate);
  target.setHours(0, 0, 0, 0);

  if (isCompleted) {
    return {
      remainingAmount: 0,
      completionPercent: 100,
      monthsRemaining: 0,
      daysRemaining: 0,
      recommendedMonthlyContribution: 0,
      statusMessage: 'Goal achieved! You have reached your target amount.',
      isCompleted: true,
      isPastDue: false,
    };
  }

  if (isNaN(target.getTime())) {
    return {
      remainingAmount,
      completionPercent,
      monthsRemaining: 0,
      daysRemaining: 0,
      recommendedMonthlyContribution: null,
      statusMessage: 'Set a valid target date to see monthly contribution guidance.',
      isCompleted: false,
      isPastDue: false,
    };
  }

  const diffMs = target.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      remainingAmount,
      completionPercent,
      monthsRemaining: 0,
      daysRemaining,
      recommendedMonthlyContribution: null,
      statusMessage:
        daysRemaining === 0
          ? 'Target date is today. Extend the target date or contribute the remaining balance.'
          : 'Target date has passed. Update the target date to recalculate a monthly plan.',
      isCompleted: false,
      isPastDue: true,
    };
  }

  const monthsRemaining = Math.max(1, Number((daysRemaining / 30.4375).toFixed(1)));
  const recommendedMonthlyContribution = Math.ceil(remainingAmount / monthsRemaining);

  return {
    remainingAmount,
    completionPercent,
    monthsRemaining,
    daysRemaining,
    recommendedMonthlyContribution,
    statusMessage: `Save across ~${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'} (${daysRemaining} days left)`,
    isCompleted: false,
    isPastDue: false,
  };
}

export function calculateNextOccurrence(dueDate: string, recurrence: string): string {
  if (!dueDate || recurrence === 'none') return dueDate;
  const parts = dueDate.split('-').map(Number);
  const d =
    parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dueDate);
  if (isNaN(d.getTime())) return dueDate;

  if (recurrence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (recurrence === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (recurrence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (recurrence === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDateRangeForReportPeriod(
  period: ReportPeriod,
  referenceYearMonth: string,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const [refY, refM] = referenceYearMonth.split('-').map(Number);
  const now = new Date();
  const refEndDay = new Date(refY, refM, 0).getDate();
  const refMonthEnd = `${referenceYearMonth}-${String(refEndDay).padStart(2, '0')}`;

  if (period === 'this_week') {
    const end = new Date(refY, refM - 1, Math.min(now.getDate(), refEndDay));
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: fmt(start), endDate: fmt(end), label: 'Last 7 Days (This Week)' };
  }

  if (period === 'this_month') {
    return {
      startDate: `${referenceYearMonth}-01`,
      endDate: refMonthEnd,
      label: formatMonthLabel(referenceYearMonth),
    };
  }

  if (period === 'last_month') {
    const prevYM = getPreviousYearMonth(referenceYearMonth);
    const [pY, pM] = prevYM.split('-').map(Number);
    const pEndDay = new Date(pY, pM, 0).getDate();
    return {
      startDate: `${prevYM}-01`,
      endDate: `${prevYM}-${String(pEndDay).padStart(2, '0')}`,
      label: formatMonthLabel(prevYM),
    };
  }

  if (period === 'last_3_months') {
    const months = getLastNMonths(referenceYearMonth, 3);
    return {
      startDate: `${months[0]}-01`,
      endDate: refMonthEnd,
      label: `Last 3 Months (${formatShortMonthLabel(months[0])} – ${formatShortMonthLabel(referenceYearMonth)})`,
    };
  }

  if (period === 'last_6_months') {
    const months = getLastNMonths(referenceYearMonth, 6);
    return {
      startDate: `${months[0]}-01`,
      endDate: refMonthEnd,
      label: `Last 6 Months (${formatShortMonthLabel(months[0])} – ${formatShortMonthLabel(referenceYearMonth)})`,
    };
  }

  if (period === 'this_year') {
    return {
      startDate: `${refY}-01-01`,
      endDate: `${refY}-12-31`,
      label: `Year ${refY}`,
    };
  }

  return {
    startDate: customStart || `${referenceYearMonth}-01`,
    endDate: customEnd || refMonthEnd,
    label: `Custom (${customStart || `${referenceYearMonth}-01`} to ${customEnd || refMonthEnd})`,
  };
}

// ============================================================================
// 9. DEBT & LOAN MANAGER CALCULATIONS
// ============================================================================

export function calculateStandardEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRate <= 0) {
    return Math.round(principal / tenureMonths);
  }
  const r = annualInterestRate / 12 / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  return Math.round(emi);
}

export function computeLoanPaymentBreakdown(
  outstandingPrincipal: number,
  annualInterestRate: number,
  paymentAmount: number
): {
  interestComponent: number;
  principalComponent: number;
  remainingBalanceAfter: number;
} {
  const monthlyRate = Math.max(0, annualInterestRate) / 12 / 100;
  const accruedInterest = Math.round(outstandingPrincipal * monthlyRate);
  const interestComponent = Math.min(paymentAmount, accruedInterest);
  const rawPrincipal = Math.max(0, paymentAmount - interestComponent);
  const principalComponent = Math.min(outstandingPrincipal, rawPrincipal);
  const remainingBalanceAfter = Math.max(0, outstandingPrincipal - principalComponent);

  return {
    interestComponent,
    principalComponent,
    remainingBalanceAfter,
  };
}

export function computeLoanMetrics(
  loan: Loan,
  payments: LoanPayment[]
): {
  loanPayments: LoanPayment[];
  totalPaid: number;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  repaidPercent: number;
  estimatedMonthsRemaining: number;
  nextMonthInterestEstimate: number;
  nextMonthPrincipalEstimate: number;
  daysUntilDue: number;
} {
  const loanPayments = payments
    .filter((p) => p.loanId === loan.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
  const totalPrincipalRepaid =
    loanPayments.reduce((s, p) => s + p.principalComponent, 0) ||
    Math.max(0, loan.originalAmount - loan.outstandingPrincipal);
  const totalInterestPaid = loanPayments.reduce((s, p) => s + p.interestComponent, 0);

  const repaidPercent =
    loan.originalAmount > 0
      ? Math.min(
          100,
          Math.max(0, ((loan.originalAmount - loan.outstandingPrincipal) / loan.originalAmount) * 100)
        )
      : 100;

  const breakdown = computeLoanPaymentBreakdown(
    loan.outstandingPrincipal,
    loan.interestRate,
    loan.emiAmount
  );

  let estimatedMonthsRemaining = 0;
  if (loan.outstandingPrincipal > 0 && loan.emiAmount > 0) {
    const r = loan.interestRate / 12 / 100;
    if (r <= 0) {
      estimatedMonthsRemaining = Math.ceil(loan.outstandingPrincipal / loan.emiAmount);
    } else if (loan.emiAmount > loan.outstandingPrincipal * r) {
      const n =
        -Math.log(1 - (loan.outstandingPrincipal * r) / loan.emiAmount) / Math.log(1 + r);
      estimatedMonthsRemaining = Math.max(1, Math.ceil(n));
    } else {
      estimatedMonthsRemaining = loan.tenureMonths;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = loan.nextDueDate.split('-').map(Number);
  const due =
    parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(loan.nextDueDate);
  due.setHours(0, 0, 0, 0);
  const daysUntilDue = isNaN(due.getTime())
    ? 0
    : Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    loanPayments,
    totalPaid,
    totalPrincipalRepaid,
    totalInterestPaid,
    repaidPercent,
    estimatedMonthsRemaining,
    nextMonthInterestEstimate: breakdown.interestComponent,
    nextMonthPrincipalEstimate: breakdown.principalComponent,
    daysUntilDue,
  };
}

// ============================================================================
// 11. SUBSCRIPTION MANAGER CALCULATIONS
// ============================================================================

export function getMonthlyEquivalentCost(
  amount: number,
  frequency: SubscriptionFrequency
): number {
  if (frequency === 'weekly') return (amount * 52) / 12;
  if (frequency === 'quarterly') return amount / 3;
  if (frequency === 'yearly') return amount / 12;
  return amount;
}

export function getAnnualEquivalentCost(
  amount: number,
  frequency: SubscriptionFrequency
): number {
  if (frequency === 'weekly') return amount * 52;
  if (frequency === 'quarterly') return amount * 4;
  if (frequency === 'monthly') return amount * 12;
  return amount;
}

export interface DetectedRecurringCandidate {
  key: string;
  description: string;
  categoryName: string;
  averageAmount: number;
  occurrences: number;
  lastDate: string;
  paymentMethod: Transaction['paymentMethod'];
  accountId: string;
}

export function detectRecurringExpensesFromTransactions(
  transactions: Transaction[],
  existingSubscriptions: Subscription[]
): DetectedRecurringCandidate[] {
  const activeSubNames = new Set(
    existingSubscriptions.map((s) => s.name.toLowerCase().trim())
  );

  const groups = new Map<
    string,
    {
      description: string;
      categoryName: string;
      amounts: number[];
      dates: string[];
      paymentMethod: Transaction['paymentMethod'];
      accountId: string;
    }
  >();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const norm = tx.description.toLowerCase().trim();
    if (activeSubNames.has(norm)) continue;

    const isSubTagged =
      tx.categoryName.toLowerCase().includes('subscription') ||
      tx.tags.some((t) => ['subscription', 'recurring', 'monthly'].includes(t.toLowerCase()));

    const existing = groups.get(norm);
    if (existing) {
      existing.amounts.push(tx.amount);
      existing.dates.push(tx.date);
    } else {
      groups.set(norm, {
        description: tx.description,
        categoryName: tx.categoryName,
        amounts: [tx.amount],
        dates: [tx.date],
        paymentMethod: tx.paymentMethod,
        accountId: tx.accountId,
      });
    }

    // If explicitly categorized as Subscription even once, ensure it is surfaced if not in Subscriptions list
    if (isSubTagged && !groups.get(norm)!.dates.includes('SUB_FLAG')) {
      // Marked via category check below
    }
  }

  const candidates: DetectedRecurringCandidate[] = [];
  for (const [key, g] of groups.entries()) {
    const isSubCategory = g.categoryName.toLowerCase().includes('subscription');
    if (g.amounts.length >= 2 || isSubCategory) {
      const avg = Math.round(g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length);
      const sortedDates = [...g.dates].sort((a, b) => b.localeCompare(a));
      candidates.push({
        key,
        description: g.description,
        categoryName: g.categoryName,
        averageAmount: avg,
        occurrences: g.amounts.length,
        lastDate: sortedDates[0],
        paymentMethod: g.paymentMethod,
        accountId: g.accountId,
      });
    }
  }

  return candidates.sort((a, b) => b.occurrences - a.occurrences || b.averageAmount - a.averageAmount);
}

// ============================================================================
// 10. FINANCIAL HEALTH SCORE ENGINE (0 - 100)
// ============================================================================

export type HealthScoreCategory = 'Strong' | 'Good' | 'Needs Improvement' | 'Requires Attention';

export interface HealthMetricDetail {
  id:
    | 'savings_rate'
    | 'budget_adherence'
    | 'emergency_fund'
    | 'debt_burden'
    | 'goal_progress'
    | 'spending_stability';
  name: string;
  weight: number; // Percentage weight (25, 20, 20, 15, 10, 10)
  available: boolean;
  missingReason?: string;
  rawScore: number; // 0 to 100
  effectiveWeight: number; // Re-normalized weight across available metrics
  weightedContribution: number; // Contribution to final 0-100 score
  displayValue: string;
  benchmarkLabel: string;
  status: 'strong' | 'good' | 'fair' | 'attention' | 'missing';
  explanation: string;
  recommendation: string;
}

export interface FinancialHealthReport {
  overallScore: number; // 0 to 100
  category: HealthScoreCategory;
  availableWeightTotal: number;
  excludedMetrics: string[];
  metrics: HealthMetricDetail[];
  topSuggestions: string[];
}

export function getHealthScoreCategory(score: number): HealthScoreCategory {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  return 'Requires Attention';
}

export function computeFinancialHealthScore(params: {
  profile: UserProfile | null;
  accounts: AccountWithBalance[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  selectedMonth: string;
  currencyCode?: string;
}): FinancialHealthReport {
  const {
    profile,
    accounts,
    transactions,
    budgets,
    savingsGoals,
    loans,
    selectedMonth,
    currencyCode = profile?.currency || 'INR',
  } = params;

  const monthSummary = computeMonthlySummary(transactions, selectedMonth);
  const effectiveMonthlyIncome =
    monthSummary.income > 0 ? monthSummary.income : profile?.monthlyIncome || 0;

  // 1. SAVINGS RATE (Weight: 25%)
  const hasIncomeOrExpense = monthSummary.income > 0 || monthSummary.expenses > 0;
  const savingsRateAvailable = monthSummary.income > 0;
  let savingsRateScore = 0;
  if (savingsRateAvailable) {
    const sr = monthSummary.savingsRate;
    if (sr >= 30) {
      savingsRateScore = 100;
    } else if (sr >= 20) {
      savingsRateScore = 85 + ((sr - 20) / 10) * 15;
    } else if (sr >= 10) {
      savingsRateScore = 65 + ((sr - 10) / 10) * 20;
    } else if (sr >= 0) {
      savingsRateScore = 40 + (sr / 10) * 25;
    } else {
      // Negative savings rate
      savingsRateScore = Math.max(0, 40 + sr);
    }
  }
  savingsRateScore = Math.round(Math.min(100, Math.max(0, savingsRateScore)));

  // 2. BUDGET ADHERENCE (Weight: 20%)
  const { overallBudget, categoryBudgets } = computeBudgetProgressList(
    budgets,
    transactions,
    selectedMonth,
    profile?.monthlyBudget || 0
  );
  const allBudgets = [...(overallBudget ? [overallBudget] : []), ...categoryBudgets];
  const budgetAvailable = allBudgets.length > 0;
  let budgetScore = 0;
  if (budgetAvailable) {
    const itemScores = allBudgets.map((b) => {
      const u = b.percentUsed;
      if (u <= 75) return 100;
      if (u <= 90) return 100 - ((u - 75) / 15) * 20; // 80 to 100
      if (u <= 100) return 80 - ((u - 90) / 10) * 20; // 60 to 80
      return Math.max(0, 60 - (u - 100) * 1.5);
    });
    budgetScore = Math.round(itemScores.reduce((a, b) => a + b, 0) / itemScores.length);
  }

  // 3. EMERGENCY FUND COVERAGE (Weight: 20%)
  // Liquid accounts: Bank Account, UPI Wallet, Cash, Savings with positive balance
  const liquidAccountReserves = accounts
    .filter((a) => a.accountType !== 'Credit Card' && a.currentBalance > 0)
    .reduce((s, a) => s + a.currentBalance, 0);

  // Average monthly expenses across active months (up to last 3 months)
  const recentMonths = getLastNMonths(selectedMonth, 3);
  const activeExpenseTotals = recentMonths
    .map((ym) => computeMonthlySummary(transactions, ym).expenses)
    .filter((exp) => exp > 0);
  const avgMonthlyExpenses =
    activeExpenseTotals.length > 0
      ? activeExpenseTotals.reduce((a, b) => a + b, 0) / activeExpenseTotals.length
      : profile?.monthlyBudget || 0;

  const emergencyAvailable = avgMonthlyExpenses > 0 && accounts.length > 0;
  let monthsCovered = 0;
  let emergencyScore = 0;
  if (emergencyAvailable) {
    monthsCovered = liquidAccountReserves / avgMonthlyExpenses;
    if (monthsCovered >= 6) {
      emergencyScore = 100;
    } else if (monthsCovered >= 3) {
      emergencyScore = 75 + ((monthsCovered - 3) / 3) * 25;
    } else if (monthsCovered >= 1) {
      emergencyScore = 45 + ((monthsCovered - 1) / 2) * 30;
    } else {
      emergencyScore = Math.max(0, monthsCovered * 45);
    }
  }
  emergencyScore = Math.round(Math.min(100, Math.max(0, emergencyScore)));

  // 4. DEBT BURDEN (Weight: 15%)
  const activeLoans = loans.filter((l) => l.status === 'active' && l.outstandingPrincipal > 0);
  const totalMonthlyEMI = activeLoans.reduce((s, l) => s + l.emiAmount, 0);
  const creditCardDebt = accounts
    .filter((a) => a.accountType === 'Credit Card' && a.currentBalance < 0)
    .reduce((s, a) => s + Math.abs(a.currentBalance), 0);

  const debtAvailable = effectiveMonthlyIncome > 0 || activeLoans.length > 0 || hasIncomeOrExpense;
  let dtiPercent = 0;
  let debtScore = 100;
  if (debtAvailable) {
    if (totalMonthlyEMI === 0 && creditCardDebt === 0) {
      dtiPercent = 0;
      debtScore = 100;
    } else if (effectiveMonthlyIncome > 0) {
      const monthlyDebtService = totalMonthlyEMI + creditCardDebt * 0.1;
      dtiPercent = (monthlyDebtService / effectiveMonthlyIncome) * 100;
      if (dtiPercent <= 10) {
        debtScore = 95;
      } else if (dtiPercent <= 20) {
        debtScore = 85;
      } else if (dtiPercent <= 35) {
        debtScore = 65;
      } else if (dtiPercent <= 50) {
        debtScore = 40;
      } else {
        debtScore = Math.max(5, 40 - (dtiPercent - 50));
      }
    } else {
      debtScore = 35;
    }
  }
  debtScore = Math.round(Math.min(100, Math.max(0, debtScore)));

  // 5. SAVINGS GOAL PROGRESS (Weight: 10%)
  const goalAvailable = savingsGoals.length > 0;
  let avgGoalPercent = 0;
  let goalScore = 0;
  if (goalAvailable) {
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentSavedAmount, 0);
    avgGoalPercent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    // Reward active progress: 50% target completion already earns ~80 score if goals are long-term
    if (avgGoalPercent >= 75) {
      goalScore = 90 + ((avgGoalPercent - 75) / 25) * 10;
    } else if (avgGoalPercent >= 40) {
      goalScore = 70 + ((avgGoalPercent - 40) / 35) * 20;
    } else {
      goalScore = Math.max(20, (avgGoalPercent / 40) * 70);
    }
  }
  goalScore = Math.round(Math.min(100, Math.max(0, goalScore)));

  // 6. SPENDING STABILITY (Weight: 10%)
  const last6Months = getLastNMonths(selectedMonth, 6);
  const monthlyExpensesList = last6Months
    .map((ym) => computeMonthlySummary(transactions, ym).expenses)
    .filter((exp) => exp > 0);

  const stabilityAvailable = monthlyExpensesList.length >= 2;
  let cvPercent = 0;
  let stabilityScore = 0;
  if (stabilityAvailable) {
    const mean =
      monthlyExpensesList.reduce((a, b) => a + b, 0) / monthlyExpensesList.length;
    const variance =
      monthlyExpensesList.reduce((s, val) => s + Math.pow(val - mean, 2), 0) /
      monthlyExpensesList.length;
    const stdDev = Math.sqrt(variance);
    cvPercent = mean > 0 ? (stdDev / mean) * 100 : 0;
    // Lower coefficient of variation = higher stability
    if (cvPercent <= 15) {
      stabilityScore = 95;
    } else if (cvPercent <= 30) {
      stabilityScore = 75 + ((30 - cvPercent) / 15) * 20;
    } else if (cvPercent <= 50) {
      stabilityScore = 50 + ((50 - cvPercent) / 20) * 25;
    } else {
      stabilityScore = Math.max(15, 50 - (cvPercent - 50) * 0.8);
    }
  }
  stabilityScore = Math.round(Math.min(100, Math.max(0, stabilityScore)));

  const classifyMetricStatus = (
    available: boolean,
    score: number
  ): HealthMetricDetail['status'] => {
    if (!available) return 'missing';
    if (score >= 80) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'attention';
  };

  const rawMetrics: Omit<
    HealthMetricDetail,
    'effectiveWeight' | 'weightedContribution'
  >[] = [
    {
      id: 'savings_rate',
      name: 'Savings Rate',
      weight: 25,
      available: savingsRateAvailable,
      missingReason: savingsRateAvailable
        ? undefined
        : 'Record monthly income transactions to evaluate your savings rate.',
      rawScore: savingsRateScore,
      displayValue: savingsRateAvailable ? `${monthSummary.savingsRate.toFixed(1)}%` : 'No Income Data',
      benchmarkLabel: 'Target: ≥ 20% of monthly income',
      status: classifyMetricStatus(savingsRateAvailable, savingsRateScore),
      explanation: savingsRateAvailable
        ? `You saved ${formatCurrency(monthSummary.netSavings, currencyCode)} out of ${formatCurrency(
            monthSummary.income,
            currencyCode
          )} income in ${formatMonthLabel(selectedMonth)}.`
        : 'Monthly income is required to compute net savings rate.',
      recommendation:
        savingsRateScore >= 80
          ? 'Maintain your strong savings discipline and allocate surplus into your savings goals.'
          : 'Aim to save at least 20% of monthly inflows by trimming discretionary dining or shopping.',
    },
    {
      id: 'budget_adherence',
      name: 'Budget Adherence',
      weight: 20,
      available: budgetAvailable,
      missingReason: budgetAvailable
        ? undefined
        : 'Configure a monthly or category budget to track budget adherence.',
      rawScore: budgetScore,
      displayValue: budgetAvailable
        ? overallBudget
          ? `${overallBudget.percentUsed.toFixed(0)}% Used`
          : `${categoryBudgets.length} Cat. Tracked`
        : 'No Budgets Set',
      benchmarkLabel: 'Target: Keep spending < 85% of budget',
      status: classifyMetricStatus(budgetAvailable, budgetScore),
      explanation: budgetAvailable
        ? overallBudget
          ? `${formatCurrency(overallBudget.spentAmount, currencyCode)} spent of ${formatCurrency(
              overallBudget.amount,
              currencyCode
            )} monthly limit (${categoryBudgets.filter((c) => c.percentUsed >= 80).length} category warnings).`
          : `Tracking ${categoryBudgets.length} category budgets for ${formatMonthLabel(selectedMonth)}.`
        : 'No active monthly or category budgets found for this period.',
      recommendation:
        budgetScore >= 80
          ? 'Your spending is well within your planned limits.'
          : 'Review categories exceeding 80% utilization and adjust non-essential spending for the rest of the month.',
    },
    {
      id: 'emergency_fund',
      name: 'Emergency Fund Coverage',
      weight: 20,
      available: emergencyAvailable,
      missingReason: emergencyAvailable
        ? undefined
        : 'Add bank/wallet accounts and expense records to measure emergency runway.',
      rawScore: emergencyScore,
      displayValue: emergencyAvailable ? `${monthsCovered.toFixed(1)} Months` : 'Insufficient Data',
      benchmarkLabel: 'Target: 3 to 6 months of expenses',
      status: classifyMetricStatus(emergencyAvailable, emergencyScore),
      explanation: emergencyAvailable
        ? `Liquid balances of ${formatCurrency(
            liquidAccountReserves,
            currencyCode
          )} cover ${monthsCovered.toFixed(1)} months of average expenses (${formatCurrency(
            Math.round(avgMonthlyExpenses),
            currencyCode
          )}/mo).`
        : 'Requires liquid account balances and a monthly expense baseline.',
      recommendation:
        emergencyScore >= 75
          ? 'Your liquid emergency buffer provides solid protection against unexpected expenses.'
          : `Build your liquid reserves toward ${formatCurrency(
              Math.round(avgMonthlyExpenses * 3),
              currencyCode
            )} (3 months of core expenses).`,
    },
    {
      id: 'debt_burden',
      name: 'Debt Burden',
      weight: 15,
      available: debtAvailable,
      missingReason: debtAvailable
        ? undefined
        : 'Record income or loan details to evaluate debt-to-income ratio.',
      rawScore: debtScore,
      displayValue: debtAvailable ? `${dtiPercent.toFixed(1)}% EMI/Income` : 'No Data',
      benchmarkLabel: 'Target: Monthly EMIs ≤ 20% of income',
      status: classifyMetricStatus(debtAvailable, debtScore),
      explanation: debtAvailable
        ? activeLoans.length === 0 && creditCardDebt === 0
          ? 'Zero active loan EMIs or credit card debt recorded.'
          : `Monthly loan obligations of ${formatCurrency(
              totalMonthlyEMI,
              currencyCode
            )} represent ${dtiPercent.toFixed(1)}% of monthly income.`
        : 'Add income or loan records to evaluate debt service ratio.',
      recommendation:
        debtScore >= 80
          ? 'Your debt obligations are low and well-managed.'
          : 'Prioritize paying down higher-interest EMIs and avoid taking on new short-term debt.',
    },
    {
      id: 'goal_progress',
      name: 'Savings Goal Progress',
      weight: 10,
      available: goalAvailable,
      missingReason: goalAvailable
        ? undefined
        : 'Create at least one savings goal to include Goal Progress in your score.',
      rawScore: goalScore,
      displayValue: goalAvailable ? `${avgGoalPercent.toFixed(0)}% Funded` : 'No Goals Set',
      benchmarkLabel: 'Target: Steady monthly goal contributions',
      status: classifyMetricStatus(goalAvailable, goalScore),
      explanation: goalAvailable
        ? `Across ${savingsGoals.length} active goal${
            savingsGoals.length === 1 ? '' : 's'
          }, you have funded ${avgGoalPercent.toFixed(1)}% of total targets.`
        : 'No savings goals have been created yet.',
      recommendation:
        goalScore >= 80
          ? 'Great momentum on your financial milestones!'
          : 'Automate a fixed monthly contribution right after receiving your income or allowance.',
    },
    {
      id: 'spending_stability',
      name: 'Spending Stability',
      weight: 10,
      available: stabilityAvailable,
      missingReason: stabilityAvailable
        ? undefined
        : 'Requires at least 2 months of expense history to measure month-to-month stability.',
      rawScore: stabilityScore,
      displayValue: stabilityAvailable ? `±${cvPercent.toFixed(0)}% Variance` : '< 2 Mo. History',
      benchmarkLabel: 'Target: Monthly variance ≤ 20%',
      status: classifyMetricStatus(stabilityAvailable, stabilityScore),
      explanation: stabilityAvailable
        ? `Measured across ${monthlyExpensesList.length} active months with a ${cvPercent.toFixed(
            1
          )}% coefficient of variation.`
        : 'Record transactions across at least two months to calculate spending consistency.',
      recommendation:
        stabilityScore >= 75
          ? 'Your monthly spending is predictable and well-paced.'
          : 'Smooth out large irregular purchases by planning them in advance through sinking funds.',
    },
  ];

  const availableWeightTotal = rawMetrics
    .filter((m) => m.available)
    .reduce((s, m) => s + m.weight, 0);

  const metrics: HealthMetricDetail[] = rawMetrics.map((m) => {
    if (!m.available || availableWeightTotal === 0) {
      return {
        ...m,
        effectiveWeight: 0,
        weightedContribution: 0,
      };
    }
    const effectiveWeight = (m.weight / availableWeightTotal) * 100;
    const weightedContribution = (m.rawScore * effectiveWeight) / 100;
    return {
      ...m,
      effectiveWeight: Number(effectiveWeight.toFixed(1)),
      weightedContribution: Number(weightedContribution.toFixed(1)),
    };
  });

  const overallScore =
    availableWeightTotal > 0
      ? Math.round(metrics.reduce((s, m) => s + m.weightedContribution, 0))
      : 0;

  const excludedMetrics = metrics.filter((m) => !m.available).map((m) => m.name);

  const topSuggestions = [...metrics]
    .filter((m) => m.available && m.rawScore < 85)
    .sort((a, b) => a.rawScore - b.rawScore)
    .slice(0, 3)
    .map((m) => `${m.name}: ${m.recommendation}`);

  if (topSuggestions.length === 0) {
    topSuggestions.push(
      'Your financial health metrics are strong across all tracked dimensions. Keep reviewing your monthly budgets and goal contributions!'
    );
  }

  return {
    overallScore,
    category: getHealthScoreCategory(overallScore),
    availableWeightTotal,
    excludedMetrics,
    metrics,
    topSuggestions,
  };
}

export function computeHistoricalHealthScores(params: {
  profile: UserProfile | null;
  accounts: AccountWithBalance[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  baseMonth: string;
}): Array<{ month: string; label: string; score: number; category: HealthScoreCategory }> {
  const months = getLastNMonths(params.baseMonth, 6);
  return months.map((ym) => {
    // Filter transactions up to the end of that month
    const [y, m] = ym.split('-').map(Number);
    const endDay = new Date(y, m, 0).getDate();
    const cutoff = `${ym}-${String(endDay).padStart(2, '0')}`;
    const txUpToMonth = params.transactions.filter((t) => t.date <= cutoff);
    const accAsOf = computeAccountBalances(params.accounts, txUpToMonth, cutoff);

    const report = computeFinancialHealthScore({
      profile: params.profile,
      accounts: accAsOf,
      transactions: txUpToMonth,
      budgets: params.budgets,
      savingsGoals: params.savingsGoals,
      loans: params.loans,
      selectedMonth: ym,
    });

    return {
      month: ym,
      label: formatShortMonthLabel(ym),
      score: report.overallScore,
      category: report.category,
    };
  });
}

// ============================================================================
// 12. PROFESSIONAL & PERSONAL BALANCE SHEET GENERATOR ENGINE
// ============================================================================

export interface BalanceSheetLineItem {
  id: string;
  name: string;
  subCategory: string;
  institutionOrNote: string;
  amount: number;
  isLiquid?: boolean;
  source: 'account' | 'savings_goal' | 'loan' | 'manual';
}

export interface BalanceSheetStatement {
  asOfDate: string;
  assets: {
    cashAndBank: BalanceSheetLineItem[];
    savingsGoalsEarmarked: BalanceSheetLineItem[];
    investmentsAndOtherAssets: BalanceSheetLineItem[];
    totalCashAndBank: number;
    totalSavingsGoalsIncluded: number;
    totalInvestmentsAndOther: number;
    totalLiquidAssets: number;
    totalAssets: number;
  };
  liabilities: {
    loansAndDebt: BalanceSheetLineItem[];
    creditCardDues: BalanceSheetLineItem[];
    otherLiabilities: BalanceSheetLineItem[];
    totalLoans: number;
    totalCreditCardDues: number;
    totalOtherLiabilities: number;
    totalLiabilities: number;
  };
  netWorth: number;
  liabilitiesPlusNetWorth: number; // Always equals totalAssets (Assets = Liabilities + Net Worth)
  ratios: {
    debtToAssetPercent: number;
    solvencyRatioPercent: number;
    liquidityCoverageRatio: number | null;
  };
  assumptionsAndDisclosures: string[];
}

export function computeBalanceSheetStatement(params: {
  accounts: Account[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  manualItems: BalanceSheetItem[];
  asOfDate: string;
  includeGoalsAsSeparateAssets: boolean;
}): BalanceSheetStatement {
  const {
    accounts,
    transactions,
    savingsGoals,
    loans,
    loanPayments,
    manualItems,
    asOfDate,
    includeGoalsAsSeparateAssets,
  } = params;

  const accountsAsOf = computeAccountBalances(accounts, transactions, asOfDate);

  // 1. Cash & Bank Balances (positive non-credit-card accounts, or positive credit card balance)
  const cashAndBank: BalanceSheetLineItem[] = [];
  const creditCardDues: BalanceSheetLineItem[] = [];

  for (const acc of accountsAsOf) {
    if (acc.accountType === 'Credit Card') {
      if (acc.currentBalance < 0) {
        creditCardDues.push({
          id: acc.id,
          name: acc.name,
          subCategory: 'Credit Card Payable',
          institutionOrNote: 'Revolving Credit Card Balance',
          amount: Math.abs(acc.currentBalance),
          source: 'account',
        });
      } else if (acc.currentBalance > 0) {
        cashAndBank.push({
          id: acc.id,
          name: `${acc.name} (Credit Balance)`,
          subCategory: acc.accountType,
          institutionOrNote: 'Prepaid / Surplus Credit Card Balance',
          amount: acc.currentBalance,
          isLiquid: true,
          source: 'account',
        });
      }
    } else {
      if (acc.currentBalance >= 0) {
        cashAndBank.push({
          id: acc.id,
          name: acc.name,
          subCategory: acc.accountType,
          institutionOrNote: `Opening ₹${acc.openingBalance.toLocaleString('en-IN')} + Net Cash Flow up to ${asOfDate}`,
          amount: acc.currentBalance,
          isLiquid: true,
          source: 'account',
        });
      } else {
        // Overdrawn bank account is a short-term liability
        creditCardDues.push({
          id: acc.id,
          name: `${acc.name} (Overdraft)`,
          subCategory: 'Account Overdraft',
          institutionOrNote: `${acc.accountType} negative balance`,
          amount: Math.abs(acc.currentBalance),
          source: 'account',
        });
      }
    }
  }

  // 2. Savings Goals
  const savingsGoalsEarmarked: BalanceSheetLineItem[] = savingsGoals
    .filter((g) => g.currentSavedAmount > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      subCategory: 'Savings Goal Reserve',
      institutionOrNote: `Target: ₹${g.targetAmount.toLocaleString('en-IN')} by ${g.targetDate}`,
      amount: g.currentSavedAmount,
      isLiquid: true,
      source: 'savings_goal' as const,
    }));

  // 3. Manual Assets (Investments, FDs, Gold, Equipment, Deposits, etc.)
  const investmentsAndOtherAssets: BalanceSheetLineItem[] = manualItems
    .filter((item) => item.entryType === 'asset' && item.amount > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      subCategory: item.category,
      institutionOrNote: item.institutionOrCounterparty || item.notes || `Valued on ${item.valuationDate}`,
      amount: item.amount,
      isLiquid: item.isLiquid,
      source: 'manual' as const,
    }));

  // 4. Loans & Debt as of asOfDate
  const loansAndDebt: BalanceSheetLineItem[] = loans
    .filter((l) => l.status === 'active' && l.startDate <= asOfDate)
    .map((l) => {
      // Reconstruct principal as of asOfDate if payments were made after asOfDate
      const paymentsAfterAsOf = loanPayments.filter(
        (p) => p.loanId === l.id && p.date > asOfDate
      );
      const principalRepaidAfter = paymentsAfterAsOf.reduce(
        (s, p) => s + p.principalComponent,
        0
      );
      const balanceAsOf = Math.min(
        l.originalAmount,
        l.outstandingPrincipal + principalRepaidAfter
      );
      return {
        id: l.id,
        name: l.name,
        subCategory: l.category,
        institutionOrNote: `${l.lender ? l.lender + ' · ' : ''}${l.interestRate}% p.a. · EMI ₹${l.emiAmount.toLocaleString('en-IN')}/mo`,
        amount: balanceAsOf,
        source: 'loan' as const,
      };
    })
    .filter((item) => item.amount > 0);

  // 5. Manual Liabilities
  const otherLiabilities: BalanceSheetLineItem[] = manualItems
    .filter((item) => item.entryType === 'liability' && item.amount > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      subCategory: item.category,
      institutionOrNote: item.institutionOrCounterparty || item.notes || `Recorded on ${item.valuationDate}`,
      amount: item.amount,
      source: 'manual' as const,
    }));

  const totalCashAndBank = cashAndBank.reduce((s, i) => s + i.amount, 0);
  const totalSavingsGoalsRaw = savingsGoalsEarmarked.reduce((s, i) => s + i.amount, 0);
  const totalSavingsGoalsIncluded = includeGoalsAsSeparateAssets ? totalSavingsGoalsRaw : 0;
  const totalInvestmentsAndOther = investmentsAndOtherAssets.reduce((s, i) => s + i.amount, 0);

  const totalAssets =
    totalCashAndBank + totalSavingsGoalsIncluded + totalInvestmentsAndOther;

  const totalLiquidAssets =
    totalCashAndBank +
    totalSavingsGoalsIncluded +
    investmentsAndOtherAssets.filter((i) => i.isLiquid).reduce((s, i) => s + i.amount, 0);

  const totalLoans = loansAndDebt.reduce((s, i) => s + i.amount, 0);
  const totalCreditCardDues = creditCardDues.reduce((s, i) => s + i.amount, 0);
  const totalOtherLiabilities = otherLiabilities.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = totalLoans + totalCreditCardDues + totalOtherLiabilities;

  const netWorth = totalAssets - totalLiabilities;
  const liabilitiesPlusNetWorth = totalLiabilities + netWorth; // Accounting Equation: Assets = Liabilities + Net Worth

  const debtToAssetPercent = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const solvencyRatioPercent = totalAssets > 0 ? (netWorth / totalAssets) * 100 : 0;
  const liquidityCoverageRatio =
    totalLiabilities > 0 ? totalLiquidAssets / totalLiabilities : null;

  const assumptionsAndDisclosures: string[] = [
    `Statement Cutoff Date: Account balances are computed from opening balances plus all recorded income, expense, and transfer transactions dated on or before ${formatDateIN(asOfDate)}.`,
    includeGoalsAsSeparateAssets
      ? `Savings Goals Treatment: Savings Goal balances (${formatCurrency(totalSavingsGoalsRaw)}) are included as separate external reserve assets. Ensure these funds are not simultaneously counted inside your primary bank account balances.`
      : `Double-Counting Guard Active: Savings Goal progress (${formatCurrency(totalSavingsGoalsRaw)}) is treated as earmarked funds held inside your existing Bank/Savings accounts and is NOT added a second time to Total Assets.`,
    `Valuation Basis: Cash and bank balances reflect book ledger values. Investments, physical equipment, and manual assets reflect user-entered carrying/market values without unrecorded appreciation or depreciation.`,
    `Unrecorded Items: Off-balance-sheet items (such as unentered physical personal property, future scholarship stipends, or informal obligations not logged in Finora) are excluded.`,
  ];

  return {
    asOfDate,
    assets: {
      cashAndBank,
      savingsGoalsEarmarked,
      investmentsAndOtherAssets,
      totalCashAndBank,
      totalSavingsGoalsIncluded,
      totalInvestmentsAndOther,
      totalLiquidAssets,
      totalAssets,
    },
    liabilities: {
      loansAndDebt,
      creditCardDues,
      otherLiabilities,
      totalLoans,
      totalCreditCardDues,
      totalOtherLiabilities,
      totalLiabilities,
    },
    netWorth,
    liabilitiesPlusNetWorth,
    ratios: {
      debtToAssetPercent,
      solvencyRatioPercent,
      liquidityCoverageRatio,
    },
    assumptionsAndDisclosures,
  };
}

// ============================================================================
// 8. SMART ALERTS & REMINDERS EVALUATION ENGINE
// ============================================================================

export function evaluateSmartNotifications(params: {
  userId: string;
  profile: UserProfile;
  accounts: AccountWithBalance[];
  transactions: Transaction[];
  budgets: Budget[];
  reminders: Reminder[];
  loans?: Loan[];
  subscriptions?: Subscription[];
  savingsGoals?: SavingsGoal[];
  existingNotifications: AppNotification[];
  selectedMonth: string;
}): Omit<AppNotification, 'createdAt' | 'updatedAt'>[] {
  const {
    userId,
    profile,
    accounts,
    transactions,
    budgets,
    reminders,
    loans = [],
    subscriptions = [],
    savingsGoals = [],
    existingNotifications,
    selectedMonth,
  } = params;

  const existingKeys = new Set(existingNotifications.map((n) => n.deduplicationKey));
  const newAlerts: Omit<AppNotification, 'createdAt' | 'updatedAt'>[] = [];
  const prefs = profile.notificationPrefs || {
    budgetAlerts: true,
    spendingAlerts: true,
    lowBalanceAlerts: true,
    billReminders: true,
  };
  const currency = profile.currency || 'INR';

  const makeId = (key: string) =>
    `notif_${key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110)}`;

  // A. Budget Alerts (80% Warning & 100% Exceeded)
  if (prefs.budgetAlerts) {
    const { overallBudget, categoryBudgets } = computeBudgetProgressList(
      budgets,
      transactions,
      selectedMonth,
      profile.monthlyBudget
    );

    const allBudgets = [
      ...(overallBudget ? [overallBudget] : []),
      ...categoryBudgets,
    ];

    for (const b of allBudgets) {
      if (b.percentUsed >= 100) {
        const key = `budget_100_${selectedMonth}_${b.categoryId}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title: `Budget Exceeded: ${b.categoryName}`,
            message: `You have spent ${formatCurrency(b.spentAmount, currency)} (${b.percentUsed.toFixed(
              1
            )}%) against your ${formatCurrency(b.amount, currency)} budget for ${formatMonthLabel(
              selectedMonth
            )}.`,
            type: 'budget',
            severity: 'critical',
            isRead: false,
            relatedEntityId: b.id,
            deduplicationKey: key,
          });
        }
      } else if (b.percentUsed >= 80) {
        const key = `budget_80_${selectedMonth}_${b.categoryId}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title: `Approaching Budget Limit: ${b.categoryName}`,
            message: `You have used ${b.percentUsed.toFixed(1)}% (${formatCurrency(
              b.spentAmount,
              currency
            )}) of your ${formatCurrency(b.amount, currency)} limit. ${formatCurrency(
              b.remainingAmount,
              currency
            )} remaining.`,
            type: 'budget',
            severity: 'warning',
            isRead: false,
            relatedEntityId: b.id,
            deduplicationKey: key,
          });
        }
      }
    }
  }

  // B. Spending Alerts (MoM & Category Spike)
  if (prefs.spendingAlerts) {
    const prevMonth = getPreviousYearMonth(selectedMonth);
    const currSummary = computeMonthlySummary(transactions, selectedMonth);
    const prevSummary = computeMonthlySummary(transactions, prevMonth);

    if (prevSummary.expenses > 0 && currSummary.expenses > prevSummary.expenses * 1.2) {
      const increasePct =
        ((currSummary.expenses - prevSummary.expenses) / prevSummary.expenses) * 100;
      const key = `spending_mom_spike_${selectedMonth}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        newAlerts.push({
          id: makeId(key),
          userId,
          title: `Monthly Spending Up ${increasePct.toFixed(0)}%`,
          message: `Your expenses in ${formatMonthLabel(selectedMonth)} (${formatCurrency(
            currSummary.expenses,
            currency
          )}) are ${increasePct.toFixed(1)}% higher than ${formatMonthLabel(prevMonth)} (${formatCurrency(
            prevSummary.expenses,
            currency
          )}).`,
          type: 'spending',
          severity: 'warning',
          isRead: false,
          relatedEntityId: selectedMonth,
          deduplicationKey: key,
        });
      }
    }

    const currExpenses = filterTransactionsByMonth(transactions, selectedMonth).filter(
      (t) => t.type === 'expense'
    );
    const prevExpenses = filterTransactionsByMonth(transactions, prevMonth).filter(
      (t) => t.type === 'expense'
    );

    if (prevExpenses.length > 0) {
      const currByCat = new Map<string, number>();
      const prevByCat = new Map<string, number>();
      currExpenses.forEach((t) =>
        currByCat.set(t.categoryName, (currByCat.get(t.categoryName) || 0) + t.amount)
      );
      prevExpenses.forEach((t) =>
        prevByCat.set(t.categoryName, (prevByCat.get(t.categoryName) || 0) + t.amount)
      );

      for (const [cat, currAmt] of currByCat.entries()) {
        const prevAmt = prevByCat.get(cat) || 0;
        if (prevAmt >= 500 && currAmt >= prevAmt * 1.35) {
          const catSlug = cat.replace(/[^a-zA-Z0-9]/g, '_');
          const key = `spending_cat_spike_${selectedMonth}_${catSlug}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newAlerts.push({
              id: makeId(key),
              userId,
              title: `Higher ${cat} Spending`,
              message: `Spending on ${cat} reached ${formatCurrency(
                currAmt,
                currency
              )} this month, compared to ${formatCurrency(prevAmt, currency)} last month.`,
              type: 'spending',
              severity: 'info',
              isRead: false,
              relatedEntityId: cat,
              deduplicationKey: key,
            });
          }
        }
      }
    }
  }

  // C. Low-Balance Alerts
  if (prefs.lowBalanceAlerts && profile.lowBalanceThreshold > 0) {
    for (const acc of accounts) {
      if (acc.accountType !== 'Credit Card' && acc.currentBalance < profile.lowBalanceThreshold) {
        const key = `low_balance_${selectedMonth}_${acc.id}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title: `Low Balance Alert: ${acc.name}`,
            message: `${acc.name} balance is ${formatCurrency(
              acc.currentBalance,
              currency
            )}, which is below your configured threshold of ${formatCurrency(
              profile.lowBalanceThreshold,
              currency
            )}.`,
            type: 'low_balance',
            severity: acc.currentBalance < 0 ? 'critical' : 'warning',
            isRead: false,
            relatedEntityId: acc.id,
            deduplicationKey: key,
          });
        }
      }
    }
  }

  // D. Bill Reminders, Loan EMIs, and Subscription Renewals
  if (prefs.billReminders) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // D1. Reminders
    for (const rem of reminders) {
      if (rem.completed || !rem.notifyInApp) continue;
      const parts = rem.dueDate.split('-').map(Number);
      const due =
        parts.length === 3
          ? new Date(parts[0], parts[1] - 1, parts[2])
          : new Date(rem.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        const statusTag = diffDays < 0 ? 'overdue' : 'upcoming';
        const key = `reminder_${statusTag}_${rem.id}_${rem.dueDate}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title:
              diffDays < 0
                ? `Overdue Bill Reminder: ${rem.title}`
                : diffDays === 0
                ? `Bill Due Today: ${rem.title}`
                : `Upcoming Bill: ${rem.title} (in ${diffDays}d)`,
            message: `${rem.title} (${rem.category}) of ${formatCurrency(
              rem.amount,
              currency
            )} is due on ${formatDateIN(rem.dueDate)}.`,
            type: 'reminder',
            severity: diffDays <= 0 ? 'critical' : 'warning',
            isRead: false,
            relatedEntityId: rem.id,
            deduplicationKey: key,
          });
        }
      }
    }

    // D2. Loan & EMI Due Dates
    for (const loan of loans) {
      if (loan.status !== 'active' || loan.outstandingPrincipal <= 0) continue;
      const parts = loan.nextDueDate.split('-').map(Number);
      const due =
        parts.length === 3
          ? new Date(parts[0], parts[1] - 1, parts[2])
          : new Date(loan.nextDueDate);
      due.setHours(0, 0, 0, 0);
      if (isNaN(due.getTime())) continue;
      const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        const statusTag = diffDays < 0 ? 'overdue' : 'upcoming';
        const key = `loan_emi_${statusTag}_${loan.id}_${loan.nextDueDate}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title:
              diffDays < 0
                ? `Overdue Loan EMI: ${loan.name}`
                : diffDays === 0
                ? `Loan EMI Due Today: ${loan.name}`
                : `Upcoming Loan EMI: ${loan.name} (in ${diffDays}d)`,
            message: `EMI of ${formatCurrency(loan.emiAmount, currency)} for ${loan.name} (${
              loan.lender || loan.category
            }) is scheduled on ${formatDateIN(
              loan.nextDueDate
            )}. Remaining principal: ${formatCurrency(loan.outstandingPrincipal, currency)}.`,
            type: 'loan',
            severity: diffDays <= 0 ? 'critical' : 'warning',
            isRead: false,
            relatedEntityId: loan.id,
            deduplicationKey: key,
          });
        }
      }
    }

    // D3. Subscription Renewals
    for (const sub of subscriptions) {
      if (sub.status !== 'active') continue;
      const parts = sub.nextRenewalDate.split('-').map(Number);
      const renewal =
        parts.length === 3
          ? new Date(parts[0], parts[1] - 1, parts[2])
          : new Date(sub.nextRenewalDate);
      renewal.setHours(0, 0, 0, 0);
      if (isNaN(renewal.getTime())) continue;
      const diffDays = Math.ceil(
        (renewal.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays >= -3 && diffDays <= 7) {
        const key = `sub_renewal_${sub.id}_${sub.nextRenewalDate}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newAlerts.push({
            id: makeId(key),
            userId,
            title:
              diffDays <= 0
                ? `Subscription Renewal Due: ${sub.name}`
                : `Upcoming Renewal: ${sub.name} (in ${diffDays}d)`,
            message: `Your ${sub.frequency} subscription for ${sub.name} (${formatCurrency(
              sub.amount,
              currency
            )}) renews on ${formatDateIN(sub.nextRenewalDate)}.`,
            type: 'subscription',
            severity: diffDays <= 1 ? 'warning' : 'info',
            isRead: false,
            relatedEntityId: sub.id,
            deduplicationKey: key,
          });
        }
      }
    }
  }

  // E. Savings Goal Milestones (50%, 80%, 100%)
  for (const goal of savingsGoals) {
    if (goal.targetAmount <= 0) continue;
    const pct = (goal.currentSavedAmount / goal.targetAmount) * 100;
    let milestone: number | null = null;
    if (pct >= 100) milestone = 100;
    else if (pct >= 80) milestone = 80;
    else if (pct >= 50) milestone = 50;

    if (milestone !== null) {
      const key = `goal_milestone_${goal.id}_${milestone}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        newAlerts.push({
          id: makeId(key),
          userId,
          title:
            milestone === 100
              ? `Savings Goal Achieved: ${goal.name}!`
              : `Savings Milestone (${milestone}%): ${goal.name}`,
          message:
            milestone === 100
              ? `Congratulations! You have saved ${formatCurrency(
                  goal.currentSavedAmount,
                  currency
                )} and reached your ${formatCurrency(goal.targetAmount, currency)} target for ${
                  goal.name
                }.`
              : `You have reached ${pct.toFixed(0)}% (${formatCurrency(
                  goal.currentSavedAmount,
                  currency
                )} of ${formatCurrency(goal.targetAmount, currency)}) toward ${goal.name}.`,
          type: 'goal',
          severity: 'info',
          isRead: false,
          relatedEntityId: goal.id,
          deduplicationKey: key,
        });
      }
    }
  }

  return newAlerts;
}
