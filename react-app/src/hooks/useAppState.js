import { useState } from 'react';
import { fs } from '../explorer';

export function useAppState() {
  const [selectedId, setSelectedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set([fs.rootId]));
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [activities, setActivities] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);

  const [nameDialog, setNameDialog] = useState({ isOpen: false, mode: null, targetId: null, initialValue: '' });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, targetId: null, itemName: '', descendantCount: 0, isBulk: false,
  });
  const [moveDialog, setMoveDialog] = useState({ isOpen: false, itemId: null });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchSortOrder, setSearchSortOrder] = useState('asc');
  const [searchPage, setSearchPage] = useState(1);
  const [searchResponse, setSearchResponse] = useState(null);

  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  return {
    selectedId, setSelectedId,
    expandedIds, setExpandedIds,
    selectedIds, setSelectedIds,
    errorMessage, setErrorMessage,
    toastMessage, setToastMessage,
    activities, setActivities,
    activityOpen, setActivityOpen,
    nameDialog, setNameDialog,
    confirmDialog, setConfirmDialog,
    moveDialog, setMoveDialog,
    searchQuery, setSearchQuery,
    searchFilter, setSearchFilter,
    searchSortOrder, setSearchSortOrder,
    searchPage, setSearchPage,
    searchResponse, setSearchResponse,
    draggedItemId, setDraggedItemId,
    dragOverId, setDragOverId,
  };
}
