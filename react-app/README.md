# File Explorer Application

A React-based file explorer with a robust JavaScript SDK for managing files and folders in memory.

## Features

- 📁 Recursive file tree with expand/collapse
- ✏️ Create, rename, move, and delete files/folders
- 🔍 Search with filtering and sorting
- ↶↷ Undo/redo functionality
- 🎯 Breadcrumb navigation
- ⌨️ Keyboard shortcuts
- 🎨 Toast notifications
- ♿ Accessibility support (ARIA)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Testing

The project includes comprehensive automated tests covering:
- SDK core functionality
- React integration
- Component behavior
- End-to-end workflows

### Run Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **116 passing tests** covering all requirements
- SDK operations (create, rename, move, delete)
- Error handling and validation
- Undo/redo with nested restoration
- Search functionality
- React subscriptions and cleanup
- UI interactions and accessibility

See [TEST_SUMMARY.md](./TEST_SUMMARY.md) for detailed test documentation.

## Architecture

### SDK (`../sdk/FileExplorer.js`)

Standalone JavaScript class that manages the file system:
- Immutable data structures
- Structural sharing for performance
- Event notifications
- Undo/redo history
- Independent of React

### React Integration (`src/hooks/useFileExplorer.js`)

Custom hook using `useSyncExternalStore`:
- Efficient subscriptions
- Automatic cleanup
- Error handling
- Memoized actions

### Components

- `App.jsx` - Main application
- `TreeView.jsx` - Tree container
- `TreeNode.jsx` - Recursive tree node (React.memo optimized)
- `Toolbar.jsx` - Action buttons
- `SearchBar.jsx` - Debounced search
- `Breadcrumb.jsx` - Path navigation
- Various dialogs and UI components

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New File
- `Ctrl/Cmd + Shift + N` - New Folder
- `F2` - Rename selected item
- `Delete` - Delete selected item
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z` - Redo
- `Esc` - Close dialogs

## Performance Optimizations

- **React.memo** on TreeNode component
- **Structural sharing** in SDK (unchanged nodes keep same reference)
- **useSyncExternalStore** for efficient subscriptions
- **useCallback** for event handlers
- **Debounced search** (300ms)
- **Referential stability** of tree when unchanged

## Technology Stack

- **React 19** - UI library
- **Vite 8** - Build tool and dev server
- **Vitest 5** - Testing framework
- **@testing-library/react** - React testing utilities

## License

MIT
