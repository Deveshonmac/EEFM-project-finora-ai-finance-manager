/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Landmark,
  Repeat,
  HeartPulse,
  Scale,
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
  Sun,
  Moon,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { NavigationTab } from './types/finance';
import { AuthScreen, OnboardingWizard } from './components/AuthAndOnboarding';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { LoansView } from './components/LoansView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { HealthScoreView } from './components/HealthScoreView';
import { BalanceSheetView } from './components/BalanceSheetView';
import { ReportsView } from './components/ReportsView';
import { AIAssistantView } from './components/AIAssistantView';
import { AlertsRemindersView } from './components/AlertsRemindersView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { formatMonthLabel, getCurrentYearMonth, getLastNMonths } from './utils/calculations';

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'overview' | 'planning' | 'intelligence' | 'system';
  isAI?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'overview' },
  { id: 'transactions', label: 'Transactions & Accounts', icon: ArrowLeftRight, group: 'overview' },
  { id: 'budgets', label: 'Budgets', icon: PieChart, group: 'planning' },
  { id: 'goals', label: 'Savings Goals', icon: Target, group: 'planning' },
  { id: 'loans', label: 'Loans & Debt', icon: Landmark, group: 'planning' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, group: 'planning' },
  { id: 'health', label: 'Health Score', icon: HeartPulse, group: 'intelligence' },
  { id: 'balancesheet', label: 'Balance Sheet', icon: Scale, group: 'intelligence' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'intelligence' },
  { id: 'assistant', label: 'AI Assistant', icon: Sparkles, group: 'intelligence', isAI: true },
  { id: 'alerts', label: 'Alerts & Reminders', icon: Bell, group: 'system' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'system' },
];

const NAV_GROUPS: Array<{ key: NavItemConfig['group']; title: string }> = [
  { key: 'overview', title: 'Overview' },
  { key: 'planning', title: 'Planning & Obligations' },
  { key: 'intelligence', title: 'Statements & AI' },
  { key: 'system', title: 'Workspace' },
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
    enterDemoMode,
    toasts,
    dismissToast,
    theme,
    toggleTheme,
  } = useFinance();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [syncProlonged, setSyncProlonged] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (dataLoading && !profile) {
      timer = setTimeout(() => {
        setSyncProlonged(true);
      }, 3500);
    } else {
      setSyncProlonged(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [dataLoading, profile]);

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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="liquid-glass px-7 py-6 text-center space-y-2.5">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-slate-300">Initializing Finora...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !isDemoMode) {
    return <AuthScreen />;
  }

  if (dataLoading && !profile) {
    return (
      <div className="min-h-screen flex flex-col p-6 max-w-[1440px] mx-auto space-y-5">
        <div className="h-12 w-full rounded-lg data-surface animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-28 rounded-xl data-surface p-4 space-y-3">
              <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
              <div className="h-7 w-32 rounded bg-slate-800/80 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-slate-800/60 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-md w-full liquid-glass-modal p-6 text-center space-y-3 mt-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-100">
              Synchronizing your financial workspace
            </p>
            <p className="text-xs text-slate-400">
              Loading encrypted account records...
            </p>
          </div>

          {syncProlonged && (
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-400/20">
                Connection is taking longer than usual. You can continue waiting or explore in Demo Mode.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={enterDemoMode}
                  className="flex-1 btn-primary py-2 text-xs"
                >
                  Open Demo Mode
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="flex-1 glass-button-secondary py-2 text-xs text-slate-300 hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
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
    <div className="min-h-screen flex flex-col lg:flex-row text-slate-800 dark:text-slate-100">
      {/* Compact Desktop Sidebar (Selective Liquid Glass Surface) */}
      <aside
        className={`hidden lg:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800/80 liquid-glass-nav transition-all duration-200 shrink-0 sticky top-0 h-screen z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top: Brand + Collapse Button */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 h-14 px-3.5 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white block leading-none">
                    Finora
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Personal Finance</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Grouped Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
            {NAV_GROUPS.map((group) => {
              const items = NAV_ITEMS.filter((i) => i.group === group.key);
              return (
                <div key={group.key} className="space-y-0.5">
                  {!sidebarCollapsed && (
                    <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.title}
                    </p>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isAI = item.isAI;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`group relative w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 whitespace-nowrap shrink-0 ${
                          isActive
                            ? isAI
                              ? 'bg-violet-50 dark:bg-violet-500/[0.12] text-violet-700 dark:text-white font-medium border border-violet-200 dark:border-violet-500/25'
                              : 'bg-slate-100 dark:bg-white/[0.07] text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-white/[0.09]'
                            : 'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100/70 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        {/* Subtle Active Indicator Bar */}
                        {isActive && (
                          <span
                            className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r ${
                              isAI
                                ? 'bg-violet-600 dark:bg-violet-400'
                                : 'bg-emerald-600 dark:bg-emerald-400'
                            }`}
                          />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? isAI
                                  ? 'text-violet-600 dark:text-violet-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                                : isAI
                                ? 'text-violet-500 dark:text-violet-400/75 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                                : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                            }`}
                          />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!sidebarCollapsed && item.id === 'alerts' && unreadAlertsCount > 0 && (
                          <span className="font-mono-tabular rounded bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/25 dark:border-rose-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                            {unreadAlertsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Compact User Profile & Logout */}
        <div className="border-t border-slate-200 dark:border-slate-800/80 p-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] px-2.5 py-2">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 min-w-0 text-left group"
              title="Open Profile Settings"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white truncate transition-colors">
                    {profile?.displayName || 'Finora User'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isDemoMode ? 'Sample Workspace' : profile?.email}
                  </p>
                </div>
              )}
            </button>

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 transition-colors shrink-0"
                title={isDemoMode ? 'Exit Demo Mode' : 'Sign Out'}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Mode Distinguishing Banner */}
        {isDemoMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200/90">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-900 dark:text-amber-100 font-medium">Demo Workspace:</strong> Exploring Finora with sample Indian financial records. Changes are isolated in memory.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={resetDemoData}
                className="font-medium text-amber-700 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
              >
                Reset Sample Data
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-100 hover:bg-amber-500/30 transition-colors"
              >
                Sign In →
              </button>
            </div>
          </div>
        )}

        {/* Simplified Top Navigation Bar (h-14) */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 liquid-glass-nav px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Left: Mobile Menu Button + Clean Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Finora</span>
              <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">/</span>
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{currentNav.label}</span>
            </div>
          </div>

          {/* Right: Period Selector + Theme Toggle + Notification Icon + Prominent Add Transaction Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-1 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="header-month-select"
                aria-label="Select financial period"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white focus:outline-hidden cursor-pointer"
              >
                {selectableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthLabel(ym)}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Light / Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-12" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="relative rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              title="Notifications & Reminders"
            >
              <Bell className="h-4 w-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white font-mono-tabular">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => openTransactionModal('expense')}
              className="inline-flex items-center gap-1.5 btn-primary px-3 py-1.5 text-xs whitespace-nowrap shrink-0 ml-1"
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
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-64 liquid-glass-modal rounded-none h-full flex flex-col justify-between p-4 border-r border-slate-200 dark:border-slate-800">
              <div className="space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <Wallet className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Finora</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Moon className="h-4 w-4 text-slate-700" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-md p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Month Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Financial Period
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full glass-input px-2.5 py-1.5 text-xs font-medium"
                  >
                    {selectableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthLabel(ym)}
                      </option>
                    ))}
                  </select>
                </div>

                <nav className="space-y-3">
                  {NAV_GROUPS.map((group) => (
                    <div key={group.key} className="space-y-0.5">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group.title}
                      </p>
                      {NAV_ITEMS.filter((i) => i.group === group.key).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isAI = item.isAI;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                              isActive
                                ? isAI
                                  ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-200 border border-violet-200 dark:border-violet-500/30'
                                  : 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={`h-4 w-4 ${
                                  isActive
                                    ? isAI
                                      ? 'text-violet-600 dark:text-violet-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                    : isAI
                                    ? 'text-violet-500 dark:text-violet-400/80'
                                    : 'text-slate-400 dark:text-slate-400'
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                            {item.id === 'alerts' && unreadAlertsCount > 0 && (
                              <span className="font-mono-tabular text-xs font-semibold text-rose-600 dark:text-rose-400">
                                {unreadAlertsCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {profile?.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{profile?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Page Viewport with Consistent Spacing */}
        <main className="flex-1 p-4 sm:p-6 lg:px-8 lg:py-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'transactions' && <TransactionsView />}
          {activeTab === 'budgets' && <BudgetsView />}
          {activeTab === 'goals' && <SavingsGoalsView />}
          {activeTab === 'loans' && <LoansView />}
          {activeTab === 'subscriptions' && <SubscriptionsView />}
          {activeTab === 'health' && <HealthScoreView />}
          {activeTab === 'balancesheet' && <BalanceSheetView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'assistant' && <AIAssistantView />}
          {activeTab === 'alerts' && <AlertsRemindersView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal />

      {/* Floating Liquid Glass Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`liquid-glass-modal flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs font-medium transition-all ${
                t.type === 'error'
                  ? 'border-rose-500/35 text-rose-200'
                  : t.type === 'info'
                  ? 'border-slate-500/35 text-slate-100'
                  : 'border-emerald-500/35 text-emerald-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-white transition-colors"
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
