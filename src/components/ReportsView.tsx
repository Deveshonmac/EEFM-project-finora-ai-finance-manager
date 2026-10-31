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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useFinance } from '../context/FinanceContext';
import { ReportPeriod } from '../types/finance';
import {
  computeBudgetProgressList,
  computeMonthlySummary,
  formatCurrency,
  formatDateIN,
  formatMonthLabel,
  formatShortMonthLabel,
  getDateRangeForReportPeriod,
  getLastNMonths,
  getPreviousYearMonth,
} from '../utils/calculations';

const COLORS = [
  '#10B981',
  '#38BDF8',
  '#F59E0B',
  '#8B5CF6',
  '#F43F5E',
  '#2DD4BF',
  '#6366F1',
  '#94A3B8',
];

export const ReportsView: React.FC = () => {
  const { profile, transactions, budgets, selectedMonth, showToast, theme } = useFinance();

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
      borderRadius: '10px',
      border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
      color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
      fontSize: '12px',
      boxShadow: theme === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.45)' : '0 8px 24px rgba(15, 23, 42, 0.08)',
    }),
    [theme]
  );
  const chartGridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.18)';
  const chartTickColor = theme === 'dark' ? '#94A3B8' : '#64748B';
  const chartExpenseColor = theme === 'dark' ? '#F87171' : '#EF4444';
  const pieSliceStroke = theme === 'dark' ? 'rgba(14,21,37,0.9)' : '#FFFFFF';

  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [customStart, setCustomStart] = useState<string>(`${selectedMonth}-01`);
  const [customEnd, setCustomEnd] = useState<string>(`${selectedMonth}-28`);

  const currency = profile?.currency || 'INR';

  const rangeInfo = useMemo(
    () => getDateRangeForReportPeriod(period, selectedMonth, customStart, customEnd),
    [period, selectedMonth, customStart, customEnd]
  );

  const periodTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.date >= rangeInfo.startDate && tx.date <= rangeInfo.endDate
      ),
    [transactions, rangeInfo]
  );

  // 8 Analytical KPIs
  const analytics = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals = new Map<string, number>();
    let highestExpenseTx: { description: string; amount: number; date: string } | null = null;

    for (const tx of periodTransactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
        categoryTotals.set(
          tx.categoryName,
          (categoryTotals.get(tx.categoryName) || 0) + tx.amount
        );
        if (!highestExpenseTx || tx.amount > highestExpenseTx.amount) {
          highestExpenseTx = {
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
          };
        }
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : null;

    // Days in selected range
    const startMs = new Date(rangeInfo.startDate).getTime();
    const endMs = new Date(rangeInfo.endDate).getTime();
    const daySpan = Math.max(
      1,
      Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
    );
    const avgDailySpending = totalExpenses / daySpan;

    // Highest spending category
    let highestCategory: { name: string; amount: number } | null = null;
    for (const [name, amount] of categoryTotals.entries()) {
      if (!highestCategory || amount > highestCategory.amount) {
        highestCategory = { name, amount };
      }
    }

    // Month-over-Month expense change (for selectedMonth vs previous month)
    const prevYM = getPreviousYearMonth(selectedMonth);
    const currMonthSummary = computeMonthlySummary(transactions, selectedMonth);
    const prevMonthSummary = computeMonthlySummary(transactions, prevYM);
    const momChangePct =
      prevMonthSummary.expenses > 0
        ? ((currMonthSummary.expenses - prevMonthSummary.expenses) /
            prevMonthSummary.expenses) *
          100
        : null;

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      avgDailySpending,
      highestCategory,
      highestExpenseTx,
      momChangePct,
      categoryTotals,
    };
  }, [periodTransactions, rangeInfo, selectedMonth, transactions]);

  // Chart 1: Category Breakdown
  const categoryChartData = useMemo(() => {
    return Array.from(analytics.categoryTotals.entries())
      .map(([name, value], idx) => ({
        name,
        value,
        percentage:
          analytics.totalExpenses > 0 ? (value / analytics.totalExpenses) * 100 : 0,
        color: COLORS[idx % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  // Chart 2 & 5: 6-Month Income vs Expenses & Savings Trend
  const sixMonthSeries = useMemo(() => {
    const months = getLastNMonths(selectedMonth, 6);
    return months.map((ym) => {
      const s = computeMonthlySummary(transactions, ym);
      return {
        month: formatShortMonthLabel(ym),
        Income: s.income,
        Expenses: s.expenses,
        NetSavings: s.netSavings,
        SavingsRate: Number(s.savingsRate.toFixed(1)),
      };
    });
  }, [transactions, selectedMonth]);

  // Chart 3: Expense Trend Over Time (within selected period)
  const expenseTimelineData = useMemo(() => {
    const map = new Map<string, number>();
    const expenses = periodTransactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const tx of expenses) {
      map.set(tx.date, (map.get(tx.date) || 0) + tx.amount);
    }
    return Array.from(map.entries()).map(([date, amount]) => ({
      date: formatDateIN(date),
      Expenses: amount,
    }));
  }, [periodTransactions]);

  // Chart 4: Budget vs Actual Spending
  const budgetVsActualData = useMemo(() => {
    const { categoryBudgets } = computeBudgetProgressList(
      budgets,
      transactions,
      selectedMonth,
      profile?.monthlyBudget || 0
    );
    return categoryBudgets.map((b) => ({
      category: b.categoryName,
      Budget: b.amount,
      Actual: b.spentAmount,
    }));
  }, [budgets, transactions, selectedMonth, profile?.monthlyBudget]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Description',
      'Category',
      'Amount',
      'PaymentMethod',
      'Notes',
      'Tags',
    ];
    const escapeCSV = (val: string | number) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = periodTransactions.map((tx) =>
      [
        tx.date,
        tx.type,
        tx.description,
        tx.categoryName,
        tx.amount,
        tx.paymentMethod,
        tx.notes || '',
        (tx.tags || []).join('; '),
      ]
        .map(escapeCSV)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Finora_Transactions_${rangeInfo.startDate}_to_${rangeInfo.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV report downloaded.');
  };

  // Export PDF Financial Summary
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Finora — Personal Finance Summary Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Account Holder: ${profile?.displayName || 'User'} (${profile?.email || ''})`, 14, 28);
    doc.text(`Reporting Period: ${rangeInfo.label} (${rangeInfo.startDate} to ${rangeInfo.endDate})`, 14, 34);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 40);

    doc.setDrawColor(200);
    doc.line(14, 44, 196, 44);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Executive Financial Metrics (INR)', 14, 53);

    doc.setFontSize(10);
    const fmtPDF = (n: number) => `INR ${Math.round(n).toLocaleString('en-IN')}`;
    doc.text(`Total Income: ${fmtPDF(analytics.totalIncome)}`, 18, 61);
    doc.text(`Total Expenses: ${fmtPDF(analytics.totalExpenses)}`, 18, 67);
    doc.text(`Net Savings (Income - Expenses): ${fmtPDF(analytics.netSavings)}`, 18, 73);
    doc.text(
      `Savings Rate: ${
        analytics.savingsRate !== null ? `${analytics.savingsRate.toFixed(1)}%` : 'N/A (Zero Income)'
      }`,
      18,
      79
    );
    doc.text(`Average Daily Spending: ${fmtPDF(analytics.avgDailySpending)}`, 18, 85);
    doc.text(
      `Highest Spending Category: ${
        analytics.highestCategory
          ? `${analytics.highestCategory.name} (${fmtPDF(analytics.highestCategory.amount)})`
          : 'None'
      }`,
      18,
      91
    );

    doc.setFontSize(12);
    doc.text('2. Category-Wise Expense Breakdown', 14, 104);
    doc.setFontSize(9.5);
    let y = 112;
    if (categoryChartData.length === 0) {
      doc.text('No expenses recorded in this period.', 18, y);
      y += 8;
    } else {
      for (const c of categoryChartData) {
        doc.text(
          `• ${c.name}: ${fmtPDF(c.value)} (${c.percentage.toFixed(1)}%)`,
          18,
          y
        );
        y += 6;
      }
    }

    y += 6;
    doc.setFontSize(12);
    doc.text('3. Transaction Ledger (Top 20 in Period)', 14, y);
    y += 8;
    doc.setFontSize(8.5);
    for (const tx of periodTransactions.slice(0, 20)) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${tx.date} | ${tx.type.toUpperCase()} | ${fmtPDF(tx.amount)} | ${tx.categoryName} | ${tx.description.slice(
          0,
          45
        )}`,
        16,
        y
      );
      y += 5.5;
    }

    doc.save(`Finora_Summary_${rangeInfo.startDate}_to_${rangeInfo.endDate}.pdf`);
    showToast('PDF Financial Summary downloaded.');
  };

  return (
    <div className="space-y-5">
      {/* Compact Header & Period Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="supporting-text mt-0.5">
            Showing verified financial records for: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">{rangeInfo.label}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-1">
            {(
              [
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'last_3_months', label: 'Last 3M' },
                { id: 'last_6_months', label: 'Last 6M' },
                { id: 'this_year', label: 'This Year' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  period === opt.id
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg glass-button-secondary px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            Download PDF Summary
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 data-surface p-4 text-xs border border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-900 dark:text-white">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg glass-input px-2.5 py-1.5 font-mono-tabular"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg glass-input px-2.5 py-1.5 font-mono-tabular"
            />
          </div>
        </div>
      )}

      {/* 8 Analytical KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Income</p>
          <p className="mt-2 metric-value text-emerald-600 dark:text-emerald-400">
            {formatCurrency(analytics.totalIncome, currency)}
          </p>
          <p className="mt-1.5 supporting-text">In selected period</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Expenses</p>
          <p className="mt-2 metric-value text-rose-600 dark:text-rose-400">
            {formatCurrency(analytics.totalExpenses, currency)}
          </p>
          <p className="mt-1.5 supporting-text">In selected period</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Net Savings</p>
          <p
            className={`mt-2 metric-value ${
              analytics.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(analytics.netSavings, currency)}
          </p>
          <p className="mt-1.5 supporting-text">Total Income − Total Expenses</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Savings Rate</p>
          <p className="mt-2 metric-value text-slate-900 dark:text-white">
            {analytics.savingsRate !== null
              ? `${analytics.savingsRate.toFixed(1)}%`
              : 'N/A'}
          </p>
          <p className="mt-1.5 supporting-text">(Net Savings / Total Income) × 100</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Average Daily Spending</p>
          <p className="mt-2 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {formatCurrency(Math.round(analytics.avgDailySpending), currency)}
          </p>
          <p className="mt-1.5 supporting-text">Per calendar day in range</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Highest Spending Category</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white truncate">
            {analytics.highestCategory ? analytics.highestCategory.name : 'No Expenses'}
          </p>
          <p className="mt-1.5 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {analytics.highestCategory
              ? formatCurrency(analytics.highestCategory.amount, currency)
              : '—'}
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Highest Expense Transaction</p>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate">
            {analytics.highestExpenseTx ? analytics.highestExpenseTx.description : 'No Expenses'}
          </p>
          <p className="mt-1.5 text-xs font-mono-tabular text-rose-600 dark:text-rose-400 font-semibold">
            {analytics.highestExpenseTx
              ? `${formatCurrency(analytics.highestExpenseTx.amount, currency)} · ${formatDateIN(
                  analytics.highestExpenseTx.date
                )}`
              : '—'}
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Month-over-Month Expense Change</p>
          <p
            className={`mt-2 text-xl font-bold font-mono-tabular ${
              analytics.momChangePct === null
                ? 'text-slate-400'
                : analytics.momChangePct <= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {analytics.momChangePct !== null
              ? `${analytics.momChangePct >= 0 ? '+' : ''}${analytics.momChangePct.toFixed(1)}%`
              : 'No Prior Data'}
          </p>
          <p className="mt-1.5 supporting-text">
            {formatShortMonthLabel(selectedMonth)} vs.{' '}
            {formatShortMonthLabel(getPreviousYearMonth(selectedMonth))}
          </p>
        </div>
      </div>

      {/* Visualizations Row 1: Category Breakdown & Monthly Income vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 data-surface p-5 flex flex-col justify-between">
          <div>
            <h3 className="section-heading">
              Category-Wise Expense Breakdown
            </h3>
            <p className="supporting-text mb-3">{rangeInfo.label}</p>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-xs text-slate-500 dark:text-slate-400">
              No expense records in this period.
            </div>
          ) : (
            <div className="relative h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke={pieSliceStroke}
                  >
                    {categoryChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(Number(val ?? 0), currency)}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: chartTickColor }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Total Spent inside Donut */}
              <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">
                  Total Spent
                </span>
                <span className="text-sm font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(analytics.totalExpenses, currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 data-surface p-5 flex flex-col justify-between">
          <div>
            <h3 className="section-heading">
              Monthly Income vs. Expenses (6-Month Trend)
            </h3>
            <p className="supporting-text mb-3">Historical cashflow comparison</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
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
                  formatter={(val) => formatCurrency(Number(val ?? 0), currency)}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                  cursor={{ fill: theme === 'dark' ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: chartTickColor }} />
                <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill={chartExpenseColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visualizations Row 2: Budget vs Actual & Net Savings Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-6 data-surface p-5 flex flex-col justify-between">
          <div>
            <h3 className="section-heading">
              Budget vs. Actual Spending ({formatMonthLabel(selectedMonth)})
            </h3>
            <p className="supporting-text mb-3">
              Configured category budgets compared with actual expenses
            </p>
          </div>
          {budgetVsActualData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-xs text-slate-500 dark:text-slate-400">
              No category budgets configured for {formatMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: chartTickColor }}
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
                    formatter={(val) => formatCurrency(Number(val ?? 0), currency)}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                    cursor={{ fill: theme === 'dark' ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: chartTickColor }} />
                  <Bar dataKey="Budget" fill={theme === 'dark' ? '#64748B' : '#94A3B8'} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="Actual" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 data-surface p-5 flex flex-col justify-between">
          <div>
            <h3 className="section-heading">
              Net Savings & Expense Trend Over Time
            </h3>
            <p className="supporting-text mb-3">
              6-month net savings progression ({expenseTimelineData.length} active expense dates in period)
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sixMonthSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
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
                  formatter={(val) => formatCurrency(Number(val ?? 0), currency)}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: chartTickColor }} />
                <Line
                  type="monotone"
                  dataKey="NetSavings"
                  name="Net Savings"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10B981' }}
                />
                <Line
                  type="monotone"
                  dataKey="Expenses"
                  name="Monthly Expenses"
                  stroke={chartExpenseColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: chartExpenseColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
