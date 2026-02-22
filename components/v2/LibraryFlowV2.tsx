import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Book } from '../../types';
import { getBookPageTotal } from '../../utils';
import { createClientId } from '../../services/id';
import { useLibrary } from '../../contexts/LibraryContext';
import { BookCard } from '../BookCard';
import { AddBookV2 } from './AddBookV2';
import { AddWishlistV2 } from './AddWishlistV2';
import { EditBookV2 } from './EditBookV2';
import { BookDetailsV2 } from './BookDetailsV2';

type V2Tab = 'library' | 'wishlist';

type V2Route =
  | { kind: 'list'; tab: V2Tab }
  | { kind: 'add'; tab: V2Tab }
  | { kind: 'details'; tab: V2Tab; bookId: string }
  | { kind: 'edit'; tab: V2Tab; bookId: string };

interface LibraryFlowV2Props {
  onNavigateToReading?: () => void;
}

export const LibraryFlowV2: React.FC<LibraryFlowV2Props> = ({ onNavigateToReading }) => {
  const { books, addBook, updateBook, deleteBook } = useLibrary();
  const [route, setRoute] = useState<V2Route>({ kind: 'list', tab: 'library' });
  const [search, setSearch] = useState('');

  const libraryBooks = useMemo(() => books.filter((b) => b.status !== 'Wishlist'), [books]);
  const wishlistBooks = useMemo(() => books.filter((b) => b.status === 'Wishlist'), [books]);

  const currentTab = route.tab;
  const sourceBooks = currentTab === 'library' ? libraryBooks : wishlistBooks;

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sourceBooks;
    return sourceBooks.filter((b) => {
      const haystack = [b.title, b.author, b.genre || '', b.publisher || ''].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, sourceBooks]);

  const uniquePublishers = useMemo(() => {
    const pubs = new Set<string>();
    books.forEach((b) => {
      if (b.publisher && b.publisher.trim()) pubs.add(b.publisher.trim());
    });
    return Array.from(pubs).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [books]);

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    books.forEach((b) => {
      const value = (b.genre || '').trim();
      if (value) genres.add(value);
    });
    return Array.from(genres).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [books]);

  const openList = useCallback((tab: V2Tab) => {
    setRoute({ kind: 'list', tab });
  }, []);

  const handleSaveInEdit = useCallback(
    (updatedBook: Book, tab: V2Tab) => {
      let finalBook = { ...updatedBook };
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
          finalBook.sessions = [
            {
              id: createClientId(),
              date: dateStr,
              duration: durationSeconds,
              pages: totalPages,
            },
          ];
        }
      }
      updateBook(finalBook);
      setRoute({ kind: 'details', tab, bookId: finalBook.id });
    },
    [updateBook]
  );

  if (route.kind === 'add') {
    if (route.tab === 'library') {
      return (
        <AddBookV2
          publisherSuggestions={uniquePublishers}
          genreSuggestions={uniqueGenres}
          onAdd={(book) => {
            addBook(book);
            openList('library');
          }}
          onCancel={() => openList('library')}
        />
      );
    }
    return (
      <AddWishlistV2
        onAdd={(book) => {
          addBook(book);
          openList('wishlist');
        }}
        onCancel={() => openList('wishlist')}
      />
    );
  }

  if (route.kind === 'details') {
    const liveBook = books.find((b) => b.id === route.bookId);
    if (!liveBook) {
      return (
        <div className="p-4 pb-24 text-gray-800">
          <p className="text-sm text-gray-500">Book was not found. Returning to list...</p>
          <button className="mt-3 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold" onClick={() => openList(route.tab)}>
            Back
          </button>
        </div>
      );
    }

    return (
      <BookDetailsV2
          book={liveBook}
          onBack={() => openList(route.tab)}
          onOpenReadingMode={() => onNavigateToReading?.()}
          onEdit={() => setRoute({ kind: 'edit', tab: route.tab, bookId: liveBook.id })}
          onDelete={() => {
            deleteBook(liveBook.id);
            openList(route.tab);
          }}
          onStartReadingWishlist={() => {
            updateBook({
              ...liveBook,
              status: 'Reading',
              readingStartedAt: new Date().toISOString(),
            });
            if (onNavigateToReading) {
              onNavigateToReading();
            } else {
              openList('library');
            }
          }}
      />
    );
  }

  if (route.kind === 'edit') {
    const liveBook = books.find((b) => b.id === route.bookId);
    if (!liveBook) {
      return (
        <div className="p-4 pb-24 text-gray-800">
          <p className="text-sm text-gray-500">Book was not found. Returning to list...</p>
          <button className="mt-3 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold" onClick={() => openList(route.tab)}>
            Back
          </button>
        </div>
      );
    }

    return (
      <EditBookV2
          book={liveBook}
          onCancel={() => setRoute({ kind: 'details', tab: route.tab, bookId: liveBook.id })}
          onSave={(book) => handleSaveInEdit(book, route.tab)}
          publisherSuggestions={uniquePublishers}
          genreSuggestions={uniqueGenres}
      />
    );
  }

  return (
    <div className="p-4 pb-24 text-gray-800 space-y-4">
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur-sm border-b border-gray-100 space-y-4">
        <header className="flex items-center gap-4">
          <button
            onClick={() => openList('library')}
            className={`text-3xl font-bold transition-colors ${currentTab === 'library' ? 'text-gray-800' : 'text-gray-300'}`}
          >
            Library
          </button>
          <button
            onClick={() => openList('wishlist')}
            className={`text-3xl font-bold transition-colors ${currentTab === 'wishlist' ? 'text-gray-800' : 'text-gray-300'}`}
          >
            Wishlist
          </button>
        </header>

        <div className="flex gap-2 h-12">
          <button
            onClick={() => setRoute({ kind: 'add', tab: currentTab })}
            className="h-12 w-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            title={currentTab === 'library' ? 'Add book' : 'Add wishlist'}
          >
            <Plus size={24} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-full pl-10 pr-3 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="py-8 text-sm text-gray-500">No books found.</div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onClick={(selectedBook) =>
                setRoute({
                  kind: 'details',
                  tab: currentTab,
                  bookId: selectedBook.id,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
