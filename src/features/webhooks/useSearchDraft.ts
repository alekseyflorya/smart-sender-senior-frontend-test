import { useEffect, useState, type ChangeEvent } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

export interface SearchDraftOptions {
  /** The search applied in the URL. */
  search: string;
  onSearch: (search: string, options: { replace: boolean }) => void;
}

/**
 * What the user types, kept apart from the applied search in the URL:
 * applied after a pause, synced back on back/forward. Returns the props
 * for the search input.
 */
export function useSearchDraft({ search, onSearch }: SearchDraftOptions) {
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

  // A timer in an effect rather than a generic useDebouncedValue(draft): after
  // back/forward, a debounced copy of the old draft would still differ from
  // the new search for 300 ms and apply the old search again. Here the cleanup
  // on [draft, search] cancels a pending commit the moment the URL changes.
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

  return {
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value);
    },
    onBlur: () => {
      setHasPushed(false);
    },
  };
}
