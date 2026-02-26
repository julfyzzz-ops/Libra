import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Library,
  BookMarked,
  Trophy
} from 'lucide-react';
import { useLibrary } from '../contexts/LibraryContext';
import { FORMAT_LABELS } from '../utils';
import { BookCover } from './ui/BookCover';

type ReadPeriodMode = 'month' | 'year';

const formatPeriodLabel = (date: Date, mode: ReadPeriodMode) => {
  if (mode === 'year') {
    return new Intl.DateTimeFormat('uk-UA', { year: 'numeric' }).format(date);
  }

  const label = new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric'
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatCompletedDate = (date: Date) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

const movePeriod = (date: Date, mode: ReadPeriodMode, step: number) =>
  mode === 'month'
    ? new Date(date.getFullYear(), date.getMonth() + step, 1)
    : new Date(date.getFullYear() + step, 0, 1);

export const Statistics: React.FC = () => {
  const { books } = useLibrary();
  const [showReadScreen, setShowReadScreen] = useState(false);
  const [periodMode, setPeriodMode] = useState<ReadPeriodMode>('month');
  const [periodDate, setPeriodDate] = useState(() => new Date());

  const stats = useMemo(() => {
    const paperBooks = books.filter(
      b => b.formats.includes('Paper') && b.status !== 'Wishlist'
    );

    const total = paperBooks.length;
    const read = paperBooks.filter(b => b.status === 'Completed').length;
    const reading = paperBooks.filter(b => b.status === 'Reading').length;
    const unread = paperBooks.filter(b => b.status === 'Unread').length;
    const readPercent = total > 0 ? Math.round((read / total) * 100) : 0;

    const publisherMap: Record<string, { total: number; read: number }> = {};
    paperBooks.forEach(b => {
      if (!b.publisher) return;
      const pub = b.publisher.trim();
      if (!pub) return;
      if (!publisherMap[pub]) publisherMap[pub] = { total: 0, read: 0 };
      publisherMap[pub].total += 1;
      if (b.status === 'Completed') publisherMap[pub].read += 1;
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

  const readPeriod = useMemo(() => {
    const start =
      periodMode === 'month'
        ? new Date(periodDate.getFullYear(), periodDate.getMonth(), 1)
        : new Date(periodDate.getFullYear(), 0, 1);
    const end =
      periodMode === 'month'
        ? new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1)
        : new Date(periodDate.getFullYear() + 1, 0, 1);

    const completedBooks = books
      .filter(b => b.status === 'Completed' && !!b.completedAt)
      .map(b => ({ book: b, completedDate: new Date(b.completedAt as string) }))
      .filter(
        entry =>
          !Number.isNaN(entry.completedDate.getTime()) &&
          entry.completedDate >= start &&
          entry.completedDate < end
      )
      .sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());

    return { start, end, completedBooks };
  }, [books, periodDate, periodMode]);

  if (showReadScreen) {
    return (
      <div className="p-4 space-y-5 pb-32 animate-in fade-in">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowReadScreen(false)}
              className="w-10 h-10 rounded-xl border border-gray-100 bg-white text-gray-500 flex items-center justify-center shadow-sm"
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-800 truncate">Прочитане</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Повністю завершені книги за обраний період
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setPeriodMode('month');
                setPeriodDate(new Date());
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                periodMode === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-white'
              }`}
            >
              Місяць
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodMode('year');
                setPeriodDate(new Date());
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                periodMode === 'year'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-white'
              }`}
            >
              Рік
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPeriodDate(prev => movePeriod(prev, periodMode, -1))}
              className="w-10 h-10 rounded-xl border border-gray-100 text-gray-500 bg-gray-50 flex items-center justify-center"
              aria-label="Попередній період"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                Обраний період
              </p>
              <p className="text-sm font-bold text-gray-800 truncate">
                {formatPeriodLabel(periodDate, periodMode)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPeriodDate(prev => movePeriod(prev, periodMode, 1))}
              className="w-10 h-10 rounded-xl border border-gray-100 text-gray-500 bg-gray-50 flex items-center justify-center"
              aria-label="Наступний період"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                Прочитано повністю
              </p>
              <p className="text-3xl font-black text-indigo-700">
                {readPeriod.completedBooks.length}
              </p>
            </div>
            <CalendarDays className="text-indigo-300" size={28} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
            Список книг
          </h2>

          {readPeriod.completedBooks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-gray-400">
              <BookOpen size={30} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">У цьому періоді ще немає завершених книг</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readPeriod.completedBooks.map(({ book, completedDate }) => (
                <article
                  key={book.id}
                  className="bg-white border border-gray-100 rounded-3xl p-3 shadow-sm flex gap-3 items-center"
                >
                  <BookCover book={book} className="w-12 h-16 rounded-xl flex-shrink-0" iconSize={16} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-800 truncate">{book.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Формат: {book.formats.map(f => FORMAT_LABELS[f]).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Завершено</p>
                    <p className="text-xs font-bold text-gray-700">{formatCompletedDate(completedDate)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 pb-32 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Моя полиця</h1>
        <p className="text-gray-500 text-sm mt-1">Статистика паперової бібліотеки</p>
      </header>

      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowReadScreen(true)}
          className="w-full bg-white border border-gray-100 rounded-[2rem] p-5 flex items-center justify-between shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all group"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              Історія читання
            </p>
            <p className="text-base font-bold text-gray-800">Прочитане за місяць / рік</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
            <ChevronRight size={20} />
          </div>
        </button>

        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-400 opacity-20 rounded-full blur-2xl" />
          <BookOpen className="absolute -right-6 -bottom-6 text-white opacity-10 w-40 h-40 group-hover:scale-110 transition-transform duration-700" />

          <div className="relative z-10">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-7xl font-black tracking-tighter">{stats.total}</span>
              <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Книг</span>
            </div>
            <p className="text-indigo-100 text-xs font-medium mb-8">Фізичні примірники у вашій колекції</p>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-90">
                <span>Прогрес полиці</span>
                <span>{stats.readPercent}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.6)]"
                  style={{ width: `${stats.readPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
              <Trophy size={20} />
            </div>
            <span className="text-3xl font-black text-emerald-700 leading-none">{stats.read}</span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Прочитано</span>
          </div>

          <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex flex-col items-center justify-center gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-1">
              <BookMarked size={20} />
            </div>
            <span className="text-3xl font-black text-amber-700 leading-none">{stats.reading}</span>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Читаю</span>
          </div>

          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center gap-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
              <Library size={20} />
            </div>
            <span className="text-3xl font-black text-slate-700 leading-none">{stats.unread}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">В планах</span>
          </div>
        </div>
      </section>

      {stats.publisherStats.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Видавництва</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {stats.publisherStats.map((pub, idx) => (
              <div
                key={pub.name}
                className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between gap-4 group hover:border-indigo-100 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="text-3xl font-black text-gray-50 w-8 text-center flex-shrink-0 group-hover:text-indigo-50 transition-colors">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-gray-800 truncate mb-1.5">{pub.name}</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 max-w-[120px] bg-gray-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${pub.percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pub.percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{pub.percent}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-xl font-black text-gray-800">{pub.read}</span>
                    <span className="text-xs font-bold text-gray-400">/ {pub.total}</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Книг</span>
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
