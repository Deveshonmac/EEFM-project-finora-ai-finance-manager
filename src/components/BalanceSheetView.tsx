import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Scale,
  Download,
  Plus,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Building2,
  UserCheck,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  ASSET_CATEGORIES,
  BalanceSheetEntryType,
  BalanceSheetItem,
  LIABILITY_CATEGORIES,
} from '../types/finance';
import {
  computeBalanceSheetStatement,
  formatCurrency,
  formatDateIN,
  getTodayISO,
} from '../utils/calculations';

export const BalanceSheetView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    savingsGoals,
    loans,
    loanPayments,
    balanceSheetItems,
    addBalanceSheetItem,
    updateBalanceSheetItem,
    deleteBalanceSheetItem,
    showToast,
  } = useFinance();

  const currency = profile?.currency || 'INR';

  // Statement Configuration
  const [asOfDate, setAsOfDate] = useState<string>(getTodayISO());
  const [viewMode, setViewMode] = useState<'personal' | 'professional'>('professional');
  const [includeGoalsAsSeparateAssets, setIncludeGoalsAsSeparateAssets] =
    useState<boolean>(false);

  // Add/Edit Manual Asset or Liability Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<BalanceSheetItem | null>(null);
  const [entryType, setEntryType] = useState<BalanceSheetEntryType>('asset');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>(ASSET_CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [valuationDate, setValuationDate] = useState<string>(getTodayISO());
  const [institution, setInstitution] = useState<string>('');
  const [isLiquid, setIsLiquid] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [itemError, setItemError] = useState<string | null>(null);

  const statement = useMemo(
    () =>
      computeBalanceSheetStatement({
        accounts,
        transactions,
        savingsGoals,
        loans,
        loanPayments,
        manualItems: balanceSheetItems,
        asOfDate,
        includeGoalsAsSeparateAssets,
      }),
    [
      accounts,
      transactions,
      savingsGoals,
      loans,
      loanPayments,
      balanceSheetItems,
      asOfDate,
      includeGoalsAsSeparateAssets,
    ]
  );

  const openAddModal = (type: BalanceSheetEntryType) => {
    setEditingItem(null);
    setEntryType(type);
    setName('');
    setCategory(type === 'asset' ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0]);
    setAmount('');
    setValuationDate(asOfDate || getTodayISO());
    setInstitution('');
    setIsLiquid(type === 'asset');
    setNotes('');
    setItemError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: BalanceSheetItem) => {
    setEditingItem(item);
    setEntryType(item.entryType);
    setName(item.name);
    setCategory(item.category);
    setAmount(String(item.amount));
    setValuationDate(item.valuationDate);
    setInstitution(item.institutionOrCounterparty || '');
    setIsLiquid(item.isLiquid);
    setNotes(item.notes || '');
    setItemError(null);
    setModalOpen(true);
  };

  const handleSaveManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);
    if (!name.trim()) {
      setItemError('Please enter a name for the asset or liability.');
      return;
    }
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      setItemError('Valuation amount must be greater than 0.');
      return;
    }

    const payload = {
      entryType,
      name: name.trim(),
      category,
      amount: numAmt,
      valuationDate: valuationDate || getTodayISO(),
      institutionOrCounterparty: institution.trim(),
      isLiquid: entryType === 'asset' ? isLiquid : false,
      notes: notes.trim(),
    };

    if (editingItem) {
      await updateBalanceSheetItem(editingItem.id, payload);
    } else {
      await addBalanceSheetItem(payload);
    }
    setModalOpen(false);
  };

  // Generate and Download Formatted Excel (.xlsx) Workbook with Live Formulas
  const handleDownloadExcelWorkbook = () => {
    try {
      const wb = XLSX.utils.book_new();
      const userName = profile?.displayName || 'Finora User';

      // Sheet 1: Statement of Financial Position (Balance Sheet)
      const rows: Array<Array<string | number | { f: string }>> = [
        [`FINORA — PERSONAL & PROFESSIONAL STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)`],
        [`Prepared For: ${userName}`, '', `Statement As Of Date: ${formatDateIN(asOfDate)}`],
        [`Currency: Indian Rupees (INR / ₹)`, '', `Layout Mode: ${viewMode === 'professional' ? 'Schedule-Based Accounting Statement' : 'Personal Net Worth Summary'}`],
        [],
        ['I. ASSETS (WHAT YOU OWN)', 'CATEGORY / SCHEDULE', 'INSTITUTION / BASIS', 'AMOUNT (INR)'],
      ];

      let currentRow = 6; // 1-indexed Excel row tracker

      // Schedule A: Cash & Bank Accounts
      rows.push(['A. Cash & Bank Balances', '', '', '']);
      currentRow++;
      const cashStartRow = currentRow;
      if (statement.assets.cashAndBank.length === 0) {
        rows.push(['   No positive cash/bank accounts recorded', 'Cash & Bank', '-', 0]);
        currentRow++;
      } else {
        for (const item of statement.assets.cashAndBank) {
          rows.push([
            `   ${item.name}`,
            item.subCategory,
            item.institutionOrNote,
            item.amount,
          ]);
          currentRow++;
        }
      }
      const cashEndRow = currentRow - 1;
      const subtotalCashRow = currentRow;
      rows.push([
        'Subtotal — Cash & Bank Balances',
        '',
        '',
        { f: `SUM(D${cashStartRow}:D${cashEndRow})` },
      ]);
      currentRow++;

      rows.push([]);
      currentRow++;

      // Schedule B: Earmarked Savings Goals
      rows.push([
        includeGoalsAsSeparateAssets
          ? 'B. Savings Goal Reserves (Included as Separate External Assets)'
          : 'B. Savings Goal Reserves (Memo Only — Held Inside Bank Accounts, Excluded from Total)',
        '',
        '',
        '',
      ]);
      currentRow++;
      const goalsStartRow = currentRow;
      if (statement.assets.savingsGoalsEarmarked.length === 0) {
        rows.push(['   No savings goals recorded', 'Savings Reserve', '-', 0]);
        currentRow++;
      } else {
        for (const item of statement.assets.savingsGoalsEarmarked) {
          rows.push([
            `   ${item.name}`,
            item.subCategory,
            item.institutionOrNote,
            includeGoalsAsSeparateAssets ? item.amount : 0,
          ]);
          currentRow++;
        }
      }
      const goalsEndRow = currentRow - 1;
      const subtotalGoalsRow = currentRow;
      rows.push([
        'Subtotal — Savings Goal Reserves Included in Total Assets',
        '',
        '',
        { f: `SUM(D${goalsStartRow}:D${goalsEndRow})` },
      ]);
      currentRow++;

      rows.push([]);
      currentRow++;

      // Schedule C: Investments, Deposits & Other Assets
      rows.push(['C. Investments, Deposits & Other Assets', '', '', '']);
      currentRow++;
      const invStartRow = currentRow;
      if (statement.assets.investmentsAndOtherAssets.length === 0) {
        rows.push(['   No investments or manual assets recorded', 'Investments', '-', 0]);
        currentRow++;
      } else {
        for (const item of statement.assets.investmentsAndOtherAssets) {
          rows.push([
            `   ${item.name}`,
            item.subCategory,
            item.institutionOrNote,
            item.amount,
          ]);
          currentRow++;
        }
      }
      const invEndRow = currentRow - 1;
      const subtotalInvRow = currentRow;
      rows.push([
        'Subtotal — Investments & Other Assets',
        '',
        '',
        { f: `SUM(D${invStartRow}:D${invEndRow})` },
      ]);
      currentRow++;

      // TOTAL ASSETS ROW
      const totalAssetsRow = currentRow;
      rows.push([
        'TOTAL ASSETS (A + B + C)',
        '',
        '',
        { f: `D${subtotalCashRow}+D${subtotalGoalsRow}+D${subtotalInvRow}` },
      ]);
      currentRow++;

      rows.push([]);
      currentRow++;

      // SECTION II: LIABILITIES
      rows.push(['II. LIABILITIES (WHAT YOU OWE)', 'CATEGORY / SCHEDULE', 'LENDER / TERMS', 'AMOUNT (INR)']);
      currentRow++;

      // Schedule D: Loans & Structured Debt
      rows.push(['D. Loans & Long-Term / EMI Debt', '', '', '']);
      currentRow++;
      const loansStartRow = currentRow;
      if (statement.liabilities.loansAndDebt.length === 0) {
        rows.push(['   No active loans recorded', 'Loans', '-', 0]);
        currentRow++;
      } else {
        for (const item of statement.liabilities.loansAndDebt) {
          rows.push([
            `   ${item.name}`,
            item.subCategory,
            item.institutionOrNote,
            item.amount,
          ]);
          currentRow++;
        }
      }
      const loansEndRow = currentRow - 1;
      const subtotalLoansRow = currentRow;
      rows.push([
        'Subtotal — Loans & Structured Debt',
        '',
        '',
        { f: `SUM(D${loansStartRow}:D${loansEndRow})` },
      ]);
      currentRow++;

      rows.push([]);
      currentRow++;

      // Schedule E: Credit Card & Short-Term Payables
      rows.push(['E. Credit Card Dues & Short-Term Payables', '', '', '']);
      currentRow++;
      const shortStartRow = currentRow;
      const combinedShort = [
        ...statement.liabilities.creditCardDues,
        ...statement.liabilities.otherLiabilities,
      ];
      if (combinedShort.length === 0) {
        rows.push(['   No short-term liabilities or credit card dues', 'Short-Term', '-', 0]);
        currentRow++;
      } else {
        for (const item of combinedShort) {
          rows.push([
            `   ${item.name}`,
            item.subCategory,
            item.institutionOrNote,
            item.amount,
          ]);
          currentRow++;
        }
      }
      const shortEndRow = currentRow - 1;
      const subtotalShortRow = currentRow;
      rows.push([
        'Subtotal — Credit Card & Short-Term Liabilities',
        '',
        '',
        { f: `SUM(D${shortStartRow}:D${shortEndRow})` },
      ]);
      currentRow++;

      // TOTAL LIABILITIES ROW
      const totalLiabilitiesRow = currentRow;
      rows.push([
        'TOTAL LIABILITIES (D + E)',
        '',
        '',
        { f: `D${subtotalLoansRow}+D${subtotalShortRow}` },
      ]);
      currentRow++;

      rows.push([]);
      currentRow++;

      // SECTION III: NET WORTH & ACCOUNTING EQUATION RECONCILIATION
      rows.push(['III. NET WORTH & EQUITY RECONCILIATION', '', '', 'AMOUNT (INR)']);
      currentRow++;

      const netWorthRow = currentRow;
      rows.push([
        'NET WORTH / OWNER EQUITY (Total Assets − Total Liabilities)',
        '',
        '',
        { f: `D${totalAssetsRow}-D${totalLiabilitiesRow}` },
      ]);
      currentRow++;

      rows.push([
        'TOTAL LIABILITIES + NET WORTH (Accounting Equation Check: Assets = Liabilities + Net Worth)',
        '',
        '',
        { f: `D${totalLiabilitiesRow}+D${netWorthRow}` },
      ]);
      currentRow++;

      rows.push([]);
      rows.push(['IV. ASSUMPTIONS, VALUATION BASIS & OMISSIONS DISCLOSURES']);
      for (const note of statement.assumptionsAndDisclosures) {
        rows.push([note]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 52 }, { wch: 26 }, { wch: 42 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
      XLSX.writeFile(wb, `Finora_Balance_Sheet_${asOfDate}.xlsx`);
      showToast(`Downloaded Excel Balance Sheet (${asOfDate}).`, 'success');
    } catch (err) {
      console.error('Excel export failed:', err);
      showToast('Failed to generate Excel workbook.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact Page Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">Balance Sheet & Net Worth</h1>
          <p className="supporting-text mt-0.5">
            Point-in-time Statement of Financial Position reconciling Assets, Liabilities, and Net Worth.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* As-Of Date Selector */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <label htmlFor="bs-asof-date" className="text-xs text-slate-500 dark:text-slate-400">
              As of:
            </label>
            <input
              id="bs-asof-date"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value || getTodayISO())}
              className="bg-transparent text-xs font-mono-tabular font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode('personal')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'personal'
                  ? 'bg-white dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Personal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('professional')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === 'professional'
                  ? 'bg-white dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-500/30 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Professional Statement
            </button>
          </div>

          {/* Download Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleDownloadExcelWorkbook}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Fundamental Accounting Equation Hero Banner (Assets = Liabilities + Net Worth) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 data-surface p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label text-emerald-700 dark:text-emerald-400">
              Total Assets (What You Own)
            </span>
            <button
              type="button"
              onClick={() => openAddModal('asset')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Asset
            </button>
          </div>
          <p className="mt-2 metric-value text-slate-900 dark:text-white">
            {formatCurrency(statement.assets.totalAssets, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Liquid: {formatCurrency(statement.assets.totalLiquidAssets, currency)} · Invested/Other:{' '}
            {formatCurrency(statement.assets.totalInvestmentsAndOther, currency)}
          </p>
        </div>

        <div className="lg:col-span-4 data-surface p-4 border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label text-rose-700 dark:text-rose-400">
              Total Liabilities (What You Owe)
            </span>
            <button
              type="button"
              onClick={() => openAddModal('liability')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Liability
            </button>
          </div>
          <p className="mt-2 metric-value text-rose-600 dark:text-rose-400">
            {formatCurrency(statement.liabilities.totalLiabilities, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Loans: {formatCurrency(statement.liabilities.totalLoans, currency)} · Short-Term:{' '}
            {formatCurrency(
              statement.liabilities.totalCreditCardDues +
                statement.liabilities.totalOtherLiabilities,
              currency
            )}
          </p>
        </div>

        <div className="lg:col-span-4 data-surface p-4 border-l-4 border-l-sky-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="card-label text-sky-700 dark:text-sky-300">
              Net Worth (Assets − Liabilities)
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              Solvency: {statement.ratios.solvencyRatioPercent.toFixed(1)}%
            </span>
          </div>
          <p
            className={`mt-2 metric-value ${
              statement.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(statement.netWorth, currency)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            Debt-to-Asset Ratio: {statement.ratios.debtToAssetPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Double-Counting Guard Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 data-surface px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Savings Goal Double-Counting Guard:</strong> By default, Savings Goals are treated as earmarked sub-allocations already held inside your bank accounts so they are never counted twice in Total Assets.
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 shrink-0">
          <input
            type="checkbox"
            checked={includeGoalsAsSeparateAssets}
            onChange={(e) => setIncludeGoalsAsSeparateAssets(e.target.checked)}
            className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
          />
          <span>Count Savings Goals as separate external assets</span>
        </label>
      </div>

      {/* Two-Column Statement of Financial Position */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: ASSETS (6 cols) */}
        <div className="lg:col-span-6 data-surface overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-emerald-500/[0.06] px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {viewMode === 'professional'
                  ? 'I. ASSETS — SCHEDULES A, B & C'
                  : 'Assets (What You Own)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                As of {formatDateIN(asOfDate)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAddModal('asset')}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Manual Asset
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Schedule A: Cash & Bank Accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span>Schedule A · Cash & Bank Balances</span>
                <span className="font-mono-tabular">
                  {formatCurrency(statement.assets.totalCashAndBank, currency)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                {statement.assets.cashAndBank.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.subCategory} · {item.institutionOrNote}
                      </p>
                    </div>
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule B: Savings Goals Reserve */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <span>
                  Schedule B · Savings Goal Reserves{' '}
                  {!includeGoalsAsSeparateAssets && '(Earmarked Memo)'}
                </span>
                <span className="font-mono-tabular">
                  {includeGoalsAsSeparateAssets
                    ? formatCurrency(statement.assets.totalSavingsGoalsIncluded, currency)
                    : '₹0 (Guarded)'}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                {statement.assets.savingsGoalsEarmarked.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{item.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.institutionOrNote}</p>
                    </div>
                    <span
                      className={`font-mono-tabular ${
                        includeGoalsAsSeparateAssets
                          ? 'font-semibold text-slate-900 dark:text-slate-100'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule C: Investments, FDs & Manual Assets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <span>Schedule C · Investments, FDs & Other Assets</span>
                <span className="font-mono-tabular">
                  {formatCurrency(statement.assets.totalInvestmentsAndOther, currency)}
                </span>
              </div>
              {statement.assets.investmentsAndOtherAssets.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  No manual investments, FDs, or physical assets added yet. Click "+ Add Manual Asset" to include Mutual Funds, PPF, Gold, or Equipment.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                  {statement.assets.investmentsAndOtherAssets.map((item) => {
                    const rawItem = balanceSheetItems.find((b) => b.id === item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                            {item.isLiquid && (
                              <span className="rounded bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-1.5 py-0.5 text-[10px]">
                                Liquid
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.subCategory} · {item.institutionOrNote}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.amount, currency)}
                          </span>
                          {rawItem && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(rawItem)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBalanceSheetItem(rawItem.id)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Assets Footer */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white">
              <span>TOTAL ASSETS</span>
              <span className="font-mono-tabular text-emerald-700 dark:text-emerald-300">
                {formatCurrency(statement.assets.totalAssets, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: LIABILITIES & NET WORTH (6 cols) */}
        <div className="lg:col-span-6 data-surface overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-rose-500/[0.06] px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {viewMode === 'professional'
                  ? 'II. LIABILITIES & III. NET WORTH'
                  : 'Liabilities & Net Worth'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reconciled to Total Assets ({formatCurrency(statement.liabilitiesPlusNetWorth, currency)})
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAddModal('liability')}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 border border-rose-400/30 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Manual Liability
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Schedule D: Active Loans & EMIs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <span>Schedule D · Outstanding Loans & EMIs</span>
                <span className="font-mono-tabular">
                  {formatCurrency(statement.liabilities.totalLoans, currency)}
                </span>
              </div>
              {statement.liabilities.loansAndDebt.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No active loans as of {formatDateIN(asOfDate)}.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                  {statement.liabilities.loansAndDebt.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.subCategory} · {item.institutionOrNote}
                        </p>
                      </div>
                      <span className="font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule E: Credit Cards & Short-Term Payables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span>Schedule E · Credit Cards & Other Liabilities</span>
                <span className="font-mono-tabular">
                  {formatCurrency(
                    statement.liabilities.totalCreditCardDues +
                      statement.liabilities.totalOtherLiabilities,
                    currency
                  )}
                </span>
              </div>
              {statement.liabilities.creditCardDues.length === 0 &&
              statement.liabilities.otherLiabilities.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  No credit card dues or short-term payables recorded.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.05] text-xs">
                  {[
                    ...statement.liabilities.creditCardDues,
                    ...statement.liabilities.otherLiabilities,
                  ].map((item) => {
                    const rawItem = balanceSheetItems.find((b) => b.id === item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.subCategory} · {item.institutionOrNote}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(item.amount, currency)}
                          </span>
                          {rawItem && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(rawItem)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBalanceSheetItem(rawItem.id)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Liabilities Subtotal */}
            <div className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-400/25 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-200">
              <span>TOTAL LIABILITIES</span>
              <span className="font-mono-tabular text-rose-600 dark:text-rose-300">
                {formatCurrency(statement.liabilities.totalLiabilities, currency)}
              </span>
            </div>

            {/* Net Worth / Owner's Equity */}
            <div className="flex items-center justify-between rounded-lg bg-sky-500/10 border border-sky-400/25 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-200">
              <span>NET WORTH (OWNER'S EQUITY)</span>
              <span className="font-mono-tabular text-sky-600 dark:text-sky-300">
                {formatCurrency(statement.netWorth, currency)}
              </span>
            </div>

            {/* Accounting Equation Total */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white">
              <span>TOTAL LIABILITIES + NET WORTH</span>
              <span className="font-mono-tabular text-emerald-700 dark:text-emerald-300">
                {formatCurrency(statement.liabilitiesPlusNetWorth, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions, Valuation Basis & Omissions Disclosure Card */}
      <div className="data-surface p-4 space-y-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
            Statement Notes, Valuation Basis & Omissions Disclosures
          </h3>
        </div>
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
          {statement.assumptionsAndDisclosures.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </div>

      {/* Add / Edit Manual Balance Sheet Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingItem
                  ? `Edit ${entryType === 'asset' ? 'Asset' : 'Liability'}`
                  : `Add Manual ${entryType === 'asset' ? 'Asset' : 'Liability'}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualItem} className="p-5 space-y-3.5">
              {itemError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{itemError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    entryType === 'asset'
                      ? 'e.g. Nifty 50 Index Fund, SBI Fixed Deposit, Hostel Deposit'
                      : 'e.g. HDFC Credit Card Bill, Friend Borrowing'
                  }
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
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  >
                    {(entryType === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Carrying Value (₹) *
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Institution / Counterparty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zerodha, SBI, Landlord"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Valuation Date
                  </label>
                  <input
                    type="date"
                    value={valuationDate}
                    onChange={(e) => setValuationDate(e.target.value)}
                    className="w-full rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
                  />
                </div>
              </div>

              {entryType === 'asset' && (
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLiquid}
                    onChange={(e) => setIsLiquid(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-emerald-600"
                  />
                  <span>Liquid / Redeemable within 30 days (counts toward Liquidity Ratio)</span>
                </label>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional valuation notes..."
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
                  {editingItem ? 'Save Changes' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
