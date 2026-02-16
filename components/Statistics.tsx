
import React, { useMemo } from 'react';
import { Book, BookFormat } from '../types';
import { BookOpen, Tablet, Headphones, Ghost, Clock, ShoppingCart, Building2, Trophy, CheckCircle2, Library } from 'lucide-react';

interface StatisticsProps {
  books: Book[];
}

const FORMAT_LABELS: Record<BookFormat, string> = {
  'Paper': 'Паперова',
  'E-book': 'Електронна',
  'Audio': 'Аудіо',
  'Pirate': 'Піратка',
  'Expected': 'Очікується',
  'Sold': 'Продана'
};

export const Statistics: React.FC<StatisticsProps> = ({ books }) => {
  const stats = useMemo(() => {
    const activeBooks = books.filter(b => b.status !== 'Wishlist');
    
    // Paper Stats
    const paperBooks = activeBooks.filter(b => b.formats.includes('Paper'));
    const paperStats = {
        total: paperBooks.length,
        completed: paperBooks.filter(b => b.status === 'Completed').length,
        unread: paperBooks.filter(b => b.status === 'Unread').length
    };
    
    // Format Stats
    const formatsList: BookFormat[] = ['Paper', 'E-book', 'Audio', 'Pirate', 'Expected', 'Sold'];
    const formatStats = formatsList.map(f => {
      const booksInFormat = activeBooks.filter(b => b.formats.includes(f));
      const totalCount = booksInFormat.length;
      const readCount = booksInFormat.filter(b => b.status === 'Completed').length;
      return {
        key: f,
        label: FORMAT_LABELS[f],
        total: totalCount,
        read: readCount,
        percent: totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
      };
    }).filter(s => s.total > 0);

    // Publisher Stats
    const publisherMap: Record<string, { total: number, read: number }> = {};
    activeBooks.forEach(b => {
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
      .sort((a, b) => b.total - a.total); // Sort by most books

    return { total: activeBooks.length, paperStats, formatStats, publisherStats };
  }, [books]);

  const getFormatIcon = (format: BookFormat) => {
    switch (format) {
      case 'Paper': return <BookOpen size={20} className="text-indigo-600" />;
      case 'E-book': return <Tablet size={20} className="text-pink-500" />;
      case 'Audio': return <Headphones size={20} className="text-amber-500" />;
      case 'Pirate': return <Ghost size={20} className="text-gray-500" />;
      case 'Expected': return <Clock size={20} className="text-blue-400" />;
      case 'Sold': return <ShoppingCart size={20} className="text-emerald-500" />;
    }
  };

  const StatCard = ({ icon, title, read, total, percent, colorClass }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gray-50 ${colorClass}`}>
            {icon}
          </div>
          <span className="font-bold text-sm text-gray-700">{title}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-gray-800">{read}</span>
          <span className="text-xs font-bold text-gray-400"> / {total}</span>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
           <span>Прочитано</span>
           <span>{percent}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
            style={{ width: `${percent}%` }} 
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Статистика</h1>
        <p className="text-gray-500 text-sm mt-1">Детальний аналіз вашої бібліотеки</p>
      </header>

      {/* Paper Books Summary */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Паперові книги</h2>
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-600 p-5 rounded-3xl shadow-lg shadow-indigo-200 text-white flex flex-col justify-between h-32 relative overflow-hidden group">
            <BookOpen className="absolute -right-4 -bottom-4 text-white opacity-10 w-24 h-24 group-hover:scale-110 transition-transform" />
            <span className="text-4xl font-black z-10">{stats.paperStats.total}</span>
            <span className="text-xs font-bold uppercase opacity-80 z-10">Всього</span>
            </div>
            <div className="grid grid-rows-2 gap-3 h-32">
            <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center justify-between">
                <div>
                    <span className="block text-2xl font-black text-emerald-600">{stats.paperStats.completed}</span>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Прочитано</span>
                </div>
                <Trophy className="text-emerald-200" size={24} />
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between">
                <div>
                    <span className="block text-2xl font-black text-gray-800">{stats.paperStats.unread}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Не прочитано</span>
                </div>
                <Library className="text-gray-200" size={24} />
            </div>
            </div>
        </div>
      </section>

      {/* Formats Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">За форматами</h2>
        <div className="grid grid-cols-1 gap-3">
          {stats.formatStats.map(stat => (
            <StatCard 
              key={stat.key}
              icon={getFormatIcon(stat.key)}
              title={stat.label}
              read={stat.read}
              total={stat.total}
              percent={stat.percent}
            />
          ))}
        </div>
      </section>

      {/* Publishers Section */}
      {stats.publisherStats.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">За видавництвами</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.publisherStats.map(pub => (
              <div key={pub.name} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-3">
                 <div className="flex items-start gap-2 overflow-hidden">
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 flex-shrink-0">
                      <Building2 size={14} />
                    </div>
                    <span className="font-bold text-xs text-gray-700 line-clamp-2 leading-tight">{pub.name}</span>
                 </div>
                 
                 <div>
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Прочитано</span>
                      <span className="text-xs font-black text-gray-800">{pub.read}<span className="text-gray-300 font-normal">/{pub.total}</span></span>
                   </div>
                   <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pub.percent === 100 ? 'bg-emerald-500' : 'bg-gray-800'}`} style={{ width: `${pub.percent}%` }} />
                   </div>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.total === 0 && (
        <div className="text-center py-12 text-gray-300">
          <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Додайте книги, щоб побачити статистику</p>
        </div>
      )}
    </div>
  );
};
