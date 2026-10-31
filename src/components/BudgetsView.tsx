import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { Budget } from '../types/finance';
import {
  computeBudgetProgressList,
  computeMonthlySummary,
  filterTransactionsByMonth,
  formatCurrency,
  formatMonthLabel,
  formatShortMonthLabel,
  getLastNMonths,
  getPreviousYearMonth,
} from '../utils/calculations';

export const BudgetsView: React.FC = () => {
  const {
    profile,
    categories,
    transactions,
    budgets,
    selectedMonth,
    setSelectedMonth,
    addBudget,
    updateBudget,
    deleteBudget,
    theme,
  } = useFinance();

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

  const currency = profile?.currency || 'INR';
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.transactionType === 'expense'),
    [categories]
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  const [budgetScope, setBudgetScope] = useState<'OVERALL' | 'CATEGORY'>('CATEGORY');
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [budgetMonth, setBudgetMonth] = useState<string>(selectedMonth);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

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

  const monthSummary = useMemo(
    () => computeMonthlySummary(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  // Total budget is Overall Monthly Budget if configured, else sum of category budgets
  // Total spent is strictly the actual monthly expenses (never double-counted!)
  const effectiveTotalBudget = useMemo(() => {
    if (overallBudget && overallBudget.amount > 0) return overallBudget.amount;
    return categoryBudgets.reduce((s, b) => s + b.amount, 0);
  }, [overallBudget, categoryBudgets]);

  const totalSpent = monthSummary.expenses;
  const totalRemaining = effectiveTotalBudget - totalSpent;
  const totalPercentConsumed =
    effectiveTotalBudget > 0 ? (totalSpent / effectiveTotalBudget) * 100 : 0;

  // Multi-month comparison data
  const prevMonth = useMemo(() => getPreviousYearMonth(selectedMonth), [selectedMonth]);
  const monthComparisonData = useMemo(() => {
    const currExp = filterTransactionsByMonth(transactions, selectedMonth).filter(
      (t) => t.type === 'expense'
    );
    const prevExp = filterTransactionsByMonth(transactions, prevMonth).filter(
      (t) => t.type === 'expense'
    );

    return expenseCategories
      .map((cat) => {
        const currSpent = currExp
          .filter(
            (t) =>
              t.categoryId === cat.id ||
              t.categoryName.toLowerCase() === cat.name.toLowerCase()
          )
          .reduce((s, t) => s + t.amount, 0);
        const prevSpent = prevExp
          .filter(
            (t) =>
              t.categoryId === cat.id ||
              t.categoryName.toLowerCase() === cat.name.toLowerCase()
          )
          .reduce((s, t) => s + t.amount, 0);
        const catBudget =
          categoryBudgets.find(
            (b) =>
              b.categoryId === cat.id ||
              b.categoryName.toLowerCase() === cat.name.toLowerCase()
          )?.amount || 0;

        return {
          category: cat.name,
          CurrentMonth: currSpent,
          PreviousMonth: prevSpent,
          BudgetLimit: catBudget,
        };
      })
      .filter((d) => d.CurrentMonth > 0 || d.PreviousMonth > 0 || d.BudgetLimit > 0);
  }, [transactions, selectedMonth, prevMonth, expenseCategories, categoryBudgets]);

  const openCreateModal = (scope: 'OVERALL' | 'CATEGORY' = 'CATEGORY') => {
    setEditingBudget(null);
    setBudgetScope(scope);
    setBudgetMonth(selectedMonth);
    setError(null);
    if (scope === 'OVERALL') {
      setName('Monthly Spending Budget');
      setAmount(String(overallBudget?.amount || profile?.monthlyBudget || 10000));
      setCategoryId('OVERALL');
      setDescription('Overall monthly spending limit');
    } else {
      const firstCat = expenseCategories[0];
      setName(firstCat ? `${firstCat.name} Budget` : 'Category Budget');
      setAmount('');
      setCategoryId(firstCat?.id || '');
      setDescription('');
    }
    setModalOpen(true);
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setBudgetScope(b.categoryId === 'OVERALL' ? 'OVERALL' : 'CATEGORY');
    setName(b.name);
    setAmount(String(b.amount));
    setCategoryId(b.categoryId);
    setBudgetMonth(b.budgetMonth);
    setDescription(b.description || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const numAmt = Number(amount);
    if (!amount || isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid positive budget amount.');
      return;
    }

    const isOverall = budgetScope === 'OVERALL';
    const selectedCat = expenseCategories.find((c) => c.id === categoryId);
    const resolvedCategoryName = isOverall
      ? 'Overall Monthly Budget'
      : selectedCat?.name || 'Category Budget';
    const resolvedName =
      name.trim() || (isOverall ? 'Monthly Spending Budget' : `${resolvedCategoryName} Budget`);

    setSubmitting(true);
    try {
      const payload = {
        name: resolvedName,
        amount: numAmt,
        categoryId: isOverall ? 'OVERALL' : selectedCat?.id || categoryId,
        categoryName: resolvedCategoryName,
        periodStart: `${budgetMonth}-01`,
        periodEnd: `${budgetMonth}-31`,
        budgetMonth,
        description: description.trim(),
      };

      if (editingBudget && !editingBudget.id.startsWith('overall_')) {
        await updateBudget(editingBudget.id, payload);
      } else {
        await addBudget(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableMonths = useMemo(() => getLastNMonths(selectedMonth, 6), [selectedMonth]);

  return (
    <div className="space-y-5">
      {/* Compact Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">
            Budgets · {formatMonthLabel(selectedMonth)}
          </h1>
          <p className="supporting-text mt-0.5">
            Track overall monthly limits and category-specific budgets without double-counting expenses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Historical Month Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-1">
            {availableMonths.map((ym) => (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedMonth === ym
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {formatShortMonthLabel(ym)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('OVERALL')}
            className="rounded-lg glass-button-secondary px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            Set Overall Budget
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('CATEGORY')}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category Budget
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Monthly Budget</p>
          <p className="mt-2 metric-value text-slate-900 dark:text-white">
            {effectiveTotalBudget > 0 ? formatCurrency(effectiveTotalBudget, currency) : 'Not Set'}
          </p>
          <p className="mt-1.5 supporting-text">
            {overallBudget ? 'Overall Monthly Limit' : 'Sum of Category Budgets'}
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Spent ({formatShortMonthLabel(selectedMonth)})</p>
          <p className="mt-2 metric-value text-rose-600 dark:text-rose-400">
            {formatCurrency(totalSpent, currency)}
          </p>
          <p className="mt-1.5 supporting-text">Actual eligible monthly expenses</p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Amount Remaining</p>
          <p
            className={`mt-2 metric-value ${
              totalRemaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {effectiveTotalBudget > 0 ? formatCurrency(totalRemaining, currency) : '—'}
          </p>
          <p className="mt-1.5 supporting-text">
            {totalRemaining < 0 ? 'Over monthly budget' : 'Available to spend'}
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Percentage Consumed</p>
          <p
            className={`mt-2 metric-value ${
              totalPercentConsumed >= 100
                ? 'text-rose-600 dark:text-rose-400'
                : totalPercentConsumed >= 80
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {effectiveTotalBudget > 0 ? `${totalPercentConsumed.toFixed(1)}%` : '0.0%'}
          </p>
          <p className="mt-1.5 supporting-text">
            {totalPercentConsumed >= 100
              ? 'Status: Exceeded (≥100%)'
              : totalPercentConsumed >= 80
              ? 'Status: Warning (80%–99%)'
              : 'Status: Normal (<80%)'}
          </p>
        </div>
      </div>

      {/* Overall Monthly Budget Card */}
      {overallBudget && (
        <div className="data-surface p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="section-heading">{overallBudget.name}</h3>
                {overallBudget.status === 'exceeded' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <AlertOctagon className="h-3.5 w-3.5" /> Exceeded
                  </span>
                ) : overallBudget.status === 'warning' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Warning (80%+)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                  </span>
                )}
              </div>
              <p className="supporting-text mt-0.5">
                {overallBudget.description || 'Overall monthly spending limit across all categories'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(overallBudget)}
                className="inline-flex items-center gap-1 rounded-lg glass-button-secondary px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Limit
              </button>
              {!overallBudget.id.startsWith('overall_') && (
                <button
                  type="button"
                  onClick={() => setDeletingBudget(overallBudget)}
                  className="rounded-lg glass-button-secondary p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Delete Budget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallBudget.status === 'exceeded'
                  ? 'bg-rose-500'
                  : overallBudget.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallBudget.percentUsed)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
            <span>
              Spent: <strong className="text-slate-900 dark:text-white">{formatCurrency(overallBudget.spentAmount, currency)}</strong> of{' '}
              {formatCurrency(overallBudget.amount, currency)} ({overallBudget.percentUsed.toFixed(1)}%)
            </span>
            <span>
              {overallBudget.remainingAmount >= 0
                ? `Remaining: ${formatCurrency(overallBudget.remainingAmount, currency)}`
                : `Exceeded by: ${formatCurrency(Math.abs(overallBudget.remainingAmount), currency)}`}
            </span>
          </div>
        </div>
      )}

      {/* Category Budgets Grid */}
      <div className="space-y-3">
        <h3 className="section-heading">
          Category-Specific Budgets ({categoryBudgets.length})
        </h3>

        {categoryBudgets.length === 0 ? (
          <div className="data-surface p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No category budgets configured for {formatMonthLabel(selectedMonth)}
            </p>
            <p className="supporting-text">
              Set limits for Food & Dining, Shopping, Travel, or Entertainment to receive 80% warning alerts.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal('CATEGORY')}
              className="rounded-lg btn-primary px-4 py-2 text-xs font-medium"
            >
              Create First Category Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map((b) => {
              const barColor =
                b.status === 'exceeded'
                  ? 'bg-rose-500'
                  : b.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div
                  key={b.id}
                  className="data-surface p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{b.categoryName}</h4>
                      <p className="supporting-text mt-0.5">{b.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Edit Budget"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBudget(b)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Delete Budget"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between font-mono-tabular">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(b.spentAmount, currency)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        of {formatCurrency(b.amount, currency)}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          b.status === 'exceeded'
                            ? 'text-rose-600 dark:text-rose-400'
                            : b.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {b.status === 'exceeded' ? (
                          <>
                            <AlertOctagon className="h-3.5 w-3.5" /> Exceeded ({b.percentUsed.toFixed(0)}%)
                          </>
                        ) : b.status === 'warning' ? (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5" /> Warning ({b.percentUsed.toFixed(0)}%)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Normal ({b.percentUsed.toFixed(0)}%)
                          </>
                        )}
                      </span>

                      <span className="font-mono-tabular text-slate-600 dark:text-slate-300">
                        {b.remainingAmount >= 0
                          ? `${formatCurrency(b.remainingAmount, currency)} left`
                          : `${formatCurrency(Math.abs(b.remainingAmount), currency)} over`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross-Month Category Spending Comparison */}
      <div className="data-surface p-5 space-y-4">
        <div>
          <h3 className="section-heading">
            Cross-Month Spending & Budget Comparison
          </h3>
          <p className="supporting-text">
            Compare category spending in {formatMonthLabel(selectedMonth)} against{' '}
            {formatMonthLabel(prevMonth)} and configured limits
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthComparisonData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }} barGap={6}>
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
                formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                contentStyle={tooltipStyle}
                itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#172033' }}
                cursor={{ fill: theme === 'dark' ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: chartTickColor }} />
              <Bar
                dataKey="CurrentMonth"
                name={formatShortMonthLabel(selectedMonth)}
                fill={theme === 'dark' ? '#F87171' : '#EF4444'}
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="PreviousMonth"
                name={formatShortMonthLabel(prevMonth)}
                fill={theme === 'dark' ? '#64748B' : '#94A3B8'}
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="BudgetLimit"
                name="Budget Limit"
                fill={theme === 'dark' ? '#10B981' : '#059669'}
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add / Edit Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingBudget && (
                <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetScope('CATEGORY');
                      const firstCat = expenseCategories[0];
                      setCategoryId(firstCat?.id || '');
                      setName(firstCat ? `${firstCat.name} Budget` : 'Category Budget');
                    }}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      budgetScope === 'CATEGORY'
                        ? 'bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-emerald-400/35'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Category Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetScope('OVERALL');
                      setCategoryId('OVERALL');
                      setName('Monthly Spending Budget');
                    }}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      budgetScope === 'OVERALL'
                        ? 'bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-emerald-400/35'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Overall Monthly
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {budgetScope === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      const cat = expenseCategories.find((c) => c.id === e.target.value);
                      setCategoryId(e.target.value);
                      if (cat) setName(`${cat.name} Budget`);
                    }}
                    className="w-full rounded-lg glass-input px-3 py-2 text-sm"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Budget Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Budget Limit (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Budget Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Notes or target spending rule..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg glass-button-secondary px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg btn-primary px-4 py-2 text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl p-6 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete Budget?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Remove <strong className="text-slate-900 dark:text-white">{deletingBudget.name}</strong> (
              {formatCurrency(deletingBudget.amount, currency)}) for{' '}
              {formatMonthLabel(deletingBudget.budgetMonth)}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBudget(null)}
                className="rounded-lg glass-button-secondary px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingBudget.id;
                  setDeletingBudget(null);
                  await deleteBudget(id);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
