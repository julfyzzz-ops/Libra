
import { LibraryState, AppSettings, SortKey, SortDirection, Book } from "../types";
import { openDB, getAllBooks, saveAllBooks } from "./db";
import { base64ToBlob, blobToBase64 } from "./imageUtils";

const OLD_STORAGE_KEY = 'booktracker_library_data'; // For migration from LocalStorage
const SETTINGS_KEY = 'booktracker_settings';

// --- Settings Storage ---

export const loadSettings = (): AppSettings => {
    const defaultSettings: AppSettings = { accent: 'indigo', bg: 'cool' };
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (!data) return defaultSettings;
        return { ...defaultSettings, ...JSON.parse(data) };
    } catch {
        return defaultSettings;
    }
};

export const saveSettings = (settings: AppSettings): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- Sort Preferences ---

export const loadSortPrefs = (contextKey: string = 'booktracker_sort_prefs'): { key: SortKey, direction: SortDirection } => {
  const defaultSort: { key: SortKey, direction: SortDirection } = { key: 'addedAt', direction: 'desc' };
  try {
      const data = localStorage.getItem(contextKey);
      if (!data) return defaultSort;
      return JSON.parse(data);
  } catch {
      return defaultSort;
  }
};

export const saveSortPrefs = (contextKey: string, key: SortKey, direction: SortDirection): void => {
  localStorage.setItem(contextKey, JSON.stringify({ key, direction }));
};

// --- Library Storage (IndexedDB) ---

export const loadLibrary = async (): Promise<LibraryState> => {
  try {
    const db = await openDB();
    const books = await getAllBooks(db);

    // MIGRATION 1: LocalStorage -> IndexedDB
    if (books.length === 0) {
        const localData = localStorage.getItem(OLD_STORAGE_KEY);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (parsed && Array.isArray(parsed.books) && parsed.books.length > 0) {
                    console.log("Migrating data from LocalStorage to IndexedDB...");
                    await saveAllBooks(db, parsed.books);
                    localStorage.removeItem(OLD_STORAGE_KEY);
                    return loadLibrary();
                }
            } catch (e) {
                console.error("Migration failed (parse error)", e);
            }
        }
    }

    // HYDRATION & OPTIMIZATION & REPAIR
    let needsSave = false;

    const processedBooks = books.map(book => {
        let modified = false;
        let b = { ...book };

        // 1. OPTIMIZATION: Do NOT eager load blob URLs here. 
        if (b.coverUrl && b.coverUrl.startsWith('blob:')) {
             b.coverUrl = ''; // Clear stale blobs
        }
        
        // 2. MIGRATION: Base64 String -> Blob
        if (b.coverUrl && b.coverUrl.startsWith('data:image')) {
            const blob = base64ToBlob(b.coverUrl);
            b.coverBlob = blob;
            b.coverUrl = ''; 
            modified = true;
        }

        // 3. MIGRATION: readingDates -> sessions
        // This handles the data unification. We check for the legacy field 'readingDates' 
        // (accessed safely via 'any' since we removed it from the type).
        const legacyBook = b as any;
        if (legacyBook.readingDates && Array.isArray(legacyBook.readingDates)) {
            if (!b.sessions) b.sessions = [];
            
            legacyBook.readingDates.forEach((date: string) => {
                // Check if a session already exists for this date to avoid duplicates
                const hasSession = b.sessions.some(s => s.date === date);
                if (!hasSession) {
                    b.sessions.push({
                        id: crypto.randomUUID(),
                        date: date,
                        duration: 0, // Legacy data doesn't have duration
                        pages: 0     // Legacy data doesn't have page delta
                    });
                }
            });
            
            // Remove the legacy field
            delete legacyBook.readingDates;
            modified = true;
        }

        // 4. REPAIR: Ensure Completed books have at least one session with valid stats
        if (b.status === 'Completed') {
            const pages = b.pagesTotal || 0;
            const hasSessions = b.sessions && b.sessions.length > 0;
            const hasZeroSessions = hasSessions && b.sessions.every(s => !s.pages || s.pages === 0);
            
            // If no sessions OR existing sessions are empty/zero but we know the total pages
            if ((!hasSessions || hasZeroSessions) && pages > 0) {
                const date = b.completedAt ? b.completedAt.split('T')[0] : new Date().toISOString().split('T')[0];
                
                // If we have sessions but they are all zero, we might want to update the last one or create a new one.
                // Simpler repair: just ensure ONE master session exists if everything is empty.
                if (!hasSessions) {
                    b.sessions = [{
                        id: crypto.randomUUID(),
                        date: date,
                        duration: pages * 72, 
                        pages: pages
                    }];
                    modified = true;
                }
                
                // Ensure pagesRead is consistent
                if (!b.pagesRead || b.pagesRead === 0) {
                    b.pagesRead = pages;
                    modified = true;
                }
            }
        }

        if (modified) needsSave = true;
        return b;
    });

    if (needsSave) {
        console.log("Optimizing/Repairing library...");
        await saveAllBooks(db, processedBooks);
    }

    const hasStoredCustomOrder = processedBooks.some((b) => typeof b.customOrder === 'number');
    const booksWithStableOrder = hasStoredCustomOrder
      ? [...processedBooks].sort((a, b) => {
          const orderA = typeof a.customOrder === 'number' ? a.customOrder : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.customOrder === 'number' ? b.customOrder : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        })
      : processedBooks;

    return { books: booksWithStableOrder };
  } catch (e) {
    console.error("Failed to load library from IndexedDB", e);
    return { books: [] };
  }
};

export const saveLibrary = async (state: LibraryState): Promise<void> => {
  try {
    const db = await openDB();
    const booksWithOrder = state.books.map((book, index) => ({
      ...book,
      customOrder: index,
    }));
    await saveAllBooks(db, booksWithOrder);
  } catch (e) {
    console.error("Failed to save library to DB", e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        alert("Увага: Пам'ять пристрою переповнена.");
    }
  }
};

export const exportLibraryToJSON = async (): Promise<void> => {
    try {
        const db = await openDB();
        const books = await getAllBooks(db);

        const booksForExport = await Promise.all(books.map(async (book) => {
            const b = { ...book };
            if (b.coverBlob) {
                b.coverUrl = await blobToBase64(b.coverBlob);
                delete b.coverBlob; 
            }
            return b;
        }));

        const exportData = { books: booksForExport };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `libra_library_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export failed", e);
        throw e;
    }
};

// Re-exports
export { fetchBookCover } from './api';
export { processImage } from './imageUtils';
