import React, { useState, useMemo, useDeferredValue, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalculatorState, YearData } from './types';
import { DEFAULT_STATE } from './constants';
import { ResultsChart } from './components/ResultsChart';
import { 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Percent, 
  Download, 
  Info,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  PartyPopper,
  Table as TableIcon,
  BarChart3,
  Coins,
  PieChart as PieChartIcon,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<CalculatorState>(DEFAULT_STATE);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const deferredState = useDeferredValue(state);
  const [selectedStrategy, setSelectedStrategy] = useState<'Aggressive' | 'Moderate' | 'Conservative'>('Moderate');
  const [othersHandling, setOthersHandling] = useState<'separate' | 'add_to_equity' | 'add_to_debt'>('separate');

  const STRATEGIES = {
    Aggressive: {
      points: [
        { age: 35, equity: 75, debt: 25 },
        { age: 40, equity: 70, debt: 30 },
        { age: 45, equity: 65, debt: 35 },
        { age: 50, equity: 55, debt: 45 },
        { age: 55, equity: 40, debt: 60 },
        { age: 60, equity: 15, debt: 85 },
      ],
      description: "Designed for investors with high risk tolerance, keeping equity exposure high for longer to maximize growth."
    },
    Moderate: {
      points: [
        { age: 35, equity: 50, debt: 50 },
        { age: 40, equity: 45, debt: 55 },
        { age: 45, equity: 35, debt: 65 },
        { age: 50, equity: 25, debt: 75 },
        { age: 55, equity: 15, debt: 85 },
        { age: 60, equity: 10, debt: 90 },
      ],
      description: "Balances growth and stability. Equity exposure gradually declines while fixed income increases with age."
    },
    Conservative: {
      points: [
        { age: 35, equity: 25, debt: 75 },
        { age: 40, equity: 20, debt: 80 },
        { age: 45, equity: 15, debt: 85 },
        { age: 50, equity: 10, debt: 90 },
        { age: 55, equity: 5, debt: 95 },
        { age: 60, equity: 5, debt: 95 },
      ],
      description: "Suitable for risk-averse investors who prioritize capital preservation over aggressive growth."
    }
  };

  const getInterpolatedAllocation = (age: number, strategy: keyof typeof STRATEGIES) => {
    const points = STRATEGIES[strategy].points;
    if (age <= points[0].age) return { equity: points[0].equity, debt: points[0].debt };
    if (age >= points[points.length - 1].age) return { equity: points[points.length - 1].equity, debt: points[points.length - 1].debt };
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (age >= p1.age && age <= p2.age) {
        const ratio = (age - p1.age) / (p2.age - p1.age);
        return {
          equity: p1.equity + ratio * (p2.equity - p1.equity),
          debt: p1.debt + ratio * (p2.debt - p1.debt)
        };
      }
    }
    return { equity: 0, debt: 0 };
  };

  const formatIndianCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalAllocation = state.equityAllocation + state.debtAllocation + state.otherAllocation;
  const isValidAllocation = totalAllocation === 100;

  const portfolioReturn = useMemo(() => {
    if (!isValidAllocation) return 0;
    return (
      (deferredState.equityAllocation * deferredState.equityReturn) +
      (deferredState.debtAllocation * deferredState.debtReturn) +
      (deferredState.otherAllocation * deferredState.otherReturn)
    ) / 100;
  }, [deferredState.equityAllocation, deferredState.debtAllocation, deferredState.otherAllocation, deferredState.equityReturn, deferredState.debtReturn, deferredState.otherReturn, isValidAllocation]);

  const targetCorpus = useMemo(() => {
    if (!isValidAllocation) return 0;
    const monthlyReturn = (portfolioReturn / 100) / 12;
    const monthlyInflation = (deferredState.inflationRate / 100) / 12;
    
    // 1. Inflate monthly withdrawal to retirement age
    const yearsToRetirement = deferredState.retirementAge - deferredState.currentAge;
    
    let firstMonthlyWithdrawal = 0;
    if (deferredState.withdrawalMode === 'amount') {
      firstMonthlyWithdrawal = deferredState.monthlyWithdrawalAmount * Math.pow(1 + (deferredState.inflationRate / 100), yearsToRetirement);
    } else {
      const annualLifestyleAtRetirement = (deferredState.monthlyWithdrawalAmount * 12) * Math.pow(1 + (deferredState.inflationRate / 100), yearsToRetirement);
      return annualLifestyleAtRetirement / (deferredState.withdrawalRate / 100);
    }
    
    // 2. Calculate PV of growing annuity for retirement phase
    const n = deferredState.yearsInRetirement * 12;
    const r = monthlyReturn;
    const g = monthlyInflation;
    
    if (r === g) return firstMonthlyWithdrawal * n;
    
    const ratio = (1 + g) / (1 + r);
    return firstMonthlyWithdrawal * (1 - Math.pow(ratio, n)) / (1 - ratio);
  }, [deferredState.monthlyWithdrawalAmount, deferredState.retirementAge, deferredState.currentAge, deferredState.yearsInRetirement, deferredState.inflationRate, portfolioReturn, isValidAllocation, deferredState.withdrawalMode, deferredState.withdrawalRate]);

  const requiredSIP = useMemo(() => {
    if (!isValidAllocation) return 0;
    const monthlyReturn = (portfolioReturn / 100) / 12;
    const monthsToRetirement = (deferredState.retirementAge - deferredState.currentAge) * 12;
    
    if (monthsToRetirement <= 0) return 0;
    
    const fvCurrentCorpus = deferredState.currentCorpus * Math.pow(1 + monthlyReturn, monthsToRetirement);
    const gap = Math.max(0, targetCorpus - fvCurrentCorpus);
    
    if (gap === 0) return 0;
    if (monthlyReturn === 0) return gap / monthsToRetirement;
    
    const numerator = gap * monthlyReturn;
    const denominator = (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) * (1 + monthlyReturn);
    
    return numerator / denominator;
  }, [targetCorpus, deferredState.currentCorpus, deferredState.retirementAge, deferredState.currentAge, portfolioReturn, isValidAllocation]);

  const recommendedAllocation = useMemo(() => {
    const others = 10;
    const equity = Math.max(10, Math.min(70, 80 - deferredState.currentAge));
    const debt = 100 - others - equity;
    
    const overallReturn = (
      (equity * deferredState.equityReturn) +
      (debt * deferredState.debtReturn) +
      (others * deferredState.otherReturn)
    ) / 100;

    return {
      data: [
        { name: 'Equity', value: equity, color: '#3b82f6' },
        { name: 'Debt', value: debt, color: '#10b981' },
        { name: 'Others', value: others, color: '#f59e0b' },
      ],
      overallReturn
    };
  }, [deferredState.currentAge, deferredState.equityReturn, deferredState.debtReturn, deferredState.otherReturn]);

  const allocationTimeline = useMemo(() => {
    const timeline = [];
    const startAge = deferredState.currentAge;
    const endAge = deferredState.retirementAge + deferredState.yearsInRetirement;
    const othersValue = deferredState.otherAllocation;
    
    for (let age = startAge; age <= endAge; age += 1) {
      const { equity: baseEquity, debt: baseDebt } = getInterpolatedAllocation(age, selectedStrategy);
      
      let equity = baseEquity;
      let debt = baseDebt;
      let others = 0;

      if (othersHandling === 'separate') {
        const scale = (100 - othersValue) / 100;
        equity = baseEquity * scale;
        debt = baseDebt * scale;
        others = othersValue;
      } else if (othersHandling === 'add_to_equity') {
        equity = baseEquity;
        debt = baseDebt;
        others = 0;
      } else if (othersHandling === 'add_to_debt') {
        equity = baseEquity;
        debt = baseDebt;
        others = 0;
      }

      timeline.push({
        age,
        Equity: Number(equity.toFixed(1)),
        Debt: Number(debt.toFixed(1)),
        Others: Number(others.toFixed(1))
      });
    }
    
    return timeline;
  }, [deferredState.currentAge, deferredState.retirementAge, deferredState.yearsInRetirement, selectedStrategy, othersHandling, deferredState.otherAllocation]);

  const recommendedFeasibility = useMemo(() => {
    const monthlyReturn = (recommendedAllocation.overallReturn / 100) / 12;
    const monthsToRetirement = (deferredState.retirementAge - deferredState.currentAge) * 12;
    
    if (monthsToRetirement <= 0) return { achievable: true, sip: 0 };

    let corpusNoSip = deferredState.currentCorpus;
    for (let i = 0; i < monthsToRetirement; i++) {
      corpusNoSip += corpusNoSip * monthlyReturn;
    }

    const gap = Math.max(0, targetCorpus - corpusNoSip);
    
    if (gap === 0) return { achievable: true, sip: 0 };
    
    const numerator = gap * monthlyReturn;
    const denominator = (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) * (1 + monthlyReturn);
    const requiredSip = numerator / denominator;

    return {
      achievable: true,
      sip: requiredSip,
      isBetter: requiredSip < requiredSIP
    };
  }, [recommendedAllocation.overallReturn, deferredState, targetCorpus, requiredSIP]);

  const results = useMemo(() => {
    if (!isValidAllocation) return [];
    const data: any[] = [];
    let currentPortfolio = deferredState.currentCorpus;
    let noSipPortfolio = deferredState.currentCorpus;
    
    const monthlyReturn = (portfolioReturn / 100) / 12;
    const monthlyInflation = (deferredState.inflationRate / 100) / 12;
    
    const yearsToRetirement = deferredState.retirementAge - deferredState.currentAge;
    const currentYear = new Date().getFullYear();

    const r = monthlyReturn;
    const n = 12;
    const growthFactor = Math.pow(1 + r, n);
    const annuityFactor = r === 0 ? n : ((growthFactor - 1) / r) * (1 + r);

    // 1. Accumulation Phase
    for (let yearIdx = 0; yearIdx < yearsToRetirement; yearIdx++) {
      const age = deferredState.currentAge + yearIdx;
      const year = currentYear + yearIdx;
      
      const startingPortfolio = currentPortfolio;
      
      currentPortfolio = currentPortfolio * growthFactor + requiredSIP * annuityFactor;
      noSipPortfolio = noSipPortfolio * growthFactor;

      data.push({
        year,
        age,
        startingPortfolio,
        annualWithdrawal: 0,
        portfolioGrowth: currentPortfolio - startingPortfolio - (requiredSIP * 12),
        endingPortfolio: currentPortfolio,
        noSipPortfolio: noSipPortfolio
      });
    }

    // 2. Retirement Phase
    let currentMonthlyWithdrawal = 0;
    let noSipMonthlyWithdrawal = 0;

    if (deferredState.withdrawalMode === 'amount') {
      currentMonthlyWithdrawal = deferredState.monthlyWithdrawalAmount * Math.pow(1 + (deferredState.inflationRate / 100), yearsToRetirement);
      noSipMonthlyWithdrawal = currentMonthlyWithdrawal;
    } else {
      currentMonthlyWithdrawal = (currentPortfolio * (deferredState.withdrawalRate / 100)) / 12;
      noSipMonthlyWithdrawal = (noSipPortfolio * (deferredState.withdrawalRate / 100)) / 12;
    }

    for (let yearIdx = 0; yearIdx <= deferredState.yearsInRetirement; yearIdx++) {
      const age = deferredState.retirementAge + yearIdx;
      const year = currentYear + yearsToRetirement + yearIdx;
      
      let annualWithdrawal = 0;
      let annualGrowth = 0;
      const startingPortfolio = currentPortfolio;

      for (let month = 0; month < 12; month++) {
        if (currentPortfolio > 0) {
          const withdrawal = Math.min(currentPortfolio, currentMonthlyWithdrawal);
          currentPortfolio -= withdrawal;
          annualWithdrawal += withdrawal;
          const growth = currentPortfolio * monthlyReturn;
          currentPortfolio += growth;
          annualGrowth += growth;
          currentMonthlyWithdrawal *= (1 + monthlyInflation);
        } else {
          currentPortfolio = 0;
        }

        if (noSipPortfolio > 0) {
          const withdrawal = Math.min(noSipPortfolio, noSipMonthlyWithdrawal);
          noSipPortfolio -= withdrawal;
          const growth = noSipPortfolio * monthlyReturn;
          noSipPortfolio += growth;
          noSipMonthlyWithdrawal *= (1 + monthlyInflation);
        } else {
          noSipPortfolio = 0;
        }
      }

      data.push({
        year,
        age,
        startingPortfolio,
        annualWithdrawal,
        portfolioGrowth: annualGrowth,
        endingPortfolio: currentPortfolio,
        noSipPortfolio: noSipPortfolio
      });
    }
    return data;
  }, [deferredState, requiredSIP, portfolioReturn, isValidAllocation]);

  const finalBalance = results[results.length - 1]?.endingPortfolio || 0;
  const depletionAge = results.find(r => r.endingPortfolio <= 0)?.age;
  const noSipDepletionAge = results.find(r => r.noSipPortfolio <= 0)?.age;

  const inflationAdjustedFinal = useMemo(() => {
    return finalBalance / Math.pow(1 + (deferredState.inflationRate / 100), deferredState.yearsInRetirement);
  }, [finalBalance, deferredState.inflationRate, deferredState.yearsInRetirement]);

  const getRiskProfile = () => {
    const equity = deferredState.equityAllocation;
    if (equity <= 30) return { 
      label: 'Safe & Steady', 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-400/20', 
      border: 'border-cyan-400/50', 
      description: 'Your money is relaxing in a spa. Low stress, steady growth, and maximum peace of mind! 🧘‍♂️ Note: Very low volatility, but may not beat inflation significantly over long periods.' 
    };
    if (equity <= 70) return { 
      label: 'Balanced Growth', 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/20', 
      border: 'border-emerald-400/50', 
      description: 'The sweet spot! You are climbing the mountain with a sturdy rope. Good views, safe path! 🏔️ Note: Moderate volatility with balanced risk-reward ratio.' 
    };
    return { 
      label: 'Rocket Power', 
      color: 'text-fuchsia-400', 
      bg: 'bg-fuchsia-400/20', 
      border: 'border-fuchsia-400/50', 
      description: 'Fasten your seatbelt! We are aiming for the moon. High speed, high excitement! 🚀 Note: High volatility. Expect significant market swings and temporary portfolio dips.' 
    };
  };

  const riskProfile = getRiskProfile();

  const handleChange = useCallback((key: keyof CalculatorState, value: any) => {
    setState(prev => {
      const newState = { ...prev, [key]: value };
      if (key === 'currentAge' && newState.retirementAge <= value) {
        newState.retirementAge = value + 1;
      }
      if (key === 'retirementAge' && value <= newState.currentAge) {
        newState.currentAge = Math.max(18, value - 1);
      }
      return newState;
    });
  }, []);

  const downloadCSV = () => {
    const headers = ['Year', 'Age', 'Starting Portfolio (₹)', 'Annual Withdrawal (₹)', 'Portfolio Growth (₹)', 'Ending Portfolio (₹)'];
    const rows = results.map(r => [
      r.year,
      r.age,
      r.startingPortfolio.toFixed(2),
      r.annualWithdrawal.toFixed(2),
      r.portfolioGrowth.toFixed(2),
      r.endingPortfolio.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `retire_wise_projection_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans pb-20 selection:bg-emerald-500/30",
      theme === 'dark' ? "dark bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Header */}
      <header className={cn(
        "backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-500",
        theme === 'dark' ? "bg-zinc-950/90 border-zinc-800" : "bg-white/90 border-zinc-200 shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-400 p-1.5 rounded-lg shadow-[0_0_30px_rgba(52,211,153,0.6)] animate-pulse">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <h1 className={cn(
              "text-xl font-black tracking-tighter uppercase",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>Retire<span className="text-emerald-400 italic">Wise</span> Tool</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <div className={cn(
              "flex items-center p-1 rounded-xl border transition-all duration-500",
              theme === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-zinc-200 border-zinc-300"
            )}>
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  theme === 'light' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  theme === 'dark' ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            <div className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
              riskProfile.color, riskProfile.bg, riskProfile.border
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", riskProfile.color.replace('text', 'bg'))} />
              {riskProfile.label}
            </div>
            <button 
              onClick={downloadCSV}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                theme === 'dark' 
                  ? "bg-zinc-900 hover:bg-zinc-800 text-emerald-500 border-emerald-500/20 hover:border-emerald-500/50" 
                  : "bg-white hover:bg-zinc-50 text-emerald-600 border-emerald-200 hover:border-emerald-300 shadow-sm"
              )}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Input Panel */}
        <section className={cn(
          "rounded-3xl border shadow-[0_0_50px_rgba(0,0,0,0.1)] overflow-hidden p-8 backdrop-blur-sm transition-all duration-500",
          theme === 'dark' ? "bg-zinc-800/50 border-zinc-700" : "bg-white border-zinc-200"
        )}>
          <div className={cn(
            "flex items-center justify-between mb-10 border-b pb-6",
            theme === 'dark' ? "border-zinc-700" : "border-zinc-100"
          )}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className={cn(
                "text-lg font-black uppercase tracking-[0.2em]",
                theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>Financial Parameters</h2>
            </div>
            
            {/* Withdrawal Mode Info */}
            <div className="flex flex-col items-end gap-3">
              <p className="text-[10px] font-bold text-emerald-500/60 italic tracking-wide text-right max-w-[250px] leading-tight">
                Plan your retirement based on your actual monthly expenses (Monthly Budget).
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
            {/* Asset Allocation Section */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Asset Allocation</h3>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  isValidAllocation ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                )}>
                  Total: {totalAllocation}% {isValidAllocation ? "✅" : "❌ (Must be 100%)"}
                </div>
              </div>

              <div className={cn(
                "grid grid-cols-1 md:grid-cols-3 gap-8 p-6 rounded-2xl border transition-all duration-500",
                theme === 'dark' ? "bg-zinc-900/40 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
              )}>
                <div className="space-y-6">
                  <InputGroup 
                    label="Equity (%)" 
                    value={state.equityAllocation} 
                    onChange={(v) => handleChange('equityAllocation', v)}
                    min={0} max={100} step={1}
                    suffix="%"
                    help="The portion of your savings invested in stocks or equity-oriented mutual funds. Higher equity usually means higher growth potential but also higher risk."
                    theme={theme}
                  />
                  <InputGroup 
                    label="Expected Equity Return" 
                    value={state.equityReturn} 
                    onChange={(v) => handleChange('equityReturn', v)}
                    min={0} max={25} step={0.1}
                    suffix="%"
                    guidance="Avg: 12%"
                    help="The average yearly profit you expect from your equity investments. Historically, Indian markets have delivered 12-15% over long periods, but it's safer to be conservative."
                    theme={theme}
                  />
                </div>

                <div className="space-y-6">
                  <InputGroup 
                    label="Debt / Fixed Income (%)" 
                    value={state.debtAllocation} 
                    onChange={(v) => handleChange('debtAllocation', v)}
                    min={0} max={100} step={1}
                    suffix="%"
                    help="The portion of your savings in safer, fixed-income options like FDs, PPF, EPF, or Debt Mutual Funds. This provides stability to your portfolio."
                    theme={theme}
                  />
                  <InputGroup 
                    label="Expected Debt Return" 
                    value={state.debtReturn} 
                    onChange={(v) => handleChange('debtReturn', v)}
                    min={0} max={15} step={0.1}
                    suffix="%"
                    guidance="Avg: 6-7%"
                    help="The average yearly interest or profit from your debt investments. These are generally more predictable than equity returns."
                    theme={theme}
                  />
                </div>

                <div className="space-y-6">
                  <InputGroup 
                    label="Other Assets (%)" 
                    value={state.otherAllocation} 
                    onChange={(v) => handleChange('otherAllocation', v)}
                    min={0} max={100} step={1}
                    suffix="%"
                    help="The portion of your savings in alternative assets like Gold, Real Estate, or Commodities. These can act as a hedge during market volatility."
                    theme={theme}
                  />
                  <InputGroup 
                    label="Expected Other Return" 
                    value={state.otherReturn} 
                    onChange={(v) => handleChange('otherReturn', v)}
                    min={0} max={20} step={0.1}
                    suffix="%"
                    guidance="Avg: 5-8%"
                    help="The average yearly growth you expect from your alternative investments like Gold or Real Estate."
                    theme={theme}
                  />
                </div>
              </div>

              <div className={cn(
                "flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl border transition-all duration-500",
                theme === 'dark' ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-100/50 border-zinc-200"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                    riskProfile.color, riskProfile.bg, riskProfile.border
                  )}>
                    {riskProfile.label}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium max-w-md">
                    {riskProfile.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Weighted Portfolio Return</p>
                  <p className="text-xl font-black text-emerald-400">{portfolioReturn.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            <InputGroup 
              label="Current Age" 
              value={state.currentAge} 
              onChange={(v) => handleChange('currentAge', v)}
              min={18} max={80}
              help="Your present age. This is the starting point for your financial journey and determines the time you have left to build your wealth."
              theme={theme}
            />
            <InputGroup 
              label="Retirement Age" 
              value={state.retirementAge} 
              onChange={(v) => handleChange('retirementAge', v)}
              min={state.currentAge + 1} max={85}
              help="The age you wish to retire. A lower retirement age means you need to save more aggressively as your corpus needs to last longer."
              theme={theme}
            />
            <InputGroup 
              label="Years in Retirement" 
              value={state.yearsInRetirement} 
              onChange={(v) => handleChange('yearsInRetirement', v)}
              min={1} max={60}
              help="The number of years you need your retirement fund to support you. It's wise to plan for a long life (e.g., up to age 85 or 90) to avoid outliving your money."
              theme={theme}
            />
            <InputGroup 
              label="Current Savings (₹)" 
              value={state.currentCorpus} 
              onChange={(v) => handleChange('currentCorpus', v)}
              min={0} max={500000000} step={100000}
              isCurrency
              help="The total value of all your current investments and savings dedicated to retirement. This includes your EPF, PPF, Stocks, and Mutual Funds."
              theme={theme}
            />

            {/* Required SIP Tool */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                y: [0, -10, 0]
              }}
              transition={{
                y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-16 h-16 text-emerald-500 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Required Monthly SIP</p>
                <h4 className="text-2xl font-black text-emerald-400 tabular-nums">
                  {formatIndianCurrency(requiredSIP)}
                </h4>
                <div className="mt-4 space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                    Estimated Target Corpus: <span className="text-white">{formatIndianCurrency(targetCorpus)}</span>
                  </p>
                  <p className="text-[9px] font-bold text-zinc-500 mt-2 uppercase tracking-tighter leading-tight">
                    Note: SIP is calculated to bridge the gap between your current savings and the target corpus {state.withdrawalMode === 'rate' ? `(based on a ${state.withdrawalRate}% withdrawal rate)` : '(based on your monthly budget)'}.
                  </p>
                </div>
              </div>
            </motion.div>
            
            <div className={cn(
              "space-y-6 p-6 rounded-2xl border transition-all duration-500",
              theme === 'dark' ? "bg-zinc-900/40 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
            )}>
              <div className="flex items-center justify-between mb-4">
                <label className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em]",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                )}>Withdrawal Strategy</label>
                <div className={cn(
                  "flex p-1 rounded-lg border transition-all duration-500",
                  theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
                )}>
                  <button 
                    onClick={() => handleChange('withdrawalMode', 'amount')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      state.withdrawalMode === 'amount' 
                        ? (theme === 'dark' ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-emerald-500 text-white shadow-sm") 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Fixed Amount
                  </button>
                  <button 
                    onClick={() => handleChange('withdrawalMode', 'rate')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      state.withdrawalMode === 'rate' 
                        ? (theme === 'dark' ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-emerald-500 text-white shadow-sm") 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    % Rate
                  </button>
                </div>
              </div>

              {state.withdrawalMode === 'amount' ? (
                <InputGroup 
                  label="Monthly Lifestyle Fund (₹)" 
                  value={state.monthlyWithdrawalAmount} 
                  onChange={(v) => handleChange('monthlyWithdrawalAmount', v)}
                  min={1000} max={1000000} step={1000}
                  isCurrency
                  help="The amount you need every month to cover all your expenses (rent, food, travel, etc.) in today's value. We will adjust this for inflation automatically."
                  theme={theme}
                />
              ) : (
                <InputGroup 
                  label="Annual Withdrawal Rate (%)" 
                  value={state.withdrawalRate} 
                  onChange={(v) => handleChange('withdrawalRate', v)}
                  min={1} max={10} step={0.1}
                  suffix="%"
                  help="The percentage of your total savings you take out each year. A lower rate (like 3-4%) significantly increases the chances of your money lasting forever."
                  theme={theme}
                />
              )}
            </div>

            <InputGroup 
              label="Price Rise / Inflation (%)" 
              value={state.inflationRate} 
              onChange={(v) => handleChange('inflationRate', v)}
              min={0} max={15} step={0.1}
              guidance="Average in India: 6–7%"
              help="The rate at which prices of goods and services increase. In India, planning with 6% inflation is standard to ensure your future purchasing power is protected."
              theme={theme}
            />
          </div>
        </section>
        
        {/* Status Message */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={depletionAge ? 'depleted' : 'healthy'}
          className={cn(
            "p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center gap-6 shadow-2xl overflow-hidden relative transition-all duration-500",
            depletionAge 
              ? (theme === 'dark' ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-900")
              : (theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-900")
          )}
        >
          <div className={cn(
            "p-4 rounded-2xl shrink-0",
            depletionAge ? "bg-rose-500/20" : "bg-emerald-500/20"
          )}>
            {depletionAge ? (
              <AlertTriangle className="w-10 h-10 text-rose-500 animate-bounce" />
            ) : (
              <PartyPopper className="w-10 h-10 text-emerald-500 animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className={cn(
              "text-2xl font-black uppercase tracking-tighter mb-2",
              depletionAge ? "text-rose-500" : "text-emerald-600"
            )}>
              {depletionAge 
                ? `Warning: Portfolio Depletion at Age ${depletionAge}` 
                : "Your Portfolio is Built to Last!"}
            </h3>
            <p className={cn(
              "font-medium leading-relaxed",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
            )}>
              {depletionAge 
                ? "Based on your current plan, your savings may run out before the end of your retirement. Consider increasing your SIP, adjusting your lifestyle budget, or extending your retirement age."
                : "Excellent planning! Your portfolio is projected to sustain your lifestyle throughout your retirement years with a healthy surplus remaining."}
            </p>
            <div className={cn(
              "mt-4 inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              depletionAge ? "bg-rose-500/20 text-rose-500" : "bg-emerald-500/20 text-emerald-600"
            )}>
              {depletionAge 
                ? "Motivational Note: Don't be discouraged! Small adjustments today can make a massive difference tomorrow. You've got this! 💪" 
                : "Motivational Note: Your financial future looks bright! Keep up the discipline and stay the course. 🚀"}
            </div>
          </div>

          {/* Decorative Background Icon */}
          <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
            {depletionAge ? (
              <AlertTriangle className="w-48 h-48 text-rose-500" />
            ) : (
              <ShieldCheck className="w-48 h-48 text-emerald-500" />
            )}
          </div>
        </motion.div>

        {/* Results Sections */}
        <div className="flex flex-col gap-8">
          
          {/* Graph Section */}
          <div className="w-full space-y-6">
            <div className={cn(
              "rounded-3xl border shadow-2xl p-8 transition-all duration-500",
              theme === 'dark' ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-200"
            )}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={cn(
                  "text-sm font-bold uppercase tracking-widest flex items-center gap-2",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                )}>
                  <BarChart3 className="w-4 h-4 text-emerald-500" /> Portfolio Trajectory
                  <span className={cn(
                    "ml-auto text-[8px] font-black px-2 py-0.5 rounded-full border transition-colors",
                    theme === 'dark' ? "text-zinc-600 bg-zinc-950 border-zinc-900" : "text-zinc-400 bg-zinc-50 border-zinc-200"
                  )}>ZOOM & PAN ENABLED</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className={cn(
                  "p-5 rounded-2xl border shadow-inner transition-all duration-500",
                  theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Final Balance</p>
                  <p className={cn("text-2xl font-black tabular-nums tracking-tight", finalBalance >= -1 ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "text-rose-500")}>
                    {formatIndianCurrency(finalBalance)}
                  </p>
                </div>
                <div className={cn(
                  "p-5 rounded-2xl border shadow-inner transition-all duration-500",
                  theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Today's Value (inflation adjusted)</p>
                  <p className="text-2xl font-black tabular-nums text-cyan-400 tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    {formatIndianCurrency(inflationAdjustedFinal)}
                  </p>
                </div>
                <div className={cn(
                  "p-5 rounded-2xl border shadow-inner relative overflow-hidden group/nosip transition-all duration-500",
                  theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/nosip:opacity-10 transition-opacity">
                    <AlertCircle className="w-12 h-12 text-rose-500" />
                  </div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">No SIP Depletion Age</p>
                  <p className={cn("text-2xl font-black tabular-nums tracking-tight", noSipDepletionAge ? "text-rose-400" : "text-emerald-400")}>
                    {noSipDepletionAge ? `Age ${noSipDepletionAge}` : "Never"}
                  </p>
                  <p className="text-[8px] font-bold text-zinc-600 uppercase mt-1">Projection without future SIPs</p>
                </div>
              </div>
              
              <ResultsChart 
                data={results} 
                retirementAge={state.retirementAge} 
                noSipDepletionAge={noSipDepletionAge}
                targetCorpus={targetCorpus}
                theme={theme}
              />
              
              <div className="mt-8">
                <div className={cn(
                  "p-6 rounded-2xl border relative overflow-hidden group transition-all duration-500",
                  theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <motion.div 
                    animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                    className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"
                  >
                    <Coins className="w-20 h-20 text-emerald-500 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
                  </motion.div>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Retirement Insight</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed relative z-10">
                    To sustain your desired lifestyle of {formatIndianCurrency(state.monthlyWithdrawalAmount)}/month (inflation adjusted), you need a corpus of {formatIndianCurrency(targetCorpus)} by age {state.retirementAge}. 
                    {requiredSIP > 0 
                      ? ` Your current savings of ${formatIndianCurrency(state.currentCorpus)} plus a monthly SIP of ${formatIndianCurrency(requiredSIP)} will help you reach this goal.`
                      : ` Your current savings are sufficient to reach this goal without additional monthly investments.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="w-full space-y-6">
            <div className="bg-zinc-800 rounded-3xl border border-zinc-700 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-500" /> Year-by-Year Projection
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-900 z-10 shadow-md">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 border-b border-zinc-800 bg-black/50 backdrop-blur-md">
                      <th className="px-6 py-5">Year</th>
                      <th className="px-6 py-5">Age</th>
                      <th className="px-6 py-5">Starting Portfolio</th>
                      <th className="px-6 py-5">Withdrawal</th>
                      <th className="px-6 py-5">Growth</th>
                      <th className="px-6 py-5">Ending Portfolio</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-zinc-800/50">
                    {results.map((row, idx) => (
                      <tr key={idx} className={cn(
                        "transition-colors",
                        row.endingPortfolio <= 0 
                          ? "bg-rose-500/5 text-rose-400/60 hover:bg-rose-500/10" 
                          : "text-zinc-300 hover:bg-zinc-800/30"
                      )}>
                        <td className="px-6 py-4 font-mono">{row.year}</td>
                        <td className="px-6 py-4">{row.age}</td>
                        <td className="px-6 py-4 tabular-nums">{formatIndianCurrency(row.startingPortfolio)}</td>
                        <td className="px-6 py-4 tabular-nums text-rose-400/80">{formatIndianCurrency(row.annualWithdrawal)}</td>
                        <td className="px-6 py-4 tabular-nums text-emerald-400/80">{formatIndianCurrency(row.portfolioGrowth)}</td>
                        <td className={cn(
                          "px-6 py-4 tabular-nums font-bold",
                          row.endingPortfolio <= 0 ? "text-rose-500" : "text-white"
                        )}>{formatIndianCurrency(row.endingPortfolio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recommended Asset Allocation Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full space-y-6"
          >
            <div className="bg-zinc-800 rounded-3xl border border-zinc-700 shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Recommended Allocation Strategy (Every Year)
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative group/select">
                    <select 
                      value={selectedStrategy}
                      onChange={(e) => setSelectedStrategy(e.target.value as any)}
                      className="appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-full px-6 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:border-blue-500/50 transition-all"
                    >
                      <option value="Aggressive">Aggressive Portfolio</option>
                      <option value="Moderate">Moderate Portfolio</option>
                      <option value="Conservative">Conservative Portfolio</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none group-hover/select:text-blue-500 transition-colors" />
                  </div>

                  <div className="relative group/select">
                    <select 
                      value={othersHandling}
                      onChange={(e) => setOthersHandling(e.target.value as any)}
                      className="appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-full px-6 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer hover:border-amber-500/50 transition-all"
                    >
                      <option value="separate">Show Others Separately</option>
                      <option value="add_to_equity">Merge Others with Equity</option>
                      <option value="add_to_debt">Merge Others with Debt</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none group-hover/select:text-amber-500 transition-colors" />
                  </div>

                  <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Equity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Debt</span>
                    </div>
                    {othersHandling === 'separate' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Others ({state.otherAllocation}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8 p-6 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-400 leading-relaxed font-medium italic">
                  <span className="text-blue-400 font-black uppercase not-italic mr-2">{selectedStrategy}:</span>
                  {STRATEGIES[selectedStrategy].description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-12">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={allocationTimeline}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorOthers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="age" 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Age', position: 'insideBottomRight', offset: -10, fill: '#71717a', fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl min-w-[160px]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Age {label}</p>
                                <div className="space-y-1.5">
                                  {payload.map((entry: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{entry.name}</span>
                                      </div>
                                      <span className="text-xs font-black text-white tabular-nums">{entry.value}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Area 
                        type="monotone" 
                        dataKey="Others" 
                        stackId="1" 
                        stroke="#f59e0b" 
                        fillOpacity={1} 
                        fill="url(#colorOthers)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Equity" 
                        stackId="1" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorEquity)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Debt" 
                        stackId="1" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorDebt)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8">
                  <div className={cn(
                    "p-6 rounded-3xl border transition-all duration-500 max-w-2xl mx-auto",
                    recommendedFeasibility.isBetter 
                      ? "bg-blue-500/5 border-blue-500/20" 
                      : "bg-zinc-900/50 border-zinc-800"
                  )}>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Strategy Feasibility Check</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Required SIP with this strategy:</span>
                        <span className="text-sm font-bold text-white">{formatIndianCurrency(recommendedFeasibility.sip)}</span>
                      </div>
                      <div className="pt-3 border-t border-zinc-800/50">
                        <p className="text-[11px] leading-relaxed text-zinc-400">
                          {recommendedFeasibility.isBetter 
                            ? "✅ This strategy is more efficient than your current allocation, requiring a lower monthly SIP to reach the same goal."
                            : "⚠️ This strategy is more conservative than your current plan, which may require a higher SIP but offers better capital protection."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

const InputGroup = React.memo(({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1,
  suffix = "",
  help,
  guidance,
  isCurrency = false,
  customDisplay,
  theme
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  help?: string;
  guidance?: string;
  isCurrency?: boolean;
  customDisplay?: string;
  theme: 'dark' | 'light';
}) => {
  const formatValue = (val: number) => {
    if (customDisplay) return customDisplay;
    if (isCurrency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val.toLocaleString('en-IN') + suffix;
  };

  const formatInput = (val: number) => {
    return val.toLocaleString('en-IN');
  };

  const parseInput = (val: string) => {
    const numericValue = Number(val.replace(/,/g, ''));
    if (!isNaN(numericValue)) {
      onChange(numericValue);
    }
  };

  // Calculate percentage for playful elements
  const percentage = ((value - (min || 0)) / ((max || 100) - (min || 0))) * 100;

  const getEmoji = () => {
    const l = label.toLowerCase();
    if (l.includes('current age')) {
      if (value < 30) return '🧑';
      if (value < 45) return '👨';
      if (value < 60) return '🧔';
      return '👴';
    }
    if (l.includes('retirement age')) {
      if (value < 50) return '💼';
      if (value < 60) return '👔';
      if (value < 70) return '🏖️';
      return '🧘';
    }
    if (l.includes('years in retirement')) {
      if (value < 15) return '⏳';
      if (value < 25) return '⌛';
      return '🕰️';
    }
    if (l.includes('savings')) {
      if (value < 1000000) return '🪙';
      if (value < 5000000) return '💵';
      if (value < 10000000) return '💰';
      return '🏦';
    }
    if (l.includes('lifestyle fund')) {
      if (value < 50000) return '🏠';
      if (value < 150000) return '🏡';
      return '🏰';
    }
    if (l.includes('withdrawal rate')) {
      if (value < 3) return '🐢';
      if (value < 5) return '⚖️';
      return '🏃';
    }
    if (l.includes('equity allocation')) {
      if (value < 30) return '🛡️';
      if (value < 70) return '⚖️';
      return '🚀';
    }
    if (l.includes('return')) {
      if (value < 6) return '🌱';
      if (value < 10) return '🌿';
      if (value < 14) return '🌳';
      return '🔥';
    }
    if (l.includes('inflation')) {
      if (value < 5) return '🎈';
      if (value < 8) return '☁️';
      return '🌪️';
    }
    return percentage < 25 ? '🌱' : percentage < 50 ? '🌿' : percentage < 75 ? '🌳' : '💰';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 group"
    >
      <div className="flex justify-between items-center">
        <motion.label 
          whileHover={{ x: 2 }}
          className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors",
            theme === 'dark' ? "text-zinc-300" : "text-zinc-500"
          )}
        >
          {label}
        </motion.label>
        {help && (
          <div className="group/help relative">
            <Info className={cn(
              "w-3.5 h-3.5 cursor-help hover:text-emerald-400 transition-colors",
              theme === 'dark' ? "text-zinc-600" : "text-zinc-400"
            )} />
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                whileHover={{ opacity: 1, scale: 1, y: 0 }}
                className={cn(
                  "absolute bottom-full right-0 mb-2 w-48 p-3 text-[10px] rounded-lg border opacity-0 group-hover/help:opacity-100 transition-all pointer-events-none z-40 shadow-2xl",
                  theme === 'dark' ? "bg-zinc-900 text-zinc-300 border-zinc-800" : "bg-white text-zinc-600 border-zinc-200"
                )}
              >
                {help}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div className="relative pt-10">
          {/* Playful 3D Emoji following the slider */}
          <motion.div 
            className="absolute top-0 text-2xl pointer-events-none z-20 flex flex-col items-center opacity-70"
            animate={{ 
              left: `calc(${percentage}% - 12px)`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ 
              perspective: '1000px',
              transformStyle: 'preserve-3d'
            }}
          >
            <motion.span
              key={getEmoji()}
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ 
                scale: 1.2, 
                rotate: 0,
                rotateY: [0, 15, -15, 0],
                z: [0, 20, 0]
              }}
              transition={{ 
                scale: { type: "spring", stiffness: 400, damping: 10 },
                rotateY: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                z: { repeat: Infinity, duration: 3, ease: "easeInOut" }
              }}
              className="drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
            >
              {getEmoji()}
            </motion.span>
            <div className="w-1 h-4 bg-gradient-to-b from-emerald-500/50 to-transparent mt-1" />
          </motion.div>

          <motion.input 
            type="range" 
            min={min} 
            max={max} 
            step={step}
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              "w-full h-4 rounded-full appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]",
              theme === 'dark' ? "bg-zinc-700" : "bg-zinc-200"
            )}
          />
          
          {/* Slider Value Tooltip */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute -bottom-7 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.5)] z-30"
            style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
          >
            {formatValue(value)}
          </motion.div>
        </div>
        
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex-1">
            {guidance && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-400/80 italic tracking-wide uppercase">{guidance}</p>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCurrency && <span className="text-emerald-500 font-bold text-xs">₹</span>}
            <motion.input 
              type="text" 
              value={formatInput(value)} 
              onChange={(e) => parseInput(e.target.value)}
              whileFocus={{ scale: 1.05, borderColor: '#10b981' }}
              className={cn(
                "w-32 px-3 py-2 text-right text-xs font-black font-mono border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner",
                theme === 'dark' ? "bg-zinc-900 text-emerald-400 border-zinc-800" : "bg-white text-emerald-600 border-zinc-200"
              )}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
