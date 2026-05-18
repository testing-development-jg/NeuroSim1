import { AlertCircle, CheckCircle2, Info, AlertTriangle, User, LogOut, Award } from 'lucide-react';
import { SimulatorState, SURGICAL_STEPS } from '@/types/simulator';

interface FeedbackBannerProps {
  message: string;
  type: SimulatorState['feedbackType'];
}

function FeedbackBanner({ message, type }: FeedbackBannerProps) {
  const config = {
    info: { icon: Info, color: 'text-accent border-accent/30 bg-accent/5' },
    success: { icon: CheckCircle2, color: 'text-vital-green border-vital-green/30 bg-vital-green/5' },
    warning: { icon: AlertTriangle, color: 'text-vital-yellow border-vital-yellow/30 bg-vital-yellow/5' },
    error: { icon: AlertCircle, color: 'text-vital-red border-vital-red/30 bg-vital-red/5' },
  };

  const { icon: Icon, color } = config[type];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border text-[11px] font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface HUDProps {
  state: SimulatorState;
  onLogout: () => void;
}

export function HUD({ state, onLogout }: HUDProps) {
  const step = SURGICAL_STEPS[Math.min(state.currentStep, SURGICAL_STEPS.length - 1)];

  return (
    <>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 glass-panel border-b border-border/40">
        {/* Left: Title + Step */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-bold text-foreground tracking-wide">NeuroSim Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Step {state.currentStep + 1}/{SURGICAL_STEPS.length}</span>
            <span className="text-border">·</span>
            <span className="text-foreground/70">{step.title}</span>
          </div>
        </div>

        {/* Center: Feedback */}
        <div className="flex-1 mx-4 max-w-sm hidden md:block">
          <FeedbackBanner message={state.feedback} type={state.feedbackType} />
        </div>

        {/* Right: User + Score */}
        <div className="flex items-center gap-3">
          {state.userProfile && (
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-vital-yellow" />
              <span className="text-[11px] font-mono-display font-bold text-vital-yellow">{state.score}</span>
              <span className="text-[10px] text-muted-foreground">pts</span>
            </div>
          )}
          {state.userProfile && (
            <div className="flex items-center gap-1.5 glass-panel px-2 py-1 rounded">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-foreground/80 hidden lg:block">{state.userProfile.name}</span>
              <button
                onClick={onLogout}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Logout"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Feedback (below top bar) */}
      <div className="absolute top-10 left-0 right-0 z-10 px-3 py-1.5 md:hidden">
        <FeedbackBanner message={state.feedback} type={state.feedbackType} />
      </div>

      {/* OR Status indicators (corners) */}
      <div className="absolute bottom-20 right-3 z-10 flex flex-col items-end gap-1">
        {state.activeTool !== 'none' && (
          <div className="glass-panel rounded px-2 py-1 flex items-center gap-1.5 border border-primary/30">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] text-primary uppercase tracking-wider">
              {state.activeTool}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
