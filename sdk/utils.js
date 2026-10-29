import { FileExplorerError } from './errors.js';
import { ErrorCode, ItemType } from './constants.js';

const INVALID_NAME_CHARS = /[\\/]/;
const MAX_NAME_LENGTH = 255;

export function fail(code, message) {
  throw new FileExplorerError(code, message);
}

export function normalizeName(name) {
  if (typeof name !== 'string') fail(ErrorCode.INVALID_NAME, 'Name must be a string.');
  const trimmed = name.trim();
  if (!trimmed) fail(ErrorCode.INVALID_NAME, 'Name cannot be empty.');
  if (trimmed === '.' || trimmed === '..') fail(ErrorCode.INVALID_NAME, `"${trimmed}" is not a valid name.`);
  if (trimmed.length > MAX_NAME_LENGTH) fail(ErrorCode.INVALID_NAME, `Name cannot exceed ${MAX_NAME_LENGTH} characters.`);
  if (INVALID_NAME_CHARS.test(trimmed)) fail(ErrorCode.INVALID_NAME, 'Name cannot contain "/" or "\\".');
  return trimmed;
}

export const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function makeNode({ id, name, type, parentId, content }) {
  const node = { id, name, type, parentId };
  if (type === ItemType.FOLDER) node.children = Object.freeze([]);
  else node.content = content ?? '';
  return Object.freeze(node);
}


export function collectDescendants(rootId, items) {
  const ids = [];
  const walk = (id) => {
    ids.push(id);
    const node = items[id];
    if (node.type === ItemType.FOLDER) node.children.forEach(walk);
  };
  walk(rootId);
  return ids;
}

export function requireItem(id, items) {
  const node = items[id];
  if (!node) fail(ErrorCode.NOT_FOUND, `Item "${id}" was not found.`);
  return node;
}

export function requireFolder(id, items) {
  const node = requireItem(id, items);
  if (node.type !== ItemType.FOLDER) fail(ErrorCode.NOT_A_FOLDER, `"${node.name}" is not a folder.`);
  return node;
}

export function assertNameFree(folder, name, items, ignoreId = null) {
  const clash = folder.children.some((cid) => cid !== ignoreId && sameName(items[cid].name, name));
  if (clash) fail(ErrorCode.DUPLICATE_NAME, `"${name}" already exists in "${folder.name}".`);
}
