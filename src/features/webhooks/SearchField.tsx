import { useEffect, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

interface SearchFieldProps {
  /** The search applied in the URL. */
  search: string;
  onSearch: (search: string) => void;
}

export function SearchField({ search, onSearch }: SearchFieldProps) {
  const [draft, setDraft] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);

  // The URL changed (back/forward): show its search in the field. A change
  // committed from the field itself is skipped, otherwise committing "Order"
  // while the user types "Order " would eat the trailing space.
  if (search !== prevSearch) {
    setPrevSearch(search);
    if (search !== draft.trim()) setDraft(search);
  }

  useEffect(() => {
    const nextSearch = draft.trim();
    if (nextSearch === search) return;

    const timer = setTimeout(() => {
      onSearch(nextSearch);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, search, onSearch]);

  return (
    <label className="search-field">
      Search by name
      <input
        type="search"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
    </label>
  );
}
