import React from 'react';
import { Volume2, ShieldCheck, Download, Smartphone } from 'lucide-react';

interface HeaderProps {
  onOpenExportModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isEngineActive: boolean;
  onToggleEngine: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenExportModal,
  activeTab,
  setActiveTab,
  isEngineActive,
  onToggleEngine,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Volume2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            DynamicVolume
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-400 border border-slate-800 rounded-md px-2 py-0.5">
            Android 15
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line nav tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/60 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('meter')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'meter'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Acoustic Telemetry
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'demo'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            A/B Sound Lab
          </button>
          <button
            onClick={() => setActiveTab('mixer')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'mixer'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stream Mixer
          </button>
          <button
            onClick={() => setActiveTab('curves')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'curves'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Curve Tuning
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sensors'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sensors & Pocket
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleEngine}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap shrink-0 ${
              isEngineActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle active volume regulation"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isEngineActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{isEngineActive ? 'Auto Active' : 'Auto Paused'}</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-sm shadow-cyan-500/10"
          >
            <Smartphone className="h-4 w-4" />
            <span>Android Setup & Code</span>
          </button>
        </div>
      </div>
    </header>
  );
};
