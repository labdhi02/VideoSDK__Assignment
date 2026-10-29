export const ACTION_BADGE_STYLES = {
  create: 'bg-emerald-100 text-emerald-800',
  rename: 'bg-sky-100 text-sky-800',
  move:   'bg-amber-100 text-amber-800',
  delete: 'bg-rose-100 text-rose-800',
  undo:   'bg-gray-100 text-gray-700',
  redo:   'bg-gray-100 text-gray-700',
};

export const ACTION_BADGE_FALLBACK = ACTION_BADGE_STYLES.undo;

export const ACTION_LABELS = {
  create: 'Created',
  rename: 'Renamed',
  move:   'Moved',
  delete: 'Deleted',
};
