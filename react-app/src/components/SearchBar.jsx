import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function SearchBar({
  onSearch,
  onFilterChange,
  onSortChange,
  filter,
  sortOrder,
  externalQuery = '',
}) {
  const [query, setQuery] = useState(externalQuery);

  useEffect(() => {
    setQuery(externalQuery);
  }, [externalQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const isSearchActive = query.trim().length > 0 || filter !== 'all';

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex min-w-0 flex-1 items-center">
          <span className="absolute left-4 text-gray-400 text-lg pointer-events-none">🔍</span>
          <input
            type="text"
            className="w-full rounded-lg border-2 border-gray-200 bg-white py-2.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all focus:border-primary-600 focus:ring-4 focus:ring-primary-100 sm:rounded-xl sm:py-3"
            placeholder="Search files and folders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          {query && (
            <button
              className="absolute right-2 p-1 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900 text-xl"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {isSearchActive && (
          <button
            className="shrink-0 flex items-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 sm:py-3"
            onClick={() => onSortChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            title="Toggle sort order"
          >
            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        )}

        <div
          className="shrink-0 flex gap-1 rounded-lg border-2 border-gray-200 bg-white p-1 sm:rounded-xl"
          role="group"
          aria-label="Filter by type"
        >
          {[
            { value: 'all',    label: 'All'     },
            { value: 'file',   label: 'Files'   },
            { value: 'folder', label: 'Folders' },
          ].map(({ value, label }) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-all sm:rounded-lg sm:px-4 ${
                filter === value
                  ? 'bg-gradient-to-r from-primary-800 to-primary-700 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

SearchBar.propTypes = {
  onSearch:       PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onSortChange:   PropTypes.func.isRequired,
  filter:         PropTypes.oneOf(['all', 'file', 'folder']).isRequired,
  sortOrder:      PropTypes.oneOf(['asc', 'desc']).isRequired,
  externalQuery:  PropTypes.string,
};

SearchBar.defaultProps = {
  externalQuery: '',
};
