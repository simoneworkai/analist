import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, LineChart, Layers2, Bookmark, Sliders, LayoutGrid } from 'lucide-react';
import { SidebarTab } from '../types';

interface SidebarProps {
  currentTab: SidebarTab;
  onChangeTab: (tab: SidebarTab) => void;
  favoritesCount: number;
  comparisonCount: number;
}

interface SidebarItem {
  id: SidebarTab;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export default function Sidebar({
  currentTab,
  onChangeTab,
  favoritesCount,
  comparisonCount,
}: SidebarProps) {
  const items: SidebarItem[] = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'markets', label: 'Markets & Assets', icon: LineChart },
    { 
      id: 'compare', 
      label: 'Compare Assets', 
      icon: Layers2,
      badge: comparisonCount > 0 ? comparisonCount : undefined
    },
    { 
      id: 'watchlist', 
      label: 'Watchlist', 
      icon: Bookmark,
      badge: favoritesCount > 0 ? favoritesCount : undefined 
    },
    { id: 'settings', label: 'Configurations', icon: Sliders },
  ];

  return (
    <>
      {/* Desktop Left Fixed Sidebar */}
      <aside 
        id="desktop-sidebar"
        className="hidden md:flex flex-col items-center justify-between w-20 xl:w-24 fixed left-5 top-5 bottom-5 py-8 z-40 bg-white/70 border border-white/90 rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white relative shadow-lg cursor-pointer overflow-hidden border border-white/20"
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.4 }}
            onClick={() => onChangeTab('home')}
            aria-label="Liquid Equinox Logo Home"
          >
            {/* Visual gradient orb replaced with sleek cool slate */}
            <div className="absolute inset-0 bg-slate-800 opacity-90 transition-all duration-300" />
            
            {/* Outline visual calendar/grid inside */}
            <LayoutGrid className="w-5 h-5 text-white z-10 relative drop-shadow" strokeWidth={2} />
          </motion.div>
          <div className="w-1 h-1 bg-slate-400 rounded-full mt-3" />
        </div>

        {/* Action Items List */}
        <nav className="flex flex-col space-y-6 xl:space-y-8 my-auto">
          {items.map((item) => {
            const isActive = currentTab === item.id;
            const IconComponent = item.icon;

            return (
              <div key={item.id} className="relative group flex justify-center">
                <button
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  aria-label={item.label}
                  className={`w-11 h-11 xl:w-12 xl:h-12 rounded-2xl flex items-center justify-center relative transition-all duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  {/* Floating active pill behind icon */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-background"
                      className="absolute inset-0 bg-slate-900 rounded-2xl shadow-active z-0 border border-white/10"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}

                  <span className="relative z-10">
                    <IconComponent className="w-5 h-5 xl:w-5.5 xl:h-5.5" strokeWidth={1.75} />
                  </span>

                  {/* Badge */}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/40 backdrop-blur-md text-slate-800 font-mono text-[10px] font-black flex items-center justify-center border border-white/70 shadow-sm z-20">
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* macOS Style Sliding Tooltip */}
                <span className="absolute left-16 top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-800 bg-white shadow-lg pointer-events-none opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-50 border border-slate-100/80 backdrop-blur-md">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Footer profile icon */}
        <div className="flex flex-col items-center">
          <motion.div
            className="w-10 h-10 rounded-full border border-slate-200/60 shadow-sm overflow-hidden cursor-pointer relative hover:ring-2 hover:ring-blue-500/20 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* High end abstract developer icon */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-250 bg-slate-200 flex items-center justify-center">
              <span className="font-sans text-xs font-bold text-slate-700">SI</span>
            </div>
          </motion.div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Dynamic layout) */}
      <nav 
        id="mobile-navigation"
        className="md:hidden fixed bottom-5 left-4 right-4 h-16 rounded-2xl z-40 glass-panel shadow-2xl flex items-center justify-around px-2 border border-white/80"
      >
        {items.map((item) => {
          const isActive = currentTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              id={`mobile-tab-${item.id}`}
              onClick={() => onChangeTab(item.id)}
              aria-label={item.label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all duration-300 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-mobile-nav-background"
                  className="absolute inset-0 bg-slate-900 rounded-xl z-0"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">
                <IconComponent className="w-5 h-5" strokeWidth={2} />
              </span>
              
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-white/40 backdrop-blur-md text-slate-800 font-mono text-[9px] font-black flex items-center justify-center border border-white/70 shadow-sm z-20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
