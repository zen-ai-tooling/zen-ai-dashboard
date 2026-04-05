import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileText } from "lucide-react";

export type Bleeder2Track = 'SBSD' | 'SP' | 'SP_KEYWORDS' | 'ACOS100';

interface TrackSelectorProps {
  selectedTracks: Bleeder2Track[];
  onToggleTrack: (track: Bleeder2Track) => void;
  onContinue: () => void;
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  selectedTracks,
  onToggleTrack,
  onContinue
}) => {
  const tracks: { id: Bleeder2Track; label: string; reports: string[]; howTo: string }[] = [
    {
      id: 'SBSD',
      label: 'SB/SD Bad Targets',
      reports: ['Sponsored Brands Keywords Report', 'Sponsored Display Targeting Report'],
      howTo: 'Campaign Manager → Reports → Create Report → SB Keywords (30 days) & SD Targeting (30 days)'
    },
    {
      id: 'SP',
      label: 'SP Bad Search Terms',
      reports: ['Sponsored Products Search Term Report'],
      howTo: 'Campaign Manager → Reports → Create Report → SP Search Terms (30 days)'
    },
    {
      id: 'SP_KEYWORDS',
      label: 'SP Bad Targets',
      reports: ['Sponsored Products Targeting/Keywords Report'],
      howTo: 'Campaign Manager → Reports → Create Report → SP Targeting/Keywords (30 days)'
    },
    {
      id: 'ACOS100',
      label: 'Campaigns >100% ACoS',
      reports: ['Campaign Performance Report'],
      howTo: 'Campaign Manager → Reports → Create Report → Campaign Performance (30 days)'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Analysis Tracks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which tracks to analyze. All are selected by default.
          </p>
          
          <div className="space-y-3">
            {tracks.map(track => (
              <Card key={track.id} className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`track-${track.id}`}
                      checked={selectedTracks.includes(track.id)}
                      onCheckedChange={() => onToggleTrack(track.id)}
                    />
                    <div className="flex-1 space-y-2">
                      <label
                        htmlFor={`track-${track.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {track.label}
                      </label>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {track.reports.map((report, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {report}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          📥 {track.howTo}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button 
            onClick={onContinue} 
            className="w-full"
            disabled={selectedTracks.length === 0}
          >
            Continue → Thresholds
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
