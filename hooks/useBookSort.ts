
import { useState, useMemo } from 'react';
import { Book, SortKey, SortDirection } from '../types';

export const useBookSort = (
  books: Book[], 
  initialKey: SortKey = 'addedAt', 
  initialDirection: SortDirection = 'desc'
) => {
  const [sortKey, setSortKey] = useState<SortKey>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const sortedBooks = useMemo(() => {
    if (sortKey === 'custom') return books;

    return [...books].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortKey) {
        case 'title':
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case 'author':
          valA = a.author.toLowerCase();
          valB = b.author.toLowerCase();
          break;
        case 'addedAt':
          valA = new Date(a.addedAt).getTime();
          valB = new Date(b.addedAt).getTime();
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (key === 'custom') {
      setSortKey('custom');
      return;
    }
    
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return {
    sortedBooks,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    toggleSort
  };
};
