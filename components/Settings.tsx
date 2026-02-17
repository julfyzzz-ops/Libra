
import React, { useRef, useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Download, FileJson, Upload, FileSpreadsheet, Loader2, Palette } from 'lucide-react';
import { loadLibrary, importLibraryFromJSON, importLibraryFromCSV, loadSettings, saveSettings } from '../services/storageService';
import { ACCENT_COLORS, BACKGROUND_TONES, applyTheme } from '../utils';
import { AccentColor, BackgroundTone, AppSettings } from '../types';

export const Settings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ accent: 'indigo', bg: 'cool' });

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateAccent = (color: AccentColor) => {
    const newSettings = { ...settings, accent: color };
    setSettings(newSettings);
    saveSettings(newSettings);
    applyTheme(newSettings.accent, newSettings.bg);
  };

  const updateBg = (tone: BackgroundTone) => {
    const newSettings = { ...settings, bg: tone };
    setSettings(newSettings);
    saveSettings(newSettings);
    applyTheme(newSettings.accent, newSettings.bg);
  };

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

    setIsImporting(true);
    try {
      const count = await importLibraryFromCSV(file);
      alert(`Успішно імпортовано ${count} книг! Обкладинки знайдено через Google Books.`);
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Помилка імпорту CSV. Перевірте формат файлу (потрібні колонки: Назва, Автор).");
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 text-gray-800">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Налаштування</h1>
        <p className="text-gray-500">Керування даними та вигляд</p>
      </header>

      {/* Interface Settings */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Palette size={14} /> Вигляд інтерфейсу
         </h3>
         
         <div className="space-y-3">
             <label className="text-sm font-bold text-gray-700">Акцентний колір</label>
             <div className="flex flex-wrap gap-3">
                 {Object.entries(ACCENT_COLORS).map(([key, val]) => (
                     <button 
                        key={key}
                        onClick={() => updateAccent(key as AccentColor)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.accent === key ? 'ring-4 ring-gray-200 scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: val.hex }}
                        title={val.label}
                     >
                        {settings.accent === key && <CheckCircle2 size={20} className="text-white drop-shadow-md" />}
                     </button>
                 ))}
             </div>
         </div>

         <div className="space-y-3 pt-2">
             <label className="text-sm font-bold text-gray-700">Тон фону</label>
             <div className="grid grid-cols-3 gap-2">
                 {Object.entries(BACKGROUND_TONES).map(([key, val]) => (
                     <button 
                        key={key}
                        onClick={() => updateBg(key as BackgroundTone)}
                        className={`h-12 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${settings.bg === key ? 'border-indigo-500 ring-1 ring-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}
                        style={{ backgroundColor: val.vars.card }}
                     >
                        {val.label}
                     </button>
                 ))}
             </div>
         </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Резервне копіювання та Імпорт</h3>
        <p className="text-sm text-gray-500">Ви можете зберегти резервну копію (JSON) або імпортувати книги з таблиць Excel/Google Sheets (CSV).</p>
        
        <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              disabled={isImporting}
              className="bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Download size={24} />
              <span className="text-xs">Експорт (JSON)</span>
            </button>

            <button 
              onClick={handleImportClick}
              disabled={isImporting}
              className="bg-gray-50 text-gray-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100 hover:bg-gray-100 disabled:opacity-50"
            >
              <Upload size={24} />
              <span className="text-xs">Імпорт (JSON)</span>
            </button>

            <button 
              onClick={handleCsvImportClick}
              disabled={isImporting}
              className="col-span-2 bg-emerald-50 text-emerald-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
              <span className="text-xs">{isImporting ? 'Завантаження обкладинок...' : 'Імпорт з Excel / CSV'}</span>
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
               <p className="font-bold text-gray-800">BookTracker v2.0</p>
               <p className="text-gray-500 text-xs">Твій розумний помічник для читання</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
