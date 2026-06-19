import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

type ToastProps = {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, variant = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  const styles =
    variant === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800';

  const Icon = variant === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 max-w-md w-full px-4 py-3 rounded-xl border shadow-lg ${styles}`}
        role="status"
      >
        <Icon className="size-5 shrink-0" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          aria-label="Закрыть"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
