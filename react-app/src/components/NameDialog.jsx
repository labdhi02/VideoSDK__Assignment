import { useState, useEffect, useRef } from 'react';

export default function NameDialog({
  isOpen,
  title,
  initialValue = '',
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialValue]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) onConfirm(value.trim());
  };

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter name..."
            className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-primary-600 focus:ring-4 focus:ring-primary-100 sm:py-3"
            autoFocus
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:border-primary-600 hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-primary-800 to-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
