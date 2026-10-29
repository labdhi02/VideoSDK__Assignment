import { ItemType } from './constants.js';
import { fail } from './utils.js';
import { ErrorCode } from './constants.js';
import { normalizeName, makeNode } from './utils.js';

export function buildTree(id, items, cache) {
  const node = items[id];

  if (node.type === ItemType.FILE) {
    const cached = cache.get(node);
    if (cached) return cached;
    const leaf = Object.freeze({ id: node.id, name: node.name, type: node.type, parentId: node.parentId });
    cache.set(node, leaf);
    return leaf;
  }

  const childTrees = node.children.map((cid) => buildTree(cid, items, cache));
  const cached = cache.get(node);
  if (
    cached &&
    cached.children.length === childTrees.length &&
    cached.children.every((c, i) => c === childTrees[i])
  ) {
    return cached;
  }

  const folder = Object.freeze({
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: node.parentId,
    children: Object.freeze(childTrees),
  });
  cache.set(node, folder);
  return folder;
}


export function buildInitialState(tree, newId) {
  if (!tree || typeof tree !== 'object' || tree.type !== ItemType.FOLDER) {
    fail(ErrorCode.INVALID_ARGUMENT, 'initialTree must be a folder node.');
  }

  const items = {};

  const visit = (src, parentId) => {
    const name = normalizeName(src.name);
    if (src.type !== ItemType.FILE && src.type !== ItemType.FOLDER) {
      fail(ErrorCode.INVALID_ARGUMENT, `Unknown item type "${src.type}".`);
    }

    const id = src.id ?? newId(items);
    if (items[id]) fail(ErrorCode.INVALID_ARGUMENT, `Duplicate id "${id}" in initialTree.`);

    items[id] = null;

    let childIds;
    if (src.type === ItemType.FOLDER) {
      const seen = new Set();
      childIds = (src.children ?? []).map((child) => {
        const cn = normalizeName(child.name).toLowerCase();
        if (seen.has(cn)) fail(ErrorCode.DUPLICATE_NAME, `Duplicate name "${child.name}" in "${name}".`);
        seen.add(cn);
        return visit(child, id);
      });
    }

    const node = makeNode({ id, name, type: src.type, parentId, content: src.content });
    items[id] = childIds ? Object.freeze({ ...node, children: Object.freeze(childIds) }) : node;
    return id;
  };

  const rootId = visit(tree, null);
  return { rootId, items };
}
