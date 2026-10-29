import { memo, useCallback, createContext, useContext } from 'react';

export const TreeStateContext = createContext({
  selectedId: null,
  selectedIds: new Set(),
  expandedIds: new Set(),
});

const TreeNode = memo(function TreeNode({
  node,
  level = 0,
  isExpanded: isExpandedProp,
  isSelected: isSelectedProp,
  expandedIds: expandedIdsProp,
  selectedId: selectedIdProp,
  selectedIds: selectedIdsProp,
  onToggle,
  onSelect,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  console.log(`[TreeNode] Rendering: "${node.name}" (id: ${node.id}, level: ${level}, type: ${node.type})`);

  const ctx = useContext(TreeStateContext);

  const selectedId  = selectedIdProp  !== undefined ? selectedIdProp  : ctx.selectedId;
  const selectedIds = selectedIdsProp !== undefined ? selectedIdsProp : ctx.selectedIds;
  const expandedIds = expandedIdsProp !== undefined ? expandedIdsProp : ctx.expandedIds;
  const isSelected  = isSelectedProp  !== undefined ? isSelectedProp  : node.id === selectedId;
  const isExpanded  = isExpandedProp  !== undefined ? isExpandedProp  : expandedIds.has(node.id);
  const isMultiSelected = selectedIds.has(node.id);

  const isFolder    = node.type === 'folder';
  const hasChildren = isFolder && node.children && node.children.length > 0;

  const anySelection    = !!selectedId || selectedIds.size > 0;
  const hasMultiSelect  = selectedIds.size > 0;

  const isChecked    = hasMultiSelect ? isMultiSelected : isSelected;
  const highlighted  = hasMultiSelect ? isMultiSelected : isSelected;

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect(node.id, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
    },
    [node.id, onSelect]
  );

  const handleCheckboxClick = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect(node.id, { ctrlKey: true, shiftKey: false });
    },
    [node.id, onSelect]
  );

  const handleToggle = useCallback(
    (e) => { e.stopPropagation(); onToggle(node.id); },
    [node.id, onToggle]
  );
  const handleDoubleClick = useCallback(
    (e) => { e.stopPropagation(); onRename(node.id); },
    [node.id, onRename]
  );
  const handleDragStart = useCallback(
    (e) => { e.stopPropagation(); onDragStart(node.id); },
    [node.id, onDragStart]
  );
  const handleDragOver = useCallback((e) => {
    if (isFolder) { e.preventDefault(); e.stopPropagation(); onDragOver(node.id); }
  }, [isFolder, node.id, onDragOver]);
  const handleDrop = useCallback(
    (e) => { e.preventDefault(); e.stopPropagation(); onDrop(node.id); },
    [node.id, onDrop]
  );
  const handleDragEnd = useCallback(
    (e) => { e.stopPropagation(); onDragEnd(); },
    [onDragEnd]
  );

  const sortedChildren = isFolder && hasChildren
    ? [...node.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      })
    : [];

  const indentPx = level * 20 + 12;

  return (
    <div
      className="mb-0.5"
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={highlighted}
      aria-multiselectable={anySelection ? 'true' : undefined}
    >
      <div
        className={`tree-node-content relative flex cursor-pointer items-center rounded-lg py-1.5 transition-all sm:py-2 ${
          highlighted
            ? isChecked && hasMultiSelect
              ? 'selected bg-indigo-100 font-medium text-indigo-900 ring-1 ring-indigo-300'
              : 'selected bg-primary-50 font-medium text-primary-900'
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${indentPx}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        draggable={level > 0}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        {anySelection && level > 0 && (
          <button
            className={`mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              isChecked
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
            }`}
            onClick={handleCheckboxClick}
            tabIndex={-1}
            aria-label={isChecked ? `Deselect ${node.name}` : `Select ${node.name}`}
            aria-checked={isChecked}
          >
            {isChecked ? '✓' : ''}
          </button>
        )}

        {isFolder ? (
          <button
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-gray-600 transition-all hover:scale-110 hover:bg-gray-200/60 hover:text-gray-900 sm:h-6 sm:w-6"
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : '○'}
          </button>
        ) : (
          <span className="w-5 shrink-0 sm:w-6" />
        )}

        <span className="mx-1.5 shrink-0 text-base sm:mx-2 sm:text-lg" aria-hidden="true">
          {isFolder ? '📁' : '📄'}
        </span>

        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-900 sm:text-sm">
          {node.name}
        </span>
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div className="tree-node-children" role="group">
          {sortedChildren.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              onRename={onRename}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default TreeNode;
