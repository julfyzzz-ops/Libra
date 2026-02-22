import React, { useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Book, BookFormat, BookStatus } from '../../types';
import { FORMAT_LABELS, getSeasonColorClass, normalizeSeason, SEASON_OPTIONS } from '../../utils';

interface BookFormV2Props {
  title: string;
  submitLabel: string;
  initialValue: Partial<Book>;
  publisherSuggestions: string[];
  genreSuggestions: string[];
  allowedStatuses: BookStatus[];
  onSubmit: (value: Partial<Book>) => void;
  onCancel: () => void;
}

const sanitizeText = (value: string, maxLen: number): string => {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .slice(0, maxLen);
};

const normalizeFormats = (formats?: BookFormat[]): BookFormat[] => {
  if (!formats || formats.length === 0) return ['Paper'];
  const unique = Array.from(new Set(formats));
  return unique.length > 0 ? unique : ['Paper'];
};

const normalizeSeasons = (seasons?: string[]): string[] => {
  if (!seasons || seasons.length === 0) return [];
  return Array.from(
    new Set(
      seasons
        .map((value) => normalizeSeason(value))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
};

export const BookFormV2: React.FC<BookFormV2Props> = ({
  title,
  submitLabel,
  initialValue,
  publisherSuggestions,
  genreSuggestions,
  allowedStatuses,
  onSubmit,
  onCancel,
}) => {
  const [form, setForm] = useState<Partial<Book>>({
    title: initialValue.title || '',
    author: initialValue.author || '',
    publisher: initialValue.publisher || '',
    genre: initialValue.genre || '',
    series: initialValue.series || '',
    seriesPart: initialValue.seriesPart || '',
    pagesTotal: Number(initialValue.pagesTotal) || 0,
    formats: normalizeFormats(initialValue.formats),
    status: initialValue.status || allowedStatuses[0] || 'Unread',
    coverUrl: initialValue.coverUrl || '',
    notes: initialValue.notes || '',
    comment: initialValue.comment || '',
    seasons: normalizeSeasons(initialValue.seasons),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publisherFocused, setPublisherFocused] = useState(false);
  const [genreFocused, setGenreFocused] = useState(false);

  const safePublisherSuggestions = useMemo(
    () => Array.from(new Set(publisherSuggestions.filter(Boolean))).slice(0, 100),
    [publisherSuggestions]
  );
  const safeGenreSuggestions = useMemo(
    () => Array.from(new Set(genreSuggestions.filter(Boolean))).slice(0, 100),
    [genreSuggestions]
  );
  const filteredPublisherSuggestions = useMemo(() => {
    const q = (form.publisher || '').trim().toLowerCase();
    if (!q) return safePublisherSuggestions;
    return safePublisherSuggestions.filter((item) => item.toLowerCase().includes(q));
  }, [form.publisher, safePublisherSuggestions]);
  const filteredGenreSuggestions = useMemo(() => {
    const q = (form.genre || '').trim().toLowerCase();
    if (!q) return safeGenreSuggestions;
    return safeGenreSuggestions.filter((item) => item.toLowerCase().includes(q));
  }, [form.genre, safeGenreSuggestions]);

  const closeSuggestions = () => {
    setPublisherFocused(false);
    setGenreFocused(false);
  };

  const updateForm = <K extends keyof Book>(key: K, value: Book[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFormat = (format: BookFormat) => {
    const current = normalizeFormats(form.formats);
    if (current.includes(format)) {
      if (current.length === 1) return;
      updateForm('formats', current.filter((item) => item !== format));
      return;
    }
    updateForm('formats', [...current, format]);
  };

  const toggleSeason = (season: string) => {
    const normalized = normalizeSeason(season);
    const current = normalizeSeasons(form.seasons);
    if (current.includes(normalized)) {
      updateForm(
        'seasons',
        current.filter((value) => value !== normalized)
      );
      return;
    }
    updateForm('seasons', [...current, normalized]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    closeSuggestions();

    const titleValue = sanitizeText(form.title || '', 180).trim();
    const authorValue = sanitizeText(form.author || '', 140).trim();
    if (!titleValue || !authorValue) return;

    setIsSubmitting(true);
    try {
      onSubmit({
        ...form,
        title: titleValue,
        author: authorValue,
        publisher: sanitizeText(form.publisher || '', 120).trim(),
        genre: sanitizeText(form.genre || '', 160).trim(),
        series: sanitizeText(form.series || '', 120).trim(),
        seriesPart: sanitizeText(form.seriesPart || '', 60).trim(),
        coverUrl: sanitizeText(form.coverUrl || '', 1024).trim(),
        notes: sanitizeText(form.notes || '', 80),
        comment: sanitizeText(form.comment || '', 2000),
        pagesTotal: Math.max(0, Number(form.pagesTotal) || 0),
        formats: normalizeFormats(form.formats),
        seasons: normalizeSeasons(form.seasons),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain p-4 pb-24 text-gray-800">
      <button
        onClick={() => {
          closeSuggestions();
          onCancel();
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-bold">Back</span>
      </button>

      <div className="mt-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-xs text-gray-500 mt-1">Touch-safe form. No modal overlay, no custom touch handlers.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Title</label>
            <input
              required
              maxLength={180}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-sm font-bold"
              value={form.title || ''}
              onChange={(e) => updateForm('title', sanitizeText(e.target.value, 180))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Author</label>
            <input
              required
              maxLength={140}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-sm font-bold"
              value={form.author || ''}
              onChange={(e) => updateForm('author', sanitizeText(e.target.value, 140))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cover URL</label>
            <input
              maxLength={1024}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-medium"
              value={form.coverUrl || ''}
              onChange={(e) => updateForm('coverUrl', sanitizeText(e.target.value, 1024))}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Publisher</label>
              <input
                maxLength={120}
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={form.publisher || ''}
                onChange={(e) => updateForm('publisher', sanitizeText(e.target.value, 120))}
                onFocus={() => setPublisherFocused(true)}
                onBlur={() => window.setTimeout(() => setPublisherFocused(false), 120)}
              />
              {publisherFocused && filteredPublisherSuggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto overscroll-contain"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                  {filteredPublisherSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateForm('publisher', item);
                        setPublisherFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Genre</label>
              <input
                maxLength={160}
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={form.genre || ''}
                onChange={(e) => updateForm('genre', sanitizeText(e.target.value, 160))}
                onFocus={() => setGenreFocused(true)}
                onBlur={() => window.setTimeout(() => setGenreFocused(false), 120)}
              />
              {genreFocused && filteredGenreSuggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto overscroll-contain"
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                  {filteredGenreSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        updateForm('genre', item);
                        setGenreFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Series</label>
              <input
                maxLength={120}
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={form.series || ''}
                onChange={(e) => updateForm('series', sanitizeText(e.target.value, 120))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Series Part</label>
              <input
                maxLength={60}
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={form.seriesPart || ''}
                onChange={(e) => updateForm('seriesPart', sanitizeText(e.target.value, 60))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pages</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={Number(form.pagesTotal) || 0}
                onChange={(e) => updateForm('pagesTotal', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Status</label>
              <select
                className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-bold"
                value={(form.status as BookStatus) || allowedStatuses[0]}
                onChange={(e) => updateForm('status', e.target.value as BookStatus)}
              >
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Seasons</label>
            <div className="grid grid-cols-2 gap-2">
              {SEASON_OPTIONS.map((season) => {
                const active = normalizeSeasons(form.seasons).includes(season);
                return (
                  <button
                    key={season}
                    type="button"
                    onClick={() => toggleSeason(season)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                      active ? 'border-indigo-200 bg-indigo-50' : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}
                  >
                    <span className={`px-2 py-0.5 rounded-full ${getSeasonColorClass(season)}`}>{season}</span>
                    <span className={`w-3 h-3 rounded-full border-2 ${active ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Formats</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FORMAT_LABELS) as BookFormat[]).map((format) => {
                const active = normalizeFormats(form.formats).includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFormat(format)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                      active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}
                  >
                    <span>{FORMAT_LABELS[format]}</span>
                    <span className={`w-3 h-3 rounded-full border-2 ${active ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Notes</label>
            <input
              maxLength={80}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-medium"
              value={form.notes || ''}
              onChange={(e) => updateForm('notes', sanitizeText(e.target.value, 80))}
              placeholder="Emoji or short marks"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Comment</label>
            <textarea
              maxLength={2000}
              className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 border-none text-xs font-medium resize-none h-24"
              value={form.comment || ''}
              onChange={(e) => updateForm('comment', sanitizeText(e.target.value, 2000))}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            onClick={() => closeSuggestions()}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 mt-2 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={18} />
            <span>{submitLabel}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
