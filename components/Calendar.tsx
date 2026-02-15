
import React, { useMemo, useState } from 'react';
import { Book } from '../types';
// Added BookOpen to the imports from lucide-react
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface CalendarProps {
  books: Book[];
}

export const Calendar: React.FC<CalendarProps> = ({ books }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7; // Adjust for Monday start

  const monthName = currentDate.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });

  const readingMap = useMemo(() => {
    const map: Record<string, Book[]> = {};
    books.forEach(book => {
      // Prioritize sessions for accurate calendar mapping
      if (book.sessions && book.sessions.length > 0) {
        book.sessions.forEach(session => {
          if (!map[session.date]) map[session.date] = [];
          if (!map[session.date].some(b => b.id === book.id)) {
             map[session.date].push(book);
          }
        });
      }
      
      // Also include readingDates for compatibility or books moved manually
      if (book.readingDates) {
        book.readingDates.forEach(dateStr => {
          if (!map[dateStr]) map[dateStr] = [];
          if (!map[dateStr].some(b => b.id === book.id)) {
             map[dateStr].push(book);
          }
        });
      }
    });
    return map;
  }, [books]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: adjustedFirstDay }, (_, i) => null);

  const booksReadThisMonth = useMemo(() => {
     const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
     return books.filter(b => {
       const hasSession = b.sessions?.some(s => s.date.startsWith(monthPrefix));
       const hasDate = b.readingDates?.some(d => d.startsWith(monthPrefix));
       return hasSession || hasDate;
     });
  }, [books, currentDate]);

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header>
        <h1 className="text-3xl font-bold">Календар</h1>
      </header>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold capitalize">{monthName}</h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {padding.map((_, i) => <div key={`p-${i}`} className="aspect-square" />)}
          {days.map(day => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const reads = readingMap[dateStr] || [];
            
            return (
              <div 
                key={day} 
                className={`aspect-square relative rounded-xl overflow-hidden border flex flex-col items-center justify-center transition-all ${
                  reads.length > 0 ? 'border-indigo-200 bg-white' : 'border-gray-50 bg-gray-50/50'
                }`}
              >
                <span className={`text-[10px] absolute top-1 left-1 font-bold z-10 ${reads.length > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                  {day}
                </span>
                {reads.length > 0 && (
                  <div className="w-full h-full relative">
                    {reads[0].coverUrl ? (
                      <img 
                        src={reads[0].coverUrl} 
                        className="w-full h-full object-cover opacity-30"
                        alt={reads[0].title}
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                         <BookOpen size={12} className="text-indigo-200" />
                      </div>
                    )}
                    {reads.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-indigo-600 px-1 rounded text-[8px] font-bold text-white shadow-sm">
                        +{reads.length - 1}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
         <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Читацька активність</h3>
         <div className="space-y-3">
            {booksReadThisMonth.length === 0 ? (
               <p className="text-gray-400 text-xs italic text-center py-4">Немає записів за цей місяць</p>
            ) : (
               booksReadThisMonth.map(book => (
                  <div key={book.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><BookOpen size={16} /></div>}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-gray-800 truncate">{book.title}</h4>
                      <p className="text-[10px] text-gray-500 truncate">{book.author}</p>
                    </div>
                  </div>
                ))
            )}
         </div>
      </div>
    </div>
  );
};
