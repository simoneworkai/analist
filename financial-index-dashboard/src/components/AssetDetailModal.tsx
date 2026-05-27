import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Star, Layers, Percent, TrendingUp, TrendingDown, Clock, ShieldCheck, Heart, CircleDot, BookmarkCheck } from 'lucide-react';
import { IndexAsset } from '../types';
import { generateSimulatedData, TimeframeId, TIMEFRAME_OPTIONS } from '../utils/chartSim';
import { loadHistoricalData, processHistoryForTimeframe, RawHistoryPoint } from '../utils/historyLoader';
import LiquidSwitch from './LiquidSwitch';

interface AssetDetailModalProps {
  asset: IndexAsset | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  isSelectedForCompare: boolean;
  onToggleCompare: (id: string, e: React.MouseEvent) => void;
}

type ModalTab = 'variants' | 'performance' | 'constituents' | 'risk';

export default function AssetDetailModal({
  asset,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  isSelectedForCompare,
  onToggleCompare,
}: AssetDetailModalProps) {
  if (!asset || !isOpen) return null;

  const [activeTab, setActiveTab] = useState<ModalTab>('performance');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeId>('1m');
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'candle'>('line');
  const [realHistory, setRealHistory] = useState<RawHistoryPoint[]>([]);
  const [isLoadingReal, setIsLoadingReal] = useState(false);

  useEffect(() => {
    if (asset) {
      if (asset.subcategories && asset.subcategories.length > 0) {
        setActiveTab('variants');
      } else {
        setActiveTab('performance');
      }
      setSelectedVariants([]);
      
      // Dynamic load of static real history
      setIsLoadingReal(true);
      loadHistoricalData(asset.id)
        .then(data => {
          setRealHistory(data);
          setIsLoadingReal(false);
        })
        .catch(err => {
          console.error(err);
          setRealHistory([]);
          setIsLoadingReal(false);
        });
    }
  }, [asset]);

  const toggleVariant = (variant: string) => {
    setSelectedVariants(prev => 
      prev.includes(variant) 
        ? prev.filter(v => v !== variant)
        : [...prev, variant]
    );
  };
  
  // Real-time simulated price coordinates and open/high/low/close candlestick models
  const simulatedPoints = useMemo(() => {
    if (selectedTimeframe !== '1d' && realHistory.length > 0) {
      return processHistoryForTimeframe(realHistory, selectedTimeframe, 32);
    }
    return generateSimulatedData(asset, selectedTimeframe, 32);
  }, [asset, selectedTimeframe, realHistory]);

  const points = useMemo(() => {
    return simulatedPoints.map(p => p.close);
  }, [simulatedPoints]);


  const isPositive = asset.change >= 0;
  const hasSubcategories = !!(asset.subcategories && asset.subcategories.length > 0);
  
  // Always render tabs, only include variants if subcategories exist
  const tabsToShow = useMemo(() => {
    const tabs: ModalTab[] = ['performance', 'constituents', 'risk'];
    if (hasSubcategories) {
      tabs.unshift('variants');
    }
    return tabs;
  }, [hasSubcategories]);


  // Track cursor position to display interactive price values on the chart
  const handleGraphMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const padding = 20;
    
    // Convert coordinate to percentage
    const stepWidth = (width - padding * 2) / (points.length - 1);
    const itemIndex = Math.round((x - padding) / stepWidth);
    
    if (itemIndex >= 0 && itemIndex < points.length) {
      setHoveredPointIndex(itemIndex);
    }
  };

  const handleGraphMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  // SVG drawing attributes
  const svgWidth = 520;
  const svgHeight = 180;
  const paddingX = 24;
  const paddingY = 20;

  const minPoint = useMemo(() => {
    if (selectedChartType === 'candle') {
      return Math.min(...simulatedPoints.map(p => p.low));
    }
    return Math.min(...points);
  }, [points, simulatedPoints, selectedChartType]);

  const maxPoint = useMemo(() => {
    if (selectedChartType === 'candle') {
      return Math.max(...simulatedPoints.map(p => p.high));
    }
    return Math.max(...points);
  }, [points, simulatedPoints, selectedChartType]);

  const pointRange = useMemo(() => maxPoint - minPoint || 1, [maxPoint, minPoint]);

  const getCoordinatesStr = () => {
    return points.map((p, index) => {
      const x = paddingX + (index / (points.length - 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - ((p - minPoint) / pointRange) * (svgHeight - paddingY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' L ');
  };

  const coords = useMemo(() => {
    return points.map((p, index) => {
      const x = paddingX + (index / (points.length - 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - ((p - minPoint) / pointRange) * (svgHeight - paddingY * 2);
      return { x, y, val: p };
    });
  }, [points, minPoint, pointRange, svgHeight, paddingY, paddingX, svgWidth]);

  const activeCoord = hoveredPointIndex !== null ? coords[hoveredPointIndex] : coords[coords.length - 1];
  const activePrice = activeCoord ? activeCoord.val : asset.value;

  // Mock constituents tailored by asset type
  const getConstituents = () => {
    if (asset.category === 'crypto') {
      return [
        { name: 'Primary Core Blocks', weight: '42.8%', beta: '1.00', trend: '+2.4%' },
        { name: 'Secondary Nodes', weight: '21.4%', beta: '1.12', trend: '+1.8%' },
        { name: 'Exchange Liquidity Pool', weight: '18.1%', beta: '0.85', trend: '+0.5%' },
        { name: 'Institutional Holdings', weight: '17.7%', beta: '1.45', trend: '+4.2%' },
      ];
    }
    if (asset.category === 'us') {
      return [
        { name: 'Microsoft Corp. (MSFT)', weight: '7.45%', beta: '1.20', trend: '+1.62%' },
        { name: 'Apple Inc. (AAPL)', weight: '6.82%', beta: '1.14', trend: '+0.95%' },
        { name: 'NVIDIA Corp. (NVDA)', weight: '6.54%', beta: '1.85', trend: '+5.42%' },
        { name: 'Amazon.com Inc. (AMZN)', weight: '3.75%', beta: '1.30', trend: '-0.15%' },
        { name: 'Alphabet Inc. (GOOGL)', weight: '3.50%', beta: '1.15', trend: '+2.14%' },
      ];
    }
    return [
      { name: 'Global Asset Cap Class A', weight: '12.4%', beta: '1.05', trend: '+0.85%' },
      { name: 'Global Asset Cap Class B', weight: '10.2%', beta: '0.92', trend: '+1.12%' },
      { name: 'International Core Debtors', weight: '8.45%', beta: '0.65', trend: '-0.30%' },
      { name: 'Industrial Infrastructure Leads', weight: '7.12%', beta: '1.18', trend: '+2.02%' },
    ];
  };

  return (
    <div 
      id="asset-detail-backdrop" 
      className="fixed inset-0 bg-slate-900/15 backdrop-blur-xl flex items-center justify-center p-4 z-50 rounded-2xl md:rounded-none select-none"
      onClick={onClose}
    >
      <motion.div
        id="asset-detail-card"
        className="glass-panel w-full max-w-[580px] rounded-[36px] overflow-hidden p-6 relative border border-white/80 shadow-2xl flex flex-col justify-between"
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/5 text-slate-500 font-bold">
              {asset.ticker}
            </span>
            <span className="text-xs font-sans text-slate-400 font-semibold">• Details View</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Toggle Favorite Button */}
            <button
              onClick={(e) => onToggleFavorite(asset.id, e)}
              className={`p-2 rounded-full border transition-all ${
                isFavorite 
                  ? 'bg-slate-800/15 text-slate-800 border-slate-300' 
                  : 'bg-white/50 text-slate-400 hover:text-slate-600 border-slate-200/50'
              }`}
              aria-label="Toggle favourite"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Toggle Compare Button */}
            <button
              onClick={(e) => onToggleCompare(asset.id, e)}
              className={`p-2 rounded-full border transition-all ${
                isSelectedForCompare 
                  ? 'bg-slate-800 text-white border-slate-900 shadow-sm' 
                  : 'bg-white/50 text-slate-400 hover:text-slate-600 border-slate-200/50'
              }`}
              aria-label="Toggle compare selection"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-close-modal"
              className="p-2 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-500 transition-colors border border-slate-200/25"
              aria-label="Chiedi dettagli"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Title & Current Live Value */}
        <div className="mb-6">
          <h2 className="font-sans font-bold text-2xl text-slate-800 tracking-tight">{asset.name}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5">
            <div className="flex items-baseline space-x-2">
              <motion.span 
                key={activePrice}
                initial={{ opacity: 0.6, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-3xl font-extrabold text-slate-800 tracking-tighter"
              >
                ${activePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.span>
              
              <div className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
              }`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{asset.change.toFixed(2)}%</span>
              </div>
            </div>

            {/* OHLC Stats when hovering (Exactly matches TradingView style overlay) */}
            {hoveredPointIndex !== null ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[9px] text-slate-500 border-l border-slate-300/40 pl-0.5 sm:pl-3.5">
                <span className="bg-slate-900/5 px-2 py-0.5 rounded-md">
                  <span className="font-extrabold text-slate-400 mr-0.5 whitespace-nowrap">O</span>
                  <span className="font-bold text-slate-705">${simulatedPoints[hoveredPointIndex].open}</span>
                </span>
                <span className="bg-emerald-500/5 px-2 py-0.5 rounded-md">
                  <span className="font-extrabold text-emerald-500 mr-0.5 whitespace-nowrap">H</span>
                  <span className="font-bold text-slate-705">${simulatedPoints[hoveredPointIndex].high}</span>
                </span>
                <span className="bg-rose-500/5 px-2 py-0.5 rounded-md">
                  <span className="font-extrabold text-rose-500 mr-0.5 whitespace-nowrap">L</span>
                  <span className="font-bold text-slate-705">${simulatedPoints[hoveredPointIndex].low}</span>
                </span>
                <span className="bg-slate-900/5 px-2 py-0.5 rounded-md">
                  <span className="font-extrabold text-slate-400 mr-0.5 whitespace-nowrap">C</span>
                  <span className="font-bold text-slate-705">${simulatedPoints[hoveredPointIndex].close}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-semibold font-sans mt-1">
                <Clock className="w-3 h-3" />
                <span>Simulated Real-time Index Tracker</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {hoveredPointIndex !== null 
              ? `Interactive point [${simulatedPoints[hoveredPointIndex].timestamp}]` 
              : 'Hover grid for multi-point metrics analysis'} • Active Period: {TIMEFRAME_OPTIONS.find(o => o.id === selectedTimeframe)?.label}
          </p>
        </div>

        {/* Graph Area Container */}
        <div className="relative rounded-2xl bg-white/40 border border-white/70 p-4.5 shadow-liquid mb-6">
          
          {/* Internal Dashboard Controls for Timeframe and Candlestick Toggle */}
          <div className="flex flex-col md:flex-row gap-3.5 justify-between items-start md:items-center mb-5 pb-3 border-b border-slate-200/50">
            {/* Timeframe selector */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-slate-200/40 border border-slate-300/10 rounded-full select-none max-w-full">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => {
                    setSelectedTimeframe(tf.id);
                    setHoveredPointIndex(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-full text-[9px] font-extrabold tracking-tight uppercase transition-all duration-200 cursor-pointer ${
                    selectedTimeframe === tf.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  }`}
                >
                  {tf.label.split(' ')[0]} {/* short code like "All", "10", "5", "Annuale" */}
                </button>
              ))}
            </div>

            {/* Premium switch indicator */}
            <div className="shrink-0 self-end md:self-auto">
              <LiquidSwitch 
                isActive={selectedChartType === 'candle'} 
                onChange={(active) => setSelectedChartType(active ? 'candle' : 'line')}
              />
            </div>
          </div>

          <svg 
            width="100%" 
            height={svgHeight} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="overflow-visible cursor-crosshair"
            onMouseMove={handleGraphMouseMove}
            onMouseLeave={handleGraphMouseLeave}
          >
            <defs>
              <linearGradient id="detail-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0.18" stopWidth="0" />
                <stop offset="100%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Simulated Horizontal Grid guidelines */}
            <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(203, 213, 225, 0.25)" strokeDasharray="3,3" />
            <line x1={paddingX} y1={svgHeight/2} x2={svgWidth - paddingX} y2={svgHeight/2} stroke="rgba(203, 213, 225, 0.25)" strokeDasharray="3,3" />
            <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="rgba(203, 213, 225, 0.25)" strokeDasharray="3,3" />

            {selectedChartType === 'candle' ? (
              // Candlesticks representing realistic OHLC curves
              simulatedPoints.map((p, index) => {
                const x = paddingX + (index / (simulatedPoints.length - 1)) * (svgWidth - paddingX * 2);
                
                // Map values to y-dimensions
                const yOpen = svgHeight - paddingY - ((p.open - minPoint) / pointRange) * (svgHeight - paddingY * 2);
                const yClose = svgHeight - paddingY - ((p.close - minPoint) / pointRange) * (svgHeight - paddingY * 2);
                const yHigh = svgHeight - paddingY - ((p.high - minPoint) / pointRange) * (svgHeight - paddingY * 2);
                const yLow = svgHeight - paddingY - ((p.low - minPoint) / pointRange) * (svgHeight - paddingY * 2);

                const isBullish = p.close >= p.open;
                const candleColor = isBullish ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
                const strokeColor = candleColor;
                // High density alpha filled glassy colors with real-time blur reflection
                const fillColor = isBullish ? 'rgba(16, 185, 129, 0.42)' : 'rgba(239, 68, 68, 0.42)';
                const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
                const bodyY = Math.min(yOpen, yClose);
                const bodyWidth = Math.max(4, Math.min(10, (svgWidth - paddingX * 2) / simulatedPoints.length * 0.58));

                const isHovered = hoveredPointIndex === index;

                return (
                  <g key={index} className="transition-all duration-300">
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                    {/* Candle Body */}
                    <rect
                      x={x - bodyWidth / 2}
                      y={bodyY}
                      width={bodyWidth}
                      height={bodyHeight}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      rx={1}
                      className="transition-all duration-150 relative"
                      style={{ filter: isHovered ? 'drop-shadow(0 0 4px rgba(0,0,0,0.15))' : 'none' }}
                    />
                  </g>
                );
              })
            ) : (
              // Continuous clean line trend
              <>
                <path
                  d={`M ${paddingX},${svgHeight - paddingY} L ${getCoordinatesStr()} L ${svgWidth - paddingX},${svgHeight - paddingY} Z`}
                  fill="url(#detail-area-gradient)"
                />
                <path
                  d={`M ${getCoordinatesStr()}`}
                  fill="none"
                  stroke={isPositive ? '#10b981' : '#ef4444'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Interactive tracker vertical overlay bar */}
            {activeCoord && hoveredPointIndex !== null && (
              <>
                <line 
                  x1={activeCoord.x} 
                  y1={paddingY} 
                  x2={activeCoord.x} 
                  y2={svgHeight - paddingY} 
                  stroke="rgba(100, 116, 139, 0.25)"
                  strokeWidth="1.2"
                  strokeDasharray="2,2"
                />
                {selectedChartType !== 'candle' && (
                  <circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r="5.5"
                    fill={isPositive ? '#10b981' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="shadow-sm"
                  />
                )}
              </>
            )}
          </svg>
          <div className="absolute top-2 right-4 text-[9px] font-mono font-bold text-slate-400 tracking-wider bg-white/20 px-2 py-0.5 rounded-md border border-white/40">
            {selectedChartType === 'candle' ? 'CANDLESTICK GRID' : 'DRIFT TRAJECTORY'}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200/55 gap-5 mb-5 select-none" aria-label="Tabbed options">
          {tabsToShow.map((tab) => (
            <button
              key={tab}
              id={`tab-btn-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-xs font-semibold tracking-wide capitalize relative ${
                activeTab === tab ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="active-modal-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Core Content panels */}
        <div className="min-h-[148px] flex-grow flex flex-col justify-between">
          {hasSubcategories && activeTab === 'variants' && asset.subcategories && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1 select-none">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Available Derivatives</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select index variations to customize portfolio drift.</p>
                </div>
                {selectedVariants.length > 0 && (
                  <button
                    onClick={() => setSelectedVariants([])}
                    className="text-[10px] font-bold text-slate-800 hover:text-slate-900 bg-slate-900/5 hover:bg-slate-900/10 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1 select-none">
                {asset.subcategories.map((variant) => {
                  const isActive = selectedVariants.includes(variant);
                  return (
                    <motion.div
                      key={variant}
                      onClick={() => toggleVariant(variant)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer border transition-all ${
                        isActive 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                          : 'bg-white/40 hover:bg-white/60 text-slate-800 border-slate-200/55'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {isActive ? (
                          <div className="flex items-center justify-center bg-white text-slate-900 rounded-full px-1.5 py-0.5 leading-none shrink-0 shadow">
                            <BookmarkCheck className="w-2.5 h-2.5 mr-0.5 shrink-0" strokeWidth={2.5} />
                            <span className="text-[8px] font-extrabold tracking-tight uppercase">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-slate-900/5 text-slate-400 rounded-full px-2 py-0.5 leading-none shrink-0">
                            <span className="text-[8px] font-bold tracking-tight uppercase">Index</span>
                          </div>
                        )}
                        <span className={`font-sans font-bold text-xs truncate ${isActive ? 'text-white' : 'text-slate-705'}`}>
                          {variant}
                        </span>
                      </div>
                      
                      <span className={`font-mono text-[9px] font-semibold shrink-0 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                        {asset.ticker}-{variant.split(' ')[0].slice(0, 3).toUpperCase()}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/30 border border-white/50 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Daily Range</span>
                <span className="font-mono text-xs font-bold text-slate-700 tracking-tight mt-1 block">
                  ${(asset.low).toLocaleString()} - ${(asset.high).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Low vs. High points</span>
              </div>
              
              <div className="p-3 bg-white/30 border border-white/50 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Session Volume</span>
                <span className="font-mono text-xs font-bold text-slate-700 tracking-tight mt-1 block">
                  {asset.volume}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Total active derivative liquidity</span>
              </div>

              <div className="col-span-2 p-3 bg-white/30 border border-white/50 rounded-2xl text-slate-600 text-xs leading-relaxed">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Asset Synopsis</span>
                {asset.description}
              </div>
            </div>
          )}

          {activeTab === 'constituents' && (
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                <span>Name</span>
                <div className="flex space-x-6">
                  <span>Weight</span>
                  <span>Variance</span>
                </div>
              </div>

              {getConstituents().map((item, i) => (
                <div 
                  key={i}
                  className="flex justify-between items-center p-2 rounded-xl bg-white/30 border border-white/40 shadow-sm"
                >
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <CircleDot className="w-2.5 h-2.5 text-slate-400" />
                    {item.name}
                  </span>
                  
                  <div className="flex space-x-6 text-xs">
                    <span className="font-mono font-bold text-slate-500">{item.weight}</span>
                    <span className={`font-mono font-bold ${item.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/30 border border-white/50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Systemic Beta Ratio</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Measures index sensitivity relative to ACWI core global indicators.</p>
                </div>
                <div className="bg-slate-900/5 px-3 py-1.5 rounded-xl font-mono text-sm font-extrabold text-slate-805">
                  {asset.category === 'crypto' ? '1.82' : asset.category === 'volatility' ? '-1.15' : '1.10'}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-white/11 border border-white/50 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-705 block">Sharpe Portfolio Metric</span>
                  <p className="text-[10px] text-slate-450 mt-0.5">Quantifies excess risk-adjusted return relative to risk-free treasury bonds.</p>
                </div>
                <div className="bg-slate-900/5 px-3 py-1.5 rounded-xl font-mono text-sm font-extrabold text-slate-805">
                  2.08
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
