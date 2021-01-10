import { useCallback } from 'react';
import { Query, QueryResult } from 'material-table';

function useFetchMany<T extends Object>(endpoint: string, expands?: string[]) {
  return useCallback(
    async (query: Query<T>): Promise<QueryResult<T>> => {
      const params = new URLSearchParams();
      params.append('$top', query.pageSize.toString());
      params.append('$skip', (query.page * query.pageSize).toString());

      if (query.orderBy?.field) {
        params.append(
          '$orderBy',
          `${query.orderBy.field} ${query.orderDirection}`
        );
      }

      if (query.search) {
        params.append('$search', query.search);
      }

      if (query.filters) {
        const filterStrings: string[] = [];
        query.filters
          .filter((filter) => filter.value?.length)
          .forEach((filter) => {
            filterStrings.push(`${filter.column.field} eq ${filter.value}`);
          });

        const filterString = filterStrings.join(' and ');
        if (filterString.length) {
          params.append('$filter', filterString);
        }
      }

      if(expands) {
        params.append('$expand', expands.join(','));
      }

      const items: { data: T[]; total: number } = await fetch(
        `/api/${endpoint}?${params.toString()}`
      ).then((r) => r.json());

      return {
        data: items.data,
        page: query.page,
        totalCount: items.total,
      };
    },
    [endpoint, expands]
  );
}

export default useFetchMany;
