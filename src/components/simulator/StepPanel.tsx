import { CheckCircle, Circle, ChevronRight, Info } from 'lucide-react';
import { SURGICAL_STEPS } from '@/types/simulator';
import { Progress } from '@/components/ui/progress';

interface StepPanelProps {
  currentStep: number;
  actionsCompleted: number;
}

const PHASE_COLORS: Record<string, string> = {
  'Pre-Op': 'text-vital-cyan',
  'Craniotomy': 'text-vital-yellow',
  'Exposure': 'text-accent',
  'Resection': 'text-vital-red',
  'Hemostasis': 'text-destructive',
  'Closure': 'text-vital-green',
};

export function StepPanel({ currentStep, actionsCompleted }: StepPanelProps) {
  const step = SURGICAL_STEPS[currentStep];
  const progressPct = step.requiredActions > 1
    ? (actionsCompleted / step.requiredActions) * 100
    : actionsCompleted > 0 ? 100 : 0;

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Procedure</span>
        <span className="text-[10px] text-muted-foreground">
          {currentStep + 1}/{SURGICAL_STEPS.length}
        </span>
      </div>

      {/* Current Step Highlight */}
      <div className="glass-panel rounded-lg p-3 border border-primary/30 glow-pulse">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary text-[10px] font-bold">{currentStep + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${PHASE_COLORS[step.phase] || 'text-primary'}`}>
              {step.phase}
            </div>
            <div className="text-sm font-bold text-foreground leading-tight">{step.title}</div>
          </div>
        </div>

        {/* Progress bar */}
        {step.requiredActions > 1 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Actions</span>
              <span className="font-mono-display">{actionsCompleted}/{step.requiredActions}</span>
            </div>
            <Progress value={progressPct} className="h-1" />
          </div>
        )}

        {/* Instruction */}
        <div className="mt-2 flex items-start gap-1.5">
          <Info className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{step.instruction}</p>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {SURGICAL_STEPS.map((s, idx) => {
          const isComplete = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isPending = idx > currentStep;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-200 ${
                isCurrent
                  ? 'bg-primary/10 border border-primary/20'
                  : isComplete
                  ? 'bg-muted/10 border border-border/20 opacity-70'
                  : 'opacity-30'
              }`}
            >
              {isComplete ? (
                <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              ) : isCurrent ? (
                <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] font-medium truncate block ${
                  isCurrent ? 'text-foreground' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}>
                  {s.title}
                </span>
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-wide ${PHASE_COLORS[s.phase] || ''} opacity-60`}>
                {s.phase}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overall Progress */}
      <div className="glass-panel rounded p-2">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Overall Progress</span>
          <span className="font-mono-display text-primary">{Math.round((currentStep / SURGICAL_STEPS.length) * 100)}%</span>
        </div>
        <Progress value={(currentStep / SURGICAL_STEPS.length) * 100} className="h-1" />
      </div>
    </div>
  );
}
