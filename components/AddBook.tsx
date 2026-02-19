
import React, { useState, useRef, useMemo } from 'react';
import { Book as BookIcon, Upload, Image as ImageIcon, Save, Building2, Layers, Loader2, Wand2, Link } from 'lucide-react';
import { Book, BookFormat, BookStatus } from '../types';
import { processImage } from '../services/imageUtils';
import { fetchBookCover } from '../services/api';
import { useLibrary } from '../contexts/LibraryContext';
import { useUI } from '../contexts/UIContext';
import { Skeleton } from './ui/Skeleton';

interface AddBookProps {
  onAddSuccess: () => void;
}

const FormatToggle: React.FC<{ 
  label: string; 
  active: boolean; 
  onChange: (active: boolean) => void 
}> = ({ label, active, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
    <span className="text-xs font-bold text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`w-10 h-5 rounded-full transition-colors relative ${active ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  </div>
);

export const AddBook: React.FC<AddBookProps> = ({ onAddSuccess }) => {
  const { addBook, books } = useLibrary();
  const { toast } = useUI();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  
  // Publisher Autocomplete State
  const [showPubSuggestions, setShowPubSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    genre: '',
    publisher: '',
    series: '',
    seriesPart: '',
    pagesTotal: 0,
    isbn: '',
    formats: ['Paper'],
    status: 'Unread',
    coverUrl: '',
    coverBlob: undefined,
    notes: '',
    comment: ''
  });

  const uniquePublishers = useMemo(() => {
    const pubs = new Set<string>();
    books.forEach(b => {
      if (b.publisher && b.publisher.trim()) pubs.add(b.publisher.trim());
    });
    return Array.from(pubs).sort();
  }, [books]);

  const filteredPublishers = useMemo(() => {
    if (!formData.publisher) return uniquePublishers;
    return uniquePublishers.filter(p => 
      p.toLowerCase().includes((formData.publisher || '').toLowerCase())
    );
  }, [uniquePublishers, formData.publisher]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      try {
        const compressedBlob = await processImage(file);
        const previewUrl = URL.createObjectURL(compressedBlob);
        setFormData({ ...formData, coverBlob: compressedBlob, coverUrl: previewUrl });
        toast.show("Фото завантажено", "success");
      } catch (error) {
        console.error("Image processing failed", error);
        toast.show("Не вдалося обробити зображення", "error");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const handleMagicSearch = async () => {
    if (!formData.title) {
        toast.show("Введіть назву книги для пошуку", "info");
        return;
    }
    setIsMagicLoading(true);
    try {
        const url = await fetchBookCover(formData.title, formData.author || '');
        if (url) {
            setFormData({ ...formData, coverUrl: url, coverBlob: undefined });
            toast.show("Обкладинку знайдено", "success");
        } else {
            toast.show("Обкладинку не знайдено", "info");
        }
    } catch (e) {
        console.error(e);
        toast.show("Помилка пошуку", "error");
    } finally {
        setIsMagicLoading(false);
    }
  };

  const toggleFormat = (format: BookFormat) => {
    const current = formData.formats || [];
    if (current.includes(format)) {
      if (current.length > 1) {
        setFormData({ ...formData, formats: current.filter(f => f !== format) });
      }
    } else {
      setFormData({ ...formData, formats: [...current, format] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      toast.show("Назва та автор обов'язкові", "error");
      return;
    }
    
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: formData.title as string,
      author: formData.author as string,
      genre: formData.genre as string,
      publisher: formData.publisher as string,
      series: formData.series as string,
      seriesPart: formData.seriesPart as string,
      pagesTotal: Number(formData.pagesTotal) || 0,
      pagesRead: 0,
      isbn: formData.isbn as string,
      formats: (formData.formats || ['Paper']) as BookFormat[],
      status: formData.status as BookStatus,
      addedAt: new Date().toISOString(),
      readingStartedAt: formData.status === 'Reading' ? new Date().toISOString() : undefined,
      
      coverUrl: formData.coverUrl || '',
      coverBlob: formData.coverBlob,
      
      notes: formData.notes,
      comment: formData.comment,
      
      sessions: []
    };
    
    addBook(newBook);
    toast.show("Книгу додано", "success");
    onAddSuccess();
    setFormData({ title: '', author: '', genre: '', publisher: '', series: '', seriesPart: '', pagesTotal: 0, isbn: '', formats: ['Paper'], status: 'Unread', coverUrl: '', coverBlob: undefined, notes: '', comment: '' });
  };

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Нова книга</h1>
        <p className="text-xs text-gray-500 mt-1">Додайте нове видання до своєї колекції</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm space-y-5 border border-gray-100">
         <div className="flex justify-center mb-2 relative">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImg || isMagicLoading}
              className="relative w-28 aspect-[2/3] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isProcessingImg || isMagicLoading ? (
                 <Skeleton className="w-full h-full" />
              ) : formData.coverUrl ? (
                <img src={formData.coverUrl} className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="text-gray-300 mb-2" size={28} />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Обкладинка</span>
                </>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            
            <button
                type="button"
                onClick={handleMagicSearch}
                disabled={isMagicLoading || isProcessingImg}
                className="absolute top-0 right-16 translate-x-full bg-white p-3 rounded-2xl text-indigo-600 shadow-lg border border-indigo-50 active:scale-95 transition-all disabled:opacity-50"
                title="Знайти обкладинку"
            >
                {isMagicLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
            </button>
         </div>

         <div className="space-y-4">
           <div className="space-y-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Назва</label>
             <input required placeholder="Назва книги" className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 border-none transition-all text-sm font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
           </div>
           
           <div className="space-y-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Автор</label>
             <input required placeholder="Ім'я автора" className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 border-none transition-all text-sm font-bold" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
           </div>

           <div className="space-y-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Обкладинки</label>
             <div className="relative">
               <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
               <input 
                  placeholder="https://example.com/image.jpg" 
                  className="w-full bg-gray-50 pl-9 pr-3 py-3 rounded-2xl text-xs font-bold border-none outline-none" 
                  value={formData.coverUrl || ''} 
                  onChange={e => setFormData({...formData, coverUrl: e.target.value, coverBlob: undefined})} 
               />
             </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Видавництво</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                  <input 
                    placeholder="Видавець" 
                    className="w-full bg-gray-50 pl-9 pr-3 py-3 rounded-2xl text-xs font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500" 
                    value={formData.publisher} 
                    onChange={e => {
                        setFormData({...formData, publisher: e.target.value});
                        setShowPubSuggestions(true);
                    }}
                    onFocus={() => setShowPubSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPubSuggestions(false), 200)}
                  />
                  
                  {showPubSuggestions && filteredPublishers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                          {filteredPublishers.map((pub, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setFormData({...formData, publisher: pub});
                                    setShowPubSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                              >
                                {pub}
                              </button>
                          ))}
                      </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Серія / Номер</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input placeholder="Назва серії" className="w-full bg-gray-50 pl-9 pr-2 py-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})} />
                    </div>
                    <div className="w-16">
                        <input inputMode="numeric" pattern="[0-9]*" placeholder="#" className="w-full bg-gray-50 px-2 py-3 rounded-2xl text-xs font-bold border-none outline-none text-center" value={formData.seriesPart} onChange={e => setFormData({...formData, seriesPart: e.target.value})} />
                    </div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Жанр</label>
                <input placeholder="Жанр" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Сторінки</label>
                <input inputMode="numeric" pattern="[0-9]*" type="number" placeholder="0" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.pagesTotal || ''} onChange={e => setFormData({...formData, pagesTotal: parseInt(e.target.value) || 0})} />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Формати</label>
              <div className="grid grid-cols-2 gap-2">
                {['Paper', 'E-book', 'Audio', 'Pirate', 'Expected', 'Sold'].map(f => (
                  <FormatToggle key={f} label={f} active={formData.formats?.includes(f as any) || false} onChange={() => toggleFormat(f as any)} />
                ))}
              </div>
           </div>
           
           <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Примітки (Емоджі)</label>
              <input 
                  placeholder="😍🤔⭐" 
                  className="w-full bg-gray-50 p-3 rounded-2xl outline-none border-none text-lg font-bold placeholder:text-gray-300 placeholder:text-sm" 
                  value={formData.notes || ''} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
              />
           </div>

           <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Коментар</label>
              <textarea 
                  placeholder="Ваші думки про книгу..." 
                  className="w-full bg-gray-50 p-3 rounded-2xl outline-none border-none text-sm font-medium resize-none h-20 placeholder:text-gray-300 placeholder:text-xs" 
                  value={formData.comment || ''} 
                  onChange={e => setFormData({...formData, comment: e.target.value})} 
              />
           </div>

           <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Статус</label>
              <select className="w-full bg-gray-50 p-3 rounded-2xl outline-none text-xs font-bold appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as BookStatus})}>
                <option value="Unread">Не прочитано</option>
                <option value="Reading">Читаю</option>
                <option value="Completed">Прочитано</option>
              </select>
           </div>

           <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 mt-2 active:scale-95 transition-all flex items-center justify-center gap-2">
             <Save size={18} /> Додати книгу
           </button>
         </div>
      </form>
    </div>
  );
};
