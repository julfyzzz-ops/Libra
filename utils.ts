
import { Book, BookFormat, BookStatus } from './types';

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
