import React, { useEffect } from 'react';
import { Warning, CheckCircle, Info, X } from 'phosphor-react';

const CustomAlert = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    // Auto close setelah 3 detik
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  let bgColor = "bg-red-500";
  let Icon = Warning;

  if (type === 'success') {
    bgColor = "bg-green-500";
    Icon = CheckCircle;
  } else if (type === 'info') {
    bgColor = "bg-blue-500";
    Icon = Info;
  }

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`${bgColor} text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 min-w-[300px] justify-between`}>
        <div className="flex items-center gap-2">
           <Icon size={24} weight="fill" />
           <span className="font-bold text-sm">{message}</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition">
           <X size={16} weight="bold"/>
        </button>
      </div>
    </div>
  );
};

export default CustomAlert;