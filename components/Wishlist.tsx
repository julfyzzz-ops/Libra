
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Book, BookFormat, SortKey, SortDirection } from '../types';
import { ShoppingBag, BookOpenCheck, BookOpen, Tablet, Headphones, X, Loader2 } from 'lucide-react';

import { AddWishlist } from './AddWishlist';
import { BookDetails } from './BookDetails';
import { useLibrary } from '../contexts/LibraryContext';
import { useBookFilter } from '../hooks/useBookFilter';
import { useBookSort } from '../hooks/useBookSort';
import { BookCover } from './ui/BookCover';
import { SortableBookItem } from './SortableBookItem';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { loadSortPrefs, saveSortPrefs } from '../services/storageService';
import { WishlistControls } from './WishlistControls';

export const Wishlist: React.FC = () => {
  const { books, updateBook, reorderBooks, addBook } = useLibrary();
  const wishlistBooks = useMemo(() => books.filter(b => b.status === 'Wishlist'), [books]);

  // Create a custom filter wrapper (Pass empty arrays as we removed Wishlist filtering)
  const { filteredBooks, search, setSearch } = useBookFilter(wishlistBooks, [], []);
  
  // Sorting & Reorder Mode
  const initialPrefs = loadSortPrefs('wishlist_sort_prefs');
  const [sortKey, setSortKey] = useState<SortKey>(initialPrefs.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialPrefs.direction || 'desc');
  const [isReordering, setIsReordering] = useState(false);
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
  
  // Persist Sort
  useEffect(() => {
    // Persist unless reordering handles are showing
    if (!isReordering) saveSortPrefs('wishlist_sort_prefs', sortKey, sortDirection);
  }, [sortKey, sortDirection, isReordering]);

  const { sortedBooks } = useBookSort(
      filteredBooks, 
      isReordering ? 'custom' : sortKey, 
      sortDirection
  );

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

  // Infinite Scroll
  const { visibleItems, observerTarget, hasMore } = useInfiniteScroll(
      sortedBooks, 
      20,
      [search, sortKey, sortDirection, isReordering]
  );
  const displayItems = isReordering ? reorderDraft : visibleItems;
  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const lower = search.toLowerCase();
    const set = new Set<string>();
    wishlistBooks.forEach((b) => {
      if (b.title.toLowerCase().includes(lower)) set.add(b.title);
      if (b.author.toLowerCase().includes(lower)) set.add(b.author);
    });
    return Array.from(set).slice(0, 5);
  }, [search, wishlistBooks]);

  // Selection States
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quickSelectBook, setQuickSelectBook] = useState<Book | null>(null);
  const [selectedReadingFormats, setSelectedReadingFormats] = useState<BookFormat[]>(['Paper']);
  const [isAdding, setIsAdding] = useState(false);

  // --- Handlers ---

  const handleStartReading = () => {
    if (quickSelectBook) {
      updateBook({ ...quickSelectBook, status: 'Reading', formats: selectedReadingFormats, readingStartedAt: new Date().toISOString() });
      setQuickSelectBook(null);
    }
  };
  
  const commitReorder = useCallback(() => {
      if (!isReordering) return;
      const draftOrder = reorderDraftRef.current;
      if (draftOrder.length === 0) return;
      const currentWishlistOrder = books.filter(b => b.status === 'Wishlist');
      const isSameOrder = draftOrder.length === currentWishlistOrder.length && draftOrder.every((b, idx) => b.id === currentWishlistOrder[idx]?.id);
      if (isSameOrder) return;
      const otherItems = books.filter(b => b.status !== 'Wishlist');
      reorderBooks([...otherItems, ...draftOrder]);
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

  const handleToggleReorder = () => {
    if (isReordering) {
        commitReorder();
        // Turn off handles, keep custom sort
        setIsReordering(false);
        setSortKey('custom');
    } else {
        // Turn on handles, force custom sort
        setIsReordering(true);
        setSortKey('custom');
        setReorderDraft(sortedBooks);
        reorderDraftRef.current = sortedBooks;
        setSearch(''); 
    }
  };
  
  const handleSortChange = (key: SortKey) => {
      if (isReordering) setIsReordering(false);

      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection(key === 'addedAt' ? 'desc' : 'asc');
      }
  };

  const handleNoopBookClick = useCallback((_book: Book) => {}, []);

  if (isAdding) {
    return (
      <AddWishlist
        onAdd={(b) => {
          try {
            addBook(b);
          } catch (error) {
            console.error('Failed to add wishlist item', error);
            alert('Не вдалося додати бажанку');
          } finally {
            setIsAdding(false);
          }
        }}
        onCancel={() => setIsAdding(false)}
      />
    );
  }

  const WishlistCard = ({ book, onClick, performanceMode = false }: { book: Book, onClick?: () => void, performanceMode?: boolean }) => (
    <div 
      onClick={onClick}
      className={`bg-white p-3 rounded-2xl border flex gap-4 items-center cursor-pointer select-none ${performanceMode ? 'border-gray-100' : 'shadow-sm border-transparent active:scale-95 transition-all'}`}
    >
      <div className={`w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative ${performanceMode ? 'border border-gray-100' : 'shadow-sm'}`}>
         <BookCover book={book} className="w-full h-full" iconSize={16} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{book.author}</p>
        {!performanceMode && <p className="text-[9px] text-indigo-300 font-bold mt-1">{new Date(book.addedAt).toLocaleDateString('uk-UA')}</p>}
      </div>
      {!isReordering && (
        <div className="flex gap-2 pr-2">
            <button onClick={(e) => { e.stopPropagation(); setQuickSelectBook(book); setSelectedReadingFormats(book.formats || ['Paper']); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all hover:bg-indigo-100"><BookOpenCheck size={18} /></button>
        </div>
      )}
    </div>
  );

  return (
    <div className="text-gray-800 space-y-4">
      {/* Header Controls */}
      <div className="sticky top-[56px] z-20 -mx-4 mt-4 px-4 pt-0 pb-2 bg-slate-50/95 backdrop-blur-sm border-b border-gray-100">
        <WishlistControls
          search={search}
          onSearchChange={setSearch}
          suggestions={suggestions}
          onAddClick={() => setIsAdding(true)}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          isReordering={isReordering}
          onToggleReorder={handleToggleReorder}
        />
      </div>

      {/* List */}
      {isReordering ? (
          <div className="space-y-3 select-none relative">
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
                      <WishlistCard book={book} performanceMode={true} onClick={() => handleNoopBookClick(book)} />
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
                    <WishlistCard book={book} onClick={() => setSelectedBook(book)} />
                </div>
            ))}
          </div>
      )}

      {sortedBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 text-gray-300">
           <ShoppingBag size={64} opacity={0.2} />
           <p className="text-lg font-medium">{search ? 'РќС–С‡РѕРіРѕ РЅРµ Р·РЅР°Р№РґРµРЅРѕ' : 'Р’Р°С€ СЃРїРёСЃРѕРє Р±Р°Р¶Р°РЅСЊ РїРѕСЂРѕР¶РЅС–Р№'}</p>
        </div>
      )}
      
      {!isReordering && hasMore && (
          <div ref={observerTarget} className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
      )}

      {selectedBook && (
        <BookDetails book={selectedBook} onClose={() => setSelectedBook(null)} onOpenReadingMode={() => {}} />
      )}

      {/* Quick Select Modal (Start Reading) */}
      {quickSelectBook && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-lg font-bold">РћР±РµСЂС–С‚СЊ С„РѕСЂРјР°С‚Рё</h3><button onClick={() => setQuickSelectBook(null)} className="p-2 bg-gray-50 rounded-full"><X size={20} /></button></div>
              <div className="space-y-3">
                {[ { id: 'Paper', label: 'РџР°РїРµСЂРѕРІР°', icon: <BookOpen size={18} /> }, { id: 'E-book', label: 'Р•Р»РµРєС‚СЂРѕРЅРЅР°', icon: <Tablet size={18} /> }, { id: 'Audio', label: 'РђСѓРґС–Рѕ', icon: <Headphones size={18} /> } ].map(f => (
                  <button key={f.id} onClick={() => { if(selectedReadingFormats.includes(f.id as any)) { if(selectedReadingFormats.length > 1) setSelectedReadingFormats(selectedReadingFormats.filter(x => x !== f.id)); } else setSelectedReadingFormats([...selectedReadingFormats, f.id as any]); }} className={`w-full flex justify-between items-center p-4 rounded-2xl font-bold text-sm border transition-all ${selectedReadingFormats.includes(f.id as any) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    <div className="flex items-center gap-3">{f.icon}<span>{f.label}</span></div>{selectedReadingFormats.includes(f.id as any) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </button>
                ))}
              </div>
              <button onClick={handleStartReading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">РџРѕС‡Р°С‚Рё С‡РёС‚Р°С‚Рё</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

