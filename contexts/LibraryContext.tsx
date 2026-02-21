
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Book, LibraryState } from '../types';
import { loadLibrary, saveLibrary } from '../services/storageService';

interface LibraryContextType {
  books: Book[];
  isLoading: boolean;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  deleteBook: (id: string) => void;
  reorderBooks: (books: Book[]) => void;
  refreshLibrary: () => Promise<void>;
  
  // Shared UI State that was previously drilled
  filterTag: string;
  setFilterTag: (tag: string) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LibraryState>({ books: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [filterTag, setFilterTag] = useState('');
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const reorderSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshLibrary = useCallback(async () => {
    const data = await loadLibrary();
    setState(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const enqueueSave = useCallback((newState: LibraryState) => {
    writeQueueRef.current = writeQueueRef.current
      .then(() => saveLibrary(newState))
      .catch((e) => {
        console.error('Queued save failed', e);
      });
  }, []);

  const handleUpdate = useCallback((updater: (prev: LibraryState) => LibraryState) => {
    setState((prev) => {
      const next = updater(prev);
      enqueueSave(next);
      return next;
    });
  }, [enqueueSave]);

  const addBook = useCallback((book: Book) => {
    handleUpdate((prev) => ({ ...prev, books: [...prev.books, book] }));
  }, [handleUpdate]);

  const updateBook = useCallback((updatedBook: Book) => {
    let finalBook = { ...updatedBook };
    
    // 1. Logic for STARTING reading
    // If moving to Reading state and no start date exists, set it.
    if (finalBook.status === 'Reading' && (!finalBook.readingStartedAt)) {
         finalBook.readingStartedAt = new Date().toISOString();
    }

    // 2. Logic for RESETTING (False starts or moving back to shelf)
    // If moving to Wishlist or Unread, we must clean up any reading progress
    // so it doesn't pollute statistics or sessions.
    if (finalBook.status === 'Wishlist' || finalBook.status === 'Unread') {
        finalBook.readingStartedAt = undefined;
        finalBook.completedAt = undefined;
        finalBook.pagesRead = 0;
        finalBook.sessions = []; // Clear reading history
        finalBook.rating = undefined; // Clear rating as it's not read
    }

    handleUpdate((prev) => ({
      ...prev,
      books: prev.books.map(b => b.id === finalBook.id ? finalBook : b)
    }));
  }, [handleUpdate]);

  const deleteBook = useCallback((id: string) => {
    handleUpdate((prev) => ({
      ...prev,
      books: prev.books.filter(b => b.id !== id)
    }));
  }, [handleUpdate]);

  const reorderBooks = useCallback((newBooks: Book[]) => {
    setState((prev) => ({ ...prev, books: newBooks }));
    if (reorderSaveTimerRef.current) {
      clearTimeout(reorderSaveTimerRef.current);
    }
    reorderSaveTimerRef.current = setTimeout(() => {
      enqueueSave({ books: newBooks });
      reorderSaveTimerRef.current = null;
    }, 250);
  }, [enqueueSave]);

  return (
    <LibraryContext.Provider value={{ 
      books: state.books, 
      isLoading, 
      addBook, 
      updateBook, 
      deleteBook, 
      reorderBooks, 
      refreshLibrary,
      filterTag,
      setFilterTag
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
