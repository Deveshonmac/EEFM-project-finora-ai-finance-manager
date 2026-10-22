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
    await addAccount({
      name: newAccName.trim(),
      accountType: newAccType,
      openingBalance: Number(newAccOpening) || 0,
      currency,
    });
    setNewAccName('');
    setNewAccOpening('0');
    setShowAddAccount(false);
  };

  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || 'Primary Account';

  return (
    <div className="space-y-6">
      {/* Accounts & Wallets Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Accounts & Wallets</h2>
            <p className="text-xs text-slate-500">
              Live balances computed from opening balances, income, expenses, and transfers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddAccount((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Wallet className="h-3.5 w-3.5" />
              {showAddAccount ? 'Cancel' : 'Add Account'}
            </button>
            <button
              type="button"
              onClick={() => openTransactionModal('transfer')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transfer
            </button>
            <button
              type="button"
              onClick={() => openTransactionModal('expense')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </button>
          </div>
        </div>

        {showAddAccount && (
          <form
            onSubmit={handleAddAccountSubmit}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <input
              type="text"
              required
              placeholder="Account Name (e.g. HDFC Bank)"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            />
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value as AccountType)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono-tabular text-slate-900"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Save Account
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
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                accountFilter === acc.id
                  ? 'border-teal-700 bg-teal-50/40'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{acc.accountType}</span>
                <span>Opening: {formatCurrency(acc.openingBalance, currency)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{acc.name}</p>
              <p className="mt-2 text-xl font-bold font-mono-tabular text-slate-900">
                {formatCurrency(acc.currentBalance, currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, notes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'income' | 'expense' | 'transfer')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
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
            <label className="text-xs text-slate-500 shrink-0">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono-tabular text-slate-900"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
          >
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
            <option value="amount_desc">Sort: Highest Amount</option>
            <option value="amount_asc">Sort: Lowest Amount</option>
          </select>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            <span className="text-xs text-slate-500 font-mono-tabular">
              {filteredTransactions.length} match{filteredTransactions.length === 1 ? '' : 'es'}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              No transactions match your current filters
            </p>
            <p className="text-xs text-slate-500">
              Try adjusting your search query, date range, or category filter, or record a new transaction.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear All Filters
              </button>
              <button
                type="button"
                onClick={() => openTransactionModal('expense')}
                className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
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
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                    <th className="py-3 px-6 font-medium">Description</th>
                    <th className="py-3 px-4 font-medium">Category · Account</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-6 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2.5">
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : tx.type === 'transfer' ? (
                            <ArrowLeftRight className="h-4 w-4 text-teal-600 shrink-0" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{tx.description}</p>
                            {tx.tags && tx.tags.length > 0 && (
                              <p className="text-[11px] text-slate-400">
                                {tx.tags.join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span>{tx.categoryName}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {tx.type === 'transfer'
                            ? `${getAccountName(tx.accountId)} → ${getAccountName(
                                tx.destinationAccountId
                              )}`
                            : getAccountName(tx.accountId)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono-tabular text-slate-600">
                        {formatDateIN(tx.date)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{tx.paymentMethod}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono-tabular font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-700'
                            : tx.type === 'transfer'
                            ? 'text-slate-700'
                            : 'text-rose-700'
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
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openTransactionModal(tx.type, tx)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Transaction"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
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
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-xs text-slate-600">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="font-mono-tabular">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Description</span>
                <span className="font-semibold text-slate-900">{inspectingTx.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Type</span>
                <span className="capitalize font-medium text-slate-900">{inspectingTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Amount</span>
                <span className="font-mono-tabular font-bold text-slate-900">
                  {formatCurrency(inspectingTx.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-900">{inspectingTx.categoryName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-mono-tabular text-slate-900">
                  {formatDateIN(inspectingTx.date)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Account</span>
                <span className="text-slate-900">
                  {inspectingTx.type === 'transfer'
                    ? `${getAccountName(inspectingTx.accountId)} → ${getAccountName(
                        inspectingTx.destinationAccountId
                      )}`
                    : getAccountName(inspectingTx.accountId)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-slate-900">{inspectingTx.paymentMethod}</span>
              </div>
              {inspectingTx.notes && (
                <div className="py-1 border-b border-slate-100">
                  <span className="text-slate-500 block mb-1">Notes</span>
                  <p className="text-slate-800">{inspectingTx.notes}</p>
                </div>
              )}
              {inspectingTx.tags && inspectingTx.tags.length > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Tags</span>
                  <span className="text-slate-800">{inspectingTx.tags.join(' · ')}</span>
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
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setInspectingTx(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Delete Transaction?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deletingTx.description}</strong> (
              {formatCurrency(deletingTx.amount, currency)})? Account balances and monthly totals will be recalculated immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
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
