import React, { useState } from 'react';
import {
  Save,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  Shield,
  Sliders,
  Bell,
  Database,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const SettingsView: React.FC = () => {
  const {
    profile,
    isDemoMode,
    accounts,
    categories,
    transactions,
    budgets,
    savingsGoals,
    reminders,
    updateUserProfile,
    addCategory,
    deleteCategory,
    loadSampleDataIntoAccount,
    resetDemoData,
    deleteAllUserData,
    showToast,
  } = useFinance();

  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '');
  const [currency, setCurrency] = useState<string>(profile?.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState<string>(
    String(profile?.monthlyIncome ?? 15000)
  );
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    String(profile?.monthlyBudget ?? 10000)
  );
  const [financialMonthStartDay, setFinancialMonthStartDay] = useState<string>(
    String(profile?.financialMonthStartDay ?? 1)
  );
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<string>(
    String(profile?.lowBalanceThreshold ?? 2000)
  );
  const [preferredPeriod, setPreferredPeriod] = useState<string>(
    profile?.preferredPeriod || 'this_month'
  );

  const [budgetAlerts, setBudgetAlerts] = useState<boolean>(
    profile?.notificationPrefs?.budgetAlerts ?? true
  );
  const [spendingAlerts, setSpendingAlerts] = useState<boolean>(
    profile?.notificationPrefs?.spendingAlerts ?? true
  );
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState<boolean>(
    profile?.notificationPrefs?.lowBalanceAlerts ?? true
  );
  const [billReminders, setBillReminders] = useState<boolean>(
    profile?.notificationPrefs?.billReminders ?? true
  );

  // Custom Category Creator
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Delete Account Confirmation
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

  const handleSaveProfileAndPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      displayName: displayName.trim() || 'Finora User',
      currency,
      monthlyIncome: Math.max(0, Number(monthlyIncome) || 0),
      monthlyBudget: Math.max(0, Number(monthlyBudget) || 0),
      financialMonthStartDay: Math.min(28, Math.max(1, Number(financialMonthStartDay) || 1)),
      lowBalanceThreshold: Math.max(0, Number(lowBalanceThreshold) || 0),
      preferredPeriod,
      notificationPrefs: {
        budgetAlerts,
        spendingAlerts,
        lowBalanceAlerts,
        billReminders,
      },
    });
  };

  const handleCreateCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory({
      name: newCatName.trim(),
      transactionType: newCatType,
      icon: 'Tag',
    });
    setNewCatName('');
  };

  const handleExportAllDataJSON = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: profile?.displayName,
        email: profile?.email,
        currency: profile?.currency,
        monthlyIncome: profile?.monthlyIncome,
        monthlyBudget: profile?.monthlyBudget,
      },
      accounts,
      categories: categories.filter((c) => !c.isDefault),
      transactions,
      budgets,
      savingsGoals,
      reminders,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finora_Personal_Data_Export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Personal financial data exported as JSON.');
  };

  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <div className="space-y-6 max-w-5xl">
      <form onSubmit={handleSaveProfileAndPrefs} className="space-y-6">
        {/* 1. Profile & Financial Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-4 w-4 text-teal-700" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Profile & Financial Preferences
                </h2>
                <p className="text-xs text-slate-500">
                  Configure your display name, default currency (INR ₹), monthly budget defaults, and alert thresholds
                </p>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              Save Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Account Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="INR">Indian Rupee (₹ INR — en-IN)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Monthly Income (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Monthly Budget Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Low-Balance Alert Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={lowBalanceThreshold}
                onChange={(e) => setLowBalanceThreshold(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Financial Month Start Day (1–28)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={financialMonthStartDay}
                onChange={(e) => setFinancialMonthStartDay(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preferred Reporting Period
              </label>
              <select
                value={preferredPeriod}
                onChange={(e) => setPreferredPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Notification Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
            <Bell className="h-4 w-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">Notification Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Budget Alerts (80% & 100%)</span>
                <span className="text-slate-500">
                  Notify when overall or category monthly spending reaches 80% warning or 100% exceeded.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={spendingAlerts}
                onChange={(e) => setSpendingAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Unusual Spending Alerts</span>
                <span className="text-slate-500">
                  Notify when category or month-over-month expenses increase significantly over baseline.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={lowBalanceAlerts}
                onChange={(e) => setLowBalanceAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Low-Balance Alerts</span>
                <span className="text-slate-500">
                  Notify when any bank account or wallet drops below your configured minimum threshold.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={billReminders}
                onChange={(e) => setBillReminders(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Bill & Payment Reminders</span>
                <span className="text-slate-500">
                  Generate in-app notifications for upcoming and overdue recurring bill reminders.
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>

      {/* 3. Custom Transaction Categories */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Custom Transaction Categories</h2>
          <p className="text-xs text-slate-500">
            Create custom categories in addition to Finora&apos;s 19 built-in Indian income and expense categories
          </p>
        </div>

        <form onSubmit={handleCreateCustomCategory} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            maxLength={80}
            placeholder="New category name (e.g. Hostel Laundry, Hackathon Prize)..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          >
            <option value="expense">Expense Category</option>
            <option value="income">Income Category</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </button>
        </form>

        {customCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {customCategories.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800"
              >
                <span>
                  {c.name} ({c.transactionType})
                </span>
                <button
                  type="button"
                  onClick={() => deleteCategory(c.id)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Data Management */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <Database className="h-4 w-4 text-teal-700" />
          <h2 className="text-base font-semibold text-slate-900">Data Management & Export</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportAllDataJSON}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Personal Data (JSON)
          </button>

          <button
            type="button"
            onClick={() => (isDemoMode ? resetDemoData() : loadSampleDataIntoAccount())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isDemoMode ? 'Reset Demo Dataset' : 'Load Sample Indian Dataset'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDemoMode ? 'Clear & Exit Demo Mode' : 'Delete Account & All Financial Data'}
          </button>
        </div>
      </div>

      {/* 5. Architecture & Setup Instructions */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            Firebase & Gemini API Configuration Reference
          </h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>
            <strong className="text-slate-800">Firebase Firestore & Authentication:</strong> Provisioned via{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">firebase-applet-config.json</code> with zero-trust user-isolated rules deployed in{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">firestore.rules</code>. Google Sign-In is enabled out of the box; to also use Email/Password sign-in, enable the Email/Password provider in the Firebase Console under Authentication &gt; Sign-in method.
          </li>
          <li>
            <strong className="text-slate-800">Server-Side Gemini AI Assistant:</strong> Handled strictly on the backend (<code className="bg-slate-100 px-1.5 py-0.5 rounded">POST /api/ai/assistant</code> in <code className="bg-slate-100 px-1.5 py-0.5 rounded">server.ts</code>) using <code className="bg-slate-100 px-1.5 py-0.5 rounded">process.env.GEMINI_API_KEY</code> so secrets are never exposed to the browser.
          </li>
        </ul>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              {isDemoMode ? 'Exit Demo Mode?' : 'Permanently Delete All Financial Data?'}
            </h3>
            <p className="text-xs text-slate-600">
              {isDemoMode
                ? 'This will clear the current in-memory demo session and return to the login screen.'
                : 'This will permanently delete all your accounts, transactions, budgets, savings goals, reminders, and profile records from Firestore.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  await deleteAllUserData();
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
