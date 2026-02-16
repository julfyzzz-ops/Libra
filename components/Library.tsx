
import React, { useState, useMemo } from 'react';
import { Book, BookFormat, BookStatus } from '../types';
import { Search, BookOpen, Headphones, Tablet, Clock, ShoppingCart, Ghost, CheckCircle2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, Lock, Unlock } from 'lucide-react';
import { Wishlist } from './Wishlist';
import { BookDetails } from './BookDetails';
import { ReadingMode } from './ReadingMode';
import { FORMAT_LABELS, STATUS_LABELS, getRatingColor } from '../utils';

interface LibraryProps {
  books: Book[];
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onReorderBooks?: (books: Book[]) => void;
  onUpdateStatus: (id: string, status: 'Reading' | 'Completed', formats?: BookFormat[]) => void;
}

type SortKey = 'title' | 'author' | 'addedAt';
type SortDirection = 'asc' | 'desc';

export const Library: React.FC<LibraryProps> = ({ books, onUpdateBook, onDeleteBook, onReorderBooks, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist'>('library');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  
  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter State
  const [selectedFormats, setSelectedFormats] = useState<BookFormat[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<BookStatus[]>(['Reading', 'Unread', 'Completed']);
  
  const [isSortLocked, setIsSortLocked] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  // Unified search suggestions logic
  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    const lowerSearch = search.toLowerCase();
    const set = new Set<string>();
    
    books.forEach(b => {
      if (b.title.toLowerCase().includes(lowerSearch)) set.add(b.title);
      if (b.author.toLowerCase().includes(lowerSearch)) set.add(b.author);
      if (b.publisher?.toLowerCase().includes(lowerSearch)) set.add(b.publisher);
      if (b.seriesPart?.toLowerCase().includes(lowerSearch)) set.add(b.seriesPart);
    });
    
    return Array.from(set).slice(0, 5);
  }, [search, books]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredBooks = useMemo(() => {
    const result = books.filter(b => {
      const matchStatus = selectedStatuses.includes(b.status);
      const matchFormat = selectedFormats.length === 0 || b.formats.some(f => selectedFormats.includes(f));
      const s = search.toLowerCase();
      const matchSearch = 
        b.title.toLowerCase().includes(s) || 
        b.author.toLowerCase().includes(s) || 
        (b.publisher?.toLowerCase().includes(s)) || 
        (b.seriesPart?.toLowerCase().includes(s));
      
      return matchStatus && matchFormat && matchSearch;
    });

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
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, search, selectedFormats, selectedStatuses, sortKey, sortDirection]);

  const toggleFormatFilter = (format: BookFormat) => {
    setSelectedFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const toggleStatusFilter = (status: BookStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedFormats([]);
    setSelectedStatuses(['Reading', 'Unread', 'Completed']);
    setSearch('');
  };

  const FormatIcon = ({ format }: { format: BookFormat }) => {
    switch (format) {
      case 'Paper': return <BookOpen size={14} />;
      case 'Audio': return <Headphones size={14} />;
      case 'E-book': return <Tablet size={14} />;
      case 'Pirate': return <Ghost size={14} />;
      case 'Expected': return <Clock size={14} />;
      case 'Sold': return <ShoppingCart size={14} />;
    }
  };

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
        <button 
          onClick={() => setIsSortLocked(!isSortLocked)}
          className={`p-3 rounded-2xl transition-all ${isSortLocked ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
        >
          {isSortLocked ? <Lock size={20} /> : <Unlock size={20} />}
        </button>
      </header>

      {activeTab === 'library' ? (
        <>
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Пошук..."
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 glass-morphism rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {suggestions.map((s, i) => (
                        <button 
                        key={i} 
                        onClick={() => { setSearch(s); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 suggestion-item transition-colors border-b border-gray-100 last:border-none"
                        >
                        {s}
                        </button>
                    ))}
                    </div>
                )}
                </div>
                <button 
                    onClick={() => { setShowSort(!showSort); setShowFilters(false); }}
                    className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${showSort ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <ArrowUpDown size={18} />
                </button>
                <button 
                    onClick={() => { setShowFilters(!showFilters); setShowSort(false); }}
                    className={`px-3 rounded-2xl flex items-center gap-2 transition-all ${showFilters || selectedFormats.length > 0 || selectedStatuses.length < 3 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Filter size={18} />
                </button>
            </div>

            {/* Sorting Panel */}
            {showSort && (
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'title', label: 'Назва' },
                        { key: 'author', label: 'Автор' },
                        { key: 'addedAt', label: 'Дата' }
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
                          {sortKey === opt.key && (
                            sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Статус</span>
                        <div className="flex flex-wrap gap-2">
                            {['Reading', 'Unread', 'Completed'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => toggleStatusFilter(s as BookStatus)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedStatuses.includes(s as BookStatus) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                >
                                    {STATUS_LABELS[s as BookStatus]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Формат</span>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(FORMAT_LABELS).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => toggleFormatFilter(f as BookFormat)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedFormats.includes(f as BookFormat) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                >
                                    {FORMAT_LABELS[f as BookFormat]}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {(selectedFormats.length > 0 || selectedStatuses.length !== 3 || search) && (
                       <button 
                         onClick={clearFilters}
                         className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                       >
                         <RotateCcw size={14} /> Очистити фільтри
                       </button>
                    )}
                </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredBooks.map((book, idx) => (
              <div 
                key={book.id}
                draggable={!isSortLocked}
                onDragStart={(e) => {
                  if (isSortLocked) return;
                  setDraggedItemIndex(idx);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (isSortLocked || draggedItemIndex === null || draggedItemIndex === idx) return;
                  const newBooks = [...books];
                  const draggedItem = newBooks[draggedItemIndex];
                  newBooks.splice(draggedItemIndex, 1);
                  newBooks.splice(idx, 0, draggedItem);
                  setDraggedItemIndex(idx);
                  onReorderBooks?.(newBooks);
                }}
                onDragEnd={() => setDraggedItemIndex(null)}
                onClick={() => { setSelectedBook(book); }}
                className={`bg-white p-3 rounded-2xl shadow-sm border border-transparent hover:border-indigo-500 transition-all cursor-pointer flex gap-4 items-start group relative ${draggedItemIndex === idx ? 'opacity-50 scale-95' : ''}`}
              >
                {/* Completed Badge with Rating */}
                {book.status === 'Completed' && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                        <div className="bg-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="text-emerald-500" size={18} fill="white" />
                        </div>
                        {book.rating && book.rating > 0 && (
                            <span 
                                className="px-1.5 py-0.5 bg-white/95 backdrop-blur-sm rounded-md shadow-sm border border-gray-100 text-[9px] font-black"
                                style={{ color: getRatingColor(book.rating) }}
                            >
                                {book.rating}/10
                            </span>
                        )}
                    </div>
                )}

                <div className="w-16 h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                  {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><BookOpen size={20} /></div>}
                </div>
                
                <div className="min-w-0 flex-1 flex flex-col justify-between h-24 py-0.5">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{book.author}</p>
                    {(book.publisher || book.seriesPart) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                        {book.publisher && <span className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded font-medium">{book.publisher}</span>}
                        {book.seriesPart && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded font-medium">{book.seriesPart}</span>}
                        </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 opacity-40">
                    {book.formats.slice(0, 3).map(f => <span key={f}><FormatIcon format={f} /></span>)}
                  </div>
                </div>
              </div>
            ))}
            {filteredBooks.length === 0 && (
              <div className="text-center py-12 text-gray-300 flex flex-col items-center">
                <Search size={48} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Нічого не знайдено</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <Wishlist 
          books={books} 
          onUpdateStatus={onUpdateStatus} 
          onDelete={onDeleteBook} 
          onReorderBooks={onReorderBooks}
          isSortLocked={isSortLocked}
        />
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
