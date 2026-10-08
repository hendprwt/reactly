import React from 'react';
import { WifiSlash, CloudSlash, ArrowClockwise } from 'phosphor-react'; // Ganti CloudWarning -> CloudSlash

const ConnectionError = ({ type, onRetry }) => {
  const isOffline = type === 'offline';

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] w-full px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* 1. Icon Illustration */}
      <div className={`relative mb-6 flex items-center justify-center w-24 h-24 rounded-full ${isOffline ? 'bg-slate-100' : 'bg-blue-50'}`}>
        {isOffline ? (
          <WifiSlash size={48} weight="regular" className="text-slate-400" />
        ) : (
          // Gunakan CloudSlash (Awan error) yang pasti ada di semua versi
          <CloudSlash size={48} weight="regular" className="text-blue-500" />
        )}
        
        {/* Decorative Ring (Efek Radar/Pulse) */}
        <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${isOffline ? 'bg-slate-300' : 'bg-blue-400'}`}></div>
      </div>
      
      {/* 2. Typography ala Twitter */}
      <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
        {isOffline ? "No internet connection" : "Something went wrong"}
      </h3>
      
      <p className="text-slate-500 text-[15px] max-w-xs mb-8 leading-relaxed font-medium">
        {isOffline 
          ? "Check your network settings and try reloading the page." 
          : "Ideally, this wouldn't happen. Give it another shot."}
      </p>

      {/* 3. Action Button (Pill Shape) */}
      <button 
        onClick={onRetry}
        className={`
          flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 shadow-sm
          ${isOffline 
            ? 'bg-slate-900 text-white hover:bg-slate-800' 
            : 'bg-blue-500 text-white hover:bg-blue-600'}
        `}
      >
        <ArrowClockwise size={18} weight="bold" className={isOffline ? "" : "animate-spin-slow"} />
        <span>Retry</span>
      </button>

    </div>
  );
};

export default ConnectionError;