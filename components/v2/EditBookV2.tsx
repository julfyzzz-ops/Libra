import React from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Book } from '../../types';
import { BookFormV2 } from './BookFormV2';

interface EditBookV2Props {
  book: Book;
  publisherSuggestions: string[];
  genreSuggestions: string[];
  onSave: (book: Book) => void;
  onCancel: () => void;
}

export const EditBookV2: React.FC<EditBookV2Props> = ({
  book,
  publisherSuggestions,
  genreSuggestions,
  onSave,
  onCancel,
}) => {
  const { t } = useI18n();

  return (
    <BookFormV2
      title={t('bookForm.editBookTitle')}
      submitLabel={t('bookForm.saveSubmit')}
      initialValue={book}
      publisherSuggestions={publisherSuggestions}
      genreSuggestions={genreSuggestions}
      allowedStatuses={['Unread', 'Reading', 'Completed', 'Wishlist']}
      onCancel={onCancel}
      onSubmit={(value) => {
        const merged: Book = {
          ...book,
          ...value,
          id: book.id,
          addedAt: book.addedAt,
          sessions: value.sessions || book.sessions || [],
          updatedAt: new Date().toISOString(),
        };
        onSave(merged);
      }}
    />
  );
};
