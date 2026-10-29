# 📁 File Explorer

A React-based file explorer UI backed by a standalone JavaScript SDK for managing files and folders entirely in memory — no backend, no database.

The project is split into two layers: a **framework-agnostic SDK** that handles all file system logic, and a **React app** that consumes it through a custom hook. The SDK can be used independently in any JavaScript project.

Demo Link : https://drive.google.com/file/d/15s4Z6ET-iOnB5epZYlnIHMJQng92DEXW/view?usp=sharing
### ✨ Features

- 📂 Recursive file tree with expand/collapse
- ✏️ Create, rename, move, and delete files and folders
- 🔍 Search with type filters, sorting, and pagination
- ↩️ Undo/redo with configurable history limit
- ⚡ Atomic transactions — all operations succeed or none apply
- 🔔 Event subscriptions for real-time UI updates
- 🧭 Breadcrumb navigation
- ⌨️ Keyboard shortcuts
- 🔒 Immutable data with structural sharing for performance
- ♿ Accessibility support (ARIA)

---

## 🗂️ Project Structure

```
SDK JS/
├── sdk/                    # Standalone JS SDK (no React dependency)
│   ├── FileExplorer.js     # Core class
│   ├── Transaction.js      # Atomic transactions
│   ├── constants.js        # ItemType, ErrorCode, DEFAULT_TREE
│   ├── errors.js           # FileExplorerError
│   └── FileExplorer.test.js
└── react-app/              # Vite + React app
    ├── src/
    │   ├── explorer.js           # Shared SDK singleton
    │   ├── hooks/
    │   │   ├── useFileExplorer.js       # SDK ↔ React bridge
    │   │   └── useFileExplorer.test.js
    │   ├── components/           # TreeView, Toolbar, dialogs, …
    │   └── App.jsx
    └── vitest.config.js    # Runs both sdk/ and src/ tests
```

---

## 🚀 Getting Started

```powershell
cd react-app
npm install
npm run dev
```

---

## 🧪 Testing

Both test files are picked up by `react-app/vitest.config.js`. Always run from `react-app/`.

```powershell
cd react-app
npm run test:run
```

---

## 🛠️ SDK Usage

```js
import { createFileExplorer, FileExplorerError } from '../sdk/index.js';

const fs = createFileExplorer(); // uses default tree

// CRUD
const file   = fs.createFile(fs.rootId, 'notes.txt', 'Hello');
const folder = fs.createFolder(fs.rootId, 'Docs');
fs.rename(file.id, 'readme.txt');
fs.move(file.id, folder.id);
fs.delete(folder.id);

// Read
fs.getItem(id);
fs.getTree();
fs.getPath(id);        // breadcrumb array
fs.getPathString(id);  // "My Files/Docs/readme.txt"

// Search
fs.search('report', { type: 'file', sortBy: 'name', sortOrder: 'asc', page: 1, pageSize: 10 });

// Undo / Redo
fs.undo();
fs.redo();
fs.canUndo(); // boolean
fs.canRedo(); // boolean

// Transactions
const tx = fs.beginTransaction();
tx.createFile(fs.rootId, 'a.txt');
tx.createFolder(fs.rootId, 'Docs');
tx.commit();    // atomic — all or nothing
// tx.rollback() to cancel

// Subscriptions
const unsub = fs.subscribe((event) => console.log(event.type));
unsub();
```

Errors throw `FileExplorerError` with a `code` (`INVALID_NAME`, `DUPLICATE_NAME`, `NOT_FOUND`, `INVALID_MOVE`, etc.) and a human-readable `message`.

---

## ⚛️ React Integration

```jsx
import { useFileExplorer } from './hooks/useFileExplorer';

function Example() {
  const { tree, rootId, actions, canUndo, canRedo } = useFileExplorer(
    (msg) => console.error(msg)  // optional error callback
  );

  return (
    <>
      <button onClick={() => actions.createFile(rootId, 'new.txt')}>New file</button>
      <button onClick={actions.undo} disabled={!canUndo}>Undo</button>
      <button onClick={actions.redo} disabled={!canRedo}>Redo</button>
    </>
  );
}
```

The hook uses `useSyncExternalStore` to subscribe to SDK changes. SDK errors are caught and forwarded to the `onError` callback instead of crashing the component.

---

## 🧰 Tech Stack

| | |
|---|---|
| ⚛️ React 19 | UI library |
| ⚡ Vite 8 | Dev server and build tool |
| 🧪 Vitest 5 | Test runner |
| 🎨 Tailwind CSS 3 | Styling |
