export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour:   'numeric',
    minute: '2-digit',
  });
}
