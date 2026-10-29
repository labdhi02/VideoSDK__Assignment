import { ItemType, ErrorCode } from './constants.js';
import { fail, requireItem, requireFolder } from './utils.js';
import { buildTree } from './treeBuilder.js';

export function queryGetTree(state, nodeTreeCache, treeCache) {
  if (treeCache.state === state) return { hit: true, tree: treeCache.tree };
  const tree = buildTree(state.rootId, state.items, nodeTreeCache);
  return { hit: false, tree };
}

export function queryGetItem(state, id) {
  return state.items[id] ?? null;
}

export function queryGetChildren(state, folderId) {
  const folder = requireFolder(folderId, state.items);
  return folder.children.map((cid) => state.items[cid]);
}

export function queryGetPath(state, id) {
  requireItem(id, state.items);
  const path = [];
  for (let cur = state.items[id]; cur; cur = cur.parentId ? state.items[cur.parentId] : null) path.unshift(cur);
  return path;
}

export function queryGetPathString(state, id) {
  return queryGetPath(state, id).map((n) => n.name).join('/');
}

export function querySearch(
  state,
  query,
  {
    type = 'all',
    caseSensitive = false,
    sortBy = 'name',
    sortOrder = 'asc',
    page = 1,
    pageSize = 0,
  } = {}
) {
  if (typeof query !== 'string') fail(ErrorCode.INVALID_ARGUMENT, 'Search query must be a string.');

  if (!['all', ItemType.FILE, ItemType.FOLDER].includes(type)) {
    fail(ErrorCode.INVALID_ARGUMENT, 'type must be "all", "file" or "folder".');
  }
  if (!['name', 'type', 'path'].includes(sortBy)) {
    fail(ErrorCode.INVALID_ARGUMENT, 'sortBy must be "name", "type" or "path".');
  }
  if (!['asc', 'desc'].includes(sortOrder)) {
    fail(ErrorCode.INVALID_ARGUMENT, 'sortOrder must be "asc" or "desc".');
  }
  if (!Number.isInteger(page) || page < 1) {
    fail(ErrorCode.INVALID_ARGUMENT, 'page must be a positive integer.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 0) {
    fail(ErrorCode.INVALID_ARGUMENT, 'pageSize must be a non-negative integer (0 = all).');
  }

  const q = caseSensitive ? query.trim() : query.trim().toLowerCase();

  const { items, rootId } = state;
  const matched = [];

  const walk = (id, parentPath) => {
    const node = items[id];
    const path = id === rootId ? node.name : `${parentPath}/${node.name}`;
    if (id !== rootId) {
      const typeMatch = type === 'all' || node.type === type;
      if (typeMatch) {
        if (!q) {
          matched.push(Object.freeze({ ...node, path }));
        } else {
          const hay = caseSensitive ? node.name : node.name.toLowerCase();
          if (hay.includes(q)) matched.push(Object.freeze({ ...node, path }));
        }
      }
    }
    if (node.type === ItemType.FOLDER) node.children.forEach((cid) => walk(cid, path));
  };

  if (q || type !== 'all') {
    walk(rootId, '');
  }

  const dir = sortOrder === 'asc' ? 1 : -1;
  matched.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'type') {
      cmp = -a.type.localeCompare(b.type);
    } else if (sortBy === 'path') {
      cmp = a.path.localeCompare(b.path, undefined, { sensitivity: 'base' });
    }
    if (cmp === 0) cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    return cmp * dir;
  });

  const total = matched.length;
  const effectivePageSize = pageSize > 0 ? pageSize : total;
  const totalPages = effectivePageSize > 0 ? Math.ceil(total / effectivePageSize) : 1;
  const clampedPage = Math.min(Math.max(page, 1), totalPages || 1);
  const start = (clampedPage - 1) * effectivePageSize;
  const results = pageSize > 0 ? matched.slice(start, start + effectivePageSize) : matched;

  return {
    results,
    total,
    page: clampedPage,
    pageSize: effectivePageSize,
    totalPages,
  };
}
