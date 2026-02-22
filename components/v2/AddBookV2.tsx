import React from 'react';
import { Book, BookStatus } from '../../types';
import { createClientId } from '../../services/id';
import { BookFormV2 } from './BookFormV2';

interface AddBookV2Props {
  publisherSuggestions: string[];
  genreSuggestions: string[];
  onAdd: (book: Book) => void;
  onCancel: () => void;
}

export const AddBookV2: React.FC<AddBookV2Props> = ({
  publisherSuggestions,
  genreSuggestions,
  onAdd,
  onCancel,
}) => {
  return (
    <BookFormV2
      title="Add Book (V2)"
      submitLabel="Add book"
      initialValue={{
        status: 'Unread',
        formats: ['Paper'],
        seasons: [],
      }}
      publisherSuggestions={publisherSuggestions}
      genreSuggestions={genreSuggestions}
      allowedStatuses={['Unread', 'Reading', 'Completed', 'Wishlist']}
      onCancel={onCancel}
      onSubmit={(value) => {
        const nowIso = new Date().toISOString();
        const status = (value.status || 'Unread') as BookStatus;
        const pagesTotal = Math.max(0, Number(value.pagesTotal) || 0);
        const isCompleted = status === 'Completed';
        const isReading = status === 'Reading';
        const book: Book = {
          id: createClientId(),
          title: value.title || '',
          author: value.author || '',
          formats: value.formats || ['Paper'],
          status,
          isbn: value.isbn || '',
          genre: value.genre || '',
          seasons: value.seasons || [],
          publisher: value.publisher || '',
          series: value.series || '',
          seriesPart: value.seriesPart || '',
          coverUrl: value.coverUrl || '',
          pagesTotal,
          pagesRead: isCompleted ? pagesTotal : 0,
          notes: value.notes || '',
          comment: value.comment || '',
          addedAt: nowIso,
          readingStartedAt: isReading || isCompleted ? nowIso : undefined,
          completedAt: isCompleted ? nowIso : undefined,
          sessions: [],
        };
        onAdd(book);
      }}
    />
  );
};

