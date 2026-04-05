/**
 * Lifetime Bleeders Two-File Upload Workflow Component
 * 
 * Guides user through uploading:
 * 1. Lifetime Targeting Report (from Campaign Manager)
 * 2. Reference Bulk File (30-day Amazon Bulk Operations export)
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LifetimeUploaderProps {
  onAnalyze: (lifetimeReport: File, bulkFile: File) => Promise<void>;
  isProcessing?: boolean;
}

type UploadState = "step1" | "step2" | "ready" | "processing";

export const LifetimeUploader: React.FC<LifetimeUploaderProps> = ({
  onAnalyze,
  isProcessing = false,
}) => {
  const [state, setState] = useState<UploadState>("step1");
  const [lifetimeReport, setLifetimeReport] = useState<File | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingLifetime, setIsDraggingLifetime] = useState(false);
  const [isDraggingBulk, setIsDraggingBulk] = useState(false);

  const processFile = (file: File, step: "lifetime" | "bulk") => {
    if (step === "lifetime") {
      const isValid = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (!isValid) {
        setError("Please upload an Excel or CSV file (.xlsx, .xls, .csv)");
        return;
      }
      setLifetimeReport(file);
      setState("step2");
      setError(null);
    } else {
      const isValid = /\.(xlsx|xls|csv|zip)$/i.test(file.name);
      if (!isValid) {
        setError("Please upload an Excel, CSV, or ZIP file (.xlsx, .xls, .csv, .zip)");
        return;
      }
      setBulkFile(file);
      setState("ready");
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, step: "lifetime" | "bulk") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFile(files[0], step);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent, step: "lifetime" | "bulk") => {
    e.preventDefault();
    if (step === "lifetime" && state === "step1") {
      setIsDraggingLifetime(true);
    } else if (step === "bulk" && state === "step2") {
      setIsDraggingBulk(true);
    }
  };

  const handleDragLeave = (step: "lifetime" | "bulk") => {
    if (step === "lifetime") {
      setIsDraggingLifetime(false);
    } else {
      setIsDraggingBulk(false);
    }
  };

  const handleDrop = (e: React.DragEvent, step: "lifetime" | "bulk") => {
    e.preventDefault();
    setIsDraggingLifetime(false);
    setIsDraggingBulk(false);
    
    if (step === "lifetime" && state !== "step1") return;
    if (step === "bulk" && state !== "step2") return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file, step);
    }
  };

  const handleAnalyze = async () => {
    if (!lifetimeReport || !bulkFile) return;
    setState("processing");
    try {
      await onAnalyze(lifetimeReport, bulkFile);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
      setState("ready");
    }
  };

  const handleReset = () => {
    setLifetimeReport(null);
    setBulkFile(null);
    setState("step1");
    setError(null);
  };

  const progressPercent = state === "step1" ? 0 : state === "step2" ? 50 : 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Bleeding Lifetime Targets
            </CardTitle>
            <CardDescription>
              Extended click audit — 10+ clicks, 0 sales (lifetime)
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Monthly Audit
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2 mt-4" />
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Lifetime Report Upload */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
            isDraggingLifetime && state === "step1"
              ? "border-primary bg-primary/10 scale-[1.02]"
              : state === "step1" 
                ? "border-primary/50 bg-primary/5 hover:border-primary/70" 
                : lifetimeReport 
                  ? "border-green-500/50 bg-green-50/50 cursor-default" 
                  : "border-muted opacity-50 cursor-default"
          )}
          onDragOver={(e) => handleDragOver(e, "lifetime")}
          onDragLeave={() => handleDragLeave("lifetime")}
          onDrop={(e) => handleDrop(e, "lifetime")}
          onClick={() => state === "step1" && document.getElementById("lifetime-file-input")?.click()}
        >
          <input
            id="lifetime-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileSelect(e, "lifetime")}
            className="hidden"
          />
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-full",
              lifetimeReport ? "bg-green-100" : "bg-muted"
            )}>
              {lifetimeReport ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={state === "step1" ? "default" : "secondary"}>Step 1</Badge>
                <span className="font-medium">Lifetime Targeting Report</span>
              </div>
              
              {lifetimeReport ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <FileSpreadsheet className="h-4 w-4" />
                  {lifetimeReport.name}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isDraggingLifetime 
                    ? "Drop file here..." 
                    : "Drag & drop or click — Campaign Manager → Targeting Tab → \"Lifetime\" filter → Export"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Arrow between steps */}
        {lifetimeReport && (
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Step 2: Bulk File Upload */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
            isDraggingBulk && state === "step2"
              ? "border-primary bg-primary/10 scale-[1.02]"
              : state === "step2" 
                ? "border-primary/50 bg-primary/5 hover:border-primary/70" 
                : bulkFile 
                  ? "border-green-500/50 bg-green-50/50 cursor-default" 
                  : "border-muted opacity-50 cursor-default"
          )}
          onDragOver={(e) => handleDragOver(e, "bulk")}
          onDragLeave={() => handleDragLeave("bulk")}
          onDrop={(e) => handleDrop(e, "bulk")}
          onClick={() => state === "step2" && document.getElementById("bulk-file-input")?.click()}
        >
          <input
            id="bulk-file-input"
            type="file"
            accept=".xlsx,.xls,.csv,.zip"
            onChange={(e) => handleFileSelect(e, "bulk")}
            className="hidden"
          />
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-full",
              bulkFile ? "bg-green-100" : "bg-muted"
            )}>
              {bulkFile ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={state === "step2" ? "default" : "secondary"}>Step 2</Badge>
                <span className="font-medium">Reference Bulk File (30-Day)</span>
              </div>
              
              {bulkFile ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <FileSpreadsheet className="h-4 w-4" />
                  {bulkFile.name}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    {isDraggingBulk 
                      ? "Drop file here..." 
                      : "Drag & drop or click — Amazon Ads → Bulk Operations → Create Spreadsheet (30-day)"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Smart Download Instructions - Only show when on Step 2 */}
        {state === "step2" && !bulkFile && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <p className="font-medium text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Required Amazon Download Settings:
            </p>
            <ul className="text-sm text-amber-700 space-y-1.5 ml-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span><strong>Campaign items with zero impressions:</strong> Crucial. Finds active bleeders that stopped getting traffic.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span><strong>Paused campaigns:</strong> Required. Finds active targets inside paused campaigns.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span><strong>Terminated campaigns:</strong> Recommended. Identifies "Already Archived" targets to prevent errors.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span><strong>All Campaign Types:</strong> Select SP, SB, and SD.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span><strong>Date Range:</strong> Last 30 Days (Faster & sufficient for ID mapping).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="h-4 w-4 flex items-center justify-center text-red-500 font-bold shrink-0">✕</span>
                <span><strong>UNCHECK "Search term data":</strong> Do not download search terms. They make the file huge and are not needed for ID mapping.</span>
              </li>
            </ul>
          </div>
        )}

        {/* Action buttons */}
        {(state === "ready" || state === "processing") && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAnalyze}
              disabled={isProcessing || state === "processing"}
              className="flex-1"
            >
              {isProcessing || state === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Analyze Lifetime Bleeders
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
              Reset
            </Button>
          </div>
        )}

        {/* Info callout */}
        <Alert className="bg-amber-50/50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Why two files?</strong> The Lifetime Report has performance data but lacks IDs. 
            The Bulk File provides IDs needed to generate Amazon-compatible update rows.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default LifetimeUploader;
