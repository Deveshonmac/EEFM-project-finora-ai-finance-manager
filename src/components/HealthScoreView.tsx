import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Target,
  PieChart,
  Landmark,
  Activity,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeFinancialHealthScore,
  computeHistoricalHealthScores,
  formatMonthLabel,
  HealthMetricDetail,
} from '../utils/calculations';

const DARK_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.96)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  color: '#F8FAFC',
  fontSize: '12px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
};

export const HealthScoreView: React.FC = () => {
  const {
    profile,
    accounts,
    transactions,
    budgets,
    savingsGoals,
    loans,
    selectedMonth,
    setActiveTab,
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

  const healthReport = useMemo(
    () =>
      computeFinancialHealthScore({
        profile,
        accounts,
        transactions,
        budgets,
        savingsGoals,
        loans,
        selectedMonth,
      }),
    [profile, accounts, transactions, budgets, savingsGoals, loans, selectedMonth]
  );

  const historicalScores = useMemo(
    () =>
      computeHistoricalHealthScores({
        profile,
        accounts,
        transactions,
        budgets,
        savingsGoals,
        loans,
        baseMonth: selectedMonth,
      }),
    [profile, accounts, transactions, budgets, savingsGoals, loans, selectedMonth]
  );

  // Circular Gauge SVG Math
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, healthReport.overallScore)) / 100) * circumference;

  const scoreColor =
    healthReport.overallScore >= 80
      ? '#10B981' // Emerald
      : healthReport.overallScore >= 60
      ? '#38BDF8' // Sky
      : healthReport.overallScore >= 40
      ? '#F59E0B' // Amber
      : '#F43F5E'; // Rose

  const badgeClasses =
    healthReport.overallScore >= 80
      ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-400/35'
      : healthReport.overallScore >= 60
      ? 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-400/35'
      : healthReport.overallScore >= 40
      ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-400/35'
      : 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-400/35';

  const getMetricIcon = (id: HealthMetricDetail['id']) => {
    switch (id) {
      case 'savings_rate':
        return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'budget_adherence':
        return <PieChart className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case 'emergency_fund':
        return <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'debt_burden':
        return <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'goal_progress':
        return <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
      case 'spending_stability':
        return <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="page-title">Financial Health Score</h1>
          <p className="supporting-text mt-0.5">
            Rule-based 0–100 financial wellness indicator evaluated for {formatMonthLabel(selectedMonth)}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 border border-violet-400/30 px-3.5 py-2 text-xs font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/20 transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
          Ask AI How to Improve
        </button>
      </div>

      {/* Indicative Wellness Score Disclaimer Banner */}
      <div className="flex items-start justify-between gap-4 data-surface p-3.5 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-900 dark:text-white">Indicative Financial Wellness Score:</strong> This 0–100 score is a transparent, rule-based assessment calculated from your recorded Finora data for{' '}
            <strong className="text-slate-900 dark:text-white">{formatMonthLabel(selectedMonth)}</strong>. It is an educational personal finance indicator—not an official CIBIL/credit bureau score or regulated financial advice. Metrics with missing data are excluded and re-normalized rather than penalized with a zero.
          </span>
        </div>
      </div>

      {/* Top Row: Circular Gauge Hero + 6-Month Score Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Circular Progress Indicator & Score Tier (5 cols) */}
        <div className="lg:col-span-5 data-surface p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-heading">Overall Wellness Score</h2>
              <p className="supporting-text text-xs">
                Evaluated for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${badgeClasses}`}
            >
              {healthReport.category}
            </span>
          </div>

          <div className="my-5 flex flex-col sm:flex-row items-center gap-5">
            {/* SVG Circular Progress Gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={theme === 'dark' ? 'rgba(148,163,184,0.1)' : '#E2E8F0'}
                  strokeWidth="11"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {healthReport.overallScore}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Out of 100
                </span>
              </div>
            </div>

            {/* Score Scale Reference */}
            <div className="space-y-2 text-xs w-full">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Score Classification Scale</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">Strong</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300 text-[11px]">80 – 100</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-sky-500/10 border border-sky-400/20 px-2 py-1">
                  <span className="text-sky-700 dark:text-sky-300 font-medium text-[11px]">Good</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300 text-[11px]">60 – 79</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-amber-500/10 border border-amber-400/20 px-2 py-1">
                  <span className="text-amber-700 dark:text-amber-300 font-medium text-[11px]">Needs Improvement</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300 text-[11px]">40 – 59</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-rose-500/10 border border-rose-400/20 px-2 py-1">
                  <span className="text-rose-700 dark:text-rose-300 font-medium text-[11px]">Requires Attention</span>
                  <span className="font-mono-tabular text-slate-600 dark:text-slate-300 text-[11px]">0 – 39</span>
                </div>
              </div>
            </div>
          </div>

          {healthReport.excludedMetrics.length > 0 ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-400/25 p-2.5 text-xs text-amber-800 dark:text-amber-200">
              <strong>Missing Data Disclosure:</strong> {healthReport.excludedMetrics.join(', ')}{' '}
              could not be evaluated due to unconfigured records and {healthReport.excludedMetrics.length === 1 ? 'was' : 'were'} excluded from the denominator ({healthReport.availableWeightTotal}% active weight re-normalized to 100%).
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>All 6 weighted financial health dimensions (100% weight) are active and verified.</span>
            </div>
          )}
        </div>

        {/* Right: Historical Score Trend & Personalized Suggestions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 justify-between">
          {/* 6-Month Score Trend Chart */}
          <div className="data-surface p-4 flex-1 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="section-heading">
                6-Month Financial Health Trajectory
              </h3>
              <p className="supporting-text text-xs">
                Historical wellness score evolution across recent financial months
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalScores} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="healthScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartTickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: chartTickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} / 100`, 'Health Score']}
                    contentStyle={tooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#healthScoreGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Personalized Improvement Suggestions */}
          <div className="data-surface p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                Personalized Action Plan to Boost Your Score
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
              {healthReport.topSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/75 border border-slate-200 dark:border-slate-800/80 p-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono-tabular text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed 6-Metric Weighted Breakdown Grid */}
      <div className="space-y-3">
        <div>
          <h3 className="section-heading">
            Transparent 6-Factor Weighted Breakdown
          </h3>
          <p className="supporting-text text-xs">
            Exact weights, observed values, benchmarks, and individual component scores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthReport.metrics.map((m) => {
            const barColor =
              !m.available
                ? 'bg-slate-400 dark:bg-slate-600'
                : m.rawScore >= 80
                ? 'bg-emerald-500'
                : m.rawScore >= 60
                ? 'bg-sky-500'
                : m.rawScore >= 40
                ? 'bg-amber-500'
                : 'bg-rose-500';

            return (
              <div
                key={m.id}
                className="data-surface p-4 flex flex-col justify-between space-y-3 rounded-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
                        {getMetricIcon(m.id)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">{m.name}</h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                          Standard Weight: {m.weight}%
                        </span>
                      </div>
                    </div>

                    {m.available ? (
                      <div className="text-right font-mono-tabular">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{m.rawScore}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">/100</span>
                      </div>
                    ) : (
                      <span className="rounded-md bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        Excluded
                      </span>
                    )}
                  </div>

                  {/* Observed Value & Benchmark */}
                  <div className="rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-2.5 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Observed Value:</span>
                      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                        {m.displayValue}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Target Benchmark:</span>
                      <span className="font-mono-tabular text-emerald-600 dark:text-emerald-300 font-medium">
                        {m.benchmarkLabel}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${m.available ? m.rawScore : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                      <span>
                        {m.available
                          ? `Effective Weight: ${m.effectiveWeight.toFixed(1)}%`
                          : 'Not counted in denominator'}
                      </span>
                      {m.available && (
                        <span className="text-slate-700 dark:text-slate-200">
                          +{m.weightedContribution.toFixed(1)} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2.5 space-y-1 text-xs">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.available ? m.explanation : m.missingReason}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                    💡 {m.recommendation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
