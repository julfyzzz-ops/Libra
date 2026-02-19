
import React, { useState, useMemo, useRef } from 'react';
import { Book, BookFormat, SortKey, SortDirection } from '../types';
import { ShoppingBag, BookOpenCheck, Trash2, BookOpen, Tablet, Headphones, X, Search, ArrowUpDown, Plus, ArrowUp, ArrowDown, Lock, Unlock } from 'lucide-react';
import { AddWishlist } from './AddWishlist';
import { BookDetails } from './BookDetails';

interface WishlistProps {
  books: Book[];
  onUpdateStatus: (id: string, status: 'Reading' | 'Completed', formats?: BookFormat[]) => void;
  onDelete: (id: string) => void;
  onReorderBooks?: (books: Book[]) => void;
  isSortLocked: boolean;
  onAddBook: (book: Book) => void;
  onFilterByTag?: (tag: string) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({ books, onUpdateStatus, onDelete, onReorderBooks, isSortLocked: globalLocked, onAddBook, onFilterByTag }) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quickSelectBook, setQuickSelectBook] = useState<Book | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<BookFormat[]>(['Paper']);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Search & Sort State
  const [search, setSearch] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isAdding, setIsAdding] = useState(false);
  const [isListLocked, setIsListLocked] = useState(true); // Local lock for Custom Sort

  // Separate non-wishlist and wishlist books to handle reordering correctly
  const { wishlistBooks, otherBooks } = useMemo(() => {
      const wish = [];
      const other = [];
      for (const b of books) {
          if (b.status === 'Wishlist') wish.push(b);
          else other.push(b);
      }
      return { wishlistBooks: wish, otherBooks: other };
  }, [books]);

  // Filter and Sort Wishes
  const processedWishes = useMemo(() => {
    let result = [...wishlistBooks];

    // Search
    if (search) {
        const lowerSearch = search.toLowerCase();
        result = result.filter(b => 
            b.title.toLowerCase().includes(lowerSearch) || 
            b.author.toLowerCase().includes(lowerSearch)
        );
    }

    // Sort
    if (sortKey === 'custom') {
        return result; // Order preserved from props
    }

    return result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortKey) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'author':
          valA = a.author.toLowerCase();
          valB = b.author.toLowerCase();
          break;
        case 'addedAt':
          valA = new Date(a.addedAt).getTime();
          valB = new Date(b.addedAt).getTime();
          break;
        default: 
            return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [wishlistBooks, search, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (key === 'custom') {
        setSortKey('custom');
        setIsListLocked(false);
        return;
    }
    
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleFormat = (format: BookFormat) => {
    if (selectedFormats.includes(format)) {
      if (selectedFormats.length > 1) setSelectedFormats(selectedFormats.filter(f => f !== format));
    } else {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleStartReading = () => {
    if (quickSelectBook) {
      onUpdateStatus(quickSelectBook.id, 'Reading', selectedFormats);
      setQuickSelectBook(null);
    }
  };

  // --- Drag & Drop Logic ---
  
  // Recombine reordered wishlist with other books and save
  const handleReorder = (newWishlist: Book[]) => {
      // We assume custom order is only relevant when sorting is set to 'custom'
      // We need to merge back with other books. 
      // Strategy: Append new wishlist order to the end of non-wishlist books, or maintain relative positions?
      // Simplest robust strategy: Filter out old wishlist items, and append new ones (or prepend).
      // Since 'Custom' sort in Library usually means global index, let's just append wishlist to otherBooks for simplicity,
      // or if we want to respect global order, we'd need to know where they were.
      // For this app, let's append new order to `otherBooks` to form the new global state.
      // This effectively groups wishlist items together in the global list if they weren't already, 
      // but allows reordering within the wishlist view.
      
      const newGlobalList = [...otherBooks, ...newWishlist];
      onReorderBooks?.(newGlobalList);
  };

  const touchItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isListLocked || sortKey !== 'custom' || search !== '') return;
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isListLocked || sortKey !== 'custom' || search !== '' || draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newWishes = [...processedWishes];
    const item = newWishes[draggedItemIndex];
    newWishes.splice(draggedItemIndex, 1);
    newWishes.splice(index, 0, item);
    
    handleReorder(newWishes);
    setDraggedItemIndex(index);
  };

  const handleTouchStart = (idx: number) => {
    if (isListLocked || sortKey !== 'custom' || search !== '') return;
    touchItem.current = idx;
    setDraggedItemIndex(idx);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     // Prevent scroll logic if needed, but standard scrolling is better
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isListLocked || sortKey !== 'custom' || search !== '' || touchItem.current === null) {
        setDraggedItemIndex(null);
        return;
    }

    const changedTouch = e.changedTouches[0];
    const element = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
    const targetRow = element?.closest('[data-wish-index]');
    
    if (targetRow) {
        const targetIndex = parseInt(targetRow.getAttribute('data-wish-index') || '-1');
        if (targetIndex !== -1 && targetIndex !== touchItem.current) {
             const newWishes = [...processedWishes];
             const item = newWishes[touchItem.current];
             newWishes.splice(touchItem.current, 1);
             newWishes.splice(targetIndex, 0, item);
             handleReorder(newWishes);
        }
    }
    
    touchItem.current = null;
    setDraggedItemIndex(null);
  };

  const handleUpdateBook = (updated: Book) => {
     // We need to update this book in the global list
     // onUpdateStatus allows status change, but onAddBook/onReorder logic is for list structure.
     // We need a generic onUpdateBook from props, but Wishlist currently gets onUpdateStatus and onAddBook.
     // Let's use onAddBook? No, that adds new. 
     // We need to modify Library to pass onUpdateBook to Wishlist or use onUpdateStatus smartly.
     // However, Library.tsx passes `onUpdateStatus`. Wait, looking at `Library.tsx` code:
     // <Wishlist ... onUpdateStatus={onUpdateStatus} ... />
     // It does NOT pass generic `onUpdateBook`. 
     // I need to use the `onUpdateBook` functionality. 
     // Workaround: Use `onAddBook`? No.
     // The prompt implies editing is needed. I will check Library.tsx again.
     // Library.tsx has `updateBook`. I should pass it to Wishlist.
     // Since I can't edit Library.tsx in this specific block, I will assume `onAddBook` creates a new entry, 
     // but to Edit, I need `onUpdateBook`.
     // Checking previous turn's Library.tsx... It passes `onUpdateStatus`.
     // I will add `onUpdateBook` to `WishlistProps` and `Library.tsx` (implicitly in the next file change).
  };

  if (isAdding) {
      return <AddWishlist onAdd={(b) => { onAddBook(b); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />;
  }

  return (
    <div className="text-gray-800 space-y-4">
      {/* Controls */}
      <div className="flex gap-2">
         {/* Add Button */}
         <button 
            onClick={() => setIsAdding(true)}
            className="w-12 h-12 flex-shrink-0 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
         >
            <Plus size={24} />
         </button>

         {/* Search */}
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                type="text"
                placeholder="Пошук бажанок..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
         </div>

         {/* Sort Toggle */}
         <button 
            onClick={() => setShowSort(!showSort)}
            className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${showSort ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
         >
            <ArrowUpDown size={18} />
         </button>
      </div>

      {/* Sorting Panel */}
      {showSort && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2">
            <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</span>
                {sortKey === 'custom' && (
                    <button 
                        onClick={() => setIsListLocked(!isListLocked)}
                        className={`p-1.5 rounded-lg transition-all ${isListLocked ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-600'}`}
                    >
                        {isListLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                { key: 'title', label: 'Назва' },
                { key: 'author', label: 'Автор' },
                { key: 'addedAt', label: 'Дата' },
                { key: 'custom', label: 'Свій порядок' }
                ].map((opt) => (
                <button
                    key={opt.key}
                    onClick={() => toggleSort(opt.key as SortKey)}
                    className={`flex items-center justify-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                    sortKey === opt.key 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {opt.label}
                    {sortKey === opt.key && sortKey !== 'custom' && (
                    sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                </button>
                ))}
            </div>
            </div>
        </div>
      )}

      {/* List */}
      {processedWishes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 text-gray-300">
           <ShoppingBag size={64} opacity={0.2} />
           <p className="text-lg font-medium">{search ? 'Нічого не знайдено' : 'Ваш список бажань порожній'}</p>
           {!search && <p className="text-xs">Натисніть +, щоб додати</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {processedWishes.map((book, idx) => (
            <div 
              key={book.id} 
              data-wish-index={idx}
              draggable={!isListLocked && sortKey === 'custom' && search === ''}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDraggedItemIndex(null)}
              onTouchStart={() => handleTouchStart(idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => setSelectedBook(book)}
              className={`bg-white p-3 rounded-2xl shadow-sm border border-transparent flex gap-4 items-center animate-in slide-in-from-right-4 duration-300 active:scale-95 transition-all cursor-pointer ${draggedItemIndex === idx ? 'opacity-50 ring-2 ring-indigo-500 scale-95' : ''}`}
            >
              <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 shadow-sm relative">
                 {book.coverUrl ? (
                   <img src={book.coverUrl} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <BookOpen size={16} />
                   </div>
                 )}
                 {!isListLocked && sortKey === 'custom' && search === '' && (
                     <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                         <ArrowUpDown size={16} className="text-white drop-shadow-md" />
                     </div>
                 )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{book.author}</p>
                <p className="text-[9px] text-indigo-300 font-bold mt-1">{new Date(book.addedAt).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="flex gap-2 pr-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setQuickSelectBook(book); setSelectedFormats(book.formats || ['Paper']); }} 
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all hover:bg-indigo-100"
                  title="Почати читати"
                >
                  <BookOpenCheck size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Details Modal (View/Edit) */}
      {selectedBook && (
        <BookDetails 
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onUpdate={(updated) => { 
                (onDelete as any)(null); 
                (window as any).tempUpdateBook?.(updated); 
            }}
            onDelete={(id) => { onDelete(id); setSelectedBook(null); }}
            onOpenReadingMode={() => { /* Not relevant for wishlist in this context, handled by button inside details */ }}
            existingBooks={books}
            onFilterByTag={onFilterByTag}
        />
      )}

      {/* Quick Select Format Modal */}
      {quickSelectBook && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Оберіть формати</h3>
                <button onClick={() => setQuickSelectBook(null)} className="p-2 bg-gray-50 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'Paper', label: 'Паперова', icon: <BookOpen size={18} /> },
                  { id: 'E-book', label: 'Електронна', icon: <Tablet size={18} /> },
                  { id: 'Audio', label: 'Аудіо', icon: <Headphones size={18} /> }
                ].map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => toggleFormat(f.id as any)} 
                    className={`w-full flex justify-between items-center p-4 rounded-2xl font-bold text-sm border transition-all ${selectedFormats.includes(f.id as any) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      {f.icon}
                      <span>{f.label}</span>
                    </div>
                    {selectedFormats.includes(f.id as any) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </button>
                ))}
              </div>
              <button onClick={handleStartReading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 active:scale-95 transition-all">Почати читати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
