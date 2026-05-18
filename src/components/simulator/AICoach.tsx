import { useEffect, useRef, useState } from 'react';
import { Brain, Volume2, VolumeX, Loader2, MessageSquare, Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurgicalStep, ToolId } from '@/types/simulator';
import { useAICoach } from '@/hooks/useAICoach';
import { useVoice } from '@/hooks/useVoice';

interface AICoachProps {
  step: SurgicalStep;
  activeTool: ToolId;
  actionsCompleted: number;
  aiMessage: string;
  isLoading: boolean;
  isSpeaking: boolean;
  onMessage: (msg: string, loading: boolean) => void;
  onSpeakingChange: (speaking: boolean) => void;
}

export function AICoach({
  step, activeTool, actionsCompleted,
  aiMessage, isLoading, isSpeaking,
  onMessage, onSpeakingChange,
}: AICoachProps) {
  const { getCoachingAdvice, getStepIntroduction, getHint } = useAICoach();
  const { speak, stopSpeaking } = useVoice();
  const prevStepIdRef = useRef(step.id);
  const [hintLoading, setHintLoading] = useState(false);

  // On step change: fetch intro and auto-speak it
  useEffect(() => {
    if (prevStepIdRef.current === step.id) return;
    prevStepIdRef.current = step.id;

    getStepIntroduction(step, async (msg, loading) => {
      onMessage(msg, loading);
      if (!loading && msg) {
        await speak(msg, onSpeakingChange);
      }
    });
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGetAdvice = async () => {
    stopSpeaking();
    onSpeakingChange(false);
    await getCoachingAdvice(step, activeTool, actionsCompleted, async (msg, loading) => {
      onMessage(msg, loading);
      if (!loading && msg) {
        await speak(msg, onSpeakingChange);
      }
    });
  };

  const handleHint = async () => {
    stopSpeaking();
    onSpeakingChange(false);
    setHintLoading(true);
    const hint = await getHint(step);
    setHintLoading(false);
    onMessage(hint, false);
    await speak(hint, onSpeakingChange);
  };

  const handleToggleVoice = async () => {
    if (isSpeaking) {
      stopSpeaking();
      onSpeakingChange(false);
    } else if (aiMessage) {
      await speak(aiMessage, onSpeakingChange);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Coach</span>
          <span className="text-[9px] text-primary/60 font-mono">GEMMA</span>
        </div>
        <button
          onClick={handleToggleVoice}
          disabled={!aiMessage && !isSpeaking}
          className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${
            isSpeaking
              ? 'border-primary text-primary animate-pulse'
              : 'border-border/40 text-muted-foreground hover:border-primary hover:text-primary'
          } disabled:opacity-30`}
          title={isSpeaking ? 'Stop voice' : 'Replay via ElevenLabs'}
        >
          {isSpeaking ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
        </button>
      </div>

      {/* Message Panel */}
      <div className="glass-panel rounded-lg p-2.5 flex-1 relative overflow-hidden min-h-0">
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>
        {isLoading || hintLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="text-[11px]">Dr. GEMMA thinking...</span>
          </div>
        ) : aiMessage ? (
          <div>
            <div className="flex items-start gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Dr. GEMMA</span>
            </div>
            <p className="text-[11px] text-foreground/90 leading-relaxed">{aiMessage}</p>
            {isSpeaking && (
              <div className="flex items-center gap-1 mt-1.5">
                <Volume2 className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-[9px] text-primary">Speaking via ElevenLabs...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground text-center">Ask for coaching or a hint</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-1.5">
        <Button
          onClick={handleGetAdvice}
          disabled={isLoading || hintLoading}
          size="sm"
          className="flex-1 h-8 text-[10px] gap-1 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
          variant="outline"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
          Coach
        </Button>
        <Button
          onClick={handleHint}
          disabled={isLoading || hintLoading}
          size="sm"
          className="flex-1 h-8 text-[10px] gap-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
          variant="outline"
        >
          {hintLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}
          Hint
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-primary/30 text-primary/70">GEMMA</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-accent/30 text-accent/70">ElevenLabs</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-green-500/30 text-green-400/70">MongoDB</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400/70">Snowflake</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-orange-500/30 text-orange-400/70">Auth0</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400/70">Solana</span>
      </div>
    </div>
  );
}
