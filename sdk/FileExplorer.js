import { DEFAULT_TREE, ErrorCode, ItemType } from "./constants.js";
export { ItemType, ErrorCode } from "./constants.js";
import {
  fail,
  normalizeName,
  sameName,
  makeNode,
  collectDescendants,
  requireItem,
  requireFolder,
  assertNameFree,
} from "./utils.js";
import { Transaction } from "./Transaction.js";
import { buildInitialState } from "./treeBuilder.js";
import {
  queryGetTree,
  queryGetItem,
  queryGetChildren,
  queryGetPath,
  queryGetPathString,
  querySearch,
} from "./queries.js";

export class FileExplorer {
  #state;
  #past = [];
  #future = [];
  #listeners = new Set();
  #version = 0;
  #historyLimit;
  #idCounter = 0;
  #nodeTreeCache = new WeakMap();
  #treeCache = { state: null, tree: null };
  #silentMode = false;
  #silentLog = [];

  constructor({ initialTree = DEFAULT_TREE, historyLimit = 100 } = {}) {
    if (!Number.isInteger(historyLimit) || historyLimit < 1) {
      fail(
        ErrorCode.INVALID_ARGUMENT,
        "historyLimit must be a positive integer.",
      );
    }
    this.#historyLimit = historyLimit;
    this.#state = buildInitialState(initialTree, (items) => this.#newId(items));
  }

  get rootId() {
    return this.#state.rootId;
  }
  getVersion() {
    return this.#version;
  }

  getTree() {
    const { hit, tree } = queryGetTree(
      this.#state,
      this.#nodeTreeCache,
      this.#treeCache,
    );
    if (!hit) this.#treeCache = { state: this.#state, tree };
    return tree;
  }

  getItem(id) {
    return queryGetItem(this.#state, id);
  }
  getChildren(folderId) {
    return queryGetChildren(this.#state, folderId);
  }
  getPath(id) {
    return queryGetPath(this.#state, id);
  }
  getPathString(id) {
    return queryGetPathString(this.#state, id);
  }
  search(query, opts) {
    return querySearch(this.#state, query, opts);
  }

  createFile(parentId, name, content = "") {
    return this.#create(parentId, name, ItemType.FILE, content);
  }
  createFolder(parentId, name) {
    return this.#create(parentId, name, ItemType.FOLDER);
  }

  rename(id, newName) {
    const { items } = this.#state;
    const node = requireItem(id, items);
    const name = normalizeName(newName);
    if (name === node.name) return node;
    if (node.parentId) assertNameFree(items[node.parentId], name, items, id);
    const updated = Object.freeze({ ...node, name });
    this.#commit(
      { ...this.#state, items: { ...items, [id]: updated } },
      { type: "rename", ids: [id], from: node.name, to: name },
    );
    return updated;
  }

  move(id, newParentId) {
    const { items, rootId } = this.#state;
    const node = requireItem(id, items);
    if (id === rootId)
      fail(ErrorCode.ROOT_OPERATION, "The root folder cannot be moved.");
    const dest = requireFolder(newParentId, items);
    if (node.parentId === newParentId) return node;
    for (let cur = dest; cur; cur = cur.parentId ? items[cur.parentId] : null) {
      if (cur.id === id)
        fail(
          ErrorCode.INVALID_MOVE,
          "Cannot move a folder into itself or its own subfolder.",
        );
    }
    assertNameFree(dest, node.name, items, id);
    const oldParent = items[node.parentId];
    const moved = Object.freeze({ ...node, parentId: newParentId });
    const nextItems = {
      ...items,
      [id]: moved,
      [oldParent.id]: Object.freeze({
        ...oldParent,
        children: Object.freeze(oldParent.children.filter((c) => c !== id)),
      }),
      [dest.id]: Object.freeze({
        ...dest,
        children: Object.freeze([...dest.children, id]),
      }),
    };
    this.#commit(
      { ...this.#state, items: nextItems },
      {
        type: "move",
        ids: [id],
        fromParentId: oldParent.id,
        toParentId: dest.id,
      },
    );
    return moved;
  }

  delete(id) {
    const { items, rootId } = this.#state;
    const node = requireItem(id, items);
    if (id === rootId)
      fail(ErrorCode.ROOT_OPERATION, "The root folder cannot be deleted.");
    const deletedIds = collectDescendants(id, items);
    const removed = new Set(deletedIds);
    const nextItems = Object.fromEntries(
      Object.entries(items).filter(([k]) => !removed.has(k)),
    );
    const parent = items[node.parentId];
    nextItems[parent.id] = Object.freeze({
      ...parent,
      children: Object.freeze(parent.children.filter((c) => c !== id)),
    });
    this.#commit(
      { ...this.#state, items: nextItems },
      { type: "delete", ids: deletedIds, name: node.name, parentId: parent.id },
    );
    return { deletedIds };
  }

  undo() {
    if (!this.#past.length) return false;
    const { state, event } = this.#past.pop();
    this.#future.push({ state: this.#state, event });
    this.#state = state;
    this.#version++;
    this.#notify({ type: "undo", operation: event, ids: event.ids });
    return true;
  }

  redo() {
    if (!this.#future.length) return false;
    const { state, event } = this.#future.pop();
    this.#past.push({ state: this.#state, event });
    this.#state = state;
    this.#version++;
    this.#notify({ type: "redo", operation: event, ids: event.ids });
    return true;
  }

  canUndo() {
    return this.#past.length > 0;
  }
  canRedo() {
    return this.#future.length > 0;
  }

  beginTransaction() {
    return new Transaction(this);
  }

  getStateSnapshot() {
    return {
      state: this.#state,
      past: [...this.#past],
      future: [...this.#future],
      version: this.#version,
    };
  }

  restoreStateSnapshot(snapshot) {
    this.#state = snapshot.state;
    this.#past = snapshot.past;
    this.#future = snapshot.future;
    this.#version = snapshot.version;
    this.#silentLog = [];
  }

  setSilentMode(value) {
    this.#silentMode = value;
  }

  consolidateHistory(saved) {
    const ops = this.#silentLog;
    this.#silentLog = [];
    if (!ops.length) return;
    const ids = [...new Set(ops.flatMap((e) => e.ids ?? []))];
    const event = { type: "transaction", operations: ops, ids };
    this.#past = [...saved.past, { state: saved.state, event }];
    while (this.#past.length > this.#historyLimit) this.#past.shift();
    this.#notify(event);
  }

  subscribe(listener) {
    if (typeof listener !== "function")
      fail(ErrorCode.INVALID_ARGUMENT, "Listener must be a function.");
    this.#listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    return this.#listeners.delete(listener);
  }

  #create(parentId, rawName, type, content) {
    const { items } = this.#state;
    const parent = requireFolder(parentId, items);
    const name = normalizeName(rawName);
    assertNameFree(parent, name, items);
    const node = makeNode({
      id: this.#newId(items),
      name,
      type,
      parentId,
      content,
    });
    const nextParent = Object.freeze({
      ...parent,
      children: Object.freeze([...parent.children, node.id]),
    });
    this.#commit(
      {
        ...this.#state,
        items: { ...items, [parentId]: nextParent, [node.id]: node },
      },
      { type: "create", ids: [node.id], itemType: type, name, parentId },
    );
    return node;
  }

  #commit(nextState, event) {
    this.#past.push({ state: this.#state, event });
    if (this.#past.length > this.#historyLimit) this.#past.shift();
    this.#future = [];
    this.#state = nextState;
    this.#version++;
    if (this.#silentMode) this.#silentLog.push(event);
    else this.#notify(event);
  }

  #notify(event) {
    const frozen = Object.freeze({ ...event, version: this.#version });
    for (const listener of [...this.#listeners]) {
      try {
        listener(frozen);
      } catch (err) {
        console.error("[FileExplorer] listener threw:", err);
      }
    }
  }

  #newId(items) {
    let id;
    do {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `item_${Date.now().toString(36)}_${(++this.#idCounter).toString(36)}`;
    } while (items[id]);
    return id;
  }
}

export const createFileExplorer = (options) => new FileExplorer(options);

export default FileExplorer;
