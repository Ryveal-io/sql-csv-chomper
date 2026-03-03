import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState, useCallback } from 'react';
import type { QueryResult, QueryColumn } from '../types/query';
import { CellContextMenu, type SelectedCell } from './CellContextMenu';

interface CellId {
  rowIndex: number;
  columnName: string;
}

interface ContextMenuState {
  x: number;
  y: number;
}

interface ResultsTableProps {
  result: QueryResult | null;
  error: string | null;
  isLoading: boolean;
  columnTypes?: QueryColumn[];
  onFilter?: (filterClause: string) => void;
}

function cellKey(rowIndex: number, columnName: string): string {
  return `${rowIndex}:${columnName}`;
}

export function ResultsTable({ result, error, isLoading, columnTypes, onFilter }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCells, setSelectedCells] = useState<Map<string, CellId>>(new Map());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Build a map of column name → type for quick lookup
  const typeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (columnTypes) {
      for (const col of columnTypes) {
        map.set(col.name, col.type);
      }
    }
    if (result) {
      for (const col of result.columns) {
        if (!map.has(col.name)) map.set(col.name, col.type);
      }
    }
    return map;
  }, [columnTypes, result?.columns]);

  const handleCellClick = useCallback(
    (e: React.MouseEvent, rowIndex: number, columnName: string) => {
      const key = cellKey(rowIndex, columnName);

      if (e.metaKey || e.ctrlKey) {
        // Toggle this cell in the selection
        setSelectedCells((prev) => {
          const next = new Map(prev);
          if (next.has(key)) {
            next.delete(key);
          } else {
            next.set(key, { rowIndex, columnName });
          }
          return next;
        });
      } else {
        // Single click — select just this cell
        setSelectedCells(new Map([[key, { rowIndex, columnName }]]));
      }
      // Close any open context menu on click
      setContextMenu(null);
    },
    []
  );

  const handleCellContextMenu = useCallback(
    (e: React.MouseEvent, rowIndex: number, columnName: string) => {
      e.preventDefault();
      const key = cellKey(rowIndex, columnName);

      // If right-clicking on an unselected cell, select just that cell
      setSelectedCells((prev) => {
        if (prev.has(key)) return prev;
        return new Map([[key, { rowIndex, columnName }]]);
      });

      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // Build SelectedCell[] for the context menu from current selection + data
  const selectedCellData = useMemo((): SelectedCell[] => {
    if (!result) return [];
    return Array.from(selectedCells.values()).map(({ rowIndex, columnName }) => {
      const row = result.rows[rowIndex];
      return {
        columnName,
        columnType: typeMap.get(columnName) ?? 'VARCHAR',
        value: row ? row[columnName] : null,
      };
    });
  }, [selectedCells, result, typeMap]);

  const handleFilter = useCallback(
    (clause: string) => {
      onFilter?.(clause);
      setContextMenu(null);
      setSelectedCells(new Map());
    },
    [onFilter]
  );

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!result) return [];
    return result.columns.map((col) => ({
      accessorKey: col.name,
      header: () => (
        <span title={col.type}>{col.name}</span>
      ),
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined) return <span className="null-value">NULL</span>;
        return String(val);
      },
    }));
  }, [result?.columns]);

  const table = useReactTable({
    data: result?.rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 100 },
    },
  });

  // Clear selection when results change
  const resultId = result?.rowCount;
  useMemo(() => {
    setSelectedCells(new Map());
    setContextMenu(null);
  }, [resultId]);

  if (isLoading) {
    return <div className="results-message">Loading...</div>;
  }

  if (error) {
    return <div className="results-error">{error}</div>;
  }

  if (!result) {
    return <div className="results-message">Run a query to see results</div>;
  }

  return (
    <div className="results-container">
      <div className="table-wrapper">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                <th className="row-number-header">#</th>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getIsSorted() ? 'sorted' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' \u25B2', desc: ' \u25BC' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              // Map sorted row back to original index for selection tracking
              const originalIndex = result.rows.indexOf(row.original);
              return (
                <tr key={row.id}>
                  <td className="row-number">
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1}
                  </td>
                  {row.getVisibleCells().map((cell) => {
                    const colName = cell.column.id;
                    const isSelected = selectedCells.has(cellKey(originalIndex, colName));
                    return (
                      <td
                        key={cell.id}
                        className={isSelected ? 'cell-selected' : ''}
                        onClick={(e) => handleCellClick(e, originalIndex, colName)}
                        onContextMenu={(e) => handleCellContextMenu(e, originalIndex, colName)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="pagination">
          <button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
            &laquo;
          </button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            &lsaquo; Prev
          </button>
          <span className="pagination-info">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next &rsaquo;
          </button>
          <button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
            &raquo;
          </button>
        </div>
      )}
      {contextMenu && selectedCellData.length > 0 && (
        <CellContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCells={selectedCellData}
          onFilter={handleFilter}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
