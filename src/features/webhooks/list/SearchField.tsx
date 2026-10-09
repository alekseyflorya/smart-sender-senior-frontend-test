import { useSearchDraft, type SearchDraftOptions } from './useSearchDraft';

export function SearchField({ search, onSearch }: SearchDraftOptions) {
  const inputProps = useSearchDraft({ search, onSearch });

  return (
    <label className="search-field">
      Search by name
      <input type="search" {...inputProps} />
    </label>
  );
}
