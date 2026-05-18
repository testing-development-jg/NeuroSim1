import { useEffect, useCallback, useState } from 'react';
import { BrainScene } from './BrainScene';
import { StepPanel } from './StepPanel';
import { ToolPanel } from './ToolPanel';
import { VitalMonitor } from './VitalMonitor';
import { AICoach } from './AICoach';
import { HUD } from './HUD';
import { CompletionScreen } from './CompletionScreen';
import { useSimulator } from '@/hooks/useSimulator';
import { useAICoach } from '@/hooks/useAICoach';
import { useVoice } from '@/hooks/useVoice';
import { BrainLayer, SURGICAL_STEPS, UserProfile } from '@/types/simulator';
import { Button } from '@/components/ui/button';
import { CheckCircle, Syringe, Crosshair, Brain, Loader2 } from 'lucide-react';

interface BrainSurgerySimulatorProps {
  userProfile: UserProfile;
  onLogout: () => void;
}

export function BrainSurgerySimulator({ userProfile, onLogout }: BrainSurgerySimulatorProps) {
  const [showHighlight, setShowHighlight] = useState(false);
  const { getCoachingAdvice } = useAICoach();
  const { speak } = useVoice();
  const {
    state,
    setActiveTool,
    performAction,
    confirmVitals,
    setAICoachMessage,
    setIsSpeaking,
    saveSession,
    logAnalytics,
    resetSimulator,
    login,
  } = useSimulator();

  // Initialize user profile on mount
  useEffect(() => {
    login(userProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide highlight on step change
  useEffect(() => { setShowHighlight(false); }, [state.currentStep]);

  // Log simulation start after profile is set
  useEffect(() => {
    if (state.userProfile) {
      logAnalytics('simulation_started', { specialty: userProfile.specialty });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.userProfile?.id]);

  // Save session on completion
  useEffect(() => {
    if (state.isComplete) {
      saveSession();
      logAnalytics('simulation_completed', { score: state.score });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isComplete]);

  const handleAction = useCallback((layer: BrainLayer) => {
    const step = SURGICAL_STEPS[state.currentStep];
    if (step.interaction === 'button') return;
    performAction(layer);
    logAnalytics('surgical_action', { layer, tool: state.activeTool });
  }, [state.currentStep, state.activeTool, performAction, logAnalytics]);

  const handleAIAdvice = useCallback(async () => {
    const step = SURGICAL_STEPS[state.currentStep];
    await getCoachingAdvice(step, state.activeTool, state.actionsCompleted, async (msg, loading) => {
      setAICoachMessage(msg, loading);
      if (!loading && msg) await speak(msg, setIsSpeaking);
    });
    logAnalytics('ai_advice_requested', { step: state.currentStep });
  }, [state.currentStep, state.activeTool, state.actionsCompleted, getCoachingAdvice, speak, setAICoachMessage, setIsSpeaking, logAnalytics]);

  const step = SURGICAL_STEPS[state.currentStep];
  const isVitalsStep = state.currentStep === 0;
  const totalTime = Math.floor((Date.now() - state.sessionStartTime) / 1000);

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* HUD Overlay */}
      <HUD state={{ ...state, userProfile }} onLogout={onLogout} />

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0 pt-[44px] pb-[68px]">
        {/* Left Panel: Steps */}
        <div className="hidden lg:flex flex-col w-56 border-r border-border/40 glass-panel p-3 overflow-hidden">
          <StepPanel
            currentStep={state.currentStep}
            actionsCompleted={state.actionsCompleted}
          />
        </div>

        {/* Center: 3D Brain Canvas */}
        <div className="flex-1 relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card pointer-events-none" />

          {/* 3D Scene */}
          <div className="absolute inset-0">
            <BrainScene
              currentStep={state.currentStep}
              activeTool={state.activeTool}
              layerState={state.layerState}
              tumorProgress={state.tumorProgress}
              onAction={handleAction}
              showHighlight={showHighlight}
            />
          </div>

          {/* Floating AI Advice + Highlight buttons */}
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Button
              onClick={handleAIAdvice}
              disabled={state.isAILoading}
              size="sm"
              variant="outline"
              className="h-8 px-3 text-[10px] gap-1.5 glass-panel border-primary/40 text-primary hover:bg-primary/20"
              title="Get AI advice via Gemma + ElevenLabs"
            >
              {state.isAILoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Brain className="w-3.5 h-3.5" />}
              AI Advice
            </Button>
            {state.currentStep > 0 && (
              <Button
                onClick={() => setShowHighlight(h => !h)}
                size="sm"
                variant="outline"
                className={`h-8 px-3 text-[10px] gap-1.5 transition-all ${
                  showHighlight
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]'
                    : 'glass-panel border-border/40 text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                {showHighlight ? 'Hide' : 'Highlight'}
              </Button>
            )}
          </div>

          {/* Vitals confirmation (step 0) */}
          {isVitalsStep && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
              <Button
                onClick={confirmVitals}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg animate-glow-pulse px-6"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Vitals & Proceed
              </Button>
            </div>
          )}

          {/* Anesthesia step visual */}
          {state.currentStep === 1 && state.activeTool !== 'syringe' && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
              <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-2 border border-blue-500/30">
                <Syringe className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] text-blue-400">Select the Syringe tool from the bottom bar</span>
              </div>
            </div>
          )}

          {/* Step progress overlay (center bottom, mobile) */}
          <div className="absolute bottom-4 left-4 z-10 lg:hidden glass-panel rounded px-3 py-1.5">
            <span className="text-[11px] text-foreground/80">
              Step {state.currentStep + 1}/10 — {step.title}
            </span>
          </div>

          {/* Crosshair when tool is active */}
          {state.activeTool !== 'none' && state.currentStep > 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-8 h-8 opacity-20">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-primary" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Vitals + AI Coach */}
        <div className="hidden lg:flex flex-col w-52 border-l border-border/40 glass-panel overflow-hidden">
          {/* Vitals */}
          <div className="flex-1 p-3 border-b border-border/40 overflow-hidden">
            <VitalMonitor
              vitals={state.vitals}
              currentStep={state.currentStep}
            />
          </div>
          {/* AI Coach */}
          <div className="h-56 p-3 overflow-hidden">
            <AICoach
              step={step}
              activeTool={state.activeTool}
              actionsCompleted={state.actionsCompleted}
              aiMessage={state.aiCoachMessage}
              isLoading={state.isAILoading}
              isSpeaking={state.isSpeaking}
              onMessage={setAICoachMessage}
              onSpeakingChange={setIsSpeaking}
            />
          </div>
        </div>
      </div>

      {/* Bottom Tool Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[68px] border-t border-border/40 glass-panel px-4 flex items-center">
        <ToolPanel
          activeTool={state.activeTool}
          currentStep={state.currentStep}
          onSelectTool={setActiveTool}
        />
      </div>

      {/* Completion Screen */}
      {state.isComplete && (
        <CompletionScreen
          score={state.score}
          totalTime={totalTime}
          userProfile={userProfile}
          sessionId={state.sessionId}
          onRestart={resetSimulator}
        />
      )}
    </div>
  );
}
