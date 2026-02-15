
export type BookFormat = 'Paper' | 'E-book' | 'Audio' | 'Pirate' | 'Expected' | 'Sold';
export type BookStatus = 'Reading' | 'Completed' | 'Wishlist' | 'Unread';

export interface ReadingSessionData {
  id: string;
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
  pages: number; // number of pages read in this session
}

export interface Book {
  id: string;
  title: string;
  author: string;
  formats: BookFormat[];
  status: BookStatus;
  isbn?: string;
  genre?: string;
  publisher?: string;
  seriesPart?: string;
  coverUrl?: string;
  pagesTotal?: number;
  pagesRead?: number;
  rating?: number;
  description?: string;
  addedAt: string;
  readingStartedAt?: string;
  completedAt?: string;
  readingDates: string[]; // Kept for backward compatibility, but sessions is preferred now
  sessions: ReadingSessionData[]; // Detailed history
}

export type ViewType = 'statistics' | 'library' | 'add' | 'calendar' | 'wishlist' | 'settings';

export interface LibraryState {
  books: Book[];
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  accountEmail?: string;
}
