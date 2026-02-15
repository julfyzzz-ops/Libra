
import React, { useState, useRef } from 'react';
import { Book as BookIcon, Upload, Image as ImageIcon, Save, Building2, Layers } from 'lucide-react';
import { Book, BookFormat, BookStatus } from '../types';

interface AddBookProps {
  onAdd: (book: Book) => void;
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

export const AddBook: React.FC<AddBookProps> = ({ onAdd }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    genre: '',
    publisher: '',
    seriesPart: '',
    pagesTotal: 0,
    isbn: '',
    formats: ['Paper'],
    status: 'Unread',
    coverUrl: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, coverUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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
      alert("Назва та автор є обов'язковими");
      return;
    }
    
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: formData.title as string,
      author: formData.author as string,
      genre: formData.genre as string,
      publisher: formData.publisher as string,
      seriesPart: formData.seriesPart as string,
      pagesTotal: Number(formData.pagesTotal) || 0,
      pagesRead: 0,
      isbn: formData.isbn as string,
      formats: (formData.formats || ['Paper']) as BookFormat[],
      status: formData.status as BookStatus,
      addedAt: new Date().toISOString(),
      readingDates: formData.status === 'Reading' ? [new Date().toISOString().split('T')[0]] : [],
      coverUrl: formData.coverUrl || '',
      sessions: []
    };
    
    onAdd(newBook);
    setFormData({ title: '', author: '', genre: '', publisher: '', seriesPart: '', pagesTotal: 0, isbn: '', formats: ['Paper'], status: 'Unread', coverUrl: '' });
  };

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Нова книга</h1>
        <p className="text-xs text-gray-500 mt-1">Додайте нове видання до своєї колекції</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm space-y-5 border border-gray-100">
         <div className="flex justify-center mb-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-28 aspect-[2/3] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:bg-gray-100 transition-colors"
            >
              {formData.coverUrl ? (
                <img src={formData.coverUrl} className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="text-gray-300 mb-2" size={28} />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Обкладинка</span>
                </>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
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

           <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Видавництво</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                  <input placeholder="Видавець" className="w-full bg-gray-50 pl-9 pr-3 py-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Серія / Частина</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                  <input placeholder="Напр. Том 1" className="w-full bg-gray-50 pl-9 pr-3 py-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.seriesPart} onChange={e => setFormData({...formData, seriesPart: e.target.value})} />
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
                <input type="number" placeholder="0" className="w-full bg-gray-50 p-3 rounded-2xl text-xs font-bold border-none outline-none" value={formData.pagesTotal || ''} onChange={e => setFormData({...formData, pagesTotal: parseInt(e.target.value) || 0})} />
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
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Статус</label>
              <select className="w-full bg-gray-50 p-3 rounded-2xl outline-none text-xs font-bold appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as BookStatus})}>
                <option value="Unread">Не прочитано</option>
                <option value="Reading">Читаю</option>
                <option value="Completed">Прочитано</option>
                <option value="Wishlist">Бажанка</option>
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
