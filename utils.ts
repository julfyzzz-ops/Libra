
import { Book, BookFormat, BookStatus, AccentColor, BackgroundTone } from './types';

export const FORMAT_LABELS: Record<BookFormat, string> = {
  'Paper': 'Паперова',
  'E-book': 'Електронна',
  'Audio': 'Аудіо',
  'Pirate': 'Піратка',
  'Expected': 'Очікується',
  'Sold': 'Продана'
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  'Reading': 'Читаю',
  'Completed': 'Прочитано',
  'Unread': 'Не прочитано',
  'Wishlist': 'Бажанка'
};

export const calculateProgress = (read?: number, total?: number) => {
  if (!read || !total) return 0;
  return Math.min(100, Math.round((read / total) * 100));
};

export const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getRatingColor = (rating: number) => {
  if (rating <= 2) return '#3E2723'; // Very Dark Brown
  if (rating <= 4) return '#5D4037'; // Brown
  if (rating <= 6) return '#8D6E63'; // Light Brown / Bronze
  if (rating <= 8) return '#FBC02D'; // Amber Gold
  return '#FFD700'; // Pure Gold
};

export const calculateAverageSpeed = (book: Book) => {
  if (!book.sessions || book.sessions.length === 0) return 0;
  const totalPages = book.sessions.reduce((acc, s) => acc + Number(s.pages), 0);
  const totalSeconds = book.sessions.reduce((acc, s) => acc + Number(s.duration), 0);
  return totalSeconds > 0 ? Math.round(totalPages / (totalSeconds / 3600)) : 0;
};

export const calculateTotalReadingTime = (book: Book) => {
  if (!book.sessions) return 0;
  return Math.round(book.sessions.reduce((acc, s) => acc + Number(s.duration), 0) / 60);
};

export const getRemainingTimeText = (book: Book) => {
  const speed = calculateAverageSpeed(book); // pages per hour
  if (speed === 0 || !book.pagesTotal) return "Невідомо";
  const remainingPages = (book.pagesTotal || 0) - (book.pagesRead || 0);
  if (remainingPages <= 0) return "Завершено";
  
  const hoursDecimal = remainingPages / speed;
  const hours = Math.floor(hoursDecimal);
  const minutes = Math.round((hoursDecimal - hours) * 60);
  
  if (hours > 0) {
      return `Залишилось ${hours} години і ${minutes} хвилин`;
  } else {
      return `Залишилось ${minutes} хвилин`;
  }
};

// --- THEME SYSTEM ---

export const ACCENT_COLORS: Record<AccentColor, { label: string, hex: string, shades: Record<number, string> }> = {
  indigo: {
    label: 'Індиго (Стандарт)',
    hex: '#4f46e5',
    shades: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
  },
  rose: {
    label: 'Троянда',
    hex: '#e11d48',
    shades: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' }
  },
  amber: {
    label: 'Бурштин',
    hex: '#d97706',
    shades: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' }
  },
  emerald: {
    label: 'Смарагд',
    hex: '#059669',
    shades: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 500: '#10b981', 600: '#059669', 700: '#047857' }
  },
  violet: {
    label: 'Фіолетовий',
    hex: '#7c3aed',
    shades: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' }
  },
  sky: {
    label: 'Небо',
    hex: '#0284c7',
    shades: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' }
  }
};

export const BACKGROUND_TONES: Record<BackgroundTone, { label: string, hex: string, vars: { main: string, card: string, element: string } }> = {
  cool: {
    label: 'Холодний (Стандарт)',
    hex: '#f8fafc',
    vars: { main: '#f8fafc', card: '#f9fafb', element: '#f3f4f6' } // slate-50, gray-50, gray-100
  },
  warm: {
    label: 'Теплий',
    hex: '#fafaf9',
    vars: { main: '#fafaf9', card: '#f5f5f4', element: '#e7e5e4' } // stone-50, stone-100, stone-200
  },
  neutral: {
    label: 'Нейтральний',
    hex: '#fafafa',
    vars: { main: '#fafafa', card: '#f4f4f5', element: '#e4e4e7' } // zinc-50, zinc-100, zinc-200
  }
};

export const applyTheme = (accent: AccentColor, bg: BackgroundTone) => {
  const root = document.documentElement;
  const accentData = ACCENT_COLORS[accent];
  const bgData = BACKGROUND_TONES[bg];

  // Apply Accent Shades
  Object.entries(accentData.shades).forEach(([shade, value]) => {
    root.style.setProperty(`--accent-${shade}`, value);
  });

  // Apply Backgrounds
  root.style.setProperty('--bg-main', bgData.vars.main);
  root.style.setProperty('--bg-card', bgData.vars.card);
  root.style.setProperty('--bg-element', bgData.vars.element);
};
