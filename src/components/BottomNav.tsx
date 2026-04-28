import { Home, Library, Settings, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-surface/80 backdrop-blur-xl border-t border-surface-foreground/5 flex items-center justify-around px-4 pb-safe z-40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('light');
              onChangeTab(tab.id);
            }}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300",
              isActive ? "text-primary" : "text-surface-foreground/50 hover:text-surface-foreground/80"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-1 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
