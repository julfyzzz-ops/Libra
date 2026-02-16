
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, BookFormat, BookStatus, ReadingSessionData } from '../types';
import { Search, BookOpen, Headphones, Tablet, Trash2, Edit3, Save, X, Play, Pause, Square, Timer, Trophy, ChevronDown, ChevronUp, Zap, Hourglass, Lock, Unlock, Filter, Calendar as CalendarIcon, Building2, Upload, ShoppingCart, Ghost, Layers, Loader2, CheckCircle2, RotateCcw, Clock, Wand2, Link } from 'lucide-react';
import { processImage, fetchBookCover } from '../services/storageService';
import { Wishlist } from './Wishlist';

interface LibraryProps {
  books: Book[];
  onUpdateBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onReorderBooks?: (books: Book[]) => void;
  onUpdateStatus: (id: string, status: 'Reading' | 'Completed', formats?: BookFormat[]) => void;
}

interface ReadingSessionState {
  isActive: boolean;
  isPaused: boolean;
  seconds: number;
  startPage: number;
}

// Translations
const FORMAT_LABELS: Record<BookFormat, string> = {
  'Paper': 'Паперова',
  'E-book': 'Електронна',
  'Audio': 'Аудіо',
  'Pirate': 'Піратка',
  'Expected': 'Очікується',
  'Sold': 'Продана'
};

const STATUS_LABELS: Record<BookStatus, string> = {
  'Reading': 'Читаю',
  'Completed': 'Прочитано',
  'Unread': 'Не прочитано',
  'Wishlist': 'Бажанка'
};

const calculateProgress = (read?: number, total?: number) => {
  if (!read || !total) return 0;
  return Math.min(100, Math.round((read / total) * 100));
};

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getRatingColor = (rating: number) => {
  if (rating <= 2) return '#3E2723'; // Very Dark Brown
  if (rating <= 4) return '#5D4037'; // Brown
  if (rating <= 6) return '#8D6E63'; // Light Brown / Bronze
  if (rating <= 8) return '#FBC02D'; // Amber Gold
  return '#FFD700'; // Pure Gold
};

const FormatToggle: React.FC<{ 
  label: string; 
  active: boolean; 
  onChange: () => void 
}> = ({ label, active, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
  >
    <span className="text-[10px] font-bold">{label}</span>
    <div className={`w-3 h-3 rounded-full border-2 border-white ${active ? 'bg-white' : 'bg-transparent'}`} />
  </button>
);

export const Library: React.FC<LibraryProps> = ({ books, onUpdateBook, onDeleteBook, onReorderBooks, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'wishlist'>('library');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // New Filter State
  const [selectedFormats, setSelectedFormats] = useState<BookFormat[]>([]);
  // Default show Reading, Unread, Completed (Hide Wishlist usually)
  const [selectedStatuses, setSelectedStatuses] = useState<BookStatus[]>(['Reading', 'Unread', 'Completed']);
  
  const [isSortLocked, setIsSortLocked] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Book | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<ReadingSessionState>({ isActive: false, isPaused: false, seconds: 0, startPage: 0 });
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopPage, setStopPage] = useState<number>(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [lastSessionSummary, setLastSessionSummary] = useState<any>(null);
  const [tempRating, setTempRating] = useState<number>(10);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  useEffect(() => {
    let interval: any;
    if (session.isActive && !session.isPaused) {
      interval = setInterval(() => {
        setSession(prev => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.isPaused]);

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

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // 1. Filter by Status
      const matchStatus = selectedStatuses.includes(b.status);

      // 2. Filter by Format (If selectedFormats is empty, assume ALL formats)
      const matchFormat = selectedFormats.length === 0 || b.formats.some(f => selectedFormats.includes(f));

      // 3. Search
      const s = search.toLowerCase();
      const matchSearch = 
        b.title.toLowerCase().includes(s) || 
        b.author.toLowerCase().includes(s) || 
        (b.publisher?.toLowerCase().includes(s)) || 
        (b.seriesPart?.toLowerCase().includes(s));
      
      return matchStatus && matchFormat && matchSearch;
    });
  }, [books, search, selectedFormats, selectedStatuses]);

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

  const calculateAverageSpeed = (book: Book) => {
    if (!book.sessions || book.sessions.length === 0) return 0;
    const totalPages = book.sessions.reduce((acc, s) => acc + Number(s.pages), 0);
    const totalSeconds = book.sessions.reduce((acc, s) => acc + Number(s.duration), 0);
    return totalSeconds > 0 ? Math.round(totalPages / (totalSeconds / 3600)) : 0;
  };

  const calculateTotalReadingTime = (book: Book) => {
    if (!book.sessions) return 0;
    return Math.round(book.sessions.reduce((acc, s) => acc + Number(s.duration), 0) / 60);
  };

  const calculateRemainingTime = (book: Book) => {
    const speed = calculateAverageSpeed(book);
    if (speed === 0 || !book.pagesTotal) return null;
    const remainingPages = book.pagesTotal - (book.pagesRead || 0);
    return remainingPages > 0 ? (remainingPages / speed).toFixed(1) : 0;
  };

  const handleSave = () => {
    if (editForm) {
      let updatedBook = { ...editForm };
      
      if (updatedBook.status === 'Completed') {
          if (!updatedBook.completedAt) {
             updatedBook.completedAt = new Date().toISOString();
          }
          if (!updatedBook.pagesRead && updatedBook.pagesTotal) {
             updatedBook.pagesRead = updatedBook.pagesTotal;
          }
      }

      onUpdateBook(updatedBook);
      setSelectedBook(updatedBook);
      setIsEditing(false);
    }
  };

  const startReading = () => {
    if (!selectedBook) return;
    setSession({ isActive: true, isPaused: false, seconds: 0, startPage: selectedBook.pagesRead || 0 });
  };

  const stopReading = () => {
    if (!selectedBook) return;
    setStopPage(selectedBook.pagesRead || 0);
    setShowStopDialog(true);
    setSession(prev => ({ ...prev, isPaused: true }));
  };

  const confirmStop = () => {
    if (!selectedBook) return;
    const isCompleted = selectedBook.pagesTotal && stopPage >= selectedBook.pagesTotal;
    const pagesCount = Math.max(0, stopPage - session.startPage);
    const speed = session.seconds > 0 ? Math.round(pagesCount / (session.seconds / 3600)) : 0;
    const today = new Date().toISOString().split('T')[0];
    
    const newSession: ReadingSessionData = {
      id: crypto.randomUUID(),
      date: today,
      duration: session.seconds,
      pages: pagesCount
    };

    setLastSessionSummary({ pagesRead: pagesCount, durationSeconds: session.seconds, speedPPH: speed });

    if (isCompleted) {
      setShowStopDialog(false);
      setShowRatingDialog(true);
    } else {
      const updatedDates = [...(selectedBook.readingDates || [])];
      if (!updatedDates.includes(today)) updatedDates.push(today);
      const updatedBook: Book = {
        ...selectedBook,
        pagesRead: stopPage,
        status: 'Reading',
        sessions: [...(selectedBook.sessions || []), newSession],
        readingDates: updatedDates
      };
      onUpdateBook(updatedBook);
      setSelectedBook(updatedBook);
      setSession({ isActive: false, isPaused: false, seconds: 0, startPage: 0 });
      setShowStopDialog(false);
      setShowSummaryDialog(true);
    }
  };

  const submitRatingAndFinish = () => {
    if (!selectedBook) return;
    const today = new Date().toISOString().split('T')[0];
    const pagesCount = Math.max(0, (selectedBook.pagesTotal || 0) - session.startPage);
    const newSession: ReadingSessionData = {
      id: crypto.randomUUID(),
      date: today,
      duration: session.seconds,
      pages: pagesCount
    };
    const updatedDates = [...(selectedBook.readingDates || [])];
    if (!updatedDates.includes(today)) updatedDates.push(today);

    const updatedBook: Book = {
      ...selectedBook,
      pagesRead: selectedBook.pagesTotal,
      status: 'Completed',
      rating: tempRating,
      completedAt: new Date().toISOString(),
      sessions: [...(selectedBook.sessions || []), newSession],
      readingDates: updatedDates
    };
    onUpdateBook(updatedBook);
    setSelectedBook(updatedBook);
    setSession({ isActive: false, isPaused: false, seconds: 0, startPage: 0 });
    setShowRatingDialog(false);
    setShowSummaryDialog(true);
  };

  const updateSession = (sessionId: string, field: keyof ReadingSessionData, value: any) => {
    if (!selectedBook) return;
    const updatedSessions = selectedBook.sessions.map(s => 
      s.id === sessionId ? { ...s, [field]: value } : s
    );
    const totalPagesRead = updatedSessions.reduce((acc, s) => acc + Number(s.pages), 0);
    const updatedBook = { ...selectedBook, sessions: updatedSessions, pagesRead: totalPagesRead };
    onUpdateBook(updatedBook);
    setSelectedBook(updatedBook);
  };

  const deleteSession = (sessionId: string) => {
    if (!selectedBook || !confirm('Видалити цю сесію?')) return;
    const updatedSessions = selectedBook.sessions.filter(s => s.id !== sessionId);
    const totalPagesRead = updatedSessions.reduce((acc, s) => acc + Number(s.pages), 0);
    const updatedBook = { ...selectedBook, sessions: updatedSessions, pagesRead: totalPagesRead };
    onUpdateBook(updatedBook);
    setSelectedBook(updatedBook);
  };
  
  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      setIsProcessingImg(true);
      try {
        const compressed = await processImage(file);
        setEditForm({ ...editForm, coverUrl: compressed });
      } catch (err) {
        console.error(err);
        alert("Помилка обробки фото");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const handleMagicSearch = async () => {
    if (!editForm || !editForm.title) {
        alert("Будь ласка, введіть назву книги для пошуку.");
        return;
    }
    setIsMagicLoading(true);
    try {
        const url = await fetchBookCover(editForm.title, editForm.author || '');
        if (url) {
            setEditForm({ ...editForm, coverUrl: url });
        } else {
            alert("Обкладинку не знайдено.");
        }
    } catch (e) {
        console.error(e);
        alert("Помилка пошуку");
    } finally {
        setIsMagicLoading(false);
    }
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
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 rounded-2xl flex items-center gap-2 transition-all ${showFilters || selectedFormats.length > 0 || selectedStatuses.length < 3 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Filter size={18} />
                </button>
            </div>

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
                onClick={() => { setSelectedBook(book); setShowHistory(false); }}
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

      {selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="relative h-44 bg-indigo-600 overflow-hidden flex-shrink-0">
               {selectedBook.coverUrl && <img src={selectedBook.coverUrl} className="w-full h-full object-cover opacity-20 blur-sm scale-110" />}
               
               <div className="absolute top-4 left-6 right-6 flex justify-between items-start z-20">
                 <div className="flex flex-col gap-2">
                   {selectedBook.status !== 'Completed' && !isEditing && (
                      <button onClick={startReading} className="bg-white text-indigo-600 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                        <Play size={14} fill="currentColor" /> Читати
                      </button>
                   )}
                   {!isEditing && (
                     <div className="flex gap-2">
                       <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                         <Zap size={12} className="text-amber-400" />
                         <span className="text-[10px] font-bold text-white">{calculateAverageSpeed(selectedBook)} ст/г</span>
                       </div>
                       {selectedBook.status !== 'Completed' && calculateRemainingTime(selectedBook) !== null && (
                         <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                           <Hourglass size={12} className="text-indigo-300" />
                           <span className="text-[10px] font-bold text-white">~{calculateRemainingTime(selectedBook)} год</span>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
                 <button onClick={() => { setSelectedBook(null); setIsEditing(false); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"><X size={20} /></button>
               </div>
            </div>

            <div className="px-6 pb-12 overflow-y-auto no-scrollbar -mt-12 relative z-10 flex-1 bg-white rounded-t-[2.5rem] pt-6">
              <div className="flex gap-4 items-end mb-8">
                <div onClick={() => isEditing && fileInputRef.current?.click()} className={`w-28 aspect-[2/3] bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-white flex-shrink-0 relative ${isEditing ? 'cursor-pointer' : ''}`}>
                  {isProcessingImg ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600" /></div>
                  ) : isEditing ? (
                    <img src={editForm?.coverUrl} className="w-full h-full object-cover opacity-80" />
                  ) : selectedBook.coverUrl ? (
                    <img src={selectedBook.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><BookOpen size={48} /></div>
                  )}
                  {isEditing && !isProcessingImg && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Upload className="text-white" size={20} /></div>}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEditFileUpload} />
                  
                  {isEditing && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMagicSearch(); }}
                        disabled={isMagicLoading}
                        className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-indigo-600 shadow-sm border border-indigo-50 active:scale-95 transition-all disabled:opacity-50 z-20"
                        title="Знайти обкладинку"
                    >
                        {isMagicLoading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Status Label on Modal */}
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${selectedBook.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {STATUS_LABELS[selectedBook.status]}
                  </span>
                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                       <input className="w-full text-lg font-bold bg-gray-50 border-none p-2 rounded-xl focus:ring-1 focus:ring-indigo-500" value={editForm?.title} onChange={e => setEditForm(p => p ? {...p, title: e.target.value} : null)} />
                       <input className="w-full text-xs text-gray-500 bg-gray-50 border-none p-2 rounded-xl focus:ring-1 focus:ring-indigo-500" value={editForm?.author} onChange={e => setEditForm(p => p ? {...p, author: e.target.value} : null)} />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-800 leading-tight mt-1 truncate">{selectedBook.title}</h2>
                      <p className="text-sm text-gray-500 truncate">{selectedBook.author}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">URL Обкладинки</label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                        <input 
                           placeholder="https://..." 
                           className="w-full bg-gray-50 pl-9 pr-3 py-2 rounded-2xl text-xs font-bold border-none outline-none" 
                           value={editForm?.coverUrl || ''} 
                           onChange={e => setEditForm(p => p ? {...p, coverUrl: e.target.value} : null)} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Видавництво</label>
                          <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm?.publisher || ''} onChange={e => setEditForm(p => p ? {...p, publisher: e.target.value} : null)} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Серія</label>
                          <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm?.seriesPart || ''} onChange={e => setEditForm(p => p ? {...p, seriesPart: e.target.value} : null)} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Всього ст.</label>
                          <input type="number" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm?.pagesTotal || 0} onChange={e => setEditForm(p => p ? {...p, pagesTotal: parseInt(e.target.value) || 0} : null)} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Статус</label>
                          <select className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" value={editForm?.status} onChange={e => setEditForm(p => p ? {...p, status: e.target.value as BookStatus} : null)}>
                             <option value="Unread">Не прочитано</option>
                             <option value="Reading">Читаю</option>
                             <option value="Completed">Прочитано</option>
                             <option value="Wishlist">Бажанка</option>
                          </select>
                       </div>
                    </div>

                    {editForm?.status === 'Completed' && (
                       <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-1">
                             <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Дата завершення</label>
                             <input 
                               type="date" 
                               className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" 
                               value={editForm.completedAt ? editForm.completedAt.substring(0, 10) : ''} 
                               onChange={e => setEditForm(p => p ? {...p, completedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined} : null)} 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Оцінка</label>
                             <select 
                               className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" 
                               value={editForm.rating || 0} 
                               onChange={e => setEditForm(p => p ? {...p, rating: parseInt(e.target.value)} : null)}
                             >
                                <option value={0}>Без оцінки</option>
                                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                                   <option key={r} value={r}>{r}</option>
                                ))}
                             </select>
                          </div>
                       </div>
                    )}

                    <div className="space-y-2">
                       <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Формати</label>
                       <div className="grid grid-cols-3 gap-2">
                          {Object.keys(FORMAT_LABELS).map(f => (
                             <FormatToggle 
                               key={f} 
                               label={FORMAT_LABELS[f as BookFormat]} 
                               active={editForm?.formats.includes(f as any) || false} 
                               onChange={() => {
                                 const cur = editForm?.formats || [];
                                 const next = cur.includes(f as any) ? cur.filter(x => x !== f) : [...cur, f as any];
                                 if (next.length > 0) setEditForm(p => p ? {...p, formats: next} : null);
                               }}
                             />
                          ))}
                       </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                        <Building2 size={16} className="text-gray-400" />
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase font-bold">Видавництво</p>
                          <p className="text-[10px] font-bold text-gray-700 truncate">{selectedBook.publisher || '—'}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                        <Layers size={16} className="text-gray-400" />
                        <div>
                          <p className="text-[8px] text-gray-400 uppercase font-bold">Серія</p>
                          <p className="text-[10px] font-bold text-gray-700 truncate">{selectedBook.seriesPart || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* New Info Block for Pages, Status, Format in View Mode */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Статус</span>
                            <span className={`text-xs font-bold ${selectedBook.status === 'Completed' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                {STATUS_LABELS[selectedBook.status]}
                            </span>
                        </div>
                        {selectedBook.rating && selectedBook.rating > 0 && (
                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Оцінка</span>
                                <span 
                                    className="text-xs font-black px-2 py-0.5 rounded bg-white border border-gray-100 shadow-sm"
                                    style={{ color: getRatingColor(selectedBook.rating) }}
                                >
                                    {selectedBook.rating}/10
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Сторінок</span>
                            <span className="text-xs font-bold text-gray-700">
                                {selectedBook.pagesTotal || '—'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Формат</span>
                            <span className="text-xs font-bold text-gray-700 text-right">
                                {selectedBook.formats.map(f => FORMAT_LABELS[f]).join(', ')}
                            </span>
                        </div>
                    </div>

                    {selectedBook.status === 'Completed' ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center">
                          <CalendarIcon size={16} className="text-emerald-500 mb-1" />
                          <span className="text-[8px] font-bold text-emerald-400 uppercase text-center">Прочитано</span>
                          <span className="text-[10px] font-bold text-emerald-700">{selectedBook.completedAt ? new Date(selectedBook.completedAt).toLocaleDateString('uk-UA') : '—'}</span>
                        </div>
                        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex flex-col items-center">
                          <Clock size={16} className="text-indigo-500 mb-1" />
                          <span className="text-[8px] font-bold text-indigo-400 uppercase">Час</span>
                          <span className="text-[10px] font-bold text-indigo-700">{calculateTotalReadingTime(selectedBook)} хв</span>
                        </div>
                        <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex flex-col items-center">
                          <Zap size={16} className="text-amber-500 mb-1" />
                          <span className="text-[8px] font-bold text-amber-400 uppercase">Швидкість</span>
                          <span className="text-[10px] font-bold text-amber-700">{calculateAverageSpeed(selectedBook)} ст/г</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Прогрес</h4>
                          <span className="text-xs font-bold text-indigo-600">{calculateProgress(selectedBook.pagesRead, selectedBook.pagesTotal)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${calculateProgress(selectedBook.pagesRead, selectedBook.pagesTotal)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex justify-between items-center py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                      >
                        Історія читання ({selectedBook.sessions?.length || 0})
                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      
                      {showHistory && (
                        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar animate-in fade-in duration-300">
                          {selectedBook.sessions && selectedBook.sessions.length > 0 ? (
                            selectedBook.sessions.slice().reverse().map(session => (
                              <div key={session.id} className="bg-gray-50 p-3 rounded-2xl flex flex-col gap-2 border border-gray-100/50">
                                <div className="flex justify-between items-center">
                                  {editingSessionId === session.id ? (
                                    <input 
                                      type="date" 
                                      className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold outline-none border-none"
                                      value={session.date}
                                      onChange={(e) => updateSession(session.id, 'date', e.target.value)}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-500">{new Date(session.date).toLocaleDateString('uk-UA')}</span>
                                  )}
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingSessionId(editingSessionId === session.id ? null : session.id)} className="p-1 text-gray-400 hover:text-indigo-600">
                                      {editingSessionId === session.id ? <Save size={14} /> : <Edit3 size={14} />}
                                    </button>
                                    <button onClick={() => deleteSession(session.id)} className="p-1 text-gray-400 hover:text-red-500">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-gray-400 uppercase font-bold">Сторінок</span>
                                    {editingSessionId === session.id ? (
                                      <input 
                                        type="number" 
                                        className="bg-white px-2 py-1 rounded-lg text-xs font-bold outline-none border-none"
                                        value={session.pages}
                                        onChange={(e) => updateSession(session.id, 'pages', parseInt(e.target.value) || 0)}
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-indigo-600">{session.pages} ст.</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-gray-400 uppercase font-bold">Час</span>
                                    {editingSessionId === session.id ? (
                                      <input 
                                        type="number" 
                                        className="bg-white px-2 py-1 rounded-lg text-xs font-bold outline-none border-none"
                                        value={Math.round(session.duration / 60)}
                                        onChange={(e) => updateSession(session.id, 'duration', (parseInt(e.target.value) || 0) * 60)}
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-gray-700">{Math.round(session.duration / 60)} хв</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-[10px] text-gray-400 italic py-4">Жодних сесій ще не записано</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-2 mt-4 pb-8">
                  {isEditing ? (
                    <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"><Save size={18} /> Зберегти</button>
                  ) : (
                    <button onClick={() => { setEditForm({...selectedBook}); setIsEditing(true); }} className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Edit3 size={18} /> Редагувати</button>
                  )}
                  <button onClick={() => { if (confirm('Видалити книгу?')) { onDeleteBook(selectedBook.id); setSelectedBook(null); } }} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-95 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reading Timer */}
      {session.isActive && selectedBook && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-8 animate-in fade-in">
           <div className="absolute top-8 left-8 right-8 flex justify-between items-center text-white">
             <div className="flex items-center gap-3">
               <Timer className="text-indigo-400" size={24} />
               <h2 className="font-bold text-sm truncate max-w-[200px]">{selectedBook.title}</h2>
             </div>
             <button onClick={() => setSession({ isActive: false, isPaused: false, seconds: 0, startPage: 0 })}><X size={24} /></button>
           </div>
           <div className="text-7xl font-mono text-white mb-12">{formatTime(session.seconds)}</div>
           <div className="flex gap-6">
              <button onClick={() => setSession(p => ({...p, isPaused: !p.isPaused}))} className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-xl">{session.isPaused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}</button>
              <button onClick={stopReading} className="w-24 h-24 rounded-full bg-indigo-600 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95"><Square fill="currentColor" /><span className="text-[10px] font-bold mt-1 uppercase">Стоп</span></button>
           </div>
        </div>
      )}

      {/* Stop Dialog */}
      {showStopDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl flex flex-col items-center">
              <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">На якій сторінці зупинилися?</h3>
              <p className="text-[10px] text-gray-400 uppercase mb-6">Початок сесії: {session.startPage}</p>
              <input type="number" className="w-full text-center text-4xl font-bold text-indigo-600 p-4 border-b-2 border-indigo-100 focus:outline-none bg-transparent mb-8" value={stopPage} onChange={e => setStopPage(parseInt(e.target.value) || 0)} />
              <button onClick={confirmStop} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold active:scale-95 shadow-lg">Зберегти прогрес</button>
           </div>
        </div>
      )}

      {/* Summary Dialog */}
      {showSummaryDialog && lastSessionSummary && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center border border-gray-100">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6"><Zap size={32} /></div>
              <h3 className="text-xl font-bold text-gray-800 mb-6">Результат сесії</h3>
              <div className="w-full space-y-4 mb-8">
                 <div className="flex justify-between p-3 bg-gray-50 rounded-2xl text-xs font-bold"><span>Швидкість</span><span className="text-indigo-600">{lastSessionSummary.speedPPH} ст/год</span></div>
                 <div className="flex justify-between p-3 bg-gray-50 rounded-2xl text-xs font-bold"><span>Прочитано</span><span>{lastSessionSummary.pagesRead} ст.</span></div>
              </div>
              <button onClick={() => setShowSummaryDialog(false)} className="w-full bg-gray-100 py-4 rounded-2xl font-bold active:scale-95">Закрити</button>
           </div>
        </div>
      )}

      {/* Rating Dialog */}
      {showRatingDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col items-center">
              <Trophy size={48} className="text-emerald-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Вітаємо!</h3>
              <p className="text-gray-500 text-sm mb-8 text-center">Книга прочитана. Як вам вона?</p>
              <div className="grid grid-cols-5 gap-2 mb-10">
                 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} onClick={() => setTempRating(n)} className={`w-12 h-12 rounded-2xl text-sm font-bold transition-all ${tempRating === n ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>{n}</button>
                 ))}
              </div>
              <button onClick={submitRatingAndFinish} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-bold shadow-xl active:scale-95">Завершити</button>
           </div>
        </div>
      )}
    </div>
  );
};
