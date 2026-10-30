import { FileExplorerError } from './errors.js';
import { ErrorCode } from './constants.js';

export class Transaction {
  #sdk;
  #operations = [];
  #committed = false;
  #rolledBack = false;

  constructor(sdk) {
    this.#sdk = sdk;
  }

  createFile(parentId, name, content = '') {
    this.#checkActive();
    this.#operations.push({ type: 'createFile', parentId, name, content });
    return this;
  }

  createFolder(parentId, name) {
    this.#checkActive();
    this.#operations.push({ type: 'createFolder', parentId, name });
    return this;
  }

  rename(id, newName) {
    this.#checkActive();
    this.#operations.push({ type: 'rename', id, newName });
    return this;
  }

  move(id, newParentId) {
    this.#checkActive();
    this.#operations.push({ type: 'move', id, newParentId });
    return this;
  }

  delete(id) {
    this.#checkActive();
    this.#operations.push({ type: 'delete', id });
    return this;
  }

  commit() {
    this.#checkActive();

    if (this.#operations.length === 0) {
      this.#committed = true;
      return { success: true, results: [] };
    }

    const savedState = this.#sdk.getStateSnapshot();
    const results = [];

    try {
      this.#sdk.setSilentMode(true);

      for (const op of this.#operations) {
        let result;
        switch (op.type) {
          case 'createFile':
            result = this.#sdk.createFile(op.parentId, op.name, op.content);
            break;
          case 'createFolder':
            result = this.#sdk.createFolder(op.parentId, op.name);
            break;
          case 'rename':
            result = this.#sdk.rename(op.id, op.newName);
            break;
          case 'move':
            result = this.#sdk.move(op.id, op.newParentId);
            break;
          case 'delete':
            result = this.#sdk.delete(op.id);
            break;
        }
        results.push(result);
      }
    } catch (error) {
      this.#sdk.restoreStateSnapshot(savedState);
      this.#rolledBack = true;
      return { success: false, results: [], error };
    } finally {
      this.#sdk.setSilentMode(false);
    }

    this.#sdk.consolidateHistory(savedState);

    this.#committed = true;
    return { success: true, results };
  }

  rollback() {
    this.#checkActive();
    this.#rolledBack = true;
    this.#operations = [];
  }

  get isActive() {
    return !this.#committed && !this.#rolledBack;
  }

  get operationCount() {
    return this.#operations.length;
  }

  #checkActive() {
    if (this.#committed) {
      throw new FileExplorerError(ErrorCode.INVALID_ARGUMENT, 'Transaction already committed.');
    }
    if (this.#rolledBack) {
      throw new FileExplorerError(ErrorCode.INVALID_ARGUMENT, 'Transaction already rolled back.');
    }
  }
}