import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ErrorMessage } from '../../../shared/ErrorMessage';
import { Loading } from '../../../shared/Loading';
import { Pagination } from './Pagination';
import { SearchField } from './SearchField';
import { useWebhookList } from './useWebhookList';
import { useWebhookListParams } from './useWebhookListParams';
import { WebhookTable } from './WebhookTable';

export function WebhookListPage() {
  const { page, search, setPage, setSearch } = useWebhookListParams();
  const { data, isError, isPlaceholderData, refetch } = useWebhookList({
    page,
    search,
  });
  const location = useLocation();

  // A URL past the last page (a stale link, or a narrower search) moves to
  // the last page instead of showing an empty table. Placeholder data belongs
  // to the previous params, so it must not drive the decision.
  const lastPage = data?.paging.pages.last;
  useEffect(() => {
    if (isPlaceholderData || lastPage === undefined || page <= lastPage) return;
    setPage(lastPage, { replace: true });
  }, [isPlaceholderData, lastPage, page, setPage]);

  function retry() {
    void refetch();
  }

  function renderContent() {
    if (data === undefined) {
      return isError ? (
        <ErrorMessage message="Could not load webhooks." onRetry={retry} />
      ) : (
        <Loading />
      );
    }

    if (data.data.length === 0) {
      // Empty rows past the last page or in placeholder data belong to params
      // that are about to change; showing "no results" would only flash.
      const isOutOfRange = page > data.paging.pages.last;
      if (isOutOfRange || isPlaceholderData) return <Loading />;
      return (
        <p>{search ? `No webhooks match “${search}”.` : 'No webhooks yet.'}</p>
      );
    }

    return (
      <div aria-busy={isPlaceholderData}>
        {/* A failed background refetch keeps the rows that are already shown. */}
        {isError && (
          <ErrorMessage message="Could not refresh webhooks." onRetry={retry} />
        )}
        {isPlaceholderData && (
          <p role="status" className="updating">
            Updating…
          </p>
        )}
        <div className={isPlaceholderData ? 'list-rows stale' : 'list-rows'}>
          <WebhookTable webhooks={data.data} listSearch={location.search} />
        </div>
        <Pagination
          page={data.paging.pages.current}
          lastPage={data.paging.pages.last}
          total={data.paging.results.total}
          disabled={isPlaceholderData}
          onPageChange={setPage}
        />
      </div>
    );
  }

  return (
    <section>
      <h1>Webhooks</h1>
      <SearchField search={search} onSearch={setSearch} />
      {renderContent()}
    </section>
  );
}
