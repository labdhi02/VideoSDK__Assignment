import { useEffect } from 'react';
import { fs } from '../explorer';
import { ACTION_LABELS } from '../constants/styles';

export function useEventSubscription({
  selectedId,
  setSelectedId,
  setSelectedIds,
  setExpandedIds,
  setActivities,
  setToastMessage,
}) {
  useEffect(() => {
    const handleEvent = (event) => {
      let message = '';
      const sourceEvent = event.type === 'undo' || event.type === 'redo'
        ? event.operation
        : event;
      const actionLabel = ACTION_LABELS[sourceEvent.type];
      const item = sourceEvent.ids?.[0] ? fs.getItem(sourceEvent.ids[0]) : null;
      const itemName = sourceEvent.name || item?.name || 'item';
      let activityMessage = '';

      if (sourceEvent.type === 'create') {
        activityMessage = `${actionLabel} ${sourceEvent.itemType}: ${sourceEvent.name}`;
      } else if (sourceEvent.type === 'rename') {
        activityMessage = `Renamed "${sourceEvent.from}" to "${sourceEvent.to}"`;
      } else if (sourceEvent.type === 'move') {
        activityMessage = `Moved ${itemName}`;
      } else if (sourceEvent.type === 'delete') {
        activityMessage = `Deleted ${sourceEvent.name}`;
      } else if (sourceEvent.type === 'transaction') {
        activityMessage = `Bulk deleted ${sourceEvent.ids?.length ?? ''} items`;
      }

      if (activityMessage) {
        const prefix = event.type === 'undo' ? 'Undid' : event.type === 'redo' ? 'Redid' : null;
        if (prefix) activityMessage = `${prefix}: ${activityMessage}`;

        setActivities((current) => [
          { id: event.version, type: event.type, message: activityMessage, timestamp: new Date().toISOString() },
          ...current,
        ].slice(0, 40));
      }

      switch (event.type) {
        case 'create':
          message = `Created ${event.name}`;
          if (event.parentId) setExpandedIds(prev => new Set([...prev, event.parentId]));
          break;
        case 'rename':
          message = `Renamed "${event.from}" to "${event.to}"`;
          break;
        case 'move':
          message = `Moved ${itemName}`;
          setExpandedIds(prev => new Set([...prev, event.toParentId]));
          break;
        case 'delete':
        case 'transaction':
          message = event.type === 'transaction'
            ? `Deleted ${event.ids?.length ?? ''} items`
            : `Deleted ${event.name}`;
          if (event.ids?.includes(selectedId)) setSelectedId(null);
          setSelectedIds(prev => {
            if (!prev.size) return prev;
            const deletedSet = new Set(event.ids ?? []);
            const next = new Set([...prev].filter(id => !deletedSet.has(id)));
            return next.size === prev.size ? prev : next;
          });
          break;
        case 'undo':
          message = `Undid ${event.operation.type}`;
          break;
        case 'redo':
          message = `Redid ${event.operation.type}`;
          break;
      }

      if (message) setToastMessage(message);
    };

    const unsubscribe = fs.subscribe(handleEvent);
    return unsubscribe;
  }, [selectedId]);
}
