import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeBudgetProgressList,
  computeMonthlySummary,
  computeTotalBalance,
  filterTransactionsByMonth,
  formatCurrency,
  formatDateIN,
  formatMonthLabel,
  formatShortMonthLabel,
  getLastNMonths,
  getPreviousYearMonth,
} from '../utils/calculations';

const CHART_COLORS = [
  '#0F766E', // Teal 700
  '#0284C7', // Sky 600
  '#D97706', // Amber 600
  '#4F46E5', // Indigo 600
  '#E11D48', // Rose 600
  '#16A34A', // Green 600
  '#7C3AED', // Violet 600
  '#64748B', // Slate 500
];

export const DashboardView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    budgets,
    selectedMonth,
    openTransactionModal,
    setActiveTab,
    setCategoryDrilldown,
  } = useFinance();

  const [barRangeMonths, setBarRangeMonths] = useState<3 | 6 | 12>(6);
  const [selectedPieCategory, setSelectedPieCategory] = useState<string | null>(null);

  const currency = profile?.currency || 'INR';

  // 1. Summary Card Calculations
  const totalBalance = useMemo(
    () => computeTotalBalance(accounts, transactions),
    [accounts, transactions]
  );

  const monthSummary = useMemo(
    () => computeMonthlySummary(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

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
  const prevMonth = useMemo(() => getPreviousYearMonth(selectedMonth), [selectedMonth]);

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
    <div className="space-y-6">
      {/* Quick Actions Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Financial Overview · {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-500">
            All figures calculated directly from your recorded accounts and transactions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openTransactionModal('income')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Income
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('expense')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Expense
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('transfer')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Transfer Money
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            Create Budget
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Target className="h-3.5 w-3.5" />
            Create Savings Goal
          </button>
        </div>
      </div>

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Balance</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
            {accounts.length === 0 && transactions.length === 0
              ? '—'
              : formatCurrency(totalBalance, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Across {accounts.length} active account{accounts.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* 2. Total Income This Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Income This Month</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-emerald-700">
            {formatCurrency(monthSummary.income, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {formatMonthLabel(selectedMonth)} inflows
          </p>
        </div>

        {/* 3. Total Expenses This Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Expenses This Month</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-rose-700">
            {formatCurrency(monthSummary.expenses, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {monthExpenseTransactions.length} expense record
            {monthExpenseTransactions.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* 4. Net Savings This Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Net Savings This Month</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono-tabular ${
              monthSummary.netSavings >= 0 ? 'text-teal-700' : 'text-rose-700'
            }`}
          >
            {formatCurrency(monthSummary.netSavings, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Income − Expenses ({monthSummary.savingsRate.toFixed(1)}% rate)
          </p>
        </div>

        {/* 5. Monthly Budget Remaining */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Monthly Budget Remaining</p>
          {overallBudget ? (
            <>
              <p
                className={`mt-2 text-2xl font-bold font-mono-tabular ${
                  overallBudget.remainingAmount < 0
                    ? 'text-rose-700'
                    : overallBudget.status === 'warning'
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {formatCurrency(overallBudget.remainingAmount, currency)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                {overallBudget.percentUsed.toFixed(1)}% of{' '}
                {formatCurrency(overallBudget.amount, currency)} used
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-slate-400">Not Configured</p>
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="mt-1.5 text-xs font-semibold text-teal-700 hover:underline"
              >
                Set Monthly Budget →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 1 of Charts: A. Income vs Expenses & B. Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* A. Income vs Expenses Bar Chart */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Income vs. Expenses</h3>
              <p className="text-xs text-slate-500">
                Monthly cashflow comparison (excludes internal account transfers)
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {([3, 6, 12] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBarRangeMonths(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    barRangeMonths === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#0F766E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#E11D48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B. Expense Breakdown Donut Chart */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-slate-900">Expense Breakdown</h3>
            <p className="text-xs text-slate-500">
              Click any category slice or row to inspect its transactions
            </p>
          </div>

          {categoryBreakdownData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-sm font-medium text-slate-600">
                No expenses recorded for {formatMonthLabel(selectedMonth)}
              </p>
              <button
                type="button"
                onClick={() => openTransactionModal('expense')}
                className="mt-3 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Record First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
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
                            !selectedPieCategory || selectedPieCategory === entry.name ? 1 : 0.4
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown List */}
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                {categoryBreakdownData.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() =>
                      setSelectedPieCategory((prev) => (prev === cat.name ? null : cat.name))
                    }
                    className={`w-full flex items-center justify-between py-2 px-2 text-left text-xs rounded-md transition-colors ${
                      selectedPieCategory === cat.name ? 'bg-teal-50 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate text-slate-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-tabular shrink-0">
                      <span className="text-slate-900 font-medium">
                        {formatCurrency(cat.value, currency)}
                      </span>
                      <span className="text-slate-500 w-12 text-right">
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

      {/* Category Drilldown Panel (when a category is clicked on the Donut chart) */}
      {selectedPieCategory && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-teal-700" />
              <h4 className="text-sm font-semibold text-slate-900">
                Category Drilldown: {selectedPieCategory} ({drilldownTransactions.length}{' '}
                transaction{drilldownTransactions.length === 1 ? '' : 's'} in{' '}
                {formatMonthLabel(selectedMonth)})
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCategoryDrilldown(selectedPieCategory);
                  setActiveTab('transactions');
                }}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Open in Transactions →
              </button>
              <button
                type="button"
                onClick={() => setSelectedPieCategory(null)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-200/60"
                aria-label="Clear category selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium">Method</th>
                  <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {drilldownTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                      {formatDateIN(tx.date)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{tx.description}</td>
                    <td className="py-2.5 px-4 text-slate-600">{tx.paymentMethod}</td>
                    <td className="py-2.5 px-4 font-mono-tabular font-semibold text-rose-700 text-right">
                      -{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 2 of Charts: C. Monthly Spending Trend & D. Budget Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* C. Monthly Spending Trend Line Chart */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Monthly Spending Trend</h3>
            <p className="text-xs text-slate-500">
              Cumulative spending pace: {formatMonthLabel(selectedMonth)} vs.{' '}
              {formatMonthLabel(prevMonth)}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="CurrentMonth"
                  name={formatShortMonthLabel(selectedMonth)}
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="PreviousMonth"
                  name={formatShortMonthLabel(prevMonth)}
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* D. Category Budget Progress */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Budget Progress</h3>
              <p className="text-xs text-slate-500">
                Category limits and remaining balances for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-semibold text-teal-700 hover:underline whitespace-nowrap shrink-0"
            >
              Manage Budgets →
            </button>
          </div>

          {categoryBudgets.length === 0 && !overallBudget ? (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <p className="text-sm font-medium text-slate-600">
                No budgets configured for {formatMonthLabel(selectedMonth)}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('budgets')}
                className="mt-3 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Create Monthly Budget
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {[...(overallBudget ? [overallBudget] : []), ...categoryBudgets].map((b) => {
                const barWidth = Math.min(100, Math.max(0, b.percentUsed));
                const barColor =
                  b.status === 'exceeded'
                    ? 'bg-rose-600'
                    : b.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-teal-700';

                return (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{b.categoryName}</span>
                        {b.status === 'exceeded' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <AlertOctagon className="h-3.5 w-3.5" /> Exceeded
                          </span>
                        )}
                        {b.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> Near Limit (
                            {b.percentUsed.toFixed(0)}%)
                          </span>
                        )}
                        {b.status === 'normal' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                          </span>
                        )}
                      </div>
                      <span className="font-mono-tabular text-slate-600">
                        {formatCurrency(b.spentAmount, currency)} /{' '}
                        {formatCurrency(b.amount, currency)}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-tabular">
                      <span>{b.percentUsed.toFixed(1)}% consumed</span>
                      <span>
                        {b.remainingAmount >= 0
                          ? `${formatCurrency(b.remainingAmount, currency)} remaining`
                          : `${formatCurrency(Math.abs(b.remainingAmount), currency)} over budget`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Latest recorded financial activity</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCategoryDrilldown(null);
              setActiveTab('transactions');
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap shrink-0"
          >
            View All Transactions
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No transactions recorded yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Add your first income or expense to populate your financial ledger.
            </p>
            <button
              type="button"
              onClick={() => openTransactionModal('expense')}
              className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                  <th className="py-3 px-6 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium">Category · Type</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Payment Method</th>
                  <th className="py-3 px-6 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2.5">
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : tx.type === 'transfer' ? (
                          <ArrowLeftRight className="h-4 w-4 text-teal-600 shrink-0" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-medium text-slate-900">{tx.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span>{tx.categoryName}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="capitalize">{tx.type}</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-tabular text-slate-600">
                      {formatDateIN(tx.date)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{tx.paymentMethod}</td>
                    <td
                      className={`py-3 px-6 text-right font-mono-tabular font-semibold ${
                        tx.type === 'income'
                          ? 'text-emerald-700'
                          : tx.type === 'transfer'
                          ? 'text-slate-700'
                          : 'text-rose-700'
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
