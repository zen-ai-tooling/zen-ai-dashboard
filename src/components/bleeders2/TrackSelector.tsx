import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

export type Bleeder2Track = 'SBSD' | 'SP' | 'SP_KEYWORDS' | 'ACOS100';

interface TrackSelectorProps {
  selectedTracks: Bleeder2Track[];
  onToggleTrack: (track: Bleeder2Track) => void;
  onContinue: () => void;
  completedTracks?: Bleeder2Track[];
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  selectedTracks,
  onToggleTrack,
  onContinue,
  completedTracks = [],
}) => {
  const tracks: { id: Bleeder2Track; label: string; subtitle: string; report: string }[] = [
    {
      id: 'SBSD',
      label: 'SB/SD Bad Targets',
      subtitle: 'ACoS threshold: Target + 10%',
      report: 'SB Keywords + SD Targeting',
    },
    {
      id: 'SP',
      label: 'SP Bad Search Terms',
      subtitle: 'ACoS threshold: Target + 20%',
      report: 'SP Search Term Report',
    },
    {
      id: 'SP_KEYWORDS',
      label: 'SP Bad Targets',
      subtitle: 'ACoS threshold: Target + 20%',
      report: 'SP Targeting/Keywords',
    },
    {
      id: 'ACOS100',
      label: 'Campaigns >100% ACoS',
      subtitle: 'Campaign-level ACoS ≥ 100%',
      report: 'Campaign Performance',
    },
  ];

  const completedCount = completedTracks.length;
  const totalTracks = tracks.length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-semibold text-foreground tracking-tight">Select Analysis Tracks</h2>
        <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">
          Choose which tracks to analyze. All are selected by default.
        </p>
        {/* Segmented progress */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex gap-1">
            {tracks.map((t, i) => {
              const done = completedTracks.includes(t.id);
              return (
                <span
                  key={t.id}
                  className={`h-1.5 w-10 rounded-full transition-colors ${
                    done ? 'bg-success' : 'bg-border'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11.5px] text-[hsl(var(--text-tertiary))] font-mono-nums">
            {completedCount} of {totalTracks} tracks complete
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tracks.map(track => {
          const selected = selectedTracks.includes(track.id);
          const completed = completedTracks.includes(track.id);
          return (
            <label
              key={track.id}
              htmlFor={`track-${track.id}`}
              className={`relative rounded-xl border bg-card p-4 cursor-pointer btn-press card-hover transition-all ${
                selected ? 'border-border' : 'border-border opacity-80'
              }`}
              style={{ minHeight: 100 }}
            >
              {/* Status indicator top-right */}
              <div className="absolute top-3 right-3">
                {completed ? (
                  <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={2.2} />
                ) : (
                  <Circle className="w-4 h-4 text-[hsl(var(--text-tertiary))] opacity-50" strokeWidth={1.5} />
                )}
              </div>

              <div className="flex items-start gap-3 pr-6">
                <Checkbox
                  id={`track-${track.id}`}
                  checked={selected}
                  onCheckedChange={() => onToggleTrack(track.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-[14px] font-semibold text-foreground tracking-tight leading-tight">
                    {track.label}
                  </div>
                  <div className="text-[12px] text-[hsl(var(--text-secondary))]">
                    {track.subtitle}
                  </div>
                  <div className="text-[11px] text-[hsl(var(--text-tertiary))] mt-0.5">
                    Report: {track.report}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={selectedTracks.length === 0}
          className="h-11 rounded-[10px] text-[14px] font-semibold btn-press"
          style={{ maxWidth: 280, minWidth: 200 }}
        >
          Continue → Thresholds
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
