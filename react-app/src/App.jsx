import { useMemo, useCallback } from 'react';
import { useFileExplorer } from './hooks/useFileExplorer';
import { useAppState } from './hooks/useAppState';
import { useEventSubscription } from './hooks/useEventSubscription';
import { useSearch } from './hooks/useSearch';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTreeHandlers } from './hooks/useTreeHandlers';
import { useDialogHandlers } from './hooks/useDialogHandlers';
import { fs } from './explorer';
import {
  ActivityPanel,
  Breadcrumb,
  ConfirmDialog,
  ErrorBanner,
  MoveDialog,
  NameDialog,
  SearchBar,
  SearchResults,
  Toast,
  Toolbar,
  TreeView,
} from './components';
import './App.css';

function App() {
  const state = useAppState();
  const { tree, canUndo, canRedo, actions } = useFileExplorer(state.setErrorMessage);

  useEventSubscription({
    selectedId: state.selectedId,
    setSelectedId: state.setSelectedId,
    setSelectedIds: state.setSelectedIds,
    setExpandedIds: state.setExpandedIds,
    setActivities: state.setActivities,
    setToastMessage: state.setToastMessage,
  });

  useSearch({
    searchQuery: state.searchQuery,
    searchFilter: state.searchFilter,
    searchSortOrder: state.searchSortOrder,
    searchPage: state.searchPage,
    setSearchPage: state.setSearchPage,
    setSearchResponse: state.setSearchResponse,
    actions,
    tree,
  });

  const handleSortChange = useCallback((order) => {
    state.setSearchSortOrder(order);
  }, [state.setSearchSortOrder]);

  const treeHandlers = useTreeHandlers({
    setExpandedIds: state.setExpandedIds,
    setSelectedId: state.setSelectedId,
    setSelectedIds: state.setSelectedIds,
    draggedItemId: state.draggedItemId,
    setDraggedItemId: state.setDraggedItemId,
    setDragOverId: state.setDragOverId,
    actions,
  });

  const dialogHandlers = useDialogHandlers({
    selectedId: state.selectedId,
    setSelectedId: state.setSelectedId,
    selectedIds: state.selectedIds,
    setSelectedIds: state.setSelectedIds,
    nameDialog: state.nameDialog,
    setNameDialog: state.setNameDialog,
    confirmDialog: state.confirmDialog,
    setConfirmDialog: state.setConfirmDialog,
    moveDialog: state.moveDialog,
    setMoveDialog: state.setMoveDialog,
    setErrorMessage: state.setErrorMessage,
    tree,
    actions,
  });

  const handleSelectSearchResult = useCallback((itemId) => {
    treeHandlers.handleSelectSearchResult(itemId, {
      setSearchQuery: state.setSearchQuery,
      setSearchFilter: state.setSearchFilter,
      setSearchResponse: state.setSearchResponse,
    });
  }, [treeHandlers.handleSelectSearchResult, state.setSearchQuery, state.setSearchFilter, state.setSearchResponse]);

  useKeyboardShortcuts({
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    actions,
    onNewFile: dialogHandlers.handleNewFile,
    onNewFolder: dialogHandlers.handleNewFolder,
    onRenameClick: dialogHandlers.handleRenameClick,
    onDeleteClick: dialogHandlers.handleDeleteClick,
    onBulkDeleteClick: dialogHandlers.handleBulkDeleteClick,
    onClearSelection: treeHandlers.handleClearSelection,
  });

  const breadcrumbPath = useMemo(() => {
    if (!state.selectedId) return null;
    return actions.getPath(state.selectedId);
  }, [state.selectedId, actions]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <header className="relative shrink-0 bg-gradient-to-r from-primary-800 to-primary-900 text-white px-4 py-3 shadow-2xl overflow-hidden sm:px-6 sm:py-4">
        <div className="absolute inset-0 header-pattern opacity-50" />
        <h1 className="relative z-10 flex items-center gap-2 text-base font-bold tracking-tight sm:text-2xl">
          📁 File Explorer
        </h1>
      </header>

      <ErrorBanner message={state.errorMessage} onDismiss={() => state.setErrorMessage('')} />

      <Toolbar
        onNewFile={dialogHandlers.handleNewFile}
        onNewFolder={dialogHandlers.handleNewFolder}
        onRename={dialogHandlers.handleRenameClick}
        onDelete={dialogHandlers.handleDeleteClick}
        onBulkDelete={dialogHandlers.handleBulkDeleteClick}
        onClearSelection={treeHandlers.handleClearSelection}
        onUndo={actions.undo}
        onRedo={actions.redo}
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={!!state.selectedId}
        canDeleteSelection={state.selectedId && state.selectedId !== fs.rootId}
        selectedCount={state.selectedIds.size}
      />

      <SearchBar
        onSearch={state.setSearchQuery}
        onFilterChange={state.setSearchFilter}
        onSortChange={handleSortChange}
        filter={state.searchFilter}
        sortOrder={state.searchSortOrder}
        externalQuery={state.searchQuery}
      />

      {breadcrumbPath && (
        <Breadcrumb path={breadcrumbPath} onNavigate={treeHandlers.handleBreadcrumbNavigate} />
      )}

      <main className="mx-2 mb-2 mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl bg-white shadow-2xl sm:mx-4 sm:mb-4 sm:mt-2 sm:rounded-2xl md:flex-row md:gap-0 md:p-0">
        <section className="min-h-0 flex-1 overflow-auto p-2 sm:p-3 app-main" aria-label="File explorer">
          {state.searchResponse !== null ? (
            <SearchResults
              results={state.searchResponse.results}
              onSelectResult={handleSelectSearchResult}
              pagination={state.searchResponse}
              onPageChange={state.setSearchPage}
              label={
                !state.searchQuery.trim() && state.searchFilter !== 'all'
                  ? `All ${state.searchFilter === 'file' ? 'files' : 'folders'} (${state.searchResponse.total})`
                  : `${state.searchResponse.total} ${state.searchResponse.total === 1 ? 'result' : 'results'}`
              }
            />
          ) : (
            <TreeView
              tree={tree}
              expandedIds={state.expandedIds}
              selectedId={state.selectedId}
              selectedIds={state.selectedIds}
              onToggle={treeHandlers.handleToggle}
              onSelect={treeHandlers.handleSelect}
              onRename={dialogHandlers.handleRenameClick}
              onDragStart={treeHandlers.handleDragStart}
              onDragOver={treeHandlers.handleDragOver}
              onDrop={treeHandlers.handleDrop}
              onDragEnd={treeHandlers.handleDragEnd}
            />
          )}
        </section>

        <div className="shrink-0 md:w-72 md:border-l md:border-gray-200 lg:w-80">
          <button
            className="flex w-full items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 md:hidden"
            onClick={() => state.setActivityOpen(o => !o)}
            aria-expanded={state.activityOpen}
            aria-controls="activity-panel"
          >
            <span>Recent activity {state.activities.length > 0 && `(${state.activities.length})`}</span>
            <span className="text-xs text-gray-400">{state.activityOpen ? '▲ Hide' : '▼ Show'}</span>
          </button>
          <div
            id="activity-panel"
            className={`overflow-hidden transition-all duration-200 md:block md:h-full ${state.activityOpen ? 'max-h-56' : 'max-h-0 md:max-h-none'}`}
          >
            <ActivityPanel activities={state.activities} onClear={() => state.setActivities([])} />
          </div>
        </div>
      </main>

      <NameDialog
        isOpen={state.nameDialog.isOpen}
        title={
          state.nameDialog.mode === 'createFile' ? 'New File' :
          state.nameDialog.mode === 'createFolder' ? 'New Folder' : 'Rename'
        }
        initialValue={state.nameDialog.initialValue}
        onConfirm={dialogHandlers.handleNameDialogConfirm}
        onCancel={dialogHandlers.handleNameDialogCancel}
      />

      <ConfirmDialog
        isOpen={state.confirmDialog.isOpen}
        title={state.confirmDialog.isBulk ? 'Confirm Bulk Delete' : 'Confirm Delete'}
        message={
          state.confirmDialog.isBulk
            ? `Are you sure you want to delete ${state.confirmDialog.itemName}? This action cannot be undone in parts.`
            : state.confirmDialog.descendantCount > 0
              ? `Are you sure you want to delete "${state.confirmDialog.itemName}"? This will also delete ${state.confirmDialog.descendantCount} nested item${state.confirmDialog.descendantCount === 1 ? '' : 's'}.`
              : `Are you sure you want to delete "${state.confirmDialog.itemName}"?`
        }
        onConfirm={dialogHandlers.handleConfirmDelete}
        onCancel={dialogHandlers.handleConfirmDialogCancel}
      />

      <MoveDialog
        isOpen={state.moveDialog.isOpen}
        tree={tree}
        currentItemId={state.moveDialog.itemId}
        onConfirm={dialogHandlers.handleMoveDialogConfirm}
        onCancel={dialogHandlers.handleMoveDialogCancel}
      />

      <Toast message={state.toastMessage} onDismiss={() => state.setToastMessage('')} />
    </div>
  );
}

export default App;
