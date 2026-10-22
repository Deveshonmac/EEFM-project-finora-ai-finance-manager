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
  } = useFinance();

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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Budget Management · {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="text-xs text-slate-500">
            Track overall monthly limits and category-specific budgets without double-counting expenses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Historical Month Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {availableMonths.map((ym) => (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedMonth === ym
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {formatShortMonthLabel(ym)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal('OVERALL')}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Set Overall Budget
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('CATEGORY')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category Budget
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Monthly Budget</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
            {effectiveTotalBudget > 0 ? formatCurrency(effectiveTotalBudget, currency) : 'Not Set'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {overallBudget ? 'Overall Monthly Limit' : 'Sum of Category Budgets'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Spent ({formatShortMonthLabel(selectedMonth)})</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-rose-700">
            {formatCurrency(totalSpent, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Actual eligible monthly expenses</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Amount Remaining</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono-tabular ${
              totalRemaining < 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {effectiveTotalBudget > 0 ? formatCurrency(totalRemaining, currency) : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalRemaining < 0 ? 'Over monthly budget' : 'Available to spend'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Percentage Consumed</p>
          <p
            className={`mt-2 text-2xl font-bold font-mono-tabular ${
              totalPercentConsumed >= 100
                ? 'text-rose-700'
                : totalPercentConsumed >= 80
                ? 'text-amber-700'
                : 'text-teal-700'
            }`}
          >
            {effectiveTotalBudget > 0 ? `${totalPercentConsumed.toFixed(1)}%` : '0.0%'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-semibold text-slate-900">{overallBudget.name}</h3>
                {overallBudget.status === 'exceeded' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                    <AlertOctagon className="h-3.5 w-3.5" /> Exceeded
                  </span>
                ) : overallBudget.status === 'warning' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Warning (80%+)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {overallBudget.description || 'Overall monthly spending limit across all categories'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(overallBudget)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Limit
              </button>
              {!overallBudget.id.startsWith('overall_') && (
                <button
                  type="button"
                  onClick={() => setDeletingBudget(overallBudget)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  title="Delete Budget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallBudget.status === 'exceeded'
                  ? 'bg-rose-600'
                  : overallBudget.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-teal-700'
              }`}
              style={{ width: `${Math.min(100, overallBudget.percentUsed)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs font-mono-tabular text-slate-600">
            <span>
              Spent: <strong className="text-slate-900">{formatCurrency(overallBudget.spentAmount, currency)}</strong> of{' '}
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
        <h3 className="text-base font-semibold text-slate-900">
          Category-Specific Budgets ({categoryBudgets.length})
        </h3>

        {categoryBudgets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              No category budgets configured for {formatMonthLabel(selectedMonth)}
            </p>
            <p className="text-xs text-slate-500">
              Set limits for Food & Dining, Shopping, Travel, or Entertainment to receive 80% warning alerts.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal('CATEGORY')}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Create First Category Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map((b) => {
              const barColor =
                b.status === 'exceeded'
                  ? 'bg-rose-600'
                  : b.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-teal-700';

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{b.categoryName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{b.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit Budget"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBudget(b)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                        title="Delete Budget"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between font-mono-tabular">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(b.spentAmount, currency)}
                      </span>
                      <span className="text-xs text-slate-500">
                        of {formatCurrency(b.amount, currency)}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          b.status === 'exceeded'
                            ? 'text-rose-700'
                            : b.status === 'warning'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
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

                      <span className="font-mono-tabular text-slate-600">
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Cross-Month Spending & Budget Comparison
          </h3>
          <p className="text-xs text-slate-500">
            Compare category spending in {formatMonthLabel(selectedMonth)} against{' '}
            {formatMonthLabel(prevMonth)} and configured limits
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthComparisonData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickFormatter={(v) => `₹${v}`}
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
              <Bar
                dataKey="CurrentMonth"
                name={formatShortMonthLabel(selectedMonth)}
                fill="#0F766E"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="PreviousMonth"
                name={formatShortMonthLabel(prevMonth)}
                fill="#94A3B8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="BudgetLimit"
                name="Budget Limit"
                fill="#D97706"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Add / Edit Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingBudget && (
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
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
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
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
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Overall Monthly
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {budgetScope === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      const cat = expenseCategories.find((c) => c.id === e.target.value);
                      setCategoryId(e.target.value);
                      if (cat) setName(`${cat.name} Budget`);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Budget Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Budget Limit (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Budget Month *
                  </label>
                  <input
                    type="month"
                    required
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Notes or target spending rule..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Delete Budget?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong className="text-slate-900">{deletingBudget.name}</strong> (
              {formatCurrency(deletingBudget.amount, currency)}) for{' '}
              {formatMonthLabel(deletingBudget.budgetMonth)}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBudget(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
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
