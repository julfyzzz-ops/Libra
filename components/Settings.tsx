
import React, { useRef, useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Download, FileJson, Upload, FileSpreadsheet, Loader2, Palette, Bug, Trash2, Copy, X } from 'lucide-react';
import { loadSettings, saveSettings, exportLibraryToJSON } from '../services/storageService';
import { importLibraryFromJSON, importLibraryFromCSV } from '../services/importers';
import { clearDebugLogs, getDebugLogs, isDebugModeEnabled, setDebugModeEnabled, type DebugLogEntry } from '../services/debugLogger';
import { ACCENT_COLORS, BACKGROUND_TONES, applyTheme } from '../utils';
import { AccentColor, BackgroundTone, AppSettings } from '../types';
import { useUI } from '../contexts/UIContext';
import { useLibrary } from '../contexts/LibraryContext';

export const Settings: React.FC = () => {
  const { toast, confirm } = useUI();
  const { refreshLibrary } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ accent: 'indigo', bg: 'cool' });
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

  useEffect(() => {
    setSettings(loadSettings());
    setDebugEnabled(isDebugModeEnabled());
  }, []);

  useEffect(() => {
    if (!showDebugLogs) return;
    setDebugLogs(getDebugLogs());
  }, [showDebugLogs, debugEnabled]);

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
    setIsExporting(true);
    try {
      await exportLibraryToJSON();
      toast.show("Експорт успішний", "success");
    } catch (error) {
      console.error('Failed to export library:', error);
      toast.show("Помилка при експорті", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = async () => {
    const isConfirmed = await confirm({
        title: "Замінити бібліотеку?",
        message: "Імпорт JSON повністю замінить вашу поточну бібліотеку. Цю дію неможливо скасувати.",
        confirmText: "Замінити",
        type: "danger"
    });

    if (isConfirmed) {
      fileInputRef.current?.click();
    }
  };

  const handleCsvImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      await importLibraryFromJSON(file);
      await refreshLibrary();
      toast.show("Бібліотеку відновлено!", "success");
    } catch (error) {
      toast.show("Невірний формат файлу", "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const count = await importLibraryFromCSV(file);
      await refreshLibrary();
      toast.show(`Імпортовано ${count} книг`, "success");
    } catch (error: any) {
      console.error(error);
      toast.show("Помилка імпорту CSV", "error");
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleToggleDebugMode = () => {
    const next = !debugEnabled;
    setDebugEnabled(next);
    setDebugModeEnabled(next);
    toast.show(next ? "Debug mode увімкнено" : "Debug mode вимкнено", "info");
  };

  const handleClearDebugLogs = () => {
    clearDebugLogs();
    setDebugLogs([]);
    toast.show("Логи очищено", "success");
  };

  const handleCopyDebugLogs = async () => {
    const logs = getDebugLogs();
    const payload = JSON.stringify(logs, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      toast.show("Логи скопійовано", "success");
    } catch {
      toast.show("Не вдалося скопіювати логи", "error");
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
              disabled={isImporting || isExporting}
              className="bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
              <span className="text-xs">{isExporting ? 'Експорт...' : 'Експорт (JSON)'}</span>
            </button>

            <button 
              onClick={handleImportClick}
              disabled={isImporting || isExporting}
              className="bg-gray-50 text-gray-700 py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-gray-100 hover:bg-gray-100 disabled:opacity-50"
            >
              <Upload size={24} />
              <span className="text-xs">Імпорт (JSON)</span>
            </button>

            <button 
              onClick={handleCsvImportClick}
              disabled={isImporting || isExporting}
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

      {/* Debug Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Bug size={14} /> Debug mode
        </h3>
        <p className="text-sm text-gray-500">Тимчасовий режим діагностики для iPhone. Збирає помилки в локальні логи.</p>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleToggleDebugMode}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${debugEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
          >
            {debugEnabled ? 'Увімкнено' : 'Вимкнено'}
          </button>
          <button
            onClick={() => setShowDebugLogs(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200"
          >
            Відкрити логи
          </button>
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
               <p className="font-bold text-gray-800">Libra v2.0</p>
               <p className="text-gray-500 text-xs">Твій розумний помічник для читання</p>
             </div>
          </div>
        </div>
      </div>

      {showDebugLogs && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Debug логи</h3>
                <p className="text-xs text-gray-500">Кількість записів: {debugLogs.length}</p>
              </div>
              <button onClick={() => setShowDebugLogs(false)} className="p-2 rounded-full bg-gray-50 text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex gap-2 border-b border-gray-100">
              <button onClick={handleCopyDebugLogs} className="px-3 py-2 rounded-xl text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-2">
                <Copy size={14} /> Копіювати
              </button>
              <button onClick={handleClearDebugLogs} className="px-3 py-2 rounded-xl text-xs font-bold border bg-red-50 text-red-700 border-red-200 flex items-center gap-2">
                <Trash2 size={14} /> Очистити
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {debugLogs.length === 0 ? (
                <div className="text-sm text-gray-500">Логи порожні.</div>
              ) : (
                debugLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-3">
                      <div className="text-[10px] text-gray-500">{new Date(log.ts).toLocaleString('uk-UA')} | {log.level} | {log.scope}</div>
                      <div className="text-xs font-semibold text-gray-800 mt-1 break-words">{log.message}</div>
                      {log.details && (
                        <pre className="mt-2 text-[10px] text-gray-600 whitespace-pre-wrap break-words">{log.details}</pre>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
