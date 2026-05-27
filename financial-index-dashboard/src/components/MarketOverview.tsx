import React from 'react';
import { IndexAsset } from '../types';

interface MarketOverviewProps {
  assets: IndexAsset[];
}

export default function MarketOverview({ assets }: MarketOverviewProps) {
  // Derive market insights
  const positiveAssets = assets.filter(a => a.change >= 0);
  const negativeAssets = assets.filter(a => a.change < 0);
  
  // Sentiment score (0 - 100)
  const sentimentScore = Math.min(
    100,
    Math.max(0, Math.round((positiveAssets.length / assets.length) * 100))
  );

  // Volatility metric calculation (average absolute change scaled to percentage)
  const avgAbsChange = assets.reduce((sum, a) => sum + Math.abs(a.change), 0) / assets.length;
  const volatilityScore = Math.min(100, Math.max(0, Math.round(avgAbsChange * 42)));

  // Top 3 performers (Gainers) in descending order
  const sortedGainers = [...assets].sort((a, b) => b.change - a.change).slice(0, 3);
  
  // Bottom 3 performers (Losers) in ascending order (worst/most-negative first at the top)
  const sortedLosers = [...assets].sort((a, b) => a.change - b.change).slice(0, 3);

  return (
    <div id="market-overview-widget" className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      {/* Sentiment & Volatility Gauge Card */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between border border-white/60 min-h-[300px]">
        <div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Market Metrics</span>
          <h4 className="text-base font-extrabold font-sans text-slate-800 mt-1">Core Market Pulse</h4>
        </div>

        {/* Meters Container */}
        <div className="space-y-4 my-4">
          {/* Meter 1: Market Sentiment */}
          <div className="p-3 bg-white/35 rounded-2xl border border-white/60">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-slate-600 text-[11px] font-bold">Market Sentiment</span>
              <span className="font-mono text-slate-800 font-bold text-[11px]">{sentimentScore}% Bullish</span>
            </div>
            
            <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden p-[1.5px] border border-slate-300/10">
              <div 
                className="h-full rounded-full bg-slate-800 transition-all duration-1000"
                style={{ width: `${sentimentScore}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              <span>{negativeAssets.length} Retracting</span>
              <span>{positiveAssets.length} Advancing</span>
            </div>
          </div>

          {/* Meter 2: Volatility Indicator */}
          <div className="p-3 bg-white/35 rounded-2xl border border-white/60">
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-slate-600 text-[11px] font-bold">Volatility Indicator</span>
              <span className="font-mono text-slate-800 font-bold text-[11px]">{volatilityScore}% Implied Risk</span>
            </div>
            
            <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden p-[1.5px] border border-slate-300/10">
              <div 
                className="h-full rounded-full bg-slate-800 transition-all duration-1000"
                style={{ width: `${volatilityScore}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              <span>{volatilityScore < 30 ? 'Low Vol' : volatilityScore < 60 ? 'Moderate Vol' : 'High Vol'}</span>
              <span>Stability Threshold</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-medium leading-normal block">
          Calculated across {assets.length} global indices and cryptocurrency indices in real time.
        </div>
      </div>

      {/* Top Performing Assets (3 migliori) */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between border border-white/60 min-h-[300px]">
        <div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Top Performers</span>
          <h4 className="text-base font-extrabold font-sans text-slate-800 mt-1">Daily Outperformers</h4>
        </div>

        {/* Stack of Top 3 */}
        <div className="space-y-2.5 my-3.5">
          {sortedGainers.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/45 hover:bg-white/65 border border-white/85 transition-all shadow-liquid">
              <div className="min-w-0 pr-2">
                <span className="font-mono text-xs uppercase font-extrabold text-slate-800 tracking-tight block">
                  {asset.ticker}
                </span>
                <span className="text-[10px] text-slate-400 font-sans line-clamp-1 block mt-0.5">
                  {asset.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-xs font-bold block text-slate-800">
                  ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="font-mono text-[10.5px] text-emerald-600 font-bold block mt-0.5">
                  +{asset.change.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 font-medium leading-normal block">
          Tracked automations with high momentum support.
        </div>
      </div>

      {/* Top Losers Assets (3 peggiori) */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between border border-white/60 min-h-[300px]">
        <div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Top Losers</span>
          <h4 className="text-base font-extrabold font-sans text-slate-800 mt-1">Daily Underperformers</h4>
        </div>

        {/* Stack of Bottom 3 */}
        <div className="space-y-2.5 my-3.5">
          {sortedLosers.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/45 hover:bg-white/65 border border-white/85 transition-all shadow-liquid">
              <div className="min-w-0 pr-2">
                <span className="font-mono text-xs uppercase font-extrabold text-slate-800 tracking-tight block">
                  {asset.ticker}
                </span>
                <span className="text-[10px] text-slate-400 font-sans line-clamp-1 block mt-0.5">
                  {asset.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-xs font-bold block text-slate-800">
                  ${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="font-mono text-[10.5px] text-rose-500 font-bold block mt-0.5">
                  {asset.change.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 font-medium leading-normal block">
          Retraction tracking ordered from maximum compression.
        </div>
      </div>
    </div>
  );
}
