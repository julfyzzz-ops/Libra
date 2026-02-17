
import React, { useState } from 'react';
import { Book, BookFormat } from '../types';
import { ShoppingBag, BookOpenCheck, Trash2, BookOpen, Tablet, Headphones, X } from 'lucide-react';

interface WishlistProps {
  books: Book[];
  onUpdateStatus: (id: string, status: 'Reading' | 'Completed', formats?: BookFormat[]) => void;
  onDelete: (id: string) => void;
  onReorderBooks?: (books: Book[]) => void;
  isSortLocked: boolean;
}

export const Wishlist: React.FC<WishlistProps> = ({ books, onUpdateStatus, onDelete, onReorderBooks, isSortLocked }) => {
  const wishes = books.filter(b => b.status === 'Wishlist');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<BookFormat[]>(['Paper']);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const toggleFormat = (format: BookFormat) => {
    if (selectedFormats.includes(format)) {
      if (selectedFormats.length > 1) setSelectedFormats(selectedFormats.filter(f => f !== format));
    } else {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleStartReading = () => {
    if (selectedBook) {
      onUpdateStatus(selectedBook.id, 'Reading', selectedFormats);
      setSelectedBook(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isSortLocked) return;
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isSortLocked || draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newBooks = [...books];
    // Separate wishlist and non-wishlist to preserve order within the wishlist specifically
    const actualWishes = newBooks.filter(b => b.status === 'Wishlist');
    const nonWishes = newBooks.filter(b => b.status !== 'Wishlist');
    
    const draggedItem = actualWishes[draggedItemIndex];
    actualWishes.splice(draggedItemIndex, 1);
    actualWishes.splice(index, 0, draggedItem);
    
    onReorderBooks?.([...actualWishes, ...nonWishes]);
    setDraggedItemIndex(index);
  };

  return (
    <div className="text-gray-800">
      {wishes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 text-gray-300">
           <ShoppingBag size={64} />
           <p className="text-lg font-medium">Ваш список бажань порожній</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wishes.map((book, idx) => (
            <div 
              key={book.id} 
              draggable={!isSortLocked}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDraggedItemIndex(null)}
              className={`bg-white p-3 rounded-2xl shadow-sm border border-transparent flex gap-4 items-center animate-in slide-in-from-right-4 duration-300 ${draggedItemIndex === idx ? 'opacity-50 scale-95' : ''}`}
            >
              <div className="w-12 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                 {book.coverUrl ? (
                   <img src={book.coverUrl} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <BookOpen size={16} />
                   </div>
                 )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{book.author}</p>
              </div>
              <div className="flex gap-2 pr-2">
                <button 
                  onClick={() => { setSelectedBook(book); setSelectedFormats(book.formats || ['Paper']); }} 
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all"
                  title="Почати читати"
                >
                  <BookOpenCheck size={18} />
                </button>
                <button 
                  onClick={() => { if(confirm('Видалити з бажанок?')) onDelete(book.id); }} 
                  className="p-2.5 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-all"
                  title="Видалити"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Оберіть формати</h3>
                <button onClick={() => setSelectedBook(null)} className="p-2 bg-gray-50 rounded-full"><X size={20} /></button>
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
