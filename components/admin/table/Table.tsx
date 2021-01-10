import React, { useCallback } from 'react';
import ITableProps from './ITableProps';
import MaterialTable from 'material-table';
import useFetchMany from './useFetchMany';
import { omitBy } from 'lodash';

const Table: React.FC<ITableProps<any>> = <
  RowData extends { id: number; [key: string]: any }
>({
  endpoint,
  columns,
  allowAdd,
  expands,
  onProcessData,
}: ITableProps<RowData>) => {
  const fetchData = useFetchMany<RowData>(endpoint, expands);

  const onRowAdd = useCallback(
    (newData: RowData) => {
      const data = onProcessData ? onProcessData(newData.id, newData) : newData;

      return fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    [endpoint]
  );

  const onRowUpdate = useCallback(
    (newData: RowData, oldData?: RowData) => {
      const diff = oldData
        ? omitBy(newData, (v, k) => v === oldData[k])
        : newData;

      const data = onProcessData
        ? onProcessData(oldData?.id ?? newData.id, diff as RowData)
        : diff;

      return fetch(`/api/${endpoint}/` + newData.id, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    [endpoint]
  );

  const onRowDelete = useCallback(
    (oldData: RowData) => {
      return fetch(`/api/${endpoint}/` + oldData.id, {
        method: 'DELETE',
      });
    },
    [endpoint]
  );

  const onChangePage = useCallback(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // turn filtering off by default
  const fullColumns = columns.map((c) => ({
    ...c,
    filtering: c.filtering ?? false,
  }));

  return (
    <MaterialTable
      title={''}
      options={{ pageSize: 10, filtering: true }}
      columns={fullColumns}
      data={fetchData}
      components={{ Container: ({ children }) => <div>{children}</div> }}
      editable={{
        onRowAdd: allowAdd ? onRowAdd : undefined,
        onRowUpdate,
        onRowDelete,
      }}
      onChangePage={onChangePage}
    />
  );
};

export default Table;
