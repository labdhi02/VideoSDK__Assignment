import { useEffect, useState } from 'react';

export default function MoveDialog({
  isOpen,
  tree,
  currentItemId,
  onConfirm,
  onCancel,
}) {
  const [selectedFolderId, setSelectedFolderId] = useState(tree.id);

  useEffect(() => {
    if (isOpen) setSelectedFolderId(tree.id);
  }, [isOpen, tree.id]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  const collectValidFolders = (node, invalidIds) => {
    const folders = [];
    const walk = (n, depth = 0) => {
      if (n.type === 'folder' && !invalidIds.has(n.id)) {
        folders.push({ id: n.id, name: n.name, depth });
        if (n.children) {
          n.children
            .filter(child => child.type === 'folder')
            .forEach(child => walk(child, depth + 1));
        }
      }
    };
    walk(node);
    return folders;
  };

  const getDescendantIds = (node, targetId) => {
    const ids = new Set();
    const walk = (n) => {
      if (n.id === targetId) {
        const collect = (x) => { ids.add(x.id); if (x.children) x.children.forEach(collect); };
        collect(n);
        return true;
      }
      if (n.children) { for (const child of n.children) { if (walk(child)) return true; } }
      return false;
    };
    walk(node);
    return ids;
  };

  const invalidIds = currentItemId ? getDescendantIds(tree, currentItemId) : new Set();
  const validFolders = collectValidFolders(tree, invalidIds);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFolderId) onConfirm(selectedFolderId);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-scale-in sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold text-gray-900 sm:mb-6 sm:text-2xl">Move to…</h2>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 sm:gap-6">
          <div className="folder-list max-h-48 overflow-y-auto rounded-lg border-2 border-gray-200 bg-gray-50 p-1.5 sm:max-h-64">
            {validFolders.map((folder) => (
              <label
                key={folder.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-all hover:bg-white sm:p-3"
              >
                <input
                  type="radio"
                  name="folder"
                  value={folder.id}
                  checked={selectedFolderId === folder.id}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="h-4 w-4 cursor-pointer accent-primary-600 sm:h-[18px] sm:w-[18px]"
                />
                <span
                  className="text-sm font-medium text-gray-700"
                  style={{ paddingLeft: `${folder.depth * 16}px` }}
                >
                  📁 {folder.name}
                </span>
              </label>
            ))}
          </div>

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
              className="w-full rounded-lg bg-gradient-to-r from-primary-800 to-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:px-6 sm:py-3"
            >
              Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
