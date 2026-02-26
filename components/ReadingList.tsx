
import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Book as BookIcon } from 'lucide-react';
import { BookDetails } from './BookDetails';
import { ReadingMode } from './ReadingMode';
import { calculateProgress, getBookPageTotal } from '../utils';
import { useLibrary } from '../contexts/LibraryContext';
import { BookCover } from './ui/BookCover';

export const ReadingList: React.FC = () => {
  const { books } = useLibrary();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);

  // Filter only books with status 'Reading'
  const readingBooks = books.filter(b => b.status === 'Reading');

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Читаю</h1>
        <p className="text-gray-500 text-sm mt-1">Книги в процесі</p>
      </header>

      {readingBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <BookOpen size={32} className="opacity-20" />
           </div>
           <p className="text-lg font-bold text-gray-400">Ви зараз нічого не читаєте</p>
           <p className="text-xs mt-1">Оберіть книгу з бібліотеки</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readingBooks.map((book) => {
             const progress = calculateProgress(book.pagesRead, getBookPageTotal(book));
             return (
                <div 
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex gap-4 items-center active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="w-16 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                    <BookCover book={book} className="w-full h-full" iconSize={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1 flex flex-col justify-between h-24">
                    <div>
                      <h3 className="font-bold text-gray-800 text-base leading-tight truncate mb-0.5">{book.title}</h3>
                      <p className="text-[11px] text-gray-500 truncate font-medium">{book.author}</p>
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex justify-between items-end">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Прогрес</span>
                          <span className="text-xs font-black text-indigo-600">{progress}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                       </div>
                       <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                             {book.formats.slice(0, 1).map(f => (
                                <span key={f} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-md font-bold border border-gray-100 uppercase">{f}</span>
                             ))}
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold">
                             {book.pagesRead} / {getBookPageTotal(book)} ст.
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
             );
          })}
        </div>
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
