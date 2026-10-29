export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mx-4 mt-4 flex items-center gap-3 text-red-700 animate-slide-down shadow-sm" role="alert">
      <span className="text-2xl leading-none">⚠️</span>
      <span className="flex-1 font-medium text-sm">{message}</span>
      <button 
        className="p-1 w-8 h-8 flex items-center justify-center rounded hover:bg-red-100 transition-colors text-red-600 text-xl"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
