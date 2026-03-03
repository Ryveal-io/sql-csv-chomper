interface ToolbarProps {
  onRun: () => void;
  isLoading: boolean;
  fileName: string;
}

export function Toolbar({ onRun, isLoading, fileName }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn toolbar-btn-primary" onClick={onRun} disabled={isLoading}>
          Run (Ctrl+Enter)
        </button>
      </div>
      <div className="toolbar-right">
        {fileName && <span className="toolbar-filename">{fileName}</span>}
      </div>
    </div>
  );
}
