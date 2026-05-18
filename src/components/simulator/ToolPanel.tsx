import {
  Syringe, Scissors, Drill, Zap, Wind, GitBranch, Crosshair
} from 'lucide-react';
import { ToolId, SURGICAL_TOOLS, SURGICAL_STEPS } from '@/types/simulator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolPanelProps {
  activeTool: ToolId;
  currentStep: number;
  onSelectTool: (tool: ToolId) => void;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  syringe: Syringe,
  scalpel: Scissors,
  drill: Drill,
  scissors: Scissors,
  probe: Crosshair,
  aspirator: Wind,
  forceps: Zap,
  suture: GitBranch,
};

const TOOL_COLORS: Record<string, string> = {
  syringe: 'text-blue-400',
  scalpel: 'text-red-400',
  drill: 'text-yellow-400',
  scissors: 'text-purple-400',
  probe: 'text-emerald-400',
  aspirator: 'text-amber-400',
  forceps: 'text-red-500',
  suture: 'text-green-400',
};

const TOOL_GLOW: Record<string, string> = {
  syringe: 'shadow-[0_0_12px_rgba(96,165,250,0.6)]',
  scalpel: 'shadow-[0_0_12px_rgba(248,113,113,0.6)]',
  drill: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]',
  scissors: 'shadow-[0_0_12px_rgba(167,139,250,0.6)]',
  probe: 'shadow-[0_0_12px_rgba(52,211,153,0.6)]',
  aspirator: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
  forceps: 'shadow-[0_0_12px_rgba(239,68,68,0.6)]',
  suture: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
};

export function ToolPanel({ activeTool, currentStep, onSelectTool }: ToolPanelProps) {
  const step = SURGICAL_STEPS[currentStep];
  const requiredTool = step.toolRequired;

  return (
    <div className="flex items-center gap-1.5 h-full">
      {/* Label */}
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap mr-1">
        Instruments
      </div>

      {/* Tools */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SURGICAL_TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.id] || Crosshair;
            const isActive = activeTool === tool.id;
            const isRequired = requiredTool === tool.id;
            const colorClass = TOOL_COLORS[tool.id] || 'text-foreground';
            const glowClass = TOOL_GLOW[tool.id] || '';

            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectTool(tool.id)}
                    className={`
                      relative flex flex-col items-center justify-center gap-1 
                      w-14 h-14 rounded-lg border transition-all duration-200
                      ${isActive
                        ? `bg-card border-primary/80 ${glowClass} scale-110`
                        : isRequired
                        ? `bg-muted/30 border-primary/40 hover:border-primary/60 hover:scale-105`
                        : `bg-muted/10 border-border/30 hover:border-border/60 hover:scale-105 opacity-50 hover:opacity-80`
                      }
                    `}
                  >
                    {/* Required indicator */}
                    {isRequired && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}

                    <Icon className={`w-5 h-5 ${isActive ? colorClass : isRequired ? colorClass : 'text-muted-foreground'}`} />

                    <span className={`text-[8px] font-medium leading-none text-center ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {tool.name.split(' ')[0]}
                    </span>

                    {/* Active underline */}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="glass-panel border-border/50">
                  <div className="text-xs font-semibold">{tool.name}</div>
                  <div className="text-[10px] text-muted-foreground">{tool.description}</div>
                  {isRequired && (
                    <div className="text-[10px] text-primary font-semibold mt-0.5">Required for current step</div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Active tool indicator */}
      {activeTool !== 'none' && (
        <div className="ml-2 flex items-center gap-1.5 glass-panel rounded px-2 py-1">
          <span className="text-[10px] text-muted-foreground">Active:</span>
          <span className={`text-[10px] font-bold ${TOOL_COLORS[activeTool] || 'text-foreground'}`}>
            {SURGICAL_TOOLS.find(t => t.id === activeTool)?.name}
          </span>
        </div>
      )}
    </div>
  );
}
