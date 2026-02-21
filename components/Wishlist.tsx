
import React, { useState, useMemo, useEffect } from 'react';
import { Book, BookFormat, SortKey, SortDirection } from '../types';
import { ShoppingBag, BookOpenCheck, BookOpen, Tablet, Headphones, X, Search, Plus, ArrowUp, ArrowDown, ArrowDownUp, Loader2 } from 'lucide-react';
import { Reorder } from 'framer-motion';

import { AddWishlist } from './AddWishlist';
import { BookDetails } from './BookDetails';
import { useLibrary } from '../contexts/LibraryContext';
import { useBookFilter } from '../hooks/useBookFilter';
import { useBookSort } from '../hooks/useBookSort';
import { BookCover } from './ui/BookCover';
import { SortableBookItem } from './SortableBookItem';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { loadSortPrefs, saveSortPrefs } from '../services/storageService';

export const Wishlist: React.FC = () => {
  const { books, updateBook, reorderBooks, addBook } = useLibrary();
  const wishlistBooks = useMemo(() => books.filter(b => b.status === 'Wishlist'), [books]);

  // UI States for Panels
  const [showSortPanel, setShowSortPanel] = useState(false);

  // Create a custom filter wrapper (Pass empty arrays as we removed Wishlist filtering)
  const { filteredBooks, search, setSearch } = useBookFilter(wishlistBooks, [], []);
  
  // Sorting & Reorder Mode
  const initialPrefs = loadSortPrefs('wishlist_sort_prefs');
  const [sortKey, setSortKey] = useState<SortKey>(initialPrefs.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialPrefs.direction || 'desc');
  const [isReordering, setIsReordering] = useState(false);
  
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

  // Infinite Scroll
  const { visibleItems, observerTarget, hasMore } = useInfiniteScroll(
      sortedBooks, 
      20,
      [search, sortKey, sortDirection, isReordering]
  );
  const displayItems = isReordering ? sortedBooks : visibleItems;

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
  
  const handleReorder = (newOrder: Book[]) => {
      const otherItems = books.filter(b => b.status !== 'Wishlist');
      reorderBooks([...otherItems, ...newOrder]);
  };

  const handleToggleReorder = () => {
    if (isReordering) {
        // Turn off handles, keep custom sort
        setIsReordering(false);
        setSortKey('custom');
    } else {
        // Turn on handles, force custom sort
        setIsReordering(true);
        setSortKey('custom');
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

  if (isAdding) return <AddWishlist onAdd={(b) => { addBook(b); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />;

  const WishlistCard = ({ book, onClick }: { book: Book, onClick?: () => void }) => (
    <div 
      onClick={onClick}
      className={`bg-white p-3 rounded-2xl shadow-sm border border-transparent flex gap-4 items-center active:scale-95 transition-all cursor-pointer select-none`}
    >
      <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 shadow-sm relative">
         <BookCover book={book} className="w-full h-full" iconSize={16} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{book.author}</p>
        <p className="text-[9px] text-indigo-300 font-bold mt-1">{new Date(book.addedAt).toLocaleDateString('uk-UA')}</p>
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
      <div className="flex gap-2 h-12">
        <button 
            onClick={() => setIsAdding(true)}
            className="h-12 w-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
            <Plus size={24} />
        </button>

        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Пошук..." 
                className="w-full h-full pl-10 pr-10 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
            />
            {search.length > 0 && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5">
                    <X size={16} />
                </button>
            )}
        </div>

        <button
            onClick={() => { setShowSortPanel(!showSortPanel); }}
            className={`h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all ${showSortPanel ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-indigo-600 text-white shadow-indigo-200'}`}
        >
            <ArrowDownUp size={20} />
        </button>
      </div>

      {/* Sort Panel */}
      {showSortPanel && (
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</h3>
              <div className="grid grid-cols-2 gap-3">
                  {(['title', 'author', 'addedAt'] as SortKey[]).map((key) => {
                      const isActive = sortKey === key && !isReordering && sortKey !== 'custom';
                      return (
                        <button
                            key={key}
                            onClick={() => handleSortChange(key)}
                            className={`py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                isActive 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {key === 'title' ? 'Назва' : key === 'author' ? 'Автор' : 'Дата'}
                            {isActive && (
                                sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                            )}
                        </button>
                      );
                  })}
                  
                  <button
                    onClick={handleToggleReorder}
                    className={`py-4 rounded-2xl font-bold text-sm transition-all ${
                        isReordering || sortKey === 'custom'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Свій порядок
                  </button>
              </div>
          </div>
      )}

      {/* List */}
      {isReordering ? (
          <div className="space-y-3 select-none">
            <Reorder.Group axis="y" values={displayItems} onReorder={handleReorder}>
              {displayItems.map((book) => (
                  <SortableBookItem key={book.id} book={book} showHandle={true}>
                      <WishlistCard book={book} onClick={() => {}} />
                  </SortableBookItem>
              ))}
            </Reorder.Group>
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
           <p className="text-lg font-medium">{search ? 'Нічого не знайдено' : 'Ваш список бажань порожній'}</p>
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
              <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Оберіть формати</h3><button onClick={() => setQuickSelectBook(null)} className="p-2 bg-gray-50 rounded-full"><X size={20} /></button></div>
              <div className="space-y-3">
                {[ { id: 'Paper', label: 'Паперова', icon: <BookOpen size={18} /> }, { id: 'E-book', label: 'Електронна', icon: <Tablet size={18} /> }, { id: 'Audio', label: 'Аудіо', icon: <Headphones size={18} /> } ].map(f => (
                  <button key={f.id} onClick={() => { if(selectedReadingFormats.includes(f.id as any)) { if(selectedReadingFormats.length > 1) setSelectedReadingFormats(selectedReadingFormats.filter(x => x !== f.id)); } else setSelectedReadingFormats([...selectedReadingFormats, f.id as any]); }} className={`w-full flex justify-between items-center p-4 rounded-2xl font-bold text-sm border transition-all ${selectedReadingFormats.includes(f.id as any) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    <div className="flex items-center gap-3">{f.icon}<span>{f.label}</span></div>{selectedReadingFormats.includes(f.id as any) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </button>
                ))}
              </div>
              <button onClick={handleStartReading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">Почати читати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
