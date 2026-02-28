/* eslint-disable @typescript-eslint/no-unused-vars */
import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    viewDetails?: (id: string) => void;
    updateSetScore?: (
      params: {
        matchupId: string;
        teamId: string;
        set: number;
        points: number;
      },
    ) => Promise<boolean>;
    seasonId?: string;
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
