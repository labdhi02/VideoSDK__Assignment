import { useEffect } from 'react';
import { fs } from '../explorer';

export function useKeyboardShortcuts({
  selectedId,
  selectedIds,
  actions,
  onNewFile,
  onNewFolder,
  onRenameClick,
  onDeleteClick,
  onBulkDeleteClick,
  onClearSelection,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); actions.undo();
      } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault(); actions.redo();
      } else if (e.key === 'F2' && selectedId) {
        e.preventDefault(); onRenameClick();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedIds.size > 1) {
          onBulkDeleteClick();
        } else if (selectedId && selectedId !== fs.rootId) {
          onDeleteClick();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault(); onNewFile();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault(); onNewFolder();
      } else if (e.key === 'Escape' && selectedIds.size > 0) {
        e.preventDefault(); onClearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedIds, actions, onNewFile, onNewFolder, onRenameClick, onDeleteClick, onBulkDeleteClick, onClearSelection]);
}
