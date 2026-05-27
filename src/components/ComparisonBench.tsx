import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Columns4, Layers2, Trash2, ArrowRight, X, TrendingUp, Circle as HelpCircle } from 'lucide-react';
import { IndexAsset } from '../types';

interface ComparisonBenchProps {
  selectedAssets: IndexAsset[];
  isOpen: boolean;
  onClear: () => void;
  onRemove: (id: string, e: React.MouseEvent) => void;
  onGoToCompare: () => void;
  activeTab: string;
}

export default function ComparisonBench({
  selectedAssets,
  isOpen,
  onClear,
  onRemove,
  onGoToCompare,
  activeTab,
}: ComparisonBenchProps) {
  if (selectedAssets.length === 0) return null;

  // Render floating alert strip only when we are NOT already looking at the comparison tab
  const showFloatingStrip = activeTab !== 'compare' && selectedAssets.length >= 1;

  return (
    <AnimatePresence>
      {showFloatingStrip && (
        <motion.div
          id="comparison-float-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 min-w-[280px] sm:min-w-[460px] md:min-w-[540px] max-w-[90%] h-14 rounded-full glass-panel border border-white/90 shadow-2xl flex items-center justify-between pl-5 pr-2 py-1.5 z-40 select-none"
        >
          {/* Active Counters Info */}
          <div className="flex items-center space-x-3.5 flex-grow mr-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white">
              <Layers2 className="w-4 h-4 text-slate-300" />
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold font-sans text-slate-800 leading-tight">
                Comparison Bench
              </span>
              <span className="text-[10px] font-sans text-slate-400 font-semibold leading-none mt-0.5">
                {selectedAssets.length === 1 
                  ? 'Select one more index to evaluate trends' 
                  : `${selectedAssets.length} assets selected for side-by-side analysis`}
              </span>
            </div>
          </div>

          {/* Selected asset badges list */}
          <div className="hidden lg:flex items-center space-x-1.5 mr-4 max-w-[200px] overflow-hidden">
            {selectedAssets.slice(0, 3).map((asset) => (
              <div 
                key={asset.id} 
                className="flex items-center space-x-1 bg-slate-900/5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-slate-600 border border-slate-200/20"
              >
                <span>{asset.ticker}</span>
                <button 
                  onClick={(e) => onRemove(asset.id, e)}
                  className="hover:text-red-500 cursor-pointer"
                  aria-label={`Remove ${asset.ticker}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {selectedAssets.length > 3 && (
              <span className="text-[9px] font-semibold text-slate-400">+{selectedAssets.length - 3}</span>
            )}
          </div>

          {/* Control Triggers */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Clear Selection */}
            <button
              onClick={onClear}
              id="btn-clear-bench"
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Svuota selezione"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Go check compare page */}
            {selectedAssets.length >= 2 ? (
              <button
                onClick={onGoToCompare}
                id="btn-compare-bench-submit"
                className="h-10 px-4 rounded-full bg-slate-900 text-white font-sans text-xs font-bold leading-none flex items-center space-x-2 shadow-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-350" />
              </button>
            ) : (
              <div className="h-10 px-4 rounded-full bg-slate-100 text-slate-400 font-sans text-xs font-bold leading-none flex items-center space-x-2 border border-slate-200/35 cursor-not-allowed select-none">
                <span>Select 2+</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
