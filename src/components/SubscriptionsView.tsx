import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  Repeat,
  Plus,
  Calendar,
  PauseCircle,
  PlayCircle,
  XCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  Subscription,
  SUBSCRIPTION_CATEGORIES,
  SubscriptionCategory,
  SubscriptionFrequency,
} from '../types/finance';
import {
  calculateNextOccurrence,
  DetectedRecurringCandidate,
  detectRecurringExpensesFromTransactions,
  formatCurrency,
  formatDateIN,
  getAnnualEquivalentCost,
  getMonthlyEquivalentCost,
  getTodayISO,
} from '../utils/calculations';

const CHART_COLORS = [
  '#10B981',
  '#38BDF8',
  '#8B5CF6',
  '#F59E0B',
  '#F43F5E',
  '#2DD4BF',
  '#6366F1',
  '#94A3B8',
];

const DARK_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.96)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  color: '#F8FAFC',
  fontSize: '12px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
};

export const SubscriptionsView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    subscriptions,
    addSubscription,
    updateSubscription,
    toggleSubscriptionStatus,
    recordSubscriptionPayment,
    deleteSubscription,
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

  const currency = profile?.currency || 'INR';

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add/Edit Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<SubscriptionCategory>('Streaming & Media');
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState<string>(getTodayISO());
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [status, setStatus] = useState<'active' | 'paused' | 'cancelled'>('active');
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [subError, setSubError] = useState<string | null>(null);

  // Delete Confirmation
  const [deletingSub, setDeletingSub] = useState<Subscription | null>(null);

  // KPIs
  const stats = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const pausedOrCancelled = subscriptions.filter((s) => s.status !== 'active');

    const monthlyTotal = activeSubs.reduce(
      (sum, s) => sum + getMonthlyEquivalentCost(s.amount, s.frequency),
      0
    );
    const annualTotal = activeSubs.reduce(
      (sum, s) => sum + getAnnualEquivalentCost(s.amount, s.frequency),
      0
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueWithin7Days = activeSubs.filter((s) => {
      const parts = s.nextRenewalDate.split('-').map(Number);
      const d =
        parts.length === 3
          ? new Date(parts[0], parts[1] - 1, parts[2])
          : new Date(s.nextRenewalDate);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    });

    return {
      activeCount: activeSubs.length,
      inactiveCount: pausedOrCancelled.length,
      monthlyTotal,
      annualTotal,
      dueSoonCount: dueWithin7Days.length,
    };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      if (statusFilter === 'active') return s.status === 'active';
      if (statusFilter === 'inactive') return s.status !== 'active';
      return true;
    });
  }, [subscriptions, statusFilter]);

  // Category Breakdown for Active Subscriptions (Monthly Equivalent)
  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subscriptions) {
      if (s.status !== 'active') continue;
      const mo = getMonthlyEquivalentCost(s.amount, s.frequency);
      map.set(s.category, (map.get(s.category) || 0) + mo);
    }
    return Array.from(map.entries())
      .map(([catName, val], idx) => ({
        name: catName,
        value: Math.round(val),
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [subscriptions]);

  // Auto-Detected Recurring Expenses from Transaction History
  const detectedCandidates = useMemo(
    () => detectRecurringExpensesFromTransactions(transactions, subscriptions),
    [transactions, subscriptions]
  );

  const openCreateModal = () => {
    setEditingSub(null);
    setName('');
    setCategory('Streaming & Media');
    setAmount('');
    setFrequency('monthly');
    setNextRenewalDate(getTodayISO());
    setAccountId(accounts[0]?.id || '');
    setPaymentMethod('UPI');
    setStatus('active');
    setAutoRenew(true);
    setNotes('');
    setSubError(null);
    setModalOpen(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setCategory(sub.category);
    setAmount(String(sub.amount));
    setFrequency(sub.frequency);
    setNextRenewalDate(sub.nextRenewalDate);
    setAccountId(sub.accountId || accounts[0]?.id || '');
    setPaymentMethod(sub.paymentMethod);
    setStatus(sub.status);
    setAutoRenew(sub.autoRenew);
    setNotes(sub.notes || '');
    setSubError(null);
    setModalOpen(true);
  };

  const handleConvertCandidate = (cand: DetectedRecurringCandidate) => {
    setEditingSub(null);
    setName(cand.description);
    setCategory('Other');
    setAmount(String(cand.averageAmount));
    setFrequency('monthly');
    setNextRenewalDate(calculateNextOccurrence(cand.lastDate, 'monthly'));
    setAccountId(cand.accountId || accounts[0]?.id || '');
    setPaymentMethod(cand.paymentMethod || 'UPI');
    setStatus('active');
    setAutoRenew(true);
    setNotes(`Auto-detected from ${cand.occurrences} transaction(s)`);
    setSubError(null);
    setModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);

    if (!name.trim()) {
      setSubError('Please enter a subscription service name.');
      return;
    }
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      setSubError('Subscription cost must be greater than 0.');
      return;
    }
    if (!nextRenewalDate) {
      setSubError('Please select the next renewal date.');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      amount: numAmt,
      frequency,
      nextRenewalDate,
      accountId: accountId || accounts[0]?.id || '',
      paymentMethod,
      status,
      autoRenew,
      notes: notes.trim(),
    };

    if (editingSub) {
      await updateSubscription(editingSub.id, payload);
    } else {
      await addSubscription(payload);
    }
    setModalOpen(false);
  };

  const getDaysUntilRenewal = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dateStr.split('-').map(Number);
    const d =
      parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-5">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="supporting-text mt-0.5">
            Monitor recurring digital memberships, OTT apps, broadband plans, and annualized subscription leakage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-1">
            {(
              [
                { id: 'all', label: `All (${subscriptions.length})` },
                { id: 'active', label: `Active (${stats.activeCount})` },
                { id: 'inactive', label: `Paused/Cancelled (${stats.inactiveCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Subscription
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Active Subscriptions</p>
          <p className="mt-2 metric-value text-slate-900 dark:text-white">
            {stats.activeCount}
          </p>
          <p className="mt-1.5 supporting-text">
            {stats.inactiveCount} paused or cancelled
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Monthly Equivalent Cost</p>
          <p className="mt-2 metric-value text-emerald-600 dark:text-emerald-400">
            {formatCurrency(Math.round(stats.monthlyTotal), currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            Normalized monthly recurring burn
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Annual Subscription Spend</p>
          <p className="mt-2 metric-value text-amber-600 dark:text-amber-400">
            {formatCurrency(Math.round(stats.annualTotal), currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            12-month projected commitment
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Renewing in Next 7 Days</p>
          <p
            className={`mt-2 metric-value ${
              stats.dueSoonCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-300'
            }`}
          >
            {stats.dueSoonCount}
          </p>
          <p className="mt-1.5 supporting-text">
            Automatic in-app alerts enabled
          </p>
        </div>
      </div>

      {/* Main Layout: Subscriptions List (7 cols) & Analytics + Detected Recurring (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Subscriptions List */}
        <div className="lg:col-span-7 space-y-3.5">
          {filteredSubscriptions.length === 0 ? (
            <div className="data-surface p-12 text-center space-y-3">
              <Repeat className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                No subscriptions in this filter
              </h3>
              <p className="supporting-text max-w-md mx-auto">
                Track your streaming services, cloud storage, gym memberships, and mobile/broadband recharges to stay ahead of renewal dates.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-lg btn-primary px-4 py-2 text-xs"
              >
                Add First Subscription
              </button>
            </div>
          ) : (
            filteredSubscriptions.map((sub) => {
              const daysLeft = getDaysUntilRenewal(sub.nextRenewalDate);
              const monthlyEq = getMonthlyEquivalentCost(sub.amount, sub.frequency);
              const annualEq = getAnnualEquivalentCost(sub.amount, sub.frequency);

              return (
                <div
                  key={sub.id}
                  className={`data-surface p-4 space-y-3 transition-opacity ${
                    sub.status !== 'active' ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{sub.name}</h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/25'
                              : sub.status === 'paused'
                              ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-400/25'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-300 dark:border-slate-400/30'
                          }`}
                        >
                          {sub.status}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">· {sub.category}</span>
                      </div>
                      {sub.notes && (
                        <p className="supporting-text mt-0.5">{sub.notes}</p>
                      )}
                    </div>

                    <div className="text-right font-mono-tabular">
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sub.amount, currency)}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          /{sub.frequency === 'monthly' ? 'mo' : sub.frequency === 'yearly' ? 'yr' : sub.frequency === 'quarterly' ? 'qtr' : 'wk'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatCurrency(Math.round(monthlyEq), currency)}/mo ·{' '}
                        {formatCurrency(Math.round(annualEq), currency)}/yr
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-mono-tabular">
                      <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      {sub.status === 'active' ? (
                        <span
                          className={
                            daysLeft < 0
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : daysLeft <= 7
                              ? 'text-amber-600 dark:text-amber-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          Next Renewal: {formatDateIN(sub.nextRenewalDate)}{' '}
                          {daysLeft === 0
                            ? '(Due Today)'
                            : daysLeft < 0
                            ? `(${Math.abs(daysLeft)}d overdue)`
                            : `(${daysLeft}d)`}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          No upcoming renewal ({sub.status})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {sub.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => recordSubscriptionPayment(sub.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                            title="Record renewal expense in transactions and advance next renewal date"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Record Renewal
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSubscriptionStatus(sub.id, 'paused')}
                            className="inline-flex items-center gap-1 rounded-md glass-button-secondary px-2 py-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white"
                            title="Pause Subscription"
                          >
                            <PauseCircle className="h-3.5 w-3.5" />
                            Pause
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSubscriptionStatus(sub.id, 'cancelled')}
                            className="inline-flex items-center gap-1 rounded-md glass-button-secondary px-2 py-1 text-xs text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-white"
                            title="Cancel Subscription"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </>
                      )}

                      {sub.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => toggleSubscriptionStatus(sub.id, 'active')}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Reactivate
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(sub)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        title="Edit Subscription"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingSub(sub)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
                        title="Delete Subscription"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Category Breakdown Donut & Auto-Detected Recurring Expenses (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Category Breakdown Chart */}
          <div className="data-surface p-4 space-y-3">
            <div>
              <h3 className="section-heading">
                Monthly Spend by Category
              </h3>
              <p className="supporting-text text-xs">
                Normalized monthly equivalent across active plans
              </p>
            </div>

            {categoryChartData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No active subscriptions to chart.
              </div>
            ) : (
              <>
                <div className="relative h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={2}
                        stroke={theme === 'dark' ? 'rgba(15,23,42,0.9)' : '#FFFFFF'}
                      >
                        {categoryChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${formatCurrency(Number(value ?? 0), currency)}/mo`}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered Monthly Total */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">
                      Monthly Burn
                    </span>
                    <span className="text-sm font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(Math.round(stats.monthlyTotal), currency)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {categoryChartData.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-xs"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-slate-700 dark:text-slate-200">{c.name}</span>
                      </div>
                      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(c.value, currency)}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Smart Recurring Expense Detector */}
          <div className="data-surface p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                Detected Recurring Expenses in Transactions
              </h3>
            </div>
            <p className="supporting-text text-xs">
              Finora scans your transaction history for repeated merchants or subscription-tagged expenses not yet in your Subscription Manager.
            </p>

            {detectedCandidates.length === 0 ? (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800/80 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>All recurring expenses found in your ledger are already tracked!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {detectedCandidates.slice(0, 5).map((cand) => (
                  <div
                    key={cand.key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800/80 p-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{cand.description}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                        Avg {formatCurrency(cand.averageAmount, currency)} · {cand.occurrences}x · Last:{' '}
                        {formatDateIN(cand.lastDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConvertCandidate(cand)}
                      className="rounded-md bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/30 px-2 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/20 shrink-0 transition-colors"
                    >
                      + Track
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Subscription Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingSub ? 'Edit Subscription' : 'Add Recurring Subscription'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-5 space-y-3.5">
              {subError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{subError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spotify Student, Netflix, JioFiber, ChatGPT Plus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SubscriptionCategory)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {SUBSCRIPTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Billing Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Next Renewal Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextRenewalDate}
                    onChange={(e) => setNextRenewalDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Linked Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional plan details or student discount info..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg glass-button-secondary px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg btn-primary px-4 py-1.5 text-xs"
                >
                  {editingSub ? 'Save Changes' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subscription Modal */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl p-5 space-y-3.5 text-slate-900 dark:text-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Subscription?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Remove <strong className="text-slate-900 dark:text-white">{deletingSub.name}</strong> from your Subscription Manager? Past transactions in your ledger will remain untouched.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingSub(null)}
                className="rounded-lg glass-button-secondary px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingSub.id;
                  setDeletingSub(null);
                  await deleteSubscription(id);
                }}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
