import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Target,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Filter,
  X,
  HeartPulse,
  Landmark,
  Repeat,
  Scale,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeBalanceSheetStatement,
  computeBudgetProgressList,
  computeFinancialHealthScore,
  computeMonthlySummary,
  computeSavingsGoalMetrics,
  computeTotalBalance,
  filterTransactionsByMonth,
  formatCurrency,
  formatDateIN,
  formatMonthLabel,
  formatShortMonthLabel,
  getLastNMonths,
  getMonthlyEquivalentCost,
  getPreviousYearMonth,
  getTodayISO,
} from '../utils/calculations';

// Restrained, professional financial palette
const CHART_COLORS = [
  '#10B981', // Emerald 500
  '#3B82F6', // Blue 500
  '#8B5CF6', // Violet 500
  '#F59E0B', // Amber 500
  '#F87171', // Muted Coral / Red 400
  '#14B8A6', // Teal 500
  '#6366F1', // Indigo 500
  '#64748B', // Slate 500
];

export const DashboardView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    budgets,
    savingsGoals,
    loans,
    loanPayments,
    subscriptions,
    balanceSheetItems,
    selectedMonth,
    openTransactionModal,
    setActiveTab,
    setCategoryDrilldown,
    theme,
  } = useFinance();

  const [barRangeMonths, setBarRangeMonths] = useState<3 | 6 | 12>(6);
  const [selectedPieCategory, setSelectedPieCategory] = useState<string | null>(null);

  const currency = profile?.currency || 'INR';
  const prevMonth = useMemo(() => getPreviousYearMonth(selectedMonth), [selectedMonth]);

  const tooltipStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: theme === 'dark' ? '#172033' : '#FFFFFF',
      borderRadius: '8px',
      border: theme === 'dark' ? '1px solid #293548' : '1px solid #E6EAF0',
      color: theme === 'dark' ? '#F1F5F9' : '#172033',
      fontSize: '12px',
      padding: '8px 12px',
      boxShadow:
        theme === 'dark'
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
    }),
    [theme]
  );
  const chartGridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : '#E6EAF0';
  const chartTickColor = theme === 'dark' ? '#94A3B8' : '#778196';
  const chartExpenseColor = theme === 'dark' ? '#F87171' : '#EF6461';
  const pieSliceStroke = theme === 'dark' ? '#172033' : '#FFFFFF';

  // 1. Summary Card Calculations & Historical Comparison
  const totalBalance = useMemo(
    () => computeTotalBalance(accounts, transactions),
    [accounts, transactions]
  );

  const monthSummary = useMemo(
    () => computeMonthlySummary(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const prevMonthSummary = useMemo(
    () => computeMonthlySummary(transactions, prevMonth),
    [transactions, prevMonth]
  );

  const incomeMoMChange = useMemo(() => {
    if (prevMonthSummary.income <= 0) return null;
    return ((monthSummary.income - prevMonthSummary.income) / prevMonthSummary.income) * 100;
  }, [monthSummary.income, prevMonthSummary.income]);

  const expenseMoMChange = useMemo(() => {
    if (prevMonthSummary.expenses <= 0) return null;
    return ((monthSummary.expenses - prevMonthSummary.expenses) / prevMonthSummary.expenses) * 100;
  }, [monthSummary.expenses, prevMonthSummary.expenses]);

  const { overallBudget, categoryBudgets } = useMemo(
    () =>
      computeBudgetProgressList(
        budgets,
        transactions,
        selectedMonth,
        profile?.monthlyBudget || 0
      ),
    [budgets, transactions, selectedMonth, profile?.monthlyBudget]
  );

  const healthSnapshot = useMemo(
    () =>
      computeFinancialHealthScore({
        profile,
        accounts,
        transactions,
        budgets,
        savingsGoals,
        loans,
        selectedMonth,
      }),
    [profile, accounts, transactions, budgets, savingsGoals, loans, selectedMonth]
  );

  const balanceSheetSnapshot = useMemo(
    () =>
      computeBalanceSheetStatement({
        accounts,
        transactions,
        savingsGoals,
        loans,
        loanPayments,
        manualItems: balanceSheetItems,
        asOfDate: getTodayISO(),
        includeGoalsAsSeparateAssets: false,
      }),
    [accounts, transactions, savingsGoals, loans, loanPayments, balanceSheetItems]
  );

  const activeMonthlySubscriptions = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => sum + getMonthlyEquivalentCost(s.amount, s.frequency), 0),
    [subscriptions]
  );

  // 2. Chart A: Income vs Expenses Over Last N Months
  const incomeVsExpenseData = useMemo(() => {
    const months = getLastNMonths(selectedMonth, barRangeMonths);
    return months.map((ym) => {
      const s = computeMonthlySummary(transactions, ym);
      return {
        month: formatShortMonthLabel(ym),
        fullMonth: formatMonthLabel(ym),
        Income: s.income,
        Expenses: s.expenses,
        NetSavings: s.netSavings,
      };
    });
  }, [transactions, selectedMonth, barRangeMonths]);

  // 3. Chart B: Expense Breakdown by Category (Current Selected Month)
  const monthExpenseTransactions = useMemo(
    () =>
      filterTransactionsByMonth(transactions, selectedMonth).filter(
        (tx) => tx.type === 'expense'
      ),
    [transactions, selectedMonth]
  );

  const categoryBreakdownData = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthExpenseTransactions) {
      map.set(tx.categoryName, (map.get(tx.categoryName) || 0) + tx.amount);
    }
    const total = monthSummary.expenses;
    return Array.from(map.entries())
      .map(([name, value], idx) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenseTransactions, monthSummary.expenses]);

  const drilldownTransactions = useMemo(() => {
    if (!selectedPieCategory) return [];
    return monthExpenseTransactions.filter(
      (tx) => tx.categoryName.toLowerCase() === selectedPieCategory.toLowerCase()
    );
  }, [monthExpenseTransactions, selectedPieCategory]);

  // 4. Chart C: Monthly Spending Trend (Current Month vs Previous Month Cumulative by Day)
  const spendingTrendData = useMemo(() => {
    const prevExpenses = filterTransactionsByMonth(transactions, prevMonth).filter(
      (tx) => tx.type === 'expense'
    );
    const days = [1, 5, 10, 15, 20, 25, 30];
    return days.map((day) => {
      const dayStr = String(day).padStart(2, '0');
      const currCumulative = monthExpenseTransactions
        .filter((tx) => tx.date.slice(8, 10) <= dayStr)
        .reduce((s, tx) => s + tx.amount, 0);
      const prevCumulative = prevExpenses
        .filter((tx) => tx.date.slice(8, 10) <= dayStr)
        .reduce((s, tx) => s + tx.amount, 0);
      return {
        day: `Day ${day}`,
        CurrentMonth: currCumulative,
        PreviousMonth: prevCumulative,
      };
    });
  }, [monthExpenseTransactions, transactions, prevMonth]);

  // 5. Recent Transactions (latest 8)
  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  return (
    <div className="space-y-5">
      {/* Compact Financial Overview Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h2 className="page-title">
            Financial Overview · {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="supporting-text mt-0.5">
            Live position across {accounts.length} account{accounts.length === 1 ? '' : 's'} and verified monthly cashflow
          </p>
        </div>

        {/* Compact Action Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => openTransactionModal('expense')}
            className="inline-flex items-center gap-1.5 btn-primary px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('income')}
            className="inline-flex items-center gap-1.5 glass-button-secondary px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Add Income
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('expense')}
            className="inline-flex items-center gap-1.5 glass-button-secondary px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
            Add Expense
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('transfer')}
            className="inline-flex items-center gap-1.5 glass-button-secondary px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Transfer Money
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className="inline-flex items-center gap-1.5 glass-button-secondary px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <PieChartIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Create Budget
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className="inline-flex items-center gap-1.5 glass-button-secondary px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <Target className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Create Savings Goal
          </button>
        </div>
      </div>

      {/* 5 Financial Summary Cards with Clear Hierarchy & Historical Comparisons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
        {/* 1. Total Balance (Slightly More Prominent Hero Card) */}
        <div className="data-surface-prominent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label">Total Balance</span>
            <span className="rounded bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              Net Liquid
            </span>
          </div>
          <p className="mt-2 metric-value-hero text-slate-900 dark:text-white">
            {accounts.length === 0 && transactions.length === 0
              ? '—'
              : formatCurrency(totalBalance, currency)}
          </p>
          <p className="mt-2 supporting-text flex items-center justify-between">
            <span>
              Across {accounts.length} active account{accounts.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Accounts →
            </button>
          </p>
        </div>

        {/* 2. Total Income This Month */}
        <div className="data-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label">Total Income</span>
            {incomeMoMChange !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-mono-tabular font-medium ${
                  incomeMoMChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}
                title={`Compared with ${formatMonthLabel(prevMonth)}`}
              >
                {incomeMoMChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {incomeMoMChange >= 0 ? '+' : ''}
                {incomeMoMChange.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-2 metric-value text-emerald-600 dark:text-emerald-400">
            {formatCurrency(monthSummary.income, currency)}
          </p>
          <p className="mt-2 supporting-text">
            {prevMonthSummary.income > 0
              ? `Prev: ${formatCurrency(prevMonthSummary.income, currency)} in ${formatShortMonthLabel(prevMonth)}`
              : `${formatMonthLabel(selectedMonth)} inflows`}
          </p>
        </div>

        {/* 3. Total Expenses This Month */}
        <div className="data-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label">Total Expenses</span>
            {expenseMoMChange !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-mono-tabular font-medium ${
                  expenseMoMChange <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
                title={`Compared with ${formatMonthLabel(prevMonth)}`}
              >
                {expenseMoMChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {expenseMoMChange >= 0 ? '+' : ''}
                {expenseMoMChange.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-2 metric-value text-rose-600 dark:text-rose-400">
            {formatCurrency(monthSummary.expenses, currency)}
          </p>
          <p className="mt-2 supporting-text">
            {prevMonthSummary.expenses > 0
              ? `Prev: ${formatCurrency(prevMonthSummary.expenses, currency)} in ${formatShortMonthLabel(prevMonth)}`
              : `${monthExpenseTransactions.length} expense records`}
          </p>
        </div>

        {/* 4. Net Savings This Month */}
        <div className="data-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label">Net Savings</span>
            <span
              className={`text-[11px] font-mono-tabular font-medium ${
                monthSummary.savingsRate >= 20
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : monthSummary.savingsRate >= 0
                  ? 'text-slate-700 dark:text-slate-300'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {monthSummary.savingsRate.toFixed(1)}% rate
            </span>
          </div>
          <p
            className={`mt-2 metric-value ${
              monthSummary.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(monthSummary.netSavings, currency)}
          </p>
          <p className="mt-2 supporting-text">
            Income minus eligible expenses
          </p>
        </div>

        {/* 5. Monthly Budget Remaining (Neutral Styling + Progress Indicator) */}
        <div className="data-surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label">Budget Remaining</span>
            {overallBudget && (
              <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                {overallBudget.percentUsed.toFixed(0)}% used
              </span>
            )}
          </div>
          {overallBudget ? (
            <>
              <p
                className={`mt-2 metric-value ${
                  overallBudget.remainingAmount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {formatCurrency(overallBudget.remainingAmount, currency)}
              </p>
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      overallBudget.status === 'exceeded'
                        ? 'bg-rose-500 dark:bg-rose-400'
                        : overallBudget.status === 'warning'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, overallBudget.percentUsed))}%` }}
                  />
                </div>
                <p className="supporting-text font-mono-tabular">
                  Limit: {formatCurrency(overallBudget.amount, currency)}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-medium text-slate-400">Not Configured</p>
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline text-left"
              >
                Set Monthly Limit →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 1 of Charts: A. Income vs Expenses (7 cols) & B. Expense Breakdown Donut (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* A. Income vs Expenses Bar Chart */}
        <div className="lg:col-span-7 data-surface p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="section-heading">Income vs. Expenses</h3>
              <p className="supporting-text">
                Monthly cashflow comparison (excludes internal account transfers)
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Custom Clean Legend */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                  Income
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500 dark:bg-rose-400" />
                  Expenses
                </span>
              </div>

              <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5">
                {([3, 6, 12] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBarRangeMonths(m)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      barRangeMonths === m
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incomeVsExpenseData}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: chartTickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartTickColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0), currency),
                    String(name),
                  ]}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}
                />
                <Bar
                  dataKey="Income"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  animationDuration={500}
                />
                <Bar
                  dataKey="Expenses"
                  fill={chartExpenseColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B. Expense Breakdown Donut Chart with Center Total */}
        <div className="lg:col-span-5 data-surface p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="section-heading">Expense Breakdown</h3>
            <p className="supporting-text">
              Click any category slice or row to inspect transactions
            </p>
          </div>

          {categoryBreakdownData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                No expenses recorded for {formatMonthLabel(selectedMonth)}
              </p>
              <button
                type="button"
                onClick={() => openTransactionModal('expense')}
                className="mt-3 btn-primary px-3.5 py-1.5 text-xs"
              >
                Record First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Donut Chart with Centered Total */}
              <div className="relative h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke={pieSliceStroke}
                      strokeWidth={2}
                      animationDuration={500}
                      onClick={(entry) => {
                        const clickedName = entry?.name ? String(entry.name) : null;
                        setSelectedPieCategory((prev) =>
                          prev === clickedName ? null : clickedName
                        );
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {categoryBreakdownData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          opacity={
                            !selectedPieCategory || selectedPieCategory === entry.name ? 1 : 0.35
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Label Overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {selectedPieCategory ? selectedPieCategory : 'Total Spent'}
                  </span>
                  <span className="text-base font-semibold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                    {selectedPieCategory
                      ? formatCurrency(
                          categoryBreakdownData.find((c) => c.name === selectedPieCategory)
                            ?.value || 0,
                          currency
                        )
                      : formatCurrency(monthSummary.expenses, currency)}
                  </span>
                </div>
              </div>

              {/* Clean Category Legend Table */}
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/70 pr-1">
                {categoryBreakdownData.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() =>
                      setSelectedPieCategory((prev) => (prev === cat.name ? null : cat.name))
                    }
                    className={`w-full flex items-center justify-between py-1.5 px-2 text-left text-xs rounded-md transition-colors ${
                      selectedPieCategory === cat.name
                        ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-tabular shrink-0">
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {formatCurrency(cat.value, currency)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 w-11 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Drilldown Panel */}
      {selectedPieCategory && (
        <div className="data-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Category Drilldown: {selectedPieCategory} ({drilldownTransactions.length}{' '}
                transaction{drilldownTransactions.length === 1 ? '' : 's'})
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCategoryDrilldown(selectedPieCategory);
                  setActiveTab('transactions');
                }}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
              >
                Open in Transactions →
              </button>
              <button
                type="button"
                onClick={() => setSelectedPieCategory(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Clear category selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-4 font-medium">Date</th>
                  <th className="py-2 px-4 font-medium">Description</th>
                  <th className="py-2 px-4 font-medium">Method</th>
                  <th className="py-2 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {drilldownTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="py-2 px-4 font-mono-tabular text-slate-600 dark:text-slate-300">
                      {formatDateIN(tx.date)}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-900 dark:text-slate-100">{tx.description}</td>
                    <td className="py-2 px-4 text-slate-500 dark:text-slate-400">{tx.paymentMethod}</td>
                    <td className="py-2 px-4 font-mono-tabular font-medium text-rose-600 dark:text-rose-400 text-right">
                      -{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 2 of Charts: C. Monthly Spending Pace & D. Category Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* C. Monthly Spending Pace Line Chart */}
        <div className="lg:col-span-6 data-surface p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="section-heading">Monthly Spending Pace</h3>
              <p className="supporting-text">
                Cumulative spending: {formatShortMonthLabel(selectedMonth)} vs.{' '}
                {formatShortMonthLabel(prevMonth)}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {formatShortMonthLabel(selectedMonth)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                {formatShortMonthLabel(prevMonth)}
              </span>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingTrendData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartGridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: chartTickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartTickColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                />
                <Line
                  type="monotone"
                  dataKey="CurrentMonth"
                  name={formatShortMonthLabel(selectedMonth)}
                  stroke={chartExpenseColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartExpenseColor }}
                  animationDuration={500}
                />
                <Line
                  type="monotone"
                  dataKey="PreviousMonth"
                  name={formatShortMonthLabel(prevMonth)}
                  stroke={theme === 'dark' ? '#64748B' : '#94A3B8'}
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: theme === 'dark' ? '#64748B' : '#94A3B8' }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D. Category Budget Progress */}
        <div className="lg:col-span-6 data-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-heading">Budget Adherence</h3>
              <p className="supporting-text">
                Category spending limits for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 whitespace-nowrap shrink-0"
            >
              Manage Budgets →
            </button>
          </div>

          {categoryBudgets.length === 0 && !overallBudget ? (
            <div className="flex flex-col items-center justify-center h-52 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No budgets configured for {formatMonthLabel(selectedMonth)}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="mt-3 btn-primary px-3.5 py-1.5 text-xs"
              >
                Create Monthly Budget
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {[...(overallBudget ? [overallBudget] : []), ...categoryBudgets].map((b) => {
                const barWidth = Math.min(100, Math.max(0, b.percentUsed));
                const barColor =
                  b.status === 'exceeded'
                    ? 'bg-rose-500'
                    : b.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{b.categoryName}</span>
                        {b.status === 'exceeded' && (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                            <AlertOctagon className="h-3 w-3" /> Exceeded
                          </span>
                        )}
                        {b.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                            <AlertTriangle className="h-3 w-3" /> {b.percentUsed.toFixed(0)}%
                          </span>
                        )}
                        {b.status === 'normal' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="h-3 w-3" /> On Track
                          </span>
                        )}
                      </div>
                      <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                        {formatCurrency(b.spentAmount, currency)}{' '}
                        <span className="text-slate-400 dark:text-slate-500">/</span>{' '}
                        {formatCurrency(b.amount, currency)}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Savings Goals Progress & Financial Health / Net Worth / Obligations Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Savings Goals Progress (6 cols) */}
        <div className="lg:col-span-6 data-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-heading">Savings Goals Progress</h3>
              <p className="supporting-text">
                Active targets and recommended monthly contributions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('goals')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 whitespace-nowrap shrink-0"
            >
              Manage Goals →
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No savings goals created yet</p>
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className="mt-3 btn-primary px-3.5 py-1.5 text-xs"
              >
                Create First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
              {savingsGoals.map((goal) => {
                const m = computeSavingsGoalMetrics(goal);
                return (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{goal.name}</span>
                      <span className="font-mono-tabular text-slate-700 dark:text-slate-300">
                        {formatCurrency(goal.currentSavedAmount, currency)}{' '}
                        <span className="text-slate-400 dark:text-slate-500">/</span>{' '}
                        {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${m.completionPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                      <span>{m.completionPercent.toFixed(1)}% complete</span>
                      <span>
                        {m.isCompleted
                          ? 'Goal Achieved ✓'
                          : m.recommendedMonthlyContribution !== null
                          ? `Target: ${formatCurrency(m.recommendedMonthlyContribution, currency)}/mo`
                          : m.statusMessage}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Financial Health, Net Worth, Loans & Subscriptions Quick Cards (6 cols) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setActiveTab('health')}
            className="cursor-pointer data-surface p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="card-label">Financial Health Score</span>
              <HeartPulse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="metric-value text-slate-900 dark:text-white">
                {healthSnapshot.overallScore}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">/ 100</span>
              <span className="ml-auto rounded bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {healthSnapshot.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              6-factor wellness breakdown →
            </p>
          </div>

          <div
            onClick={() => setActiveTab('balancesheet')}
            className="cursor-pointer data-surface p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="card-label">Net Worth</span>
              <Scale className="h-4 w-4 text-slate-400" />
            </div>
            <div className="my-2">
              <p
                className={`metric-value ${
                  balanceSheetSnapshot.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(balanceSheetSnapshot.netWorth, currency)}
              </p>
              <p className="supporting-text font-mono-tabular mt-0.5">
                Assets: {formatCurrency(balanceSheetSnapshot.assets.totalAssets, currency)}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Balance sheet &amp; .xlsx export →
            </p>
          </div>

          <div
            onClick={() => setActiveTab('loans')}
            className="cursor-pointer data-surface p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="card-label">Active Debt &amp; Loans</span>
              <Landmark className="h-4 w-4 text-slate-400" />
            </div>
            <div className="my-2">
              <p className="metric-value text-rose-600 dark:text-rose-400">
                {formatCurrency(balanceSheetSnapshot.liabilities.totalLoans, currency)}
              </p>
              <p className="supporting-text mt-0.5">
                {loans.filter((l) => l.status === 'active').length} active loan/EMI schedule(s)
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Manage EMIs &amp; repayments →
            </p>
          </div>

          <div
            onClick={() => setActiveTab('subscriptions')}
            className="cursor-pointer data-surface p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="card-label">Recurring Subscriptions</span>
              <Repeat className="h-4 w-4 text-slate-400" />
            </div>
            <div className="my-2">
              <p className="metric-value text-slate-900 dark:text-slate-100">
                {formatCurrency(Math.round(activeMonthlySubscriptions), currency)}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/mo</span>
              </p>
              <p className="supporting-text font-mono-tabular mt-0.5">
                {formatCurrency(Math.round(activeMonthlySubscriptions * 12), currency)}/yr annualized
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Manage renewals →
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="data-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 px-5 py-3.5">
          <div>
            <h3 className="section-heading">Recent Transactions</h3>
            <p className="supporting-text">Latest recorded ledger activity</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCategoryDrilldown(null);
              setActiveTab('transactions');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 whitespace-nowrap shrink-0 transition-colors"
          >
            View All Transactions
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No transactions recorded yet</p>
            <p className="supporting-text mt-1">
              Add your first income or expense to populate your financial ledger.
            </p>
            <button
              type="button"
              onClick={() => openTransactionModal('expense')}
              className="mt-3 btn-primary px-3.5 py-1.5 text-xs"
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-5 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium">Category · Type</th>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium">Payment Method</th>
                  <th className="py-2.5 px-5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[13px]">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-2.5">
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : tx.type === 'transfer' ? (
                          <ArrowLeftRight className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">{tx.description}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <span>{tx.categoryName}</span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600"> · </span>
                      <span className="capitalize text-slate-500 dark:text-slate-400">{tx.type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                      {formatDateIN(tx.date)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500 dark:text-slate-400">{tx.paymentMethod}</td>
                    <td
                      className={`py-2.5 px-5 text-right font-mono-tabular font-medium ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'transfer'
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
