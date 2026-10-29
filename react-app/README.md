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

The commands below should be run from the `react-app` directory.

### 3. Install dependencies and run the application

Install the React application's dependencies:

```bash
cd react-app
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`) in a browser.

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## React App and SDK Usage

The app creates one SDK instance in [`src/explorer.js`](./src/explorer.js):

```js
import { createFileExplorer } from '../../sdk/index.js';

export const fs = createFileExplorer();
```

The [`useFileExplorer` hook](./src/hooks/useFileExplorer.js) subscribes to SDK changes
with React's `useSyncExternalStore` and exposes the current tree and file operations:

```jsx
import { useFileExplorer } from './hooks/useFileExplorer';

function Example() {
  const { tree, rootId, actions, canUndo, canRedo } = useFileExplorer();

  const addFile = () => {
    actions.createFile(rootId, 'welcome.txt', 'Hello from the SDK');
  };

  return (
    <>
      <button onClick={addFile}>Add file</button>
      <button onClick={actions.undo} disabled={!canUndo}>Undo</button>
      <button onClick={actions.redo} disabled={!canRedo}>Redo</button>
      <pre>{JSON.stringify(tree, null, 2)}</pre>
    </>
  );
}
```

The SDK also provides `createFolder`, `rename`, `move`, `delete`, `search`,
`getItem`, `getPath`, and `getPathString`. Invalid operations are surfaced as
`FileExplorerError` instances and are handled by the hook's error callback.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Testing

### 4. Run automated tests

From the `react-app` directory, install dependencies if you have not already:

```bash
npm install
```

Run the complete automated test suite once:

```bash
npm run test:run
```

Other supported test commands are:

```bash
# Run tests interactively in watch mode
npm test

# Run tests with the Vitest UI
npm run test:ui

# Generate a coverage report
npm run test:coverage
```

The tests cover SDK operations, error handling, undo/redo, search, React
subscriptions, component behavior, and accessibility interactions.

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