
import { Book } from "../types";

export const DB_NAME = 'LibraDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'books';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const getAllBooks = (db: IDBDatabase): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveAllBooks = (db: IDBDatabase, books: Book[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear and rewrite strategy
    store.clear();
    
    books.forEach(book => {
      // PRE-SAVE CLEANUP:
      // We do NOT want to store "blob:..." URLs in IndexedDB as they are temporary.
      // We store the 'coverBlob'. The 'coverUrl' should be cleared if it was a blob URL.
      // If 'coverUrl' is an external link (http...), keep it.
      
      const bookToSave = { ...book };
      if (bookToSave.coverBlob && bookToSave.coverUrl?.startsWith('blob:')) {
          bookToSave.coverUrl = ''; // Clean up temp URL before storage
      }
      
      store.put(bookToSave);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};
