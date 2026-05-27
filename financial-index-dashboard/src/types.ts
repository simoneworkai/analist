export interface IndexAsset {
  id: string;
  name: string;
  ticker: string;
  category: 'us' | 'europe' | 'asia' | 'global' | 'sectors' | 'volatility' | 'crypto';
  value: number;
  change: number; // percentage, e.g., 1.24 for +1.24% or -0.45 for -0.45%
  high: number;
  low: number;
  volume: string;
  sparkline: number[]; // Array of 12-15 data points for micro graphs
  color: {
    bg: string;       // Tailwind bg class like 'bg-blue-50/40' or 'bg-purple-50/40'
    text: string;     // Tailwind text class like 'text-blue-600'
    glow: string;     // Color code for radial gradient like 'rgba(59, 130, 246, 0.15)'
    border: string;   // Tailwind border class like 'border-blue-200/50'
    accent: string;   // Accent base class like 'blue'
  };
  description: string;
  subcategories?: string[];
}

export type SidebarTab = 'home' | 'markets' | 'compare' | 'watchlist' | 'settings';

export interface ComparisonState {
  selectedAssetIds: string[];
  isOpen: boolean;
}
