import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", cancelText = "Cancel", isDanger = false }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white w-full max-w-xs sm:max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 relative z-10">
        <div className="p-6 text-center">
          <h3 className="text-lg font-black text-slate-900 mb-2">
            {title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col border-t border-slate-100">
          <button 
            onClick={onConfirm}
            className={`w-full py-3.5 text-sm font-bold active:bg-slate-50 transition-colors ${isDanger ? 'text-red-600' : 'text-blue-600'}`}
          >
            {confirmText}
          </button>
          <div className="border-t border-slate-100"></div>
          <button 
            onClick={onClose}
            className="w-full py-3.5 text-sm font-medium text-slate-900 active:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;