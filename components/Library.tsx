
import React, { useState, useMemo, useEffect } from 'react';
import { Book, SortKey, SortDirection } from '../types';
import { BookOpen, Loader2 } from 'lucide-react';
import { Reorder } from 'framer-motion';

import { Wishlist } from './Wishlist';
import { BookDetails } from './BookDetails';
import { ReadingMode } from './ReadingMode';
import { loadSortPrefs, saveSortPrefs } from '../services/storageService';
import { useLibrary } from '../contexts/LibraryContext';
import { useBookFilter } from '../hooks/useBookFilter';
import { useBookSort } from '../hooks/useBookSort';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { LibraryControls } from './LibraryControls';
import { BookCard } from './BookCard';
import { SortableBookItem } from './SortableBookItem';

interface LibraryProps {
  onAddClick: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onAddClick }) => {
  const { books, reorderBooks, filterTag, setFilterTag } = useLibrary();
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist'>('library');
  const libraryBooks = useMemo(() => books.filter(b => b.status !== 'Wishlist'), [books]);

  // --- Filtering ---
  const { 
    filteredBooks, 
    search, setSearch, 
    selectedStatuses, selectedFormats,
    toggleStatusFilter, toggleFormatFilter, 
    clearFilters: resetFilters 
  } = useBookFilter(libraryBooks, ['Reading', 'Unread', 'Completed'], []);

  // --- Sorting ---
  // Use a specific key for Library sort to distinguish from Wishlist
  const initialPrefs = loadSortPrefs('library_sort_prefs');
  const [sortKey, setSortKey] = useState<SortKey>(initialPrefs.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialPrefs.direction || 'desc');
  
  // Separate state for "Reorder Mode" (handles visible)
  const [isReordering, setIsReordering] = useState(false);

  // Hook is now pure; we pass in the active state
  // If isReordering is true, we force 'custom'. If isReordering is false but sortKey is 'custom', we also use 'custom'.
  const { sortedBooks } = useBookSort(
      filteredBooks, 
      isReordering ? 'custom' : sortKey, 
      sortDirection
  );

  // --- UI States ---
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);

  // Sync Global Filter
  useEffect(() => {
    if (filterTag !== search) setSearch(filterTag);
  }, [filterTag]);

  // Persist Sort
  useEffect(() => {
    // Persist unless reordering handles are showing (prevent heavy updates during drag)
    if (!isReordering) saveSortPrefs('library_sort_prefs', sortKey, sortDirection);
  }, [sortKey, sortDirection, isReordering]);

  // Search Logic
  const handleSearchUpdate = (term: string) => {
    setSearch(term);
    if (term === '') setFilterTag('');
    if (term && isReordering) setIsReordering(false); // Disable reorder handles if searching
  };

  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const lower = search.toLowerCase();
    const set = new Set<string>();
    books.forEach(b => {
      if (b.title.toLowerCase().includes(lower)) set.add(b.title);
      if (b.author.toLowerCase().includes(lower)) set.add(b.author);
    });
    return Array.from(set).slice(0, 5);
  }, [search, books]);

  const handleToggleReorder = () => {
      if (isReordering) {
          // Turning OFF handles, keeping custom sort
          setIsReordering(false);
          setSortKey('custom'); 
      } else {
          // Turning ON handles
          setIsReordering(true);
          setSortKey('custom');
          setSearch(''); 
          resetFilters(); 
      }
  };

  const handleSortChange = (key: SortKey) => {
      // Disable reordering handles if sorting is clicked
      if (isReordering) setIsReordering(false);

      if (sortKey === key) {
          // Toggle direction
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          // New key
          setSortKey(key);
          setSortDirection(key === 'addedAt' ? 'desc' : 'asc');
      }
  };

  const handleReorder = (newOrder: Book[]) => {
      const nonLibraryItems = books.filter(b => b.status === 'Wishlist');
      const newGlobalList = [...newOrder, ...nonLibraryItems];
      reorderBooks(newGlobalList);
  };

  // --- Infinite Scroll ---
  // Pass Reset Dependencies: Only reset scroll limit if filters, sort, or mode changes.
  // Do NOT reset if only 'sortedBooks' content updates (e.g. after edit).
  const { visibleItems, observerTarget, hasMore } = useInfiniteScroll(
      sortedBooks, 
      20,
      [search, selectedStatuses, selectedFormats, sortKey, sortDirection, isReordering, activeTab]
  );
  
  const displayItems = isReordering ? sortedBooks : visibleItems;

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#f8fafc]/95 backdrop-blur-sm border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-baseline gap-4">
          <h1 onClick={() => setActiveTab('library')} className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'library' ? 'text-gray-800' : 'text-gray-300'}`}>Бібліотека</h1>
          <h1 onClick={() => setActiveTab('wishlist')} className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'wishlist' ? 'text-gray-800' : 'text-gray-300'}`}>Бажанки</h1>
        </div>
      </header>

      {activeTab === 'library' ? (
        <>
          <LibraryControls 
            search={search}
            onSearchChange={handleSearchUpdate}
            suggestions={suggestions}
            onAddClick={onAddClick}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            isReordering={isReordering}
            onToggleReorder={handleToggleReorder}
            selectedStatuses={selectedStatuses}
            selectedFormats={selectedFormats}
            onToggleStatus={toggleStatusFilter}
            onToggleFormat={toggleFormatFilter}
            onClearFilters={resetFilters}
          />

          {isReordering ? (
             <div className="space-y-3">
                <Reorder.Group axis="y" values={displayItems} onReorder={handleReorder}>
                    {displayItems.map((book, idx) => (
                        <SortableBookItem key={book.id} book={book} showHandle={true}>
                            <BookCard
                                book={book}
                                index={idx}
                                onClick={() => {}} // Click disabled during reorder
                                isDragging={false} 
                            />
                        </SortableBookItem>
                    ))}
                </Reorder.Group>
             </div>
          ) : (
             <div className="space-y-3">
                {displayItems.map((book, idx) => (
                    <div key={book.id}>
                        <BookCard
                            book={book}
                            index={idx}
                            onClick={setSelectedBook}
                        />
                    </div>
                ))}
             </div>
          )}

          {sortedBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
              <BookOpen size={48} className="mb-2 opacity-20" />
              <p className="text-sm">Книг не знайдено</p>
            </div>
          )}

          {!isReordering && hasMore && (
              <div ref={observerTarget} className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
          )}
        </>
      ) : (
        <Wishlist />
      )}

      {selectedBook && !readingModeOpen && (
        <BookDetails book={selectedBook} onClose={() => setSelectedBook(null)} onOpenReadingMode={() => setReadingModeOpen(true)} />
      )}

      {readingModeOpen && selectedBook && (
        <ReadingMode book={selectedBook} onClose={() => setReadingModeOpen(false)} />
      )}
    </div>
  );
};
