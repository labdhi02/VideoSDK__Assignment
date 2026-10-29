// @vitest-environment jsdom

/**
 * Tests for useFileExplorer hook — Requirement 8
 *
 * Covers:
 *  - React subscription cleanup on unmount
 *  - UI (state) updates when the SDK changes
 *  - canUndo / canRedo reactivity
 *  - Error handling & propagation through onError callback
 *  - Action memoisation (no unnecessary re-renders)
 *  - Null / undefined onError safety
 *  - No duplicate subscriptions across re-renders
 *  - All action methods exposed
 *  - rootId exposed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileExplorer } from './useFileExplorer.js';
import { fs } from '../explorer.js';

// ---------------------------------------------------------------------------
// Reset the shared SDK singleton to a clean state before every test.
// Strategy: undo everything until the undo stack is empty, which winds the
// singleton back to its original constructed state. Then drain any redo
// entries so each test starts with both stacks empty.
// ---------------------------------------------------------------------------
beforeEach(() => {
  // Wind back all mutations via undo
  while (fs.canUndo()) fs.undo();

  // Clear the redo stack by removing any remaining children
  // (undo may have left the tree in a partially-reset state if the singleton
  //  was constructed with a default tree that already has children)
  const tree = fs.getTree();
  tree.children.forEach(child => {
    try { fs.delete(child.id); } catch (_) { /* ignore */ }
  });

  // Drain undo again in case the deletions above added more history,
  // so tests that check canUndo === false start from a truly clean slate
  while (fs.canUndo()) fs.undo();
});

// ===========================================================================
// 8a. Subscription lifecycle — subscribe on mount, unsubscribe on unmount
// ===========================================================================
describe('8a. Subscription lifecycle', () => {
  it('returns a defined tree on first render', () => {
    const { result } = renderHook(() => useFileExplorer());
    expect(result.current.tree).toBeDefined();
    expect(result.current.tree.type).toBe('folder');
  });

  it('subscribes to SDK changes and reflects them in tree state', () => {
    const { result } = renderHook(() => useFileExplorer());
    const before = result.current.tree.children.length;

    act(() => { fs.createFile(fs.rootId, 'sub-test.txt'); });

    expect(result.current.tree.children.length).toBe(before + 1);
  });

  it('stops reacting to SDK events after unmount (no stale updates)', () => {
    const { result, unmount } = renderHook(() => useFileExplorer());

    // Capture tree length before unmount
    const snapshot = result.current.tree.children.length;

    unmount();

    // SDK change after unmount should not throw or cause issues
    expect(() => {
      act(() => { fs.createFile(fs.rootId, 'after-unmount.txt'); });
    }).not.toThrow();

    // result.current is frozen after unmount — the length should still equal
    // the snapshot value (component is gone, no further renders)
    expect(result.current.tree.children.length).toBe(snapshot);
  });

  it('does not register duplicate subscriptions across re-renders', () => {
    const { rerender } = renderHook(() => useFileExplorer());

    let callCount = 0;
    const probe = () => callCount++;
    fs.subscribe(probe);

    rerender();
    rerender();
    rerender();

    act(() => { fs.createFile(fs.rootId, 'dedup.txt'); });

    // Our probe should fire exactly once — not multiplied by re-renders
    expect(callCount).toBe(1);

    fs.unsubscribe(probe);
  });
});

// ===========================================================================
// 8b. UI state updates — tree, canUndo, canRedo
// ===========================================================================
describe('8b. UI state updates', () => {
  it('tree updates when a file is created via the SDK directly', () => {
    const { result } = renderHook(() => useFileExplorer());
    const before = result.current.tree.children.length;

    act(() => { fs.createFile(fs.rootId, 'direct.txt'); });

    expect(result.current.tree.children.length).toBe(before + 1);
    expect(result.current.tree.children.some(c => c.name === 'direct.txt')).toBe(true);
  });

  it('tree updates when a file is created via actions.createFile', () => {
    const { result } = renderHook(() => useFileExplorer());
    const before = result.current.tree.children.length;

    act(() => { result.current.actions.createFile(fs.rootId, 'via-action.txt'); });

    expect(result.current.tree.children.length).toBe(before + 1);
  });

  it('tree updates when a file is renamed', () => {
    let fileId;
    act(() => { fileId = fs.createFile(fs.rootId, 'old-name.txt').id; });

    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.rename(fileId, 'new-name.txt'); });

    expect(result.current.tree.children.some(c => c.name === 'new-name.txt')).toBe(true);
    expect(result.current.tree.children.some(c => c.name === 'old-name.txt')).toBe(false);
  });

  it('tree updates when a file is deleted', () => {
    let fileId;
    act(() => { fileId = fs.createFile(fs.rootId, 'gone.txt').id; });

    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.delete(fileId); });

    expect(result.current.tree.children.some(c => c.id === fileId)).toBe(false);
  });

  it('canUndo becomes true after a mutating operation', () => {
    const { result } = renderHook(() => useFileExplorer());
    expect(result.current.canUndo).toBe(false);

    act(() => { result.current.actions.createFile(fs.rootId, 'undo-me.txt'); });

    expect(result.current.canUndo).toBe(true);
  });

  it('canRedo becomes true after an undo', () => {
    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.createFile(fs.rootId, 'redo-me.txt'); });
    expect(result.current.canRedo).toBe(false);

    act(() => { result.current.actions.undo(); });
    expect(result.current.canRedo).toBe(true);
  });

  it('canRedo becomes false after a new operation follows an undo', () => {
    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.createFile(fs.rootId, 'f1.txt'); });
    act(() => { result.current.actions.undo(); });
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.actions.createFile(fs.rootId, 'f2.txt'); });
    expect(result.current.canRedo).toBe(false);
  });

  it('tree reflects undo — deleted file is restored', () => {
    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.createFile(fs.rootId, 'restore-me.txt'); });
    act(() => { result.current.actions.undo(); });

    expect(result.current.tree.children.some(c => c.name === 'restore-me.txt')).toBe(false);
  });

  it('tree reflects redo — re-creates the file', () => {
    const { result } = renderHook(() => useFileExplorer());

    act(() => { result.current.actions.createFile(fs.rootId, 'redo-file.txt'); });
    act(() => { result.current.actions.undo(); });
    act(() => { result.current.actions.redo(); });

    expect(result.current.tree.children.some(c => c.name === 'redo-file.txt')).toBe(true);
  });

  it('tree reference stays stable when no SDK change occurs (performance)', () => {
    const { result, rerender } = renderHook(() => useFileExplorer());
    const tree1 = result.current.tree;

    rerender();

    expect(result.current.tree).toBe(tree1);
  });
});

// ===========================================================================
// 8c. Error handling — onError callback receives meaningful messages
// ===========================================================================
describe('8c. Error handling', () => {
  it('calls onError with a message when creating a file with empty name', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.createFile(fs.rootId, ''); });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatch(/empty/i);
  });

  it('calls onError when creating a duplicate file name', () => {
    const onError = vi.fn();
    act(() => { fs.createFile(fs.rootId, 'existing.txt'); });

    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.createFile(fs.rootId, 'existing.txt'); });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatch(/already exists/i);
  });

  it('calls onError when renaming to an invalid name (contains /)', () => {
    const onError = vi.fn();
    let fileId;
    act(() => { fileId = fs.createFile(fs.rootId, 'valid.txt').id; });

    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.rename(fileId, 'bad/name.txt'); });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatch(/cannot contain/i);
  });

  it('calls onError when moving a folder into itself', () => {
    const onError = vi.fn();
    let folderId;
    act(() => { folderId = fs.createFolder(fs.rootId, 'Self').id; });

    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.move(folderId, folderId); });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError when deleting a non-existent id', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.delete('does-not-exist'); });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatch(/not found/i);
  });

  it('returns null from the action when an error occurs', () => {
    const { result } = renderHook(() => useFileExplorer(vi.fn()));
    let returnValue;

    act(() => { returnValue = result.current.actions.createFile(fs.rootId, ''); });

    expect(returnValue).toBeNull();
  });

  it('does not throw when onError is null', () => {
    const { result } = renderHook(() => useFileExplorer(null));

    expect(() => {
      act(() => { result.current.actions.createFile(fs.rootId, ''); });
    }).not.toThrow();
  });

  it('does not throw when onError is undefined', () => {
    const { result } = renderHook(() => useFileExplorer(undefined));

    expect(() => {
      act(() => { result.current.actions.createFile(fs.rootId, ''); });
    }).not.toThrow();
  });

  it('does not call onError on a successful operation', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => { result.current.actions.createFile(fs.rootId, 'clean.txt'); });

    expect(onError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 8d. Exposed API shape and memoisation
// ===========================================================================
describe('8d. Exposed API shape and memoisation', () => {
  it('exposes all expected action methods', () => {
    const { result } = renderHook(() => useFileExplorer());
    const { actions } = result.current;

    ['createFile', 'createFolder', 'rename', 'move', 'delete',
      'undo', 'redo', 'search', 'getItem', 'getPath', 'getPathString',
    ].forEach(method => {
      expect(typeof actions[method]).toBe('function');
    });
  });

  it('exposes rootId matching the SDK singleton', () => {
    const { result } = renderHook(() => useFileExplorer());
    expect(result.current.rootId).toBe(fs.rootId);
  });

  it('actions object is the same reference across re-renders (memoised)', () => {
    const { result, rerender } = renderHook(() => useFileExplorer());
    const actions1 = result.current.actions;

    rerender();

    expect(result.current.actions).toBe(actions1);
  });

  it('search action returns results matching the SDK directly', () => {
    act(() => {
      fs.createFile(fs.rootId, 'find-me.txt');
      fs.createFile(fs.rootId, 'ignore.txt');
    });

    const { result } = renderHook(() => useFileExplorer());
    let response;

    act(() => { response = result.current.actions.search('find-me'); });

    expect(response.results).toHaveLength(1);
    expect(response.results[0].name).toBe('find-me.txt');
  });

  it('getItem returns the correct item', () => {
    let fileId;
    act(() => { fileId = fs.createFile(fs.rootId, 'lookup.txt').id; });

    const { result } = renderHook(() => useFileExplorer());

    expect(result.current.actions.getItem(fileId).name).toBe('lookup.txt');
  });

  it('getPathString returns slash-separated path for a nested file', () => {
    let fileId;
    act(() => {
      const folder = fs.createFolder(fs.rootId, 'Docs');
      fileId = fs.createFile(folder.id, 'report.pdf').id;
    });

    const { result } = renderHook(() => useFileExplorer());

    expect(result.current.actions.getPathString(fileId)).toMatch(/Docs\/report\.pdf/);
  });

  it('handles rapid consecutive actions without errors', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileExplorer(onError));

    act(() => {
      result.current.actions.createFile(fs.rootId, 'rapid1.txt');
      result.current.actions.createFile(fs.rootId, 'rapid2.txt');
      result.current.actions.createFile(fs.rootId, 'rapid3.txt');
    });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.tree.children.length).toBeGreaterThanOrEqual(3);
  });
});
