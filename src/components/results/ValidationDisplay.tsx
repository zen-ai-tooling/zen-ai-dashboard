import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ValidationResult {
  status: 'pass' | 'warning' | 'error';
  message: string;
}

interface ValidationReport {
  sheetsFound: ValidationResult;
  columnsVerified: ValidationResult;
  bleederFilter: ValidationResult;
  topSpenders: ValidationResult;
  crossTabIntegrity: ValidationResult;
  dataQuality: ValidationResult[];
}

interface ValidationDisplayProps {
  validation: ValidationReport;
}

export const ValidationDisplay = ({ validation }: ValidationDisplayProps) => {
  const allValidations = [
    validation.sheetsFound,
    validation.columnsVerified,
    validation.bleederFilter,
    validation.topSpenders,
    validation.crossTabIntegrity,
    ...validation.dataQuality
  ];

  const hasErrors = allValidations.some(v => v.status === 'error');
  const hasWarnings = allValidations.some(v => v.status === 'warning');
  const passCount = allValidations.filter(v => v.status === 'pass').length;
  const sheetsMsg = validation.sheetsFound.message || '';
  const bleedersMsg = validation.bleederFilter.message || '';

  // Compact single-card view when all pass
  if (!hasErrors && !hasWarnings) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--green))] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-semibold text-[hsl(var(--green))]">All checks passed</p>
          <p className="text-[12px] text-[hsl(var(--text-secondary))] mt-0.5">
            {passCount} validations · {sheetsMsg ? sheetsMsg : 'Sheets detected'} · {bleedersMsg ? bleedersMsg : 'Data quality passed'}
          </p>
        </div>
      </div>
    );
  }

  // Show warnings/errors as compact rows
  const issues = allValidations.filter(v => v.status !== 'pass' && v.message);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      {issues.map((result, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-2 p-2.5 rounded-lg border-l-[3px] text-[13px] ${
            result.status === 'warning'
              ? 'border-l-[hsl(var(--amber))] bg-[hsl(var(--amber-light))] text-[hsl(var(--text-primary))]'
              : 'border-l-destructive bg-[hsl(var(--red-light))] text-destructive'
          }`}
        >
          {result.status === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--amber))] flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      ))}
    </div>
  );
};
