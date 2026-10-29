import { useCallback } from 'react';

export function useTreeHandlers({
  setExpandedIds,
  setSelectedId,
  setSelectedIds,
  draggedItemId,
  setDraggedItemId,
  setDragOverId,
  actions,
}) {
  const handleToggle = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [setExpandedIds]);

  const handleSelect = useCallback((id, { ctrlKey = false } = {}) => {
    if (ctrlKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      setSelectedId(id);
    } else {
      setSelectedId(id);
      setSelectedIds(new Set());
    }
  }, [setSelectedId, setSelectedIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  const handleDragStart = useCallback((itemId) => setDraggedItemId(itemId), [setDraggedItemId]);
  const handleDragOver  = useCallback((folderId) => setDragOverId(folderId), [setDragOverId]);

  const handleDrop = useCallback((targetFolderId) => {
    if (draggedItemId && targetFolderId && draggedItemId !== targetFolderId) {
      actions.move(draggedItemId, targetFolderId);
    }
    setDraggedItemId(null);
    setDragOverId(null);
  }, [draggedItemId, actions, setDraggedItemId, setDragOverId]);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDragOverId(null);
  }, [setDraggedItemId, setDragOverId]);

  const handleSelectSearchResult = useCallback((itemId, { setSearchQuery, setSearchFilter, setSearchResponse }) => {
    setSelectedId(itemId);
    setSelectedIds(new Set());
    const path = actions.getPath(itemId);
    if (path) {
      setExpandedIds(prev => { const next = new Set(prev); path.forEach(p => next.add(p.id)); return next; });
    }
    setSearchQuery('');
    setSearchFilter('all');
    setSearchResponse(null);
  }, [actions, setSelectedId, setSelectedIds, setExpandedIds]);

  const handleBreadcrumbNavigate = useCallback((itemId) => {
    setSelectedId(itemId);
    const item = actions.getItem(itemId);
    if (item && item.type === 'folder') setExpandedIds(prev => new Set([...prev, itemId]));
  }, [actions, setSelectedId, setExpandedIds]);

  return {
    handleToggle,
    handleSelect,
    handleClearSelection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSelectSearchResult,
    handleBreadcrumbNavigate,
  };
}
