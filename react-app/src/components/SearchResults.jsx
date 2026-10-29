import PropTypes from 'prop-types';

export default function SearchResults({ results, onSelectResult, label, pagination, onPageChange }) {
  if (results === null) return null;

  if (results.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-400 text-center py-8 text-sm">No results found</p>
      </div>
    );
  }

  const heading = label ?? `${results.length} ${results.length === 1 ? 'result' : 'results'}`;
  const { page, totalPages, total, pageSize } = pagination ?? {};
  const hasPagination = totalPages > 1;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">{heading}</h3>
        {hasPagination && (
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} total
          </span>
        )}
      </div>

      <ul className="grid gap-2" role="list">
        {results.map((item) => (
          <li key={item.id}>
            <button
              className="w-full text-left p-4 border border-gray-200 bg-white rounded-xl hover:border-primary-600 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4"
              onClick={() => onSelectResult(item.id)}
            >
              <span className="text-2xl flex-shrink-0">
                {item.type === 'folder' ? '📁' : '📄'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 mb-1">{item.name}</div>
                <div className="text-xs text-gray-400 truncate">{item.path}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {hasPagination && (
        <div className="mt-5 flex items-center justify-center gap-1" role="navigation" aria-label="Search result pages">
          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
          >
            «
          </button>
          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                className={`min-w-[2rem] rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  p === page
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-700'
                }`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}

          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next ›
          </button>
          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

SearchResults.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id:   PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['file', 'folder']).isRequired,
      path: PropTypes.string.isRequired,
    })
  ),
  onSelectResult: PropTypes.func.isRequired,
  label:          PropTypes.string,
  pagination: PropTypes.shape({
    page:       PropTypes.number,
    totalPages: PropTypes.number,
    total:      PropTypes.number,
    pageSize:   PropTypes.number,
  }),
  onPageChange: PropTypes.func,
};

SearchResults.defaultProps = {
  results:     null,
  label:       undefined,
  pagination:  null,
  onPageChange: () => {},
};
