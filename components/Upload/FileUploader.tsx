'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isProcessing?: boolean;
}

export function FileUploader({ onUpload, isProcessing = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      className={`
        relative border-2 border-dashed rounded-lg p-12
        transition-all duration-200 ease-in-out
        ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
        ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary-400'}
      `}
    >
      <input
        type="file"
        accept=".pdf,image/jpeg,image/png"
        onChange={handleFileInput}
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
            <p className="text-sm text-gray-600">Processando arquivo...</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-primary-100 rounded-full">
              <Upload className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Arraste seu extrato aqui
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ou clique para selecionar
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>PDF, JPEG ou PNG • Máximo 10MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
