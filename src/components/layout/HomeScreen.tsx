import React from 'react';

type ActiveModule = 'bleeders_1' | 'bleeders_2' | 'lifetime_bleeders' | null;

interface HomeScreenProps {
  onSelectModule: (module: ActiveModule) => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, operator';
  if (h < 17) return 'Good afternoon, operator';
  return 'Good evening, operator';
};

const modules = [
  {
    id: 'bleeders_1' as const,
    name: 'Bleeders 1.0',
    description: 'Zero-sale wasted spend cleanup (60-day)',
    dotColor: 'bg-red-500',
  },
  {
    id: 'bleeders_2' as const,
    name: 'Bleeders 2.0',
    description: 'Low orders & high ACoS optimizer by track',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'lifetime_bleeders' as const,
    name: 'Lifetime Audit',
    description: 'Extended click audit for lifetime targets',
    dotColor: 'bg-purple-500',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectModule }) => {
  return (
    <div className="max-w-2xl mx-auto pt-16">
      <h2 className="text-[22px] font-medium text-foreground">{getGreeting()}</h2>
      <p className="text-[13px] text-muted-foreground mt-1">
        Select a module from the sidebar to begin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectModule(m.id)}
            className="text-left p-4 rounded-lg bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${m.dotColor}`} />
              <span className="text-[14px] font-medium text-foreground">{m.name}</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
