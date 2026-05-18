import { useState, useCallback, useRef } from 'react';
import {
  SimulatorState,
  ToolId,
  BrainLayer,
  LayerState,
  SURGICAL_STEPS,
  INITIAL_VITALS,
  SURGICAL_VITALS,
  UserProfile,
} from '@/types/simulator';
import { supabase } from '@/integrations/supabase/client';

const INITIAL_LAYER_STATE: LayerState = {
  scalp: { visible: true, opacity: 1, incised: false, incisionProgress: 0 },
  skull: { visible: false, opacity: 0, drillPoints: [] },
  dura: { visible: false, opacity: 0, opened: false, sutureProgress: 0 },
  brain: { visible: false, opacity: 0 },
  tumor: { visible: false, size: 1, found: false },
  bleeding: {
    points: [
      { id: 0, x: 0.4, y: 0.5, z: 0.8, stopped: false },
      { id: 1, x: -0.3, y: 0.7, z: 0.7, stopped: false },
      { id: 2, x: 0.1, y: 0.3, z: 0.95, stopped: false },
    ],
  },
};

const INITIAL_STATE: SimulatorState = {
  currentStep: 0,
  actionsCompleted: 0,
  activeTool: 'none',
  layerState: INITIAL_LAYER_STATE,
  vitals: INITIAL_VITALS,
  tumorProgress: 0,
  isComplete: false,
  sessionStartTime: Date.now(),
  feedback: 'Welcome to the OR. Patient is ready for surgery.',
  feedbackType: 'info',
  isLoggedIn: false,
  userProfile: null,
  aiCoachMessage: '',
  isAILoading: false,
  isSpeaking: false,
  sessionId: `session_${Date.now()}`,
  score: 100,
  achievements: [],
};

export function useSimulator() {
  const [state, setState] = useState<SimulatorState>(INITIAL_STATE);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFeedback = useCallback((message: string, type: SimulatorState['feedbackType'] = 'info') => {
    setState(prev => ({ ...prev, feedback: message, feedbackType: type }));
  }, []);

  const setActiveTool = useCallback((tool: ToolId) => {
    setState(prev => ({ ...prev, activeTool: tool }));
    const step = SURGICAL_STEPS[state.currentStep];
    if (step.toolRequired !== 'none' && tool === step.toolRequired) {
      setFeedback(`${tool.charAt(0).toUpperCase() + tool.slice(1)} selected. ${step.instruction}`, 'info');
    }
  }, [state.currentStep, setFeedback]);

  const advanceStep = useCallback(() => {
    setState(prev => {
      const nextStep = prev.currentStep + 1;
      const isComplete = nextStep >= SURGICAL_STEPS.length;

      // Calculate score bonus
      const timeBonus = Math.max(0, 10 - Math.floor((Date.now() - prev.sessionStartTime) / 30000));

      // Update layer state based on completed step
      const newLayerState = { ...prev.layerState };
      switch (prev.currentStep) {
        case 1: // After anesthesia - vitals slow
          break;
        case 2: // After scalp incision - show skull
          newLayerState.scalp = { ...newLayerState.scalp, incised: true, incisionProgress: 1 };
          newLayerState.skull = { visible: true, opacity: 1, drillPoints: [] };
          break;
        case 3: // After craniotomy - show dura
          newLayerState.skull = { ...newLayerState.skull, drillPoints: [0,1,2,3,4,5] };
          newLayerState.dura = { visible: true, opacity: 1, opened: false, sutureProgress: 0 };
          break;
        case 4: // After dura opening - show brain
          newLayerState.dura = { ...newLayerState.dura, opened: true };
          newLayerState.brain = { visible: true, opacity: 1 };
          newLayerState.tumor = { visible: true, size: 1, found: false };
          break;
        case 5: // After tumor ID
          newLayerState.tumor = { ...newLayerState.tumor, found: true };
          break;
        case 6: // After tumor resection
          newLayerState.tumor = { ...newLayerState.tumor, visible: false, size: 0 };
          break;
        case 7: // After hemostasis
          newLayerState.bleeding = {
            points: newLayerState.bleeding.points.map(p => ({ ...p, stopped: true }))
          };
          break;
        case 8: // After dura closure
          newLayerState.dura = { ...newLayerState.dura, sutureProgress: 1 };
          break;
        case 9: // After wound closure
          newLayerState.scalp = { ...newLayerState.scalp, incisionProgress: 0 };
          break;
      }

      return {
        ...prev,
        currentStep: isComplete ? prev.currentStep : nextStep,
        actionsCompleted: 0,
        activeTool: 'none',
        layerState: newLayerState,
        isComplete,
        score: prev.score + timeBonus,
        feedback: isComplete
          ? 'Surgery complete! Outstanding performance.'
          : SURGICAL_STEPS[nextStep]?.instruction || '',
        feedbackType: 'success',
        vitals: nextStep >= 2 ? SURGICAL_VITALS : prev.vitals,
      };
    });
  }, []);

  const performAction = useCallback((layer: BrainLayer) => {
    const step = SURGICAL_STEPS[state.currentStep];

    // Check correct tool
    if (step.toolRequired !== 'none' && state.activeTool !== step.toolRequired) {
      setFeedback(`Wrong tool! You need the ${step.toolRequired} for this step.`, 'warning');
      setState(prev => ({ ...prev, score: Math.max(0, prev.score - 2) }));
      return;
    }

    // Check correct layer
    if (step.layerTarget !== 'any' && step.layerTarget !== 'none' && layer !== step.layerTarget) {
      if (layer !== 'none') {
        setFeedback(`Click on the ${step.layerTarget} to proceed.`, 'warning');
      }
      return;
    }

    setState(prev => {
      const newActionsCompleted = prev.actionsCompleted + 1;
      const stepComplete = newActionsCompleted >= step.requiredActions;

      // Update tumor progress
      let newTumorProgress = prev.tumorProgress;
      if (step.id === 6) {
        newTumorProgress = Math.min(1, newActionsCompleted / step.requiredActions);
      }

      // Update bleeding points
      const newLayerState = { ...prev.layerState };
      if (step.id === 7) {
        const stoppedIndex = newLayerState.bleeding.points.findIndex(p => !p.stopped);
        if (stoppedIndex >= 0) {
          const newPoints = [...newLayerState.bleeding.points];
          newPoints[stoppedIndex] = { ...newPoints[stoppedIndex], stopped: true };
          newLayerState.bleeding = { points: newPoints };
        }
      }

      return {
        ...prev,
        actionsCompleted: newActionsCompleted,
        tumorProgress: newTumorProgress,
        layerState: newLayerState,
        feedback: stepComplete
          ? step.completionMessage
          : `${step.title}: ${newActionsCompleted}/${step.requiredActions} actions`,
        feedbackType: stepComplete ? 'success' : 'info',
      };
    });

    if (state.actionsCompleted + 1 >= step.requiredActions) {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = setTimeout(() => {
        advanceStep();
      }, 1200);
    }
  }, [state.currentStep, state.activeTool, state.actionsCompleted, advanceStep, setFeedback]);

  const confirmVitals = useCallback(() => {
    if (state.currentStep === 0) {
      setFeedback('Vitals confirmed. Proceeding to anesthesia administration.', 'success');
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = setTimeout(() => {
        advanceStep();
      }, 1200);
    }
  }, [state.currentStep, advanceStep, setFeedback]);

  const setAICoachMessage = useCallback((message: string, isLoading = false) => {
    setState(prev => ({ ...prev, aiCoachMessage: message, isAILoading: isLoading }));
  }, []);

  const setIsSpeaking = useCallback((speaking: boolean) => {
    setState(prev => ({ ...prev, isSpeaking: speaking }));
  }, []);

  const login = useCallback((profile: UserProfile) => {
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      userProfile: profile,
      sessionStartTime: Date.now(),
      sessionId: `session_${profile.id}_${Date.now()}`,
    }));
  }, []);

  const logout = useCallback(() => {
    setState(prev => ({ ...prev, isLoggedIn: false, userProfile: null }));
  }, []);

  const saveSession = useCallback(async () => {
    if (!state.userProfile) return;
    try {
      await supabase.functions.invoke('save-session', {
        body: {
          sessionId: state.sessionId,
          userId: state.userProfile.id,
          stepsCompleted: state.currentStep + 1,
          score: state.score,
          totalTime: Math.floor((Date.now() - state.sessionStartTime) / 1000),
          completed: state.isComplete,
        }
      });
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  }, [state]);

  const logAnalytics = useCallback(async (eventType: string, metadata: Record<string, unknown> = {}) => {
    if (!state.userProfile) return;
    try {
      await supabase.functions.invoke('log-analytics', {
        body: {
          sessionId: state.sessionId,
          userId: state.userProfile.id,
          eventType,
          step: state.currentStep,
          tool: state.activeTool,
          timestamp: Date.now(),
          metadata,
        }
      });
    } catch (err) {
      console.error('Analytics log failed:', err);
    }
  }, [state]);

  const resetSimulator = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      isLoggedIn: state.isLoggedIn,
      userProfile: state.userProfile,
      sessionStartTime: Date.now(),
      sessionId: `session_${state.userProfile?.id}_${Date.now()}`,
    });
  }, [state.isLoggedIn, state.userProfile]);

  return {
    state,
    setActiveTool,
    performAction,
    confirmVitals,
    setAICoachMessage,
    setIsSpeaking,
    login,
    logout,
    saveSession,
    logAnalytics,
    resetSimulator,
  };
}
