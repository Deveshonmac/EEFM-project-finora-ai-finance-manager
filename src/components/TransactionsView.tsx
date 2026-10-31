import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Eye,
  X,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  ACCOUNT_TYPES,
  AccountType,
  PAYMENT_METHODS,
  Transaction,
} from '../types/finance';
import { formatCurrency, formatDateIN } from '../utils/calculations';

export const TransactionsView: React.FC = () => {
  const {
    profile,
    accounts,
    categories,
    transactions,
    openTransactionModal,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    categoryDrilldown,
    setCategoryDrilldown,
  } = useFinance();

  const currency = profile?.currency || 'INR';

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>(
    'date_desc'
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [showAddAccount, setShowAddAccount] = useState<boolean>(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<AccountType>('Bank Account');
  const [newAccOpening, setNewAccOpening] = useState<string>('0');

  useEffect(() => {
    if (categoryDrilldown) {
      setCategoryFilter(categoryDrilldown);
    }
  }, [categoryDrilldown]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      if (q) {
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchTags = (tx.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchDesc && !matchNotes && !matchTags) return false;
      }
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (
        categoryFilter !== 'all' &&
        tx.categoryName.toLowerCase() !== categoryFilter.toLowerCase() &&
        tx.categoryId !== categoryFilter
      ) {
        return false;
      }
      if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false;
      if (
        accountFilter !== 'all' &&
        tx.accountId !== accountFilter &&
        tx.destinationAccountId !== accountFilter
      ) {
        return false;
      }
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      return a.amount - b.amount;
    });

    return list;
  }, [
    transactions,
    searchQuery,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    accountFilter,
    startDate,
    endDate,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    typeFilter,
    categoryFilter,
    paymentMethodFilter,
    accountFilter,
    startDate,
    endDate,
    sortBy,
  ]);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setCategoryDrilldown(null);
    setPaymentMethodFilter('all');
    setAccountFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('date_desc');
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    if (editingAccountId) {
      await updateAccount(editingAccountId, {
        name: newAccName.trim(),
        accountType: newAccType,
        openingBalance: Number(newAccOpening) || 0,
      });
    } else {
      await addAccount({
        name: newAccName.trim(),
        accountType: newAccType,
        openingBalance: Number(newAccOpening) || 0,
        currency,
      });
    }
    setNewAccName('');
    setNewAccOpening('0');
    setEditingAccountId(null);
    setShowAddAccount(false);
  };

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || 'Primary Account';

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => a.id === accountFilter) || null,
    [accounts, accountFilter]
  );

  return (
    <div className="space-y-5">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="page-title">Transactions & Accounts</h1>
          <p className="supporting-text mt-0.5">
            Manage bank accounts, UPI wallets, internal transfers, and categorized transaction history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openTransactionModal('expense')}
            className="inline-flex items-center gap-1.5 rounded-lg btn-primary px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </button>
          <button
            type="button"
            onClick={() => openTransactionModal('transfer')}
            className="inline-flex items-center gap-1.5 rounded-lg glass-button-secondary px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
            Transfer Money
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingAccountId(null);
              setNewAccName('');
              setNewAccType('Bank Account');
              setNewAccOpening('0');
              setShowAddAccount((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg glass-button-secondary px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {showAddAccount ? 'Cancel' : 'Add Account'}
          </button>
        </div>
      </div>

      {/* Accounts & Wallets Strip */}
      <div className="data-surface p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-heading">Accounts & Wallets</h2>
            <p className="supporting-text">
              Select any account card to filter the ledger below by its individual transaction history
            </p>
          </div>
        </div>

        {showAddAccount && (
          <form
            onSubmit={handleAddAccountSubmit}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-4"
          >
            <input
              type="text"
              required
              placeholder="Account Name (e.g. HDFC Bank)"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="rounded-lg glass-input px-3 py-2 text-xs"
            />
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value as AccountType)}
              className="rounded-lg glass-input px-3 py-2 text-xs"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Opening Balance (₹)"
              value={newAccOpening}
              onChange={(e) => setNewAccOpening(e.target.value)}
              className="rounded-lg glass-input px-3 py-2 text-xs font-mono-tabular"
            />
            <button
              type="submit"
              className="rounded-lg btn-primary px-4 py-2 text-xs font-medium"
            >
              {editingAccountId ? 'Update Account' : 'Save Account'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() =>
                setAccountFilter((prev) => (prev === acc.id ? 'all' : acc.id))
              }
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                accountFilter === acc.id
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{acc.accountType}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccountId(acc.id);
                      setNewAccName(acc.name);
                      setNewAccType(acc.accountType);
                      setNewAccOpening(String(acc.openingBalance));
                      setShowAddAccount(true);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Edit Account"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteAccount(acc.id)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white truncate">{acc.name}</p>
              <p className="mt-2 text-xl font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                {formatCurrency(acc.currentBalance, currency)}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                <span>Opening: {formatCurrency(acc.openingBalance, currency)}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                  {accountFilter === acc.id ? 'Viewing History ✓' : 'View Ledger →'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {selectedAccountObj && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Account Ledger Filter Active: {selectedAccountObj.name}
                </span>
                <span className="text-slate-600 dark:text-slate-300 ml-2 font-mono-tabular">
                  (Inflows: +{formatCurrency(selectedAccountObj.totalIncome, currency)} · Outflows: -
                  {formatCurrency(selectedAccountObj.totalExpense, currency)} · Net Transfers:{' '}
                  {selectedAccountObj.netTransfers >= 0 ? '+' : ''}
                  {formatCurrency(selectedAccountObj.netTransfers, currency)})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAccountFilter('all')}
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline"
            >
              Show All Accounts
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-xl data-surface p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg glass-input pl-9 pr-3 py-2 text-xs"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'income' | 'expense' | 'transfer')
            }
            className="rounded-lg glass-input px-3 py-2 text-xs"
          >
            <option value="all">All Transaction Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg glass-input px-3 py-2 text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.transactionType})
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="rounded-lg glass-input px-3 py-2 text-xs"
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg glass-input px-2.5 py-1.5 text-xs font-mono-tabular"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg glass-input px-2.5 py-1.5 text-xs font-mono-tabular"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
              )
            }
            className="rounded-lg glass-input px-3 py-1.5 text-xs"
          >
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
            <option value="amount_desc">Sort: Highest Amount</option>
            <option value="amount_asc">Sort: Lowest Amount</option>
          </select>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {filteredTransactions.length} match{filteredTransactions.length === 1 ? '' : 'es'}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl data-surface overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No transactions match your current filters
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search query, date range, or category filter, or record a new transaction.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg glass-button-secondary px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                Clear All Filters
              </button>
              <button
                type="button"
                onClick={() => openTransactionModal('expense')}
                className="rounded-lg btn-primary px-3.5 py-2 text-xs font-medium"
              >
                Add Transaction
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6 font-medium">Description</th>
                    <th className="py-3 px-4 font-medium">Category · Account</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-6 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-sm">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2.5">
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : tx.type === 'transfer' ? (
                            <ArrowLeftRight className="h-4 w-4 text-sky-500 dark:text-sky-400 shrink-0" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{tx.description}</p>
                            {tx.tags && tx.tags.length > 0 && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {tx.tags.join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <span>{tx.categoryName}</span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600"> · </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {tx.type === 'transfer'
                            ? `${getAccountName(tx.accountId)} → ${getAccountName(
                                tx.destinationAccountId
                              )}`
                            : getAccountName(tx.accountId)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
                        {formatDateIN(tx.date)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{tx.paymentMethod}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-sky-600 dark:text-sky-300'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectingTx(tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openTransactionModal(tx.type, tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.08] px-6 py-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
                {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg glass-button-secondary px-2.5 py-1 font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="font-mono-tabular text-slate-700 dark:text-slate-200">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg glass-button-secondary px-2.5 py-1 font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Inspect Transaction Details Modal */}
      {inspectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl p-6 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Description</span>
                <span className="font-semibold text-slate-900 dark:text-white">{inspectingTx.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <span className="capitalize font-medium text-slate-700 dark:text-slate-200">{inspectingTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span
                  className={`font-mono-tabular font-bold ${
                    inspectingTx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : inspectingTx.type === 'transfer'
                      ? 'text-sky-600 dark:text-sky-300'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(inspectingTx.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Category</span>
                <span className="text-slate-700 dark:text-slate-200">{inspectingTx.categoryName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-mono-tabular text-slate-700 dark:text-slate-200">
                  {formatDateIN(inspectingTx.date)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Account</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {inspectingTx.type === 'transfer'
                    ? `${getAccountName(inspectingTx.accountId)} → ${getAccountName(
                        inspectingTx.destinationAccountId
                      )}`
                    : getAccountName(inspectingTx.accountId)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Payment Method</span>
                <span className="text-slate-700 dark:text-slate-200">{inspectingTx.paymentMethod}</span>
              </div>
              {inspectingTx.notes && (
                <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Notes</span>
                  <p className="text-slate-700 dark:text-slate-200">{inspectingTx.notes}</p>
                </div>
              )}
              {inspectingTx.tags && inspectingTx.tags.length > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Tags</span>
                  <span className="text-slate-700 dark:text-slate-200">{inspectingTx.tags.join(' · ')}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const tx = inspectingTx;
                  setInspectingTx(null);
                  openTransactionModal(tx.type, tx);
                }}
                className="rounded-lg glass-button-secondary px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="rounded-lg btn-primary px-4 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#172033] border border-slate-200 dark:border-slate-700 shadow-xl p-6 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete Transaction?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 dark:text-white">{deletingTx.description}</strong> (
              {formatCurrency(deletingTx.amount, currency)})? Account balances and monthly totals will be recalculated immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="rounded-lg glass-button-secondary px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingTx.id;
                  setDeletingTx(null);
                  await deleteTransaction(id);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
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
