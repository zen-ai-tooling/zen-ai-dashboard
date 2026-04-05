import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, Download, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ValidationReport } from "@/lib/validator";
import { CompletionCard } from "./CompletionCard";

interface ValidatorResultsProps {
  validation: ValidationReport;
  fileName?: string;
  workbook?: any;
}

const StatusIcon = ({ status }: { status: 'pass' | 'warning' | 'error' }) => {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-orange-600" />;
  return <XCircle className="w-4 h-4 text-red-600" />;
};

const getStatusColor = (status: 'pass' | 'warning' | 'error') => {
  if (status === 'pass') return 'text-green-700 bg-green-50 border-green-200';
  if (status === 'warning') return 'text-orange-700 bg-orange-50 border-orange-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

export const ValidatorResults = ({ validation, fileName, workbook }: ValidatorResultsProps) => {
  const [showErrors, setShowErrors] = useState(false);
  
  const handleDownloadValidated = () => {
    if (!workbook || !fileName) return;
    
    const XLSX = require('xlsx');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadIssueReport = () => {
    if (validation.rowErrors.length === 0) return;
    
    // Create CSV content
    const headers = ['Sheet', 'Row', 'Issue'];
    const rows = validation.rowErrors.map(error => [
      error.sheet,
      error.row.toString(),
      error.issue
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Validation_Issues_${new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }).replace(/\//g, '-')}_PT.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allChecks = [
    validation.requiredColumns,
    validation.negativeKeywords,
    validation.negativeProductTargeting,
    validation.pausedKeywords,
    validation.spendCheck,
    validation.entityCheck,
    validation.emptySheetCheck
  ].filter(check => check.message);

  // Group errors by sheet and type for better display
  const groupedErrors = validation.rowErrors.reduce((acc, error) => {
    const key = `${error.sheet}:${error.issue}`;
    if (!acc[key]) {
      acc[key] = {
        sheet: error.sheet,
        issue: error.issue,
        rows: []
      };
    }
    acc[key].rows.push(error.row);
    return acc;
  }, {} as Record<string, { sheet: string; issue: string; rows: number[] }>);

  // Check for errors and warnings
  const hasErrors = Object.values(validation).some(
    (val) => typeof val === 'object' && val !== null && 'status' in val && val.status === 'error'
  );
  const hasWarnings = Object.values(validation).some(
    (val) => typeof val === 'object' && val !== null && 'status' in val && val.status === 'warning'
  );
  const canProceed = !hasErrors;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Overall Status Banner */}
      <Alert className={hasErrors ? 'bg-red-50 border-red-500 dark:bg-red-950/20' : hasWarnings ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950/20' : 'bg-green-50 border-green-500 dark:bg-green-950/20'}>
        <div className="flex items-start gap-3">
          {hasErrors ? (
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          ) : hasWarnings ? (
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          )}
          <div className="flex-1">
            <AlertTitle className={hasErrors ? 'text-red-700 dark:text-red-400' : hasWarnings ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}>
              {hasErrors ? '🟥 Validation Failed' : hasWarnings ? '🟨 Validation Warning (Proceeding)' : '🟩 Validation Successful!'}
            </AlertTitle>
            <AlertDescription className={hasErrors ? 'text-red-600 dark:text-red-300' : hasWarnings ? 'text-yellow-600 dark:text-yellow-300' : 'text-green-600 dark:text-green-300'}>
              {hasErrors 
                ? 'We found critical issues that must be fixed before upload.'
                : hasWarnings
                ? 'Minor issues detected, but your file can proceed to upload.'
                : 'Your file passed all required checks and is ready for Amazon upload.'}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Success/Warning Details */}
      {canProceed && (
        <Card className={hasWarnings ? "border-yellow-500" : "border-green-500"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary Table */}
      {hasErrors && validation.rowErrors.length > 0 && (
        <Card className="border-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700 dark:text-red-400">Error Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Sheet</th>
                    <th className="pb-2 font-semibold">Count</th>
                    <th className="pb-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.values(groupedErrors).map((group, idx) => (
                    <tr key={idx} className="text-muted-foreground">
                      <td className="py-2">{group.issue.includes('column') ? 'Missing column' : group.issue.includes('blank') ? 'Invalid entity' : 'Data format'}</td>
                      <td className="py-2">{group.sheet}</td>
                      <td className="py-2">{group.rows.length}</td>
                      <td className="py-2">{group.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={downloadIssueReport}
                className="w-full border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Issue Report CSV
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Contains: sheet, row, column, message, snippet
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Detailed Validation Results */}
      {allChecks.length > 0 && (
        <Card className="border-l-4 border-l-blue-500 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔍 Validation Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allChecks.map((check, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 p-2 rounded border text-sm ${getStatusColor(check.status)}`}
              >
                <StatusIcon status={check.status} />
                <span>{check.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Row Errors */}
      {validation.rowErrors.length > 0 && (
        <Card className="border-l-4 border-l-red-500 shadow-md">
          <CardHeader className="pb-3">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="text-lg">
                ⚠️ Row-Level Errors ({validation.rowErrors.length})
              </CardTitle>
              {showErrors ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </CardHeader>
          {showErrors && (
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {validation.rowErrors.map((error, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 bg-red-50 border border-red-200 rounded text-sm"
                  >
                    <div className="font-medium text-red-900">
                      {error.sheet} - Row {error.row}
                    </div>
                    <div className="text-red-700">{error.issue}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Next Steps / Actions */}
      <Card className="border-l-4 border-l-purple-500 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">⚙️ Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground mb-4">
            {hasErrors ? (
              <>
                <li>Fix the critical issues in your source file</li>
                <li>Re-run the Decision Processor module</li>
                <li>Re-validate before Amazon upload</li>
              </>
            ) : (
              <>
                <li>Fix the issues in your source file</li>
                <li>Re-run the Decision Processor module</li>
                <li>Re-validate before Amazon upload</li>
              </>
            )}
          </ol>
        </CardContent>
      </Card>
      
      {/* Completion Card - show if no errors (warnings OK) */}
      {canProceed && fileName && workbook && (
        <CompletionCard 
          downloadFileName={fileName}
          onDownload={handleDownloadValidated}
        />
      )}
    </div>
  );
};
