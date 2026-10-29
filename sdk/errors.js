export class FileExplorerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FileExplorerError';
    this.code = code;
  }
}
