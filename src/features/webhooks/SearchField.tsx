import { useEffect, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

interface SearchFieldProps {
  /** The search applied in the URL. */
  search: string;
  onSearch: (search: string, options: { replace: boolean }) => void;
}

export function SearchField({ search, onSearch }: SearchFieldProps) {
  const [draft, setDraft] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);
  // Whether this typing session has already added a history entry. The first
  // applied search pushes, later ones replace it, so "back" returns to the
  // list before the search instead of stepping through "o", "or", "ord"...
  // A session ends on blur or when the URL changes from outside.
  const [hasPushed, setHasPushed] = useState(false);

  // The URL changed (back/forward): show its search in the field. A change
  // committed from the field itself is skipped, otherwise committing "Order"
  // while the user types "Order " would eat the trailing space.
  if (search !== prevSearch) {
    setPrevSearch(search);
    if (search !== draft.trim()) {
      setDraft(search);
      setHasPushed(false);
    }
  }

  useEffect(() => {
    const nextSearch = draft.trim();
    if (nextSearch === search) return;

    const timer = setTimeout(() => {
      onSearch(nextSearch, { replace: hasPushed });
      setHasPushed(true);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft, search, hasPushed, onSearch]);

  return (
    <label className="search-field">
      Search by name
      <input
        type="search"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={() => {
          setHasPushed(false);
        }}
      />
    </label>
  );
}
