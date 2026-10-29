import { useEffect } from 'react';

const PAGE_SIZE = 5;
const SORT_BY = 'name';

export function useSearch({
  searchQuery,
  searchFilter,
  searchSortOrder,
  searchPage,
  setSearchPage,
  setSearchResponse,
  actions,
  tree,
}) {
  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    const hasFilter = searchFilter !== 'all';

    if (!hasQuery && !hasFilter) {
      setSearchResponse(null);
      return;
    }

    const response = actions.search(searchQuery, {
      type: searchFilter,
      sortBy: SORT_BY,
      sortOrder: searchSortOrder,
      page: searchPage,
      pageSize: PAGE_SIZE,
    });

    setSearchResponse(response ?? null);
  }, [searchQuery, searchFilter, searchSortOrder, searchPage, actions, tree]);

  useEffect(() => {
    setSearchPage(1);
  }, [searchQuery, searchFilter, searchSortOrder]);
}
