import React, { useCallback, useState } from 'react';

export interface ImageUploaderProps {
  label: string;
  category?: 'foreground' | 'background' | 'template' | 'logo' | 'gallery';
  onUpload?: (file: File, optimize: boolean) => void;
  currentImage?: string;
  className?: string;
}

export function ImageUploader({
  label,
  category = 'gallery',
  onUpload,
  currentImage,
  className = '',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [optimize, onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [optimize, onUpload]
  );

  function processFile(file: File) {
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return; // 10MB max
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload?.(file, optimize);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-white font-medium text-sm">{label}</label>

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-amber-400 bg-amber-900/20'
            : 'border-gray-600 hover:border-amber-500 bg-gray-800/50'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <div className="space-y-2">
            <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-sm">
              Drag &amp; drop or <span className="text-amber-400 underline">browse</span>
            </p>
            <p className="text-gray-500 text-xs">JPEG, PNG, WebP, SVG — Max 10MB</p>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={`Upload ${category} image`}
        />
      </div>

      {/* Optimize toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            role="switch"
            aria-checked={optimize}
            onClick={() => setOptimize(!optimize)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              optimize ? 'bg-amber-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                optimize ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-white text-sm">Optimize Image</span>
        </div>
        <span className="text-gray-400 text-xs" title="When enabled, images are compressed and resized using Sharp for optimal performance">
          ℹ️
        </span>
      </div>
    </div>
  );
}
