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
  Sun,
  Moon,
  Sparkles,
  Check,
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
    theme,
    setTheme,
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
    <div className="space-y-5 max-w-5xl">
      {/* Compact Page Header */}
      <div>
        <h1 className="page-title">Workspace Settings</h1>
        <p className="supporting-text mt-1">
          Configure appearance, display profile, currency preferences, alert thresholds, custom categories, and data exports
        </p>
      </div>

      {/* 1. Appearance & Theme Selection Card */}
      <div className="rounded-xl data-surface p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sun className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Appearance & Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between Finora&apos;s crisp default Light Mode and deep slate Dark Mode
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active: <strong className="text-emerald-600 dark:text-emerald-400 capitalize">{theme} Mode</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Theme Option Card */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-500/[0.04] shadow-xs ring-1 ring-emerald-500/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-amber-500 shadow-xs">
              <Sun className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Light Theme (Default)
                </span>
                {theme === 'light' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Crisp #F5F7FA background, pure white cards, high-contrast dark navy typography, and emerald accents.
              </p>
            </div>
          </button>

          {/* Dark Theme Option Card */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-500/[0.06] shadow-xs ring-1 ring-emerald-500/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-700 text-slate-200 shadow-xs">
              <Moon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Dark Theme
                </span>
                {theme === 'dark' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Deep #0F172A slate background, dark navy card surfaces, bright typography, and restrained Liquid Glass.
              </p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveProfileAndPrefs} className="space-y-5">
        {/* 2. Profile & Financial Preferences */}
        <div className="rounded-xl data-surface p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Profile & Financial Preferences
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure your display name, default currency (INR ₹), monthly budget defaults, and alert thresholds
                </p>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-4 py-2 text-xs whitespace-nowrap shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              Save Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full rounded-lg border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.02] px-3 py-2 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm"
              >
                <option value="INR">Indian Rupee (₹ INR — en-IN)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Monthly Income (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Monthly Budget Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Low-Balance Alert Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={lowBalanceThreshold}
                onChange={(e) => setLowBalanceThreshold(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Financial Month Start Day (1–28)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={financialMonthStartDay}
                onChange={(e) => setFinancialMonthStartDay(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Preferred Reporting Period
              </label>
              <select
                value={preferredPeriod}
                onChange={(e) => setPreferredPeriod(e.target.value)}
                className="w-full rounded-lg glass-input px-3 py-2 text-sm"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Notification Preferences */}
        <div className="rounded-xl data-surface p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notification Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-3.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
              />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Budget Alerts (80% & 100%)</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Notify when overall or category monthly spending reaches 80% warning or 100% exceeded.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-3.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={spendingAlerts}
                onChange={(e) => setSpendingAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
              />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Unusual Spending Alerts</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Notify when category or month-over-month expenses increase significantly over baseline.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-3.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={lowBalanceAlerts}
                onChange={(e) => setLowBalanceAlerts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
              />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Low-Balance Alerts</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Notify when any bank account or wallet drops below your configured minimum threshold.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02] p-3.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.05] transition-colors">
              <input
                type="checkbox"
                checked={billReminders}
                onChange={(e) => setBillReminders(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
              />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Bill & Payment Reminders</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Generate in-app notifications for upcoming and overdue recurring bill reminders.
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>

      {/* 4. Custom Transaction Categories */}
      <div className="rounded-xl data-surface p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Custom Transaction Categories</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className="flex-1 min-w-[220px] rounded-lg glass-input px-3 py-2 text-xs"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
            className="rounded-lg glass-input px-3 py-2 text-xs"
          >
            <option value="expense">Expense Category</option>
            <option value="income">Income Category</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg btn-primary px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
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
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
              >
                <span>
                  {c.name} ({c.transactionType})
                </span>
                <button
                  type="button"
                  onClick={() => deleteCategory(c.id)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Data Management */}
      <div className="rounded-xl data-surface p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Data Management & Export</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportAllDataJSON}
            className="inline-flex items-center gap-1.5 rounded-lg glass-button-secondary px-4 py-2 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Personal Data (JSON)
          </button>

          <button
            type="button"
            onClick={() => (isDemoMode ? resetDemoData() : loadSampleDataIntoAccount())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isDemoMode ? 'Reset Demo Dataset' : 'Load Sample Indian Dataset'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDemoMode ? 'Clear & Exit Demo Mode' : 'Delete Account & All Financial Data'}
          </button>
        </div>
      </div>

      {/* 6. Architecture & Setup Instructions */}
      <div className="rounded-xl data-surface p-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Architecture & API Reference
          </h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>
            <strong className="text-slate-900 dark:text-white">Light Mode Default & Dark Mode Toggle:</strong> Finora uses a centralized CSS variables system with zero-flash synchronization via <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200">localStorage</code>.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Firebase Firestore & Authentication:</strong> Provisioned via{' '}
            <code className="bg-slate-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">firebase-applet-config.json</code> with zero-trust user-isolated rules deployed in{' '}
            <code className="bg-slate-100 dark:bg-white/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">firestore.rules</code>.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Server-Side Gemini AI Assistant:</strong> Handled strictly on the backend (<code className="bg-slate-100 dark:bg-white/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">POST /api/ai/assistant</code>) using <code className="bg-slate-100 dark:bg-white/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">process.env.GEMINI_API_KEY</code> so credentials are never exposed in the client.
          </li>
        </ul>
      </div>

      {/* Delete Confirmation Modal (Liquid Glass) */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl liquid-glass-modal p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {isDemoMode ? 'Exit Demo Mode?' : 'Permanently Delete All Financial Data?'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isDemoMode
                ? 'This will clear the current in-memory demo session and return to the login screen.'
                : 'This will permanently delete all your accounts, transactions, budgets, savings goals, reminders, and profile records from Firestore.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-lg glass-button-secondary px-3.5 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  await deleteAllUserData();
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
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
