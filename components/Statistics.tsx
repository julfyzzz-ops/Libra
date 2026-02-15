
import React, { useMemo } from 'react';
import { Book } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface StatisticsProps {
  books: Book[];
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#64748b', '#ef4444', '#8b5cf6'];

export const Statistics: React.FC<StatisticsProps> = ({ books }) => {
  const stats = useMemo(() => {
    const activeBooks = books.filter(b => b.status !== 'Wishlist');
    const total = activeBooks.length;
    const completed = activeBooks.filter(b => b.status === 'Completed').length;
    const reading = activeBooks.filter(b => b.status === 'Reading').length;
    const unread = activeBooks.filter(b => b.status === 'Unread').length;
    
    const formatsList: any[] = ['Paper', 'E-book', 'Audio', 'Pirate', 'Expected', 'Sold'];
    const formatLabels: Record<string, string> = {
      'Paper': 'Паперова',
      'E-book': 'Електронна',
      'Audio': 'Аудіо',
      'Pirate': 'Піратка',
      'Expected': 'Очікується',
      'Sold': 'Продана'
    };

    const formatData = formatsList.map(f => ({
      name: formatLabels[f],
      value: activeBooks.filter(b => b.formats.includes(f)).length
    })).filter(f => f.value > 0);
    
    const completedByFormat = formatsList.map(f => {
      const name = formatLabels[f];
      const completedCount = activeBooks.filter(b => b.formats.includes(f) && b.status === 'Completed').length;
      const totalCount = activeBooks.filter(b => b.formats.includes(f)).length;
      return { name, completed: completedCount, total: totalCount };
    }).filter(f => f.total > 0);

    return { total, completed, reading, unread, formatData, completedByFormat };
  }, [books]);

  return (
    <div className="p-4 space-y-8 pb-24">
      <header>
        <h1 className="text-3xl font-bold text-gray-800">Статистика</h1>
        <p className="text-gray-500">Ваш прогрес у світі книг</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-indigo-600">{stats.total}</span>
          <span className="text-sm text-gray-500 font-medium text-center leading-tight">Всього в бібліотеці</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-emerald-500">{stats.completed}</span>
          <span className="text-sm text-gray-500 font-medium">Прочитано</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-amber-500">{stats.unread}</span>
          <span className="text-sm text-gray-500 font-medium">Не прочитано</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-indigo-400">{stats.reading}</span>
          <span className="text-sm text-gray-500 font-medium">В процесі</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 text-gray-700">Розподіл за форматами</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.formatData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.formatData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 text-gray-700">Ефективність за форматами</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.completedByFormat}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#6366f1" radius={[10, 10, 0, 0]} name="Прочитано" />
              <Bar dataKey="total" fill="#e2e8f0" radius={[10, 10, 0, 0]} name="Загалом" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
