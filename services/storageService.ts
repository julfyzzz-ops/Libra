
import { LibraryState, Book, BookFormat, BookStatus } from "../types";

const STORAGE_KEY = 'booktracker_library_data';

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
          throw new Error("Невірний формат файлу BookTracker");
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
        
        console.log("CSV Delimiter:", delimiter);
        console.log("CSV Headers:", headers);

        const newBooks: Book[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Skip empty lines
            if (!line.trim()) continue;

            // Split row
            const row = line.split(splitRegex).map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            
            if (row.length < 1) continue;

            const book: Partial<Book> = {
                id: crypto.randomUUID(),
                addedAt: new Date().toISOString(),
                formats: ['Paper'], // Default
                status: 'Unread',   // Default
                sessions: [],
                readingDates: []
            };

            let hasTitle = false;

            headers.forEach((header, index) => {
                const value = row[index];
                if (!value) return;

                // Flexible column mapping
                if (header.includes('title') || header.includes('назва') || header.includes('книга') || header.includes('name')) {
                    book.title = value;
                    hasTitle = true;
                }
                else if (header.includes('author') || header.includes('автор') || header.includes('writer')) book.author = value;
                else if (header.includes('publisher') || header.includes('видавництво') || header.includes('видавець')) book.publisher = value;
                else if (header.includes('series') || header.includes('серія')) book.seriesPart = value;
                else if (header.includes('pages') || header.includes('сторінки') || header.includes('стор')) book.pagesTotal = parseInt(value.replace(/\D/g, '')) || 0;
                else if (header.includes('rating') || header.includes('оцінка') || header.includes('рейтинг')) book.rating = parseInt(value);
                else if (header.includes('isbn')) book.isbn = value;
                else if (header.includes('genre') || header.includes('жанр')) book.genre = value;
                else if (header.includes('status') || header.includes('статус') || header.includes('стан')) {
                    const s = value.toLowerCase();
                    if (s.includes('read') || s.includes('прочитано') || s.includes('прочитана') || s.includes('done') || s.includes('completed')) {
                         book.status = 'Completed';
                         book.completedAt = new Date().toISOString();
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

            if (hasTitle) {
                if (!book.author) book.author = "Невідомий автор";
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
