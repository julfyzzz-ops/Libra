import React from 'react';
import { ArrowLeft, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Book } from '../../types';
import { FORMAT_LABELS, getSeasonColorClass } from '../../utils';
import { BookCover } from '../ui/BookCover';

interface BookDetailsV2Props {
  book: Book;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartReadingWishlist: () => void;
  onOpenReadingMode: () => void;
}

export const BookDetailsV2: React.FC<BookDetailsV2Props> = ({
  book,
  onBack,
  onEdit,
  onDelete,
  onStartReadingWishlist,
  onOpenReadingMode,
}) => {
  const isWishlist = book.status === 'Wishlist';

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain p-4 pb-24 text-gray-800 space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft size={20} />
        <span className="text-sm font-bold">Back</span>
      </button>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex gap-4">
          <div className="w-24 h-32 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
            <BookCover book={book} className="w-full h-full" iconSize={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-800">{book.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{book.author}</p>
            <p className="text-xs text-gray-400 mt-2">Status: {book.status}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {(book.formats || []).map((format) => (
                <span key={format} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                  {FORMAT_LABELS[format]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 uppercase font-bold text-[10px]">Publisher</div>
            <div className="font-bold text-gray-700 mt-1">{book.publisher || '-'}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-400 uppercase font-bold text-[10px]">Genre</div>
            <div className="font-bold text-gray-700 mt-1">{book.genre || '-'}</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mt-3">
          <div className="text-gray-400 uppercase font-bold text-[10px]">Seasons</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(book.seasons && book.seasons.length > 0 ? book.seasons : ['-']).map((season) => (
              <span key={season} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${season === '-' ? 'bg-gray-200 text-gray-600' : getSeasonColorClass(season)}`}>
                {season}
              </span>
            ))}
          </div>
        </div>

        {(book.notes || book.comment) && (
          <div className="bg-gray-50 rounded-xl p-3 mt-3 space-y-2">
            {book.notes && (
              <div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">Notes</div>
                <div className="font-bold text-gray-700 mt-1">{book.notes}</div>
              </div>
            )}
            {book.comment && (
              <div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">Comment</div>
                <div className="text-gray-700 mt-1 whitespace-pre-wrap break-words">{book.comment}</div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 mt-5">
          {isWishlist ? (
            <button
              onClick={onStartReadingWishlist}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              <span>Start reading</span>
            </button>
          ) : (
            <button
              onClick={onOpenReadingMode}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              <span>Open reading</span>
            </button>
          )}

          <button onClick={onEdit} className="w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
            <Pencil size={16} />
            <span>Edit</span>
          </button>

          <button onClick={onDelete} className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

