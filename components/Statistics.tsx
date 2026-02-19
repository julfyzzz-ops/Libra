
import React, { useMemo } from 'react';
import { BookOpen, Trophy, Library, Building2, BookMarked, Layers } from 'lucide-react';
import { useLibrary } from '../contexts/LibraryContext';

export const Statistics: React.FC = () => {
  const { books } = useLibrary();

  const stats = useMemo(() => {
    // 1. Filter ONLY Paper books (excluding wishlist)
    const paperBooks = books.filter(b => 
        b.formats.includes('Paper') && b.status !== 'Wishlist'
    );
    
    const total = paperBooks.length;
    const read = paperBooks.filter(b => b.status === 'Completed').length;
    const reading = paperBooks.filter(b => b.status === 'Reading').length;
    const unread = paperBooks.filter(b => b.status === 'Unread').length;
    
    const readPercent = total > 0 ? Math.round((read / total) * 100) : 0;

    // 2. Publisher Stats (Only for Paper books)
    const publisherMap: Record<string, { total: number, read: number }> = {};
    paperBooks.forEach(b => {
      if (b.publisher) {
        const pub = b.publisher.trim();
        if (!pub) return;
        if (!publisherMap[pub]) publisherMap[pub] = { total: 0, read: 0 };
        publisherMap[pub].total += 1;
        if (b.status === 'Completed') publisherMap[pub].read += 1;
      }
    });

    const publisherStats = Object.entries(publisherMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        read: data.read,
        percent: data.total > 0 ? Math.round((data.read / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return { total, read, reading, unread, readPercent, publisherStats };
  }, [books]);

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Моя Полиця</h1>
        <p className="text-gray-500 text-sm mt-1">Статистика паперової бібліотеки</p>
      </header>

      {/* Hero Summary Section */}
      <section className="space-y-4">
        <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
            <BookOpen className="absolute -right-6 -bottom-6 text-white opacity-10 w-40 h-40 group-hover:scale-110 transition-transform duration-500" />
            
            <div className="relative z-10">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-6xl font-black tracking-tighter">{stats.total}</span>
                    <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Книг</span>
                </div>
                <p className="text-indigo-200 text-xs font-medium mb-6">Фізичні примірники у колекції</p>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-90">
                        <span>Прогрес полиці</span>
                        <span>{stats.readPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div 
                            className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                            style={{ width: `${stats.readPercent}%` }} 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center gap-2 shadow-sm">
                <Trophy className="text-emerald-500 mb-1" size={24} />
                <span className="text-3xl font-black text-emerald-700">{stats.read}</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Прочитано</span>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 flex flex-col items-center justify-center gap-2 shadow-sm">
                <BookMarked className="text-amber-500 mb-1" size={24} />
                <span className="text-3xl font-black text-amber-700">{stats.reading}</span>
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Читаю</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-2 shadow-sm">
                <Library className="text-gray-400 mb-1" size={24} />
                <span className="text-3xl font-black text-gray-700">{stats.unread}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">В планах</span>
            </div>
        </div>
      </section>

      {/* Publishers Section */}
      {stats.publisherStats.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
             <Building2 size={16} className="text-gray-400" />
             <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Видавництва</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {stats.publisherStats.map((pub, idx) => (
              <div key={pub.name} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="text-2xl font-black text-gray-100 w-8 text-center flex-shrink-0">{idx + 1}</span>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm text-gray-800 truncate">{pub.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pub.percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pub.percent}%` }} />
                             </div>
                             <span className="text-[10px] font-bold text-gray-400">{pub.percent}%</span>
                        </div>
                    </div>
                 </div>
                 
                 <div className="text-right flex-shrink-0">
                   <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black text-gray-800">{pub.read}</span>
                      <span className="text-xs font-bold text-gray-400">/ {pub.total}</span>
                   </div>
                   <span className="text-[9px] font-bold text-gray-400 uppercase">Книг</span>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.total === 0 && (
        <div className="text-center py-12 text-gray-300">
          <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">Ваша паперова полиця порожня</p>
          <p className="text-xs mt-1">Додайте книги з форматом "Паперова", щоб побачити статистику</p>
        </div>
      )}
    </div>
  );
};
