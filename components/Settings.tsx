
import React, { useRef } from 'react';
import { CheckCircle2, ShieldCheck, Download, FileJson, Upload, FileSpreadsheet } from 'lucide-react';
import { loadLibrary, importLibraryFromJSON, importLibraryFromCSV } from '../services/storageService';

export const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await loadLibrary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `booktracker_library_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export library:', error);
      alert('Помилка при експорті даних.');
    }
  };

  const handleImportClick = () => {
    if (confirm("Увага! Імпорт JSON повністю замінить вашу поточну бібліотеку. Продовжити?")) {
      fileInputRef.current?.click();
    }
  };

  const handleCsvImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importLibraryFromJSON(file);
      alert("Бібліотека успішно відновлена з резервної копії!");
      window.location.reload();
    } catch (error) {
      alert("Не вдалося прочитати файл. Переконайтеся, що це коректний JSON файл BookTracker.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importLibraryFromCSV(file);
      alert(`Успішно імпортовано ${count} книг!`);
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Помилка імпорту CSV. Перевірте формат файлу (потрібні колонки: Назва, Автор).");
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Налаштування</h1>
        <p className="text-gray-500">Керування даними</p>
      </header>

      {/* Data Management Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Резервне копіювання та Імпорт</h3>
        <p className="text-sm text-gray-500">Ви можете зберегти резервну копію (JSON) або імпортувати книги з таблиць Excel/Google Sheets (CSV).</p>
        
        <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              className="bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-indigo-100 hover:bg-indigo-100"
            >
              <Download size={24} />
              <span className="text-xs">Експорт (JSON)</span>
            </button>

            <button 
              onClick={handleImportClick}
              className="bg-gray-50 text-gray-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100 hover:bg-gray-100"
            >
              <Upload size={24} />
              <span className="text-xs">Імпорт (JSON)</span>
            </button>

            <button 
              onClick={handleCsvImportClick}
              className="col-span-2 bg-emerald-50 text-emerald-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-100 hover:bg-emerald-100"
            >
              <FileSpreadsheet size={24} />
              <span className="text-xs">Імпорт з Excel / CSV</span>
            </button>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
            <input 
                type="file" 
                ref={csvInputRef} 
                onChange={handleCsvChange} 
                accept=".csv" 
                className="hidden" 
            />
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Про додаток</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <ShieldCheck className="text-indigo-600" size={20} />
             <div className="text-sm">
               <p className="font-bold text-gray-800">Локальне збереження</p>
               <p className="text-gray-500 text-xs">Всі дані та обкладинки зберігаються у вашому браузері.</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <CheckCircle2 className="text-emerald-500" size={20} />
             <div className="text-sm">
               <p className="font-bold text-gray-800">BookTracker v1.9</p>
               <p className="text-gray-500 text-xs">Твій розумний помічник для читання</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
