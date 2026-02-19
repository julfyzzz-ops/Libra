
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Book, BookFormat, BookStatus } from '../types';
import { BookOpen, Headphones, Tablet, Trash2, Edit3, Save, X, Play, Zap, Calendar as CalendarIcon, Building2, Upload, ShoppingCart, Ghost, Loader2, Clock, Wand2, Link, Trophy, CalendarDays, Smile, MessageSquare, Tag, Layers } from 'lucide-react';
import { processImage, fetchBookCover } from '../services/storageService';
import { FORMAT_LABELS, STATUS_LABELS, calculateProgress, calculateTotalReadingTime, calculateAverageSpeed, getRatingColor, getBookPageTotal } from '../utils';

interface BookDetailsProps {
  book: Book;
  onClose: () => void;
  onUpdate: (book: Book) => void;
  onDelete: (id: string) => void;
  onOpenReadingMode: () => void;
  existingBooks: Book[];
  onFilterByTag?: (tag: string) => void;
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

export const BookDetails: React.FC<BookDetailsProps> = ({ book, onClose, onUpdate, onDelete, onOpenReadingMode, existingBooks, onFilterByTag }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Book>(book);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestions state
  const [showPubSuggestions, setShowPubSuggestions] = useState(false);

  // Extract unique publishers
  const uniquePublishers = useMemo(() => {
    const pubs = new Set<string>();
    existingBooks.forEach(b => {
      if (b.publisher && b.publisher.trim()) pubs.add(b.publisher.trim());
    });
    return Array.from(pubs).sort();
  }, [existingBooks]);

  const filteredPublishers = useMemo(() => {
      if (!editForm.publisher) return uniquePublishers;
      return uniquePublishers.filter(p => 
        p.toLowerCase().includes((editForm.publisher || '').toLowerCase())
      );
  }, [uniquePublishers, editForm.publisher]);

  // Lock body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      setIsProcessingImg(true);
      try {
        const compressed = await processImage(file);
        setEditForm({ ...editForm, coverUrl: compressed });
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
            setEditForm({ ...editForm, coverUrl: url });
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
    // Regex to allow only emojis and whitespace
    const val = e.target.value;
    try {
        const clean = val.replace(/[^\p{Extended_Pictographic}\s]/gu, '');
        setEditForm({ ...editForm, notes: clean });
    } catch (error) {
        setEditForm({ ...editForm, notes: val });
    }
  };

  const handleSave = () => {
    let updatedBook = { ...editForm };
    
    if (updatedBook.status === 'Completed') {
        if (!updatedBook.completedAt) {
           updatedBook.completedAt = new Date().toISOString();
        }
        if (!updatedBook.pagesRead && updatedBook.pagesTotal) {
           updatedBook.pagesRead = updatedBook.pagesTotal;
        }
    }

    onUpdate(updatedBook);
    setIsEditing(false);
  };

  const handleStartReadingWishlist = () => {
      onUpdate({
          ...book,
          status: 'Reading',
          readingStartedAt: new Date().toISOString(),
          readingDates: [new Date().toISOString().split('T')[0]]
      });
      onClose();
  };

  const handleTagClick = (tag?: string) => {
      if (tag && onFilterByTag) {
          onFilterByTag(tag);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col shadow-2xl">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-white p-6 border-b border-gray-100 shadow-sm">
           <button 
             onClick={onClose} 
             className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-50"
           >
             <X size={20} />
           </button>

           <div className="flex gap-5">
              {/* Cover Column */}
              <div 
                onClick={() => isEditing && fileInputRef.current?.click()} 
                className={`w-32 aspect-[2/3] bg-gray-50 rounded-2xl shadow-lg overflow-hidden border border-gray-100 flex-shrink-0 relative ${isEditing ? 'cursor-pointer group' : ''}`}
              >
                {isProcessingImg ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600" /></div>
                ) : isEditing ? (
                    <img src={editForm?.coverUrl} className="w-full h-full object-cover opacity-80" />
                ) : book.coverUrl ? (
                    <img src={book.coverUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><BookOpen size={32} /></div>
                )}
                
                {/* Edit Overlay */}
                {isEditing && !isProcessingImg && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                        <Upload className="text-white" size={24} />
                    </div>
                )}
                
                {/* Magic Search Button */}
                {isEditing && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMagicSearch(); }}
                        disabled={isMagicLoading}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full text-indigo-600 shadow-sm border border-indigo-50 active:scale-95 transition-all disabled:opacity-50 z-20"
                        title="Знайти обкладинку"
                    >
                        {isMagicLoading ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                    </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleEditFileUpload} />
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-end pb-1">
                 {!isEditing && (
                    book.status === 'Wishlist' ? (
                        <button 
                            onClick={handleStartReadingWishlist} 
                            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                        >
                            <BookOpen size={16} fill="currentColor" /> 
                            <span className="text-sm">Почати читати</span>
                        </button>
                    ) : (
                        <button 
                            onClick={onOpenReadingMode} 
                            className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                        >
                            <Play size={16} fill="currentColor" /> 
                            <span className="text-sm">Читання</span>
                        </button>
                    )
                 )}

                 <div className="mb-2">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${book.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : book.status === 'Wishlist' ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'}`}>
                       {STATUS_LABELS[book.status]}
                    </span>
                 </div>
                 
                 {isEditing ? (
                    <div className="space-y-2">
                       <input 
                         className="w-full text-lg font-bold bg-gray-50 border-none p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                         value={editForm.title} 
                         onChange={e => setEditForm({...editForm, title: e.target.value})} 
                         placeholder="Назва книги"
                       />
                       <input 
                         className="w-full text-sm text-gray-500 bg-gray-50 border-none p-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                         value={editForm.author} 
                         onChange={e => setEditForm({...editForm, author: e.target.value})} 
                         placeholder="Автор"
                       />
                    </div>
                 ) : (
                    <>
                       <h2 className="text-xl font-bold text-gray-800 leading-tight line-clamp-3 mb-1">{book.title}</h2>
                       <p className="text-sm font-medium text-gray-400 truncate">{book.author}</p>
                    </>
                 )}
              </div>
           </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto no-scrollbar flex-1">
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">URL Обкладинки</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
                    <input 
                       placeholder="https://..." 
                       className="w-full bg-gray-50 pl-9 pr-3 py-2 rounded-2xl text-xs font-bold border-none outline-none" 
                       value={editForm.coverUrl || ''} 
                       onChange={e => setEditForm({...editForm, coverUrl: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-1 relative">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Видавництво</label>
                    <input 
                        className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={editForm.publisher || ''} 
                        onChange={e => {
                            setEditForm({...editForm, publisher: e.target.value});
                            setShowPubSuggestions(true);
                        }} 
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
                                    onClick={() => {
                                        setEditForm({...editForm, publisher: pub});
                                        setShowPubSuggestions(false);
                                    }}
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
                        <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Серія (Назва)</label>
                        <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.series || ''} onChange={e => setEditForm({...editForm, series: e.target.value})} placeholder="Напр. Гаррі Поттер" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Номер / Частина</label>
                        <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.seriesPart || ''} onChange={e => setEditForm({...editForm, seriesPart: e.target.value})} placeholder="Напр. 1" />
                    </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Жанр</label>
                   <input className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.genre || ''} onChange={e => setEditForm({...editForm, genre: e.target.value})} placeholder="Напр. Фентезі" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Всього ст.</label>
                      <input type="number" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={editForm.pagesTotal || 0} onChange={e => setEditForm({...editForm, pagesTotal: parseInt(e.target.value) || 0})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Статус</label>
                      <select className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as BookStatus})}>
                         <option value="Unread">Не прочитано</option>
                         <option value="Reading">Читаю</option>
                         <option value="Completed">Прочитано</option>
                         <option value="Wishlist">Бажанка</option>
                      </select>
                   </div>
                </div>
                
                <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Дата додавання</label>
                    <input 
                       type="date" 
                       className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" 
                       value={editForm.addedAt ? editForm.addedAt.substring(0, 10) : ''} 
                       onChange={e => setEditForm({...editForm, addedAt: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()})} 
                    />
                </div>

                {editForm.status === 'Completed' && (
                   <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-1">
                         <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Дата завершення</label>
                         <input 
                           type="date" 
                           className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" 
                           value={editForm.completedAt ? editForm.completedAt.substring(0, 10) : ''} 
                           onChange={e => setEditForm({...editForm, completedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined})} 
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Оцінка</label>
                         <select 
                           className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none appearance-none" 
                           value={editForm.rating || 0} 
                           onChange={e => setEditForm({...editForm, rating: parseInt(e.target.value)})}
                         >
                            <option value={0}>Без оцінки</option>
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                               <option key={r} value={r}>{r}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                )}

                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Примітки (тільки емодзі)</label>
                   <input 
                      className="w-full bg-gray-50 p-3 rounded-2xl text-lg font-bold border-none outline-none" 
                      value={editForm.notes || ''} 
                      onChange={handleEmojiInput}
                      placeholder="🤔😍⭐"
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Коментар</label>
                   <textarea 
                      className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-medium border-none outline-none resize-none h-24" 
                      value={editForm.comment || ''} 
                      onChange={e => setEditForm({...editForm, comment: e.target.value})}
                      placeholder="Напишіть свої враження..."
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Формати</label>
                   <div className="grid grid-cols-3 gap-2">
                      {Object.keys(FORMAT_LABELS).map(f => (
                         <FormatToggle 
                           key={f} 
                           label={FORMAT_LABELS[f as BookFormat]} 
                           active={editForm.formats.includes(f as any)} 
                           onChange={() => {
                             const cur = editForm.formats || [];
                             const next = cur.includes(f as any) ? cur.filter(x => x !== f) : [...cur, f as any];
                             if (next.length > 0) setEditForm({...editForm, formats: next});
                           }}
                         />
                      ))}
                   </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleTagClick(book.publisher)}
                    className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
                  >
                    <Building2 size={16} className="text-gray-400" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Видавництво</p>
                      <p className="text-[10px] font-bold text-gray-700 truncate">{book.publisher || '—'}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleTagClick(book.genre)}
                    className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
                  >
                    <Tag size={16} className="text-gray-400" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-gray-400 uppercase font-bold">Жанр</p>
                      <p className="text-[10px] font-bold text-gray-700 truncate">{book.genre || '—'}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleTagClick(book.series)}
                    className="col-span-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-3 text-left hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95"
                  >
                    <Layers size={16} className="text-gray-400" />
                    <div className="min-w-0 flex-1 flex justify-between items-center">
                        <div>
                            <p className="text-[8px] text-gray-400 uppercase font-bold">Серія</p>
                            <p className="text-[10px] font-bold text-gray-700 truncate">
                                {book.series || '—'}
                            </p>
                        </div>
                        {book.seriesPart && (
                            <div className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-black text-indigo-600">
                                #{book.seriesPart}
                            </div>
                        )}
                    </div>
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Статус</span>
                        <span className={`text-xs font-bold ${book.status === 'Completed' ? 'text-emerald-600' : book.status === 'Wishlist' ? 'text-pink-600' : 'text-indigo-600'}`}>
                            {STATUS_LABELS[book.status]}
                        </span>
                    </div>
                    {(book.rating || 0) > 0 && (
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Оцінка</span>
                            <span 
                                className="text-xs font-black px-2 py-0.5 rounded bg-white border border-gray-100 shadow-sm"
                                style={{ color: getRatingColor(book.rating || 0) }}
                            >
                                {book.rating}/10
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Сторінок</span>
                        <span className="text-xs font-bold text-gray-700">
                            {getBookPageTotal(book) || '—'}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Додано</span>
                        <span className="text-xs font-bold text-gray-700">
                            {new Date(book.addedAt).toLocaleDateString('uk-UA')}
                        </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Формат</span>
                        <span className="text-xs font-bold text-gray-700 text-right">
                            {book.formats.map(f => FORMAT_LABELS[f]).join(', ')}
                        </span>
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
                           <p className="text-[10px] font-bold text-pink-400 uppercase">В бажаннях з</p>
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
                
                {/* Notes & Comments Section */}
                {(book.notes || book.comment) && (
                    <div className="space-y-3 pt-2">
                        {book.notes && (
                            <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Smile size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">Примітки</span>
                                </div>
                                <div className="text-2xl tracking-widest leading-relaxed">
                                    {book.notes}
                                </div>
                            </div>
                        )}
                        
                        {book.comment && (
                            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={14} className="text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Коментар</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {book.comment}
                                </p>
                            </div>
                        )}
                    </div>
                )}
              </>
            )}

            <div className="flex gap-2 mt-4 pb-8">
              {isEditing ? (
                <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"><Save size={18} /> Зберегти</button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><Edit3 size={18} /> Редагувати</button>
              )}
              <button onClick={() => { if (confirm('Видалити книгу?')) { onDelete(book.id); } }} className="p-4 bg-red-50 text-red-500 rounded-2xl active:scale-95 transition-all"><Trash2 size={20} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
