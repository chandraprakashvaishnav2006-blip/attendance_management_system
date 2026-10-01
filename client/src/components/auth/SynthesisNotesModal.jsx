import React from 'react';
import { X, Check, Sparkles, Layers, ShieldCheck, Smartphone } from 'lucide-react';

export const SynthesisNotesModal = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <Layers className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Design Synthesis Architecture</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          How the 2 UIs Were Merged into One
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          A harmonized login system combining the friendly student-first character charm of UI 1 with the structured multi-role enterprise security of UI 2.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* UI 1 Breakdown */}
          <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/30 space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-xs text-sky-900 dark:text-sky-200 uppercase tracking-wide">
                Elements From UI 1 (Mobile App)
              </h3>
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pl-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span><strong>PASSWORD vs OTP</strong> dual authentication toggle bar.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Schoolboy Mascot Hero</strong>: Top curved sky-blue arch with energetic 3D student character.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Input Styling</strong>: Icon-prefixed fields with interactive show/hide password eye.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <span><strong>Footer Version</strong>: "v2.0.2" app build release tag.</span>
              </li>
            </ul>
          </div>

          {/* UI 2 Breakdown */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
                Elements From UI 2 (EduTrack Pro)
              </h3>
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pl-1">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Role Switcher</strong>: Segmented [Admin], [Student], [Parent] tabs.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Contextual Role Banner</strong>: Specific portal permissions & descriptions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Quick Fill Demo Logins</strong>: 1-click test fill chips with instant role switching.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Enterprise Identity</strong>: EduTrack Pro branding & clean elevated surface typography.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Try the Interactive Features</p>
              <p className="text-[11px] text-slate-300">Switch roles, try OTP mode with 6-digit verification, or test the Mobile App view.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ml-3"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
