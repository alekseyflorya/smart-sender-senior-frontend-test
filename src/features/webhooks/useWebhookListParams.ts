import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { FIRST_PAGE, parseListParams, toSearchParams } from './listParams';

/**
 * Page and search live only in the URL, so reload and back/forward restore
 * them for free. Every change is a new history entry unless asked otherwise.
 */
export function useWebhookListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, search } = parseListParams(searchParams);

  // Rendering already uses the normalized values; this only fixes the
  // address bar (e.g. ?page=abc → no page), without a history entry.
  const canonical = toSearchParams({ page, search }).toString();
  const isCanonical = canonical === searchParams.toString();
  useEffect(() => {
    if (!isCanonical) setSearchParams(canonical, { replace: true });
  }, [isCanonical, canonical, setSearchParams]);

  const setPage = useCallback(
    (nextPage: number, options?: { replace?: boolean }) => {
      setSearchParams(toSearchParams({ page: nextPage, search }), options);
    },
    [search, setSearchParams],
  );

  // A new search starts from the first page.
  const setSearch = useCallback(
    (nextSearch: string) => {
      setSearchParams(toSearchParams({ page: FIRST_PAGE, search: nextSearch }));
    },
    [setSearchParams],
  );

  return { page, search, setPage, setSearch };
}
