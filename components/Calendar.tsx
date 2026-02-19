
import React, { useMemo, useState } from 'react';
import { Book } from '../types';
import { ChevronLeft, ChevronRight, BookOpen, Calendar as CalendarIcon, Grid, Clock, FileText, Loader2 } from 'lucide-react';
import { BookDetails } from './BookDetails';
import { ReadingMode } from './ReadingMode';
import { useLibrary } from '../contexts/LibraryContext';
import { formatTime } from '../utils';
import { BookCover } from './ui/BookCover';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

type ViewMode = 'month' | 'year';

export const Calendar: React.FC = () => {
  const { books } = useLibrary();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingModeOpen, setReadingModeOpen] = useState(false);
  
  // Specific date selection within a month
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // --- Swipe Logic ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrev();
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7; 

  const monthName = currentDate.toLocaleString('uk-UA', { month: 'long' });
  const year = currentDate.getFullYear();

  const isBookReadInMonth = (book: Book, yearStr: number, monthIndex: number) => {
     const prefix = `${yearStr}-${String(monthIndex + 1).padStart(2, '0')}`;
     const hasSession = book.sessions?.some(s => s.date.startsWith(prefix));
     const completedInMonth = book.completedAt && book.completedAt.startsWith(prefix);
     return hasSession || completedInMonth;
  };

  const dailyReadingMap = useMemo(() => {
    const map: Record<string, Book[]> = {};
    const monthPrefix = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    books.forEach(book => {
      book.sessions?.forEach(session => {
        if (session.date.startsWith(monthPrefix)) {
            if (!map[session.date]) map[session.date] = [];
            if (!map[session.date].some(b => b.id === book.id)) map[session.date].push(book);
        }
      });
    });
    return map;
  }, [books, currentDate, year]);

  const handlePrev = () => {
    setSelectedDay(null);
    if (viewMode === 'month') {
        setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    } else {
        setCurrentDate(new Date(year - 1, currentDate.getMonth(), 1));
    }
  };

  const handleNext = () => {
    setSelectedDay(null);
    if (viewMode === 'month') {
        setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    } else {
        setCurrentDate(new Date(year + 1, currentDate.getMonth(), 1));
    }
  };

  const handleMonthClick = (monthIndex: number) => {
      setCurrentDate(new Date(year, monthIndex, 1));
      setViewMode('month');
      setSelectedDay(null);
  };

  // --- Daily Stats Calculation ---
  const activeStats = useMemo(() => {
    const targetDateStr = selectedDay 
        ? `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
        : null;

    let totalPages = 0;
    let totalSeconds = 0;
    let activeBooks = new Set<string>();
    let bookList: Book[] = [];

    if (viewMode === 'month' && !targetDateStr) {
        // Month total
        const monthPrefix = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        books.forEach(b => {
            let bookAdded = false;
            b.sessions?.forEach(s => {
                if (s.date.startsWith(monthPrefix)) {
                    totalPages += Number(s.pages) || 0;
                    totalSeconds += Number(s.duration) || 0;
                    if (!bookAdded) {
                        activeBooks.add(b.id);
                        bookList.push(b);
                        bookAdded = true;
                    }
                }
            });
        });
    } else if (viewMode === 'month' && targetDateStr) {
        // Specific day total
        books.forEach(b => {
             let bookAdded = false;
             b.sessions?.forEach(s => {
                 if (s.date === targetDateStr) {
                     totalPages += Number(s.pages) || 0;
                     totalSeconds += Number(s.duration) || 0;
                     if (!bookAdded) {
                        activeBooks.add(b.id);
                        bookList.push(b);
                        bookAdded = true;
                     }
                 }
             });
        });
    } else {
        // Year total
        const yearPrefix = `${year}-`;
        books.forEach(b => {
            let bookAdded = false;
            b.sessions?.forEach(s => {
                if (s.date.startsWith(yearPrefix)) {
                    if (!bookAdded) {
                        activeBooks.add(b.id);
                        bookList.push(b);
                        bookAdded = true;
                    }
                }
            });
        });
    }

    return { 
        count: activeBooks.size, 
        pages: totalPages, 
        time: totalSeconds,
        list: bookList 
    };
  }, [books, viewMode, currentDate, year, selectedDay]);

  // Apply Infinite Scroll to stats list (especially for Year view which can be long)
  const { visibleItems: visibleStatsBooks, observerTarget, hasMore } = useInfiniteScroll(activeStats.list, 10);

  const renderMonthView = () => {
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      const padding = Array.from({ length: adjustedFirstDay }, (_, i) => null);

      return (
        <>
            <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
            ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
            {padding.map((_, i) => <div key={`p-${i}`} className="aspect-square" />)}
            {days.map(day => {
                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const reads = dailyReadingMap[dateStr] || [];
                const isSelected = selectedDay === day;
                
                return (
                <div 
                    key={day} 
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`aspect-square relative rounded-xl overflow-hidden border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected 
                            ? 'ring-2 ring-indigo-500 border-indigo-500 z-10 scale-105 shadow-md' 
                            : reads.length > 0 
                                ? 'border-indigo-200 bg-white shadow-sm hover:border-indigo-300' 
                                : 'border-gray-50 bg-gray-50/50'
                    }`}
                >
                    <span className={`text-[10px] absolute top-1 left-1 font-bold z-10 ${reads.length > 0 ? 'text-indigo-700 bg-white/90 backdrop-blur-[1px] px-1 rounded-md shadow-sm' : 'text-gray-300'}`}>
                    {day}
                    </span>
                    {reads.length > 0 && (
                    <div className="w-full h-full relative">
                        <BookCover book={reads[0]} className="w-full h-full" iconSize={12} />
                        {reads.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-indigo-600 px-1 rounded-tl-lg text-[8px] font-bold text-white shadow-sm">
                            +{reads.length - 1}
                        </div>
                        )}
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        </>
      );
  };

  const renderYearView = () => {
      const months = [
          'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
          'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
      ];

      return (
          <div className="grid grid-cols-3 gap-3">
              {months.map((mName, idx) => {
                  const booksInMonth = books.filter(b => isBookReadInMonth(b, year, idx));
                  const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === year;

                  return (
                      <button 
                        key={mName} 
                        onClick={() => handleMonthClick(idx)}
                        className={`aspect-[4/5] bg-gray-50 rounded-2xl border flex flex-col items-center p-2 relative overflow-hidden transition-all hover:border-indigo-300 active:scale-95 ${isCurrentMonth ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30' : 'border-gray-100'}`}
                      >
                          <span className={`text-[10px] font-bold uppercase mb-2 ${isCurrentMonth ? 'text-indigo-700' : 'text-gray-500'}`}>{mName}</span>
                          
                          {booksInMonth.length > 0 ? (
                              <div className="grid grid-cols-2 gap-1 w-full flex-1 content-start">
                                  {booksInMonth.slice(0, 4).map(b => (
                                      <div key={b.id} className="aspect-[2/3] bg-white rounded-md overflow-hidden shadow-sm">
                                          <BookCover book={b} className="w-full h-full" iconSize={12} />
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex-1 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                              </div>
                          )}

                          {booksInMonth.length > 0 && (
                              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-md px-1.5 py-0.5 text-[8px] font-black text-gray-800 shadow-sm border border-gray-100">
                                  {booksInMonth.length}
                              </div>
                          )}
                      </button>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800 animate-in fade-in">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Календар</h1>
        <button 
            onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
            className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-500 shadow-sm active:scale-95 transition-all"
        >
            {viewMode === 'month' ? <Grid size={20} /> : <CalendarIcon size={20} />}
        </button>
      </header>

      {/* Main Calendar Card */}
      <div 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 transition-all duration-300 select-none"
      >
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrev} className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-600">
            <ChevronLeft size={20} />
          </button>
          
          <button 
             onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
             className="text-lg font-bold capitalize flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
             {viewMode === 'month' && <span className="text-gray-400 font-normal">{year}</span>}
             <span className="text-indigo-900">{viewMode === 'month' ? monthName : year}</span>
          </button>

          <button onClick={handleNext} className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>

        {viewMode === 'month' ? renderMonthView() : renderYearView()}
      </div>

      {/* Activity Stats */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 transition-all duration-300">
         <div className="flex justify-between items-end mb-4">
             <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Читацька активність</h3>
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    {selectedDay ? (
                        <span className="text-indigo-600 font-bold">{selectedDay} {monthName}</span>
                    ) : (
                        <span>{viewMode === 'month' ? `За ${monthName.toLowerCase()}` : `За ${year} рік`}</span>
                    )}
                </p>
             </div>
             <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-black text-indigo-600 tracking-tighter">{activeStats.count}</span>
                 <span className="text-xs font-bold text-gray-400 uppercase">Книг</span>
             </div>
         </div>

         {/* Detailed Stats Cards */}
         {activeStats.pages > 0 && (
             <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2">
                 <div className="bg-emerald-50 p-3 rounded-2xl flex items-center gap-3">
                     <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><FileText size={16} /></div>
                     <div>
                         <p className="text-[10px] font-bold text-emerald-400 uppercase">Прочитано</p>
                         <p className="text-lg font-black text-emerald-700 leading-none">{activeStats.pages} <span className="text-[10px] font-medium opacity-70">стор.</span></p>
                     </div>
                 </div>
                 <div className="bg-amber-50 p-3 rounded-2xl flex items-center gap-3">
                     <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><Clock size={16} /></div>
                     <div>
                         <p className="text-[10px] font-bold text-amber-400 uppercase">Час</p>
                         <p className="text-lg font-black text-amber-700 leading-none">{activeStats.time > 0 ? Math.round(activeStats.time / 60) : 0} <span className="text-[10px] font-medium opacity-70">хв.</span></p>
                     </div>
                 </div>
             </div>
         )}

         <div className="space-y-3">
            {activeStats.list.length === 0 ? (
               <div className="text-center py-6 text-gray-300 flex flex-col items-center">
                   <BookOpen size={32} className="mb-2 opacity-20" />
                   <p className="text-xs italic">Немає активності за цей період</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-2">
                   {visibleStatsBooks.map(book => (
                      <div 
                        key={book.id} 
                        onClick={() => setSelectedBook(book)}
                        className="flex items-center gap-4 p-2.5 bg-gray-50 rounded-2xl group cursor-pointer active:scale-95 transition-all hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                      >
                        <div className="w-10 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                           <BookCover book={book} className="w-full h-full" iconSize={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-gray-800 truncate">{book.title}</h4>
                          <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
                        </div>
                        {(book.rating || 0) > 0 && (
                            <div className="px-2 py-1 bg-white rounded-lg shadow-sm text-[10px] font-black text-indigo-600 border border-gray-100">
                                {book.rating}
                            </div>
                        )}
                      </div>
                    ))}
                    
                    {hasMore && (
                        <div ref={observerTarget} className="flex justify-center py-2">
                            <Loader2 className="animate-spin text-gray-300" size={16} />
                        </div>
                    )}
               </div>
            )}
         </div>
      </div>

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
