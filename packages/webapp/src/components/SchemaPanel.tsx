import type { QueryColumn } from '../types/query';

interface SchemaPanelProps {
  columns: QueryColumn[];
  tableName: string;
}

export function SchemaPanel({ columns, tableName }: SchemaPanelProps) {
  if (columns.length === 0) {
    return (
      <div className="schema-panel">
        <div className="schema-empty">No table loaded</div>
      </div>
    );
  }

  return (
    <div className="schema-panel">
      <div className="schema-header">Schema</div>
      <div className="schema-table">
        <div className="schema-table-name">{tableName}</div>
        <ul className="schema-columns">
          {columns.map((col) => (
            <li key={col.name} className="schema-column">
              <span className="schema-column-name">{col.name}</span>
              <span className="schema-column-type">{col.type}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
