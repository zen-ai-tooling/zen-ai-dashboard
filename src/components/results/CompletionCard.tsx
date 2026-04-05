import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Download, ExternalLink, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionCardProps {
  downloadFileName: string;
  onDownload: () => void;
}

export const CompletionCard = ({ downloadFileName, onDownload }: CompletionCardProps) => {
  return (
    <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-6 h-6" />
          🎉 All Steps Complete!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground font-medium">
          Your upload file is validated and ready for Amazon.
        </p>
        
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">💾 Next:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-2">
            <li>Download the validated file (if needed)</li>
            <li>Upload it via Amazon Bulk Sheets</li>
            <li>Optional: Save a copy for audit under /Validated_Reports/</li>
          </ol>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={onDownload}
            variant="outline"
            className="flex-1 border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/50"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Validated File
          </Button>
          <Button 
            onClick={() => window.open('https://advertising.amazon.com/cm/campaigns/bulk', '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Amazon Bulk Sheets
          </Button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> The toolbar remembers your last processed file — next time, just click "Reupload" to skip setup.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
