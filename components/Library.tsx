
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Book, BookFormat, SortKey, SortDirection } from '../types';
import { BookOpen, Loader2 } from 'lucide-react';

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
import { BookCover } from './ui/BookCover';

interface LibraryProps {
  onAddClick: () => void;
}

export const Library: React.FC<LibraryProps> = ({ onAddClick }) => {
  const { books, reorderBooks, filterTag, setFilterTag } = useLibrary();
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist'>('library');
  const libraryBooks = useMemo(() => books.filter(b => b.status !== 'Wishlist'), [books]);
  const defaultEnabledFormats: BookFormat[] = ['Paper', 'E-book', 'Audio', 'Pirate', 'Expected'];

  // --- Filtering ---
  const { 
    filteredBooks, 
    search, setSearch, 
    selectedStatuses, selectedFormats,
    toggleStatusFilter, toggleFormatFilter, 
    clearFilters: resetFilters 
  } = useBookFilter(libraryBooks, ['Reading', 'Unread', 'Completed'], defaultEnabledFormats);

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
  const [reorderDraft, setReorderDraft] = useState<Book[]>([]);
  const reorderDraftRef = useRef<Book[]>([]);
  const draggingBookIdRef = useRef<string | null>(null);
  const pointerYRef = useRef<number | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [draggingBookId, setDraggingBookId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);

  // Sync Global Filter
  useEffect(() => {
    if (filterTag !== search) setSearch(filterTag);
  }, [filterTag]);

  // Persist Sort
  useEffect(() => {
    // Persist unless reordering handles are showing (prevent heavy updates during drag)
    if (!isReordering) saveSortPrefs('library_sort_prefs', sortKey, sortDirection);
  }, [sortKey, sortDirection, isReordering]);

  useEffect(() => {
    reorderDraftRef.current = reorderDraft;
  }, [reorderDraft]);

  useEffect(() => {
    if (isReordering) {
      setReorderDraft(sortedBooks);
    }
  }, [isReordering, sortedBooks]);

  const EDGE_THRESHOLD_PX = 120;
  const MAX_SCROLL_STEP_PX = 22;

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
          commitReorder();
          // Turning OFF handles, keeping custom sort
          setIsReordering(false);
          setSortKey('custom'); 
      } else {
          // Turning ON handles
          setIsReordering(true);
          setSortKey('custom');
          setReorderDraft(sortedBooks);
          reorderDraftRef.current = sortedBooks;
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

  const commitReorder = useCallback(() => {
      if (!isReordering) return;
      const draftOrder = reorderDraftRef.current;
      if (draftOrder.length === 0) return;
      const currentLibraryOrder = books.filter(b => b.status !== 'Wishlist');
      const isSameOrder = draftOrder.length === currentLibraryOrder.length && draftOrder.every((b, idx) => b.id === currentLibraryOrder[idx]?.id);
      if (isSameOrder) return;
      const nonLibraryItems = books.filter(b => b.status === 'Wishlist');
      const newGlobalList = [...draftOrder, ...nonLibraryItems];
      reorderBooks(newGlobalList);
  }, [books, isReordering, reorderBooks]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const computeDropFromPointer = useCallback((clientY: number, draggedId: string) => {
    const ordered = reorderDraftRef.current;
    const remaining = ordered.filter((b) => b.id !== draggedId);
    if (remaining.length === 0) {
      setDropIndex(0);
      setIndicatorTop(0);
      return;
    }

    const measured = remaining
      .map((b) => {
        const el = itemRefs.current.get(b.id);
        if (!el) return null;
        return { id: b.id, rect: el.getBoundingClientRect() };
      })
      .filter(Boolean) as { id: string; rect: DOMRect }[];

    if (measured.length === 0) return;

    const GAP_FALLBACK = 12;
    let nextDropIndex = measured.length;
    let nextTop = measured[measured.length - 1].rect.bottom + GAP_FALLBACK / 2;

    for (let i = 0; i < measured.length; i++) {
      const { rect } = measured[i];
      if (clientY < rect.top + rect.height / 2) {
        nextDropIndex = i;
        if (i === 0) {
          nextTop = rect.top - GAP_FALLBACK / 2;
        } else {
          const prevRect = measured[i - 1].rect;
          nextTop = (prevRect.bottom + rect.top) / 2;
        }
        break;
      }
    }

    dropIndexRef.current = nextDropIndex;
    setDropIndex((prev) => (prev === nextDropIndex ? prev : nextDropIndex));
    setIndicatorTop((prev) => (prev === nextTop ? prev : nextTop));
  }, []);

  const autoScrollStep = useCallback(() => {
    const pointerY = pointerYRef.current;
    const draggedId = draggingBookIdRef.current;
    if (pointerY === null || !draggedId) {
      stopAutoScroll();
      return;
    }

    const viewportHeight = window.innerHeight;
    let delta = 0;
    if (pointerY < EDGE_THRESHOLD_PX) {
      const proximity = (EDGE_THRESHOLD_PX - pointerY) / EDGE_THRESHOLD_PX;
      delta = -Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, proximity));
    } else if (pointerY > viewportHeight - EDGE_THRESHOLD_PX) {
      const proximity = (pointerY - (viewportHeight - EDGE_THRESHOLD_PX)) / EDGE_THRESHOLD_PX;
      delta = Math.ceil(MAX_SCROLL_STEP_PX * Math.min(1, proximity));
    }

    if (delta !== 0) {
      window.scrollBy(0, delta);
      computeDropFromPointer(pointerY, draggedId);
    }

    autoScrollRafRef.current = requestAnimationFrame(autoScrollStep);
  }, [computeDropFromPointer, stopAutoScroll]);

  const finishDrag = useCallback(() => {
    const draggedId = draggingBookIdRef.current;
    const targetIndex = dropIndexRef.current;

    if (draggedId !== null && targetIndex !== null) {
      const current = reorderDraftRef.current;
      const draggedBook = current.find((b) => b.id === draggedId);
      if (draggedBook) {
        const withoutDragged = current.filter((b) => b.id !== draggedId);
        const safeIndex = Math.max(0, Math.min(targetIndex, withoutDragged.length));
        const nextOrder = [
          ...withoutDragged.slice(0, safeIndex),
          draggedBook,
          ...withoutDragged.slice(safeIndex),
        ];
        reorderDraftRef.current = nextOrder;
        setReorderDraft(nextOrder);
        commitReorder();
      }
    }

    draggingBookIdRef.current = null;
    pointerYRef.current = null;
    setDraggingBookId(null);
    setDropIndex(null);
    dropIndexRef.current = null;
    setIndicatorTop(null);
    window.removeEventListener('pointermove', handleGlobalPointerMove);
    window.removeEventListener('pointerup', finishDrag);
    stopAutoScroll();
  }, [commitReorder, stopAutoScroll]);

  const handleGlobalPointerMove = useCallback((event: PointerEvent) => {
    const draggedId = draggingBookIdRef.current;
    if (!draggedId) return;
    pointerYRef.current = event.clientY;
    computeDropFromPointer(event.clientY, draggedId);
  }, [computeDropFromPointer]);

  const startDragFromHandle = useCallback((event: React.PointerEvent<HTMLDivElement>, itemId: string) => {
    if (!isReordering) return;
    event.preventDefault();
    event.stopPropagation();
    draggingBookIdRef.current = itemId;
    pointerYRef.current = event.clientY;
    setDraggingBookId(itemId);
    computeDropFromPointer(event.clientY, itemId);
    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', finishDrag);
    if (autoScrollRafRef.current === null) {
      autoScrollRafRef.current = requestAnimationFrame(autoScrollStep);
    }
  }, [autoScrollStep, computeDropFromPointer, finishDrag, handleGlobalPointerMove, isReordering]);

  const setItemRef = useCallback((itemId: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(itemId, el);
    } else {
      itemRefs.current.delete(itemId);
    }
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      stopAutoScroll();
    };
  }, [finishDrag, handleGlobalPointerMove, stopAutoScroll]);

  const handleNoopBookClick = useCallback((_book: Book) => {}, []);

  // --- Infinite Scroll ---
  // Pass Reset Dependencies: Only reset scroll limit if filters, sort, or mode changes.
  // Do NOT reset if only 'sortedBooks' content updates (e.g. after edit).
  const { visibleItems, observerTarget, hasMore } = useInfiniteScroll(
      sortedBooks, 
      20,
      [search, selectedStatuses, selectedFormats, sortKey, sortDirection, isReordering, activeTab]
  );
  
  const displayItems = isReordering ? reorderDraft : visibleItems;

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-slate-50/95 backdrop-blur-sm border-b border-gray-100">
        <header className="flex justify-between items-center">
          <div className="flex items-baseline gap-4">
            <h1 onClick={() => setActiveTab('library')} className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'library' ? 'text-gray-800' : 'text-gray-300'}`}>Бібліотека</h1>
            <h1 onClick={() => setActiveTab('wishlist')} className={`text-3xl font-bold cursor-pointer transition-colors ${activeTab === 'wishlist' ? 'text-gray-800' : 'text-gray-300'}`}>Бажанки</h1>
          </div>
        </header>
        {activeTab === 'library' && (
          <div className="mt-4">
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
          </div>
        )}
      </div>

      {activeTab === 'library' ? (
        <>

          {isReordering ? (
             <div className="space-y-3 relative">
                    {displayItems.map((book) => (
                        <SortableBookItem
                          key={book.id}
                          itemId={book.id}
                          showHandle={true}
                          performanceMode={true}
                          isDragging={draggingBookId === book.id}
                          onHandlePointerDown={startDragFromHandle}
                          setItemRef={setItemRef}
                        >
                            <div
                              onClick={() => handleNoopBookClick(book)}
                              className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center select-none"
                            >
                              <div className="w-12 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 relative">
                                <BookCover book={book} className="w-full h-full" iconSize={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
                                <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${book.status === 'Completed' ? 'bg-emerald-500' : book.status === 'Reading' ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                            </div>
                        </SortableBookItem>
                    ))}
                {draggingBookId && indicatorTop !== null && (
                  <div
                    className="pointer-events-none fixed z-40 h-1.5 rounded-full"
                    style={{
                      left: '1.25rem',
                      right: '1.25rem',
                    top: `${Math.round(indicatorTop)}px`,
                    transform: 'translateY(calc(-50% - 12px))',
                    backgroundColor: 'var(--accent-600)',
                    boxShadow: '0 0 0 3px var(--bg-main), 0 0 12px var(--accent-600)',
                  }}
                  />
                )}
             </div>
          ) : (
             <div className="space-y-3">
                {displayItems.map((book) => (
                    <div key={book.id}>
                        <BookCard
                            book={book}
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

