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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left/Main Column: Chat Interface */}
      <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden h-[calc(100vh-11rem)] min-h-[560px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Finora AI Financial Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Powered by server-side Gemini API · Grounded on your verified {formatMonthLabel(selectedMonth)} records
              </p>
            </div>
          </div>

          {aiMessages.length > 0 && (
            <button
              type="button"
              onClick={clearAIConversation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-rose-700 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Conversation
            </button>
          )}
        </div>

        {/* Suggested Prompts Bar */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <p className="text-[11px] font-medium text-slate-500 mb-2">
            Suggested Financial Questions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={aiLoading}
                onClick={() => handleSend(item.question)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-600 hover:text-teal-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {aiMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-3">
              <Bot className="h-10 w-10 text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-900">
                Ask about your spending, budgets, or savings goals
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Finora computes exact totals and percentages from your recorded transactions before sending them to Gemini—ensuring accurate arithmetic and zero hallucinated figures.
              </p>
            </div>
          ) : (
            aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 mt-0.5">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {aiLoading && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              </div>
              <span>Analyzing your financial records with Gemini...</span>
            </div>
          )}

          {aiError && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{aiError}</span>
              </div>
              {lastQuestion && (
                <button
                  type="button"
                  onClick={() => handleSend(lastQuestion)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 font-semibold text-white hover:bg-rose-800 whitespace-nowrap shrink-0"
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
        <form
          onSubmit={handleFormSubmit}
          className="border-t border-slate-200 bg-white p-4 flex items-center gap-2"
        >
          <input
            type="text"
            disabled={aiLoading}
            placeholder="Ask a question (e.g. 'How much did I spend on food this month?' or 'Summarize my performance')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-hidden disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={aiLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>

      {/* Right Column: Live Grounding Context & Safety Rules */}
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Verified Financial Context Snapshot
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            These exact backend-computed figures are supplied to Gemini so it never guesses arithmetic:
          </p>

          <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Active Period</span>
              <span className="font-semibold text-slate-900">
                {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Net Balance</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {formatCurrency(totalBalance, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Income</span>
              <span className="font-mono-tabular font-semibold text-emerald-700">
                {formatCurrency(monthSummary.income, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Expenses</span>
              <span className="font-mono-tabular font-semibold text-rose-700">
                {formatCurrency(monthSummary.expenses, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Net Savings</span>
              <span className="font-mono-tabular font-semibold text-teal-700">
                {formatCurrency(monthSummary.netSavings, currency)} (
                {monthSummary.savingsRate.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Budget Remaining</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {overallBudget
                  ? formatCurrency(overallBudget.remainingAmount, currency)
                  : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Savings Goals</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {savingsGoals.length}
              </span>
            </div>
          </div>
        </div>

        {/* More Clickable Example Questions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">More Questions You Can Ask</h3>
          <div className="space-y-2">
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
                className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:border-teal-600 hover:bg-teal-50/30 transition-colors"
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
