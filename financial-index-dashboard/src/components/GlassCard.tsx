import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Layers, Star, Info } from 'lucide-react';
import { IndexAsset } from '../types';

interface GlassCardProps {
  key?: string;
  asset: IndexAsset;
  isSelectedForCompare: boolean;
  onToggleCompare: (id: string, e: React.MouseEvent) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onCardClick: () => void;
}

export default function GlassCard({
  asset,
  isSelectedForCompare,
  onToggleCompare,
  isFavorite,
  onToggleFavorite,
  onCardClick,
}: GlassCardProps) {
  const [glowStyle, setGlowStyle] = useState<React.CSSProperties>({
    opacity: 0,
    background: 'none'
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const isPositiveVal = asset.change >= 0;
    const glowColor = isPositiveVal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    setGlowStyle({
      opacity: 1,
      background: `radial-gradient(130px circle at ${x}px ${y}px, ${glowColor}, transparent 80%)`
    });
  };

  const handleMouseLeave = () => {
    setGlowStyle({
      opacity: 0,
      background: 'none'
    });
  };

  const isPositive = asset.change >= 0;

  // Render SVG Sparkline
  const renderSparkline = () => {
    const points = asset.sparkline;
    if (!points || points.length === 0) return null;

    const width = 120;
    const height = 42;
    const padding = 3;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((p, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${coords.join(' L ')}`;
    const lineStroke = isPositive ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    const gradientId = `glow-grad-${asset.id}`;

    return (
      <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0.14" />
            <stop offset="100%" stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Fill under sparkline */}
        <path
          d={`${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
          fill={`url(#${gradientId})`}
        />
        {/* Primary Animated Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={lineStroke}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Glow pulsing endpoint */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].split(',')[0]}
            cy={coords[coords.length - 1].split(',')[1]}
            r="2.5"
            fill={isPositive ? '#10b981' : '#ef4444'}
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <motion.div
      layoutId={`card-container-${asset.id}`}
      id={`glass-card-${asset.id}`}
      className={`glass-card relative p-5 rounded-3xl cursor-pointer flex flex-col justify-between overflow-hidden group select-none transition-all ${
        isSelectedForCompare ? 'ring-2 ring-slate-400/35 bg-white/80 shadow-active border-slate-300' : ''
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onCardClick}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
    >
      {/* Liquid Glass Radial Highlight Overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl"
        style={glowStyle}
      />

      {/* Header element */}
      <div className="flex justify-between items-start gap-3 z-10">
        <div>
          {/* Ticker Symbol pill */}
          <span className="font-mono text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-900/5 dark:bg-slate-900/10 text-slate-500">
            {asset.ticker}
          </span>
          <h3 className="font-sans font-semibold text-slate-800 text-sm md:text-base mt-2 tracking-tight line-clamp-1">
            {asset.name}
          </h3>
          <span className="text-[10px] font-sans font-medium text-slate-400 capitalize">
            {asset.category === 'us' ? 'US Equity' : asset.category}
          </span>
        </div>

        {/* Action Controls Overlay */}
        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => onToggleFavorite(asset.id, e)}
            id={`btn-fav-${asset.id}`}
            aria-label={`${isFavorite ? 'Remove from' : 'Add to'} favorites: ${asset.name}`}
            className={`p-1.5 rounded-full transition-colors ${
              isFavorite
                ? 'bg-slate-800/15 text-slate-800'
                : 'text-slate-350 hover:text-slate-650 hover:bg-slate-100/50'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" strokeWidth={isFavorite ? 1.5 : 2} />
          </button>
          
          <button
            onClick={(e) => onToggleCompare(asset.id, e)}
            id={`btn-comp-${asset.id}`}
            aria-label={`${isSelectedForCompare ? 'Remove from' : 'Add to'} comparison: ${asset.name}`}
            className={`p-1.5 rounded-full transition-all ${
              isSelectedForCompare
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-350 hover:text-slate-650 hover:bg-slate-100/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Price & Sparkline body */}
      <div className="flex items-end justify-between mt-6 z-10" aria-hidden="true">
        <div className="flex flex-col">
          <span className="font-mono text-xs text-slate-400">Index Price</span>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="font-mono text-lg md:text-xl font-semibold text-slate-800 tracking-tight">
              ${asset.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Change pill */}
          <div className="flex items-center space-x-1 mt-1">
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span
              className={`font-mono text-xs font-medium ${
                isPositive ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isPositive ? '+' : ''}
              {asset.change.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Sparkline Graph */}
        <div className="flex items-center self-end pl-2">
          {renderSparkline()}
        </div>
      </div>

      {/* Decorative hover info */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity duration-300" aria-hidden="true">
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </div>
    </motion.div>
  );
}
