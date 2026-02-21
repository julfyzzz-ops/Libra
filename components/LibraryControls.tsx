import React, { useMemo, useState } from 'react';
import { Search, Filter, X, Plus, ArrowUp, ArrowDown, ArrowDownUp } from 'lucide-react';
import { BookFormat, BookStatus, SortKey, SortDirection } from '../types';
import { FORMAT_LABELS, STATUS_LABELS } from '../utils';

interface LibraryControlsProps {
  search: string;
  onSearchChange: (term: string) => void;
  suggestions: string[];
  onAddClick: () => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
  isReordering: boolean;
  onToggleReorder: () => void;
  selectedStatuses: BookStatus[];
  selectedFormats: BookFormat[];
  onToggleStatus: (status: BookStatus) => void;
  onToggleFormat: (format: BookFormat) => void;
  onClearFilters: () => void;
  publisherFilter: string;
  onPublisherFilterChange: (value: string) => void;
  genreFilter: string;
  onGenreFilterChange: (value: string) => void;
  publisherSuggestions: string[];
  genreSuggestions: string[];
}

export const LibraryControls: React.FC<LibraryControlsProps> = ({
  search,
  onSearchChange,
  suggestions,
  onAddClick,
  sortKey,
  sortDirection,
  onSortChange,
  isReordering,
  onToggleReorder,
  selectedStatuses,
  selectedFormats,
  onToggleStatus,
  onToggleFormat,
  onClearFilters,
  publisherFilter,
  onPublisherFilterChange,
  genreFilter,
  onGenreFilterChange,
  publisherSuggestions,
  genreSuggestions,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPublisherSuggestions, setShowPublisherSuggestions] = useState(false);
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);

  const filteredPublisherSuggestions = useMemo(() => {
    if (!publisherFilter.trim()) return publisherSuggestions.slice(0, 8);
    const q = publisherFilter.toLowerCase().trim();
    return publisherSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [publisherFilter, publisherSuggestions]);

  const filteredGenreSuggestions = useMemo(() => {
    if (!genreFilter.trim()) return genreSuggestions.slice(0, 8);
    const q = genreFilter.toLowerCase().trim();
    return genreSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [genreFilter, genreSuggestions]);

  const hasActiveFilters =
    selectedFormats.length > 0 ||
    selectedStatuses.length !== 3 ||
    publisherFilter.trim().length > 0 ||
    genreFilter.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 h-12">
        <button
          onClick={onAddClick}
          className="h-12 w-12 flex-shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Пошук..."
            className="w-full h-full pl-10 pr-10 bg-white rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {search.length > 0 && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5"
            >
              <X size={16} />
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl z-50 overflow-hidden border border-gray-100">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSearchChange(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setShowSortPanel(!showSortPanel);
            setShowFilters(false);
          }}
          className="h-12 w-12 flex-shrink-0 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all bg-indigo-600 text-white shadow-indigo-200"
        >
          <ArrowDownUp size={20} />
        </button>

        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setShowSortPanel(false);
          }}
          className={`relative h-12 w-12 flex-shrink-0 border rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all ${showFilters || hasActiveFilters ? 'bg-white text-indigo-600 border-indigo-200' : 'bg-white text-gray-400 border-gray-100'}`}
        >
          <Filter size={20} />
          {hasActiveFilters && !showFilters && <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-600 rounded-full border border-white" />}
        </button>
      </div>

      {showSortPanel && (
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 space-y-3 animate-in slide-in-from-top-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Сортувати за</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['title', 'author', 'addedAt', 'genre'] as SortKey[]).map((key) => {
              const isActive = sortKey === key && !isReordering && sortKey !== 'custom';
              return (
                <button
                  key={key}
                  onClick={() => onSortChange(key)}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {key === 'title' ? 'Назва' : key === 'author' ? 'Автор' : key === 'addedAt' ? 'Дата' : 'Жанр'}
                  {isActive && (sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </button>
              );
            })}

            <button
              onClick={onToggleReorder}
              className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                isReordering || sortKey === 'custom'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Свій порядок
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-5 animate-in slide-in-from-top-2">
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Статус</span>
            <div className="flex flex-wrap gap-2">
              {(['Reading', 'Unread', 'Completed'] as BookStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onToggleStatus(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedStatuses.includes(s) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Формат</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(FORMAT_LABELS).map((f) => (
                <button
                  key={f}
                  onClick={() => onToggleFormat(f as BookFormat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedFormats.includes(f as BookFormat) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                >
                  {FORMAT_LABELS[f as BookFormat]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Видавництво</span>
              <input
                type="text"
                value={publisherFilter}
                onChange={(e) => {
                  onPublisherFilterChange(e.target.value);
                  setShowPublisherSuggestions(true);
                }}
                onFocus={() => setShowPublisherSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPublisherSuggestions(false), 200)}
                placeholder="Фільтр за видавництвом"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl text-xs font-bold border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {showPublisherSuggestions && filteredPublisherSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 max-h-36 overflow-y-auto">
                  {filteredPublisherSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onPublisherFilterChange(s);
                        setShowPublisherSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Жанр</span>
              <input
                type="text"
                value={genreFilter}
                onChange={(e) => {
                  onGenreFilterChange(e.target.value);
                  setShowGenreSuggestions(true);
                }}
                onFocus={() => setShowGenreSuggestions(true)}
                onBlur={() => setTimeout(() => setShowGenreSuggestions(false), 200)}
                placeholder="Фільтр за жанром"
                className="w-full bg-gray-50 px-3 py-2.5 rounded-xl text-xs font-bold border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {showGenreSuggestions && filteredGenreSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-gray-100 max-h-36 overflow-y-auto">
                  {filteredGenreSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onGenreFilterChange(s);
                        setShowGenreSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={onClearFilters} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
              <X size={18} /> Очистити фільтри
            </button>
          )}
        </div>
      )}
    </div>
  );
};

