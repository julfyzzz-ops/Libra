
import React, { useState, useMemo } from 'react';
import { Book, BookFormat } from '../types';
import { ShoppingBag, BookOpenCheck, BookOpen, Tablet, Headphones, X, Search, ArrowUpDown, Plus, ArrowUp, ArrowDown, Lock, Unlock } from 'lucide-react';
import { AddWishlist } from './AddWishlist';
import { BookDetails } from './BookDetails';
import { useLibrary } from '../contexts/LibraryContext';
import { useBookFilter } from '../hooks/useBookFilter';
import { useBookSort } from '../hooks/useBookSort';
import { BookCover } from './ui/BookCover';

interface WishlistProps {
  isSortLocked: boolean;
}

export const Wishlist: React.FC<WishlistProps> = ({ isSortLocked: globalLocked }) => {
  const { books, updateBook, reorderBooks, addBook } = useLibrary();
  
  // 1. Isolate Wishlist Books
  const wishlistBooks = useMemo(() => books.filter(b => b.status === 'Wishlist'), [books]);

  // 2. Custom Hooks
  const { filteredBooks, search, setSearch } = useBookFilter(wishlistBooks, [], []);
  const { sortedBooks, sortKey, sortDirection, setSortKey, toggleSort } = useBookSort(filteredBooks, 'addedAt', 'desc');

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [quickSelectBook, setQuickSelectBook] = useState<Book | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<BookFormat[]>(['Paper']);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [showSort, setShowSort] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isListLocked, setIsListLocked] = useState(true);

  const toggleSortWrapper = (key: any) => {
      if (key === 'custom') setIsListLocked(false);
      toggleSort(key);
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
      updateBook({
          ...quickSelectBook,
          status: 'Reading',
          formats: selectedFormats,
          readingStartedAt: new Date().toISOString()
      });
      setQuickSelectBook(null);
    }
  };

  // --- Drag & Drop Logic ---
  const handleReorder = (dragged: Book, target: Book) => {
      const newGlobal = [...books];
      const fromIdx = newGlobal.findIndex(b => b.id === dragged.id);
      const toIdx = newGlobal.findIndex(b => b.id === target.id);
      
      if (fromIdx !== -1 && toIdx !== -1) {
            const [removed] = newGlobal.splice(fromIdx, 1);
            newGlobal.splice(toIdx, 0, removed);
            reorderBooks(newGlobal);
      }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isListLocked || sortKey !== 'custom' || search !== '') return;
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  if (isAdding) {
      return <AddWishlist onAdd={(b) => { addBook(b); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />;
  }

  return (
    <div className="text-gray-800 space-y-4">
      {/* Controls */}
      <div className="flex gap-2">
         <button onClick={() => setIsAdding(true)} className="w-12 h-12 flex-shrink-0 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"><Plus size={24} /></button>

         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                type="text"
                placeholder="Пошук бажанок..."
                className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            {search.length > 0 && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
            )}
         </div>

         <button onClick={() => setShowSort(!showSort)} className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${showSort ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}><ArrowUpDown size={18} /></button>
      </div>

      {/* Sorting Panel */}
      {showSort && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2">
            <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</span>
                {sortKey === 'custom' && (
                    <button onClick={() => setIsListLocked(!isListLocked)} className={`p-1.5 rounded-lg transition-all ${isListLocked ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-600'}`}>
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
                    onClick={() => toggleSortWrapper(opt.key)}
                    className={`flex items-center justify-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${sortKey === opt.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                    {opt.label}
                    {sortKey === opt.key && sortKey !== 'custom' && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </button>
                ))}
            </div>
            </div>
        </div>
      )}

      {/* List */}
      {sortedBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 text-gray-300">
           <ShoppingBag size={64} opacity={0.2} />
           <p className="text-lg font-medium">{search ? 'Нічого не знайдено' : 'Ваш список бажань порожній'}</p>
           {!search && <p className="text-xs">Натисніть +, щоб додати</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBooks.map((book, idx) => (
            <div 
              key={book.id} 
              data-wish-index={idx}
              draggable={!isListLocked && sortKey === 'custom' && search === ''}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => {
                  e.preventDefault();
                  if (isListLocked || sortKey !== 'custom' || draggedItemIndex === null || draggedItemIndex === idx) return;
                  e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                  e.preventDefault();
                  if (isListLocked || sortKey !== 'custom' || draggedItemIndex === null) return;
                  handleReorder(sortedBooks[draggedItemIndex], sortedBooks[idx]);
                  setDraggedItemIndex(null);
              }}
              onDragEnd={() => setDraggedItemIndex(null)}
              onClick={() => setSelectedBook(book)}
              className={`bg-white p-3 rounded-2xl shadow-sm border border-transparent flex gap-4 items-center animate-in slide-in-from-right-4 duration-300 active:scale-95 transition-all cursor-pointer ${draggedItemIndex === idx ? 'opacity-50 ring-2 ring-indigo-500 scale-95' : ''}`}
            >
              <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 shadow-sm relative">
                 <BookCover book={book} className="w-full h-full" iconSize={16} />
                 {!isListLocked && sortKey === 'custom' && search === '' && (
                     <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><ArrowUpDown size={16} className="text-white drop-shadow-md" /></div>
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

      {selectedBook && (
        <BookDetails 
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onOpenReadingMode={() => {}} // Wishlist doesn't open reading mode directly usually
        />
      )}

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
                  <button key={f.id} onClick={() => toggleFormat(f.id as any)} className={`w-full flex justify-between items-center p-4 rounded-2xl font-bold text-sm border transition-all ${selectedFormats.includes(f.id as any) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                    <div className="flex items-center gap-3">{f.icon}<span>{f.label}</span></div>
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
