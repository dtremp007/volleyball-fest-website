/* eslint-disable @typescript-eslint/no-unused-vars */
import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    viewDetails?: (id: string) => void;
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
