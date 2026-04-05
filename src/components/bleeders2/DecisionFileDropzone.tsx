import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionFileDropzoneProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  label?: string;
}

export const DecisionFileDropzone: React.FC<DecisionFileDropzoneProps> = ({
  onFileUpload,
  disabled = false,
  variant = 'default',
  label
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-muted-foreground/25 hover:border-primary/50 bg-card",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.zip"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex items-center justify-center gap-2 text-sm">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{label || 'Upload Decision File'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Drag & drop or click to browse
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
        isDragging 
          ? "border-primary bg-primary/5 scale-[1.02]" 
          : "border-muted-foreground/25 hover:border-primary/50 bg-card",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.zip"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="flex justify-center mb-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <Upload className="w-6 h-6 text-primary" />
        </div>
      </div>
      
      <h3 className="text-sm font-semibold mb-1">
        {label || 'Upload Decision File'}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        {isDragging ? "Drop file here" : "Drag & drop your edited Operator Sheet here, or click to browse"}
      </p>
      
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="w-3 h-3" />
        <span>Accepts .xlsx, .xls, .csv, or .zip files</span>
      </div>
    </div>
  );
};
