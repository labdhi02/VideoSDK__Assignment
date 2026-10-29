import { useCallback } from 'react';
import { fs } from '../explorer';

export function useDialogHandlers({
  selectedId,
  setSelectedId,
  selectedIds,
  setSelectedIds,
  nameDialog,
  setNameDialog,
  confirmDialog,
  setConfirmDialog,
  moveDialog,
  setMoveDialog,
  setErrorMessage,
  tree,
  actions,
}) {
  const getTargetFolder = useCallback(() => {
    if (!selectedId) return fs.rootId;
    const item = actions.getItem(selectedId);
    if (!item) return fs.rootId;
    return item.type === 'folder' ? item.id : item.parentId;
  }, [selectedId, actions]);

  const handleNewFile = useCallback(() => {
    setNameDialog({ isOpen: true, mode: 'createFile', targetId: getTargetFolder(), initialValue: '' });
  }, [getTargetFolder, setNameDialog]);

  const handleNewFolder = useCallback(() => {
    setNameDialog({ isOpen: true, mode: 'createFolder', targetId: getTargetFolder(), initialValue: '' });
  }, [getTargetFolder, setNameDialog]);

  const handleRenameClick = useCallback(() => {
    if (!selectedId) return;
    const item = actions.getItem(selectedId);
    if (!item) return;
    setNameDialog({ isOpen: true, mode: 'rename', targetId: selectedId, initialValue: item.name });
  }, [selectedId, actions, setNameDialog]);

  const handleNameDialogConfirm = useCallback((name) => {
    const { mode, targetId } = nameDialog;
    switch (mode) {
      case 'createFile':   actions.createFile(targetId, name, ''); break;
      case 'createFolder': actions.createFolder(targetId, name);   break;
      case 'rename':       actions.rename(targetId, name);         break;
    }
    setNameDialog({ isOpen: false, mode: null, targetId: null, initialValue: '' });
  }, [nameDialog, actions, setNameDialog]);

  const handleNameDialogCancel = useCallback(() => {
    setNameDialog({ isOpen: false, mode: null, targetId: null, initialValue: '' });
  }, [setNameDialog]);

  const handleDeleteClick = useCallback(() => {
    if (!selectedId || selectedId === fs.rootId) return;
    const item = actions.getItem(selectedId);
    if (!item) return;

    let descendantCount = 0;
    if (item.type === 'folder') {
      const countDesc = (node) => {
        let c = 0;
        if (node.children) { c = node.children.length; node.children.forEach(ch => { if (ch.type === 'folder') c += countDesc(ch); }); }
        return c;
      };
      const findNode = (root, tid) => {
        if (root.id === tid) return root;
        if (root.children) { for (const ch of root.children) { const f = findNode(ch, tid); if (f) return f; } }
        return null;
      };
      const treeNode = findNode(tree, selectedId);
      if (treeNode) descendantCount = countDesc(treeNode);
    }

    setConfirmDialog({ isOpen: true, targetId: selectedId, itemName: item.name, descendantCount, isBulk: false });
  }, [selectedId, tree, actions, setConfirmDialog]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (selectedIds.has(fs.rootId)) {
      setErrorMessage('The root folder cannot be deleted.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      targetId: null,
      itemName: `${selectedIds.size} selected items`,
      descendantCount: 0,
      isBulk: true,
    });
  }, [selectedIds, setConfirmDialog, setErrorMessage]);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDialog.isBulk) {
      const tx = fs.beginTransaction();
      [...selectedIds].forEach(id => tx.delete(id));
      const result = tx.commit();
      if (!result.success) setErrorMessage(result.error?.message ?? 'Bulk delete failed.');
      setSelectedIds(new Set());
      setSelectedId(null);
    } else {
      if (confirmDialog.targetId) actions.delete(confirmDialog.targetId);
    }
    setConfirmDialog({ isOpen: false, targetId: null, itemName: '', descendantCount: 0, isBulk: false });
  }, [confirmDialog, selectedIds, actions, setSelectedIds, setSelectedId, setConfirmDialog, setErrorMessage]);

  const handleConfirmDialogCancel = useCallback(() => {
    setConfirmDialog({ isOpen: false, targetId: null, itemName: '', descendantCount: 0, isBulk: false });
  }, [setConfirmDialog]);

  const handleMoveDialogConfirm = useCallback((targetFolderId) => {
    if (moveDialog.itemId) actions.move(moveDialog.itemId, targetFolderId);
    setMoveDialog({ isOpen: false, itemId: null });
  }, [moveDialog.itemId, actions, setMoveDialog]);

  const handleMoveDialogCancel = useCallback(() => {
    setMoveDialog({ isOpen: false, itemId: null });
  }, [setMoveDialog]);

  return {
    handleNewFile,
    handleNewFolder,
    handleRenameClick,
    handleNameDialogConfirm,
    handleNameDialogCancel,
    handleDeleteClick,
    handleBulkDeleteClick,
    handleConfirmDelete,
    handleConfirmDialogCancel,
    handleMoveDialogConfirm,
    handleMoveDialogCancel,
  };
}
