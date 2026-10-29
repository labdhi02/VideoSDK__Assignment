import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileExplorer, FileExplorerError, ErrorCode, ItemType } from './index.js';

// ---------------------------------------------------------------------------
// Helper: create a fresh FileExplorer with an empty root for every test group
// ---------------------------------------------------------------------------
function freshExplorer(opts) {
  const fe = new FileExplorer({
    initialTree: { id: 'root', name: 'My Files', type: ItemType.FOLDER, children: [] },
    ...opts,
  });
  return fe;
}

// ===========================================================================
// 1. Creating, renaming, moving, and deleting files and folders
// ===========================================================================
describe('1. CRUD — create, rename, move, delete', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('creates a file with correct properties', () => {
    const file = fs.createFile(fs.rootId, 'hello.txt', 'Hello World');
    expect(file).toBeDefined();
    expect(file.name).toBe('hello.txt');
    expect(file.type).toBe(ItemType.FILE);
    expect(file.content).toBe('Hello World');
    expect(file.parentId).toBe(fs.rootId);
    expect(fs.getItem(file.id)).toEqual(file);
  });

  it('creates a folder with correct properties', () => {
    const folder = fs.createFolder(fs.rootId, 'Docs');
    expect(folder.name).toBe('Docs');
    expect(folder.type).toBe(ItemType.FOLDER);
    expect(folder.children).toEqual([]);
    expect(folder.parentId).toBe(fs.rootId);
  });

  it('creates nested files and folders', () => {
    const f1 = fs.createFolder(fs.rootId, 'Folder1');
    const f2 = fs.createFolder(f1.id, 'Folder2');
    const file = fs.createFile(f2.id, 'nested.txt');
    expect(file.parentId).toBe(f2.id);
    const path = fs.getPath(file.id);
    expect(path).toHaveLength(4); // root → f1 → f2 → file
    expect(path[3].name).toBe('nested.txt');
  });

  it('renames a file', () => {
    const file = fs.createFile(fs.rootId, 'old.txt');
    const renamed = fs.rename(file.id, 'new.txt');
    expect(renamed.name).toBe('new.txt');
    expect(renamed.id).toBe(file.id);
    expect(fs.getItem(file.id).name).toBe('new.txt');
  });

  it('renames a folder', () => {
    const folder = fs.createFolder(fs.rootId, 'Old Name');
    fs.rename(folder.id, 'New Name');
    expect(fs.getItem(folder.id).name).toBe('New Name');
  });

  it('moves a file to another folder', () => {
    const src = fs.createFolder(fs.rootId, 'Src');
    const dst = fs.createFolder(fs.rootId, 'Dst');
    const file = fs.createFile(src.id, 'test.txt');
    const moved = fs.move(file.id, dst.id);
    expect(moved.parentId).toBe(dst.id);
    expect(fs.getChildren(src.id)).toHaveLength(0);
    expect(fs.getChildren(dst.id)).toHaveLength(1);
  });

  it('moves a folder and keeps its children intact', () => {
    const f1 = fs.createFolder(fs.rootId, 'F1');
    const f2 = fs.createFolder(fs.rootId, 'F2');
    const child = fs.createFile(f1.id, 'child.txt');
    fs.move(f1.id, f2.id);
    expect(fs.getItem(f1.id).parentId).toBe(f2.id);
    expect(fs.getItem(child.id).parentId).toBe(f1.id);
  });

  it('deletes a file', () => {
    const file = fs.createFile(fs.rootId, 'bye.txt');
    const result = fs.delete(file.id);
    expect(result.deletedIds).toContain(file.id);
    expect(fs.getItem(file.id)).toBeNull();
  });

  it('deletes a folder and all its descendants', () => {
    const folder = fs.createFolder(fs.rootId, 'ToDelete');
    const file1 = fs.createFile(folder.id, 'f1.txt');
    const sub = fs.createFolder(folder.id, 'Sub');
    const file2 = fs.createFile(sub.id, 'f2.txt');
    const result = fs.delete(folder.id);
    expect(result.deletedIds).toHaveLength(4);
    [folder.id, file1.id, sub.id, file2.id].forEach(id => {
      expect(fs.getItem(id)).toBeNull();
    });
  });
});

// ===========================================================================
// 2. Rejecting invalid operations and duplicate names
// ===========================================================================
describe('2. Validation — duplicates, invalid names, bad operations', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('rejects duplicate file names (case-insensitive)', () => {
    fs.createFile(fs.rootId, 'test.txt');
    expect(() => fs.createFile(fs.rootId, 'test.txt')).toThrow(FileExplorerError);
    expect(() => fs.createFile(fs.rootId, 'TEST.TXT')).toThrow(FileExplorerError);
    expect(() => fs.createFile(fs.rootId, 'Test.Txt')).toThrow(FileExplorerError);
  });

  it('rejects duplicate folder names', () => {
    fs.createFolder(fs.rootId, 'Folder');
    expect(() => fs.createFolder(fs.rootId, 'Folder')).toThrow(FileExplorerError);
    expect(() => fs.createFolder(fs.rootId, 'folder')).toThrow(FileExplorerError);
  });

  it('rejects empty or whitespace-only names', () => {
    expect(() => fs.createFile(fs.rootId, '')).toThrow(FileExplorerError);
    expect(() => fs.createFile(fs.rootId, '   ')).toThrow(FileExplorerError);
  });

  it('rejects names with invalid characters (/ and \\)', () => {
    expect(() => fs.createFile(fs.rootId, 'a/b.txt')).toThrow(FileExplorerError);
    expect(() => fs.createFile(fs.rootId, 'a\\b.txt')).toThrow(FileExplorerError);
  });

  it('rejects reserved names (. and ..)', () => {
    expect(() => fs.createFile(fs.rootId, '.')).toThrow(FileExplorerError);
    expect(() => fs.createFile(fs.rootId, '..')).toThrow(FileExplorerError);
  });

  it('rejects operations on non-existent items', () => {
    expect(() => fs.rename('ghost', 'New')).toThrow(FileExplorerError);
    expect(() => fs.move('ghost', fs.rootId)).toThrow(FileExplorerError);
    expect(() => fs.delete('ghost')).toThrow(FileExplorerError);
  });

  it('rejects creating items inside a file (not a folder)', () => {
    const file = fs.createFile(fs.rootId, 'file.txt');
    expect(() => fs.createFile(file.id, 'child.txt')).toThrow(FileExplorerError);
    expect(() => fs.createFolder(file.id, 'Child')).toThrow(FileExplorerError);
  });

  it('rejects deleting or moving the root folder', () => {
    expect(() => fs.delete(fs.rootId)).toThrow(FileExplorerError);
    const folder = fs.createFolder(fs.rootId, 'Test');
    expect(() => fs.move(fs.rootId, folder.id)).toThrow(FileExplorerError);
  });
});

// ===========================================================================
// 3. Preventing circular moves
// ===========================================================================
describe('3. Circular move prevention', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('rejects moving a folder into itself', () => {
    const folder = fs.createFolder(fs.rootId, 'Folder');
    expect(() => fs.move(folder.id, folder.id)).toThrow(FileExplorerError);
  });

  it('rejects moving a folder into its direct child', () => {
    const parent = fs.createFolder(fs.rootId, 'Parent');
    const child = fs.createFolder(parent.id, 'Child');
    expect(() => fs.move(parent.id, child.id)).toThrow(FileExplorerError);
  });

  it('rejects moving a folder into a deep descendant', () => {
    const f1 = fs.createFolder(fs.rootId, 'F1');
    const f2 = fs.createFolder(f1.id, 'F2');
    const f3 = fs.createFolder(f2.id, 'F3');
    expect(() => fs.move(f1.id, f3.id)).toThrow(FileExplorerError);
  });

  it('allows moving a folder into a sibling', () => {
    const f1 = fs.createFolder(fs.rootId, 'F1');
    const f2 = fs.createFolder(fs.rootId, 'F2');
    expect(() => fs.move(f1.id, f2.id)).not.toThrow();
    expect(fs.getItem(f1.id).parentId).toBe(f2.id);
  });
});

// ===========================================================================
// 4a. Search — basic & filters
// ===========================================================================
describe('4a. Search — basic queries and type filters', () => {
  let fs;
  beforeEach(() => {
    fs = freshExplorer();
    const docs = fs.createFolder(fs.rootId, 'Documents');
    fs.createFile(docs.id, 'report.pdf');
    fs.createFile(docs.id, 'notes.txt');
    const images = fs.createFolder(fs.rootId, 'Images');
    fs.createFile(images.id, 'photo.jpg');
    fs.createFile(images.id, 'report-chart.png');
    const archive = fs.createFolder(docs.id, 'Archive');
    fs.createFile(archive.id, 'old-report.pdf');
  });

  it('returns the expected response shape', () => {
    const res = fs.search('report');
    ['results', 'total', 'page', 'pageSize', 'totalPages'].forEach(k => {
      expect(res).toHaveProperty(k);
    });
  });

  it('searches across all nested folders', () => {
    const { results } = fs.search('report');
    expect(results.map(r => r.name).sort()).toEqual([
      'old-report.pdf', 'report-chart.png', 'report.pdf',
    ]);
  });

  it('searches case-insensitively by default', () => {
    const { results: r1 } = fs.search('REPORT');
    const { results: r2 } = fs.search('report');
    expect(r1).toHaveLength(r2.length);
  });

  it('supports case-sensitive search', () => {
    const { results } = fs.search('report', { caseSensitive: true });
    expect(results.every(r => r.name.includes('report'))).toBe(true);
  });

  it('filters by file type', () => {
    const { results } = fs.search('report', { type: ItemType.FILE });
    expect(results).toHaveLength(3);
    results.forEach(r => expect(r.type).toBe(ItemType.FILE));
  });

  it('filters by folder type', () => {
    fs.createFolder(fs.rootId, 'Reports Archive');
    const { results } = fs.search('Archive', { type: ItemType.FOLDER });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => expect(r.type).toBe(ItemType.FOLDER));
  });

  it('includes path in results', () => {
    const { results } = fs.search('old-report');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('My Files/Documents/Archive/old-report.pdf');
  });

  it('returns empty results for an empty query', () => {
    const { results, total } = fs.search('');
    expect(results).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('updates results after creating an item', () => {
    expect(fs.search('newfile').results).toHaveLength(0);
    fs.createFile(fs.rootId, 'newfile.txt');
    expect(fs.search('newfile').results).toHaveLength(1);
  });

  it('updates results after renaming an item', () => {
    const file = fs.createFile(fs.rootId, 'original.txt');
    expect(fs.search('renamed').results).toHaveLength(0);
    fs.rename(file.id, 'renamed.txt');
    expect(fs.search('renamed').results).toHaveLength(1);
    expect(fs.search('original').results).toHaveLength(0);
  });

  it('updates results after deleting an item', () => {
    const file = fs.createFile(fs.rootId, 'delete-me.txt');
    expect(fs.search('delete').results).toHaveLength(1);
    fs.delete(file.id);
    expect(fs.search('delete').results).toHaveLength(0);
  });
});

// ===========================================================================
// 4b. Search — sorting
// ===========================================================================
describe('4b. Search — sorting', () => {
  let fs;
  beforeEach(() => {
    fs = freshExplorer();
    fs.createFolder(fs.rootId, 'Zeta');
    fs.createFile(fs.rootId, 'alpha.txt');
    fs.createFile(fs.rootId, 'beta.txt');
    fs.createFolder(fs.rootId, 'Alpha Folder');
    const zeta = fs.getTree().children.find(c => c.name === 'Zeta');
    fs.createFile(zeta.id, 'nested.txt');
  });

  it('sorts by name ascending', () => {
    const { results } = fs.search('a', { sortBy: 'name', sortOrder: 'asc' });
    const names = results.map(r => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
  });

  it('sorts by name descending', () => {
    const { results } = fs.search('a', { sortBy: 'name', sortOrder: 'desc' });
    const names = results.map(r => r.name);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' })));
  });

  it('sorts by type (folders before files) ascending', () => {
    const { results } = fs.search('a', { sortBy: 'type', sortOrder: 'asc' });
    const firstFolder = results.findIndex(r => r.type === 'folder');
    const lastFile = results.map(r => r.type).lastIndexOf('file');
    if (firstFolder !== -1 && lastFile !== -1) {
      expect(firstFolder).toBeLessThan(lastFile);
    }
  });

  it('sorts by path ascending', () => {
    const { results } = fs.search('a', { sortBy: 'path', sortOrder: 'asc' });
    const paths = results.map(r => r.path);
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
  });

  it('rejects an invalid sortBy value', () => {
    expect(() => fs.search('a', { sortBy: 'date' })).toThrow(FileExplorerError);
  });

  it('rejects an invalid sortOrder value', () => {
    expect(() => fs.search('a', { sortOrder: 'random' })).toThrow(FileExplorerError);
  });
});

// ===========================================================================
// 4c. Search — pagination
// ===========================================================================
describe('4c. Search — pagination', () => {
  let fs;
  beforeEach(() => {
    fs = freshExplorer();
    for (let i = 1; i <= 10; i++) {
      fs.createFile(fs.rootId, `item-${String(i).padStart(2, '0')}.txt`);
    }
  });

  it('returns correct pagination metadata', () => {
    const { total, page, pageSize, totalPages } = fs.search('item', { pageSize: 3 });
    expect(total).toBe(10);
    expect(page).toBe(1);
    expect(pageSize).toBe(3);
    expect(totalPages).toBe(4);
  });

  it('returns correct number of items per page', () => {
    const { results } = fs.search('item', { pageSize: 3, page: 1 });
    expect(results).toHaveLength(3);
  });

  it('returns non-overlapping pages', () => {
    const p1 = fs.search('item', { pageSize: 4, page: 1 }).results.map(r => r.id);
    const p2 = fs.search('item', { pageSize: 4, page: 2 }).results.map(r => r.id);
    expect(p1.some(id => p2.includes(id))).toBe(false);
  });

  it('returns fewer items on the last page', () => {
    const { totalPages } = fs.search('item', { pageSize: 3 });
    const { results } = fs.search('item', { pageSize: 3, page: totalPages });
    expect(results).toHaveLength(1); // 10 items / 3 per page → last page has 1
  });

  it('returns all items when pageSize is 0', () => {
    const { results, total } = fs.search('item', { pageSize: 0 });
    expect(results).toHaveLength(total);
    expect(results).toHaveLength(10);
  });

  it('clamps page to totalPages when page exceeds total', () => {
    const { page, totalPages } = fs.search('item', { pageSize: 3, page: 999 });
    expect(page).toBe(totalPages);
  });

  it('rejects page less than 1', () => {
    expect(() => fs.search('item', { page: 0 })).toThrow(FileExplorerError);
  });

  it('rejects negative pageSize', () => {
    expect(() => fs.search('item', { pageSize: -1 })).toThrow(FileExplorerError);
  });

  it('works with sort and pagination together', () => {
    const { results } = fs.search('item', { sortBy: 'name', sortOrder: 'asc', pageSize: 3, page: 1 });
    expect(results[0].name).toBe('item-01.txt');
    expect(results[1].name).toBe('item-02.txt');
    expect(results[2].name).toBe('item-03.txt');
  });
});

// ===========================================================================
// 5. Undo / Redo
// ===========================================================================
describe('5. Undo and Redo', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('undoes file creation', () => {
    const file = fs.createFile(fs.rootId, 'test.txt');
    expect(fs.undo()).toBe(true);
    expect(fs.getItem(file.id)).toBeNull();
  });

  it('undoes folder creation', () => {
    const folder = fs.createFolder(fs.rootId, 'Folder');
    fs.undo();
    expect(fs.getItem(folder.id)).toBeNull();
  });

  it('undoes a rename', () => {
    const file = fs.createFile(fs.rootId, 'original.txt');
    fs.rename(file.id, 'renamed.txt');
    fs.undo();
    expect(fs.getItem(file.id).name).toBe('original.txt');
  });

  it('undoes a move', () => {
    const f1 = fs.createFolder(fs.rootId, 'F1');
    const f2 = fs.createFolder(fs.rootId, 'F2');
    const file = fs.createFile(f1.id, 'test.txt');
    fs.move(file.id, f2.id);
    fs.undo();
    expect(fs.getItem(file.id).parentId).toBe(f1.id);
  });

  it('undoes a delete and restores all descendants', () => {
    const folder = fs.createFolder(fs.rootId, 'Parent');
    const file1 = fs.createFile(folder.id, 'f1.txt');
    const sub = fs.createFolder(folder.id, 'Sub');
    const file2 = fs.createFile(sub.id, 'f2.txt');
    fs.delete(folder.id);
    fs.undo();
    [folder, file1, sub, file2].forEach(item => {
      expect(fs.getItem(item.id)).toBeDefined();
    });
    expect(fs.getItem(folder.id).children).toContain(file1.id);
    expect(fs.getItem(folder.id).children).toContain(sub.id);
    expect(fs.getItem(sub.id).children).toContain(file2.id);
  });

  it('redoes an undone operation', () => {
    const file = fs.createFile(fs.rootId, 'test.txt');
    fs.undo();
    expect(fs.canRedo()).toBe(true);
    expect(fs.redo()).toBe(true);
    expect(fs.getItem(file.id)).toBeDefined();
  });

  it('supports multiple sequential undo / redo calls', () => {
    const f1 = fs.createFile(fs.rootId, 'f1.txt');
    const f2 = fs.createFile(fs.rootId, 'f2.txt');
    const f3 = fs.createFile(fs.rootId, 'f3.txt');
    fs.undo(); // undo f3
    fs.undo(); // undo f2
    expect(fs.getItem(f1.id)).toBeDefined();
    expect(fs.getItem(f2.id)).toBeNull();
    expect(fs.getItem(f3.id)).toBeNull();
    fs.redo(); // redo f2
    expect(fs.getItem(f2.id)).toBeDefined();
    expect(fs.getItem(f3.id)).toBeNull();
  });

  it('clears the redo stack after a new operation', () => {
    fs.createFile(fs.rootId, 'f1.txt');
    fs.undo();
    expect(fs.canRedo()).toBe(true);
    fs.createFile(fs.rootId, 'f2.txt');
    expect(fs.canRedo()).toBe(false);
  });

  it('returns false when undo / redo stack is empty', () => {
    expect(fs.undo()).toBe(false);
    expect(fs.redo()).toBe(false);
  });

  it('respects the historyLimit option', () => {
    const limited = freshExplorer({ historyLimit: 2 });
    limited.createFile(limited.rootId, 'f1.txt');
    limited.createFile(limited.rootId, 'f2.txt');
    limited.createFile(limited.rootId, 'f3.txt');
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(false); // history capped at 2
  });
});

// ===========================================================================
// 6. Subscriptions
// ===========================================================================
describe('6. Subscriptions — subscribe, unsubscribe, notifications', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('notifies on create', () => {
    let evt = null;
    fs.subscribe(e => { evt = e; });
    fs.createFile(fs.rootId, 'test.txt');
    expect(evt.type).toBe('create');
    expect(evt.name).toBe('test.txt');
  });

  it('notifies on rename', () => {
    const file = fs.createFile(fs.rootId, 'old.txt');
    let evt = null;
    fs.subscribe(e => { evt = e; });
    fs.rename(file.id, 'new.txt');
    expect(evt.type).toBe('rename');
    expect(evt.from).toBe('old.txt');
    expect(evt.to).toBe('new.txt');
  });

  it('notifies on move', () => {
    const folder = fs.createFolder(fs.rootId, 'Folder');
    const file = fs.createFile(fs.rootId, 'test.txt');
    let evt = null;
    fs.subscribe(e => { evt = e; });
    fs.move(file.id, folder.id);
    expect(evt.type).toBe('move');
    expect(evt.toParentId).toBe(folder.id);
  });

  it('notifies on delete', () => {
    const file = fs.createFile(fs.rootId, 'test.txt');
    let evt = null;
    fs.subscribe(e => { evt = e; });
    fs.delete(file.id);
    expect(evt.type).toBe('delete');
    expect(evt.ids).toContain(file.id);
  });

  it('notifies on undo and redo', () => {
    const events = [];
    fs.subscribe(e => events.push(e));
    fs.createFile(fs.rootId, 'test.txt');
    fs.undo();
    fs.redo();
    expect(events[0].type).toBe('create');
    expect(events[1].type).toBe('undo');
    expect(events[2].type).toBe('redo');
  });

  it('supports multiple listeners', () => {
    let c1 = 0, c2 = 0;
    fs.subscribe(() => c1++);
    fs.subscribe(() => c2++);
    fs.createFile(fs.rootId, 'test.txt');
    expect(c1).toBe(1);
    expect(c2).toBe(1);
  });

  it('removes a listener via the returned unsubscribe function', () => {
    let count = 0;
    const unsub = fs.subscribe(() => count++);
    fs.createFile(fs.rootId, 'f1.txt');
    expect(count).toBe(1);
    unsub();
    fs.createFile(fs.rootId, 'f2.txt');
    expect(count).toBe(1); // no further calls
  });

  it('removes a listener via fs.unsubscribe()', () => {
    let count = 0;
    const listener = () => count++;
    fs.subscribe(listener);
    fs.createFile(fs.rootId, 'f1.txt');
    fs.unsubscribe(listener);
    fs.createFile(fs.rootId, 'f2.txt');
    expect(count).toBe(1);
  });

  it('does not crash when a listener throws', () => {
    const goodListener = vi.fn();
    fs.subscribe(() => { throw new Error('bad listener'); });
    fs.subscribe(goodListener);
    expect(() => fs.createFile(fs.rootId, 'test.txt')).not.toThrow();
    expect(goodListener).toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. Immutability — returned data cannot mutate internal state
// ===========================================================================
describe('7. Immutability — returned objects are frozen', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('returns a frozen item from createFile', () => {
    const file = fs.createFile(fs.rootId, 'test.txt');
    expect(Object.isFrozen(file)).toBe(true);
  });

  it('returns a frozen tree from getTree', () => {
    const tree = fs.getTree();
    expect(Object.isFrozen(tree)).toBe(true);
    expect(Object.isFrozen(tree.children)).toBe(true);
  });

  it('throws when trying to mutate a returned item', () => {
    const file = fs.createFile(fs.rootId, 'test.txt');
    expect(() => { file.name = 'hacked.txt'; }).toThrow();
    expect(fs.getItem(file.id).name).toBe('test.txt');
  });

  it('throws when trying to push into the children array', () => {
    const tree = fs.getTree();
    expect(() => { tree.children.push({ id: 'fake' }); }).toThrow();
  });

  it('returns the same tree reference when nothing changed (referential stability)', () => {
    const t1 = fs.getTree();
    const t2 = fs.getTree();
    expect(t1).toBe(t2);
  });

  it('returns a new tree reference after a mutation', () => {
    const t1 = fs.getTree();
    fs.createFile(fs.rootId, 'test.txt');
    const t2 = fs.getTree();
    expect(t1).not.toBe(t2);
  });

  it('preserves unchanged subtrees (structural sharing)', () => {
    const f1 = fs.createFolder(fs.rootId, 'F1');
    const f2 = fs.createFolder(fs.rootId, 'F2');
    fs.createFile(f1.id, 'a.txt');
    const tree1 = fs.getTree();
    const f2node1 = tree1.children.find(c => c.id === f2.id);
    fs.createFile(f1.id, 'b.txt'); // only F1 changes
    const tree2 = fs.getTree();
    const f2node2 = tree2.children.find(c => c.id === f2.id);
    expect(f2node1).toBe(f2node2); // F2 reference unchanged
  });
});

// ===========================================================================
// 8. Utility methods — getVersion, getPath, getPathString, custom initialTree
// ===========================================================================
describe('8. Utility methods', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('increments version on each mutation', () => {
    const v1 = fs.getVersion();
    fs.createFile(fs.rootId, 'test.txt');
    expect(fs.getVersion()).toBeGreaterThan(v1);
  });

  it('getPath returns correct breadcrumb array', () => {
    const folder = fs.createFolder(fs.rootId, 'Documents');
    const file = fs.createFile(folder.id, 'report.pdf');
    const path = fs.getPath(file.id);
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe(fs.rootId);
    expect(path[1].id).toBe(folder.id);
    expect(path[2].id).toBe(file.id);
  });

  it('getPathString returns slash-separated path', () => {
    const folder = fs.createFolder(fs.rootId, 'Documents');
    const file = fs.createFile(folder.id, 'report.pdf');
    expect(fs.getPathString(file.id)).toBe('My Files/Documents/report.pdf');
  });

  it('accepts a custom initialTree', () => {
    const custom = new FileExplorer({
      initialTree: {
        id: 'custom-root',
        name: 'Custom Root',
        type: ItemType.FOLDER,
        children: [
          { id: 'file1', name: 'File 1.txt', type: ItemType.FILE },
        ],
      },
    });
    expect(custom.rootId).toBe('custom-root');
    expect(custom.getTree().name).toBe('Custom Root');
    expect(custom.getTree().children).toHaveLength(1);
  });
});

// ===========================================================================
// 9. Atomic Transactions
// ===========================================================================
describe('9. Atomic Transactions', () => {
  let fs;
  beforeEach(() => { fs = freshExplorer(); });

  it('begins a transaction in active state', () => {
    const tx = fs.beginTransaction();
    expect(tx).toBeDefined();
    expect(tx.isActive).toBe(true);
    expect(tx.operationCount).toBe(0);
  });

  it('collects operations without applying them until commit', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'pending.txt');
    tx.createFolder(fs.rootId, 'Pending Folder');
    expect(tx.operationCount).toBe(2);
    expect(fs.getTree().children.find(c => c.name === 'pending.txt')).toBeUndefined();
  });

  it('commits all operations atomically', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'f1.txt');
    tx.createFolder(fs.rootId, 'Folder1');
    const result = tx.commit();
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    result.results.forEach(r => expect(fs.getItem(r.id)).toBeDefined());
    expect(tx.isActive).toBe(false);
  });

  it('rolls back all operations when one fails', () => {
    fs.createFile(fs.rootId, 'existing.txt');
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'new-file.txt');
    tx.createFile(fs.rootId, 'existing.txt'); // will fail — duplicate
    tx.createFolder(fs.rootId, 'New Folder');
    const result = tx.commit();
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('DUPLICATE_NAME');
    expect(fs.getTree().children.find(c => c.name === 'new-file.txt')).toBeUndefined();
    expect(fs.getTree().children.find(c => c.name === 'New Folder')).toBeUndefined();
  });

  it('creates a single undo history entry for a transaction', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'f1.txt');
    tx.createFile(fs.rootId, 'f2.txt');
    tx.createFolder(fs.rootId, 'Folder1');
    tx.commit();
    expect(fs.canUndo()).toBe(true);
    fs.undo();
    const tree = fs.getTree();
    ['f1.txt', 'f2.txt', 'Folder1'].forEach(name => {
      expect(tree.children.find(c => c.name === name)).toBeUndefined();
    });
  });

  it('redoes the entire transaction', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'tx-file.txt');
    tx.commit();
    fs.undo();
    expect(fs.getTree().children.find(c => c.name === 'tx-file.txt')).toBeUndefined();
    fs.redo();
    expect(fs.getTree().children.find(c => c.name === 'tx-file.txt')).toBeDefined();
  });

  it('notifies subscribers exactly once for a committed transaction', () => {
    const events = [];
    const unsub = fs.subscribe(e => events.push(e));
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'f1.txt');
    tx.createFile(fs.rootId, 'f2.txt');
    tx.commit();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('transaction');
    expect(events[0].operations).toHaveLength(2);
    unsub();
  });

  it('supports explicit rollback', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'test.txt');
    tx.rollback();
    expect(tx.isActive).toBe(false);
    expect(fs.getTree().children.find(c => c.name === 'test.txt')).toBeUndefined();
  });

  it('throws when calling createFile on an already-committed transaction', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'test.txt');
    tx.commit();
    expect(() => tx.createFile(fs.rootId, 'another.txt')).toThrow('already committed');
    expect(() => tx.commit()).toThrow('already committed');
  });

  it('throws when calling createFile on a rolled-back transaction', () => {
    const tx = fs.beginTransaction();
    tx.createFile(fs.rootId, 'test.txt');
    tx.rollback();
    expect(() => tx.createFile(fs.rootId, 'another.txt')).toThrow('already rolled back');
  });

  it('handles move and delete within a transaction', () => {
    const folder = fs.createFolder(fs.rootId, 'Folder');
    const file = fs.createFile(fs.rootId, 'file.txt');
    const tx = fs.beginTransaction();
    tx.move(file.id, folder.id);
    tx.delete(folder.id);
    const result = tx.commit();
    expect(result.success).toBe(true);
    expect(fs.getItem(folder.id)).toBeNull();
    expect(fs.getItem(file.id)).toBeNull();
  });

  it('commits an empty transaction successfully', () => {
    const tx = fs.beginTransaction();
    const result = tx.commit();
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it('respects historyLimit across transactions', () => {
    const small = freshExplorer({ historyLimit: 2 });
    small.beginTransaction().createFile(small.rootId, 'f1.txt').commit();
    small.beginTransaction().createFile(small.rootId, 'f2.txt').commit();
    small.beginTransaction().createFile(small.rootId, 'f3.txt').commit();
    expect(small.canUndo()).toBe(true);
    small.undo();
    expect(small.canUndo()).toBe(true);
    small.undo();
    expect(small.canUndo()).toBe(false);
  });
});
