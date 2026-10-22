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
  '#0F766E',
  '#0284C7',
  '#D97706',
  '#4F46E5',
  '#E11D48',
  '#16A34A',
  '#7C3AED',
  '#64748B',
];

export const ReportsView: React.FC = () => {
  const { profile, transactions, budgets, selectedMonth, showToast } = useFinance();

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
    <div className="space-y-6">
      {/* Header & Period Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">
            Showing authorized records for: <strong className="text-slate-800">{rangeInfo.label}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
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
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  period === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            Download PDF Summary
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <span className="font-semibold text-slate-700">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono-tabular"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono-tabular"
            />
          </div>
        </div>
      )}

      {/* 8 Analytical KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Income</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-emerald-700">
            {formatCurrency(analytics.totalIncome, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">In selected period</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-rose-700">
            {formatCurrency(analytics.totalExpenses, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">In selected period</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Net Savings</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono-tabular ${
              analytics.netSavings >= 0 ? 'text-teal-700' : 'text-rose-700'
            }`}
          >
            {formatCurrency(analytics.netSavings, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Income − Total Expenses</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Savings Rate</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
            {analytics.savingsRate !== null
              ? `${analytics.savingsRate.toFixed(1)}%`
              : 'N/A (No Income)'}
          </p>
          <p className="mt-1 text-xs text-slate-500">(Net Savings / Total Income) × 100</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Average Daily Spending</p>
          <p className="mt-2 text-xl font-bold font-mono-tabular text-slate-900">
            {formatCurrency(Math.round(analytics.avgDailySpending), currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Per calendar day in range</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Highest Spending Category</p>
          <p className="mt-2 text-lg font-bold text-slate-900 truncate">
            {analytics.highestCategory ? analytics.highestCategory.name : 'No Expenses'}
          </p>
          <p className="mt-1 text-xs font-mono-tabular text-slate-500">
            {analytics.highestCategory
              ? formatCurrency(analytics.highestCategory.amount, currency)
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Highest Expense Transaction</p>
          <p className="mt-2 text-sm font-bold text-slate-900 truncate">
            {analytics.highestExpenseTx ? analytics.highestExpenseTx.description : 'No Expenses'}
          </p>
          <p className="mt-1 text-xs font-mono-tabular text-rose-700 font-semibold">
            {analytics.highestExpenseTx
              ? `${formatCurrency(analytics.highestExpenseTx.amount, currency)} · ${formatDateIN(
                  analytics.highestExpenseTx.date
                )}`
              : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Month-over-Month Expense Change</p>
          <p
            className={`mt-2 text-xl font-bold font-mono-tabular ${
              analytics.momChangePct === null
                ? 'text-slate-400'
                : analytics.momChangePct <= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {analytics.momChangePct !== null
              ? `${analytics.momChangePct >= 0 ? '+' : ''}${analytics.momChangePct.toFixed(1)}%`
              : 'No Prior Data'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatShortMonthLabel(selectedMonth)} vs.{' '}
            {formatShortMonthLabel(getPreviousYearMonth(selectedMonth))}
          </p>
        </div>
      </div>

      {/* Visualizations Row 1: Category Breakdown & Monthly Income vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Category-Wise Expense Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-4">{rangeInfo.label}</p>

          {categoryChartData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-xs text-slate-500">
              No expense records in this period.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {categoryChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(Number(val ?? 0), currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Monthly Income vs. Expenses (6-Month Trend)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Historical cashflow comparison</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0), currency)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Income" fill="#0F766E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#E11D48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visualizations Row 2: Budget vs Actual & Net Savings Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Budget vs. Actual Spending ({formatMonthLabel(selectedMonth)})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Configured category budgets compared with actual expenses
          </p>
          {budgetVsActualData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-xs text-slate-500">
              No category budgets configured for {formatMonthLabel(selectedMonth)}.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0), currency)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Budget" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Net Savings & Expense Trend Over Time
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            6-month net savings progression ({expenseTimelineData.length} active expense dates in period)
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sixMonthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip formatter={(val) => formatCurrency(Number(val ?? 0), currency)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="NetSavings"
                  name="Net Savings"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Expenses"
                  name="Monthly Expenses"
                  stroke="#E11D48"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
