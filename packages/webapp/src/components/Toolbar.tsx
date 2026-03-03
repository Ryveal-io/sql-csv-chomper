interface ToolbarProps {
  onRun: () => void;
  onOpenFile?: () => void;
  isLoading: boolean;
  fileName: string;
}

export function Toolbar({ onRun, onOpenFile, isLoading, fileName }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {onOpenFile && (
          <button className="toolbar-btn" onClick={onOpenFile}>
            Open File
          </button>
        )}
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
