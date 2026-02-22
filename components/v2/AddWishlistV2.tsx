import React from 'react';
import { Book } from '../../types';
import { createClientId } from '../../services/id';

interface AddWishlistV2Props {
  onAdd: (book: Book) => void;
  onCancel: () => void;
}

export const AddWishlistV2: React.FC<AddWishlistV2Props> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain p-4 pb-24 text-gray-800">
      <button onClick={onCancel} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
        <span className="text-sm font-bold">Back</span>
      </button>

      <div className="mt-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Add Wishlist (V2)</h1>
        <p className="text-xs text-gray-500 mt-1">Simple touch-safe wishlist form.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isSubmitting) return;
            if (!title.trim() || !author.trim()) return;
            setIsSubmitting(true);
            try {
              const nowIso = new Date().toISOString();
              onAdd({
                id: createClientId(),
                title: title.trim(),
                author: author.trim(),
                formats: ['Paper'],
                status: 'Wishlist',
                genre: '',
                publisher: '',
                series: '',
                seriesPart: '',
                pagesTotal: 0,
                pagesRead: 0,
                coverUrl: coverUrl.trim(),
                addedAt: nowIso,
                sessions: [],
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Title</label>
            <input
              required
              maxLength={180}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-sm font-bold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Author</label>
            <input
              required
              maxLength={140}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-sm font-bold"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cover URL</label>
            <input
              maxLength={1024}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-medium"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 mt-2 active:scale-95 transition-all disabled:opacity-60"
          >
            Save wishlist
          </button>
        </form>
      </div>
    </div>
  );
};

