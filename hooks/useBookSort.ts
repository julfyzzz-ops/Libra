
import { useMemo } from 'react';
import { Book, SortKey, SortDirection } from '../types';

export const useBookSort = (
  books: Book[], 
  activeKey: SortKey, 
  activeDirection: SortDirection
) => {
  const sortedBooks = useMemo(() => {
    if (activeKey === 'custom') return books;

    return [...books].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (activeKey) {
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

      if (valA < valB) return activeDirection === 'asc' ? -1 : 1;
      if (valA > valB) return activeDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, activeKey, activeDirection]);

  return { sortedBooks };
};
