/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Calendar,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { NavigationTab } from './types/finance';
import { AuthScreen, OnboardingWizard } from './components/AuthAndOnboarding';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { ReportsView } from './components/ReportsView';
import { AIAssistantView } from './components/AIAssistantView';
import { AlertsRemindersView } from './components/AlertsRemindersView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { formatMonthLabel, getCurrentYearMonth, getLastNMonths } from './utils/calculations';

const NAV_ITEMS: Array<{
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'goals', label: 'Savings Goals', icon: Target },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'assistant', label: 'AI Financial Assistant', icon: Sparkles },
  { id: 'alerts', label: 'Alerts & Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const FinoraWorkspace: React.FC = () => {
  const {
    authReady,
    firebaseUser,
    isDemoMode,
    dataLoading,
    profile,
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    notifications,
    openTransactionModal,
    logout,
    resetDemoData,
    toasts,
    dismissToast,
  } = useFinance();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const unreadAlertsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const selectableMonths = useMemo(
    () => getLastNMonths(getCurrentYearMonth(), 6),
    []
  );

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Loading Finora...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !isDemoMode) {
    return <AuthScreen />;
  }

  if (dataLoading && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Synchronizing your encrypted financial records...
          </p>
        </div>
      </div>
    );
  }

  if (profile && !profile.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const userInitials = (profile?.displayName || 'Finora User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Collapsible Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col justify-between border-r border-slate-200 bg-white transition-all shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top: Logo & Collapse Toggle */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 h-16 px-4">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="text-base font-bold tracking-tight text-slate-900 block leading-none">
                    Finora
                  </span>
                  <span className="text-[11px] text-slate-500">Personal Finance</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-teal-700' : 'text-slate-500'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.id === 'alerts' && unreadAlertsCount > 0 && (
                    <span className="font-mono-tabular text-[11px] font-bold text-rose-700">
                      {unreadAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Profile & Logout */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2.5 min-w-0 text-left"
              title="Open Profile Settings"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {profile?.displayName || 'Finora User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {isDemoMode ? 'Fictional Demo Data' : profile?.email}
                  </p>
                </div>
              )}
            </button>

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-rose-700 shrink-0"
                title={isDemoMode ? 'Exit Demo Mode' : 'Sign Out'}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Mode Distinguishing Banner */}
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                <strong>Interactive Demo Mode (Fictional Sample Data):</strong> You are exploring Finora with sample Indian student financial records. Changes are isolated in memory and never mixed with authenticated accounts.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={resetDemoData}
                className="font-semibold text-amber-900 underline hover:text-amber-700"
              >
                Reset Sample Data
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md bg-amber-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
              >
                Sign In with Firebase →
              </button>
            </div>
          </div>
        )}

        {/* Top Bar following 3-zone SaaS Dashboard Contract */}
        <header className="h-16 border-b border-slate-200 bg-white px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left: Mobile Menu Button + Breadcrumb Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Finora</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-bold text-slate-900 truncate">{currentNav.label}</h1>
            </div>
          </div>

          {/* Center: Financial Month Selector */}
          <div className="hidden md:flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <label htmlFor="header-month-select" className="text-xs text-slate-500">
              Financial Month:
            </label>
            <select
              id="header-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-teal-600 focus:outline-hidden"
            >
              {selectableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Notification Bell & Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              title="Notifications & Reminders"
            >
              <Bell className="h-4 w-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white font-mono-tabular">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => openTransactionModal('expense')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 bg-white h-full flex flex-col justify-between p-4 shadow-xl">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <span className="text-base font-bold text-slate-900">Finora</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Month Selector */}
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Financial Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    {selectableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthLabel(ym)}
                      </option>
                    ))}
                  </select>
                </div>

                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium ${
                          isActive
                            ? 'bg-teal-50 text-teal-800 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.id === 'alerts' && unreadAlertsCount > 0 && (
                          <span className="font-mono-tabular text-xs font-bold text-rose-700">
                            {unreadAlertsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {profile?.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'transactions' && <TransactionsView />}
          {activeTab === 'budgets' && <BudgetsView />}
          {activeTab === 'goals' && <SavingsGoalsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'assistant' && <AIAssistantView />}
          {activeTab === 'alerts' && <AlertsRemindersView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-lg ${
                t.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : t.type === 'info'
                  ? 'border-slate-200 bg-slate-900 text-white'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <FinoraWorkspace />
    </FinanceProvider>
  );
}
