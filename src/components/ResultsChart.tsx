import React, { useMemo } from 'react';
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { YearData } from '../types';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResultsChartProps {
  data: YearData[];
  retirementAge: number;
  noSipDepletionAge: number | null;
  targetCorpus: number;
  theme: 'dark' | 'light';
}

const formatIndianCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const ResultsChart = React.memo(({ data, retirementAge, noSipDepletionAge, targetCorpus, theme }: ResultsChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className={cn(
        "w-full h-[400px] flex items-center justify-center rounded-2xl border transition-all duration-500",
        theme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      )}>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No projection data available</p>
      </div>
    );
  }

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      accumulation: d.age <= retirementAge ? d.endingPortfolio : null,
      retirement: d.age >= retirementAge ? d.endingPortfolio : null,
      noSip: (d as any).noSipPortfolio,
    }));
  }, [data, retirementAge]);

  const depletionYear = data.find(d => d.endingPortfolio <= 0);
  const lastYear = data[data.length - 1];
  const retirementYearData = data.find(d => d.age === retirementAge);
  const isTargetMet = retirementYearData ? retirementYearData.endingPortfolio >= targetCorpus : false;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ 
        duration: 0.8, 
        ease: "easeOut",
        scale: { duration: 0.3 }
      }}
      className="w-full h-[450px] relative group"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorAccumulation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRetirement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke={theme === 'dark' ? "#333" : "#e4e4e7"} 
            opacity={theme === 'dark' ? 0.3 : 0.5} 
          />
          <XAxis 
            dataKey="age" 
            tick={{ fontSize: 10, fill: theme === 'dark' ? '#71717a' : '#71717a', fontWeight: 600 }}
            stroke={theme === 'dark' ? "#3f3f46" : "#e4e4e7"}
            axisLine={{ strokeWidth: 2 }}
            tickLine={false}
            label={{ 
              value: 'AGE', 
              position: 'insideBottom', 
              offset: -10, 
              fontSize: 10, 
              fontWeight: 900, 
              fill: theme === 'dark' ? '#52525b' : '#71717a' 
            }}
          />
          <YAxis 
            tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
            tick={{ fontSize: 10, fill: theme === 'dark' ? '#71717a' : '#71717a', fontWeight: 600 }}
            stroke={theme === 'dark' ? "#3f3f46" : "#e4e4e7"}
            axisLine={{ strokeWidth: 2 }}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.5 }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const mainPayload = payload.find(p => p.dataKey === 'accumulation' || p.dataKey === 'retirement');
                const noSipPayload = payload.find(p => p.dataKey === 'noSip');
                const value = mainPayload?.value || 0;
                const percentageOfTarget = (value / targetCorpus) * 100;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={cn(
                      "backdrop-blur-xl border p-4 rounded-2xl shadow-2xl min-w-[220px]",
                      theme === 'dark' ? "bg-zinc-950/90 border-white/10" : "bg-white/95 border-zinc-200"
                    )}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                      )}>Age {label}</p>
                      <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full",
                        percentageOfTarget >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      )}>
                        {percentageOfTarget >= 100 ? 'GOAL ACHIEVED' : `${percentageOfTarget.toFixed(1)}% OF TARGET`}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {mainPayload && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mainPayload.color }} />
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-tight",
                              theme === 'dark' ? "text-white" : "text-zinc-700"
                            )}>
                              {mainPayload.name === 'accumulation' ? 'Accumulation (with SIP)' : 'Retirement'}
                            </p>
                          </div>
                          <p className="text-lg font-black tabular-nums" style={{ color: mainPayload.color }}>
                            {formatIndianCurrency(mainPayload.value as number)}
                          </p>
                        </div>
                      )}

                      {noSipPayload && (
                        <div className={cn(
                          "flex flex-col gap-1 pt-2 border-t",
                          theme === 'dark' ? "border-white/5" : "border-zinc-100"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">
                              No Additional SIP
                            </p>
                          </div>
                          <p className="text-lg font-black tabular-nums text-rose-500">
                            {formatIndianCurrency(noSipPayload.value as number)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className={cn(
                      "mt-2 pt-2 border-t",
                      theme === 'dark' ? "border-white/5" : "border-zinc-100"
                    )}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Target Progress</p>
                        <p className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                        )}>{formatIndianCurrency(targetCorpus)}</p>
                      </div>
                      <div className={cn(
                        "h-1.5 w-full rounded-full overflow-hidden",
                        theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200"
                      )}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentageOfTarget, 100)}%` }}
                          className={cn(
                            "h-full rounded-full",
                            percentageOfTarget >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              }
              return null;
            }}
          />
          
          {depletionYear && (
            <ReferenceArea 
              {...({
                x1: depletionYear.age,
                x2: lastYear.age,
                fill: "#ef4444",
                fillOpacity: 0.05,
                stroke: "none"
              } as any)}
            />
          )}

          <ReferenceLine 
            {...({
              x: retirementAge,
              stroke: "#f59e0b",
              strokeWidth: 2,
              strokeDasharray: "10 5",
              label: { 
                value: 'RETIREMENT', 
                position: 'top', 
                fill: '#f59e0b', 
                fontSize: 10, 
                fontWeight: 900,
                letterSpacing: '0.1em'
              }
            } as any)}
          />
          
          {depletionYear && (
            <ReferenceLine 
              {...({
                x: depletionYear.age,
                stroke: "#ef4444",
                strokeWidth: 2,
                strokeDasharray: "3 3",
                label: { 
                  value: `DEPLETED AT ${depletionYear.age}`, 
                  position: 'top', 
                  fill: '#ef4444', 
                  fontSize: 10,
                  fontWeight: 900
                }
              } as any)}
            />
          )}

          {noSipDepletionAge && (
            <ReferenceLine 
              {...({
                x: noSipDepletionAge,
                stroke: "#f43f5e",
                strokeWidth: 2,
                strokeDasharray: "5 5",
                label: { 
                  value: `NO SIP ENDS AT ${noSipDepletionAge}`, 
                  position: 'bottom', 
                  fill: '#f43f5e', 
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }
              } as any)}
            />
          )}

          <ReferenceLine 
            {...({
              y: targetCorpus,
              stroke: "#3b82f6",
              strokeWidth: 1,
              strokeDasharray: "3 3",
              opacity: 0.3,
              label: { 
                value: `TARGET: ${formatIndianCurrency(targetCorpus)}`, 
                position: 'right', 
                fill: '#3b82f6', 
                fontSize: 8, 
                fontWeight: 900,
                opacity: 0.5
              }
            } as any)}
          />

          <ReferenceDot 
            {...({
              x: retirementAge,
              y: targetCorpus,
              r: 6,
              fill: isTargetMet ? "#10b981" : "#ef4444",
              stroke: "#fff",
              strokeWidth: 2,
              label: { 
                value: isTargetMet ? "TARGET MET ✅" : "TARGET GAP ❌", 
                position: 'top', 
                fill: isTargetMet ? "#10b981" : "#ef4444", 
                fontSize: 10, 
                fontWeight: 900,
                offset: 10
              }
            } as any)}
          />

          {/* No SIP Trajectory */}
          <Line
            type="monotone"
            dataKey="noSip"
            name="noSip"
            stroke="#f43f5e"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4, fill: '#f43f5e' }}
            animationDuration={2000}
          />

          {noSipDepletionAge && (
            <ReferenceLine
              x={noSipDepletionAge}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              label={{
                value: `NO SIP DEPLETION: ${noSipDepletionAge}`,
                position: 'bottom',
                fill: '#f43f5e',
                fontSize: 8,
                fontWeight: 900
              }}
            />
          )}

          {/* Accumulation Phase Area */}
          <Area
            type="monotone"
            dataKey="accumulation"
            name="accumulation"
            stroke="#3b82f6"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorAccumulation)"
            filter="url(#glow)"
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-in-out"
            activeDot={{ 
              r: 8, 
              strokeWidth: 2, 
              stroke: '#fff', 
              fill: '#3b82f6',
              className: "animate-pulse"
            }}
          />

          {/* Retirement Phase Area */}
          <Area
            type="monotone"
            dataKey="retirement"
            name="retirement"
            stroke="#10b981"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorRetirement)"
            filter="url(#glow)"
            animationBegin={1000}
            animationDuration={1500}
            animationEasing="ease-in-out"
            activeDot={{ 
              r: 8, 
              strokeWidth: 2, 
              stroke: '#fff', 
              fill: '#10b981',
              className: "animate-pulse"
            }}
          />

          <Brush 
            dataKey="age" 
            height={30} 
            stroke={theme === 'dark' ? "#52525b" : "#a1a1aa"} 
            fill={theme === 'dark' ? "#09090b" : "#f4f4f5"}
            travellerWidth={10}
            gap={5}
          >
            <AreaChart>
              <Area
                type="monotone"
                dataKey="endingPortfolio"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
              />
            </AreaChart>
          </Brush>
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Interactive Overlay Hint */}
      <div className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "flex items-center gap-2 backdrop-blur-sm border px-3 py-1.5 rounded-full",
          theme === 'dark' ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-zinc-200 shadow-sm"
        )}>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
          )}>Interactive Projection</span>
        </div>
      </div>
    </motion.div>
  );
});
