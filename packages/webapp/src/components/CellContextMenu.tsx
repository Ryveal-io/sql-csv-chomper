import { useEffect, useRef } from 'react';

export interface SelectedCell {
  columnName: string;
  columnType: string;
  value: unknown;
}

interface CellContextMenuProps {
  x: number;
  y: number;
  selectedCells: SelectedCell[];
  onFilter: (filterClause: string) => void;
  onClose: () => void;
}

function isNumericType(type: string): boolean {
  const t = type.toUpperCase();
  return /INT|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|BIGINT|SMALLINT|TINYINT|HUGEINT/.test(t);
}

function isStringType(type: string): boolean {
  const t = type.toUpperCase();
  return /VARCHAR|TEXT|STRING|CHAR|BLOB/.test(t);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  return String(value);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function sqlLiteral(value: unknown, columnType: string): string {
  if (value === null || value === undefined) return 'NULL';
  if (isNumericType(columnType)) return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

interface MenuItem {
  label: string;
  clause: string;
}

function getSingleCellMenuItems(columnName: string, columnType: string, cellValue: unknown): MenuItem[] {
  const items: MenuItem[] = [];
  const isNull = cellValue === null || cellValue === undefined;
  const displayVal = truncate(formatValue(cellValue), 30);
  const col = `"${columnName}"`;

  if (!isNull) {
    const lit = sqlLiteral(cellValue, columnType);

    items.push(
      { label: `Include: ${col} = ${displayVal}`, clause: `${col} = ${lit}` },
      { label: `Exclude: ${col} != ${displayVal}`, clause: `${col} != ${lit}` },
    );

    if (isStringType(columnType)) {
      const escaped = String(cellValue).replace(/'/g, "''");
      items.push(
        { label: `Starts with: ${truncate(String(cellValue), 20)}`, clause: `${col} LIKE '${escaped}%'` },
        { label: `Contains: ${truncate(String(cellValue), 20)}`, clause: `${col} LIKE '%${escaped}%'` },
        { label: `Contains (case-insensitive)`, clause: `${col} ILIKE '%${escaped}%'` },
      );
    }

    if (isNumericType(columnType)) {
      items.push(
        { label: `Greater than ${displayVal}`, clause: `${col} > ${cellValue}` },
        { label: `Less than ${displayVal}`, clause: `${col} < ${cellValue}` },
      );
    }
  }

  items.push(
    { label: `${col} IS NULL`, clause: `${col} IS NULL` },
    { label: `${col} IS NOT NULL`, clause: `${col} IS NOT NULL` },
  );

  return items;
}

function getMultiCellMenuItems(cells: SelectedCell[]): MenuItem[] {
  // Group by column
  const byColumn = new Map<string, SelectedCell[]>();
  for (const cell of cells) {
    const existing = byColumn.get(cell.columnName) ?? [];
    existing.push(cell);
    byColumn.set(cell.columnName, existing);
  }

  const items: MenuItem[] = [];

  for (const [columnName, columnCells] of byColumn) {
    const col = `"${columnName}"`;
    const colType = columnCells[0].columnType;
    const nonNullCells = columnCells.filter(c => c.value !== null && c.value !== undefined);
    const hasNulls = columnCells.some(c => c.value === null || c.value === undefined);

    // Deduplicate values
    const seen = new Set<string>();
    const uniqueNonNull = nonNullCells.filter(c => {
      const key = String(c.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueNonNull.length > 0) {
      const literals = uniqueNonNull.map(c => sqlLiteral(c.value, colType));
      const displayVals = uniqueNonNull.map(c => truncate(formatValue(c.value), 15)).join(', ');

      let inClause = `${col} IN (${literals.join(', ')})`;
      let notInClause = `${col} NOT IN (${literals.join(', ')})`;
      if (hasNulls) {
        inClause = `(${inClause} OR ${col} IS NULL)`;
        notInClause = `(${notInClause} AND ${col} IS NOT NULL)`;
      }

      const prefix = byColumn.size > 1 ? `${columnName}: ` : '';
      items.push(
        { label: `${prefix}Include IN (${truncate(displayVals, 40)})`, clause: inClause },
        { label: `${prefix}Exclude NOT IN (${truncate(displayVals, 40)})`, clause: notInClause },
      );
    } else if (hasNulls) {
      items.push(
        { label: `${col} IS NULL`, clause: `${col} IS NULL` },
        { label: `${col} IS NOT NULL`, clause: `${col} IS NOT NULL` },
      );
    }
  }

  return items;
}

export function CellContextMenu({
  x, y, selectedCells, onFilter, onClose,
}: CellContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;
    if (rect.right > window.innerWidth) {
      el.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const isSingle = selectedCells.length === 1;
  const items = isSingle
    ? getSingleCellMenuItems(selectedCells[0].columnName, selectedCells[0].columnType, selectedCells[0].value)
    : getMultiCellMenuItems(selectedCells);

  const headerText = isSingle
    ? `Filter: ${selectedCells[0].columnName}`
    : `Filter: ${selectedCells.length} cells selected`;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <div className="context-menu-header">
        {headerText}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          className="context-menu-item"
          onClick={() => {
            onFilter(item.clause);
            onClose();
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
