import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { fs } from './explorer.js';

describe('App Integration Tests', () => {
  beforeEach(() => {
    // Reset SDK to initial state
    while (fs.canUndo()) {
      fs.undo();
    }
    
    // Clear any test items
    const tree = fs.getTree();
    tree.children.forEach(child => {
      try {
        fs.delete(child.id);
      } catch (e) {
        // Ignore
      }
    });
  });

  describe('Integration: UI updates on SDK changes', () => {
    it('should render the file tree', () => {
      render(<App />);
      
      expect(screen.getByText('My Files')).toBeInTheDocument();
    });

    it('should create a new file through UI', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText('📄 New File'));
      
      // Dialog should appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      });
      
      await user.type(screen.getByPlaceholderText('Enter name...'), 'test.txt');
      await user.click(screen.getByText('Confirm'));
      
      // File should appear in tree
      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument();
      });
    });

    it('should create a new folder through UI', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText('📁 New Folder'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      });
      
      await user.type(screen.getByPlaceholderText('Enter name...'), 'New Folder');
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(screen.getByText('New Folder')).toBeInTheDocument();
      });
    });

    it('should show error for invalid file names', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText('📄 New File'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      });
      
      await user.type(screen.getByPlaceholderText('Enter name...'), 'invalid/name.txt');
      await user.click(screen.getByText('Confirm'));
      
      // Error should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show error for duplicate names', async () => {
      const user = userEvent.setup();
      
      // Create a file first
      fs.createFile(fs.rootId, 'existing.txt');
      
      render(<App />);
      
      await user.click(screen.getByText('📄 New File'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      });
      
      await user.type(screen.getByPlaceholderText('Enter name...'), 'existing.txt');
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });

    it('should select a file when clicked', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'selectable.txt');
      
      render(<App />);
      
      const file = screen.getByText('selectable.txt');
      await user.click(file);
      
      // File should be selected - check that it's in the document
      expect(file).toBeInTheDocument();
      
      // The rename button should now be enabled since we have a selection
      const renameButton = screen.getByText('✏️ Rename');
      expect(renameButton).not.toBeDisabled();
    });

    it('should expand/collapse folders', async () => {
      const user = userEvent.setup();
      
      const folder = fs.createFolder(fs.rootId, 'Test Folder');
      fs.createFile(folder.id, 'nested.txt');
      
      render(<App />);
      
      // Initially collapsed, nested file should not be visible
      expect(screen.queryByText('nested.txt')).not.toBeInTheDocument();
      
      // Click toggle to expand
      const toggleButtons = screen.getAllByLabelText('Expand');
      await user.click(toggleButtons[toggleButtons.length - 1]); // Click the last expand button (Test Folder)
      
      // Now nested file should be visible
      await waitFor(() => {
        expect(screen.getByText('nested.txt')).toBeInTheDocument();
      });
      
      // Click again to collapse - the button text changes to "Collapse"
      const collapseButtons = screen.getAllByLabelText('Collapse');
      await user.click(collapseButtons[collapseButtons.length - 1]); // Click the Test Folder collapse button
      
      // Nested file should be hidden again
      await waitFor(() => {
        expect(screen.queryByText('nested.txt')).not.toBeInTheDocument();
      });
    });

    it('should support undo/redo through toolbar', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Create a file
      await user.click(screen.getByText('📄 New File'));
      await waitFor(() => screen.getByPlaceholderText('Enter name...'));
      await user.type(screen.getByPlaceholderText('Enter name...'), 'undo-test.txt');
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(screen.getByText('undo-test.txt')).toBeInTheDocument();
      });
      
      // Undo
      await user.click(screen.getByText('↶ Undo'));
      
      await waitFor(() => {
        expect(screen.queryByText('undo-test.txt')).not.toBeInTheDocument();
      });
      
      // Redo
      await user.click(screen.getByText('↷ Redo'));
      
      await waitFor(() => {
        expect(screen.getByText('undo-test.txt')).toBeInTheDocument();
      });
    });

    it('should support keyboard shortcuts for undo (Ctrl+Z)', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'keyboard-test.txt');
      
      render(<App />);
      
      expect(screen.getByText('keyboard-test.txt')).toBeInTheDocument();
      
      // Press Ctrl+Z
      await user.keyboard('{Control>}z{/Control}');
      
      await waitFor(() => {
        expect(screen.queryByText('keyboard-test.txt')).not.toBeInTheDocument();
      });
    });

    it('should support rename through double-click', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'old-name.txt');
      
      render(<App />);
      
      // Double-click to rename - this will open the rename dialog
      const fileNode = screen.getByText('old-name.txt');
      await user.dblClick(fileNode);
      
      // The rename dialog should appear with the current name pre-filled
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter name...');
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('old-name.txt');
      });
      
      const input = screen.getByPlaceholderText('Enter name...');
      await user.clear(input);
      await user.type(input, 'new-name.txt');
      await user.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(screen.getByText('new-name.txt')).toBeInTheDocument();
      });
    });

    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'delete-me.txt');
      
      render(<App />);
      
      // Select the file
      await user.click(screen.getByText('delete-me.txt'));
      
      // Click delete button
      await user.click(screen.getByText('🗑️ Delete'));
      
      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
      });
    });

    it('should delete file after confirmation', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'delete-me.txt');
      
      render(<App />);
      
      // Select and delete
      await user.click(screen.getByText('delete-me.txt'));
      await user.click(screen.getByText('🗑️ Delete'));
      
      // Confirm
      await waitFor(() => screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      
      // File should be gone
      await waitFor(() => {
        expect(screen.queryByText('delete-me.txt')).not.toBeInTheDocument();
      });
    });

    it('should show descendant count in delete confirmation for folders', async () => {
      const user = userEvent.setup();
      
      const folder = fs.createFolder(fs.rootId, 'Delete Folder');
      fs.createFile(folder.id, 'child1.txt');
      fs.createFile(folder.id, 'child2.txt');
      
      render(<App />);
      
      // Expand folder and select it
      await user.click(screen.getByLabelText('Expand'));
      await user.click(screen.getByText('Delete Folder'));
      
      // Click delete
      await user.click(screen.getByText('🗑️ Delete'));
      
      // Should show count of descendants
      await waitFor(() => {
        expect(screen.getByText(/2 nested items/i)).toBeInTheDocument();
      });
    });

    it('should search for files and folders', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'searchable.txt');
      fs.createFolder(fs.rootId, 'Search Folder');
      
      render(<App />);
      
      // Type in search box
      const searchInput = screen.getByPlaceholderText('Search files and folders...');
      await user.type(searchInput, 'search');
      
      // Wait for debounced search
      await waitFor(() => {
        expect(screen.getByText('searchable.txt')).toBeInTheDocument();
        expect(screen.getByText('Search Folder')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should filter search results by type', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'test-file.txt');
      fs.createFolder(fs.rootId, 'Test Folder');
      
      render(<App />);
      
      // Search
      await user.type(screen.getByPlaceholderText('Search files and folders...'), 'test');
      
      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
      }, { timeout: 500 });
      
      // Filter by files only
      await user.click(screen.getByText('Files'));
      
      await waitFor(() => {
        expect(screen.getByText('test-file.txt')).toBeInTheDocument();
        expect(screen.queryByText('Test Folder')).not.toBeInTheDocument();
      });
    });

    it('should show breadcrumb for selected item', async () => {
      const user = userEvent.setup();
      
      const folder = fs.createFolder(fs.rootId, 'Documents');
      const file = fs.createFile(folder.id, 'report.pdf');
      
      render(<App />);
      
      // Expand folder
      await user.click(screen.getByLabelText('Expand'));
      
      // Select file
      await user.click(screen.getByText('report.pdf'));
      
      // Breadcrumb should show full path
      await waitFor(() => {
        const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
        expect(breadcrumb).toBeInTheDocument();
      });
    });

    it('should show toast notification for successful operations', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText('📄 New File'));
      await waitFor(() => screen.getByPlaceholderText('Enter name...'));
      await user.type(screen.getByPlaceholderText('Enter name...'), 'toast-test.txt');
      await user.click(screen.getByText('Confirm'));
      
      // Toast should appear briefly
      await waitFor(() => {
        expect(screen.getByText(/Created toast-test.txt/i)).toBeInTheDocument();
      });
    });

    it('should dismiss error banner when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Trigger an error by trying to create duplicate
      fs.createFile(fs.rootId, 'existing.txt');
      
      await user.click(screen.getByText('📄 New File'));
      await waitFor(() => screen.getByPlaceholderText('Enter name...'));
      await user.type(screen.getByPlaceholderText('Enter name...'), 'existing.txt');
      await user.click(screen.getByText('Confirm'));
      
      // Wait for error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Click dismiss
      const dismissButton = screen.getByLabelText('Dismiss error');
      await user.click(dismissButton);
      
      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should handle ESC key to close dialogs', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      await user.click(screen.getByText('📄 New File'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument();
      });
      
      // Press ESC
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter name...')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons appropriately based on state', () => {
      render(<App />);
      
      // Initially no selection, so rename and delete should be disabled
      const renameButton = screen.getByText('✏️ Rename');
      const deleteButton = screen.getByText('🗑️ Delete');
      
      expect(renameButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('should enable undo button after operations', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'test.txt');
      
      render(<App />);
      
      const undoButton = screen.getByText('↶ Undo');
      
      // Undo should be enabled since we created a file
      expect(undoButton).not.toBeDisabled();
    });

    it('should clear selection when deleting selected item', async () => {
      const user = userEvent.setup();
      
      fs.createFile(fs.rootId, 'selected.txt');
      
      render(<App />);
      
      // Select file  
      const fileNode = screen.getByText('selected.txt');
      await user.click(fileNode);
      
      // Verify selection - rename button should be enabled
      const renameButton = screen.getByText('✏️ Rename');
      expect(renameButton).not.toBeDisabled();
      
      // Delete it
      await user.click(screen.getByText('🗑️ Delete'));
      await waitFor(() => screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      
      await waitFor(() => {
        expect(screen.queryByText('selected.txt')).not.toBeInTheDocument();
      });
      
      // Delete button should now be disabled (no selection)
      expect(screen.getByText('🗑️ Delete')).toBeDisabled();
    });
  });

  // ── Multi-selection & bulk delete ─────────────────────────────────────────
  describe('Multi-selection and bulk delete', () => {
    beforeEach(() => {
      while (fs.canUndo()) fs.undo();
      const tree = fs.getTree();
      tree.children.forEach(child => { try { fs.delete(child.id); } catch (e) { /* ignore */ } });
    });

    it('should show selected count badge when Ctrl-clicking multiple items', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'file-a.txt');
      fs.createFile(fs.rootId, 'file-b.txt');

      render(<App />);

      // fireEvent.click with ctrlKey reliably sets e.ctrlKey in jsdom
      fireEvent.click(screen.getByText('file-a.txt'), { ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('file-b.txt'), { ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
      });
    });

    it('should switch toolbar to bulk-delete mode when multiple items selected', async () => {
      fs.createFile(fs.rootId, 'bulk-a.txt');
      fs.createFile(fs.rootId, 'bulk-b.txt');

      render(<App />);

      fireEvent.click(screen.getByText('bulk-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('bulk-b.txt'), { ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/Delete 2 items/i)).toBeInTheDocument();
      });
    });

    it('should delete all selected items in one operation', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'del-a.txt');
      fs.createFile(fs.rootId, 'del-b.txt');
      fs.createFile(fs.rootId, 'del-c.txt');

      render(<App />);

      fireEvent.click(screen.getByText('del-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('del-b.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('del-c.txt'), { ctrlKey: true });

      await waitFor(() => screen.getByText(/Delete 3 items/i));
      await user.click(screen.getByText(/Delete 3 items/i));

      await waitFor(() => screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByText('del-a.txt')).not.toBeInTheDocument();
        expect(screen.queryByText('del-b.txt')).not.toBeInTheDocument();
        expect(screen.queryByText('del-c.txt')).not.toBeInTheDocument();
      });
    });

    it('should clear selection after successful bulk delete', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'clr-a.txt');
      fs.createFile(fs.rootId, 'clr-b.txt');

      render(<App />);

      fireEvent.click(screen.getByText('clr-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('clr-b.txt'), { ctrlKey: true });

      await waitFor(() => screen.getByText(/Delete 2 items/i));
      await user.click(screen.getByText(/Delete 2 items/i));
      await waitFor(() => screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      // After deletion the selected-count badge should be gone
      await waitFor(() => {
        expect(screen.queryByText(/\d+ selected/i)).not.toBeInTheDocument();
      });
    });

    it('should clear multi-selection when clicking the Clear button', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'x-a.txt');
      fs.createFile(fs.rootId, 'x-b.txt');

      render(<App />);

      fireEvent.click(screen.getByText('x-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('x-b.txt'), { ctrlKey: true });

      await waitFor(() => screen.getByText(/✕ Clear/i));
      await user.click(screen.getByText(/✕ Clear/i));

      await waitFor(() => {
        // Back to normal mode — single-select buttons visible again
        expect(screen.getByText('✏️ Rename')).toBeInTheDocument();
        expect(screen.getByText('🗑️ Delete')).toBeInTheDocument();
        // "Delete N items" bulk button gone
        expect(screen.queryByText(/Delete \d+ items/i)).not.toBeInTheDocument();
      });
    });

    it('should undo entire bulk delete as one operation', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'undo-bulk-a.txt');
      fs.createFile(fs.rootId, 'undo-bulk-b.txt');

      render(<App />);

      fireEvent.click(screen.getByText('undo-bulk-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('undo-bulk-b.txt'), { ctrlKey: true });

      await waitFor(() => screen.getByText(/Delete 2 items/i));
      await user.click(screen.getByText(/Delete 2 items/i));
      await waitFor(() => screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByText('undo-bulk-a.txt')).not.toBeInTheDocument();
      });

      // Single undo restores both (transaction = one undo entry)
      await user.click(screen.getByText('↶ Undo'));

      await waitFor(() => {
        expect(screen.getByText('undo-bulk-a.txt')).toBeInTheDocument();
        expect(screen.getByText('undo-bulk-b.txt')).toBeInTheDocument();
      });
    });

    it('should deselect individual items by Ctrl-clicking again', async () => {
      fs.createFile(fs.rootId, 'tog-a.txt');
      fs.createFile(fs.rootId, 'tog-b.txt');

      render(<App />);

      fireEvent.click(screen.getByText('tog-a.txt'), { ctrlKey: true });
      fireEvent.click(screen.getByText('tog-b.txt'), { ctrlKey: true });

      await waitFor(() => screen.getByText(/2 selected/i));

      // Ctrl-click again to deselect first item
      fireEvent.click(screen.getByText('tog-a.txt'), { ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
      });
    });
  });

  // ── Search sort + pagination ──────────────────────────────────────────────
  describe('Search sort and pagination', () => {
    beforeEach(() => {
      while (fs.canUndo()) fs.undo();
      const tree = fs.getTree();
      tree.children.forEach(child => { try { fs.delete(child.id); } catch (e) { /* ignore */ } });
    });

    it('should show sort controls when search is active', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.type(screen.getByPlaceholderText('Search files and folders...'), 'a');

      await waitFor(() => {
        expect(screen.getByText('Sort by:')).toBeInTheDocument();
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Path')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should show sort controls when a type filter is applied', async () => {
      const user = userEvent.setup();

      fs.createFile(fs.rootId, 'alpha.txt');

      render(<App />);

      await user.click(screen.getByText('Files'));

      await waitFor(() => {
        expect(screen.getByText('Sort by:')).toBeInTheDocument();
      });
    });

    it('should toggle sort direction when Asc/Desc button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.type(screen.getByPlaceholderText('Search files and folders...'), 'a');

      await waitFor(() => screen.getByText(/↑ Asc/i), { timeout: 500 });

      await user.click(screen.getByText(/↑ Asc/i));

      await waitFor(() => {
        expect(screen.getByText(/↓ Desc/i)).toBeInTheDocument();
      });
    });

    it('should hide sort controls when search is cleared', async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.type(screen.getByPlaceholderText('Search files and folders...'), 'a');
      await waitFor(() => screen.getByText('Sort by:'), { timeout: 500 });

      await user.click(screen.getByLabelText('Clear search'));

      await waitFor(() => {
        expect(screen.queryByText('Sort by:')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});
