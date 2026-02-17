
import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Book as BookIcon } from 'lucide-react';
import { BookDetails } from './BookDetails';
import { ReadingMode } from './ReadingMode';
import { calculateProgress } from '../utils';

interface ReadingListProps {
  books: Book[];
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
}

export const ReadingList: React.FC<ReadingListProps> = ({ books, onUpdateBook, onDeleteBook }) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);

  // Filter only books with status 'Reading'
  const readingBooks = books.filter(b => b.status === 'Reading');

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Читаю</h1>
        <p className="text-gray-500 text-sm mt-1">Книги в процесі</p>
      </header>

      {readingBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
           <BookOpen size={64} className="mb-4 opacity-20" />
           <p className="text-lg font-medium">Ви зараз нічого не читаєте</p>
           <p className="text-xs mt-2">Оберіть книгу з бібліотеки</p>
        </div>
      ) : (
        <div className="space-y-4">
          {readingBooks.map((book) => {
             const progress = calculateProgress(book.pagesRead, book.pagesTotal);
             return (
                <div 
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-start active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-20 h-28 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                    {book.coverUrl ? (
                        <img src={book.coverUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><BookIcon size={24} /></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1 flex flex-col justify-between h-28">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2 mb-1">{book.title}</h3>
                      <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    </div>
                    
                    <div className="space-y-1.5">
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Прогрес</span>
                          <span className="text-sm font-black text-indigo-600">{progress}%</span>
                       </div>
                       <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                       </div>
                       <p className="text-[10px] text-gray-400 text-right font-medium">
                          {book.pagesRead} / {book.pagesTotal} ст.
                       </p>
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
          onUpdate={(updated) => { onUpdateBook(updated); setSelectedBook(updated); }}
          onDelete={(id) => { onDeleteBook(id); setSelectedBook(null); }}
          onOpenReadingMode={() => setReadingModeOpen(true)}
        />
      )}

      {readingModeOpen && selectedBook && (
        <ReadingMode 
          book={selectedBook}
          onClose={() => setReadingModeOpen(false)}
          onUpdateBook={(updated) => { onUpdateBook(updated); setSelectedBook(updated); }}
        />
      )}
    </div>
  );
};
