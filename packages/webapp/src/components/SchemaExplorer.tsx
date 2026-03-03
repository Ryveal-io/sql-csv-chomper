import { useState } from 'react';
import type { TableInfo } from '../types/query';

interface SchemaExplorerProps {
  tables: TableInfo[];
  activeTable: string | null;
  onSelectTable: (tableName: string) => void;
  onOpenFile?: () => void;
}

export function SchemaExplorer({ tables, activeTable, onSelectTable, onOpenFile }: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleExpanded = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  return (
    <div className="schema-panel">
      <div className="schema-header">
        <span>Tables</span>
        {onOpenFile && (
          <button className="schema-open-btn" onClick={onOpenFile} title="Open file">+</button>
        )}
      </div>
      {tables.length === 0 ? (
        <div className="schema-empty">
          {onOpenFile ? 'Open a CSV file to get started' : 'No table loaded'}
        </div>
      ) : (
        <div className="schema-tree">
          {tables.map(table => {
            const isExpanded = expandedTables.has(table.name);
            const isActive = table.name === activeTable;
            return (
              <div key={table.name} className="schema-table-entry">
                <div
                  className={`schema-table-row${isActive ? ' schema-table-active' : ''}`}
                  onClick={() => onSelectTable(table.name)}
                >
                  <span
                    className="schema-toggle"
                    onClick={(e) => { e.stopPropagation(); toggleExpanded(table.name); }}
                  >
                    {isExpanded ? '\u25BC' : '\u25B6'}
                  </span>
                  <span className="schema-table-label">{table.name}</span>
                  {table.fileName !== table.name && (
                    <span className="schema-table-file" title={table.fileName}>
                      {table.fileName}
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <ul className="schema-columns">
                    {table.columns.map(col => (
                      <li key={col.name} className="schema-column">
                        <span className="schema-column-name">{col.name}</span>
                        <span className="schema-column-type">{col.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
