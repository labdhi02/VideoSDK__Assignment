export const ItemType = Object.freeze({ FILE: 'file', FOLDER: 'folder' });

export const ErrorCode = Object.freeze({
  INVALID_NAME: 'INVALID_NAME',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  NOT_FOUND: 'NOT_FOUND',
  NOT_A_FOLDER: 'NOT_A_FOLDER',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  ROOT_OPERATION: 'ROOT_OPERATION',
  INVALID_MOVE: 'INVALID_MOVE',
});

export const DEFAULT_TREE = {
  id: 'root',
  name: 'My Files',
  type: ItemType.FOLDER,
  children: [
    {
      id: 'documents',
      name: 'Documents',
      type: ItemType.FOLDER,
      children: [
        { id: 'resume', name: 'Resume.pdf', type: ItemType.FILE },
        { id: 'project-plan', name: 'Project Plan.docx', type: ItemType.FILE },
      ],
    },
    {
      id: 'images',
      name: 'Images',
      type: ItemType.FOLDER,
      children: [
        { id: 'photo', name: 'Photo.png', type: ItemType.FILE },
        { id: 'logo', name: 'Logo.svg', type: ItemType.FILE },
      ],
    },
    { id: 'notes', name: 'Notes.txt', type: ItemType.FILE },
  ],
};
