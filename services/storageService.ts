
import { LibraryState, Book, BookFormat, BookStatus, AppSettings, SortKey, SortDirection } from "../types";

const STORAGE_KEY = 'booktracker_library_data';
const SETTINGS_KEY = 'booktracker_settings';
const SORT_PREFS_KEY = 'booktracker_sort_prefs';

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

export const loadSortPrefs = (): { key: SortKey, direction: SortDirection } => {
  const defaultSort: { key: SortKey, direction: SortDirection } = { key: 'addedAt', direction: 'desc' };
  try {
      const data = localStorage.getItem(SORT_PREFS_KEY);
      if (!data) return defaultSort;
      return JSON.parse(data);
  } catch {
      return defaultSort;
  }
};

export const saveSortPrefs = (key: SortKey, direction: SortDirection): void => {
  localStorage.setItem(SORT_PREFS_KEY, JSON.stringify({ key, direction }));
};

// --- Local Storage Helpers ---

export const loadLibrary = async (): Promise<LibraryState> => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return { books: [] };
  try {
    return JSON.parse(data);
  } catch {
    return { books: [] };
  }
};

export const saveLibrary = async (state: LibraryState): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Storage full or error", e);
    alert("Увага: Пам'ять браузера переповнена. Спробуйте видалити старі книги або використовуйте менш якісні обкладинки.");
  }
};

export const importLibraryFromJSON = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const parsedData = JSON.parse(jsonString);

        // Basic validation
        if (!parsedData || !Array.isArray(parsedData.books)) {
          throw new Error("Невірний формат файлу Libra");
        }

        await saveLibrary(parsedData);
        resolve(true);
      } catch (err) {
        console.error("Import failed", err);
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

// --- Cover Search Providers ---

const searchGoogleBooks = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    if (!response.ok) return null;
    const data = await response.json();
    const book = data.items?.[0];
    const imageLinks = book?.volumeInfo?.imageLinks;
    let url = imageLinks?.thumbnail || imageLinks?.smallThumbnail;
    if (url) {
      return url.replace('http://', 'https://');
    }
    return null;
  } catch (e) {
    // console.warn("Google Books search failed", e);
    return null;
  }
};

const searchOpenLibrary = async (title: string, author: string): Promise<string | null> => {
  try {
    // Open Library search is better with Title and Author specifically
    const query = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`;
    const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    
    // Look for cover_i (cover ID)
    const doc = data.docs?.[0];
    if (doc && doc.cover_i) {
      // Use 'L' for large size
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
    return null;
  } catch (e) {
    // console.warn("Open Library search failed", e);
    return null;
  }
};

const searchITunes = async (query: string): Promise<string | null> => {
  try {
    // Search for ebooks
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=ebook&entity=ebook&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Get the artwork URL and upgrade resolution (default is often 100x100)
      let url = data.results[0].artworkUrl100;
      if (url) {
        // Simple hack to get higher res from Apple CDN
        return url.replace('100x100', '600x600');
      }
    }
    return null;
  } catch (e) {
    // iTunes often blocks CORS from localhost, so this might fail in development but work in production or with a proxy
    // console.warn("iTunes search failed", e);
    return null;
  }
};

export const fetchBookCover = async (title: string, author: string, isbn?: string): Promise<string> => {
  const cleanTitle = title.trim();
  const cleanAuthor = author === 'Невідомий автор' ? '' : author.trim();
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';
  
  // 0. Try ISBN (Google Books) - Most Accurate
  if (cleanIsbn) {
      const cover = await searchGoogleBooks(`isbn:${cleanIsbn}`);
      if (cover) return cover;
  }

  const combinedQuery = `${cleanTitle} ${cleanAuthor}`.trim();
  if (!combinedQuery) return '';

  // 1. Google Books (Title + Author)
  let cover = await searchGoogleBooks(combinedQuery);
  if (cover) return cover;

  // 2. Open Library
  if (cleanTitle) {
      cover = await searchOpenLibrary(cleanTitle, cleanAuthor);
      if (cover) return cover;
  }

  // 3. iTunes (Apple Books)
  cover = await searchITunes(combinedQuery);
  if (cover) return cover;
  
  // 4. Fallback: Google Books (Title only)
  if (cleanAuthor) {
      cover = await searchGoogleBooks(cleanTitle);
      if (cover) return cover;
  }

  return '';
};

export const importLibraryFromCSV = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let csvText = e.target?.result as string;
        
        // Remove BOM if present (often added by Excel)
        if (csvText.charCodeAt(0) === 0xFEFF) {
          csvText = csvText.slice(1);
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("Файл порожній або не містить даних");

        // Detect delimiter (comma or semicolon)
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ';' : ',';
        
        // Regex to split by delimiter but ignore delimiter inside quotes
        const splitRegex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

        // Parse headers (assume first row)
        const headers = firstLine.split(splitRegex).map(h => h.trim().toLowerCase().replace(/^"|"$/g, '').replace(/^\ufeff/, ''));
        
        const newBooks: Book[] = [];

        // Iterate starting from line 1
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const row = line.split(splitRegex).map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            if (row.length < 1) continue;

            const book: Partial<Book> = {
                id: crypto.randomUUID(),
                addedAt: new Date().toISOString(),
                formats: ['Paper'],
                status: 'Unread', 
                sessions: [],
                readingDates: []
            };

            let hasTitle = false;

            headers.forEach((header, index) => {
                const value = row[index];
                if (!value) return;

                if (header.includes('title') || header.includes('назва') || header.includes('книга') || header.includes('name')) {
                    book.title = value;
                    hasTitle = true;
                }
                else if (header.includes('author') || header.includes('автор') || header.includes('writer')) book.author = value;
                else if (header.includes('publisher') || header.includes('видавництво') || header.includes('видавець')) book.publisher = value;
                else if (header.includes('series') || header.includes('серія')) book.seriesPart = value;
                else if (header.includes('pages') || header.includes('сторінки') || header.includes('стор')) book.pagesTotal = parseInt(value.replace(/\D/g, '')) || 0;
                else if (header.includes('rating') || header.includes('оцінка') || header.includes('рейтинг')) {
                    // Multiply by 2 as requested (1-5 scale -> 1-10 scale)
                    const parsedRating = parseInt(value);
                    if (!isNaN(parsedRating)) {
                        book.rating = parsedRating * 2;
                    }
                }
                else if (header.includes('isbn')) book.isbn = value;
                else if (header.includes('genre') || header.includes('жанр')) book.genre = value;
                else if (header.includes('cover') || header.includes('фото') || header.includes('обкладинка') || header.includes('image')) book.coverUrl = value;
                
                // Date Logic: Check for 'date', 'дата', 'finished', 'завершено'
                else if (header.includes('date') || header.includes('дата') || header.includes('finished') || header.includes('завершено')) {
                     let dateStr = value.trim();
                     let parsedDate: Date | null = null;

                     // Try parsing common formats like DD.MM.YYYY
                     const dmy = dateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
                     if (dmy) {
                         // Note: Month is 0-indexed in JS Date
                         parsedDate = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
                     } else {
                         // Try standard parser
                         const d = new Date(dateStr);
                         if (!isNaN(d.getTime())) parsedDate = d;
                     }

                     if (parsedDate && !isNaN(parsedDate.getTime())) {
                         book.completedAt = parsedDate.toISOString();
                         // If date is present, it usually implies the book is completed
                         book.status = 'Completed';
                         book.pagesRead = book.pagesTotal || 0;
                     }
                }

                else if (header.includes('status') || header.includes('статус') || header.includes('стан')) {
                    const s = value.toLowerCase();
                    if (s.includes('read') || s.includes('прочитано') || s.includes('прочитана') || s.includes('done') || s.includes('completed')) {
                         book.status = 'Completed';
                         // Only set completedAt to NOW if it wasn't already set by a specific Date column
                         if (!book.completedAt) {
                            book.completedAt = new Date().toISOString();
                         }
                         book.pagesRead = book.pagesTotal || 0;
                    }
                    else if (s.includes('reading') || s.includes('читаю') || s.includes('process') || s.includes('in progress')) book.status = 'Reading';
                    else if (s.includes('wish') || s.includes('бажання') || s.includes('план') || s.includes('хочу') || s.includes('plan')) book.status = 'Wishlist';
                    else book.status = 'Unread';
                }
                else if (header.includes('format') || header.includes('формат') || header.includes('type')) {
                    const f = value.toLowerCase();
                    const formats: BookFormat[] = [];
                    if (f.includes('paper') || f.includes('папер') || f.includes('друк') || f.includes('hard') || f.includes('soft')) formats.push('Paper');
                    if (f.includes('ebook') || f.includes('ел') || f.includes('fb2') || f.includes('epub') || f.includes('kindle') || f.includes('mobi')) formats.push('E-book');
                    if (f.includes('audio') || f.includes('аудіо') || f.includes('mp3')) formats.push('Audio');
                    if (formats.length > 0) book.formats = formats;
                }
            });

            // Auto-create session for completed books
            if (book.status === 'Completed' && book.pagesTotal && book.pagesTotal > 0) {
                 // Estimation: 50 pages = 60 minutes.
                 // 1 page = 1.2 minutes = 72 seconds.
                 const estimatedDurationSeconds = Math.round(book.pagesTotal * 72);
                 const completionDate = book.completedAt ? book.completedAt.split('T')[0] : new Date().toISOString().split('T')[0];

                 book.sessions = [{
                     id: crypto.randomUUID(),
                     date: completionDate,
                     duration: estimatedDurationSeconds,
                     pages: book.pagesTotal
                 }];
            }

            if (hasTitle) {
                if (!book.author) book.author = "Невідомий автор";
                
                // --- MAGIC: Multi-API Cover Search ---
                // If we don't have a cover from the CSV, try to find one
                if (!book.coverUrl || !book.coverUrl.trim()) {
                    try {
                        // Pass ISBN if available for better accuracy
                        const foundCover = await fetchBookCover(book.title as string, book.author as string, book.isbn);
                        if (foundCover) {
                            book.coverUrl = foundCover;
                        }
                    } catch (e) {
                        // Ignore errors to keep import running
                        console.warn(`Could not fetch cover for ${book.title}`, e);
                    }
                }
                
                newBooks.push(book as Book);
            }
        }

        if (newBooks.length === 0) throw new Error("Не знайдено коректних книг. Переконайтеся, що в файлі є колонка 'Назва' або 'Title'.");

        const currentLibrary = await loadLibrary();
        const mergedLibrary = { books: [...currentLibrary.books, ...newBooks] };
        await saveLibrary(mergedLibrary);
        resolve(newBooks.length);
      } catch (err) {
        console.error("Import CSV failed", err);
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Limit width to 800px
        const MAX_HEIGHT = 1200; // Limit height
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
