export type ToolId =
  | 'none'
  | 'syringe'
  | 'scalpel'
  | 'drill'
  | 'scissors'
  | 'probe'
  | 'aspirator'
  | 'forceps'
  | 'suture';

export interface SurgicalTool {
  id: ToolId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export type StepInteraction = 'button' | 'click' | 'drag' | 'probe';

export interface SurgicalStep {
  id: number;
  title: string;
  phase: string;
  description: string;
  instruction: string;
  detailedGuide: string;
  toolRequired: ToolId;
  requiredActions: number;
  interaction: StepInteraction;
  layerTarget: BrainLayer;
  completionMessage: string;
}

export type BrainLayer =
  | 'none'
  | 'scalp'
  | 'skull'
  | 'dura'
  | 'brain'
  | 'tumor'
  | 'bleeding'
  | 'any';

export interface LayerState {
  scalp: { visible: boolean; opacity: number; incised: boolean; incisionProgress: number };
  skull: { visible: boolean; opacity: number; drillPoints: number[] };
  dura: { visible: boolean; opacity: number; opened: boolean; sutureProgress: number };
  brain: { visible: boolean; opacity: number };
  tumor: { visible: boolean; size: number; found: boolean };
  bleeding: { points: BleedingPoint[] };
}

export interface BleedingPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  stopped: boolean;
}

export interface Vitals {
  heartRate: number;
  bloodPressure: string;
  spo2: number;
  temperature: number;
  etco2: number;
}

export interface SimulatorState {
  currentStep: number;
  actionsCompleted: number;
  activeTool: ToolId;
  layerState: LayerState;
  vitals: Vitals;
  tumorProgress: number; // 0-1, reaches 1 when fully removed
  isComplete: boolean;
  sessionStartTime: number;
  feedback: string;
  feedbackType: 'info' | 'success' | 'warning' | 'error';
  isLoggedIn: boolean;
  userProfile: UserProfile | null;
  aiCoachMessage: string;
  isAILoading: boolean;
  isSpeaking: boolean;
  sessionId: string;
  score: number;
  achievements: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  specialty: string;
  simulationsCompleted: number;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  stepsCompleted: number;
  score: number;
  totalTime?: number;
  completed: boolean;
}

export interface AnalyticsEvent {
  sessionId: string;
  userId: string;
  eventType: string;
  step: number;
  tool: ToolId;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export const SURGICAL_TOOLS: SurgicalTool[] = [
  { id: 'syringe', name: 'Syringe', description: 'Administer anesthesia', icon: 'Syringe', color: '#60a5fa' },
  { id: 'scalpel', name: 'Scalpel', description: 'Make precise incisions', icon: 'Scissors', color: '#f87171' },
  { id: 'drill', name: 'Bone Drill', description: 'Craniotomy drill', icon: 'Drill', color: '#fbbf24' },
  { id: 'scissors', name: 'Micro-scissors', description: 'Open dura mater', icon: 'Scissors', color: '#a78bfa' },
  { id: 'probe', name: 'Neural Probe', description: 'Identify tumor', icon: 'Zap', color: '#34d399' },
  { id: 'aspirator', name: 'US Aspirator', description: 'Remove tumor tissue', icon: 'Wind', color: '#f59e0b' },
  { id: 'forceps', name: 'Bipolar Forceps', description: 'Hemostasis control', icon: 'Zap', color: '#ef4444' },
  { id: 'suture', name: 'Suture', description: 'Close incisions', icon: 'GitBranch', color: '#10b981' },
];

export const SURGICAL_STEPS: SurgicalStep[] = [
  {
    id: 0,
    title: 'Patient Preparation',
    phase: 'Pre-Op',
    description: 'Prepare the patient for neurosurgery. Verify all vital signs are stable and confirm surgical positioning.',
    instruction: 'Review patient vitals and click CONFIRM VITALS to proceed.',
    detailedGuide: 'Ensure patient is supine with head elevated 15-20°. Confirm BP < 160/100, HR 60-100, SpO2 > 95%. Check that all monitoring leads are attached.',
    toolRequired: 'none',
    requiredActions: 1,
    interaction: 'button',
    layerTarget: 'none',
    completionMessage: 'Patient vitals confirmed. Proceeding to anesthesia.',
  },
  {
    id: 1,
    title: 'Anesthesia Administration',
    phase: 'Pre-Op',
    description: 'Administer general anesthesia and confirm the patient is under before proceeding.',
    instruction: 'Select the Syringe tool and click on the patient to administer anesthesia.',
    detailedGuide: 'Inject propofol 2mg/kg IV for induction followed by sevoflurane 2% for maintenance. Confirm loss of consciousness and establish airway.',
    toolRequired: 'syringe',
    requiredActions: 1,
    interaction: 'click',
    layerTarget: 'scalp',
    completionMessage: 'Anesthesia administered. Patient is under.',
  },
  {
    id: 2,
    title: 'Scalp Incision',
    phase: 'Craniotomy',
    description: 'Create a horseshoe-shaped incision through the scalp to expose the underlying skull.',
    instruction: 'Select Scalpel and click 3 points along the scalp to trace the incision arc.',
    detailedGuide: 'Make a curved incision from the right temporal to parietal region. Apply hemostatic clips. Reflect the scalp flap anteriorly.',
    toolRequired: 'scalpel',
    requiredActions: 3,
    interaction: 'click',
    layerTarget: 'scalp',
    completionMessage: 'Scalp incision complete. Scalp flap reflected.',
  },
  {
    id: 3,
    title: 'Craniotomy',
    phase: 'Craniotomy',
    description: 'Drill 6 burr holes in a circular pattern to create the bone flap for skull removal.',
    instruction: 'Select Bone Drill and click 6 positions around the craniotomy circle.',
    detailedGuide: 'Use a high-speed pneumatic drill to create 6 burr holes, then connect them with the craniotome saw. Lift the bone flap carefully.',
    toolRequired: 'drill',
    requiredActions: 6,
    interaction: 'click',
    layerTarget: 'skull',
    completionMessage: 'Craniotomy complete. Bone flap removed.',
  },
  {
    id: 4,
    title: 'Dura Mater Opening',
    phase: 'Exposure',
    description: 'Carefully open the dura mater to expose the brain surface without damaging it.',
    instruction: 'Select Micro-scissors and click 3 points to cut through the dura mater.',
    detailedGuide: 'Make a C-shaped dural incision with the base at the superior sagittal sinus. Use bipolar coagulation on dural vessels. Reflect the dural flap.',
    toolRequired: 'scissors',
    requiredActions: 3,
    interaction: 'click',
    layerTarget: 'dura',
    completionMessage: 'Dura opened successfully. Brain surface exposed.',
  },
  {
    id: 5,
    title: 'Tumor Identification',
    phase: 'Resection',
    description: 'Use the neural probe to scan the brain surface and identify the tumor\'s exact location.',
    instruction: 'Select Neural Probe and click on the brain surface to scan for the tumor.',
    detailedGuide: 'Use intraoperative ultrasound and neuronavigation to locate the mass. The tumor will glow when the probe is in range.',
    toolRequired: 'probe',
    requiredActions: 1,
    interaction: 'probe',
    layerTarget: 'brain',
    completionMessage: 'Tumor located. Glioblastoma confirmed at target site.',
  },
  {
    id: 6,
    title: 'Tumor Resection',
    phase: 'Resection',
    description: 'Remove the tumor using the ultrasonic aspirator while preserving healthy brain tissue.',
    instruction: 'Select Ultrasonic Aspirator and click the tumor 5 times to remove all tissue.',
    detailedGuide: 'Use CUSA (Cavitron Ultrasonic Surgical Aspirator) at 60% power. Work from center outward. Maintain 2mm safety margin from eloquent cortex.',
    toolRequired: 'aspirator',
    requiredActions: 5,
    interaction: 'click',
    layerTarget: 'tumor',
    completionMessage: 'Gross total resection achieved. Tumor removed.',
  },
  {
    id: 7,
    title: 'Hemostasis',
    phase: 'Hemostasis',
    description: 'Identify and coagulate all bleeding points within the surgical cavity.',
    instruction: 'Select Bipolar Forceps and click on the 3 bleeding points to stop hemorrhage.',
    detailedGuide: 'Apply bipolar coagulation at 25W to each bleeding vessel. Irrigate the cavity. Apply hemostatic agents (Surgicel) to the resection bed.',
    toolRequired: 'forceps',
    requiredActions: 3,
    interaction: 'click',
    layerTarget: 'bleeding',
    completionMessage: 'Hemostasis achieved. No active bleeding.',
  },
  {
    id: 8,
    title: 'Dura Closure',
    phase: 'Closure',
    description: 'Suture the dura mater closed in a watertight fashion to prevent CSF leakage.',
    instruction: 'Select Suture and click 4 points to close the dural opening.',
    detailedGuide: 'Use 4-0 Nurolon suture in running locking fashion. Test for watertight closure by Valsalva maneuver. Apply fibrin glue if needed.',
    toolRequired: 'suture',
    requiredActions: 4,
    interaction: 'click',
    layerTarget: 'dura',
    completionMessage: 'Dura closed watertight. CSF leakage confirmed absent.',
  },
  {
    id: 9,
    title: 'Wound Closure',
    phase: 'Closure',
    description: 'Replace the bone flap and close all layers of the scalp incision.',
    instruction: 'Select Suture and click 4 positions to close the bone flap and scalp.',
    detailedGuide: 'Secure bone flap with titanium plates and screws. Close galea with 2-0 Vicryl. Close skin with 3-0 nylon interrupted sutures.',
    toolRequired: 'suture',
    requiredActions: 4,
    interaction: 'click',
    layerTarget: 'scalp',
    completionMessage: 'Surgery complete! Excellent work, surgeon.',
  },
];

export const INITIAL_VITALS: Vitals = {
  heartRate: 78,
  bloodPressure: '128/82',
  spo2: 98,
  temperature: 98.6,
  etco2: 38,
};

export const SURGICAL_VITALS: Vitals = {
  heartRate: 62,
  bloodPressure: '110/68',
  spo2: 99,
  temperature: 97.8,
  etco2: 35,
};
