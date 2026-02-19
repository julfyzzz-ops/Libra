
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
  series?: string; // Series Name (e.g. Harry Potter)
  seriesPart?: string; // Series Number (e.g. Vol 1)
  coverUrl?: string;
  pagesTotal?: number;
  pagesRead?: number;
  rating?: number;
  description?: string;
  notes?: string; // Emoji only notes
  comment?: string; // Text comment
  
  // Reading tracking specifics
  selectedReadingFormat?: BookFormat; // The format user is currently reading
  readingPagesTotal?: number; // Specific page count for the selected format (e.g. e-book pages differ from paper)

  addedAt: string;
  readingStartedAt?: string;
  completedAt?: string;
  readingDates: string[]; // Kept for backward compatibility, but sessions is preferred now
  sessions: ReadingSessionData[]; // Detailed history
}

export type ViewType = 'statistics' | 'library' | 'reading' | 'add' | 'calendar' | 'wishlist' | 'settings';

export interface LibraryState {
  books: Book[];
}

export type AccentColor = 'indigo' | 'rose' | 'amber' | 'emerald' | 'violet' | 'sky' | 'pink' | 'gold' | 'black' | 'white';
export type BackgroundTone = 'cool' | 'warm' | 'neutral' | 'peach' | 'mint' | 'dark' | 'midnight' | 'forest';

export interface AppSettings {
  accent: AccentColor;
  bg: BackgroundTone;
}

export type SortKey = 'title' | 'author' | 'addedAt' | 'custom';
export type SortDirection = 'asc' | 'desc';
