import React, { useEffect, useState } from 'react';
import { X, Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PAYMENT_METHODS, PaymentMethod, TransactionType } from '../types/finance';
import { formatCurrency, getTodayISO } from '../utils/calculations';

export const TransactionModal: React.FC = () => {
  const {
    quickModal,
    closeTransactionModal,
    accounts,
    categories,
    addTransaction,
    updateTransaction,
    addCategory,
    profile,
  } = useFinance();

  const { isOpen, defaultType, editingTransaction } = quickModal;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState<string>(getTodayISO());
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');

  // Custom inline category creation
  const [showNewCat, setShowNewCat] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [creatingCat, setCreatingCat] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const filteredCategories = categories.filter(
    (c) => c.transactionType === (type === 'income' ? 'income' : 'expense')
  );

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowNewCat(false);
    setNewCatName('');

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.categoryId);
      setAccountId(editingTransaction.accountId);
      setDestinationAccountId(editingTransaction.destinationAccountId || '');
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
      setNotes(editingTransaction.notes || '');
      setTagsInput((editingTransaction.tags || []).join(', '));
    } else {
      setType(defaultType);
      setAmount('');
      setDescription('');
      const relevantCats = categories.filter(
        (c) => c.transactionType === (defaultType === 'income' ? 'income' : 'expense')
      );
      setCategoryId(relevantCats[0]?.id || '');
      setAccountId(accounts[0]?.id || '');
      setDestinationAccountId(accounts[1]?.id || '');
      setPaymentMethod('UPI');
      setDate(getTodayISO());
      setNotes('');
      setTagsInput('');
    }
  }, [isOpen, defaultType, editingTransaction, accounts, categories]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setError(null);
    if (newType !== 'transfer') {
      const relevantCats = categories.filter((c) => c.transactionType === newType);
      if (!relevantCats.some((c) => c.id === categoryId)) {
        setCategoryId(relevantCats[0]?.id || '');
      }
    }
  };

  if (!isOpen) return null;

  const handleCreateCustomCategory = async () => {
    if (!newCatName.trim() || type === 'transfer') return;
    setCreatingCat(true);
    try {
      const created = await addCategory({
        name: newCatName.trim(),
        transactionType: type,
        icon: 'Tag',
      });
      setCategoryId(created.id);
      setNewCatName('');
      setShowNewCat(false);
    } catch {
      setError('Could not create custom category.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount greater than ₹0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a clear description for this transaction.');
      return;
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please select a valid transaction date.');
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      setError('The date entered is invalid.');
      return;
    }

    if (accounts.length > 0 && !accountId) {
      setError('Please select an account or wallet.');
      return;
    }

    if (type === 'transfer') {
      if (accounts.length < 2) {
        setError('You need at least two accounts to record a transfer. Add another account in Settings or Transactions.');
        return;
      }
      if (!destinationAccountId) {
        setError('Please select a destination account for the transfer.');
        return;
      }
      if (accountId === destinationAccountId) {
        setError('Source and destination accounts cannot be the same.');
        return;
      }
    } else if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    setSubmitting(true);
    try {
      const payload = {
        type,
        amount: numAmount,
        description: description.trim(),
        categoryId: type === 'transfer' ? 'TRANSFER' : selectedCat?.id || categoryId,
        categoryName: type === 'transfer' ? 'Account Transfer' : selectedCat?.name || 'General',
        accountId,
        destinationAccountId: type === 'transfer' ? destinationAccountId : '',
        paymentMethod,
        date,
        notes: notes.trim(),
        tags,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
      } else {
        await addTransaction(payload);
      }
      closeTransactionModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const currency = profile?.currency || 'INR';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="tx-modal-title" className="text-lg font-semibold text-slate-900">
            {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
          </h2>
          <button
            type="button"
            onClick={closeTransactionModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto px-6 py-5 space-y-4">
          {/* Segmented Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  type === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="h-3.5 w-3.5" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  type === 'transfer'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Transfer
              </button>
            </div>
            {type === 'transfer' && (
              <p className="mt-1.5 text-xs text-slate-500">
                Transfers move money between your own accounts without counting as income or expense.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Amount ({currency === 'INR' ? '₹' : currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 1200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              maxLength={200}
              placeholder={
                type === 'income'
                  ? 'e.g. Monthly Pocket Money or Freelance Project'
                  : type === 'transfer'
                  ? 'e.g. Top up UPI Wallet from SBI Account'
                  : 'e.g. Campus Canteen Lunch or Metro Recharge'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          {/* Category (Income / Expense) */}
          {type !== 'transfer' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Category *</label>
                <button
                  type="button"
                  onClick={() => setShowNewCat((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showNewCat ? 'Cancel Custom' : 'New Custom Category'}
                </button>
              </div>

              {showNewCat ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={80}
                    placeholder={`New ${type} category name...`}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={creatingCat || !newCatName.trim()}
                    onClick={handleCreateCustomCategory}
                    className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {!c.isDefault ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {type === 'transfer' ? 'From Account *' : 'Account / Wallet *'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
              >
                {accounts.length === 0 ? (
                  <option value="">Primary Bank Account (Auto-Created)</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                    </option>
                  ))
                )}
              </select>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To Destination Account *
                </label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                >
                  <option value="">Select destination...</option>
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Optional Notes & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tags (comma separated, optional)
              </label>
              <input
                type="text"
                placeholder="e.g. campus, lunch, semester"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 mt-2">
            <button
              type="button"
              onClick={closeTransactionModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting
                ? 'Saving...'
                : editingTransaction
                ? 'Update Transaction'
                : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
