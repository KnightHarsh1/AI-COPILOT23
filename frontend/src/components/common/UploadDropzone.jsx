import { useRef, useState } from 'react';

const DEFAULT_ACCEPTED_TYPES = ['.csv', '.xlsx'];

function UploadDropzone({
  onFilesSelected,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  multiple = true,
  helperText,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files) => {
    if (!files?.length) return;
    onFilesSelected(Array.from(files));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`group relative rounded-card border-2 border-dashed p-10 text-center transition ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-surface'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={(event) => handleFiles(event.target.files)}
        />

        <div className="pointer-events-none space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink">Drag and drop files here</p>
            <p className="mt-2 text-sm text-ink-muted">
              {helperText || `Supported formats: ${acceptedTypes.join(', ')}. Max size per file is 10 MB.`}
            </p>
          </div>
          <button
            type="button"
            className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
          >
            Browse files
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDropzone;
