export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  if (dateStr === '?') return '?';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1]) - 1;
    const day = parts[2];
    return `${months[month]} ${day}, ${year}`;
  } else if (parts.length === 2) {
    const year = parts[0];
    const month = parseInt(parts[1]) - 1;
    return `${months[month]} ${year}`;
  }
  return dateStr;
};

export const formatDuration = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};
