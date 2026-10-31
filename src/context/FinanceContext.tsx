import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isOfflineOrTokenError,
  OperationType,
} from '../firebase';
import { buildDemoDataset } from '../data/demoData';
import {
  Account,
  AccountWithBalance,
  AIConversationMessage,
  AppNotification,
  BalanceSheetItem,
  Budget,
  Category,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  GoalContribution,
  Loan,
  LoanPayment,
  NavigationTab,
  PaymentMethod,
  Reminder,
  SavingsGoal,
  Subscription,
  ThemeMode,
  Transaction,
  TransactionType,
  UserProfile,
} from '../types/finance';
import {
  calculateNextOccurrence,
  computeAccountBalances,
  computeBalanceSheetStatement,
  computeBudgetProgressList,
  computeFinancialHealthScore,
  computeMonthlySummary,
  computeSavingsGoalMetrics,
  computeTotalBalance,
  evaluateSmartNotifications,
  filterTransactionsByMonth,
  formatMonthLabel,
  getAnnualEquivalentCost,
  getCurrencySymbol,
  getCurrentYearMonth,
  getMonthlyEquivalentCost,
  getPreviousYearMonth,
  getTodayISO,
} from '../utils/calculations';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface QuickModalState {
  isOpen: boolean;
  defaultType: TransactionType;
  editingTransaction: Transaction | null;
}

interface PersistedWorkspace {
  profile: UserProfile;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  goalContributions: GoalContribution[];
  reminders: Reminder[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  subscriptions: Subscription[];
  balanceSheetItems: BalanceSheetItem[];
  notifications: AppNotification[];
  aiMessages: AIConversationMessage[];
}

interface FinanceContextValue {
  // Auth & Mode
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  isDemoMode: boolean;
  dataLoading: boolean;
  profile: UserProfile | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedMonth: string;
  setSelectedMonth: (ym: string) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  // Data Collections
  accounts: AccountWithBalance[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  goalContributions: GoalContribution[];
  reminders: Reminder[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  subscriptions: Subscription[];
  balanceSheetItems: BalanceSheetItem[];
  notifications: AppNotification[];
  aiMessages: AIConversationMessage[];

  // Quick Modal & Category Drilldown
  quickModal: QuickModalState;
  openTransactionModal: (type?: TransactionType, txToEdit?: Transaction | null) => void;
  closeTransactionModal: () => void;
  categoryDrilldown: string | null;
  setCategoryDrilldown: (catName: string | null) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Auth Actions
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  resetDemoData: () => void;

  // Profile & Onboarding
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (params: {
    monthlyIncome: number;
    monthlyBudget: number;
    openingBalance: number;
    accountName: string;
    goalName?: string;
    goalTarget?: number;
    goalDate?: string;
    firstTransaction?: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    loadSampleData?: boolean;
  }) => Promise<void>;
  loadSampleDataIntoAccount: () => Promise<void>;
  deleteAllUserData: () => Promise<void>;

  // CRUD: Accounts
  addAccount: (acc: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // CRUD: Categories
  addCategory: (cat: Omit<Category, 'id' | 'userId' | 'isDefault' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;

  // CRUD: Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // CRUD: Budgets
  addBudget: (b: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, b: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  // CRUD: Savings Goals & Contributions
  addSavingsGoal: (g: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSavingsGoal: (id: string, g: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addGoalContribution: (
    c: Omit<GoalContribution, 'id' | 'userId' | 'createdAt'>,
    recordAccountTx?: { accountId: string; paymentMethod: Transaction['paymentMethod'] }
  ) => Promise<void>;

  // CRUD: Reminders
  addReminder: (r: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReminder: (id: string, r: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  postponeReminder: (id: string, days: number) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // CRUD: Loans & Repayments
  addLoan: (l: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (id: string, l: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  recordLoanPayment: (params: {
    loanId: string;
    amount: number;
    principalComponent: number;
    interestComponent: number;
    date: string;
    accountId: string;
    paymentMethod: PaymentMethod;
    notes: string;
    recordInLedger: boolean;
  }) => Promise<void>;

  // CRUD: Subscriptions
  addSubscription: (s: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSubscription: (id: string, s: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toggleSubscriptionStatus: (id: string, status: Subscription['status']) => Promise<void>;
  recordSubscriptionPayment: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;

  // CRUD: Balance Sheet Manual Assets & Liabilities
  addBalanceSheetItem: (item: Omit<BalanceSheetItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBalanceSheetItem: (id: string, item: Omit<BalanceSheetItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteBalanceSheetItem: (id: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;

  // AI Assistant
  aiLoading: boolean;
  aiError: string | null;
  sendAIMessage: (question: string) => Promise<void>;
  clearAIConversation: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function clampStr(val: string | undefined, max: number, fallback = ''): string {
  const s = (val ?? fallback).trim();
  return s.slice(0, max);
}

const LOCAL_STORAGE_PREFIX = 'finora_user_workspace_';

function loadLocalWorkspace(uid: string): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWorkspace;
  } catch {
    return null;
  }
}

function saveLocalWorkspace(uid: string, data: PersistedWorkspace): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${uid}`, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

function clearLocalWorkspace(uid: string): void {
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${uid}`);
  } catch {
    // Ignore errors
  }
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth());
  const [categoryDrilldown, setCategoryDrilldown] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rawAccounts, setRawAccounts] = useState<Account[]>([]);
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [balanceSheetItems, setBalanceSheetItems] = useState<BalanceSheetItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [aiMessages, setAiMessages] = useState<AIConversationMessage[]>([]);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [quickModal, setQuickModal] = useState<QuickModalState>({
    isOpen: false,
    defaultType: 'expense',
    editingTransaction: null,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme Management (Light mode default, persisted in localStorage)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('finora_theme');
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {
        // fallback
      }
    }
    return 'light';
  });

  const applyThemeToDOM = (t: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.setAttribute('data-theme', t);
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem('finora_theme', t);
    } catch {
      // ignore
    }
    applyThemeToDOM(t);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const useLocalStore = isDemoMode || !cloudSyncEnabled;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = genId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openTransactionModal = (
    defaultType: TransactionType = 'expense',
    editingTransaction: Transaction | null = null
  ) => {
    setQuickModal({ isOpen: true, defaultType, editingTransaction });
  };

  const closeTransactionModal = () => {
    setQuickModal((prev) => ({ ...prev, isOpen: false, editingTransaction: null }));
  };

  // Auth listener with pre-flight Token Service API verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setCloudSyncEnabled(false);
        setAuthReady(true);
        return;
      }

      setIsDemoMode(false);
      const uid = user.uid;
      const defaultProfile: UserProfile = {
        uid,
        displayName: clampStr(
          user.displayName || user.email?.split('@')[0] || 'Finora User',
          100,
          'Finora User'
        ),
        email: clampStr(user.email || 'user@finora.app', 254, 'user@finora.app'),
        currency: 'INR',
        onboardingCompleted: false,
        monthlyIncome: 0,
        monthlyBudget: 0,
        financialMonthStartDay: 1,
        lowBalanceThreshold: 1000,
        preferredPeriod: 'this_month',
        notificationPrefs: {
          budgetAlerts: true,
          spendingAlerts: true,
          lowBalanceAlerts: true,
          billReminders: true,
        },
      };

      try {
        await user.getIdToken(true);
        setCloudSyncEnabled(true);
        setFirebaseUser(user);
      } catch (tokenErr) {
        console.warn(
          'Firebase Token Service API unavailable or propagating; using persistent local storage for authenticated user.',
          tokenErr
        );
        setCloudSyncEnabled(false);
        setFirebaseUser(user);

        const cached = loadLocalWorkspace(uid);
        if (cached && cached.profile) {
          setProfile(cached.profile);
          setRawAccounts(cached.accounts || []);
          setRawCategories(cached.categories || []);
          setTransactions(cached.transactions || []);
          setBudgets(cached.budgets || []);
          setSavingsGoals(cached.savingsGoals || []);
          setGoalContributions(cached.goalContributions || []);
          setReminders(cached.reminders || []);
          setLoans(cached.loans || []);
          setLoanPayments(cached.loanPayments || []);
          setSubscriptions(cached.subscriptions || []);
          setBalanceSheetItems(cached.balanceSheetItems || []);
          setNotifications(cached.notifications || []);
          setAiMessages(cached.aiMessages || []);
        } else {
          setProfile(defaultProfile);
          setRawAccounts([]);
          setRawCategories([]);
          setTransactions([]);
          setBudgets([]);
          setSavingsGoals([]);
          setGoalContributions([]);
          setReminders([]);
          setLoans([]);
          setLoanPayments([]);
          setSubscriptions([]);
          setBalanceSheetItems([]);
          setNotifications([]);
          setAiMessages([]);
        }
        setDataLoading(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Automatically persist authenticated user's workspace to localStorage as continuous backup
  useEffect(() => {
    if (!firebaseUser || isDemoMode || !profile) return;
    saveLocalWorkspace(firebaseUser.uid, {
      profile,
      accounts: rawAccounts,
      categories: rawCategories,
      transactions,
      budgets,
      savingsGoals,
      goalContributions,
      reminders,
      loans,
      loanPayments,
      subscriptions,
      balanceSheetItems,
      notifications,
      aiMessages,
    });
  }, [
    firebaseUser,
    isDemoMode,
    profile,
    rawAccounts,
    rawCategories,
    transactions,
    budgets,
    savingsGoals,
    goalContributions,
    reminders,
    loans,
    loanPayments,
    subscriptions,
    balanceSheetItems,
    notifications,
    aiMessages,
  ]);

  // Firestore listeners when authenticated AND cloudSyncEnabled is verified
  useEffect(() => {
    if (!authReady || isDemoMode || !firebaseUser || !cloudSyncEnabled) {
      return;
    }

    let isMounted = true;
    setDataLoading(true);
    const uid = firebaseUser.uid;

    const userDocRef = doc(db, 'users', uid);
    const defaultProfile: UserProfile = {
      uid,
      displayName: clampStr(
        firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Finora User',
        100,
        'Finora User'
      ),
      email: clampStr(firebaseUser.email || 'user@finora.app', 254, 'user@finora.app'),
      currency: 'INR',
      onboardingCompleted: false,
      monthlyIncome: 0,
      monthlyBudget: 0,
      financialMonthStartDay: 1,
      lowBalanceThreshold: 1000,
      preferredPeriod: 'this_month',
      notificationPrefs: {
        budgetAlerts: true,
        spendingAlerts: true,
        lowBalanceAlerts: true,
        billReminders: true,
      },
    };

    const unsubUser = onSnapshot(
      userDocRef,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const cached = loadLocalWorkspace(uid);
          const initialProfile = cached?.profile || defaultProfile;
          setProfile(initialProfile);
          setDoc(userDocRef, {
            ...initialProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            if (isOfflineOrTokenError(err)) {
              setCloudSyncEnabled(false);
            }
          });
        }
        setDataLoading(false);
      },
      (err) => {
        if (isOfflineOrTokenError(err)) {
          if (isMounted) {
            setCloudSyncEnabled(false);
            const cached = loadLocalWorkspace(uid);
            setProfile((prev) => prev || cached?.profile || defaultProfile);
            setDataLoading(false);
          }
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('Missing or insufficient permissions') ||
          (err as { code?: string })?.code === 'permission-denied'
        ) {
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        } else if (isMounted) {
          setProfile((prev) => prev || defaultProfile);
          setDataLoading(false);
        }
      }
    );

    const handleListenerError = (err: unknown, opType: OperationType, path: string) => {
      if (isOfflineOrTokenError(err)) {
        if (isMounted) {
          setCloudSyncEnabled(false);
        }
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Missing or insufficient permissions') ||
        (err as { code?: string })?.code === 'permission-denied'
      ) {
        handleFirestoreError(err, opType, path);
      }
    };

    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', uid));
    const unsubAccounts = onSnapshot(
      qAccounts,
      (snap) => {
        if (!isMounted) return;
        setRawAccounts(snap.docs.map((d) => d.data() as Account));
      },
      (err) => handleListenerError(err, OperationType.LIST, 'accounts')
    );

    const qCategories = query(collection(db, 'categories'), where('userId', '==', uid));
    const unsubCategories = onSnapshot(
      qCategories,
      (snap) => {
        if (!isMounted) return;
        setRawCategories(snap.docs.map((d) => d.data() as Category));
      },
      (err) => handleListenerError(err, OperationType.LIST, 'categories')
    );

    const qTransactions = query(collection(db, 'transactions'), where('userId', '==', uid));
    const unsubTransactions = onSnapshot(
      qTransactions,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as Transaction);
        list.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'transactions')
    );

    const qBudgets = query(collection(db, 'budgets'), where('userId', '==', uid));
    const unsubBudgets = onSnapshot(
      qBudgets,
      (snap) => {
        if (!isMounted) return;
        setBudgets(snap.docs.map((d) => d.data() as Budget));
      },
      (err) => handleListenerError(err, OperationType.LIST, 'budgets')
    );

    const qGoals = query(collection(db, 'savingsGoals'), where('userId', '==', uid));
    const unsubGoals = onSnapshot(
      qGoals,
      (snap) => {
        if (!isMounted) return;
        setSavingsGoals(snap.docs.map((d) => d.data() as SavingsGoal));
      },
      (err) => handleListenerError(err, OperationType.LIST, 'savingsGoals')
    );

    const qContribs = query(collection(db, 'goalContributions'), where('userId', '==', uid));
    const unsubContribs = onSnapshot(
      qContribs,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as GoalContribution);
        list.sort((a, b) => b.date.localeCompare(a.date));
        setGoalContributions(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'goalContributions')
    );

    const qReminders = query(collection(db, 'reminders'), where('userId', '==', uid));
    const unsubReminders = onSnapshot(
      qReminders,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as Reminder);
        list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        setReminders(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'reminders')
    );

    const qLoans = query(collection(db, 'loans'), where('userId', '==', uid));
    const unsubLoans = onSnapshot(
      qLoans,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as Loan);
        list.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
        setLoans(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'loans')
    );

    const qLoanPayments = query(collection(db, 'loanPayments'), where('userId', '==', uid));
    const unsubLoanPayments = onSnapshot(
      qLoanPayments,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as LoanPayment);
        list.sort((a, b) => b.date.localeCompare(a.date));
        setLoanPayments(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'loanPayments')
    );

    const qSubscriptions = query(collection(db, 'subscriptions'), where('userId', '==', uid));
    const unsubSubscriptions = onSnapshot(
      qSubscriptions,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as Subscription);
        list.sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate));
        setSubscriptions(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'subscriptions')
    );

    const qBsItems = query(collection(db, 'balanceSheetItems'), where('userId', '==', uid));
    const unsubBsItems = onSnapshot(
      qBsItems,
      (snap) => {
        if (!isMounted) return;
        setBalanceSheetItems(snap.docs.map((d) => d.data() as BalanceSheetItem));
      },
      (err) => handleListenerError(err, OperationType.LIST, 'balanceSheetItems')
    );

    const qNotifications = query(collection(db, 'notifications'), where('userId', '==', uid));
    const unsubNotifications = onSnapshot(
      qNotifications,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as AppNotification);
        setNotifications(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'notifications')
    );

    const qAi = query(collection(db, 'aiConversations'), where('userId', '==', uid));
    const unsubAi = onSnapshot(
      qAi,
      (snap) => {
        if (!isMounted) return;
        const list = snap.docs.map((d) => d.data() as AIConversationMessage);
        list.sort((a, b) => a.id.localeCompare(b.id));
        setAiMessages(list);
      },
      (err) => handleListenerError(err, OperationType.LIST, 'aiConversations')
    );

    return () => {
      isMounted = false;
      unsubUser();
      unsubAccounts();
      unsubCategories();
      unsubTransactions();
      unsubBudgets();
      unsubGoals();
      unsubContribs();
      unsubReminders();
      unsubLoans();
      unsubLoanPayments();
      unsubSubscriptions();
      unsubBsItems();
      unsubNotifications();
      unsubAi();
    };
  }, [authReady, isDemoMode, firebaseUser, cloudSyncEnabled]);

  // Combine default categories with any user custom categories
  const categories = useMemo(() => {
    const uid = profile?.uid || 'current';
    const defaults: Category[] = [
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
        id: c.id,
        userId: uid,
        name: c.name,
        transactionType: 'income' as const,
        icon: c.icon,
        isDefault: true,
      })),
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        id: c.id,
        userId: uid,
        name: c.name,
        transactionType: 'expense' as const,
        icon: c.icon,
        isDefault: true,
      })),
    ];
    const map = new Map<string, Category>();
    defaults.forEach((c) => map.set(c.name.toLowerCase(), c));
    rawCategories.forEach((c) => map.set(c.name.toLowerCase(), c));
    return Array.from(map.values());
  }, [rawCategories, profile?.uid]);

  // Compute live account balances
  const accounts = useMemo(
    () => computeAccountBalances(rawAccounts, transactions),
    [rawAccounts, transactions]
  );

  // Smart Alert Evaluation & Deduplication (including Loans, Subscriptions, and Goal Milestones)
  const syncedKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!profile || !profile.onboardingCompleted) return;

    const newAlerts = evaluateSmartNotifications({
      userId: profile.uid,
      profile,
      accounts,
      transactions,
      budgets,
      reminders,
      loans,
      subscriptions,
      savingsGoals,
      existingNotifications: notifications,
      selectedMonth,
    }).filter((a) => !syncedKeysRef.current.has(a.deduplicationKey));

    if (newAlerts.length === 0) return;

    newAlerts.forEach((a) => syncedKeysRef.current.add(a.deduplicationKey));

    if (useLocalStore) {
      setNotifications((prev) => {
        const existingSet = new Set(prev.map((n) => n.deduplicationKey));
        const filtered = newAlerts
          .filter((a) => !existingSet.has(a.deduplicationKey))
          .map((a) => ({ ...a, createdAt: new Date().toISOString() }));
        return [...filtered, ...prev];
      });
    } else if (firebaseUser) {
      newAlerts.forEach(async (alertObj) => {
        try {
          await setDoc(doc(db, 'notifications', alertObj.id), {
            ...alertObj,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          if (isOfflineOrTokenError(err)) {
            setCloudSyncEnabled(false);
          }
        }
      });
    }
  }, [
    profile,
    accounts,
    transactions,
    budgets,
    reminders,
    loans,
    subscriptions,
    savingsGoals,
    notifications,
    selectedMonth,
    useLocalStore,
    firebaseUser,
  ]);

  const handleWriteFallback = (
    err: unknown,
    opType: OperationType,
    path: string,
    onFallback: () => void
  ) => {
    if (isOfflineOrTokenError(err)) {
      setCloudSyncEnabled(false);
      onFallback();
      return;
    }
    handleFirestoreError(err, opType, path);
  };

  // Auth Actions
  const enterDemoMode = () => {
    syncedKeysRef.current.clear();
    const demo = buildDemoDataset('demo_user');
    setIsDemoMode(true);
    setProfile(demo.profile);
    setRawAccounts(demo.accounts);
    setRawCategories(demo.categories);
    setTransactions(demo.transactions);
    setBudgets(demo.budgets);
    setSavingsGoals(demo.savingsGoals);
    setGoalContributions(demo.goalContributions);
    setReminders(demo.reminders);
    setLoans(demo.loans);
    setLoanPayments(demo.loanPayments);
    setSubscriptions(demo.subscriptions);
    setBalanceSheetItems(demo.balanceSheetItems);
    setNotifications(demo.notifications);
    setAiMessages(demo.aiMessages);
    setSelectedMonth(getCurrentYearMonth());
    setActiveTab('dashboard');
    showToast('Entered Interactive Demo Mode with sample Indian financial data.', 'info');
  };

  const resetDemoData = () => {
    enterDemoMode();
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    showToast('Signed in successfully with Google.');
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
    showToast('Signed in successfully.');
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch {
        // Ignore if token service API is propagating
      }
    }
    showToast('Account created! Welcome to Finora.');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
    showToast('Password reset link sent to your email.', 'info');
  };

  const logout = async () => {
    syncedKeysRef.current.clear();
    if (isDemoMode) {
      setIsDemoMode(false);
      setProfile(null);
      setRawAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setSavingsGoals([]);
      setGoalContributions([]);
      setReminders([]);
      setLoans([]);
      setLoanPayments([]);
      setSubscriptions([]);
      setBalanceSheetItems([]);
      setNotifications([]);
      setAiMessages([]);
      showToast('Exited Demo Mode.', 'info');
      return;
    }
    await signOut(auth);
    setProfile(null);
    setCloudSyncEnabled(false);
    showToast('Signed out safely.', 'info');
  };

  // Profile & Onboarding
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      ...updates,
      displayName: clampStr(updates.displayName ?? profile.displayName, 100, 'Finora User'),
      currency: clampStr(updates.currency ?? profile.currency, 10, 'INR'),
      preferredPeriod: clampStr(
        updates.preferredPeriod ?? profile.preferredPeriod,
        40,
        'this_month'
      ),
      monthlyIncome: Math.max(0, Number(updates.monthlyIncome ?? profile.monthlyIncome) || 0),
      monthlyBudget: Math.max(0, Number(updates.monthlyBudget ?? profile.monthlyBudget) || 0),
      financialMonthStartDay: Math.min(
        28,
        Math.max(1, Number(updates.financialMonthStartDay ?? profile.financialMonthStartDay) || 1)
      ),
      lowBalanceThreshold: Math.max(
        0,
        Number(updates.lowBalanceThreshold ?? profile.lowBalanceThreshold) || 0
      ),
      notificationPrefs: updates.notificationPrefs ?? profile.notificationPrefs,
    };

    const applyLocal = () => {
      setProfile(updated);
      showToast(isDemoMode ? 'Preferences updated in Demo Mode.' : 'Preferences saved.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    const path = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: updated.displayName,
        currency: updated.currency,
        onboardingCompleted: updated.onboardingCompleted,
        monthlyIncome: updated.monthlyIncome,
        monthlyBudget: updated.monthlyBudget,
        financialMonthStartDay: updated.financialMonthStartDay,
        lowBalanceThreshold: updated.lowBalanceThreshold,
        preferredPeriod: updated.preferredPeriod,
        notificationPrefs: updated.notificationPrefs,
        updatedAt: serverTimestamp(),
      });
      showToast('Preferences saved.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, path, applyLocal);
    }
  };

  const loadSampleDataIntoAccount = async () => {
    if (!profile) return;
    if (isDemoMode) {
      resetDemoData();
      return;
    }
    const uid = profile.uid;
    const demo = buildDemoDataset(uid);

    const applyLocal = () => {
      setProfile({
        ...profile,
        onboardingCompleted: true,
        monthlyIncome: demo.profile.monthlyIncome,
        monthlyBudget: demo.profile.monthlyBudget,
        lowBalanceThreshold: demo.profile.lowBalanceThreshold,
      });
      setRawAccounts(demo.accounts);
      setRawCategories(demo.categories);
      setTransactions(demo.transactions);
      setBudgets(demo.budgets);
      setSavingsGoals(demo.savingsGoals);
      setGoalContributions(demo.goalContributions);
      setReminders(demo.reminders);
      setLoans(demo.loans);
      setLoanPayments(demo.loanPayments);
      setSubscriptions(demo.subscriptions);
      setBalanceSheetItems(demo.balanceSheetItems);
      setNotifications(demo.notifications);
      setAiMessages(demo.aiMessages);
      showToast('Sample Indian financial data loaded into your account!');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        onboardingCompleted: true,
        monthlyIncome: demo.profile.monthlyIncome,
        monthlyBudget: demo.profile.monthlyBudget,
        lowBalanceThreshold: demo.profile.lowBalanceThreshold,
        updatedAt: serverTimestamp(),
      });

      for (const acc of demo.accounts) {
        const id = `${acc.id}_${uid.slice(0, 6)}`;
        batch.set(doc(db, 'accounts', id), {
          ...acc,
          id,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const tx of demo.transactions) {
        const id = `${tx.id}_${uid.slice(0, 6)}`;
        const accountId = `${tx.accountId}_${uid.slice(0, 6)}`;
        const destinationAccountId = tx.destinationAccountId
          ? `${tx.destinationAccountId}_${uid.slice(0, 6)}`
          : '';
        batch.set(doc(db, 'transactions', id), {
          ...tx,
          id,
          userId: uid,
          accountId,
          destinationAccountId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const b of demo.budgets) {
        const id = `${b.id}_${uid.slice(0, 6)}`;
        batch.set(doc(db, 'budgets', id), {
          ...b,
          id,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const g of demo.savingsGoals) {
        const id = `${g.id}_${uid.slice(0, 6)}`;
        batch.set(doc(db, 'savingsGoals', id), {
          ...g,
          id,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const r of demo.reminders) {
        const id = `${r.id}_${uid.slice(0, 6)}`;
        batch.set(doc(db, 'reminders', id), {
          ...r,
          id,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const l of demo.loans) {
        const id = `${l.id}_${uid.slice(0, 6)}`;
        const linkedAccountId = l.linkedAccountId ? `${l.linkedAccountId}_${uid.slice(0, 6)}` : '';
        batch.set(doc(db, 'loans', id), {
          ...l,
          id,
          userId: uid,
          linkedAccountId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const sub of demo.subscriptions) {
        const id = `${sub.id}_${uid.slice(0, 6)}`;
        const accountId = sub.accountId ? `${sub.accountId}_${uid.slice(0, 6)}` : '';
        batch.set(doc(db, 'subscriptions', id), {
          ...sub,
          id,
          userId: uid,
          accountId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const item of demo.balanceSheetItems) {
        const id = `${item.id}_${uid.slice(0, 6)}`;
        batch.set(doc(db, 'balanceSheetItems', id), {
          ...item,
          id,
          userId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      showToast('Sample Indian financial data loaded into your account!');
    } catch (err) {
      handleWriteFallback(err, OperationType.WRITE, 'batch_sample_data', applyLocal);
    }
  };

  const completeOnboarding = async (params: {
    monthlyIncome: number;
    monthlyBudget: number;
    openingBalance: number;
    accountName: string;
    goalName?: string;
    goalTarget?: number;
    goalDate?: string;
    firstTransaction?: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    loadSampleData?: boolean;
  }) => {
    if (!profile) return;
    if (params.loadSampleData) {
      await loadSampleDataIntoAccount();
      return;
    }

    const uid = profile.uid;
    const accId = genId('acc');
    const ym = getCurrentYearMonth();

    const newAccount: Account = {
      id: accId,
      userId: uid,
      name: clampStr(params.accountName || 'Primary Bank Account', 100, 'Primary Bank Account'),
      accountType: 'Bank Account',
      openingBalance: Number(params.openingBalance) || 0,
      currency: profile.currency || 'INR',
    };

    const newBudget: Budget | null =
      params.monthlyBudget > 0
        ? {
            id: genId('budget'),
            userId: uid,
            name: 'Monthly Spending Budget',
            amount: Number(params.monthlyBudget),
            categoryId: 'OVERALL',
            categoryName: 'Overall Monthly Budget',
            periodStart: `${ym}-01`,
            periodEnd: `${ym}-31`,
            budgetMonth: ym,
            description: 'Configured during onboarding',
          }
        : null;

    const newGoal: SavingsGoal | null =
      params.goalName && params.goalTarget && params.goalTarget > 0
        ? {
            id: genId('goal'),
            userId: uid,
            name: clampStr(params.goalName, 100),
            targetAmount: Number(params.goalTarget),
            currentSavedAmount: 0,
            targetDate: params.goalDate || `${ym}-28`,
            description: 'Primary financial goal',
            icon: 'Target',
          }
        : null;

    const newTx: Transaction | null =
      params.firstTransaction && params.firstTransaction.amount > 0
        ? {
            ...params.firstTransaction,
            id: genId('tx'),
            userId: uid,
            accountId: accId,
            destinationAccountId: '',
            description: clampStr(params.firstTransaction.description, 200, 'Initial Transaction'),
            notes: clampStr(params.firstTransaction.notes, 500, ''),
            tags: (params.firstTransaction.tags || []).slice(0, 10),
          }
        : null;

    const applyLocal = () => {
      setProfile({
        ...profile,
        onboardingCompleted: true,
        monthlyIncome: Math.max(0, Number(params.monthlyIncome) || 0),
        monthlyBudget: Math.max(0, Number(params.monthlyBudget) || 0),
      });
      setRawAccounts((prev) => [...prev, newAccount]);
      if (newBudget) setBudgets((prev) => [...prev, newBudget]);
      if (newGoal) setSavingsGoals((prev) => [...prev, newGoal]);
      if (newTx) setTransactions((prev) => [newTx, ...prev]);
      showToast('Onboarding completed! Welcome to Finora.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        onboardingCompleted: true,
        monthlyIncome: Math.max(0, Number(params.monthlyIncome) || 0),
        monthlyBudget: Math.max(0, Number(params.monthlyBudget) || 0),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'accounts', accId), {
        ...newAccount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (newBudget) {
        batch.set(doc(db, 'budgets', newBudget.id), {
          ...newBudget,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (newGoal) {
        batch.set(doc(db, 'savingsGoals', newGoal.id), {
          ...newGoal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (newTx) {
        batch.set(doc(db, 'transactions', newTx.id), {
          ...newTx,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      showToast('Onboarding completed! Welcome to Finora.');
    } catch (err) {
      handleWriteFallback(err, OperationType.WRITE, 'onboarding_batch', applyLocal);
    }
  };

  // Account CRUD
  const addAccount = async (acc: Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!profile) return;
    const id = genId('acc');
    const record: Account = {
      id,
      userId: profile.uid,
      name: clampStr(acc.name, 100, 'Account'),
      accountType: acc.accountType,
      openingBalance: Number(acc.openingBalance) || 0,
      currency: clampStr(acc.currency || profile.currency, 10, 'INR'),
    };
    const applyLocal = () => {
      setRawAccounts((prev) => [...prev, record]);
      showToast(`Account "${record.name}" added.`);
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await setDoc(doc(db, 'accounts', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Account "${record.name}" added.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `accounts/${id}`, applyLocal);
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!profile) return;
    const existingAcc = rawAccounts.find((a) => a.id === id);
    if (!existingAcc) return;
    const updated: Account = {
      ...existingAcc,
      name: clampStr(updates.name ?? existingAcc.name, 100, existingAcc.name),
      accountType: updates.accountType ?? existingAcc.accountType,
      openingBalance: Number(updates.openingBalance ?? existingAcc.openingBalance) || 0,
      currency: clampStr(updates.currency ?? existingAcc.currency, 10, 'INR'),
    };
    const applyLocal = () => {
      setRawAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast('Account updated.');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await updateDoc(doc(db, 'accounts', id), {
        name: updated.name,
        accountType: updated.accountType,
        openingBalance: updated.openingBalance,
        currency: updated.currency,
        updatedAt: serverTimestamp(),
      });
      showToast('Account updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `accounts/${id}`, applyLocal);
    }
  };

  const deleteAccount = async (id: string) => {
    const applyLocal = () => {
      setRawAccounts((prev) => prev.filter((a) => a.id !== id));
      showToast('Account deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'accounts', id));
      showToast('Account deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `accounts/${id}`, applyLocal);
    }
  };

  // Category CRUD
  const addCategory = async (
    cat: Omit<Category, 'id' | 'userId' | 'isDefault' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> => {
    const uid = profile?.uid || 'demo_user';
    const id = genId('cat');
    const record: Category = {
      id,
      userId: uid,
      name: clampStr(cat.name, 80, 'Custom Category'),
      transactionType: cat.transactionType,
      icon: clampStr(cat.icon || 'Tag', 50, 'Tag'),
      isDefault: false,
    };
    const applyLocal = () => {
      setRawCategories((prev) => [...prev, record]);
      showToast(`Category "${record.name}" created.`);
    };
    if (useLocalStore) {
      applyLocal();
      return record;
    }
    try {
      await setDoc(doc(db, 'categories', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Category "${record.name}" created.`);
      return record;
    } catch (err) {
      if (isOfflineOrTokenError(err)) {
        setCloudSyncEnabled(false);
        applyLocal();
        return record;
      }
      handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    const applyLocal = () => {
      setRawCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Custom category removed.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      showToast('Custom category removed.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `categories/${id}`, applyLocal);
    }
  };

  // Transaction CRUD
  const addTransaction = async (
    tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const id = genId('tx');
    const cleanTags = (tx.tags || [])
      .map((t) => clampStr(t, 40))
      .filter(Boolean)
      .slice(0, 10);

    let targetAccountId = tx.accountId;
    if (!targetAccountId && rawAccounts.length === 0) {
      const defaultAccId = genId('acc');
      const defaultAcc: Account = {
        id: defaultAccId,
        userId: profile.uid,
        name: 'Primary Bank Account',
        accountType: 'Bank Account',
        openingBalance: 0,
        currency: profile.currency || 'INR',
      };
      if (useLocalStore) {
        setRawAccounts([defaultAcc]);
      } else {
        try {
          await setDoc(doc(db, 'accounts', defaultAccId), {
            ...defaultAcc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          if (isOfflineOrTokenError(err)) {
            setCloudSyncEnabled(false);
            setRawAccounts([defaultAcc]);
          }
        }
      }
      targetAccountId = defaultAccId;
    }

    const record: Transaction = {
      id,
      userId: profile.uid,
      type: tx.type,
      amount: Math.abs(Number(tx.amount)),
      description: clampStr(tx.description, 200, 'Transaction'),
      categoryId: clampStr(
        tx.type === 'transfer' ? 'TRANSFER' : tx.categoryId,
        128,
        'cat_exp_other'
      ),
      categoryName: clampStr(
        tx.type === 'transfer' ? 'Account Transfer' : tx.categoryName,
        100,
        'Other'
      ),
      accountId: clampStr(targetAccountId, 128),
      destinationAccountId:
        tx.type === 'transfer' ? clampStr(tx.destinationAccountId, 128) : '',
      paymentMethod: tx.paymentMethod,
      date: clampStr(tx.date, 30),
      notes: clampStr(tx.notes, 500, ''),
      tags: cleanTags,
    };

    const applyLocal = () => {
      setTransactions((prev) =>
        [record, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
      showToast('Transaction recorded.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'transactions', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('Transaction recorded.');
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `transactions/${id}`, applyLocal);
    }
  };

  const updateTransaction = async (
    id: string,
    tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const cleanTags = (tx.tags || [])
      .map((t) => clampStr(t, 40))
      .filter(Boolean)
      .slice(0, 10);

    const updatedFields = {
      type: tx.type,
      amount: Math.abs(Number(tx.amount)),
      description: clampStr(tx.description, 200, 'Transaction'),
      categoryId: clampStr(
        tx.type === 'transfer' ? 'TRANSFER' : tx.categoryId,
        128,
        'cat_exp_other'
      ),
      categoryName: clampStr(
        tx.type === 'transfer' ? 'Account Transfer' : tx.categoryName,
        100,
        'Other'
      ),
      accountId: clampStr(tx.accountId, 128),
      destinationAccountId:
        tx.type === 'transfer' ? clampStr(tx.destinationAccountId, 128) : '',
      paymentMethod: tx.paymentMethod,
      date: clampStr(tx.date, 30),
      notes: clampStr(tx.notes, 500, ''),
      tags: cleanTags,
    };

    const applyLocal = () => {
      setTransactions((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
          .sort((a, b) => b.date.localeCompare(a.date))
      );
      showToast('Transaction updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'transactions', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Transaction updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `transactions/${id}`, applyLocal);
    }
  };

  const deleteTransaction = async (id: string) => {
    const applyLocal = () => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast('Transaction deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'transactions', id));
      showToast('Transaction deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `transactions/${id}`, applyLocal);
    }
  };

  // Budget CRUD
  const addBudget = async (b: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!profile) return;
    const duplicate = budgets.find(
      (item) => item.budgetMonth === b.budgetMonth && item.categoryId === b.categoryId
    );
    if (duplicate) {
      await updateBudget(duplicate.id, b);
      return;
    }

    const id = genId('budget');
    const record: Budget = {
      id,
      userId: profile.uid,
      name: clampStr(b.name, 100, 'Monthly Budget'),
      amount: Math.abs(Number(b.amount)),
      categoryId: clampStr(b.categoryId, 128, 'OVERALL'),
      categoryName: clampStr(b.categoryName, 100, 'Overall Monthly Budget'),
      periodStart: clampStr(b.periodStart || `${b.budgetMonth}-01`, 30),
      periodEnd: clampStr(b.periodEnd || `${b.budgetMonth}-31`, 30),
      budgetMonth: clampStr(b.budgetMonth, 20),
      description: clampStr(b.description, 300, ''),
    };

    const applyLocal = () => {
      setBudgets((prev) => [...prev, record]);
      showToast(`Budget "${record.name}" saved.`);
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'budgets', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Budget "${record.name}" saved.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `budgets/${id}`, applyLocal);
    }
  };

  const updateBudget = async (
    id: string,
    b: Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      name: clampStr(b.name, 100, 'Monthly Budget'),
      amount: Math.abs(Number(b.amount)),
      categoryId: clampStr(b.categoryId, 128, 'OVERALL'),
      categoryName: clampStr(b.categoryName, 100, 'Overall Monthly Budget'),
      periodStart: clampStr(b.periodStart || `${b.budgetMonth}-01`, 30),
      periodEnd: clampStr(b.periodEnd || `${b.budgetMonth}-31`, 30),
      budgetMonth: clampStr(b.budgetMonth, 20),
      description: clampStr(b.description, 300, ''),
    };

    const applyLocal = () => {
      setBudgets((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
      );
      showToast('Budget updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'budgets', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Budget updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `budgets/${id}`, applyLocal);
    }
  };

  const deleteBudget = async (id: string) => {
    const applyLocal = () => {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      showToast('Budget deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'budgets', id));
      showToast('Budget deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `budgets/${id}`, applyLocal);
    }
  };

  // Savings Goals & Contributions
  const addSavingsGoal = async (
    g: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const id = genId('goal');
    const record: SavingsGoal = {
      id,
      userId: profile.uid,
      name: clampStr(g.name, 100, 'Savings Goal'),
      targetAmount: Math.abs(Number(g.targetAmount)),
      currentSavedAmount: Math.max(0, Number(g.currentSavedAmount) || 0),
      targetDate: clampStr(g.targetDate, 30),
      description: clampStr(g.description, 300, ''),
      icon: clampStr(g.icon || 'Target', 50, 'Target'),
    };

    const applyLocal = () => {
      setSavingsGoals((prev) => [...prev, record]);
      showToast(`Savings goal "${record.name}" created.`);
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'savingsGoals', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Savings goal "${record.name}" created.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `savingsGoals/${id}`, applyLocal);
    }
  };

  const updateSavingsGoal = async (
    id: string,
    g: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      name: clampStr(g.name, 100, 'Savings Goal'),
      targetAmount: Math.abs(Number(g.targetAmount)),
      currentSavedAmount: Math.max(0, Number(g.currentSavedAmount) || 0),
      targetDate: clampStr(g.targetDate, 30),
      description: clampStr(g.description, 300, ''),
      icon: clampStr(g.icon || 'Target', 50, 'Target'),
    };

    const applyLocal = () => {
      setSavingsGoals((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
      );
      showToast('Savings goal updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'savingsGoals', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Savings goal updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `savingsGoals/${id}`, applyLocal);
    }
  };

  const deleteSavingsGoal = async (id: string) => {
    const applyLocal = () => {
      setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
      setGoalContributions((prev) => prev.filter((c) => c.goalId !== id));
      showToast('Savings goal deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'savingsGoals', id));
      showToast('Savings goal deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `savingsGoals/${id}`, applyLocal);
    }
  };

  const addGoalContribution = async (
    c: Omit<GoalContribution, 'id' | 'userId' | 'createdAt'>,
    recordAccountTx?: { accountId: string; paymentMethod: Transaction['paymentMethod'] }
  ) => {
    if (!profile) return;
    const goal = savingsGoals.find((g) => g.id === c.goalId);
    if (!goal) return;

    const id = genId('gc');
    const amount = Math.abs(Number(c.amount));
    const newSavedAmount =
      c.type === 'contribution'
        ? goal.currentSavedAmount + amount
        : Math.max(0, goal.currentSavedAmount - amount);

    const contribRecord: GoalContribution = {
      id,
      userId: profile.uid,
      goalId: c.goalId,
      amount,
      type: c.type,
      date: clampStr(c.date, 30),
      notes: clampStr(c.notes, 300, ''),
    };

    const applyLocal = async () => {
      setGoalContributions((prev) => [contribRecord, ...prev]);
      setSavingsGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, currentSavedAmount: newSavedAmount } : g))
      );
      if (recordAccountTx && recordAccountTx.accountId) {
        await addTransaction({
          type: c.type === 'contribution' ? 'expense' : 'income',
          amount,
          description: `${
            c.type === 'contribution' ? 'Savings Allocation' : 'Savings Withdrawal'
          }: ${goal.name}`,
          categoryId: c.type === 'contribution' ? 'cat_exp_other' : 'cat_inc_other',
          categoryName: c.type === 'contribution' ? 'Other Expenses' : 'Other Income',
          accountId: recordAccountTx.accountId,
          destinationAccountId: '',
          paymentMethod: recordAccountTx.paymentMethod,
          date: c.date,
          notes: c.notes || `Linked to goal: ${goal.name}`,
          tags: ['savings-goal'],
        });
      }
      showToast(
        c.type === 'contribution'
          ? 'Contribution added to savings goal.'
          : 'Withdrawal recorded from savings goal.'
      );
    };

    if (useLocalStore) {
      await applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'goalContributions', id), {
        ...contribRecord,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'savingsGoals', goal.id), {
        currentSavedAmount: newSavedAmount,
        updatedAt: serverTimestamp(),
      });
      if (recordAccountTx && recordAccountTx.accountId) {
        await addTransaction({
          type: c.type === 'contribution' ? 'expense' : 'income',
          amount,
          description: `${
            c.type === 'contribution' ? 'Savings Allocation' : 'Savings Withdrawal'
          }: ${goal.name}`,
          categoryId: c.type === 'contribution' ? 'cat_exp_other' : 'cat_inc_other',
          categoryName: c.type === 'contribution' ? 'Other Expenses' : 'Other Income',
          accountId: recordAccountTx.accountId,
          destinationAccountId: '',
          paymentMethod: recordAccountTx.paymentMethod,
          date: c.date,
          notes: c.notes || `Linked to goal: ${goal.name}`,
          tags: ['savings-goal'],
        });
      }
      showToast(
        c.type === 'contribution'
          ? 'Contribution added to savings goal.'
          : 'Withdrawal recorded from savings goal.'
      );
    } catch (err) {
      if (isOfflineOrTokenError(err)) {
        setCloudSyncEnabled(false);
        await applyLocal();
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `goalContributions/${id}`);
    }
  };

  // Reminders CRUD
  const addReminder = async (r: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!profile) return;
    const id = genId('rem');
    const record: Reminder = {
      id,
      userId: profile.uid,
      title: clampStr(r.title, 120, 'Payment Reminder'),
      amount: Math.max(0, Number(r.amount) || 0),
      dueDate: clampStr(r.dueDate, 30),
      category: clampStr(r.category, 80, 'Other Recurring Payment'),
      recurrence: r.recurrence,
      notes: clampStr(r.notes, 300, ''),
      notifyInApp: Boolean(r.notifyInApp),
      completed: Boolean(r.completed),
      nextOccurrence: clampStr(
        r.nextOccurrence || calculateNextOccurrence(r.dueDate, r.recurrence),
        30
      ),
    };

    const applyLocal = () => {
      setReminders((prev) => [...prev, record].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      showToast(`Reminder "${record.title}" scheduled.`);
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'reminders', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Reminder "${record.title}" scheduled.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `reminders/${id}`, applyLocal);
    }
  };

  const updateReminder = async (
    id: string,
    r: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      title: clampStr(r.title, 120, 'Payment Reminder'),
      amount: Math.max(0, Number(r.amount) || 0),
      dueDate: clampStr(r.dueDate, 30),
      category: clampStr(r.category, 80, 'Other Recurring Payment'),
      recurrence: r.recurrence,
      notes: clampStr(r.notes, 300, ''),
      notifyInApp: Boolean(r.notifyInApp),
      completed: Boolean(r.completed),
      nextOccurrence: clampStr(
        r.nextOccurrence || calculateNextOccurrence(r.dueDate, r.recurrence),
        30
      ),
    };

    const applyLocal = () => {
      setReminders((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      );
      showToast('Reminder updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'reminders', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Reminder updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `reminders/${id}`, applyLocal);
    }
  };

  const toggleReminderCompleted = async (id: string) => {
    const rem = reminders.find((r) => r.id === id);
    if (!rem) return;

    if (!rem.completed && rem.recurrence !== 'none') {
      const nextDue = calculateNextOccurrence(rem.dueDate, rem.recurrence);
      const furtherNext = calculateNextOccurrence(nextDue, rem.recurrence);
      await updateReminder(id, {
        ...rem,
        dueDate: nextDue,
        nextOccurrence: furtherNext,
        completed: false,
      });
      showToast(`Marked paid! Next ${rem.recurrence} due date advanced to ${nextDue}.`);
      return;
    }

    await updateReminder(id, {
      ...rem,
      completed: !rem.completed,
    });
  };

  const postponeReminder = async (id: string, days: number) => {
    const rem = reminders.find((r) => r.id === id);
    if (!rem) return;
    const parts = rem.dueDate.split('-').map(Number);
    const d =
      parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(rem.dueDate);
    d.setDate(d.getDate() + days);
    const newDue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    await updateReminder(id, {
      ...rem,
      dueDate: newDue,
      nextOccurrence: calculateNextOccurrence(newDue, rem.recurrence),
    });
    showToast(`Reminder postponed by ${days} days to ${newDue}.`, 'info');
  };

  const deleteReminder = async (id: string) => {
    const applyLocal = () => {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      showToast('Reminder deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'reminders', id));
      showToast('Reminder deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `reminders/${id}`, applyLocal);
    }
  };

  // ============================================================================
  // 9. LOANS & DEBT CRUD + REPAYMENT RECORDING
  // ============================================================================

  const addLoan = async (l: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!profile) return;
    const id = genId('loan');
    const record: Loan = {
      id,
      userId: profile.uid,
      name: clampStr(l.name, 120, 'Loan'),
      lender: clampStr(l.lender, 100, ''),
      category: l.category,
      originalAmount: Math.max(1, Number(l.originalAmount) || 0),
      outstandingPrincipal: Math.max(0, Number(l.outstandingPrincipal) || 0),
      interestRate: Math.min(100, Math.max(0, Number(l.interestRate) || 0)),
      tenureMonths: Math.min(600, Math.max(1, Math.round(Number(l.tenureMonths) || 12))),
      emiAmount: Math.max(0, Number(l.emiAmount) || 0),
      startDate: clampStr(l.startDate, 30, getTodayISO()),
      nextDueDate: clampStr(l.nextDueDate, 30, getTodayISO()),
      linkedAccountId: clampStr(l.linkedAccountId, 128, ''),
      status: l.outstandingPrincipal <= 0 ? 'closed' : l.status || 'active',
      notes: clampStr(l.notes, 500, ''),
    };

    const applyLocal = () => {
      setLoans((prev) =>
        [...prev, record].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      );
      showToast(`Loan "${record.name}" added to Debt Manager.`);
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'loans', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Loan "${record.name}" added to Debt Manager.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `loans/${id}`, applyLocal);
    }
  };

  const updateLoan = async (
    id: string,
    l: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      name: clampStr(l.name, 120, 'Loan'),
      lender: clampStr(l.lender, 100, ''),
      category: l.category,
      originalAmount: Math.max(1, Number(l.originalAmount) || 0),
      outstandingPrincipal: Math.max(0, Number(l.outstandingPrincipal) || 0),
      interestRate: Math.min(100, Math.max(0, Number(l.interestRate) || 0)),
      tenureMonths: Math.min(600, Math.max(1, Math.round(Number(l.tenureMonths) || 12))),
      emiAmount: Math.max(0, Number(l.emiAmount) || 0),
      startDate: clampStr(l.startDate, 30, getTodayISO()),
      nextDueDate: clampStr(l.nextDueDate, 30, getTodayISO()),
      linkedAccountId: clampStr(l.linkedAccountId, 128, ''),
      status: (l.outstandingPrincipal <= 0 ? 'closed' : l.status) as 'active' | 'closed',
      notes: clampStr(l.notes, 500, ''),
    };

    const applyLocal = () => {
      setLoans((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
          .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      );
      showToast('Loan details updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'loans', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Loan details updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `loans/${id}`, applyLocal);
    }
  };

  const deleteLoan = async (id: string) => {
    const applyLocal = () => {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      setLoanPayments((prev) => prev.filter((p) => p.loanId !== id));
      showToast('Loan record deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'loans', id));
      showToast('Loan record deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `loans/${id}`, applyLocal);
    }
  };

  const recordLoanPayment = async (params: {
    loanId: string;
    amount: number;
    principalComponent: number;
    interestComponent: number;
    date: string;
    accountId: string;
    paymentMethod: PaymentMethod;
    notes: string;
    recordInLedger: boolean;
  }) => {
    if (!profile) return;
    const loan = loans.find((l) => l.id === params.loanId);
    if (!loan) return;

    const paymentId = genId('lp');
    const amount = Math.abs(Number(params.amount));
    const principalComponent = Math.min(
      loan.outstandingPrincipal,
      Math.max(0, Number(params.principalComponent))
    );
    const interestComponent = Math.max(0, Number(params.interestComponent));
    const remainingBalanceAfter = Math.max(0, loan.outstandingPrincipal - principalComponent);
    const nextDueDate =
      remainingBalanceAfter <= 0
        ? loan.nextDueDate
        : calculateNextOccurrence(loan.nextDueDate, 'monthly');
    const newStatus: 'active' | 'closed' = remainingBalanceAfter <= 0 ? 'closed' : 'active';

    const paymentRecord: LoanPayment = {
      id: paymentId,
      userId: profile.uid,
      loanId: loan.id,
      amount,
      principalComponent,
      interestComponent,
      remainingBalanceAfter,
      date: clampStr(params.date, 30, getTodayISO()),
      accountId: clampStr(params.accountId, 128, ''),
      paymentMethod: params.paymentMethod,
      notes: clampStr(params.notes, 300, ''),
    };

    const recordLedgerEntries = async () => {
      if (!params.recordInLedger || !params.accountId) return;
      // Record Principal Repayment & Interest Expense distinctly so reports & ledger show exact breakdown
      if (principalComponent > 0) {
        await addTransaction({
          type: 'expense',
          amount: principalComponent,
          description: `Loan Principal Repayment: ${loan.name}`,
          categoryId: 'cat_exp_loan_emi',
          categoryName: 'Loan & Debt Repayment',
          accountId: params.accountId,
          destinationAccountId: '',
          paymentMethod: params.paymentMethod,
          date: params.date,
          notes: `Principal repayment toward ${loan.name}. Remaining principal: ₹${remainingBalanceAfter.toLocaleString(
            'en-IN'
          )}`,
          tags: ['loan-principal', 'emi'],
        });
      }
      if (interestComponent > 0) {
        await addTransaction({
          type: 'expense',
          amount: interestComponent,
          description: `Loan Interest Expense: ${loan.name}`,
          categoryId: 'cat_exp_loan_interest',
          categoryName: 'Loan Interest Charges',
          accountId: params.accountId,
          destinationAccountId: '',
          paymentMethod: params.paymentMethod,
          date: params.date,
          notes: `Interest charge on ${loan.name} (${loan.interestRate}% p.a.)`,
          tags: ['loan-interest', 'emi'],
        });
      }
    };

    const applyLocal = async () => {
      setLoanPayments((prev) =>
        [paymentRecord, ...prev].sort((a, b) => b.date.localeCompare(a.date))
      );
      setLoans((prev) =>
        prev.map((l) =>
          l.id === loan.id
            ? {
                ...l,
                outstandingPrincipal: remainingBalanceAfter,
                nextDueDate,
                status: newStatus,
              }
            : l
        )
      );
      await recordLedgerEntries();
      showToast(
        remainingBalanceAfter <= 0
          ? `Loan "${loan.name}" is now fully paid off!`
          : `EMI payment recorded (Principal: ₹${principalComponent.toLocaleString(
              'en-IN'
            )}, Interest: ₹${interestComponent.toLocaleString('en-IN')}).`
      );
    };

    if (useLocalStore) {
      await applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'loanPayments', paymentId), {
        ...paymentRecord,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'loans', loan.id), {
        outstandingPrincipal: remainingBalanceAfter,
        nextDueDate,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      await recordLedgerEntries();
      showToast(
        remainingBalanceAfter <= 0
          ? `Loan "${loan.name}" is now fully paid off!`
          : `EMI payment recorded (Principal: ₹${principalComponent.toLocaleString(
              'en-IN'
            )}, Interest: ₹${interestComponent.toLocaleString('en-IN')}).`
      );
    } catch (err) {
      if (isOfflineOrTokenError(err)) {
        setCloudSyncEnabled(false);
        await applyLocal();
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, `loanPayments/${paymentId}`);
    }
  };

  // ============================================================================
  // 11. SUBSCRIPTION MANAGER CRUD + RENEWAL RECORDING
  // ============================================================================

  const addSubscription = async (
    s: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const id = genId('sub');
    const record: Subscription = {
      id,
      userId: profile.uid,
      name: clampStr(s.name, 120, 'Subscription'),
      category: s.category,
      amount: Math.max(1, Number(s.amount) || 0),
      frequency: s.frequency,
      nextRenewalDate: clampStr(s.nextRenewalDate, 30, getTodayISO()),
      accountId: clampStr(s.accountId, 128, ''),
      paymentMethod: s.paymentMethod,
      status: s.status || 'active',
      autoRenew: Boolean(s.autoRenew),
      notes: clampStr(s.notes, 300, ''),
    };

    const applyLocal = () => {
      setSubscriptions((prev) =>
        [...prev, record].sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate))
      );
      showToast(`Subscription "${record.name}" added.`);
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'subscriptions', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Subscription "${record.name}" added.`);
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `subscriptions/${id}`, applyLocal);
    }
  };

  const updateSubscription = async (
    id: string,
    s: Omit<Subscription, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      name: clampStr(s.name, 120, 'Subscription'),
      category: s.category,
      amount: Math.max(1, Number(s.amount) || 0),
      frequency: s.frequency,
      nextRenewalDate: clampStr(s.nextRenewalDate, 30, getTodayISO()),
      accountId: clampStr(s.accountId, 128, ''),
      paymentMethod: s.paymentMethod,
      status: s.status,
      autoRenew: Boolean(s.autoRenew),
      notes: clampStr(s.notes, 300, ''),
    };

    const applyLocal = () => {
      setSubscriptions((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
          .sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate))
      );
      showToast('Subscription updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'subscriptions', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Subscription updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `subscriptions/${id}`, applyLocal);
    }
  };

  const toggleSubscriptionStatus = async (id: string, status: Subscription['status']) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    await updateSubscription(id, { ...sub, status });
  };

  const recordSubscriptionPayment = async (id: string) => {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;

    const targetAccount = sub.accountId || rawAccounts[0]?.id || '';
    const nextRenewal = calculateNextOccurrence(sub.nextRenewalDate, sub.frequency);

    await addTransaction({
      type: 'expense',
      amount: sub.amount,
      description: `${sub.name} (${sub.frequency} subscription)`,
      categoryId: 'cat_exp_subscriptions',
      categoryName: 'Subscriptions',
      accountId: targetAccount,
      destinationAccountId: '',
      paymentMethod: sub.paymentMethod,
      date: getTodayISO(),
      notes: `Recurring ${sub.frequency} renewal for ${sub.name}`,
      tags: ['subscription', sub.frequency],
    });

    await updateSubscription(id, {
      ...sub,
      nextRenewalDate: nextRenewal,
      status: 'active',
    });

    showToast(`Recorded ₹${sub.amount.toLocaleString('en-IN')} renewal for ${sub.name}. Next renewal: ${nextRenewal}`);
  };

  const deleteSubscription = async (id: string) => {
    const applyLocal = () => {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      showToast('Subscription removed.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'subscriptions', id));
      showToast('Subscription removed.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `subscriptions/${id}`, applyLocal);
    }
  };

  // ============================================================================
  // 12. BALANCE SHEET MANUAL ASSETS & LIABILITIES CRUD
  // ============================================================================

  const addBalanceSheetItem = async (
    item: Omit<BalanceSheetItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const id = genId('bs');
    const record: BalanceSheetItem = {
      id,
      userId: profile.uid,
      entryType: item.entryType,
      name: clampStr(item.name, 120, 'Balance Sheet Item'),
      category: clampStr(item.category, 80, 'Other'),
      amount: Math.max(0, Number(item.amount) || 0),
      valuationDate: clampStr(item.valuationDate, 30, getTodayISO()),
      institutionOrCounterparty: clampStr(item.institutionOrCounterparty, 120, ''),
      isLiquid: Boolean(item.isLiquid),
      notes: clampStr(item.notes, 400, ''),
    };

    const applyLocal = () => {
      setBalanceSheetItems((prev) => [...prev, record]);
      showToast(
        `${record.entryType === 'asset' ? 'Asset' : 'Liability'} "${record.name}" added to Balance Sheet.`
      );
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await setDoc(doc(db, 'balanceSheetItems', id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(
        `${record.entryType === 'asset' ? 'Asset' : 'Liability'} "${record.name}" added to Balance Sheet.`
      );
    } catch (err) {
      handleWriteFallback(err, OperationType.CREATE, `balanceSheetItems/${id}`, applyLocal);
    }
  };

  const updateBalanceSheetItem = async (
    id: string,
    item: Omit<BalanceSheetItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!profile) return;
    const updatedFields = {
      entryType: item.entryType,
      name: clampStr(item.name, 120, 'Balance Sheet Item'),
      category: clampStr(item.category, 80, 'Other'),
      amount: Math.max(0, Number(item.amount) || 0),
      valuationDate: clampStr(item.valuationDate, 30, getTodayISO()),
      institutionOrCounterparty: clampStr(item.institutionOrCounterparty, 120, ''),
      isLiquid: Boolean(item.isLiquid),
      notes: clampStr(item.notes, 400, ''),
    };

    const applyLocal = () => {
      setBalanceSheetItems((prev) =>
        prev.map((curr) => (curr.id === id ? { ...curr, ...updatedFields } : curr))
      );
      showToast('Balance Sheet item updated.');
    };

    if (useLocalStore) {
      applyLocal();
      return;
    }

    try {
      await updateDoc(doc(db, 'balanceSheetItems', id), {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });
      showToast('Balance Sheet item updated.');
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `balanceSheetItems/${id}`, applyLocal);
    }
  };

  const deleteBalanceSheetItem = async (id: string) => {
    const applyLocal = () => {
      setBalanceSheetItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Balance Sheet item deleted.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'balanceSheetItems', id));
      showToast('Balance Sheet item deleted.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `balanceSheetItems/${id}`, applyLocal);
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    const applyLocal = () => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await updateDoc(doc(db, 'notifications', id), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleWriteFallback(err, OperationType.UPDATE, `notifications/${id}`, applyLocal);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const applyLocal = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('All notifications marked as read.');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), {
          isRead: true,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      showToast('All notifications marked as read.');
    } catch (err) {
      handleWriteFallback(err, OperationType.WRITE, 'notifications_mark_all', applyLocal);
    }
  };

  const dismissNotification = async (id: string) => {
    const applyLocal = () => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, `notifications/${id}`, applyLocal);
    }
  };

  // AI Financial Assistant
  const sendAIMessage = async (question: string) => {
    if (!profile || !question.trim()) return;
    setAiError(null);
    setAiLoading(true);

    const uid = profile.uid;
    const userMsgId = genId('ai_u');
    const userMsg: AIConversationMessage = {
      id: userMsgId,
      userId: uid,
      role: 'user',
      content: clampStr(question, 8000),
    };

    if (useLocalStore) {
      setAiMessages((prev) => [...prev, userMsg]);
    } else {
      try {
        await setDoc(doc(db, 'aiConversations', userMsgId), {
          ...userMsg,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        if (isOfflineOrTokenError(err)) {
          setCloudSyncEnabled(false);
          setAiMessages((prev) => [...prev, userMsg]);
        } else {
          handleFirestoreError(err, OperationType.CREATE, `aiConversations/${userMsgId}`);
        }
      }
    }

    try {
      const prevYM = getPreviousYearMonth(selectedMonth);
      const currSummary = computeMonthlySummary(transactions, selectedMonth);
      const prevSummary = computeMonthlySummary(transactions, prevYM);
      const totalBalance = computeTotalBalance(rawAccounts, transactions);

      const { overallBudget, categoryBudgets } = computeBudgetProgressList(
        budgets,
        transactions,
        selectedMonth,
        profile.monthlyBudget
      );

      const currExpTx = filterTransactionsByMonth(transactions, selectedMonth).filter(
        (t) => t.type === 'expense'
      );
      const prevExpTx = filterTransactionsByMonth(transactions, prevYM).filter(
        (t) => t.type === 'expense'
      );

      const currByCat = new Map<string, number>();
      const prevByCat = new Map<string, number>();
      currExpTx.forEach((t) =>
        currByCat.set(t.categoryName, (currByCat.get(t.categoryName) || 0) + t.amount)
      );
      prevExpTx.forEach((t) =>
        prevByCat.set(t.categoryName, (prevByCat.get(t.categoryName) || 0) + t.amount)
      );

      const allCats = new Set([...currByCat.keys(), ...prevByCat.keys()]);
      const categoryBreakdown = Array.from(allCats)
        .map((cat) => {
          const amount = currByCat.get(cat) || 0;
          const previousMonthAmount = prevByCat.get(cat) || 0;
          const percentageOfExpenses =
            currSummary.expenses > 0 ? (amount / currSummary.expenses) * 100 : 0;
          return {
            category: cat,
            amount,
            percentageOfExpenses,
            previousMonthAmount,
            hypothetical20PercentSavings: Math.round(amount * 0.2),
          };
        })
        .sort((a, b) => b.amount - a.amount);

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const sevenDaysISO = `${sevenDaysAgo.getFullYear()}-${String(
        sevenDaysAgo.getMonth() + 1
      ).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

      const weekExpenses = transactions.filter(
        (t) => t.type === 'expense' && t.date >= sevenDaysISO
      );
      const weekByCatMap = new Map<string, number>();
      weekExpenses.forEach((t) =>
        weekByCatMap.set(t.categoryName, (weekByCatMap.get(t.categoryName) || 0) + t.amount)
      );

      const momExpenseDiff = currSummary.expenses - prevSummary.expenses;
      const momExpenseChangePercent =
        prevSummary.expenses > 0 ? (momExpenseDiff / prevSummary.expenses) * 100 : null;

      const allBudgetsProgress = [
        ...(overallBudget ? [overallBudget] : []),
        ...categoryBudgets,
      ];

      // Compute Health Score, Loans, Subscriptions, and Balance Sheet for AI Context
      const healthReport = computeFinancialHealthScore({
        profile,
        accounts,
        transactions,
        budgets,
        savingsGoals,
        loans,
        selectedMonth,
      });

      const balanceSheet = computeBalanceSheetStatement({
        accounts: rawAccounts,
        transactions,
        savingsGoals,
        loans,
        loanPayments,
        manualItems: balanceSheetItems,
        asOfDate: getTodayISO(),
        includeGoalsAsSeparateAssets: false,
      });

      const activeSubs = subscriptions.filter((s) => s.status === 'active');
      const totalMonthlySubCost = activeSubs.reduce(
        (s, sub) => s + getMonthlyEquivalentCost(sub.amount, sub.frequency),
        0
      );
      const totalAnnualSubCost = activeSubs.reduce(
        (s, sub) => s + getAnnualEquivalentCost(sub.amount, sub.frequency),
        0
      );

      const payload = {
        question: question.trim(),
        history: aiMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        financialContext: {
          currencySymbol: getCurrencySymbol(profile.currency),
          currentMonthLabel: formatMonthLabel(selectedMonth),
          previousMonthLabel: formatMonthLabel(prevYM),
          totalBalance,
          accounts: accounts.map((a) => ({
            name: a.name,
            type: a.accountType,
            balance: a.currentBalance,
          })),
          currentMonth: {
            income: currSummary.income,
            expenses: currSummary.expenses,
            netSavings: currSummary.netSavings,
            savingsRate: currSummary.savingsRate,
            monthlyBudget: overallBudget?.amount || profile.monthlyBudget || 0,
            budgetRemaining: overallBudget
              ? overallBudget.remainingAmount
              : (profile.monthlyBudget || 0) - currSummary.expenses,
            budgetUsedPercent: overallBudget ? overallBudget.percentUsed : 0,
          },
          previousMonth: {
            income: prevSummary.income,
            expenses: prevSummary.expenses,
            netSavings: prevSummary.netSavings,
            momExpenseChangePercent,
            momExpenseDiff,
          },
          thisWeekExpenses: {
            total: weekExpenses.reduce((s, t) => s + t.amount, 0),
            byCategory: Array.from(weekByCatMap.entries()).map(([category, amount]) => ({
              category,
              amount,
            })),
          },
          categoryBreakdown,
          budgets: allBudgetsProgress.map((b) => ({
            name: b.name,
            categoryName: b.categoryName,
            budgetAmount: b.amount,
            spentAmount: b.spentAmount,
            remainingAmount: b.remainingAmount,
            percentUsed: b.percentUsed,
            status: b.status,
          })),
          savingsGoals: savingsGoals.map((g) => {
            const m = computeSavingsGoalMetrics(g);
            return {
              name: g.name,
              targetAmount: g.targetAmount,
              savedAmount: g.currentSavedAmount,
              remainingAmount: m.remainingAmount,
              completionPercent: m.completionPercent,
              targetDate: g.targetDate,
              recommendedMonthlyContribution: m.recommendedMonthlyContribution,
              statusNote: m.statusMessage,
            };
          }),
          loans: loans.map((l) => ({
            name: l.name,
            category: l.category,
            lender: l.lender,
            originalAmount: l.originalAmount,
            outstandingPrincipal: l.outstandingPrincipal,
            interestRate: l.interestRate,
            emiAmount: l.emiAmount,
            nextDueDate: l.nextDueDate,
            status: l.status,
          })),
          subscriptions: {
            activeCount: activeSubs.length,
            monthlyTotal: Math.round(totalMonthlySubCost),
            annualTotal: Math.round(totalAnnualSubCost),
            items: subscriptions.map((s) => ({
              name: s.name,
              category: s.category,
              amount: s.amount,
              frequency: s.frequency,
              nextRenewalDate: s.nextRenewalDate,
              status: s.status,
            })),
          },
          financialHealthScore: {
            overallScore: healthReport.overallScore,
            category: healthReport.category,
            metrics: healthReport.metrics.map((m) => ({
              name: m.name,
              weight: m.weight,
              available: m.available,
              rawScore: m.rawScore,
              displayValue: m.displayValue,
            })),
          },
          balanceSheet: {
            totalAssets: balanceSheet.assets.totalAssets,
            totalLiabilities: balanceSheet.liabilities.totalLiabilities,
            netWorth: balanceSheet.netWorth,
          },
          recentTransactions: transactions.slice(0, 20).map((t) => ({
            date: t.date,
            type: t.type,
            description: t.description,
            category: t.categoryName,
            amount: t.amount,
            paymentMethod: t.paymentMethod,
          })),
          upcomingReminders: reminders
            .filter((r) => !r.completed)
            .map((r) => ({
              title: r.title,
              amount: r.amount,
              dueDate: r.dueDate,
              category: r.category,
            })),
        },
      };

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get a response from the AI assistant.');
      }

      const botMsgId = genId('ai_b');
      const botMsg: AIConversationMessage = {
        id: botMsgId,
        userId: uid,
        role: 'assistant',
        content: clampStr(data.reply, 8000),
      };

      if (useLocalStore) {
        setAiMessages((prev) => [...prev, botMsg]);
      } else {
        try {
          await setDoc(doc(db, 'aiConversations', botMsgId), {
            ...botMsg,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          if (isOfflineOrTokenError(err)) {
            setCloudSyncEnabled(false);
            setAiMessages((prev) => [...prev, botMsg]);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Financial Assistant.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const clearAIConversation = async () => {
    const applyLocal = () => {
      setAiMessages([]);
      showToast('Conversation history cleared.', 'info');
    };
    if (useLocalStore) {
      applyLocal();
      return;
    }
    try {
      const batch = writeBatch(db);
      aiMessages.forEach((m) => {
        batch.delete(doc(db, 'aiConversations', m.id));
      });
      await batch.commit();
      showToast('Conversation history cleared.', 'info');
    } catch (err) {
      handleWriteFallback(err, OperationType.DELETE, 'aiConversations_clear', applyLocal);
    }
  };

  const deleteAllUserData = async () => {
    if (!profile) return;
    clearLocalWorkspace(profile.uid);
    if (useLocalStore) {
      await logout();
      return;
    }
    try {
      const batch = writeBatch(db);
      rawAccounts.forEach((a) => batch.delete(doc(db, 'accounts', a.id)));
      rawCategories.forEach((c) => batch.delete(doc(db, 'categories', c.id)));
      transactions.forEach((t) => batch.delete(doc(db, 'transactions', t.id)));
      budgets.forEach((b) => batch.delete(doc(db, 'budgets', b.id)));
      savingsGoals.forEach((g) => batch.delete(doc(db, 'savingsGoals', g.id)));
      goalContributions.forEach((gc) => batch.delete(doc(db, 'goalContributions', gc.id)));
      reminders.forEach((r) => batch.delete(doc(db, 'reminders', r.id)));
      loans.forEach((l) => batch.delete(doc(db, 'loans', l.id)));
      loanPayments.forEach((lp) => batch.delete(doc(db, 'loanPayments', lp.id)));
      subscriptions.forEach((sub) => batch.delete(doc(db, 'subscriptions', sub.id)));
      balanceSheetItems.forEach((bs) => batch.delete(doc(db, 'balanceSheetItems', bs.id)));
      notifications.forEach((n) => batch.delete(doc(db, 'notifications', n.id)));
      aiMessages.forEach((m) => batch.delete(doc(db, 'aiConversations', m.id)));
      batch.delete(doc(db, 'users', profile.uid));
      await batch.commit();
      await signOut(auth);
      showToast('All personal financial data has been permanently deleted.', 'info');
    } catch (err) {
      if (isOfflineOrTokenError(err)) {
        await signOut(auth);
        showToast('All personal financial data has been permanently deleted.', 'info');
        return;
      }
      handleFirestoreError(err, OperationType.DELETE, 'delete_all_user_data');
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        firebaseUser,
        authReady,
        isDemoMode,
        dataLoading,
        profile,
        activeTab,
        setActiveTab,
        selectedMonth,
        setSelectedMonth,
        accounts,
        categories,
        transactions,
        budgets,
        savingsGoals,
        goalContributions,
        reminders,
        loans,
        loanPayments,
        subscriptions,
        balanceSheetItems,
        notifications,
        aiMessages,
        quickModal,
        openTransactionModal,
        closeTransactionModal,
        categoryDrilldown,
        setCategoryDrilldown,
        toasts,
        showToast,
        dismissToast,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        enterDemoMode,
        resetDemoData,
        updateUserProfile,
        completeOnboarding,
        loadSampleDataIntoAccount,
        deleteAllUserData,
        addAccount,
        updateAccount,
        deleteAccount,
        addCategory,
        deleteCategory,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        addGoalContribution,
        addReminder,
        updateReminder,
        toggleReminderCompleted,
        postponeReminder,
        deleteReminder,
        addLoan,
        updateLoan,
        deleteLoan,
        recordLoanPayment,
        addSubscription,
        updateSubscription,
        toggleSubscriptionStatus,
        recordSubscriptionPayment,
        deleteSubscription,
        addBalanceSheetItem,
        updateBalanceSheetItem,
        deleteBalanceSheetItem,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        aiLoading,
        aiError,
        sendAIMessage,
        clearAIConversation,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
}
