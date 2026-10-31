import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeBudgetProgressList,
  computeMonthlySummary,
  computeTotalBalance,
  formatCurrency,
  formatMonthLabel,
} from '../utils/calculations';

const SUGGESTED_PROMPTS = [
  {
    label: 'Analyze My Spending',
    question: 'Where did most of my money go this month? Analyze my spending breakdown.',
  },
  {
    label: 'Explain My Monthly Budget',
    question: 'Am I staying within my monthly and category budgets this month?',
  },
  {
    label: 'Find Saving Opportunities',
    question:
      'Which categories can I reduce spending in, and how much money could I save if I reduced shopping expenses by 20%?',
  },
  {
    label: 'Compare This Month and Last Month',
    question: 'Compare my expenses this month with last month and explain why they changed.',
  },
  {
    label: 'Review My Savings Goals',
    question:
      'Review my savings goals and tell me how much I should save monthly to reach my laptop goal on time.',
  },
];

export const AIAssistantView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    budgets,
    savingsGoals,
    selectedMonth,
    aiMessages,
    aiLoading,
    aiError,
    sendAIMessage,
    clearAIConversation,
  } = useFinance();

  const [input, setInput] = useState<string>('');
  const [lastQuestion, setLastQuestion] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currency = profile?.currency || 'INR';

  const monthSummary = useMemo(
    () => computeMonthlySummary(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const totalBalance = useMemo(
    () => computeTotalBalance(accounts, transactions),
    [accounts, transactions]
  );

  const { overallBudget } = useMemo(
    () =>
      computeBudgetProgressList(
        budgets,
        transactions,
        selectedMonth,
        profile?.monthlyBudget || 0
      ),
    [budgets, transactions, selectedMonth, profile?.monthlyBudget]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiLoading]);

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || aiLoading) return;
    setLastQuestion(q);
    setInput('');
    await sendAIMessage(q);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend(input);
  };

  return (
    <div className="space-y-5">
      {/* Compact Page Header */}
      <div>
        <h1 className="page-title">AI Financial Assistant</h1>
        <p className="supporting-text mt-1">
          Ask questions about your spending patterns, monthly budgets, and savings targets—grounded on verified {formatMonthLabel(selectedMonth)} figures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left/Main Column: Distinctive AI Assistant Interface */}
        <div className="lg:col-span-8 flex flex-col rounded-xl data-surface border border-slate-200 dark:border-violet-500/20 overflow-hidden h-[calc(100vh-14rem)] min-h-[540px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-violet-400/20 px-5 py-3.5 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 text-violet-700 dark:text-violet-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Finora AI Financial Assistant
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-violet-200/70">
                  Powered by server-side Gemini API · Grounded on your verified {formatMonthLabel(selectedMonth)} records
                </p>
              </div>
            </div>

            {aiMessages.length > 0 && (
              <button
                type="button"
                onClick={clearAIConversation}
                className="inline-flex items-center gap-1.5 rounded-lg glass-button-secondary px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Conversation
              </button>
            )}
          </div>

          {/* Suggested Prompts Bar */}
          <div className="border-b border-slate-200 dark:border-violet-400/15 bg-slate-50 dark:bg-black/25 px-5 py-2.5">
            <p className="text-[11px] font-medium text-violet-800 dark:text-violet-300/80 mb-2">
              Suggested Financial Questions:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => handleSend(item.question)}
                  className="rounded-lg border border-violet-500/20 dark:border-violet-400/25 bg-white dark:bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-100 hover:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {aiMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-gradient-to-br from-violet-500/25 to-indigo-500/15 border border-violet-500/20 text-violet-700 dark:text-violet-300">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Ask about your spending, budgets, or savings goals
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Finora computes exact totals and percentages from your recorded transactions before sending them to Gemini—ensuring accurate arithmetic and zero hallucinated figures.
              </p>
            </div>
          ) : (
            aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-gradient-to-br from-violet-500/35 to-indigo-500/25 border border-violet-500/20 text-violet-700 dark:text-violet-200 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'border border-slate-200 dark:border-white/12 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-xs'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 mt-0.5">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {aiLoading && (
            <div className="flex items-center gap-2.5 text-xs text-violet-700 dark:text-violet-200">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 dark:bg-violet-500/25 border border-violet-500/20 text-violet-700 dark:text-violet-300">
                <RefreshCw className="h-3 w-3 animate-spin" />
              </div>
              <span>Analyzing your financial records with Gemini...</span>
            </div>
          )}

          {aiError && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{aiError}</span>
              </div>
              {lastQuestion && (
                <button
                  type="button"
                  onClick={() => handleSend(lastQuestion)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-500 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-violet-400/20 bg-slate-50 dark:bg-black/30">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-950/85 border border-slate-200 dark:border-violet-400/30 p-1"
          >
            <input
              type="text"
              disabled={aiLoading}
              placeholder="Ask Gemini about your finances (e.g. 'How much did I spend on food this month?')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={aiLoading || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md btn-primary px-3.5 py-1.5 text-xs whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Live Grounding Context & Prompts */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-xl data-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Verified Financial Context Snapshot
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These exact backend-computed figures are supplied to Gemini so it never guesses arithmetic:
          </p>

          <div className="space-y-2 text-xs border-t border-slate-200 dark:border-white/10 pt-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Active Period</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Net Balance</span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {formatCurrency(totalBalance, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Monthly Income</span>
              <span className="font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(monthSummary.income, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Monthly Expenses</span>
              <span className="font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(monthSummary.expenses, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Net Savings</span>
              <span className="font-mono-tabular font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(monthSummary.netSavings, currency)} (
                {monthSummary.savingsRate.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Budget Remaining</span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {overallBudget
                  ? formatCurrency(overallBudget.remainingAmount, currency)
                  : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Active Savings Goals</span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {savingsGoals.length}
              </span>
            </div>
          </div>
        </div>

        {/* More Clickable Example Questions */}
        <div className="rounded-xl data-surface p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">More Questions You Can Ask</h3>
          <div className="space-y-1.5">
            {[
              'How much did I spend on food this week?',
              'How much money could I save if I reduced shopping expenses by 20%?',
              'How much should I save monthly to reach my laptop goal?',
              'Why were my expenses higher or lower this month?',
              'Summarize my financial performance this month.',
            ].map((q) => (
              <button
                key={q}
                type="button"
                disabled={aiLoading}
                onClick={() => handleSend(q)}
                className="w-full text-left rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:border-violet-500/40 hover:bg-violet-50/50 dark:hover:bg-violet-500/10 dark:hover:text-white transition-all"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
