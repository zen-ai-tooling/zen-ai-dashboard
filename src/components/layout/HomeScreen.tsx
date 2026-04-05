import React from 'react';
import { ArrowRight } from 'lucide-react';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface HomeScreenProps {
  onSelectModule: (module: ActiveModule) => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, operator';
  if (hour < 17) return 'Good afternoon, operator';
  return 'Good evening, operator';
};

const MODULES = [
  {
    id: 'bleeders_1' as const,
    name: 'Bleeders 1.0',
    desc: 'Identify high-spend, zero-conversion search terms and targets across SP, SB, and SD campaigns.',
    dot: 'bg-red-500',
    border: 'border-l-red-500',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    desc: 'Track-based analysis with inline decisions and automated Amazon bulk file generation.',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    desc: 'Extended click audit — find targets with 10+ lifetime clicks and zero sales.',
    dot: 'bg-purple-500',
    border: 'border-l-purple-500',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  return (
    <div className="pt-12">
      <h1 className="text-[22px] font-medium text-foreground font-display">{getGreeting()}</h1>
      <p className="text-[13px] text-muted-foreground mt-1.5">
        Select a module from the sidebar to begin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectModule(m.id)}
            className={`group text-left p-5 rounded-lg border border-border bg-card border-l-4 ${m.border} card-hover btn-press`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              <span className="text-[14px] font-medium text-foreground font-display">{m.name}</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{m.desc}</p>
            <div className="flex items-center gap-1 text-[12px] text-primary font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
