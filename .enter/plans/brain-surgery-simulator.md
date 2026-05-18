# Brain Surgery Simulator — Implementation Plan

## Context
Build a full 3D interactive brain surgery simulator using React Three Fiber, taking the user through all 10 surgical steps with proper tool interactions, dark medical HUD, and vital sign monitors.

## Packages to Install
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — OrbitControls, Html overlay, etc.
- `three` — Three.js core
- `@types/three` — TypeScript types

## Design System (index.css)
Dark surgical theme:
- `--background`: deep dark navy/black `220 20% 5%`
- `--primary`: medical green `142 70% 45%`
- `--accent`: cyan/teal `185 80% 50%`
- Custom tokens: `--vital-green`, `--alert-red`, `--surgical-light`, gradients, glow shadows
- Animated pulse keyframes for vitals

## File Structure

```
src/
  pages/Index.tsx                         ← mount BrainSurgerySimulator
  components/simulator/
    BrainSurgerySimulator.tsx             ← top-level state manager
    BrainScene.tsx                        ← R3F Canvas + lights + camera
    BrainModel.tsx                        ← procedural 3D brain (layered spheres + noise-displaced geometry)
    SurgicalTools3D.tsx                   ← 3D tool meshes that follow cursor in scene
    HUD.tsx                               ← overlay: vitals, step progress, feedback
    StepPanel.tsx                         ← left panel with step list + instructions
    ToolPanel.tsx                         ← bottom tool selector bar
    VitalMonitor.tsx                      ← ECG/vitals animated display
    types.ts                              ← shared types (Step, Tool, SurgicalState)
```

## Brain Model Architecture (Procedural)
The brain is built as **concentric interactive layers** that get revealed step by step:
1. **Scalp** — skin-pink sphere, slightly bumped, clipped on top when incised
2. **Skull** — off-white/bone sphere, visible after scalp removed
3. **Dura mater** — semi-transparent blueish-gray
4. **Brain tissue** — pink/gray with noise-displaced vertices simulating gyri/sulci
5. **Tumor** — darker reddish-purple sphere embedded in brain, glows slightly

Each layer has `visible` and `opacity` state controlled by surgical progress.

## 10 Surgical Steps & Interactions

| # | Step | Tool | Interaction | Visual Change |
|---|------|------|-------------|---------------|
| 1 | Patient Preparation | — | Click "Confirm Vitals" button | Vitals stabilize, patient positioned |
| 2 | Anesthesia Confirmation | Syringe | Click patient head region | Vitals slow to surgical baseline |
| 3 | Scalp Incision | Scalpel | Click+drag arc on scalp | Red cut line appears, scalp flap opens |
| 4 | Craniotomy | Bone Drill | Click 6 drill points in circle | Bone dust particles, skull flap forms |
| 5 | Dura Opening | Micro-scissors | Click+drag cross-cut on dura | Dura peels back exposing brain |
| 6 | Tumor Identification | Probe | Move over brain surface, click | Tumor highlights/pulses when found |
| 7 | Tumor Resection | Ultrasonic Aspirator | Click tumor repeatedly | Tumor shrinks with each click |
| 8 | Hemostasis | Bipolar Forceps | Click bleeding points | Red glow fades at clicked spots |
| 9 | Dura Closure | Suture | Click-drag suture line | Dura closes with visible stitches |
| 10 | Bone & Scalp Closure | Suture + Plate | Click bone then scalp | Layers restore, procedure complete |

## State Management (in BrainSurgerySimulator.tsx)
```ts
interface SimulatorState {
  currentStep: number;           // 0-9
  completedActions: number;      // actions done in current step
  requiredActions: number;       // actions needed to advance
  activeToolId: string;
  layerVisibility: LayerState;
  vitals: { hr: number; bp: string; spo2: number; };
  tumorSize: number;             // 1.0 → 0 as resected
  incisionProgress: number[];    // per-step
  gameComplete: boolean;
  feedback: string;              // last action feedback message
}
```

## HUD Layout
```
┌─────────────────────────────────────────────────────────┐
│ [STEP PANEL - LEFT]  [3D BRAIN - CENTER]  [VITALS - RIGHT]│
│  Step 1 ●           │                    │ HR: 62 ♥      │
│  Step 2 ●           │    Brain Scene     │ BP: 110/70    │
│  Step 3 ●           │   (interactive)    │ SpO2: 99%     │
│  Step 4 ○ ← current │                    │ [ECG wave]    │
│  ...                │                    │               │
│─────────────────────────────────────────────────────────│
│     [TOOL BAR - BOTTOM: scalpel | drill | scissors ...]  │
│     [Instruction text for current step]                  │
└─────────────────────────────────────────────────────────┘
```

## Key Technical Details
- Use `@react-three/drei`'s `OrbitControls` (disabled during active interaction)
- Use raycasting via `onClick`/`onPointerMove` on Three.js mesh objects
- Procedural brain geometry: `SphereGeometry` with vertex position displacement using sin/cos noise for gyri effect
- Custom shader material for each brain layer with transparency support
- Particle system for blood drops and bone dust using `Points`
- `useFrame` hook for ECG animation, brain pulsing, and tumor glow
- Tool cursor: a 3D mesh that follows mouse position on brain surface via raycasting

## Files to Modify
- `src/index.css` — full dark surgical design system
- `src/pages/Index.tsx` — mount simulator
- `tailwind.config.ts` — add custom colors and animations

## Verification
- All 10 steps completable in sequence
- Brain layers visibly change as surgery progresses
- Tools respond to clicks with visual/state feedback
- Vitals animate throughout
- Completion screen shows when all steps done
