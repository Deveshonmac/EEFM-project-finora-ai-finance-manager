import React, { useMemo, useState } from 'react';
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
import {
  Landmark,
  Plus,
  Calendar,
  Percent,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Calculator,
  Receipt,
  Info,
  ArrowDownRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  Loan,
  LOAN_CATEGORIES,
  LoanCategory,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../types/finance';
import {
  calculateStandardEMI,
  computeLoanMetrics,
  computeLoanPaymentBreakdown,
  formatCurrency,
  formatDateIN,
  getTodayISO,
} from '../utils/calculations';

export const LoansView: React.FC = () => {
  const {
    profile,
    accounts,
    loans,
    loanPayments,
    addLoan,
    updateLoan,
    deleteLoan,
    recordLoanPayment,
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
  const chartGridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.18)';
  const chartTickColor = theme === 'dark' ? '#94A3B8' : '#64748B';

  const currency = profile?.currency || 'INR';

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

  // Add/Edit Loan Modal State
  const [loanModalOpen, setLoanModalOpen] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [name, setName] = useState<string>('');
  const [lender, setLender] = useState<string>('');
  const [category, setCategory] = useState<LoanCategory>('Education Loan');
  const [originalAmount, setOriginalAmount] = useState<string>('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('9.0');
  const [tenureMonths, setTenureMonths] = useState<string>('36');
  const [emiAmount, setEmiAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  const [nextDueDate, setNextDueDate] = useState<string>(getTodayISO());
  const [linkedAccountId, setLinkedAccountId] = useState<string>(accounts[0]?.id || '');
  const [status, setStatus] = useState<'active' | 'closed'>('active');
  const [notes, setNotes] = useState<string>('');
  const [loanError, setLoanError] = useState<string | null>(null);

  // Record Payment Modal State
  const [paymentModalLoan, setPaymentModalLoan] = useState<Loan | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payPrincipal, setPayPrincipal] = useState<string>('');
  const [payInterest, setPayInterest] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(getTodayISO());
  const [payAccountId, setPayAccountId] = useState<string>(accounts[0]?.id || '');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [payNotes, setPayNotes] = useState<string>('');
  const [recordInLedger, setRecordInLedger] = useState<boolean>(true);
  const [payError, setPayError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);

  // Enrich Loans with Metrics
  const loansWithMetrics = useMemo(() => {
    return loans.map((loan) => ({
      loan,
      metrics: computeLoanMetrics(loan, loanPayments),
    }));
  }, [loans, loanPayments]);

  const filteredLoans = useMemo(() => {
    return loansWithMetrics.filter(({ loan }) => {
      if (statusFilter === 'active') return loan.status === 'active';
      if (statusFilter === 'closed') return loan.status === 'closed';
      return true;
    });
  }, [loansWithMetrics, statusFilter]);

  // Overall Summary KPIs
  const summaryStats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstandingPrincipal, 0);
    const totalOriginal = activeLoans.reduce((s, l) => s + l.originalAmount, 0);
    const totalMonthlyEMI = activeLoans.reduce((s, l) => s + l.emiAmount, 0);
    const totalInterestPaidAllTime = loanPayments.reduce((s, p) => s + p.interestComponent, 0);
    const totalPrincipalRepaidAllTime =
      loanPayments.reduce((s, p) => s + p.principalComponent, 0) ||
      activeLoans.reduce((s, l) => s + Math.max(0, l.originalAmount - l.outstandingPrincipal), 0);

    return {
      activeCount: activeLoans.length,
      totalOutstanding,
      totalOriginal,
      totalMonthlyEMI,
      totalInterestPaidAllTime,
      totalPrincipalRepaidAllTime,
    };
  }, [loans, loanPayments]);

  // Chart Data: Principal Repaid vs Remaining Principal vs Interest Paid per Loan
  const chartData = useMemo(() => {
    return loansWithMetrics.map(({ loan, metrics }) => ({
      name: loan.name.length > 18 ? `${loan.name.slice(0, 16)}…` : loan.name,
      fullName: loan.name,
      PrincipalRepaid: Math.max(0, loan.originalAmount - loan.outstandingPrincipal),
      RemainingPrincipal: loan.outstandingPrincipal,
      InterestPaid: metrics.totalInterestPaid,
    }));
  }, [loansWithMetrics]);

  // Open Create Loan Modal
  const openCreateLoanModal = () => {
    setEditingLoan(null);
    setName('');
    setLender('');
    setCategory('Education Loan');
    setOriginalAmount('');
    setOutstandingPrincipal('');
    setInterestRate('9.0');
    setTenureMonths('36');
    setEmiAmount('');
    setStartDate(getTodayISO());
    setNextDueDate(getTodayISO());
    setLinkedAccountId(accounts[0]?.id || '');
    setStatus('active');
    setNotes('');
    setLoanError(null);
    setLoanModalOpen(true);
  };

  // Open Edit Loan Modal
  const openEditLoanModal = (loan: Loan) => {
    setEditingLoan(loan);
    setName(loan.name);
    setLender(loan.lender || '');
    setCategory(loan.category);
    setOriginalAmount(String(loan.originalAmount));
    setOutstandingPrincipal(String(loan.outstandingPrincipal));
    setInterestRate(String(loan.interestRate));
    setTenureMonths(String(loan.tenureMonths));
    setEmiAmount(String(loan.emiAmount));
    setStartDate(loan.startDate);
    setNextDueDate(loan.nextDueDate);
    setLinkedAccountId(loan.linkedAccountId || accounts[0]?.id || '');
    setStatus(loan.status);
    setNotes(loan.notes || '');
    setLoanError(null);
    setLoanModalOpen(true);
  };

  // Auto-calculate EMI helper inside Loan Modal
  const handleAutoCalculateEMI = () => {
    const p = Number(originalAmount) || Number(outstandingPrincipal) || 0;
    const r = Number(interestRate) || 0;
    const n = Number(tenureMonths) || 12;
    if (p <= 0 || n <= 0) {
      setLoanError('Enter a valid loan amount and tenure (months) to calculate standard EMI.');
      return;
    }
    const calculated = calculateStandardEMI(p, r, n);
    setEmiAmount(String(calculated));
    if (!outstandingPrincipal) {
      setOutstandingPrincipal(String(p));
    }
    setLoanError(null);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoanError(null);

    if (!name.trim()) {
      setLoanError('Please enter a loan or EMI name.');
      return;
    }
    const orig = Number(originalAmount);
    if (!orig || orig <= 0) {
      setLoanError('Original loan amount must be greater than 0.');
      return;
    }
    const outPrinc =
      outstandingPrincipal.trim() !== '' ? Number(outstandingPrincipal) : orig;
    if (outPrinc < 0 || outPrinc > orig) {
      setLoanError('Outstanding principal must be between 0 and the original loan amount.');
      return;
    }
    const rate = Math.max(0, Number(interestRate) || 0);
    const tenure = Math.max(1, Math.round(Number(tenureMonths) || 12));
    const computedEmi =
      Number(emiAmount) > 0
        ? Number(emiAmount)
        : calculateStandardEMI(orig, rate, tenure);

    const payload = {
      name: name.trim(),
      lender: lender.trim(),
      category,
      originalAmount: orig,
      outstandingPrincipal: outPrinc === 0 ? 0 : outPrinc,
      interestRate: rate,
      tenureMonths: tenure,
      emiAmount: computedEmi,
      startDate: startDate || getTodayISO(),
      nextDueDate: nextDueDate || getTodayISO(),
      linkedAccountId: linkedAccountId || accounts[0]?.id || '',
      status: outPrinc <= 0 ? ('closed' as const) : status,
      notes: notes.trim(),
    };

    if (editingLoan) {
      await updateLoan(editingLoan.id, payload);
    } else {
      await addLoan(payload);
    }
    setLoanModalOpen(false);
  };

  // Open Record EMI / Repayment Modal
  const openPaymentModal = (loan: Loan) => {
    setPaymentModalLoan(loan);
    const defaultPay = Math.min(
      loan.emiAmount || loan.outstandingPrincipal,
      loan.outstandingPrincipal +
        Math.round((loan.outstandingPrincipal * (loan.interestRate / 12)) / 100)
    );
    const breakdown = computeLoanPaymentBreakdown(
      loan.outstandingPrincipal,
      loan.interestRate,
      defaultPay
    );
    setPayAmount(String(defaultPay));
    setPayPrincipal(String(breakdown.principalComponent));
    setPayInterest(String(breakdown.interestComponent));
    setPayDate(getTodayISO());
    setPayAccountId(loan.linkedAccountId || accounts[0]?.id || '');
    setPayMethod('Bank Transfer');
    setPayNotes(`EMI / Repayment for ${loan.name}`);
    setRecordInLedger(true);
    setPayError(null);
  };

  const handlePayAmountChange = (val: string) => {
    setPayAmount(val);
    if (!paymentModalLoan) return;
    const num = Number(val) || 0;
    const breakdown = computeLoanPaymentBreakdown(
      paymentModalLoan.outstandingPrincipal,
      paymentModalLoan.interestRate,
      num
    );
    setPayPrincipal(String(breakdown.principalComponent));
    setPayInterest(String(breakdown.interestComponent));
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalLoan) return;
    setPayError(null);

    const total = Number(payAmount);
    const princ = Number(payPrincipal) || 0;
    const intr = Number(payInterest) || 0;

    if (!total || total <= 0) {
      setPayError('Payment amount must be greater than 0.');
      return;
    }
    if (princ < 0 || intr < 0) {
      setPayError('Principal and interest components cannot be negative.');
      return;
    }
    if (princ > paymentModalLoan.outstandingPrincipal) {
      setPayError(
        `Principal repayment (${formatCurrency(princ, currency)}) cannot exceed remaining principal (${formatCurrency(
          paymentModalLoan.outstandingPrincipal,
          currency
        )}).`
      );
      return;
    }

    await recordLoanPayment({
      loanId: paymentModalLoan.id,
      amount: total,
      principalComponent: princ,
      interestComponent: intr,
      date: payDate || getTodayISO(),
      accountId: payAccountId || accounts[0]?.id || '',
      paymentMethod: payMethod,
      notes: payNotes.trim(),
      recordInLedger,
    });
    setPaymentModalLoan(null);
  };

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || 'Primary Account';

  return (
    <div className="space-y-5">
      {/* Compact Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">Loans & Debt Manager</h1>
          <p className="supporting-text mt-0.5">
            Track education loans, gadget EMIs, personal debt, amortization schedules, and separate principal repayment from interest expense.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-1">
            {(['all', 'active', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateLoanModal}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Loan / EMI
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Outstanding Debt</p>
          <p className="mt-2 metric-value text-rose-600 dark:text-rose-400">
            {formatCurrency(summaryStats.totalOutstanding, currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            Across {summaryStats.activeCount} active loan{summaryStats.activeCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Monthly EMI Commitment</p>
          <p className="mt-2 metric-value text-amber-600 dark:text-amber-400">
            {formatCurrency(summaryStats.totalMonthlyEMI, currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            Scheduled monthly debt service
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Principal Repaid to Date</p>
          <p className="mt-2 metric-value text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summaryStats.totalPrincipalRepaidAllTime, currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            Reduces your balance sheet liability
          </p>
        </div>

        <div className="data-surface p-4 flex flex-col justify-between">
          <p className="card-label">Total Interest Paid</p>
          <p className="mt-2 metric-value text-sky-600 dark:text-sky-300">
            {formatCurrency(summaryStats.totalInterestPaidAllTime, currency)}
          </p>
          <p className="mt-1.5 supporting-text">
            Cumulative cost of borrowing
          </p>
        </div>
      </div>

      {/* Accounting Note Banner */}
      <div className="flex items-start gap-2.5 data-surface p-3.5 text-xs text-slate-700 dark:text-slate-300">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-900 dark:text-white">Principal vs. Interest Separation:</strong> When you record an EMI payment, Finora automatically splits the installment into{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">Principal Repayment</strong> (which reduces your outstanding loan balance on the Balance Sheet) and{' '}
          <strong className="text-amber-600 dark:text-amber-300">Interest Expense</strong> (the cost of borrowing based on your annual interest rate).
        </span>
      </div>

      {/* Loans Grid & Chart */}
      {filteredLoans.length === 0 ? (
        <div className="data-surface p-12 text-center space-y-3">
          <Landmark className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No loans or EMIs in this view</h3>
          <p className="supporting-text max-w-md mx-auto">
            Add an education loan, laptop No-Cost EMI, vehicle loan, or credit card installment plan to track principal reduction and due-date reminders.
          </p>
          <button
            type="button"
            onClick={openCreateLoanModal}
            className="rounded-lg btn-primary px-4 py-2 text-xs"
          >
            Add First Loan / EMI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Loan Cards List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {filteredLoans.map(({ loan, metrics }) => {
              const isOverdue = loan.status === 'active' && metrics.daysUntilDue < 0;
              const isDueSoon =
                loan.status === 'active' && metrics.daysUntilDue >= 0 && metrics.daysUntilDue <= 7;

              return (
                <div key={loan.id} className="data-surface p-4 space-y-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{loan.name}</h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            loan.status === 'closed'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/25'
                              : 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-400/25'
                          }`}
                        >
                          {loan.status === 'closed' ? 'Closed / Paid Off' : loan.category}
                        </span>
                      </div>
                      <p className="supporting-text mt-0.5">
                        {loan.lender ? `${loan.lender} · ` : ''}
                        Interest: <span className="font-mono-tabular text-slate-700 dark:text-slate-200">{loan.interestRate}% p.a.</span> · Tenure:{' '}
                        <span className="font-mono-tabular text-slate-700 dark:text-slate-200">{loan.tenureMonths} mos</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {loan.status === 'active' && loan.outstandingPrincipal > 0 && (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(loan)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Record EMI
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditLoanModal(loan)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                        title="Edit Loan"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLoan(loan)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 transition-colors"
                        title="Delete Loan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Key Figures Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800/80 p-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Original Principal</span>
                      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-200 mt-0.5 block">
                        {formatCurrency(loan.originalAmount, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Remaining Balance</span>
                      <span className="font-mono-tabular font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                        {formatCurrency(loan.outstandingPrincipal, currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Monthly EMI</span>
                      <span className="font-mono-tabular font-semibold text-amber-600 dark:text-amber-300 mt-0.5 block">
                        {formatCurrency(loan.emiAmount, currency)}/mo
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Est. Payoff Left</span>
                      <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {loan.outstandingPrincipal <= 0
                          ? 'Paid Off'
                          : `~${metrics.estimatedMonthsRemaining} mo${
                              metrics.estimatedMonthsRemaining === 1 ? '' : 's'
                            }`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Principal Repayment Progress ({metrics.repaidPercent.toFixed(1)}%)
                      </span>
                      <span className="font-mono-tabular text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(
                          Math.max(0, loan.originalAmount - loan.outstandingPrincipal),
                          currency
                        )}{' '}
                        repaid
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, metrics.repaidPercent))}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Installment Split & Due Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      {loan.status === 'closed' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Loan fully settled</span>
                      ) : (
                        <span
                          className={`font-mono-tabular ${
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : isDueSoon
                              ? 'text-amber-600 dark:text-amber-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Next EMI Due: {formatDateIN(loan.nextDueDate)}{' '}
                          {isOverdue
                            ? `(${Math.abs(metrics.daysUntilDue)}d overdue)`
                            : isDueSoon
                            ? `(in ${metrics.daysUntilDue}d)`
                            : ''}
                        </span>
                      )}
                    </div>

                    {loan.status === 'active' && loan.outstandingPrincipal > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                        Next EMI Split:{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(metrics.nextMonthPrincipalEstimate, currency)} Principal
                        </span>{' '}
                        +{' '}
                        <span className="text-amber-600 dark:text-amber-300">
                          {formatCurrency(metrics.nextMonthInterestEstimate, currency)} Interest
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Chart + Repayment History Ledger (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Amortization Chart */}
            <div className="data-surface p-4 space-y-3">
              <div>
                <h3 className="section-heading">
                  Repayment Overview by Loan
                </h3>
                <p className="supporting-text text-xs">
                  Principal Repaid vs. Remaining Principal vs. Interest Paid
                </p>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={5}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: chartTickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartTickColor }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                      contentStyle={tooltipStyle}
                      cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="PrincipalRepaid" name="Principal Repaid" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="RemainingPrincipal" name="Remaining Principal" fill="#EF6461" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="InterestPaid" name="Interest Paid" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repayment History Table */}
            <div className="data-surface overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Recorded EMI & Repayment History ({loanPayments.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Itemized split between principal reduction and interest charges
                </p>
              </div>

              {loanPayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No loan repayments recorded yet. Click "Record EMI" on any active loan to log a payment.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-96 overflow-y-auto">
                  {loanPayments.map((p) => {
                    const loanObj = loans.find((l) => l.id === p.loanId);
                    return (
                      <div key={p.id} className="p-3.5 space-y-1 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {loanObj?.name || 'Loan Installment'}
                          </span>
                          <span className="font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(p.amount, currency)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular">
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatDateIN(p.date)} · {getAccountName(p.accountId)}
                          </span>
                          <div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Principal: {formatCurrency(p.principalComponent, currency)}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500"> | </span>
                            <span className="text-amber-600 dark:text-amber-300 font-medium">
                              Interest: {formatCurrency(p.interestComponent, currency)}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                          <span className="truncate">{p.notes || 'Scheduled installment'}</span>
                          <span className="font-mono-tabular shrink-0">
                            Bal After: {formatCurrency(p.remainingBalanceAfter, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      {loanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingLoan ? 'Edit Loan / EMI Details' : 'Add New Loan or EMI'}
              </h3>
              <button
                type="button"
                onClick={() => setLoanModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-5 space-y-3.5">
              {loanError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{loanError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan / EMI Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBI Education Loan, MacBook EMI"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lender / Institution
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India, HDFC Bank"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LoanCategory)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {LOAN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Linked Repayment Account
                  </label>
                  <select
                    value={linkedAccountId}
                    onChange={(e) => setLinkedAccountId(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.currentBalance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Original Principal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="e.g. 240000"
                    value={originalAmount}
                    onChange={(e) => {
                      setOriginalAmount(e.target.value);
                      if (!editingLoan && !outstandingPrincipal) {
                        setOutstandingPrincipal(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Outstanding Principal (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="e.g. 168000"
                    value={outstandingPrincipal}
                    onChange={(e) => setOutstandingPrincipal(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.05"
                    placeholder="0 for No-Cost EMI"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAutoCalculateEMI}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg glass-button-secondary px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    <Calculator className="h-3.5 w-3.5" />
                    Auto-Calc EMI
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly EMI Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Auto or manual"
                    value={emiAmount}
                    onChange={(e) => setEmiAmount(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loan Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Next EMI Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional moratorium notes, loan account ref, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setLoanModalOpen(false)}
                  className="rounded-lg glass-button-secondary px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg btn-primary px-4 py-1.5 text-xs"
                >
                  {editingLoan ? 'Save Changes' : 'Add Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record EMI / Repayment Modal */}
      {paymentModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Record Loan Repayment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{paymentModalLoan.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalLoan(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-3.5">
              {payError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{payError}</span>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2.5 text-xs flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Outstanding Principal:</span>
                <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                  {formatCurrency(paymentModalLoan.outstandingPrincipal, currency)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Total Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount}
                  onChange={(e) => handlePayAmountChange(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-sm font-mono-tabular"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                    Principal Component (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={payPrincipal}
                    onChange={(e) => setPayPrincipal(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                    Interest Component (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={payInterest}
                    onChange={(e) => setPayInterest(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
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
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pay From Account
                </label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordInLedger}
                  onChange={(e) => setRecordInLedger(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 mt-0.5"
                />
                <span>
                  Also record in Transaction Ledger (creates separate Principal Repayment and Interest Charge entries so account balances update automatically)
                </span>
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalLoan(null)}
                  className="rounded-lg glass-button-secondary px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg btn-primary px-4 py-1.5 text-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Loan Confirmation Modal */}
      {deletingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl p-5 space-y-3.5 text-slate-900 dark:text-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Loan Record?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingLoan.name}</strong>? Its repayment history logs will also be removed from the Loan Manager.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingLoan(null)}
                className="rounded-lg glass-button-secondary px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingLoan.id;
                  setDeletingLoan(null);
                  await deleteLoan(id);
                }}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                Delete Loan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
