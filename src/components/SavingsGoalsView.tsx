import React, { useMemo, useState } from 'react';
import {
  Plus,
  Target,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PAYMENT_METHODS, PaymentMethod, SavingsGoal } from '../types/finance';
import {
  computeSavingsGoalMetrics,
  formatCurrency,
  formatDateIN,
  getTodayISO,
} from '../utils/calculations';

export const SavingsGoalsView: React.FC = () => {
  const {
    profile,
    accounts,
    savingsGoals,
    goalContributions,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addGoalContribution,
  } = useFinance();

  const currency = profile?.currency || 'INR';

  // Create / Edit Goal Modal
  const [goalModalOpen, setGoalModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentSavedAmount, setCurrentSavedAmount] = useState<string>('0');
  const [targetDate, setTargetDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [goalError, setGoalError] = useState<string | null>(null);

  // Contribution / Withdrawal Modal
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribType, setContribType] = useState<'contribution' | 'withdrawal'>('contribution');
  const [contribAmount, setContribAmount] = useState<string>('');
  const [contribDate, setContribDate] = useState<string>(getTodayISO());
  const [contribNotes, setContribNotes] = useState<string>('');
  const [alsoRecordAccountTx, setAlsoRecordAccountTx] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
  const [contribError, setContribError] = useState<string | null>(null);

  // History & Delete Modals
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);

  const summaryStats = useMemo(() => {
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentSavedAmount, 0);
    const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return { totalTarget, totalSaved, remaining: Math.max(0, totalTarget - totalSaved), overallPct };
  }, [savingsGoals]);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentSavedAmount('0');
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setTargetDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    );
    setDescription('');
    setGoalError(null);
    setGoalModalOpen(true);
  };

  const openEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(String(g.targetAmount));
    setCurrentSavedAmount(String(g.currentSavedAmount));
    setTargetDate(g.targetDate);
    setDescription(g.description || '');
    setGoalError(null);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError(null);
    const tAmt = Number(targetAmount);
    const sAmt = Number(currentSavedAmount) || 0;
    if (!name.trim()) {
      setGoalError('Please enter a goal name.');
      return;
    }
    if (isNaN(tAmt) || tAmt <= 0) {
      setGoalError('Target amount must be greater than ₹0.');
      return;
    }
    if (sAmt < 0) {
      setGoalError('Saved amount cannot be negative.');
      return;
    }
    if (!targetDate) {
      setGoalError('Please select a target date.');
      return;
    }

    const payload = {
      name: name.trim(),
      targetAmount: tAmt,
      currentSavedAmount: sAmt,
      targetDate,
      description: description.trim(),
      icon: 'Target',
    };

    if (editingGoal) {
      await updateSavingsGoal(editingGoal.id, payload);
    } else {
      await addSavingsGoal(payload);
    }
    setGoalModalOpen(false);
  };

  const openContribModal = (g: SavingsGoal, type: 'contribution' | 'withdrawal') => {
    setContribGoal(g);
    setContribType(type);
    setContribAmount('');
    setContribDate(getTodayISO());
    setContribNotes('');
    setAlsoRecordAccountTx(false);
    setSelectedAccountId(accounts[0]?.id || '');
    setSelectedMethod('UPI');
    setContribError(null);
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal) return;
    setContribError(null);
    const amt = Number(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setContribError('Please enter a valid positive amount.');
      return;
    }
    if (contribType === 'withdrawal' && amt > contribGoal.currentSavedAmount) {
      setContribError('Withdrawal amount cannot exceed the current saved amount for this goal.');
      return;
    }

    await addGoalContribution(
      {
        goalId: contribGoal.id,
        amount: amt,
        type: contribType,
        date: contribDate,
        notes: contribNotes.trim(),
      },
      alsoRecordAccountTx && selectedAccountId
        ? { accountId: selectedAccountId, paymentMethod: selectedMethod }
        : undefined
    );
    setContribGoal(null);
  };

  const historyList = useMemo(() => {
    if (!historyGoal) return [];
    return goalContributions.filter((c) => c.goalId === historyGoal.id);
  }, [goalContributions, historyGoal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Savings Goals Tracker</h2>
          <p className="text-xs text-slate-500">
            Allocate savings toward milestones and calculate exact monthly contributions required
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateGoal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Savings Goal
        </button>
      </div>

      {/* Accounting Clarity Notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-900">Accounting Note:</strong> Money allocated to a savings goal tracks your earmarked progress without altering your bank or wallet balances—unless you explicitly check the option to record a corresponding account transaction when adding a contribution.
        </span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Saved Across Goals</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-teal-700">
            {formatCurrency(summaryStats.totalSaved, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summaryStats.overallPct.toFixed(1)}% of combined target
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Combined Target Amount</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
            {formatCurrency(summaryStats.totalTarget, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {savingsGoals.length} active goal{savingsGoals.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Remaining to Save</p>
          <p className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
            {formatCurrency(summaryStats.remaining, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Across all open milestones</p>
        </div>
      </div>

      {/* Goal Cards */}
      {savingsGoals.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <Target className="h-8 w-8 text-teal-700 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No savings goals created yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Start planning for a New Laptop, Emergency Fund, College Expenses, or Vacation and track your monthly contribution target.
          </p>
          <button
            type="button"
            onClick={openCreateGoal}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Create First Savings Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {savingsGoals.map((goal) => {
            const metrics = computeSavingsGoalMetrics(goal);

            return (
              <div
                key={goal.id}
                className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{goal.name}</h3>
                      {goal.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setHistoryGoal(goal)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Contribution History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditGoal(goal)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Edit Goal"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingGoal(goal)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                        title="Delete Goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Numbers */}
                  <div className="pt-1">
                    <div className="flex items-baseline justify-between font-mono-tabular">
                      <span className="text-2xl font-bold text-slate-900">
                        {formatCurrency(goal.currentSavedAmount, currency)}
                      </span>
                      <span className="text-xs text-slate-500">
                        of {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>

                    <div className="mt-2.5 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          metrics.isCompleted ? 'bg-emerald-600' : 'bg-teal-700'
                        }`}
                        style={{ width: `${metrics.completionPercent}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs font-mono-tabular text-slate-600">
                      <span className="font-semibold text-teal-800">
                        {metrics.completionPercent.toFixed(1)}% complete
                      </span>
                      <span>
                        {formatCurrency(metrics.remainingAmount, currency)} remaining
                      </span>
                    </div>
                  </div>

                  {/* Target Date & Recommended Monthly Plan */}
                  <div className="rounded-lg bg-slate-50 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Target Date</span>
                      <span className="font-mono-tabular font-medium text-slate-900">
                        {formatDateIN(goal.targetDate)}
                      </span>
                    </div>

                    {metrics.isCompleted ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold pt-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{metrics.statusMessage}</span>
                      </div>
                    ) : metrics.recommendedMonthlyContribution !== null ? (
                      <>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                          <span className="text-slate-600 font-medium">
                            Recommended Monthly Saving
                          </span>
                          <span className="font-mono-tabular font-bold text-teal-700">
                            {formatCurrency(metrics.recommendedMonthlyContribution, currency)}/mo
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{metrics.statusMessage}</p>
                      </>
                    ) : (
                      <p className="text-amber-700 font-medium pt-1">{metrics.statusMessage}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openContribModal(goal, 'contribution')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Add Contribution
                  </button>
                  <button
                    type="button"
                    onClick={() => openContribModal(goal, 'withdrawal')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Withdraw / Correct
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              {goalError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{goalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. New Laptop, Emergency Fund, Vacation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Current Saved (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentSavedAmount}
                    onChange={(e) => setCurrentSavedAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Why are you saving for this goal?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution / Withdrawal Modal */}
      {contribGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {contribType === 'contribution' ? 'Add Contribution' : 'Record Withdrawal'} ·{' '}
                {contribGoal.name}
              </h3>
              <button
                type="button"
                onClick={() => setContribGoal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="p-6 space-y-4">
              {contribError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{contribError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={contribDate}
                    onChange={(e) => setContribDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="e.g. Monthly savings from freelance income"
                  value={contribNotes}
                  onChange={(e) => setContribNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoRecordAccountTx}
                    onChange={(e) => setAlsoRecordAccountTx(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-700"
                  />
                  <span>
                    <strong>Also record a financial transaction</strong> (deduct/credit an account balance). Leave unchecked to only update goal allocation.
                  </span>
                </label>

                {alsoRecordAccountTx && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setContribGoal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution History Modal */}
      {historyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Contribution History · {historyGoal.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Current Saved: {formatCurrency(historyGoal.currentSavedAmount, currency)} of{' '}
                  {formatCurrency(historyGoal.targetAmount, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryGoal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {historyList.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No contributions or withdrawals recorded for this goal yet.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {historyList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.notes ||
                          (item.type === 'contribution' ? 'Savings Contribution' : 'Withdrawal')}
                      </p>
                      <p className="text-slate-500 font-mono-tabular">{formatDateIN(item.date)}</p>
                    </div>
                    <span
                      className={`font-mono-tabular font-semibold ${
                        item.type === 'contribution' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.type === 'contribution' ? '+' : '-'}
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryGoal(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Goal Modal */}
      {deletingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Delete Savings Goal?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900">{deletingGoal.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingGoal(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingGoal.id;
                  setDeletingGoal(null);
                  await deleteSavingsGoal(id);
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
