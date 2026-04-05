import { Upload, FileSpreadsheet, FileArchive, CheckCircle2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProcessorUploadPanelProps {
  onFileUpload: (files: File[]) => void;
  title: string;
  subtitle: string;
  checklist: string[];
  stepNumber: number;
  isExpanded?: boolean;
}

export const ProcessorUploadPanel = ({ 
  onFileUpload, 
  title, 
  subtitle,
  checklist,
  stepNumber,
  isExpanded = true
}: ProcessorUploadPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      onFileUpload(files);
    },
    [onFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFileUpload(files);
      }
    },
    [onFileUpload]
  );

  if (!isExpanded) return null;

  return (
    <Card 
      className="border-l-4 border-l-purple-500 shadow-md animate-fade-in"
      id={`step-${stepNumber}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold">
            {stepNumber}
          </span>
          <span>{title}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-[hsl(var(--upload-border))] bg-card hover:bg-[hsl(var(--upload-hover))]"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById(`file-input-${stepNumber}`)?.click()}
        >
          <input
            id={`file-input-${stepNumber}`}
            type="file"
            accept=".xlsx,.xls,.csv,.zip"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h3 className="text-base font-semibold mb-2">
            {isDragging ? "Drop file here" : "Drag & drop or click to browse"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Accepts .xlsx, .csv, or .zip files
          </p>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx, .xls) or CSV</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <FileArchive className="w-4 h-4" />
              <span>Compressed (.zip)</span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground mb-2">Expected in your file:</p>
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
