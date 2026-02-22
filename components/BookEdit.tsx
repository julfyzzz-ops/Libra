
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Book, BookFormat, BookStatus } from '../types';
import { X, Upload, Loader2, Wand2, Link, Save } from 'lucide-react';
import { processImage, fetchBookCover } from '../services/storageService';
import { appendDebugLog } from '../services/debugLogger';
import { FORMAT_LABELS, STATUS_LABELS, SEASON_OPTIONS, normalizeSeason, getSeasonColorClass } from '../utils';

interface BookEditProps {
  book: Book;
  onClose: () => void;
  onSave: (updatedBook: Book) => void;
  uniquePublishers: string[];
  uniqueGenres: string[];
}

const FormatToggle: React.FC<{ 
  label: string; 
  active: boolean; 
  onChange: () => void 
}> = ({ label, active, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
  >
    <span className="text-[10px] font-bold">{label}</span>
    <div className={`w-3 h-3 rounded-full border-2 border-white ${active ? 'bg-white' : 'bg-transparent'}`} />
  </button>
);

export const BookEdit: React.FC<BookEditProps> = ({ book, onClose, onSave, uniquePublishers, uniqueGenres }) => {
  const [editForm, setEditForm] = useState<Book>(book);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [showPubSuggestions, setShowPubSuggestions] = useState(false);
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateEditForm = useCallback((patch: Partial<Book>) => {
    setEditForm(prev => ({ ...prev, ...patch }));
  }, []);
  const sanitizeText = useCallback((value: string, maxLen: number) => {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
      .slice(0, maxLen);
  }, []);
  const dismissActiveInput = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true') {
      active.blur();
    }
  }, []);
  
  // Local state for previewing the blob cover, as global URLs are gone
  const [previewUrl, setPreviewUrl] = useState<string | null>(editForm.coverUrl || null);

  useEffect(() => {
    let url: string | null = null;
    // If we have a blob but no explicit external URL, generate a local preview
    if (editForm.coverBlob && !editForm.coverUrl) {
       url = URL.createObjectURL(editForm.coverBlob);
       setPreviewUrl(url);
    } else {
       setPreviewUrl(editForm.coverUrl || null);
    }
    
    return () => {
        if (url) URL.revokeObjectURL(url);
    };
  }, [editForm.coverBlob, editForm.coverUrl]);

  const filteredPublishers = useMemo(() => {
      if (!editForm.publisher) return uniquePublishers;
      return uniquePublishers.filter(p => 
        p.toLowerCase().includes((editForm.publisher || '').toLowerCase())
      );
  }, [uniquePublishers, editForm.publisher]);

  const filteredGenres = useMemo(() => {
      if (!editForm.genre) return uniqueGenres;
      return uniqueGenres.filter(g =>
        g.toLowerCase().includes((editForm.genre || '').toLowerCase())
      );
  }, [uniqueGenres, editForm.genre]);

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      setIsProcessingImg(true);
      try {
        const compressedBlob = await processImage(file);
        // We set coverUrl to empty so the useEffect picks up the new blob
        updateEditForm({ coverBlob: compressedBlob, coverUrl: '' });
      } catch (err) {
        console.error(err);
        alert("Помилка обробки фото");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const handleMagicSearch = async () => {
    if (!editForm || !editForm.title) {
        alert("Будь ласка, введіть назву книги для пошуку.");
        return;
    }
    setIsMagicLoading(true);
    try {
        const url = await fetchBookCover(editForm.title, editForm.author || '');
        if (url) {
            updateEditForm({ coverUrl: url, coverBlob: undefined });
        } else {
            alert("Обкладинку не знайдено.");
        }
    } catch (e) {
        console.error(e);
        alert("Помилка пошуку");
    } finally {
        setIsMagicLoading(false);
    }
  };

  const handleEmojiInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    try {
        const clean = val.replace(/[^\p{Extended_Pictographic}\s]/gu, '');
        updateEditForm({ notes: clean });
    } catch (error) {
        updateEditForm({ notes: val });
    }
  };

  const handleSaveClick = () => {
      if (isSavingRef.current || isSaving) return;
      try {
        appendDebugLog('info', 'bookEdit.save', 'save button tapped');
        dismissActiveInput();
        isSavingRef.current = true;
        setIsSaving(true);
        setShowPubSuggestions(false);
        setShowGenreSuggestions(false);
        onSave({ ...editForm });
      } catch (error) {
        console.error('BookEdit save click failed', error);
        appendDebugLog('error', 'bookEdit.save', 'save handler failed', error);
        isSavingRef.current = false;
        setIsSaving(false);
        alert('Не вдалося зберегти зміни');
      }
  };

  const handleCloseClick = () => {
    appendDebugLog('info', 'bookEdit.close', 'close button tapped');
    dismissActiveInput();
    isSavingRef.current = false;
    setIsSaving(false);
    onClose();
  };

  useEffect(() => {
    if (!isSaving) return;
    const timer = window.setTimeout(() => {
      appendDebugLog('warn', 'bookEdit.save', 'save is still pending after 4s');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [isSaving]);

  const toggleSeason = (season: string) => {
    const normalized = normalizeSeason(season);
    const current = editForm.seasons || [];
    const next = current.includes(normalized)
      ? current.filter(s => s !== normalized)
      : [...current, normalized];
    updateEditForm({ seasons: next });
  };

  return (
    <div className="flex flex-col h-full bg-white sm:rounded-[2.5rem] overflow-hidden">
      {/* STICKY HEADER - EDIT MODE */}
      <div className="sticky top-0 z-40 bg-white p-6 border-b border-gray-100 shadow-sm">
         <button
           onClick={handleCloseClick}
           className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-50"
         >
           <X size={20} />
         </button>

         <div className="flex gap-5">
            {/* Cover Column */}
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="w-32 aspect-[2/3] bg-gray-50 rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex-shrink-0 relative cursor-pointer group"
            >
              {isProcessingImg ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover opacity-80" />
              ) : (
                  <div className="w-full h-full bg-gray-50" />
              )}
              
              {!isProcessingImg && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors"><Upload className="text-white" size={24} /></div>
              )}
              
              <button type="button" onClick={(e) => { e.stopPropagation(); handleMagicSearch(); }} disabled={isMagicLoading} className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-indigo-600 shadow-sm border border-indigo-50 active:scale-95 transition-all disabled:opacity-50 z-20">
                  {isMagicLoading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEditFileUpload} />
            </div>

            {/* Info Column */}
            <div className="flex-1 min-w-0 flex flex-col justify-end pb-1">
               <div className="mb-2">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${editForm.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : editForm.status === 'Wishlist' ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'}`}>
                     {STATUS_LABELS[editForm.status]}
                  </span>
               </div>
               
               <div className="space-y-2">
                   <input maxLength={180} className="w-full text-lg font-bold bg-gray-50 border-none p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={editForm.title} onChange={e => updateEditForm({ title: sanitizeText(e.target.value, 180)})} placeholder="Назва книги" />
                   <input maxLength={140} className="w-full text-sm text-gray-500 bg-gray-50 border-none p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={editForm.author} onChange={e => updateEditForm({ author: sanitizeText(e.target.value, 140)})} placeholder="Автор" />
               </div>
            </div>
         </div>
      </div>

      <div className="px-6 py-6 overflow-y-auto no-scrollbar flex-1">
        <div className="space-y-6">
            <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">URL Обкладинки</label>
                <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                <input maxLength={1024} placeholder="https://..." className="w-full bg-gray-50 pl-9 pr-3 py-2 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.coverUrl || ''} onChange={e => updateEditForm({ coverUrl: sanitizeText(e.target.value, 1024), coverBlob: undefined})} />
                </div>
            </div>

            <div className="space-y-1 relative">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Видавництво</label>
                <input 
                    className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={editForm.publisher || ''} 
                    onChange={e => { updateEditForm({ publisher: sanitizeText(e.target.value, 120)}); setShowPubSuggestions(true); }} 
                    onFocus={() => setShowPubSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPubSuggestions(false), 200)}
                    placeholder="Видавець"
                />
                {showPubSuggestions && filteredPublishers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-32 overflow-y-auto">
                        {filteredPublishers.map((pub, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onPointerDown={(e) => e.preventDefault()}
                              onClick={() => { updateEditForm({ publisher: pub}); setShowPubSuggestions(false); }}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                            >
                              {pub}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Серія</label>
                    <input maxLength={120} className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.series || ''} onChange={e => updateEditForm({ series: sanitizeText(e.target.value, 120)})} placeholder="Напр. Гаррі Поттер" />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Номер</label>
                    <input type="text" maxLength={60} className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.seriesPart || ''} onChange={e => updateEditForm({ seriesPart: sanitizeText(e.target.value, 60)})} placeholder="Напр. Книга 1 / Том II" />
                </div>
            </div>

            <div className="space-y-1 relative">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Жанр</label>
                <input
                  className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none"
                  value={editForm.genre || ''}
                  maxLength={160}
                  onChange={e => {
                    updateEditForm({ genre: sanitizeText(e.target.value, 160) });
                    setShowGenreSuggestions(true);
                  }}
                  onFocus={() => setShowGenreSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowGenreSuggestions(false), 200)}
                  placeholder="Напр. Фентезі"
                />
                {showGenreSuggestions && filteredGenres.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-32 overflow-y-auto">
                    {filteredGenres.map((genre, idx) => (
                      <button
                        key={`${genre}-${idx}`}
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => { updateEditForm({ genre }); setShowGenreSuggestions(false); }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Сезон</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEASON_OPTIONS.map(season => {
                    const active = (editForm.seasons || []).includes(season);
                    return (
                      <button
                        key={season}
                        type="button"
                        onClick={() => toggleSeason(season)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${active ? 'border-transparent' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                      >
                        <span className={`px-2 py-0.5 rounded-full ${getSeasonColorClass(season)}`}>{season}</span>
                        <span className={`w-3 h-3 rounded-full border-2 ${active ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-transparent'}`} />
                      </button>
                    );
                  })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Всього ст.</label>
                    <input inputMode="numeric" pattern="[0-9]*" type="number" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.pagesTotal || 0} onChange={e => updateEditForm({ pagesTotal: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Статус</label>
                    <select className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" value={editForm.status} onChange={e => updateEditForm({ status: e.target.value as BookStatus})}>
                        <option value="Unread">Не прочитано</option>
                        <option value="Reading">Читаю</option>
                        <option value="Completed">Прочитано</option>
                        <option value="Wishlist">Бажанка</option>
                    </select>
                </div>
            </div>
            
            <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Дата додавання</label>
                <input type="date" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.addedAt ? editForm.addedAt.substring(0, 10) : ''} onChange={e => updateEditForm({ addedAt: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()})} />
            </div>

            {editForm.status === 'Completed' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Дата завершення</label>
                        <input type="date" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.completedAt ? editForm.completedAt.substring(0, 10) : ''} onChange={e => updateEditForm({ completedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Оцінка</label>
                        <select className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" value={editForm.rating || 0} onChange={e => updateEditForm({ rating: parseInt(e.target.value)})}>
                        <option value={0}>Без оцінки</option>
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (<option key={r} value={r}>{r}</option>))}
                        </select>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Примітки</label>
                <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-medium border-none outline-none placeholder:text-gray-300" value={editForm.notes || ''} onChange={handleEmojiInput} placeholder="тільки емодзі" />
            </div>

            <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Коментар</label>
                <textarea maxLength={2000} className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-medium border-none outline-none resize-none h-24" value={editForm.comment || ''} onChange={e => updateEditForm({ comment: sanitizeText(e.target.value, 2000)})} placeholder="Напишіть свої враження..." />
            </div>

            <div className="space-y-2">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Формати</label>
                <div className="grid grid-cols-3 gap-2">
                    {Object.keys(FORMAT_LABELS).map(f => (
                        <FormatToggle key={f} label={FORMAT_LABELS[f as BookFormat]} active={editForm.formats.includes(f as any)} onChange={() => { const cur = editForm.formats || []; const next = cur.includes(f as any) ? cur.filter(x => x !== f) : [...cur, f as any]; if (next.length > 0) updateEditForm({ formats: next}); }} />
                    ))}
                </div>
            </div>
            </div>

            <div className="flex gap-2 mt-4 pb-8">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveClick}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-70"
                >
                  <Save size={18} /> {isSaving ? 'Збереження...' : 'Зберегти'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

