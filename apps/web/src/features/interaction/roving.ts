/**
 * Roving focus for a toolbar (WAI-ARIA APG toolbar pattern): the toolbar is one Tab stop and
 * the arrow keys move inside it, wrapping at the ends; Home and End jump to the ends. Returns
 * the index to focus, or `null` when the key is not a toolbar navigation key.
 */
export function nextToolbarIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  const from = current < 0 || current >= count ? 0 : current;
  switch (key) {
    case 'ArrowRight':
      return (from + 1) % count;
    case 'ArrowLeft':
      return (from - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
