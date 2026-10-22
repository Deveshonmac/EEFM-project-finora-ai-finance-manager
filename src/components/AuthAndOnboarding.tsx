import React, { useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_EXPENSE_CATEGORIES } from '../types/finance';
import { getTodayISO } from '../utils/calculations';

export const AuthScreen: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, enterDemoMode } =
    useFinance();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await registerWithEmail(name, email, password);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setInfoMessage('Password reset instructions have been sent to your email address.');
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Authentication failed';
      if (raw.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in your Firebase Console. Please sign in with Google below, or enable Email/Password under Authentication > Sign-in method in the Firebase Console.'
        );
      } else if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (raw.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Google Sign-In failed';
      if (!raw.includes('auth/popup-closed-by-user')) {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar following 3-zone contract */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Finora
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Smart Budgeting
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Savings Goals
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Gemini Assistant
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Indian Rupee (₹) Native
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={enterDemoMode}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            Launch Demo Mode
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Left Column: Value Proposition */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8 pr-0 lg:pr-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-teal-700 tracking-wide">
              Personal Finance Management System · Indian Locale (en-IN)
            </p>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Take Control of Your Money.
            </h1>
            <p className="text-base text-slate-600 max-w-xl leading-relaxed">
              Built for college students and young professionals in India. Track UPI, bank, and cash expenses, set monthly category budgets, plan savings goals, and ask Finora&apos;s Gemini AI assistant for actionable financial insights.
            </p>
          </div>

          {/* Demo Mode Callout Banner */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Evaluating or testing Finora? Try Interactive Demo Mode
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pre-loaded with 6 months of realistic Indian student financial records (₹12,000 pocket money, ₹3,500 freelance income, category budgets, and a ₹50,000 laptop goal).
                </p>
              </div>
              <button
                type="button"
                onClick={enterDemoMode}
                className="rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Demo Data
              </button>
            </div>
          </div>

          {/* Feature Grid */}
          <div id="features" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <TrendingUp className="h-5 w-5 text-teal-700 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Accurate Accounting</h3>
              <p className="text-xs text-slate-600 mt-1">
                Separate bank, UPI, and cash balances with zero double-counting on internal transfers.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <Sparkles className="h-5 w-5 text-teal-700 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Gemini AI Assistant</h3>
              <p className="text-xs text-slate-600 mt-1">
                Server-side Gemini integration grounded on your exact computed monthly totals.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <ShieldCheck className="h-5 w-5 text-teal-700 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">Isolated Firestore Data</h3>
              <p className="text-xs text-slate-600 mt-1">
                Zero-trust Firestore security rules ensure only you can access your financial records.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {mode === 'login'
                  ? 'Sign in to Finora'
                  : mode === 'register'
                  ? 'Create your Finora account'
                  : 'Reset your password'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'login'
                  ? 'Access your persistent financial dashboard'
                  : mode === 'register'
                  ? 'Start managing your monthly budgets and savings goals'
                  : 'Enter your registered email to receive a reset link'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Google Sign-In Button (Primary Provisioned Method) */}
            {mode !== 'reset' && (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="grow border-t border-slate-200"></div>
                  <span className="shrink mx-3 text-xs text-slate-400">or with email</span>
                  <div className="grow border-t border-slate-200"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="you@college.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Password *
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setError(null);
                        }}
                        className="text-xs font-medium text-teal-700 hover:text-teal-800"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Mode Switch Links */}
            <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Register now
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 lg:px-12 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Finora — Personal Finance Manager · Take Control of Your Money.</span>
        <span>Formatted for Indian Rupees (₹ / en-IN)</span>
      </footer>
    </div>
  );
};

export const OnboardingWizard: React.FC = () => {
  const { completeOnboarding, profile, logout } = useFinance();

  const [step, setStep] = useState<number>(1);
  const [monthlyIncome, setMonthlyIncome] = useState<string>('15000');
  const [monthlyBudget, setMonthlyBudget] = useState<string>('10000');
  const [goalName, setGoalName] = useState<string>('New Laptop');
  const [goalTarget, setGoalTarget] = useState<string>('50000');
  const [goalDate, setGoalDate] = useState<string>('2027-04-15');
  const [accountName, setAccountName] = useState<string>('SBI Campus Savings Account');
  const [openingBalance, setOpeningBalance] = useState<string>('12000');

  const [addFirstTx, setAddFirstTx] = useState<boolean>(false);
  const [txDesc, setTxDesc] = useState<string>('Campus Mess & Canteen');
  const [txAmount, setTxAmount] = useState<string>('450');
  const [txCategory, setTxCategory] = useState<string>(DEFAULT_EXPENSE_CATEGORIES[0].id);

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleFinish = async (loadSample = false) => {
    setSubmitting(true);
    try {
      const selectedCat = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === txCategory);
      await completeOnboarding({
        monthlyIncome: Number(monthlyIncome) || 0,
        monthlyBudget: Number(monthlyBudget) || 0,
        openingBalance: Number(openingBalance) || 0,
        accountName: accountName.trim() || 'Primary Bank Account',
        goalName: goalName.trim() || undefined,
        goalTarget: Number(goalTarget) || undefined,
        goalDate,
        firstTransaction:
          addFirstTx && Number(txAmount) > 0
            ? {
                type: 'expense',
                amount: Number(txAmount),
                description: txDesc.trim() || 'Initial Expense',
                categoryId: selectedCat?.id || 'cat_exp_food',
                categoryName: selectedCat?.name || 'Food & Dining',
                accountId: '',
                destinationAccountId: '',
                paymentMethod: 'UPI',
                date: getTodayISO(),
                notes: 'Added during onboarding',
                tags: ['onboarding'],
              }
            : undefined,
        loadSampleData: loadSample,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold text-teal-700">
              Welcome, {profile?.displayName || 'Finora User'} · Step {step} of 5
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Set Up Your Financial Workspace
            </h1>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleFinish(false)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
          >
            Skip Setup
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full ${
                s <= step ? 'bg-teal-700' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              1. What is your typical monthly income or allowance?
            </h2>
            <p className="text-xs text-slate-600">
              Include salary, monthly pocket money from home, scholarships, or regular freelance stipends.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Monthly Income (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              2. Set an optional monthly spending budget
            </h2>
            <p className="text-xs text-slate-600">
              Finora will alert you when your monthly spending reaches 80% (Warning) or 100% (Exceeded) of this limit.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Monthly Spending Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              3. Choose your first savings goal (optional)
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'New Laptop', amt: '50000' },
                { label: 'Emergency Fund', amt: '20000' },
                { label: 'Vacation', amt: '15000' },
                { label: 'College Expenses', amt: '30000' },
                { label: 'New Phone', amt: '25000' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setGoalName(preset.label);
                    setGoalTarget(preset.amt);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    goalName === preset.label
                      ? 'border-teal-700 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {preset.label} (₹{Number(preset.amt).toLocaleString('en-IN')})
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Date</label>
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              4. Configure your primary account & opening balance
            </h2>
            <p className="text-xs text-slate-600">
              Your total balance starts from this opening balance and updates automatically with every income, expense, or transfer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              5. Add your first transaction or load sample Indian financial data
            </h2>
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">
                    Populate with Sample Fictional Data (Recommended for Demo)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Loads 6 months of realistic Indian transactions, budgets, reminders, and savings goals into your account.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleFinish(true)}
                  className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
                >
                  Load Sample Data
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFirstTx}
                  onChange={(e) => setAddFirstTx(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                Or record a custom first expense now
              </label>

              {addFirstTx && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular text-slate-900"
                  />
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Sign Out
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Skip Step
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Continue
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinish(false)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Saving Workspace...' : 'Finish & Open Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
