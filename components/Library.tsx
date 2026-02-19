
import React, { useState, useMemo, useEffect } from 'react';
import { Book } from '../types';
import { BookOpen, Lock, Unlock, Loader2 } from 'lucide-react';
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

interface LibraryProps {
  onAddClick: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onAddClick }) => {
  const { books, reorderBooks, filterTag, setFilterTag } = useLibrary();
  
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist'>('library');
  
  // Isolate Library Books (No Wishlist)
  const libraryBooks = useMemo(() => books.filter(b => b.status !== 'Wishlist'), [books]);

  // --- Custom Hooks ---
  const { 
    filteredBooks, 
    search, 
    setSearch, 
    selectedStatuses, 
    selectedFormats,
    toggleStatusFilter, 
    toggleFormatFilter, 
    clearFilters: resetFilters 
  } = useBookFilter(libraryBooks, ['Reading', 'Unread', 'Completed'], []);

  const { 
    sortedBooks, 
    sortKey, 
    sortDirection, 
    toggleSort 
  } = useBookSort(filteredBooks, loadSortPrefs().key, loadSortPrefs().direction);

  // Infinite Scroll Hook
  const { visibleItems: visibleBooks, observerTarget, hasMore } = useInfiniteScroll(sortedBooks, 20);
  
  const [isSortLocked, setIsSortLocked] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Sync with Global Filter (e.g. clicking a tag in BookDetails)
  useEffect(() => {
    if (filterTag !== search) {
        setSearch(filterTag);
    }
  }, [filterTag]);

  // Persist sort changes
  useEffect(() => {
    saveSortPrefs(sortKey, sortDirection);
  }, [sortKey, sortDirection]);

  // Wrappers
  const handleSearchUpdate = (term: string) => {
    setSearch(term);
    if (term === '') setFilterTag('');
  };

  const handleClearFilters = () => {
    resetFilters();
    setFilterTag('');
  };

  const toggleSortWrapper = (key: any) => {
     if (key === 'custom') setIsSortLocked(false);
     toggleSort(key);
  };

  // Search suggestions logic
  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const lowerSearch = search.toLowerCase();
    const set = new Set<string>();
    
    books.forEach(b => {
      if (b.title.toLowerCase().includes(lowerSearch)) set.add(b.title);
      if (b.author.toLowerCase().includes(lowerSearch)) set.add(b.author);
      if (b.publisher?.toLowerCase().includes(lowerSearch)) set.add(b.publisher);
      if (b.series?.toLowerCase().includes(lowerSearch)) set.add(b.series);
    });
    
    return Array.from(set).slice(0, 5);
  }, [search, books]);

  // --- Drag and Drop Logic ---
  // Note: Polyfill handles touch events, so we use standard onDrag* events
  const handleReorderDrop = (targetIndex: number) => {
      if (draggedItemIndex === null) return;
      
      const draggedBook = sortedBooks[draggedItemIndex];
      const targetBook = sortedBooks[targetIndex];
      
      if (draggedBook && targetBook && draggedBook.id !== targetBook.id) {
          const newGlobal = [...books];
          const fromIdx = newGlobal.findIndex(b => b.id === draggedBook.id);
          const toIdx = newGlobal.findIndex(b => b.id === targetBook.id);
          
          if (fromIdx !== -1 && toIdx !== -1) {
              const [removed] = newGlobal.splice(fromIdx, 1);
              newGlobal.splice(toIdx, 0, removed);
              reorderBooks(newGlobal);
          }
      }
      setDraggedItemIndex(null);
  };

  const canDrag = !isSortLocked && sortKey === 'custom' && search === '';

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header className="flex justify-between items-center">
        <div className="flex items-baseline gap-4">
          <h1 
            onClick={() => setActiveTab('library')}
            className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'library' ? 'text-gray-800' : 'text-gray-300'}`}
          >
            Бібліотека
          </h1>
          <h1 
            onClick={() => setActiveTab('wishlist')}
            className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'wishlist' ? 'text-gray-800' : 'text-gray-300'}`}
          >
            Бажанки
          </h1>
        </div>
        {sortKey === 'custom' && activeTab === 'library' && (
            <button 
            onClick={() => setIsSortLocked(!isSortLocked)}
            className={`p-3 rounded-2xl transition-all ${isSortLocked ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
            >
            {isSortLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
        )}
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
            onToggleSort={toggleSortWrapper}
            selectedStatuses={selectedStatuses}
            selectedFormats={selectedFormats}
            onToggleStatus={toggleStatusFilter}
            onToggleFormat={toggleFormatFilter}
            onClearFilters={handleClearFilters}
          />

          <div className="space-y-3">
            {visibleBooks.map((book, idx) => (
              <BookCard
                key={book.id}
                book={book}
                index={idx}
                isDraggable={canDrag}
                isDragged={draggedItemIndex === idx}
                onClick={setSelectedBook}
                onDragStart={(e) => { setDraggedItemIndex(idx); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => { e.preventDefault(); handleReorderDrop(idx); }}
                onDragEnd={() => setDraggedItemIndex(null)}
              />
            ))}
            
            {sortedBooks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                <BookOpen size={48} className="mb-2 opacity-20" />
                <p className="text-sm">Книг не знайдено</p>
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-4">
                <Loader2 className="animate-spin text-gray-300" size={20} />
              </div>
            )}
          </div>
        </>
      ) : (
        <Wishlist isSortLocked={isSortLocked} />
      )}

      {selectedBook && !readingModeOpen && (
        <BookDetails 
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onOpenReadingMode={() => setReadingModeOpen(true)}
        />
      )}

      {readingModeOpen && selectedBook && (
        <ReadingMode 
          book={selectedBook}
          onClose={() => setReadingModeOpen(false)}
        />
      )}
    </div>
  );
};
