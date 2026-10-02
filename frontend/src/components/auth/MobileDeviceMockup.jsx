import React from 'react';
import { Wifi, Signal, BatteryMedium } from 'lucide-react';

export const MobileDeviceMockup = ({ children }) => {
  return (
    <div className="relative mx-auto my-4 transition-all duration-300">
      {/* Smartphone Outer Chassis with subtle metallic rim */}
      <div className="relative w-[360px] sm:w-[390px] rounded-[48px] bg-slate-900 p-3.5 shadow-2xl ring-1 ring-slate-800 shadow-slate-900/30">
        {/* Left Side Volume Rockers */}
        <div className="absolute -left-[3px] top-28 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[3px] top-44 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        {/* Right Side Power Button */}
        <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-slate-700 rounded-r-sm" />

        {/* Inner Screen Display */}
        <div className="relative w-full rounded-[40px] bg-white dark:bg-slate-900 overflow-hidden border border-slate-900 flex flex-col max-h-[820px] overflow-y-auto no-scrollbar">
          {/* Top Status Bar (Matching Image 1: 10:37, holepunch, icons) */}
          <div className="sticky top-0 z-30 w-full bg-inherit backdrop-blur-md px-5 pt-2.5 pb-1 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 select-none">
            {/* Left Hole punch camera & clock */}
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 ring-2 ring-slate-800/40 shrink-0" />
              <span className="font-mono text-xs font-bold pl-1">10:37</span>
            </div>

            {/* Right Status indicators */}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="text-[10px] font-mono font-medium">VoLTE</span>
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold">39%</span>
                <BatteryMedium className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Children app contents */}
          <div className="flex-1 w-full">{children}</div>

          {/* Bottom Android / iOS Home Indicator Pill */}
          <div className="sticky bottom-0 z-30 w-full py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex justify-center">
            <div className="w-32 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
};
