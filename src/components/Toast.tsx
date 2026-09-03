import React, { useEffect } from 'react';
import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'success',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-slate-300 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
  };

  return (
    <div
      role="alert"
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#0E1612]/95 backdrop-blur-xl shadow-xl transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs text-white"
    >
      {icons[type]}
      <p className="font-medium tracking-tight pr-2">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="ml-auto text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.08]"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
