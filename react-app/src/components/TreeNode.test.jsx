import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TreeNode from './TreeNode.jsx';

describe('TreeNode Component', () => {
  const mockNode = {
    id: 'test-file',
    name: 'Test File.txt',
    type: 'file',
    parentId: 'root',
  };

  const mockFolderNode = {
    id: 'test-folder',
    name: 'Test Folder',
    type: 'folder',
    parentId: 'root',
    children: [
      { id: 'child1', name: 'Child 1.txt', type: 'file', parentId: 'test-folder' },
      { id: 'child2', name: 'Child 2.txt', type: 'file', parentId: 'test-folder' },
    ],
  };

  const defaultProps = {
    node: mockNode,
    level: 0,
    isExpanded: false,
    isSelected: false,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
    expandedIds: new Set(),
    selectedId: null,
  };

  it('should render file node with name', () => {
    render(<TreeNode {...defaultProps} />);
    expect(screen.getByText('Test File.txt')).toBeInTheDocument();
  });

  it('should render folder node with name', () => {
    render(<TreeNode {...defaultProps} node={mockFolderNode} />);
    expect(screen.getByText('Test Folder')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    
    render(<TreeNode {...defaultProps} onSelect={onSelect} />);
    
    await user.click(screen.getByText('Test File.txt'));
    
    // onSelect is called with (id, { ctrlKey, shiftKey })
    expect(onSelect).toHaveBeenCalledWith('test-file', expect.objectContaining({ ctrlKey: false }));
  });

  it('should call onRename when double-clicked', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    
    render(<TreeNode {...defaultProps} onRename={onRename} />);
    
    await user.dblClick(screen.getByText('Test File.txt'));
    
    expect(onRename).toHaveBeenCalledWith('test-file');
  });

  it('should show selected state', () => {
    const { container } = render(<TreeNode {...defaultProps} isSelected={true} />);
    
    const selectedElement = container.querySelector('.selected');
    expect(selectedElement).toBeInTheDocument();
  });

  it('should render folder toggle button', () => {
    render(<TreeNode {...defaultProps} node={mockFolderNode} />);
    
    const toggleButton = screen.getByLabelText('Expand');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should call onToggle when folder toggle is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    
    render(<TreeNode {...defaultProps} node={mockFolderNode} onToggle={onToggle} />);
    
    await user.click(screen.getByLabelText('Expand'));
    
    expect(onToggle).toHaveBeenCalledWith('test-folder');
  });

  it('should render children when folder is expanded', () => {
    const expandedIds = new Set(['test-folder']);
    
    render(
      <TreeNode 
        {...defaultProps} 
        node={mockFolderNode} 
        isExpanded={true}
        expandedIds={expandedIds}
      />
    );
    
    expect(screen.getByText('Child 1.txt')).toBeInTheDocument();
    expect(screen.getByText('Child 2.txt')).toBeInTheDocument();
  });

  it('should not render children when folder is collapsed', () => {
    render(
      <TreeNode 
        {...defaultProps} 
        node={mockFolderNode} 
        isExpanded={false}
      />
    );
    
    expect(screen.queryByText('Child 1.txt')).not.toBeInTheDocument();
    expect(screen.queryByText('Child 2.txt')).not.toBeInTheDocument();
  });

  it('should render correct icon for file', () => {
    render(<TreeNode {...defaultProps} />);
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('should render correct icon for folder', () => {
    render(<TreeNode {...defaultProps} node={mockFolderNode} />);
    expect(screen.getByText('📁')).toBeInTheDocument();
  });

  it.skip('should support drag and drop on folders', async () => {
    const user = userEvent.setup();
    const onDragOver = vi.fn();
    const onDrop = vi.fn();
    
    render(
      <TreeNode 
        {...defaultProps} 
        node={mockFolderNode}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    );
    
    const folderElement = screen.getByText('Test Folder').parentElement;
    
    // Simulate drag over using user event
    await user.pointer([
      { keys: '[MouseLeft>]', target: folderElement },
      { coords: { x: 10, y: 10 } }
    ]);
    
    // onDragOver should be called when dragging over a folder
    expect(onDragOver).toHaveBeenCalled();
  });

  it('should apply correct indentation based on level', () => {
    const { container } = render(<TreeNode {...defaultProps} level={3} />);
    
    // The TreeNode doesn't have a .tree-node-content class
    // Instead, the styling is applied directly to the div with cursor-pointer class
    const nodeElement = container.querySelector('[role="treeitem"] > div');
    
    // Level 3 should have paddingLeft: 3 * 20 + 12 = 72px
    expect(nodeElement).toHaveStyle({ paddingLeft: '72px' });
  });

  it('should sort children folders before files', () => {
    const mixedChildren = {
      ...mockFolderNode,
      children: [
        { id: 'file1', name: 'Zebra.txt', type: 'file', parentId: 'test-folder' },
        { id: 'folder1', name: 'Apple', type: 'folder', parentId: 'test-folder', children: [] },
        { id: 'file2', name: 'Banana.txt', type: 'file', parentId: 'test-folder' },
        { id: 'folder2', name: 'Cherry', type: 'folder', parentId: 'test-folder', children: [] },
      ],
    };
    
    render(
      <TreeNode 
        {...defaultProps} 
        node={mixedChildren}
        isExpanded={true}
        expandedIds={new Set(['test-folder'])}
      />
    );
    
    const names = screen.getAllByText(/Apple|Cherry|Zebra|Banana/).map(el => el.textContent);
    
    // Folders should come first (Apple, Cherry), then files (Banana, Zebra)
    expect(names[0]).toBe('Apple');
    expect(names[1]).toBe('Cherry');
    expect(names[2]).toBe('Banana.txt');
    expect(names[3]).toBe('Zebra.txt');
  });

  it('should have proper ARIA attributes', () => {
    const { container } = render(<TreeNode {...defaultProps} node={mockFolderNode} />);
    
    const treeitem = container.querySelector('[role="treeitem"]');
    expect(treeitem).toBeInTheDocument();
    expect(treeitem).toHaveAttribute('aria-expanded', 'false');
    expect(treeitem).toHaveAttribute('aria-selected', 'false');
  });

  it('should update ARIA expanded when folder is opened', () => {
    const { container } = render(
      <TreeNode {...defaultProps} node={mockFolderNode} isExpanded={true} />
    );
    
    const treeitem = container.querySelector('[role="treeitem"]');
    expect(treeitem).toHaveAttribute('aria-expanded', 'true');
  });

  it('should log render for debugging (as per requirement 4.3)', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    render(<TreeNode {...defaultProps} />);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TreeNode] Rendering: "Test File.txt"')
    );
    
    consoleSpy.mockRestore();
  });
});
