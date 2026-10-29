export default function Toolbar({
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onBulkDelete,
  onClearSelection,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasSelection,
  canDeleteSelection,
  selectedCount,
}) {
  const btn = 'flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm';
  const isMultiMode = selectedCount > 1;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3"
      role="toolbar"
      aria-label="File operations"
    >
      <div className="flex gap-0.5 rounded-lg bg-white p-1 shadow-sm sm:gap-1">
        <button
          onClick={onNewFile}
          className={`${btn} text-gray-700 hover:bg-gray-100`}
          title="New File (Ctrl+N)"
        >
          📄 New File
        </button>
        <button
          onClick={onNewFolder}
          className={`${btn} text-gray-700 hover:bg-gray-100`}
          title="New Folder (Ctrl+Shift+N)"
        >
          📁 New Folder
        </button>
      </div>

      <div className="flex gap-0.5 rounded-lg bg-white p-1 shadow-sm sm:gap-1">
        {isMultiMode ? (
          <>
            <button
              onClick={onBulkDelete}
              className={`${btn} text-red-600 hover:bg-red-50`}
              title={`Delete ${selectedCount} selected items`}
            >
              🗑️ Delete {selectedCount} items
            </button>
            <button
              onClick={onClearSelection}
              className={`${btn} text-gray-500 hover:bg-gray-100`}
              title="Clear selection (Escape)"
            >
              ✕ Clear
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onRename}
              disabled={!hasSelection}
              className={`${btn} text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`}
              title="Rename (F2)"
            >
              ✏️ Rename
            </button>
            <button
              onClick={onDelete}
              disabled={!canDeleteSelection}
              className={`${btn} text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40`}
              title="Delete (Delete)"
            >
              🗑️ Delete
            </button>
          </>
        )}
      </div>

      {selectedCount > 0 && (
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {selectedCount} selected
        </span>
      )}

      <div className="flex gap-0.5 rounded-lg bg-white p-1 shadow-sm sm:gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`${btn} text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`${btn} text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40`}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>
    </div>
  );
}
