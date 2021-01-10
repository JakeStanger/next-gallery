import { Column } from 'material-table';

interface ITableProps<RowData extends Object> {
  endpoint: string;
  expands?: string[];
  columns: Column<RowData>[];
  allowAdd: boolean;
  onProcessData?: (id: number, data: RowData) => any;
}

export default ITableProps;
