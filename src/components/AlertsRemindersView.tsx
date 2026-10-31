import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  Calendar,
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  RecurrenceType,
  Reminder,
  REMINDER_CATEGORIES,
} from '../types/finance';
import {
  calculateNextOccurrence,
  formatCurrency,
  formatDateIN,
  getTodayISO,
} from '../utils/calculations';

export const AlertsRemindersView: React.FC = () => {
  const {
    profile,
    notifications,
    reminders,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    addReminder,
    updateReminder,
    toggleReminderCompleted,
    postponeReminder,
    deleteReminder,
    setActiveTab,
  } = useFinance();

  const currency = profile?.currency || 'INR';

  // Notification Filter
  const [notifFilter, setNotifFilter] = useState<
    | 'all'
    | 'unread'
    | 'budget'
    | 'spending'
    | 'low_balance'
    | 'reminder'
    | 'loan'
    | 'subscription'
    | 'goal'
  >('all');

  // Reminder Modal
  const [remModalOpen, setRemModalOpen] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(getTodayISO());
  const [category, setCategory] = useState<string>(REMINDER_CATEGORIES[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [notes, setNotes] = useState<string>('');
  const [notifyInApp, setNotifyInApp] = useState<boolean>(true);
  const [remError, setRemError] = useState<string | null>(null);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (notifFilter === 'unread') return !n.isRead;
      if (notifFilter !== 'all') return n.type === notifFilter;
      return true;
    });
  }, [notifications, notifFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const openCreateReminder = () => {
    setEditingReminder(null);
    setTitle('');
    setAmount('');
    setDueDate(getTodayISO());
    setCategory(REMINDER_CATEGORIES[0]);
    setRecurrence('monthly');
    setNotes('');
    setNotifyInApp(true);
    setRemError(null);
    setRemModalOpen(true);
  };

  const openEditReminder = (r: Reminder) => {
    setEditingReminder(r);
    setTitle(r.title);
    setAmount(String(r.amount));
    setDueDate(r.dueDate);
    setCategory(r.category);
    setRecurrence(r.recurrence);
    setNotes(r.notes || '');
    setNotifyInApp(r.notifyInApp);
    setRemError(null);
    setRemModalOpen(true);
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemError(null);
    if (!title.trim()) {
      setRemError('Please enter a reminder title.');
      return;
    }
    const numAmt = Number(amount) || 0;
    if (numAmt < 0) {
      setRemError('Amount cannot be negative.');
      return;
    }
    if (!dueDate) {
      setRemError('Please select a due date.');
      return;
    }

    const payload = {
      title: title.trim(),
      amount: numAmt,
      dueDate,
      category,
      recurrence,
      notes: notes.trim(),
      notifyInApp,
      completed: editingReminder ? editingReminder.completed : false,
      nextOccurrence: calculateNextOccurrence(dueDate, recurrence),
    };

    if (editingReminder) {
      await updateReminder(editingReminder.id, payload);
    } else {
      await addReminder(payload);
    }
    setRemModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Alerts & Bill Reminders</h1>
          <p className="supporting-text mt-1">
            Monitor automated budget, spending, and low-balance alerts alongside recurring bill and payment reminders
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateReminder}
          className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Bill Reminder
        </button>
      </div>

      {/* Delivery Disclosure Banner */}
      <div className="flex items-start justify-between gap-4 rounded-xl data-surface p-3.5 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-900 dark:text-white">In-App Smart Alert Engine:</strong> Alerts and due-date notifications are evaluated automatically in-app whenever Finora checks your live financial state and reminder schedule, with deduplication keys preventing duplicate alerts on page refresh. You can configure individual alert types in{' '}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Settings
            </button>
            .
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Smart Notification Center */}
        <div className="lg:col-span-7 rounded-xl data-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Notification Center ({unreadCount} unread)
              </h2>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark All Read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-black/25 px-5 py-2">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'budget', label: 'Budgets' },
                { id: 'spending', label: 'Spending' },
                { id: 'low_balance', label: 'Low Balance' },
                { id: 'reminder', label: 'Bills' },
                { id: 'loan', label: 'Loans & EMIs' },
                { id: 'subscription', label: 'Subscriptions' },
                { id: 'goal', label: 'Goals' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setNotifFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  notifFilter === tab.id
                    ? 'bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-400/30 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">No notifications in this view</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When your budgets reach 80% or 100%, an account falls below your minimum threshold, or a bill, EMI, or subscription is due within 7 days, alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.07] max-h-[540px] overflow-y-auto">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    n.isRead ? 'bg-transparent' : 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {n.severity === 'critical' ? (
                        <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      ) : n.severity === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                            · {n.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>

                        <div className="flex items-center gap-3 pt-1 text-xs">
                          {n.type === 'budget' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('budgets')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              Review Budgets →
                            </button>
                          )}
                          {n.type === 'spending' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('reports')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              View Spending Report →
                            </button>
                          )}
                          {n.type === 'low_balance' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('transactions')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              Check Accounts →
                            </button>
                          )}
                          {n.type === 'loan' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('loans')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              Open Loan Manager →
                            </button>
                          )}
                          {n.type === 'subscription' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('subscriptions')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              Manage Subscriptions →
                            </button>
                          )}
                          {n.type === 'goal' && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('goals')}
                              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              View Savings Goals →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-white/10 dark:hover:text-emerald-300 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissNotification(n.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
                        title="Dismiss notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Bill & Payment Reminders (5 cols) */}
        <div className="lg:col-span-5 rounded-xl data-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Bill & Payment Reminders</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recurring rent, electricity, broadband, college fees, and EMIs
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateReminder}
              className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Reminder
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">No bill reminders scheduled</p>
              <button
                type="button"
                onClick={openCreateReminder}
                className="rounded-lg btn-primary px-3.5 py-1.5 text-xs"
              >
                Schedule First Reminder
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.07] max-h-[540px] overflow-y-auto">
              {reminders.map((rem) => {
                const isOverdue = !rem.completed && rem.dueDate < getTodayISO();

                return (
                  <div key={rem.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-xs font-semibold ${
                              rem.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {rem.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {rem.category} · Repeats: <span className="capitalize">{rem.recurrence}</span>
                        </p>
                      </div>

                      <span className="font-mono-tabular text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(rem.amount, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
                      <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                        Due: {formatDateIN(rem.dueDate)} {isOverdue ? '(Overdue)' : ''}
                      </span>
                      {rem.recurrence !== 'none' && (
                        <span className="text-slate-500 dark:text-slate-400">
                          Next: {formatDateIN(rem.nextOccurrence)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleReminderCompleted(rem.id)}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            rem.completed
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300'
                              : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {rem.completed
                            ? 'Completed'
                            : rem.recurrence !== 'none'
                            ? 'Mark Paid & Advance'
                            : 'Mark Completed'}
                        </button>

                        {!rem.completed && (
                          <button
                            type="button"
                            onClick={() => postponeReminder(rem.id, 3)}
                            className="inline-flex items-center gap-1 rounded-md glass-button-secondary px-2 py-1 text-xs text-slate-600 dark:text-slate-300"
                            title="Postpone by 3 days"
                          >
                            <Clock className="h-3 w-3" />
                            +3d
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditReminder(rem)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReminder(rem.id)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Reminder Modal */}
      {remModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingReminder ? 'Edit Reminder' : 'Create Bill Reminder'}
              </h3>
              <button
                type="button"
                onClick={() => setRemModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="p-5 space-y-3.5">
              {remError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{remError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Hostel PG Rent, JioFiber Bill, Semester Fees"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {REMINDER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    <option value="none">One-Time (None)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Optional Notes
                </label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Account number or payment instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyInApp}
                  onChange={(e) => setNotifyInApp(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
                />
                <span>Generate in-app notification when due within 7 days</span>
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setRemModalOpen(false)}
                  className="rounded-lg glass-button-secondary px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg btn-primary px-4 py-1.5 text-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
