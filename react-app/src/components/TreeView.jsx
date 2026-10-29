import { useMemo } from 'react';
import PropTypes from 'prop-types';
import TreeNode, { TreeStateContext } from './TreeNode';

export default function TreeView({
  tree,
  expandedIds,
  selectedId,
  selectedIds,
  onToggle,
  onSelect,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const ctxValue = useMemo(
    () => ({ selectedId, selectedIds, expandedIds }),
    [selectedId, selectedIds, expandedIds]
  );

  return (
    <TreeStateContext.Provider value={ctxValue}>
      <div className="select-none p-2" role="tree" aria-label="File tree" aria-multiselectable={selectedIds.size > 0 ? 'true' : undefined}>
        <TreeNode
          node={tree}
          level={0}
          onToggle={onToggle}
          onSelect={onSelect}
          onRename={onRename}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
        />
      </div>
    </TreeStateContext.Provider>
  );
}

TreeView.propTypes = {
  tree:        PropTypes.object.isRequired,
  expandedIds: PropTypes.instanceOf(Set).isRequired,
  selectedId:  PropTypes.string,
  selectedIds: PropTypes.instanceOf(Set),
  onToggle:    PropTypes.func.isRequired,
  onSelect:    PropTypes.func.isRequired,
  onRename:    PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDragOver:  PropTypes.func.isRequired,
  onDrop:      PropTypes.func.isRequired,
  onDragEnd:   PropTypes.func.isRequired,
};

TreeView.defaultProps = {
  selectedId:  null,
  selectedIds: new Set(),
};
