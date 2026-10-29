import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { fs } from '../explorer.js';
import { FileExplorerError } from '../../../sdk/index.js';

export function useFileExplorer(onError) {
  const tree = useSyncExternalStore(
    fs.subscribe.bind(fs),
    () => fs.getTree()
  );

  const version = useSyncExternalStore(
    fs.subscribe.bind(fs),
    () => fs.getVersion()
  );

  const canUndo = useMemo(() => fs.canUndo(), [version]);
  const canRedo = useMemo(() => fs.canRedo(), [version]);

  const createAction = useCallback((fn, actionName) => {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        if (error instanceof FileExplorerError) {
          onError?.(error.message);
        } else {
          onError?.(`An unexpected error occurred: ${error.message}`);
          console.error(`[${actionName}]`, error);
        }
        return null;
      }
    };
  }, [onError]);

  const actions = useMemo(() => ({
    createFile: createAction(
      (parentId, name, content) => fs.createFile(parentId, name, content),
      'createFile'
    ),
    createFolder: createAction(
      (parentId, name) => fs.createFolder(parentId, name),
      'createFolder'
    ),
    rename: createAction(
      (id, newName) => fs.rename(id, newName),
      'rename'
    ),
    move: createAction(
      (id, newParentId) => fs.move(id, newParentId),
      'move'
    ),
    delete: createAction(
      (id) => fs.delete(id),
      'delete'
    ),
    undo: createAction(
      () => fs.undo(),
      'undo'
    ),
    redo: createAction(
      () => fs.redo(),
      'redo'
    ),
    search: createAction(
      (query, options) => fs.search(query, options),
      'search'
    ),
    getItem: (id) => fs.getItem(id),
    getPathString: (id) => fs.getPathString(id),
    getPath: (id) => fs.getPath(id),
  }), [createAction]);

  return {
    tree,
    canUndo,
    canRedo,
    rootId: fs.rootId,
    actions,
  };
}
