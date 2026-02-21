
import React, { memo } from 'react';
import { Book, BookFormat } from '../types';
import { BookOpen, Headphones, Tablet, Ghost, Clock, ShoppingCart } from 'lucide-react';
import { BookCover } from './ui/BookCover';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
  // Dragging state passed from parent wrapper
  isDragging?: boolean;
}

const FormatIcon = ({ format }: { format: BookFormat }) => {
  switch (format) {
    case 'Paper': return <BookOpen size={14} />;
    case 'Audio': return <Headphones size={14} />;
    case 'E-book': return <Tablet size={14} />;
    case 'Pirate': return <Ghost size={14} />;
    case 'Expected': return <Clock size={14} />;
    case 'Sold': return <ShoppingCart size={14} />;
    default: return null;
  }
};

export const BookCard: React.FC<BookCardProps> = memo(({
  book,
  onClick,
  isDragging
}) => {
  return (
    <div 
      onClick={() => onClick(book)}
      className={`bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center active:scale-95 transition-all cursor-pointer select-none ${isDragging ? 'opacity-50 scale-95 ring-2 ring-indigo-500 shadow-xl' : ''}`}
    >
      <div className="w-12 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 relative">
        <BookCover book={book} className="w-full h-full" iconSize={20} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-800 text-sm truncate">{book.title}</h3>
        <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
        
        <div className="flex gap-2 mt-1.5 items-center">
          {book.formats.map(f => (
             <span key={f} className={f === 'Sold' ? "text-red-500" : "text-gray-400"}>
                <FormatIcon format={f} />
             </span>
          ))}
          
          {/* Notes (Emojis) displayed here */}
          {book.notes && (
             <span className="text-base leading-none truncate max-w-[120px]">{book.notes}</span>
          )}

          {(book.rating || 0) > 0 && (
              <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 bg-gray-50 rounded text-gray-600 flex-shrink-0">★ {book.rating}</span>
          )}
        </div>
      </div>
      
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${book.status === 'Completed' ? 'bg-emerald-500' : book.status === 'Reading' ? 'bg-indigo-600' : 'bg-gray-200'}`} />
    </div>
  );
});
