import { useEffect } from 'react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">{title}</h2>
        <p className="mb-6 leading-relaxed text-gray-600">{message}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:border-primary-600 hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
