import { describe, it, expect, beforeEach } from 'vitest';
import { FileExplorer, FileExplorerError, ErrorCode, ItemType } from './FileExplorer.js';

describe('FileExplorer SDK', () => {
  let fs;

  beforeEach(() => {
    fs = new FileExplorer();
  });

  describe('1. Creating, renaming, moving, and deleting files and folders', () => {
    it('should create a new file', () => {
      const file = fs.createFile(fs.rootId, 'test.txt', 'Hello World');
      
      expect(file).toBeDefined();
      expect(file.name).toBe('test.txt');
      expect(file.type).toBe(ItemType.FILE);
      expect(file.content).toBe('Hello World');
      expect(file.parentId).toBe(fs.rootId);
      
      const retrieved = fs.getItem(file.id);
      expect(retrieved).toEqual(file);
    });

    it('should create a new folder', () => {
      const folder = fs.createFolder(fs.rootId, 'New Folder');
      
      expect(folder).toBeDefined();
      expect(folder.name).toBe('New Folder');
      expect(folder.type).toBe(ItemType.FOLDER);
      expect(folder.children).toEqual([]);
      expect(folder.parentId).toBe(fs.rootId);
    });

    it('should create nested files and folders', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(folder1.id, 'Folder2');
      const file = fs.createFile(folder2.id, 'nested.txt');
      
      expect(file.parentId).toBe(folder2.id);
      
      const path = fs.getPath(file.id);
      expect(path).toHaveLength(4); // root -> folder1 -> folder2 -> file
      expect(path[3].name).toBe('nested.txt');
    });

    it('should rename a file', () => {
      const file = fs.createFile(fs.rootId, 'old.txt');
      const renamed = fs.rename(file.id, 'new.txt');
      
      expect(renamed.name).toBe('new.txt');
      expect(renamed.id).toBe(file.id);
      
      const retrieved = fs.getItem(file.id);
      expect(retrieved.name).toBe('new.txt');
    });

    it('should rename a folder', () => {
      const folder = fs.createFolder(fs.rootId, 'Old Name');
      fs.rename(folder.id, 'New Name');
      
      const retrieved = fs.getItem(folder.id);
      expect(retrieved.name).toBe('New Name');
    });

    it('should move a file to another folder', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(fs.rootId, 'Folder2');
      const file = fs.createFile(folder1.id, 'test.txt');
      
      const moved = fs.move(file.id, folder2.id);
      
      expect(moved.parentId).toBe(folder2.id);
      expect(moved.id).toBe(file.id);
      
      const folder1Children = fs.getChildren(folder1.id);
      expect(folder1Children).toHaveLength(0);
      
      const folder2Children = fs.getChildren(folder2.id);
      expect(folder2Children).toHaveLength(1);
      expect(folder2Children[0].id).toBe(file.id);
    });

    it('should move a folder to another folder', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(fs.rootId, 'Folder2');
      const nestedFile = fs.createFile(folder1.id, 'nested.txt');
      
      fs.move(folder1.id, folder2.id);
      
      const movedFolder = fs.getItem(folder1.id);
      expect(movedFolder.parentId).toBe(folder2.id);
      
      // Verify nested file is still in moved folder
      const file = fs.getItem(nestedFile.id);
      expect(file.parentId).toBe(folder1.id);
    });

    it('should delete a file', () => {
      const file = fs.createFile(fs.rootId, 'delete-me.txt');
      const result = fs.delete(file.id);
      
      expect(result.deletedIds).toContain(file.id);
      expect(fs.getItem(file.id)).toBeNull();
    });

    it('should delete a folder and all its descendants', () => {
      const folder = fs.createFolder(fs.rootId, 'ToDelete');
      const file1 = fs.createFile(folder.id, 'file1.txt');
      const subfolder = fs.createFolder(folder.id, 'Subfolder');
      const file2 = fs.createFile(subfolder.id, 'file2.txt');
      
      const result = fs.delete(folder.id);
      
      expect(result.deletedIds).toHaveLength(4);
      expect(result.deletedIds).toContain(folder.id);
      expect(result.deletedIds).toContain(file1.id);
      expect(result.deletedIds).toContain(subfolder.id);
      expect(result.deletedIds).toContain(file2.id);
      
      expect(fs.getItem(folder.id)).toBeNull();
      expect(fs.getItem(file1.id)).toBeNull();
      expect(fs.getItem(subfolder.id)).toBeNull();
      expect(fs.getItem(file2.id)).toBeNull();
    });
  });

  describe('2. Rejecting duplicate names and invalid operations', () => {
    it('should reject duplicate file names (case-insensitive)', () => {
      fs.createFile(fs.rootId, 'test.txt');
      
      expect(() => {
        fs.createFile(fs.rootId, 'test.txt');
      }).toThrow(FileExplorerError);
      
      expect(() => {
        fs.createFile(fs.rootId, 'TEST.TXT');
      }).toThrow(FileExplorerError);
      
      expect(() => {
        fs.createFile(fs.rootId, 'Test.txt');
      }).toThrow(FileExplorerError);
    });

    it('should reject duplicate folder names', () => {
      fs.createFolder(fs.rootId, 'Folder');
      
      expect(() => {
        fs.createFolder(fs.rootId, 'Folder');
      }).toThrow(FileExplorerError);
      
      expect(() => {
        fs.createFolder(fs.rootId, 'folder');
      }).toThrow(FileExplorerError);
    });

    it('should reject empty names', () => {
      expect(() => fs.createFile(fs.rootId, '')).toThrow(FileExplorerError);
      expect(() => fs.createFile(fs.rootId, '   ')).toThrow(FileExplorerError);
    });

    it('should reject names with invalid characters', () => {
      expect(() => fs.createFile(fs.rootId, 'file/name.txt')).toThrow(FileExplorerError);
      expect(() => fs.createFile(fs.rootId, 'file\\name.txt')).toThrow(FileExplorerError);
    });

    it('should reject reserved names', () => {
      expect(() => fs.createFile(fs.rootId, '.')).toThrow(FileExplorerError);
      expect(() => fs.createFile(fs.rootId, '..')).toThrow(FileExplorerError);
    });

    it('should reject operations on non-existent items', () => {
      expect(() => fs.rename('non-existent-id', 'New Name')).toThrow(FileExplorerError);
      expect(() => fs.move('non-existent-id', fs.rootId)).toThrow(FileExplorerError);
      expect(() => fs.delete('non-existent-id')).toThrow(FileExplorerError);
    });

    it('should reject creating items in a file (not a folder)', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      
      expect(() => fs.createFile(file.id, 'nested.txt')).toThrow(FileExplorerError);
      expect(() => fs.createFolder(file.id, 'Nested')).toThrow(FileExplorerError);
    });

    it('should reject deleting or moving the root folder', () => {
      expect(() => fs.delete(fs.rootId)).toThrow(FileExplorerError);
      
      const folder = fs.createFolder(fs.rootId, 'Test');
      expect(() => fs.move(fs.rootId, folder.id)).toThrow(FileExplorerError);
    });
  });

  describe('3. Preventing folders from being moved into their descendants', () => {
    it('should reject moving a folder into itself', () => {
      const folder = fs.createFolder(fs.rootId, 'Folder');
      
      expect(() => {
        fs.move(folder.id, folder.id);
      }).toThrow(FileExplorerError);
    });

    it('should reject moving a folder into its direct child', () => {
      const parent = fs.createFolder(fs.rootId, 'Parent');
      const child = fs.createFolder(parent.id, 'Child');
      
      expect(() => {
        fs.move(parent.id, child.id);
      }).toThrow(FileExplorerError);
    });

    it('should reject moving a folder into a deep descendant', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(folder1.id, 'Folder2');
      const folder3 = fs.createFolder(folder2.id, 'Folder3');
      
      expect(() => {
        fs.move(folder1.id, folder3.id);
      }).toThrow(FileExplorerError);
    });

    it('should allow moving a folder into a sibling', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(fs.rootId, 'Folder2');
      
      expect(() => {
        fs.move(folder1.id, folder2.id);
      }).not.toThrow();
      
      const moved = fs.getItem(folder1.id);
      expect(moved.parentId).toBe(folder2.id);
    });
  });

  describe('4. Searching nested folders and updating results after mutations', () => {
    beforeEach(() => {
      // Clear all children from root for a clean slate
      const tree = fs.getTree();
      tree.children.forEach(child => {
        try {
          fs.delete(child.id);
        } catch (e) {
          // Ignore
        }
      });
      
      // Create a complex structure for search testing
      const docs = fs.createFolder(fs.rootId, 'Documents');
      fs.createFile(docs.id, 'report.pdf');
      fs.createFile(docs.id, 'notes.txt');
      
      const images = fs.createFolder(fs.rootId, 'Images');
      fs.createFile(images.id, 'photo.jpg');
      fs.createFile(images.id, 'report-chart.png');
      
      const archive = fs.createFolder(docs.id, 'Archive');
      fs.createFile(archive.id, 'old-report.pdf');
    });

    it('should return search result shape with results/total/page metadata', () => {
      const response = fs.search('report');
      expect(response).toHaveProperty('results');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('page');
      expect(response).toHaveProperty('pageSize');
      expect(response).toHaveProperty('totalPages');
    });

    it('should search across all nested folders', () => {
      const { results } = fs.search('report');
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.name).sort()).toEqual([
        'old-report.pdf',
        'report-chart.png',
        'report.pdf',
      ]);
    });

    it('should search case-insensitively by default', () => {
      const { results: r1 } = fs.search('REPORT');
      const { results: r2 } = fs.search('report');
      
      expect(r1).toHaveLength(r2.length);
    });

    it('should support case-sensitive search', () => {
      const { results: r1 } = fs.search('REPORT', { caseSensitive: false });
      const { results: r2 } = fs.search('report', { caseSensitive: false });
      
      // Both should return same results (case-insensitive)
      expect(r1.length).toBe(r2.length);
      
      // Now test case-sensitive with existing items
      const { results: caseSensitiveResults } = fs.search('report', { caseSensitive: true });
      expect(caseSensitiveResults.every(r => r.name.includes('report'))).toBe(true);
    });

    it('should filter search by type (files only)', () => {
      const { results } = fs.search('report', { type: ItemType.FILE });
      
      expect(results).toHaveLength(3);
      results.forEach(item => {
        expect(item.type).toBe(ItemType.FILE);
      });
    });

    it('should filter search by type (folders only)', () => {
      fs.createFolder(fs.rootId, 'Reports Archive');
      
      const { results } = fs.search('Archive', { type: ItemType.FOLDER });
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(item => {
        expect(item.type).toBe(ItemType.FOLDER);
      });
    });

    it('should update search results after creating an item', () => {
      let { results } = fs.search('test');
      expect(results).toHaveLength(0);
      
      fs.createFile(fs.rootId, 'test.txt');
      
      ({ results } = fs.search('test'));
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test.txt');
    });

    it('should update search results after renaming an item', () => {
      const file = fs.createFile(fs.rootId, 'original.txt');
      
      let { results } = fs.search('renamed');
      expect(results).toHaveLength(0);
      
      fs.rename(file.id, 'renamed.txt');
      
      ({ results } = fs.search('renamed'));
      expect(results).toHaveLength(1);
      
      ({ results } = fs.search('original'));
      expect(results).toHaveLength(0);
    });

    it('should update search results after deleting an item', () => {
      const file = fs.createFile(fs.rootId, 'delete-me.txt');
      
      let { results } = fs.search('delete');
      expect(results).toHaveLength(1);
      
      fs.delete(file.id);
      
      ({ results } = fs.search('delete'));
      expect(results).toHaveLength(0);
    });

    it('should include path in search results', () => {
      const { results } = fs.search('old-report');
      
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('My Files/Documents/Archive/old-report.pdf');
    });

    it('should return empty results and zero total for empty query', () => {
      const { results, total } = fs.search('');
      expect(results).toHaveLength(0);
      expect(total).toBe(0);
    });
  });

  describe('4b. Search — sorting', () => {
    beforeEach(() => {
      // Clean slate
      const tree = fs.getTree();
      tree.children.forEach(child => { try { fs.delete(child.id); } catch (e) { /* ignore */ } });

      const folder = fs.createFolder(fs.rootId, 'Zeta');
      fs.createFile(fs.rootId, 'alpha.txt');
      fs.createFile(fs.rootId, 'beta.txt');
      fs.createFolder(fs.rootId, 'Alpha Folder');
      fs.createFile(folder.id, 'nested.txt');
    });

    it('should sort results by name ascending by default', () => {
      const { results } = fs.search('a', { sortBy: 'name', sortOrder: 'asc' });
      const names = results.map(r => r.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      expect(names).toEqual(sorted);
    });

    it('should sort results by name descending', () => {
      const { results } = fs.search('a', { sortBy: 'name', sortOrder: 'desc' });
      const names = results.map(r => r.name);
      const sorted = [...names].sort((a, b) => b.localeCompare(a, undefined, { sensitivity: 'base' }));
      expect(names).toEqual(sorted);
    });

    it('should sort results by type (folders before files)', () => {
      const { results } = fs.search('a', { sortBy: 'type', sortOrder: 'asc' });
      // 'folder' < 'file' alphabetically — folders come first in asc
      const firstFolder = results.findIndex(r => r.type === 'folder');
      const lastFile = results.map(r => r.type).lastIndexOf('file');
      if (firstFolder !== -1 && lastFile !== -1) {
        expect(firstFolder).toBeLessThan(lastFile);
      }
    });

    it('should sort results by path ascending', () => {
      const { results } = fs.search('a', { sortBy: 'path', sortOrder: 'asc' });
      const paths = results.map(r => r.path);
      const sorted = [...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      expect(paths).toEqual(sorted);
    });

    it('should reject invalid sortBy value', () => {
      expect(() => fs.search('a', { sortBy: 'date' })).toThrow(FileExplorerError);
    });

    it('should reject invalid sortOrder value', () => {
      expect(() => fs.search('a', { sortOrder: 'random' })).toThrow(FileExplorerError);
    });
  });

  describe('4c. Search — pagination', () => {
    beforeEach(() => {
      // Clean slate
      const tree = fs.getTree();
      tree.children.forEach(child => { try { fs.delete(child.id); } catch (e) { /* ignore */ } });

      // Create 10 files named item-01.txt … item-10.txt
      for (let i = 1; i <= 10; i++) {
        fs.createFile(fs.rootId, `item-${String(i).padStart(2, '0')}.txt`);
      }
    });

    it('should return correct pagination metadata', () => {
      const { total, page, pageSize, totalPages } = fs.search('item', { pageSize: 3 });
      expect(total).toBe(10);
      expect(page).toBe(1);
      expect(pageSize).toBe(3);
      expect(totalPages).toBe(4);
    });

    it('should return only the items for the requested page', () => {
      const { results } = fs.search('item', { pageSize: 3, page: 1 });
      expect(results).toHaveLength(3);
    });

    it('should return the correct slice for page 2', () => {
      const { results: page1 } = fs.search('item', { pageSize: 4, page: 1 });
      const { results: page2 } = fs.search('item', { pageSize: 4, page: 2 });

      // No overlap between pages
      const p1ids = page1.map(r => r.id);
      const p2ids = page2.map(r => r.id);
      expect(p1ids.some(id => p2ids.includes(id))).toBe(false);
    });

    it('should return fewer items on the last page', () => {
      const { results, totalPages } = fs.search('item', { pageSize: 3 });
      // Last page
      const { results: lastPage } = fs.search('item', { pageSize: 3, page: totalPages });
      expect(lastPage).toHaveLength(1); // 10 items, 3 per page → last page has 1
    });

    it('should return all items when pageSize is 0', () => {
      const { results, total } = fs.search('item', { pageSize: 0 });
      expect(results).toHaveLength(total);
      expect(results).toHaveLength(10);
    });

    it('should clamp page to totalPages when page exceeds total', () => {
      const { page, totalPages } = fs.search('item', { pageSize: 3, page: 999 });
      expect(page).toBe(totalPages);
    });

    it('should reject page less than 1', () => {
      expect(() => fs.search('item', { page: 0 })).toThrow(FileExplorerError);
    });

    it('should reject negative pageSize', () => {
      expect(() => fs.search('item', { pageSize: -1 })).toThrow(FileExplorerError);
    });

    it('should work with sort and pagination together', () => {
      const { results } = fs.search('item', { sortBy: 'name', sortOrder: 'asc', pageSize: 3, page: 1 });
      expect(results[0].name).toBe('item-01.txt');
      expect(results[1].name).toBe('item-02.txt');
      expect(results[2].name).toBe('item-03.txt');
    });
  });

  describe('5. Undoing and redoing operations, including restoration of nested folders', () => {
    it('should undo file creation', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      expect(fs.getItem(file.id)).toBeDefined();
      
      const undone = fs.undo();
      expect(undone).toBe(true);
      expect(fs.getItem(file.id)).toBeNull();
    });

    it('should undo folder creation', () => {
      const folder = fs.createFolder(fs.rootId, 'Test Folder');
      expect(fs.canUndo()).toBe(true);
      
      fs.undo();
      expect(fs.getItem(folder.id)).toBeNull();
    });

    it('should undo rename operation', () => {
      const file = fs.createFile(fs.rootId, 'original.txt');
      fs.rename(file.id, 'renamed.txt');
      
      expect(fs.getItem(file.id).name).toBe('renamed.txt');
      
      fs.undo();
      expect(fs.getItem(file.id).name).toBe('original.txt');
    });

    it('should undo move operation', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(fs.rootId, 'Folder2');
      const file = fs.createFile(folder1.id, 'test.txt');
      
      fs.move(file.id, folder2.id);
      expect(fs.getItem(file.id).parentId).toBe(folder2.id);
      
      fs.undo();
      expect(fs.getItem(file.id).parentId).toBe(folder1.id);
    });

    it('should undo delete and restore nested folders with all descendants', () => {
      const folder = fs.createFolder(fs.rootId, 'Parent');
      const file1 = fs.createFile(folder.id, 'file1.txt');
      const subfolder = fs.createFolder(folder.id, 'Subfolder');
      const file2 = fs.createFile(subfolder.id, 'file2.txt');
      
      fs.delete(folder.id);
      expect(fs.getItem(folder.id)).toBeNull();
      expect(fs.getItem(file1.id)).toBeNull();
      expect(fs.getItem(subfolder.id)).toBeNull();
      expect(fs.getItem(file2.id)).toBeNull();
      
      fs.undo();
      
      // Verify all items are restored
      expect(fs.getItem(folder.id)).toBeDefined();
      expect(fs.getItem(file1.id)).toBeDefined();
      expect(fs.getItem(subfolder.id)).toBeDefined();
      expect(fs.getItem(file2.id)).toBeDefined();
      
      // Verify structure is intact
      const restoredFolder = fs.getItem(folder.id);
      expect(restoredFolder.children).toContain(file1.id);
      expect(restoredFolder.children).toContain(subfolder.id);
      
      const restoredSubfolder = fs.getItem(subfolder.id);
      expect(restoredSubfolder.children).toContain(file2.id);
    });

    it('should redo operations', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      fs.undo();
      
      expect(fs.canRedo()).toBe(true);
      
      const redone = fs.redo();
      expect(redone).toBe(true);
      expect(fs.getItem(file.id)).toBeDefined();
    });

    it('should support multiple undo/redo operations', () => {
      const file1 = fs.createFile(fs.rootId, 'file1.txt');
      const file2 = fs.createFile(fs.rootId, 'file2.txt');
      const file3 = fs.createFile(fs.rootId, 'file3.txt');
      
      fs.undo(); // Undo file3
      fs.undo(); // Undo file2
      
      expect(fs.getItem(file1.id)).toBeDefined();
      expect(fs.getItem(file2.id)).toBeNull();
      expect(fs.getItem(file3.id)).toBeNull();
      
      fs.redo(); // Redo file2
      
      expect(fs.getItem(file2.id)).toBeDefined();
      expect(fs.getItem(file3.id)).toBeNull();
    });

    it('should clear redo stack after a new operation', () => {
      fs.createFile(fs.rootId, 'file1.txt');
      fs.undo();
      
      expect(fs.canRedo()).toBe(true);
      
      fs.createFile(fs.rootId, 'file2.txt');
      
      expect(fs.canRedo()).toBe(false);
    });

    it('should return false when undo/redo stack is empty', () => {
      expect(fs.undo()).toBe(false);
      expect(fs.redo()).toBe(false);
    });

    it('should respect history limit', () => {
      const limitedFs = new FileExplorer({ historyLimit: 2 });
      
      limitedFs.createFile(limitedFs.rootId, 'file1.txt');
      limitedFs.createFile(limitedFs.rootId, 'file2.txt');
      limitedFs.createFile(limitedFs.rootId, 'file3.txt');
      
      // Can only undo 2 times (history limit)
      expect(limitedFs.undo()).toBe(true);
      expect(limitedFs.undo()).toBe(true);
      expect(limitedFs.undo()).toBe(false);
    });
  });

  describe('6. Registering and removing SDK subscriptions', () => {
    it('should notify listeners on create operations', () => {
      let notified = false;
      let receivedEvent = null;
      
      const listener = (event) => {
        notified = true;
        receivedEvent = event;
      };
      
      fs.subscribe(listener);
      fs.createFile(fs.rootId, 'test.txt');
      
      expect(notified).toBe(true);
      expect(receivedEvent.type).toBe('create');
      expect(receivedEvent.name).toBe('test.txt');
    });

    it('should notify listeners on rename operations', () => {
      const file = fs.createFile(fs.rootId, 'old.txt');
      let event = null;
      
      fs.subscribe((e) => { event = e; });
      fs.rename(file.id, 'new.txt');
      
      expect(event.type).toBe('rename');
      expect(event.from).toBe('old.txt');
      expect(event.to).toBe('new.txt');
    });

    it('should notify listeners on move operations', () => {
      const folder = fs.createFolder(fs.rootId, 'Folder');
      const file = fs.createFile(fs.rootId, 'test.txt');
      let event = null;
      
      fs.subscribe((e) => { event = e; });
      fs.move(file.id, folder.id);
      
      expect(event.type).toBe('move');
      expect(event.toParentId).toBe(folder.id);
    });

    it('should notify listeners on delete operations', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      let event = null;
      
      fs.subscribe((e) => { event = e; });
      fs.delete(file.id);
      
      expect(event.type).toBe('delete');
      expect(event.ids).toContain(file.id);
    });

    it('should notify listeners on undo/redo', () => {
      const events = [];
      
      fs.subscribe((e) => events.push(e));
      
      fs.createFile(fs.rootId, 'test.txt');
      fs.undo();
      fs.redo();
      
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('create');
      expect(events[1].type).toBe('undo');
      expect(events[2].type).toBe('redo');
    });

    it('should support multiple listeners', () => {
      let count1 = 0;
      let count2 = 0;
      
      fs.subscribe(() => count1++);
      fs.subscribe(() => count2++);
      
      fs.createFile(fs.rootId, 'test.txt');
      
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('should remove listeners via returned unsubscribe function', () => {
      let count = 0;
      const unsubscribe = fs.subscribe(() => count++);
      
      fs.createFile(fs.rootId, 'file1.txt');
      expect(count).toBe(1);
      
      unsubscribe();
      
      fs.createFile(fs.rootId, 'file2.txt');
      expect(count).toBe(1); // No change
    });

    it('should remove listeners via unsubscribe method', () => {
      let count = 0;
      const listener = () => count++;
      
      fs.subscribe(listener);
      fs.createFile(fs.rootId, 'file1.txt');
      expect(count).toBe(1);
      
      fs.unsubscribe(listener);
      fs.createFile(fs.rootId, 'file2.txt');
      expect(count).toBe(1); // No change
    });

    it('should not crash if a listener throws an error', () => {
      const goodListener = vi.fn();
      const badListener = () => { throw new Error('Bad listener'); };
      
      fs.subscribe(badListener);
      fs.subscribe(goodListener);
      
      expect(() => {
        fs.createFile(fs.rootId, 'test.txt');
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('7. Ensuring returned data cannot modify the SDK\'s internal state', () => {
    it('should return frozen items', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      
      expect(Object.isFrozen(file)).toBe(true);
    });

    it('should return frozen tree', () => {
      const tree = fs.getTree();
      
      expect(Object.isFrozen(tree)).toBe(true);
      expect(Object.isFrozen(tree.children)).toBe(true);
    });

    it('should not allow modification of returned items', () => {
      const file = fs.createFile(fs.rootId, 'test.txt');
      
      expect(() => {
        file.name = 'hacked.txt';
      }).toThrow();
      
      const retrieved = fs.getItem(file.id);
      expect(retrieved.name).toBe('test.txt');
    });

    it('should not allow modification of children arrays', () => {
      const tree = fs.getTree();
      
      expect(() => {
        tree.children.push({ id: 'fake', name: 'fake' });
      }).toThrow();
    });

    it('should return referentially stable tree when unchanged', () => {
      const tree1 = fs.getTree();
      const tree2 = fs.getTree();
      
      expect(tree1).toBe(tree2); // Same reference
    });

    it('should return new tree reference after mutations', () => {
      const tree1 = fs.getTree();
      
      fs.createFile(fs.rootId, 'test.txt');
      
      const tree2 = fs.getTree();
      expect(tree1).not.toBe(tree2);
    });

    it('should preserve unchanged subtrees (structural sharing)', () => {
      const folder1 = fs.createFolder(fs.rootId, 'Folder1');
      const folder2 = fs.createFolder(fs.rootId, 'Folder2');
      fs.createFile(folder1.id, 'file1.txt');
      
      const tree1 = fs.getTree();
      const folder2Node1 = tree1.children.find(c => c.id === folder2.id);
      
      // Modify folder1, folder2 should remain unchanged
      fs.createFile(folder1.id, 'file2.txt');
      
      const tree2 = fs.getTree();
      const folder2Node2 = tree2.children.find(c => c.id === folder2.id);
      
      // Folder2 should have the same reference (structural sharing)
      expect(folder2Node1).toBe(folder2Node2);
    });
  });

  describe('Additional SDK functionality', () => {
    it('should provide version tracking', () => {
      const v1 = fs.getVersion();
      
      fs.createFile(fs.rootId, 'test.txt');
      const v2 = fs.getVersion();
      
      expect(v2).toBeGreaterThan(v1);
    });

    it('should provide path utilities', () => {
      // Clear existing children first
      const tree = fs.getTree();
      tree.children.forEach(child => {
        try {
          fs.delete(child.id);
        } catch (e) {
          // Ignore
        }
      });
      
      const folder = fs.createFolder(fs.rootId, 'Documents');
      const file = fs.createFile(folder.id, 'report.pdf');
      
      const path = fs.getPath(file.id);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(fs.rootId);
      expect(path[1].id).toBe(folder.id);
      expect(path[2].id).toBe(file.id);
      
      const pathString = fs.getPathString(file.id);
      expect(pathString).toBe('My Files/Documents/report.pdf');
    });

    it('should handle custom initial tree', () => {
      const customTree = {
        id: 'custom-root',
        name: 'Custom Root',
        type: ItemType.FOLDER,
        children: [
          { id: 'file1', name: 'File 1.txt', type: ItemType.FILE },
        ],
      };
      
      const customFs = new FileExplorer({ initialTree: customTree });
      
      expect(customFs.rootId).toBe('custom-root');
      const tree = customFs.getTree();
      expect(tree.name).toBe('Custom Root');
      expect(tree.children).toHaveLength(1);
    });
  });

  /* ------------------------ Atomic Transactions ---------------------------- */

  describe('Atomic Transactions (Bonus Feature 6.1)', () => {
    it('should begin a transaction', () => {
      const tx = fs.beginTransaction();
      expect(tx).toBeDefined();
      expect(tx.isActive).toBe(true);
      expect(tx.operationCount).toBe(0);
    });

    it('should collect operations without applying them', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'test.txt');
      tx.createFolder(fs.rootId, 'Test Folder');
      
      expect(tx.operationCount).toBe(2);
      expect(tx.isActive).toBe(true);
      
      // Operations not yet applied
      const tree = fs.getTree();
      expect(tree.children.find(c => c.name === 'test.txt')).toBeUndefined();
    });

    it('should commit all operations atomically', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'file1.txt');
      tx.createFolder(fs.rootId, 'Folder1');
      
      const result = tx.commit();
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(fs.getItem(result.results[0].id)).toBeDefined();
      expect(fs.getItem(result.results[1].id)).toBeDefined();
      expect(tx.isActive).toBe(false);
    });

    it('should rollback all operations on failure', () => {
      // Create a file first
      fs.createFile(fs.rootId, 'existing.txt');
      
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'new-file.txt');
      tx.createFile(fs.rootId, 'existing.txt'); // This will fail
      tx.createFolder(fs.rootId, 'New Folder');
      
      const result = tx.commit();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('DUPLICATE_NAME');
      
      // No operations should be applied
      const tree = fs.getTree();
      expect(tree.children.find(c => c.name === 'new-file.txt')).toBeUndefined();
      expect(tree.children.find(c => c.name === 'New Folder')).toBeUndefined();
    });

    it('should create single undo history entry for transaction', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'file1.txt');
      tx.createFile(fs.rootId, 'file2.txt');
      tx.createFolder(fs.rootId, 'Folder1');
      tx.commit();
      
      // Should only be able to undo once (the entire transaction)
      expect(fs.canUndo()).toBe(true);
      fs.undo();
      
      // All operations should be undone
      const tree = fs.getTree();
      expect(tree.children.find(c => c.name === 'file1.txt')).toBeUndefined();
      expect(tree.children.find(c => c.name === 'file2.txt')).toBeUndefined();
      expect(tree.children.find(c => c.name === 'Folder1')).toBeUndefined();
    });

    it('should redo entire transaction', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'tx-file.txt');
      tx.commit();
      
      fs.undo();
      expect(fs.getTree().children.find(c => c.name === 'tx-file.txt')).toBeUndefined();
      
      fs.redo();
      expect(fs.getTree().children.find(c => c.name === 'tx-file.txt')).toBeDefined();
    });

    it('should notify subscribers once for transaction', () => {
      const events = [];
      const unsubscribe = fs.subscribe((e) => events.push(e));
      
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'file1.txt');
      tx.createFile(fs.rootId, 'file2.txt');
      tx.commit();
      
      // Should only notify once for the entire transaction
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('transaction');
      expect(events[0].operations).toHaveLength(2);
      
      unsubscribe();
    });

    it('should support rollback on transaction', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'test.txt');
      
      tx.rollback();
      
      expect(tx.isActive).toBe(false);
      expect(fs.getTree().children.find(c => c.name === 'test.txt')).toBeUndefined();
    });

    it('should throw error when using committed transaction', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'test.txt');
      tx.commit();
      
      expect(() => tx.createFile(fs.rootId, 'another.txt')).toThrow('already committed');
      expect(() => tx.commit()).toThrow('already committed');
    });

    it('should throw error when using rolled back transaction', () => {
      const tx = fs.beginTransaction();
      tx.createFile(fs.rootId, 'test.txt');
      tx.rollback();
      
      expect(() => tx.createFile(fs.rootId, 'another.txt')).toThrow('already rolled back');
    });

    it('should handle move and delete in transaction', () => {
      const folder = fs.createFolder(fs.rootId, 'Folder');
      const file = fs.createFile(fs.rootId, 'file.txt');
      
      const tx = fs.beginTransaction();
      tx.move(file.id, folder.id);
      tx.delete(folder.id); // This should delete both folder and the moved file
      
      const result = tx.commit();
      
      expect(result.success).toBe(true);
      expect(fs.getItem(folder.id)).toBeNull();
      expect(fs.getItem(file.id)).toBeNull();
    });

    it('should handle empty transaction', () => {
      const tx = fs.beginTransaction();
      const result = tx.commit();
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('should preserve undo history limit for transactions', () => {
      const smallFs = new FileExplorer({ historyLimit: 2 });
      
      const tx1 = smallFs.beginTransaction();
      tx1.createFile(smallFs.rootId, 'file1.txt').commit();
      
      const tx2 = smallFs.beginTransaction();
      tx2.createFile(smallFs.rootId, 'file2.txt').commit();
      
      const tx3 = smallFs.beginTransaction();
      tx3.createFile(smallFs.rootId, 'file3.txt').commit();
      
      // Should only be able to undo 2 times (history limit)
      expect(smallFs.canUndo()).toBe(true);
      smallFs.undo();
      expect(smallFs.canUndo()).toBe(true);
      smallFs.undo();
      expect(smallFs.canUndo()).toBe(false);
    });
  });
});
