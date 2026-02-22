
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Save, Loader2, Wand2, Link, ArrowLeft } from 'lucide-react';
import { Book } from '../types';
import { processImage } from '../services/imageUtils';
import { fetchBookCover } from '../services/api';
import { createClientId } from '../services/id';

interface AddWishlistProps {
  onAdd: (book: Book) => void;
  onCancel: () => void;
}

export const AddWishlist: React.FC<AddWishlistProps> = ({ onAdd, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    coverUrl: '',
    coverBlob: undefined
  });
  const updateFormData = useCallback((patch: Partial<Book>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);
  const sanitizeText = useCallback((value: string, maxLen: number) => {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
      .slice(0, maxLen);
  }, []);

  const revokePreviewObjectUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokePreviewObjectUrl();
  }, [revokePreviewObjectUrl]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      try {
        const compressedBlob = await processImage(file);
        const previewUrl = URL.createObjectURL(compressedBlob);
        revokePreviewObjectUrl();
        previewObjectUrlRef.current = previewUrl;
        updateFormData({ coverBlob: compressedBlob, coverUrl: previewUrl });
      } catch (error) {
        console.error("Image processing failed", error);
        alert("Не вдалося обробити зображення");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const handleMagicSearch = async () => {
    if (!formData.title) {
        alert("Будь ласка, введіть назву для пошуку.");
        return;
    }
    setIsMagicLoading(true);
    try {
        const url = await fetchBookCover(formData.title, formData.author || '');
        if (url) {
            revokePreviewObjectUrl();
            updateFormData({ coverUrl: url, coverBlob: undefined });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      alert("Назва та автор є обов'язковими");
      return;
    }
    
    try {
      const newBook: Book = {
        id: createClientId(),
        title: formData.title as string,
        author: formData.author as string,
        genre: '',
        publisher: '',
        seriesPart: '',
        pagesTotal: 0,
        pagesRead: 0,
        isbn: '',
        formats: ['Paper'],
        status: 'Wishlist',
        addedAt: new Date().toISOString(),
        coverUrl: formData.coverUrl || '',
        coverBlob: formData.coverBlob,
        sessions: []
      };

      onAdd(newBook);
      revokePreviewObjectUrl();
    } catch (error) {
      console.error('Add wishlist submit failed', error);
      alert('Не вдалося зберегти бажанку');
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain space-y-6 pb-24 text-gray-800 animate-in slide-in-from-right duration-300">
      <div className="space-y-4">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} /> <span className="text-sm font-bold">Назад</span>
        </button>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm space-y-5 border border-gray-100">
            <div className="flex justify-center mb-2 relative">
                <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImg}
                className="relative w-28 aspect-[2/3] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                {isProcessingImg ? (
                    <Loader2 className="animate-spin text-indigo-600" />
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
                    disabled={isMagicLoading}
                    className="absolute top-0 right-16 translate-x-full bg-white p-3 rounded-2xl text-indigo-600 shadow-lg border border-indigo-50 active:scale-95 transition-all disabled:opacity-50"
                    title="Знайти обкладинку"
                >
                    {isMagicLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Назва</label>
                    <input required maxLength={180} placeholder="Назва книги" className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 border-none transition-all text-sm font-bold" value={formData.title} onChange={e => updateFormData({ title: sanitizeText(e.target.value, 180) })} />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Автор</label>
                    <input required maxLength={140} placeholder="Ім'я автора" className="w-full bg-gray-50 p-3 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 border-none transition-all text-sm font-bold" value={formData.author} onChange={e => updateFormData({ author: sanitizeText(e.target.value, 140) })} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Обкладинки</label>
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                        <input 
                            placeholder="https://example.com/image.jpg" 
                            className="w-full bg-gray-50 pl-9 pr-3 py-3 rounded-2xl text-xs font-bold border-none outline-none" 
                            maxLength={1024}
                            value={formData.coverUrl || ''} 
                            onChange={e => { revokePreviewObjectUrl(); updateFormData({ coverUrl: sanitizeText(e.target.value, 1024), coverBlob: undefined }); }} 
                        />
                    </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 mt-2 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> Зберегти бажанку
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};
