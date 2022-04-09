import type { Column } from '@material-table/core';

interface ITableProps<RowData extends Object> {
  endpoint: string;
  expands?: string[];
  columns: Column<RowData>[];
  allowAdd: boolean;
  onProcessData?: (id: number, data: RowData) => any;
}

export default ITableProps;
