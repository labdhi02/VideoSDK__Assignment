import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileExplorer } from './useFileExplorer.js';
import { fs } from '../explorer.js';

describe('useFileExplorer Hook', () => {
  let onError;

  beforeEach(() => {
    // Reset the SDK to initial state
    while (fs.canUndo()) {
      fs.undo();
    }
    
    // Clear any existing items (except default tree)
    const tree = fs.getTree();
    tree.children.forEach(child => {
      try {
        fs.delete(child.id);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    
    onError = vi.fn();
  });

  describe('8. React subscription cleanup, UI updates, and error handling', () => {
    it('should subscribe to SDK changes and cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useFileExplorer(onError));
      
      const initialTree = result.current.tree;
      expect(initialTree).toBeDefined();
      
      // Trigger a change
      act(() => {
        fs.createFile(fs.rootId, 'test.txt');
      });
      
      // Tree should update
      expect(result.current.tree).not.toBe(initialTree);
      
      // Cleanup should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('should update tree when SDK changes', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      const initialChildCount = result.current.tree.children.length;
      
      act(() => {
        fs.createFile(fs.rootId, 'new-file.txt');
      });
      
      expect(result.current.tree.children.length).toBe(initialChildCount + 1);
    });

    it('should update canUndo state when operations are performed', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      // Initially may have history from default tree
      const initialCanUndo = result.current.canUndo;
      
      act(() => {
        fs.createFile(fs.rootId, 'test.txt');
      });
      
      expect(result.current.canUndo).toBe(true);
    });

    it('should update canRedo state after undo', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        fs.createFile(fs.rootId, 'test.txt');
      });
      
      expect(result.current.canRedo).toBe(false);
      
      act(() => {
        fs.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
    });

    it('should handle errors from SDK operations', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        // Try to create a file with invalid name
        result.current.actions.createFile(fs.rootId, '');
      });
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('Name cannot be empty');
    });

    it('should handle errors when creating duplicate names', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        result.current.actions.createFile(fs.rootId, 'test.txt');
      });
      
      onError.mockClear();
      
      act(() => {
        result.current.actions.createFile(fs.rootId, 'test.txt');
      });
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('already exists');
    });

    it('should handle errors when moving folder into itself', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      let folderId;
      act(() => {
        const folder = fs.createFolder(fs.rootId, 'Test Folder');
        folderId = folder.id;
      });
      
      act(() => {
        result.current.actions.move(folderId, folderId);
      });
      
      expect(onError).toHaveBeenCalled();
    });

    it('should handle errors when renaming to invalid name', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      let fileId;
      act(() => {
        const file = fs.createFile(fs.rootId, 'test.txt');
        fileId = file.id;
      });
      
      act(() => {
        result.current.actions.rename(fileId, 'invalid/name.txt');
      });
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('cannot contain');
    });

    it('should handle errors when deleting non-existent item', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        result.current.actions.delete('non-existent-id');
      });
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toContain('not found');
    });

    it('should provide all SDK action methods', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      expect(result.current.actions).toHaveProperty('createFile');
      expect(result.current.actions).toHaveProperty('createFolder');
      expect(result.current.actions).toHaveProperty('rename');
      expect(result.current.actions).toHaveProperty('move');
      expect(result.current.actions).toHaveProperty('delete');
      expect(result.current.actions).toHaveProperty('undo');
      expect(result.current.actions).toHaveProperty('redo');
      expect(result.current.actions).toHaveProperty('search');
      expect(result.current.actions).toHaveProperty('getItem');
      expect(result.current.actions).toHaveProperty('getPath');
      expect(result.current.actions).toHaveProperty('getPathString');
    });

    it('should memoize actions to prevent unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => useFileExplorer(onError));
      
      const actions1 = result.current.actions;
      
      // Force a re-render
      rerender();
      
      const actions2 = result.current.actions;
      
      // Actions should be the same reference
      expect(actions1).toBe(actions2);
    });

    it('should handle search with options', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        fs.createFile(fs.rootId, 'test.txt');
        fs.createFolder(fs.rootId, 'test-folder');
      });
      
      const allResponse = result.current.actions.search('test', { type: 'all' });
      expect(allResponse.results.length).toBeGreaterThanOrEqual(2);
      
      const fileResponse = result.current.actions.search('test', { type: 'file' });
      expect(fileResponse.results.every(r => r.type === 'file')).toBe(true);
      
      const folderResponse = result.current.actions.search('test', { type: 'folder' });
      expect(folderResponse.results.every(r => r.type === 'folder')).toBe(true);
    });

    it('should return rootId', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      expect(result.current.rootId).toBeDefined();
      expect(result.current.rootId).toBe(fs.rootId);
    });

    it('should handle rapid consecutive operations', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      act(() => {
        result.current.actions.createFile(fs.rootId, 'file1.txt');
        result.current.actions.createFile(fs.rootId, 'file2.txt');
        result.current.actions.createFile(fs.rootId, 'file3.txt');
      });
      
      expect(result.current.tree.children.length).toBeGreaterThanOrEqual(3);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should maintain referential stability of tree when no changes occur', () => {
      const { result, rerender } = renderHook(() => useFileExplorer(onError));
      
      const tree1 = result.current.tree;
      
      // Force re-render without SDK changes
      rerender();
      
      const tree2 = result.current.tree;
      
      // Tree should be the same reference (performance optimization)
      expect(tree1).toBe(tree2);
    });

    it('should handle undo/redo through actions', () => {
      const { result } = renderHook(() => useFileExplorer(onError));
      
      let fileId;
      act(() => {
        const file = fs.createFile(fs.rootId, 'test.txt');
        fileId = file.id;
      });
      
      expect(result.current.actions.getItem(fileId)).toBeDefined();
      
      act(() => {
        result.current.actions.undo();
      });
      
      expect(result.current.actions.getItem(fileId)).toBeNull();
      
      act(() => {
        result.current.actions.redo();
      });
      
      expect(result.current.actions.getItem(fileId)).toBeDefined();
    });

    it('should not create duplicate subscriptions on re-render', () => {
      const { rerender } = renderHook(() => useFileExplorer(onError));
      
      // Track how many times listeners are called
      let callCount = 0;
      const testListener = () => callCount++;
      fs.subscribe(testListener);
      
      // Re-render multiple times
      rerender();
      rerender();
      rerender();
      
      // Make a change
      act(() => {
        fs.createFile(fs.rootId, 'test.txt');
      });
      
      // Our test listener should only be called once per change
      expect(callCount).toBe(1);
      
      fs.unsubscribe(testListener);
    });

    it('should handle null onError callback gracefully', () => {
      const { result } = renderHook(() => useFileExplorer(null));
      
      expect(() => {
        act(() => {
          result.current.actions.createFile(fs.rootId, ''); // Invalid
        });
      }).not.toThrow();
    });

    it('should handle undefined onError callback gracefully', () => {
      const { result } = renderHook(() => useFileExplorer(undefined));
      
      expect(() => {
        act(() => {
          result.current.actions.createFile(fs.rootId, ''); // Invalid
        });
      }).not.toThrow();
    });
  });
});
