import React from 'react';
import { Book } from '../types';
import {
  BookOpen,
  X,
  Play,
  Zap,
  Calendar as CalendarIcon,
  Building2,
  Clock,
  CalendarDays,
  Smile,
  MessageSquare,
  Tag,
  Layers,
  Trash2,
  Edit3,
} from 'lucide-react';
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  calculateProgress,
  calculateTotalReadingTime,
  calculateAverageSpeed,
  getRatingColor,
  getBookPageTotal,
  getSeasonColorClass,
} from '../utils';
import { useUI } from '../contexts/UIContext';
import { BookCover } from './ui/BookCover';
import { appendDebugLog } from '../services/debugLogger';

interface BookViewProps {
  book: Book;
  onClose: () => void;
  onOpenReadingMode: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagClick: (tag?: string) => void;
  onStartReadingWishlist: () => void;
}

export const BookView: React.FC<BookViewProps> = ({
  book,
  onClose,
  onOpenReadingMode,
  onEdit,
  onDelete,
  onTagClick,
  onStartReadingWishlist,
}) => {
  const { confirm, toast } = useUI();
  const logTap = (source: string) => appendDebugLog('info', 'bookView.tap', source);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: 'Видалити книгу?',
      message: `Ви впевнені, що хочете видалити "${book.title}"? Цю дію неможливо скасувати.`,
      type: 'danger',
      confirmText: 'Видалити',
      cancelText: 'Залишити',
    });

    if (isConfirmed) {
      onDelete();
      toast.show('Книгу видалено', 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white sm:rounded-[2.5rem] overflow-hidden">
      <div className="sticky top-0 z-40 bg-white p-6 border-b border-gray-100 shadow-sm">
        <button
          onPointerDownCapture={() => logTap('close:pointerdown')}
          onTouchStartCapture={() => logTap('close:touchstart')}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-50 touch-manipulation"
        >
          <X size={20} />
        </button>

        <div className="flex gap-5">
          <div className="w-32 aspect-[2/3] bg-gray-50 rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex-shrink-0 relative">
            <BookCover book={book} className="w-full h-full" iconSize={32} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-end pb-1">
            {book.status === 'Wishlist' ? (
              <button
                onPointerDownCapture={() => logTap('startWishlist:pointerdown')}
                onTouchStartCapture={() => logTap('startWishlist:touchstart')}
                onClick={onStartReadingWishlist}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-indigo-500/40 active:scale-95 transition-all touch-manipulation"
              >
                <BookOpen size={16} fill="currentColor" /> <span className="text-sm">Почати читати</span>
              </button>
            ) : (
              <button
                onPointerDownCapture={() => logTap('openReading:pointerdown')}
                onTouchStartCapture={() => logTap('openReading:touchstart')}
                onClick={onOpenReadingMode}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-indigo-500/40 active:scale-95 transition-all touch-manipulation"
              >
                <Play size={16} fill="currentColor" /> <span className="text-sm">Читання</span>
              </button>
            )}

            <div className="mb-2">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  book.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-600'
                    : book.status === 'Wishlist'
                      ? 'bg-pink-50 text-pink-600'
                      : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {STATUS_LABELS[book.status]}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-800 leading-tight line-clamp-3 mb-1">{book.title}</h2>
            <button
              onClick={() => onTagClick(book.author)}
              className="text-sm font-medium text-gray-400 truncate hover:text-indigo-600 transition-colors text-left active:scale-95"
            >
              {book.author}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 overflow-y-auto no-scrollbar flex-1">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onTagClick(book.publisher)}
              className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
            >
              <Building2 size={16} className="text-gray-400" />
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 uppercase font-bold">Видавництво</p>
                <p className="text-[10px] font-bold text-gray-700 truncate">{book.publisher || '—'}</p>
              </div>
            </button>

            <button
              onClick={() => onTagClick(book.genre)}
              className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
            >
              <Tag size={16} className="text-gray-400" />
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 uppercase font-bold">Жанр</p>
                <p className="text-[10px] font-bold text-gray-700 truncate">{book.genre || '—'}</p>
              </div>
            </button>

            <button
              onClick={() => onTagClick(book.seasons?.join(', '))}
              className="col-span-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
            >
              <CalendarDays size={16} className="text-gray-400" />
              <div className="min-w-0">
                <p className="text-[8px] text-gray-400 uppercase font-bold">Сезон</p>
                {book.seasons && book.seasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {book.seasons.map((season) => (
                      <span key={season} className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getSeasonColorClass(season)}`}>
                        {season}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-gray-700 truncate">—</p>
                )}
              </div>
            </button>

            <button
              onClick={() => onTagClick(book.series)}
              className="col-span-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
            >
              <Layers size={16} className="text-gray-400" />
              <div className="min-w-0 flex-1 flex justify-between items-center">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase font-bold">Серія</p>
                  <p className="text-[10px] font-bold text-gray-700 truncate">{book.series || '—'}</p>
                </div>
                {book.seriesPart && (
                  <div className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black text-indigo-600">#{book.seriesPart}</div>
                )}
              </div>
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Статус</span>
              <span
                className={`text-xs font-bold ${
                  book.status === 'Completed'
                    ? 'text-emerald-600'
                    : book.status === 'Wishlist'
                      ? 'text-pink-600'
                      : 'text-indigo-600'
                }`}
              >
                {STATUS_LABELS[book.status]}
              </span>
            </div>
            {(book.rating || 0) > 0 && (
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Оцінка</span>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-white border border-gray-100 shadow-sm" style={{ color: getRatingColor(book.rating || 0) }}>
                  {book.rating}/10
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Сторінок</span>
              <span className="text-xs font-bold text-gray-700">{getBookPageTotal(book) || '—'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Додано</span>
              <span className="text-xs font-bold text-gray-700">{new Date(book.addedAt).toLocaleDateString('uk-UA')}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Формат</span>
              <span className="text-xs font-bold text-gray-700 text-right">{book.formats.map((f) => FORMAT_LABELS[f]).join(', ')}</span>
            </div>
          </div>

          {book.status === 'Completed' ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center">
                <CalendarIcon size={16} className="text-emerald-500 mb-1" />
                <span className="text-[8px] font-bold text-emerald-400 uppercase text-center">Прочитано</span>
                <span className="text-[10px] font-bold text-emerald-700">{book.completedAt ? new Date(book.completedAt).toLocaleDateString('uk-UA') : '—'}</span>
              </div>
              <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex flex-col items-center">
                <Clock size={16} className="text-indigo-500 mb-1" />
                <span className="text-[8px] font-bold text-indigo-400 uppercase">Час</span>
                <span className="text-[10px] font-bold text-indigo-700">{calculateTotalReadingTime(book)} хв</span>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex flex-col items-center">
                <Zap size={16} className="text-amber-500 mb-1" />
                <span className="text-[8px] font-bold text-amber-400 uppercase">Швидкість</span>
                <span className="text-[10px] font-bold text-amber-700">{calculateAverageSpeed(book)} ст/г</span>
              </div>
            </div>
          ) : book.status === 'Wishlist' ? (
            <div className="bg-pink-50/50 p-4 rounded-3xl border border-pink-100 flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-full text-pink-500">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-pink-400 uppercase">В бажанках з</p>
                <p className="text-xs font-bold text-pink-700">{new Date(book.addedAt).toLocaleDateString('uk-UA')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Прогрес</h4>
                <span className="text-xs font-bold text-indigo-600">{calculateProgress(book.pagesRead, getBookPageTotal(book))}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${calculateProgress(book.pagesRead, getBookPageTotal(book))}%` }} />
              </div>
            </div>
          )}

          {(book.notes || book.comment) && (
            <div className="space-y-3 pt-2">
              {book.notes && (
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Smile size={14} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Примітки</span>
                  </div>
                  <div className="text-2xl tracking-widest leading-relaxed text-gray-800">{book.notes}</div>
                </div>
              )}
              {book.comment && (
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={14} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Коментар</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{book.comment}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4 pb-8">
            <button
              onPointerDownCapture={() => logTap('edit:pointerdown')}
              onTouchStartCapture={() => logTap('edit:touchstart')}
              onClick={onEdit}
              className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation"
            >
              <Edit3 size={18} /> Редагувати
            </button>
            <button onClick={handleDelete} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-95 transition-all">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
