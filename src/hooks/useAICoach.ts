import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SurgicalStep, ToolId } from '@/types/simulator';

const HINT_FALLBACKS: Record<number, string> = {
  0: 'Check that heart rate, blood pressure, and SpO2 are within normal range, then confirm.',
  1: 'Select the syringe tool and click the scalp to administer anesthesia.',
  2: 'Use the scalpel to make 3 incisions along the scalp in a horseshoe pattern.',
  3: 'Drill 6 burr holes around the craniotomy site with constant saline irrigation.',
  4: 'Use scissors to cut the dura in 3 careful strokes parallel to cortical vessels.',
  5: 'Select the probe and click the brain to identify the tumor with neuronavigation.',
  6: 'Use the aspirator to resect the tumor centripetally in 5 passes.',
  7: 'Apply bipolar forceps to each bleeding point to achieve hemostasis.',
  8: 'Suture the dura closed with 4 watertight stitches to prevent CSF leak.',
  9: 'Close the scalp wound with 4 sutures, securing the bone flap firmly.',
};

export function useAICoach() {
  const getCoachingAdvice = useCallback(async (
    step: SurgicalStep,
    activeTool: ToolId,
    actionsCompleted: number,
    onMessage: (msg: string, loading: boolean) => void
  ) => {
    onMessage('', true);
    const prompt = `Neurosurgical coach. Step ${step.id + 1}: "${step.title}". Tool: ${activeTool || 'none'}. Progress: ${actionsCompleted}/${step.requiredActions}. Context: ${step.detailedGuide}. Give a precise coaching tip in 2–3 sentences.`;
    try {
      const { data, error } = await supabase.functions.invoke('surgical-coach', {
        body: { prompt, step: step.id }
      });
      if (error) throw error;
      onMessage(data?.message || step.description, false);
    } catch {
      onMessage(`${step.description} ${step.detailedGuide.split('.')[0]}.`, false);
    }
  }, []);

  const getStepIntroduction = useCallback(async (
    step: SurgicalStep,
    onMessage: (msg: string, loading: boolean) => void
  ) => {
    onMessage('', true);
    const prompt = `Neurosurgical coach. Introduce step ${step.id + 1}: "${step.title}" in 1–2 sentences. Be clinical and motivating.`;
    try {
      const { data, error } = await supabase.functions.invoke('surgical-coach', {
        body: { prompt, step: step.id }
      });
      if (error) throw error;
      onMessage(data?.message || step.description, false);
    } catch {
      onMessage(step.description, false);
    }
  }, []);

  const getHint = useCallback(async (step: SurgicalStep): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('surgical-coach', {
        body: { step: step.id, action: 'hint' }
      });
      if (error) throw error;
      return data?.message || HINT_FALLBACKS[step.id] || 'Click on the highlighted area to proceed.';
    } catch {
      return HINT_FALLBACKS[step.id] || 'Click on the highlighted area to proceed.';
    }
  }, []);

  return { getCoachingAdvice, getStepIntroduction, getHint };
}
