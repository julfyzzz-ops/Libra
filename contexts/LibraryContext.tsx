
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Book, LibraryState, BookFormat } from '../types';
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

  const refreshLibrary = useCallback(async () => {
    const data = await loadLibrary();
    setState(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const handleUpdate = useCallback(async (newState: LibraryState) => {
    setState(newState);
    await saveLibrary(newState);
  }, []);

  const addBook = useCallback((book: Book) => {
    handleUpdate({ ...state, books: [...state.books, book] });
  }, [state, handleUpdate]);

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

    const newState = {
      ...state,
      books: state.books.map(b => b.id === finalBook.id ? finalBook : b)
    };
    handleUpdate(newState);
  }, [state, handleUpdate]);

  const deleteBook = useCallback((id: string) => {
    const newState = {
      ...state,
      books: state.books.filter(b => b.id !== id)
    };
    handleUpdate(newState);
  }, [state, handleUpdate]);

  const reorderBooks = useCallback((newBooks: Book[]) => {
    handleUpdate({ ...state, books: newBooks });
  }, [state, handleUpdate]);

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
