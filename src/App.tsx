import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, ArrowUpDown, TrendingUp, Circle as HelpCircle, RefreshCw, BookmarkCheck, LayoutGrid, Layers, Globe, Star, Sparkles, Info, ChartBar as BarChart3, RotateCcw, CircleAlert as AlertCircle, Sparkle, Clock, Trash2, X, Heart } from 'lucide-react';

import { IndexAsset, SidebarTab, ComparisonState } from './types';
import { mockIndices } from './data/indices';
import GlassCard from './components/GlassCard';
import Sidebar from './components/Sidebar';
import MarketOverview from './components/MarketOverview';
import ComparisonBench from './components/ComparisonBench';
import AssetDetailModal from './components/AssetDetailModal';
import { generateSimulatedData, TimeframeId, TIMEFRAME_OPTIONS } from './utils/chartSim';
import { loadHistoricalData, processHistoryForTimeframe, RawHistoryPoint } from './utils/historyLoader';
import { logger } from './utils/logger';
import LiquidSwitch from './components/LiquidSwitch';

export default function App() {
  // --- Core States ---
  const [currentTab, setCurrentTab] = useState<SidebarTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]); // default comparison empty
  const [favoriteAssetIds, setFavoriteAssetIds] = useState<string[]>([]); // default bookmark empty
  const [selectedDetailedAsset, setSelectedDetailedAsset] = useState<IndexAsset | null>(null);
  const [compareTimeframe, setCompareTimeframe] = useState<TimeframeId>('1m');
  const [compareChartType, setCompareChartType] = useState<'line' | 'candle'>('line');
  const [compareHoveredIndex, setCompareHoveredIndex] = useState<number | null>(null);
  const [compareHistories, setCompareHistories] = useState<Record<string, RawHistoryPoint[]>>({});
  
  // Custom mock configuration states (Settings Tab)
  const [glassIntensity, setGlassIntensity] = useState<'subtle' | 'standard' | 'liquid'>('standard');
  const [refreshInterval, setRefreshInterval] = useState<'manual' | 'fast' | 'slow'>('fast');
  const [pastelColors, setPastelColors] = useState<boolean>(true);
  const [showTickersGlobal, setShowTickersGlobal] = useState<boolean>(true);

  // Auto-ticking simulation: fluctuate index pricing by minor decimals on clock ticks to simulate a "live" heartbeat of market prices!
  const [assets, setAssets] = useState<IndexAsset[]>(mockIndices);
  // Timestamp updates beautifully matches Local Time
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    // Keep local time running
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Heartbeat simulator
    let priceTimer: NodeJS.Timeout;
    if (refreshInterval !== 'manual') {
      const intervalMs = refreshInterval === 'fast' ? 4000 : 10000;
      priceTimer = setInterval(() => {
        setAssets(prev => 
          prev.map(asset => {
            // slightly fluctuate price by -0.15% to +0.22%
            const fluctuation = 1 + (Math.random() * 0.0037 - 0.0015);
            const newValue = asset.value * fluctuation;
            const newHigh = Math.max(asset.high, newValue);
            const newLow = Math.min(asset.low, newValue);
            // shift sparkline list slightly to live updates
            const newSparkline = [...asset.sparkline.slice(1), parseFloat(newValue.toFixed(2))];
            
            return {
              ...asset,
              value: parseFloat(newValue.toFixed(2)),
              high: parseFloat(newHigh.toFixed(2)),
              low: parseFloat(newLow.toFixed(2)),
              sparkline: newSparkline
            };
          })
        );
      }, intervalMs);
    }

    return () => {
      clearInterval(timeTimer);
      if (priceTimer) clearInterval(priceTimer);
    };
  }, [refreshInterval]);

  // Handle asset comparisons toggling
  const handleToggleCompare = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssetIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleClearCompare = () => {
    setSelectedAssetIds([]);
  };

  const handleRemoveCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssetIds(prev => prev.filter(x => x !== id));
  };

  // Handle favorites tracking
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteAssetIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Switch to comparative screen trigger
  const handleGoToCompare = () => {
    setCurrentTab('compare');
  };

  // Search and Tag filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.ticker.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, selectedCategory]);

  const selectedCompareAssets = useMemo(() => {
    return assets.filter(a => selectedAssetIds.includes(a.id));
  }, [assets, selectedAssetIds]);

  const favoriteAssets = useMemo(() => {
    return assets.filter(a => favoriteAssetIds.includes(a.id));
  }, [assets, favoriteAssetIds]);

  // Pre-load static compare historical JSONs whenever selected comparison assets list changes
  useEffect(() => {
    selectedAssetIds.forEach(id => {
      if (!compareHistories[id]) {
        loadHistoricalData(id)
          .then(data => {
            setCompareHistories(prev => ({
              ...prev,
              [id]: data
            }));
          })
          .catch(err => logger.error(`Error loading comparison history in App for ${id}`, err));
      }
    });
  }, [selectedAssetIds]);

  // Handcraft of multiline comparison graph variables
  const comparisonChartCoords = useMemo(() => {
    if (selectedCompareAssets.length === 0) return null;
    
    const svgWidth = 640;
    const svgHeight = 240;
    const paddingX = 30;
    const paddingY = 25;

    return selectedCompareAssets.map((asset, assetIndex) => {
      // Use premium local real history loader or fallback simulation
      const hasReal = compareTimeframe !== '1d' && !!compareHistories[asset.id];
      const simulatedPoints = hasReal 
        ? processHistoryForTimeframe(compareHistories[asset.id], compareTimeframe, 32)
        : generateSimulatedData(asset, compareTimeframe, 32);

      const closes = simulatedPoints.map(p => p.close);
      
      const isCandle = compareChartType === 'candle' && selectedCompareAssets.length === 1;

      // Min/max based on low/high for candles, or closes for line
      const min = isCandle 
        ? Math.min(...simulatedPoints.map(p => p.low)) 
        : Math.min(...closes);
      const max = isCandle 
        ? Math.max(...simulatedPoints.map(p => p.high)) 
        : Math.max(...closes);
        
      const range = max - min || 1;

      const pathStr = closes.map((val, index) => {
        const x = paddingX + (index / (closes.length - 1)) * (svgWidth - paddingX * 2);
        const y = svgHeight - paddingY - ((val - min) / range) * (svgHeight - paddingY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' L ');

      // Color selection matching categories beautifully
      const colorsList = ['#0f172a', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6'];
      const strokeColor = colorsList[assetIndex % colorsList.length];

      return {
        id: asset.id,
        ticker: asset.ticker,
        color: strokeColor,
        path: `M ${pathStr}`,
        simulatedPoints,
        min,
        max,
        range,
        pointsNormalized: closes.map((v) => ((v - min) / range) * 100)
      };
    });

  }, [selectedCompareAssets, compareTimeframe, compareChartType, compareHistories]);

  // Formatted Local Date string
  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return currentTime.toLocaleDateString('it-IT', options);
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  }, [currentTime]);

  // Glass panel style computation
  const glassStyleMap = {
    subtle: 'rgba(255, 255, 255, 0.35) backdrop-blur-sm shadow',
    standard: 'rgba(255, 255, 255, 0.55) backdrop-blur-xl shadow-lg',
    liquid: 'rgba(255, 255, 255, 0.65) backdrop-blur-[32px] saturate-[210%] border-white shadow-2xl'
  };

  return (
    <div 
      className="min-h-screen bg-[#e9f0f4] bg-gradient-to-tr from-[#e5ecf0] via-[#e9f0f4] to-[#f0f5f8] text-slate-800 font-sans flex flex-col md:flex-row p-4 md:p-5 lg:p-6 transition-all duration-300 w-full relative overflow-x-hidden"
    >
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onChangeTab={setCurrentTab} 
        favoritesCount={favoriteAssetIds.length}
        comparisonCount={selectedAssetIds.length}
      />

      {/* Main Dynamic Workspace Frame as a physical isolated Island (Riquadro) */}
      <main className="flex-1 bg-white/75 border border-white/95 rounded-[2.5rem] shadow-[0_22px_45px_rgba(15,23,42,0.04)] backdrop-blur-3xl p-6 sm:p-8 md:p-10 xl:p-12 pb-28 md:pb-10 ml-0 md:ml-24 xl:ml-28 min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-2.5rem)] w-full flex flex-col justify-start relative transition-all duration-300 max-w-7xl mx-auto">
        
        {/* Apple Luxury Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-200/40">
          <div>
            <h1 className="text-2xl sm:text-3.5xl font-extrabold text-slate-900 tracking-tight mt-1.5 capitalize font-sans">
              Financial Index Hub
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium leading-relaxed">
              Premium client-side asset comparison platform. Smooth spring trajectories.
            </p>
          </div>

          {/* Localized Digital Clock Widget */}
          <div className="flex items-center space-x-3 bg-white/45 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/80 shadow-liquid select-none shrink-0 self-start sm:self-auto">
            <Clock className="w-4 h-4 text-slate-400" />
            <div className="text-left font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                {formattedDate}
              </span>
              <span className="font-mono text-sm font-bold text-slate-800 block mt-1 leading-none">
                {formattedTime} UTC
              </span>
            </div>
          </div>
        </header>

        {/* Workspace views dynamic dispatcher with AnimatePresence */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME PANEL */}
          {currentTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              {/* Core market indicators block */}
              <MarketOverview assets={assets} />

              {/* Selected Curated Indices Grid */}
              <section id="curated-indexes-grid">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-sans font-bold text-lg text-slate-800 tracking-tight">
                      Flagship Market Watch
                    </h3>
                  </div>
                  <span className="text-[11px] font-sans font-semibold text-slate-400">Showing 6 benchmark coordinates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.filter(a => ['sp500', 'nasdaq', 'eurostoxx50', 'vwce', 'bitcoin', 'vix'].includes(a.id)).map(asset => (
                    <GlassCard 
                      key={asset.id}
                      asset={asset}
                      isSelectedForCompare={selectedAssetIds.includes(asset.id)}
                      onToggleCompare={handleToggleCompare}
                      isFavorite={favoriteAssetIds.includes(asset.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onCardClick={() => setSelectedDetailedAsset(asset)}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 2: MARKETS GRID EXPLORER */}
          {currentTab === 'markets' && (
            <motion.div
              key="markets-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {/* Filtering & Search panel bar rearranged (Search on top, Full-width Categories below) */}
              <div className="flex flex-col gap-5 py-3 select-none">
                
                {/* Instant Search input (Spans full line or aligns cleanly) */}
                <div className="flex justify-start sm:justify-between items-center gap-4 border-b border-slate-200/40 pb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Filter by Category Spec
                  </span>
                  <div className="relative w-full max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search asset or ticker..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl text-xs font-semibold font-sans bg-white/70 shadow-sm border border-slate-200/60 focus:bg-white transition-all text-slate-800 focus:ring-1 focus:ring-slate-300"
                      aria-label="Cerca indice azionario"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 tracking-wider"
                        aria-label="Clear filter query"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Advanced Category bubble pills (Occupies full line, wraps naturally on small viewports) */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'All 33 Indices' },
                    { id: 'us', label: 'US Equities' },
                    { id: 'europe', label: 'Eurozone' },
                    { id: 'asia', label: 'Asia-Pacific' },
                    { id: 'global', label: 'Global & ETFs' },
                    { id: 'sectors', label: 'Sectors Focus' },
                    { id: 'volatility', label: 'Volatility / Commods' },
                    { id: 'crypto', label: 'Crypto Assets' },
                  ].map((category) => {
                    const isSelected = selectedCategory === category.id;
                    if (isSelected) {
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className="inline-flex items-center h-10 px-1.5 py-1 rounded-full text-xs font-semibold select-none transition-all cursor-pointer bg-white border border-slate-300 shadow-[0_2px_6px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,1)] text-slate-800"
                        >
                          {/* Tactile inner pill mimicking the HI-1 reference perfectly */}
                          <div className="flex items-center justify-center bg-slate-100 border border-slate-200 rounded-full px-2 py-1 text-slate-600 mr-2 shadow-inner leading-none">
                            <BookmarkCheck className="w-3.5 h-3.5 text-slate-600 mr-1" strokeWidth={2.5} />
                            <span className="text-[10px] font-bold tracking-tight uppercase leading-none">✓ Active</span>
                          </div>
                          <span className="pr-3 text-slate-800 font-bold leading-none">{category.label}</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className="h-9 px-4 rounded-full text-xs font-semibold leading-none text-slate-500 hover:text-slate-800 hover:bg-white/80 border border-transparent transition-all cursor-pointer"
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Active list display */}
              {filteredAssets.length === 0 ? (
                <div className="glass-panel p-16 rounded-[2.5rem] text-center border border-white/70 max-w-md mx-auto my-12 shadow">
                  <AlertCircle className="w-10 h-10 text-slate-350 mx-auto stroke-1" />
                  <h4 className="font-sans font-bold text-slate-700 text-base mt-4">Uncharted Waters</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                    We could not find any active index matching <span className="text-blue-600 font-semibold italic">"{searchQuery}"</span>. Modify your filter parameters and try again.
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="mt-5 text-blue-500 text-xs font-bold underline hover:text-blue-600 cursor-pointer"
                  >
                    Reset Explorer Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredAssets.map(asset => (
                    <GlassCard 
                      key={asset.id}
                      asset={asset}
                      isSelectedForCompare={selectedAssetIds.includes(asset.id)}
                      onToggleCompare={handleToggleCompare}
                      isFavorite={favoriteAssetIds.includes(asset.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onCardClick={() => setSelectedDetailedAsset(asset)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ASSET COMPARISON SCREEN */}
          {currentTab === 'compare' && (
            <motion.div
              key="compare-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {selectedCompareAssets.length < 1 ? (
                // Standby Placeholder: Prompt for more entries
                <div className="glass-panel p-10 sm:p-14 md:p-16 rounded-[2.5rem] border border-slate-200 max-w-xl mx-auto text-center shadow-2xl relative overflow-hidden my-8 bg-white/50">
                  <Layers className="w-12 h-12 text-slate-400 mx-auto stroke-[1.2] mb-5" />
                  
                  <h3 className="font-sans font-bold text-xl text-slate-800 tracking-tight">
                    Comparison Bench is Idle
                  </h3>
                  
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mt-3">
                    In order to unlock interactive analysis, you must select at least <span className="text-slate-800 font-bold">1 asset</span>. Mark indexes from the Home dashboard or complete list.
                  </p>

                  <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={() => {
                        // Pre-add NASDAQ & S&P500 as sample comparison values for demonstration!
                        setSelectedAssetIds(['sp500', 'nasdaq']);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200/70 text-slate-700 font-sans text-xs font-bold leading-none shadow-sm hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                    >
                      Load Sample Demo Pair
                    </button>
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-sans text-xs font-bold leading-none shadow-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer text-center"
                    >
                      Examine Complete 33 List
                    </button>
                  </div>
                </div>
              ) : (
                // Full Comp Grid layout
                <div className="space-y-8">
                  
                  {/* Dynamic Trend Overlay Screen */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg select-none">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Combined Normalized Drift</span>
                        <h4 className="text-lg font-bold font-sans text-slate-800 mt-1">
                          {selectedCompareAssets.length === 1 ? `Analisi Singola: ${selectedCompareAssets[0].name}` : 'Multi-Trend Graph Alignment'}
                        </h4>
                      </div>

                      {/* OHLC Status metrics for single focus asset */}
                      {selectedCompareAssets.length === 1 && comparisonChartCoords?.[0] && compareHoveredIndex !== null && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px] text-slate-500 bg-white/40 border border-white/90 px-3 py-1.5 rounded-xl shadow-sm">
                          <span className="font-extrabold text-slate-400 mr-1 uppercase">O:</span>
                          <span className="font-bold text-slate-800 mr-2.5">${comparisonChartCoords[0].simulatedPoints[compareHoveredIndex].open}</span>
                          <span className="font-extrabold text-emerald-500 mr-1 uppercase">H:</span>
                          <span className="font-bold text-slate-800 mr-2.5">${comparisonChartCoords[0].simulatedPoints[compareHoveredIndex].high}</span>
                          <span className="font-extrabold text-rose-500 mr-1 uppercase">L:</span>
                          <span className="font-bold text-slate-800 mr-2.5">${comparisonChartCoords[0].simulatedPoints[compareHoveredIndex].low}</span>
                          <span className="font-extrabold text-slate-400 mr-1 uppercase">C:</span>
                          <span className="font-bold text-slate-800">${comparisonChartCoords[0].simulatedPoints[compareHoveredIndex].close}</span>
                        </div>
                      )}

                      <div className="flex space-x-1.5 shrink-0">
                        <button 
                          onClick={handleClearCompare}
                          className="px-3.5 py-1.5 rounded-xl bg-red-400/10 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear All Bench</span>
                        </button>
                      </div>
                    </div>

                    {/* Control Hub for timeframes (all, 10 anni, 5 anni, annuale, semestrale, trimestrale, mensile, settimanale, giornaliero) */}
                    <div className="flex flex-col md:flex-row gap-3.5 justify-between items-start md:items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-200/40 shadow-sm">
                      <div className="flex flex-wrap gap-1 p-0.5 bg-slate-200/40 border border-slate-300/10 rounded-full select-none max-w-full">
                        {TIMEFRAME_OPTIONS.map((tf) => (
                          <button
                            key={tf.id}
                            onClick={() => {
                              setCompareTimeframe(tf.id);
                              setCompareHoveredIndex(null);
                            }}
                            className={`px-2.5 py-1.5 rounded-full text-[9px] font-extrabold tracking-tight uppercase transition-all duration-200 cursor-pointer ${
                              compareTimeframe === tf.id
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                            }`}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>

                      <div className="shrink-0 self-end md:self-auto flex items-center space-x-2">
                        {selectedCompareAssets.length > 1 ? (
                          <span className="text-[10px] font-semibold text-slate-405 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200/50">
                            Multi-Asset Mode (Lines Only)
                          </span>
                        ) : (
                          <LiquidSwitch 
                            isActive={compareChartType === 'candle'} 
                            onChange={(active) => setCompareChartType(active ? 'candle' : 'line')}
                          />
                        )}
                      </div>
                    </div>

                    {/* Interactive multi-svg graph overlay */}
                    <div className="relative rounded-2xl bg-white/40 border border-white/80 p-5 mt-5 shadow-liquid h-[320px] flex flex-col justify-end">
                      <svg 
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 640 240" 
                        className="overflow-visible cursor-crosshair"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const width = rect.width;
                          const padding = 30;
                          const pointsLength = 32;
                          const stepWidth = (width - padding * 2) / (pointsLength - 1);
                          const itemIndex = Math.round((x - padding) / stepWidth);
                          if (itemIndex >= 0 && itemIndex < pointsLength) {
                            setCompareHoveredIndex(itemIndex);
                          }
                        }}
                        onMouseLeave={() => setCompareHoveredIndex(null)}
                      >
                        <defs>
                          <linearGradient id="compare-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Normalized Y Axis grid guides */}
                        <line x1={30} y1={25} x2={610} y2={25} stroke="rgba(100, 116, 139, 0.1)" strokeDasharray="4,4" />
                        <line x1={30} y1={80} x2={610} y2={80} stroke="rgba(100, 116, 139, 0.1)" strokeDasharray="4,4" />
                        <line x1={30} y1={135} x2={610} y2={135} stroke="rgba(100, 116, 139, 0.1)" strokeDasharray="4,4" />
                        <line x1={30} y1={190} x2={610} y2={190} stroke="rgba(100, 116, 139, 0.1)" strokeDasharray="4,4" />
                        <line x1={30} y1={215} x2={610} y2={215} stroke="rgba(100, 116, 139, 0.15)" />

                        {selectedCompareAssets.length === 1 && comparisonChartCoords?.[0] && compareChartType === 'candle' ? (
                          // Candlestick rendering
                          comparisonChartCoords[0].simulatedPoints.map((p, pIndex) => {
                            const paddingX = 30;
                            const paddingY = 25;
                            const svgWidth = 640;
                            const svgHeight = 240;
                            const minVal = comparisonChartCoords[0].min;
                            const maxVal = comparisonChartCoords[0].max;
                            const range = comparisonChartCoords[0].range;

                            const x = paddingX + (pIndex / (32 - 1)) * (svgWidth - paddingX * 2);
                            const yOpen = svgHeight - paddingY - ((p.open - minVal) / range) * (svgHeight - paddingY * 2);
                            const yClose = svgHeight - paddingY - ((p.close - minVal) / range) * (svgHeight - paddingY * 2);
                            const yHigh = svgHeight - paddingY - ((p.high - minVal) / range) * (svgHeight - paddingY * 2);
                            const yLow = svgHeight - paddingY - ((p.low - minVal) / range) * (svgHeight - paddingY * 2);

                            const isBullish = p.close >= p.open;
                            const strokeColor = isBullish ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
                            const fillColor = isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)';
                            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
                            const bodyY = Math.min(yOpen, yClose);
                            const bodyWidth = 8;

                            return (
                              <g key={pIndex} className="transition-all duration-200">
                                <line 
                                  x1={x} y1={yHigh} x2={x} y2={yLow} 
                                  stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" 
                                />
                                <rect 
                                  x={x - bodyWidth / 2} y={bodyY} width={bodyWidth} height={bodyHeight}
                                  fill={fillColor} stroke={strokeColor} strokeWidth={compareHoveredIndex === pIndex ? 2.5 : 1.5}
                                  rx={1.5}
                                  className="transition-all"
                                  style={{ filter: compareHoveredIndex === pIndex ? 'drop-shadow(0 0 5px rgba(0,0,0,0.15))' : 'none' }}
                                />
                              </g>
                            );
                          })
                        ) : (
                          // Overlay continuous lines
                          <>
                            {selectedCompareAssets.length === 1 && comparisonChartCoords?.[0] && (
                              <path
                                d={`M 30,215 L ${comparisonChartCoords[0].path.slice(2)} L 610,215 Z`}
                                fill="url(#compare-area-gradient)"
                              />
                            )}

                            {comparisonChartCoords?.map((curve, index) => (
                              <motion.path
                                key={curve.id}
                                d={curve.path}
                                fill="none"
                                stroke={curve.color}
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.08 }}
                              />
                            ))}
                          </>
                        )}

                        {compareHoveredIndex !== null && (
                          <line
                            x1={30 + (compareHoveredIndex / (32 - 1)) * (640 - 30 * 2)}
                            y1={25}
                            x2={30 + (compareHoveredIndex / (32 - 1)) * (640 - 30 * 2)}
                            y2={215}
                            stroke="rgba(148, 163, 184, 0.35)"
                            strokeWidth={1.5}
                            strokeDasharray="3,3"
                          />
                        )}
                      </svg>

                      {/* Legend list inside graph */}
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2.5 max-w-[85%] z-10">
                        {selectedCompareAssets.map((asset, index) => {
                          const colorsList = ['#0f172a', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6'];
                          const strokeSel = colorsList[index % colorsList.length];
                          
                          return (
                            <div 
                              key={asset.id}
                              className="flex items-center space-x-2 bg-white/90 backdrop-blur shadow-sm px-3 py-1.5 rounded-full border border-slate-200/60"
                            >
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: strokeSel }} />
                              <span className="font-mono text-[10px] font-extrabold text-slate-800">{asset.ticker}</span>
                              <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">({asset.category})</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="absolute bottom-2.5 right-4 text-[9px] font-extrabold text-slate-400 font-mono tracking-widest bg-white/20 border border-white/40 px-2 py-0.5 rounded-md">
                        {selectedCompareAssets.length === 1 
                          ? `${compareChartType.toUpperCase()} MODE • ${compareTimeframe.toUpperCase()} HISTORICAL VIEW`
                          : `NORMALIZED OVERLAY • ${compareTimeframe.toUpperCase()} TREND`}
                      </div>
                    </div>
                  </div>

                  {/* Multi asset side by side details compare dashboard */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/70 shadow-lg overflow-x-auto">
                    <h4 className="font-sans font-bold text-slate-800 text-base mb-4">Functional Evaluation Specs</h4>
                    
                    <table className="min-w-full text-left font-sans select-none border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Index name & Ticker</th>
                          <th className="py-3 px-4">Reference price</th>
                          <th className="py-3 px-4">Session drift</th>
                          <th className="py-3 px-4">Session High</th>
                          <th className="py-3 px-4">Session Low</th>
                          <th className="py-3 px-4">Volume</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompareAssets.map((asset) => {
                          const pos = asset.change >= 0;
                          return (
                            <tr 
                              key={asset.id} 
                              className="border-b border-slate-200/10 hover:bg-white/40 transition-colors"
                            >
                              {/* Asset Head cell */}
                              <td className="py-4 px-4 font-sans">
                                <span className="font-mono font-extrabold text-slate-800 block">{asset.ticker}</span>
                                <span className="text-[10px] text-slate-400 font-medium capitalize mt-0.5 block">{asset.name}</span>
                              </td>
                              {/* Price */}
                              <td className="py-4 px-4 font-mono font-bold text-slate-800">
                                ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              {/* Drift */}
                              <td className="py-4 px-4 font-mono">
                                <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                  pos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                }`}>
                                  {pos ? '+' : ''}{asset.change.toFixed(2)}%
                                </span>
                              </td>
                              {/* Daily High */}
                              <td className="py-4 px-4 font-mono text-slate-500">${asset.high.toLocaleString()}</td>
                              {/* Daily Low */}
                              <td className="py-4 px-4 font-mono text-slate-500">${asset.low.toLocaleString()}</td>
                              {/* Volume */}
                              <td className="py-4 px-4 font-mono text-slate-400">{asset.volume}</td>
                              
                              {/* Remove button */}
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedDetailedAsset(asset)}
                                    className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                                    title="Visualizza dettagli in sovrimpressione"
                                  >
                                    <Info className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleRemoveCompare(asset.id, e)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                    title="Cancella dal confronto"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Institutional Fintech abstract heat elements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none" aria-hidden="true">
                    
                    {/* Inter-Index correlation matrix mockup */}
                    <div className="glass-panel p-5 rounded-3xl border border-white/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Structural Metrics</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1 mb-4">Simulated Correlation Coefficient Matrix</h4>
                      
                      <div className="space-y-2.5">
                        {selectedCompareAssets.slice(0, 4).map((assetOuter, outerIdx) => (
                          <div key={assetOuter.id} className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-700">{assetOuter.ticker}</span>
                            <div className="flex space-x-1.5">
                              {selectedCompareAssets.slice(0, 4).map((assetInner, innerIdx) => {
                                // generate mock static symmetric correlation values [0.35 - 1.00]
                                const isSelf = assetOuter.id === assetInner.id;
                                const corrVal = isSelf ? 1.00 : (0.50 + ((outerIdx + innerIdx) % 5) * 0.11).toFixed(2);
                                
                                return (
                                  <div 
                                    key={assetInner.id}
                                    className={`w-12 py-1 rounded text-center font-mono text-[9px] font-bold ${
                                      isSelf 
                                        ? 'bg-slate-800 text-white' 
                                        : 'bg-slate-100 text-slate-700 border border-slate-200/50'
                                    }`}
                                    title={`Correlation between ${assetOuter.ticker} and ${assetInner.ticker}`}
                                  >
                                    {corrVal}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-4.5">
                        Correlation computations track average price directionalities of the active window session mock curves.
                      </p>
                    </div>

                    {/* Compare Quick FAQ Block */}
                    <div className="glass-panel p-5 rounded-3xl border border-white/60 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Comparative Guide</span>
                        <h4 className="text-sm font-bold text-slate-800 mt-1 mb-2">How normalize overlay graphs work?</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Since absolute pricing varies heavily (e.g. S&P 500 at 5,000 pts vs VWCE at $120), our graph automatically scales and converts all timeline vectors to percentage drifts starting from their respective standard starting boundaries.
                        </p>
                      </div>
                      
                      <div className="p-3 bg-slate-100/45 border border-slate-200/50 rounded-xl text-[11px] text-slate-500 leading-relaxed mt-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>This allows direct structural evaluation of volatility behaviors and trend alignments across distinct, unrelated asset groups.</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: WATCHLIST BROWSER */}
          {currentTab === 'watchlist' && (
            <motion.div
              key="watchlist-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              {favoriteAssets.length === 0 ? (
                // Empty Watchlist visual helper
                <div className="glass-panel p-16 rounded-[2.5rem] text-center border border-white/70 max-w-md mx-auto my-12 shadow">
                  <BookmarkCheck className="w-12 h-12 text-slate-400 mx-auto stroke-[1.2] mb-4" />
                  <h4 className="font-sans font-bold text-slate-750 text-base mt-4">Curated List is Clean</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2.5">
                    You have not bookmarked any private index selections yet. Click the outline star badge located on index cards to save favorites!
                  </p>
                  <button
                    onClick={() => setCurrentTab('markets')}
                    className="h-9 px-4 rounded-xl mt-6 bg-slate-900 text-white text-xs font-bold leading-none shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Examine Asset Roster
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center select-none">
                    <h3 className="font-sans font-bold text-lg text-slate-800 tracking-tight flex items-center gap-1.5">
                      <Star className="w-5 h-5 fill-current text-slate-700" />
                      Bookmarked Indices
                    </h3>
                    <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-slate-200/60 shadow-sm font-mono">
                      {favoriteAssets.length} Bookmarked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {favoriteAssets.map(asset => (
                      <GlassCard 
                        key={asset.id}
                        asset={asset}
                        isSelectedForCompare={selectedAssetIds.includes(asset.id)}
                        onToggleCompare={handleToggleCompare}
                        isFavorite={favoriteAssetIds.includes(asset.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onCardClick={() => setSelectedDetailedAsset(asset)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: CONFIGURATIONS PLAYGROUND */}
          {currentTab === 'settings' && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="max-w-2xl mx-auto my-4 space-y-6 select-none"
            >
              {/* Premium configurations block */}
              <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-white/70 shadow-lg space-y-6 sm:space-y-8">
                <div>
                  <h3 className="font-sans font-bold text-lg sm:text-xl text-slate-800 tracking-tight flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-slate-600" />
                    Interface Parameters
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-sans font-semibold">
                    Simulate visual renders of modern layouts. Client-side, instant feedback.
                  </p>
                </div>

                <div className="border-t border-slate-200/40 my-4" />

                {/* Grid controls */}
                <div className="space-y-5 sm:space-y-6">
                  
                  {/* Selector 1: Glassmorphism Blur Strength */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Glassmorphism Level</span>
                      <p className="text-xs text-slate-400 max-w-sm mt-0.5">Control backdrop filter intensity values mapped inside index panels.</p>
                    </div>

                    <div className="flex rounded-xl bg-slate-900/5 p-1 border border-slate-200/20 select-none self-start sm:self-auto uppercase font-mono tracking-wider font-bold text-[10px]">
                      {(['subtle', 'standard', 'liquid'] as const).map((intensity) => (
                        <button
                          key={intensity}
                          id={`config-btn-intensity-${intensity}`}
                          onClick={() => setGlassIntensity(intensity)}
                          className={`px-3 py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                            glassIntensity === intensity 
                              ? 'bg-white text-slate-800 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {intensity}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector 2: Heartrate Simulation speed */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Valuation Drifts Refresh Rate</span>
                      <p className="text-xs text-slate-400 max-w-sm mt-0.5">Adjust how fast underlying index pricing fluctuates visually on clock ticks.</p>
                    </div>

                    <div className="flex rounded-xl bg-slate-900/5 p-1 border border-slate-200/20 uppercase font-mono tracking-wider font-bold text-[10px] self-start sm:self-auto">
                      {(['manual', 'slow', 'fast'] as const).map((interval) => (
                        <button
                          key={interval}
                          id={`config-btn-interval-${interval}`}
                          onClick={() => setRefreshInterval(interval)}
                          className={`px-3 py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                            refreshInterval === interval 
                              ? 'bg-white text-slate-800 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {interval === 'manual' ? 'Locked' : interval === 'slow' ? '10s (Eco)' : '4s (Live)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector 3: Pastel Colors Indicator on cards */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Saturate Index Accents</span>
                      <p className="text-xs text-slate-400 max-w-sm mt-0.5">Shift between soft Apple desaturated pastels and traditional indicators.</p>
                    </div>

                    <button
                      onClick={() => setPastelColors(p => !p)}
                      className={`h-7 px-4 rounded-xl text-xs font-semibold leading-none border transition-all cursor-pointer ${
                        pastelColors 
                          ? 'bg-slate-800/10 text-slate-800 border-slate-300' 
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {pastelColors ? 'Desaturated Mellow' : 'Vibrant Standard'}
                    </button>
                  </div>

                  {/* Selector 4: Display tickers globally toggler */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Force Monospaced Ticker Code</span>
                      <p className="text-xs text-slate-400 max-w-sm mt-0.5">Expose index code identifiers like DJI vs. Dow Jones Industrial globally.</p>
                    </div>

                    <button
                      onClick={() => setShowTickersGlobal(g => !g)}
                      className={`h-7 px-4 rounded-xl text-xs font-semibold leading-none border transition-all cursor-pointer ${
                        showTickersGlobal 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {showTickersGlobal ? 'Visible' : 'Omitted'}
                    </button>
                  </div>

                </div>

                {/* Diagnostics guide details */}
                <div className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200/10 text-xs text-slate-500 leading-relaxed text-left flex items-start gap-3">
                  <Heart className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Open Source Vision Design</span>
                    <span className="mt-1 block">
                      This setup runs entirely client-side. The styling framework leverages custom Tailwind @theme parameters bundled at compile-time to maintain lightning-fast response times.
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Global Floating Actions & Comparison Alert layer */}
        <ComparisonBench 
          selectedAssets={selectedCompareAssets}
          isOpen={selectedAssetIds.length > 0}
          onClear={handleClearCompare}
          onRemove={handleRemoveCompare}
          onGoToCompare={handleGoToCompare}
          activeTab={currentTab}
        />

        {/* Dynamic Asset Details Overlay Modal view with AnimatePresence */}
        <AnimatePresence>
          {selectedDetailedAsset && (
            <AssetDetailModal 
              asset={selectedDetailedAsset}
              isOpen={selectedDetailedAsset !== null}
              onClose={() => setSelectedDetailedAsset(null)}
              isFavorite={favoriteAssetIds.includes(selectedDetailedAsset.id)}
              onToggleFavorite={handleToggleFavorite}
              isSelectedForCompare={selectedAssetIds.includes(selectedDetailedAsset.id)}
              onToggleCompare={handleToggleCompare}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
