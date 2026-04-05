import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-md mb-5 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          🧮 Validation Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {allValidations.map((result, idx) => (
          result.message && (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2 rounded border ${getStatusColor(result.status)}`}
            >
              <StatusIcon status={result.status} />
              <span className="text-sm">{result.message}</span>
            </div>
          )
        ))}
        
        {!hasErrors && !hasWarnings && (
          <div className="text-sm text-green-700 font-medium mt-2">
            ✅ All validation checks passed
          </div>
        )}
      </CardContent>
    </Card>
  );
};
