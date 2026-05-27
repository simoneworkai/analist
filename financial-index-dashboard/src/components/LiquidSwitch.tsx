import React from 'react';
import { motion } from 'motion/react';

interface LiquidSwitchProps {
  isActive: boolean;
  onChange: (active: boolean) => void;
  labelLeft?: string;
  labelRight?: string;
}

export default function LiquidSwitch({
  isActive,
  onChange,
  labelLeft = "Lines",
  labelRight = "Candles"
}: LiquidSwitchProps) {
  return (
    <div className="flex items-center space-x-3 select-none">
      {labelLeft && (
        <span className={`text-[10px] uppercase font-extrabold tracking-wider transition-colors ${!isActive ? 'text-slate-700' : 'text-slate-400'}`}>
          {labelLeft}
        </span>
      )}

      {/* Tactile Capsule Track */}
      <div 
        onClick={() => onChange(!isActive)}
        className={`relative w-15 h-8 rounded-full border cursor-pointer p-0.5 transition-all duration-300 ${
          isActive 
            ? 'bg-slate-200 border-white/90 shadow-inner' 
            : 'bg-slate-300 border-slate-400/20 shadow-inner'
        }`}
      >
        {/* Animated slider thumb */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className={`h-6.5 w-6.5 rounded-full flex items-center justify-center transition-all ${
            isActive 
              ? 'absolute right-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,1),_0_0_4px_rgba(255,255,255,0.7)]' 
              : 'absolute left-0.5 bg-slate-500 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.3)]'
          }`}
        >
          {/* Central tiny LED reflection */}
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${
            isActive 
              ? 'bg-indigo-100' 
              : 'bg-slate-600'
          }`} />
        </motion.div>
      </div>

      {labelRight && (
        <span className={`text-[10px] uppercase font-extrabold tracking-wider transition-colors ${isActive ? 'text-slate-705' : 'text-slate-400'}`}>
          {labelRight}
        </span>
      )}
    </div>
  );
}
