
import React, { useState, useMemo, useEffect } from 'react';
import { Book } from '../types';
import { useLibrary } from '../contexts/LibraryContext';
import { getBookPageTotal } from '../utils';
import { BookView } from './BookView';
import { BookEdit } from './BookEdit';

interface BookDetailsProps {
  book: Book;
  onClose: () => void;
  onOpenReadingMode: () => void;
}

export const BookDetails: React.FC<BookDetailsProps> = ({ book, onClose, onOpenReadingMode }) => {
  const { updateBook, deleteBook, books, setFilterTag } = useLibrary();
  const [isEditing, setIsEditing] = useState(false);
  const liveBook = useMemo(
    () => books.find((b) => b.id === book.id) || book,
    [books, book]
  );

  // Extract unique publishers from context books for autocomplete in Edit Mode
  const uniquePublishers = useMemo(() => {
    const pubs = new Set<string>();
    books.forEach(b => {
      if (b.publisher && b.publisher.trim()) pubs.add(b.publisher.trim());
    });
    return Array.from(pubs).sort();
  }, [books]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close details if the book was deleted elsewhere.
  useEffect(() => {
    if (!books.some((b) => b.id === book.id)) {
      onClose();
    }
  }, [books, book.id, onClose]);

  const handleSave = (updatedBook: Book) => {
    let finalBook = { ...updatedBook };
    
    // Auto-calculate sessions if moving to completed
    if (finalBook.status === 'Completed') {
        if (!finalBook.completedAt) {
           finalBook.completedAt = new Date().toISOString();
        }
        const totalPages = getBookPageTotal(finalBook);
        if ((!finalBook.pagesRead || finalBook.pagesRead < totalPages) && totalPages > 0) {
           finalBook.pagesRead = totalPages;
        }
        if ((!finalBook.sessions || finalBook.sessions.length === 0) && totalPages > 0) {
            const durationSeconds = Math.round(totalPages * 72);
            const dateStr = finalBook.completedAt.split('T')[0];
            finalBook.sessions = [{
                id: crypto.randomUUID(),
                date: dateStr,
                duration: durationSeconds,
                pages: totalPages
            }];
        }
    }

    setIsEditing(false);
    // Close editor first for responsive UX, persist right after.
    setTimeout(() => updateBook(finalBook), 0);
  };

  const handleStartReadingWishlist = () => {
      updateBook({
          ...liveBook,
          status: 'Reading',
          readingStartedAt: new Date().toISOString()
      });
      onClose();
  };

  const handleTagClick = (tag?: string) => {
      if (tag) {
          setFilterTag(tag);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 bg-white overflow-hidden">
        {isEditing ? (
            <BookEdit 
                book={liveBook} 
                onClose={() => setIsEditing(false)} 
                onSave={handleSave}
                uniquePublishers={uniquePublishers}
            />
        ) : (
            <BookView 
                book={liveBook} 
                onClose={onClose} 
                onOpenReadingMode={onOpenReadingMode}
                onEdit={() => setIsEditing(true)}
                onDelete={() => { deleteBook(liveBook.id); onClose(); }}
                onTagClick={handleTagClick}
                onStartReadingWishlist={handleStartReadingWishlist}
            />
        )}
      </div>
    </div>
  );
};
