interface PaginationProps {
  page: number;
  lastPage: number;
  total: number;
  /** Set while placeholder data is shown, so buttons never act on stale paging. */
  disabled: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  lastPage,
  total,
  disabled,
  onPageChange,
}: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="pagination">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        Previous
      </button>
      <span>
        Page {page} of {lastPage} · {total} results
      </span>
      <button
        type="button"
        disabled={disabled || page >= lastPage}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        Next
      </button>
    </nav>
  );
}
