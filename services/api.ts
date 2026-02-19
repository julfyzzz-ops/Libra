
const searchGoogleBooks = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
    if (!response.ok) return null;
    const data = await response.json();
    const book = data.items?.[0];
    const imageLinks = book?.volumeInfo?.imageLinks;
    let url = imageLinks?.thumbnail || imageLinks?.smallThumbnail;
    if (url) {
      return url.replace('http://', 'https://');
    }
    return null;
  } catch (e) {
    return null;
  }
};

const searchOpenLibrary = async (title: string, author: string): Promise<string | null> => {
  try {
    const query = `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`;
    const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    const doc = data.docs?.[0];
    if (doc && doc.cover_i) {
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const searchITunes = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=ebook&entity=ebook&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      let url = data.results[0].artworkUrl100;
      if (url) {
        return url.replace('100x100', '600x600');
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const fetchBookCover = async (title: string, author: string, isbn?: string): Promise<string> => {
  const cleanTitle = title.trim();
  const cleanAuthor = author === 'Невідомий автор' ? '' : author.trim();
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';
  
  if (cleanIsbn) {
      const cover = await searchGoogleBooks(`isbn:${cleanIsbn}`);
      if (cover) return cover;
  }

  const combinedQuery = `${cleanTitle} ${cleanAuthor}`.trim();
  if (!combinedQuery) return '';

  let cover = await searchGoogleBooks(combinedQuery);
  if (cover) return cover;

  if (cleanTitle) {
      cover = await searchOpenLibrary(cleanTitle, cleanAuthor);
      if (cover) return cover;
  }

  cover = await searchITunes(combinedQuery);
  if (cover) return cover;
  
  if (cleanAuthor) {
      cover = await searchGoogleBooks(cleanTitle);
      if (cover) return cover;
  }

  return '';
};
