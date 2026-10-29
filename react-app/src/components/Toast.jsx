import { useEffect } from 'react';

export default function Toast({ message, onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-gradient-to-r from-primary-800 to-primary-700 px-4 py-3 font-medium text-white shadow-2xl backdrop-blur-sm animate-slide-up sm:bottom-6 sm:right-6 sm:max-w-md sm:px-6 sm:py-4">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm">
        ✓
      </div>
      <span className="text-sm sm:text-base">{message}</span>
    </div>
  );
}
