import {
  Account,
  AccountWithBalance,
  AppNotification,
  Budget,
  BudgetProgress,
  Reminder,
  ReportPeriod,
  SavingsGoal,
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
  transactions: Transaction[]
): AccountWithBalance[] {
  return accounts.map((acc) => {
    let totalIncome = 0;
    let totalExpense = 0;
    let netTransfers = 0;

    for (const tx of transactions) {
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

/**
 * Generates deduplicated smart alerts from actual financial records.
 */
export function evaluateSmartNotifications(params: {
  userId: string;
  profile: UserProfile;
  accounts: AccountWithBalance[];
  transactions: Transaction[];
  budgets: Budget[];
  reminders: Reminder[];
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

  // A. Budget Alerts
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

    // Category spike vs previous month
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
      if (acc.currentBalance < profile.lowBalanceThreshold) {
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

  // D. Bill & Payment Reminders
  if (prefs.billReminders) {
    const todayStr = getTodayISO();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

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
  }

  return newAlerts;
}
