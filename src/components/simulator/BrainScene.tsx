import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LayerState, BrainLayer, ToolId } from '@/types/simulator';

interface BrainSceneProps {
  currentStep: number;
  activeTool: ToolId;
  layerState: LayerState;
  tumorProgress: number;
  onAction: (layer: BrainLayer) => void;
  showHighlight?: boolean;
}

// ── Anatomically accurate cerebrum geometry ─────────────────────────────────
function createBrainGeo(r: number, segs: number) {
  const geo = new THREE.SphereGeometry(r, segs, segs);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 1e-4) continue;

    const nx = x / len, ny = y / len, nz = z / len;
    const phi = Math.acos(Math.max(-1, Math.min(1, ny)));   // 0=top, π=bottom
    const theta = Math.atan2(nz, nx);                        // azimuthal

    // Multi-scale gyri/sulci
    let d =
      Math.sin(phi * 10 + theta * 7) * 0.048 +
      Math.sin(phi * 17 + theta * 11) * 0.028 +
      Math.sin(phi * 26 + theta * 17) * 0.014 +
      Math.cos(phi * 8  - theta * 5 ) * 0.032 +
      Math.cos(phi * 14 + theta * 3 ) * 0.018 +
      Math.sin(phi * 34 + theta * 23) * 0.008; // micro-gyri detail

    // Interhemispheric (longitudinal) fissure — deep midline cleft, upper brain
    d -= Math.exp(-nx * nx * 40) * Math.max(0, ny) * 0.22;

    // Sylvian fissure — lateral, separates frontal/parietal from temporal
    d -= Math.exp(-Math.pow(ny + 0.05, 2) * 14) *
         Math.exp(-Math.pow(Math.abs(nx) - 0.45, 2) * 10) * 0.075;

    // Central sulcus — runs crown-to-lateral on each hemisphere
    d -= Math.exp(-Math.pow(nz - 0.18, 2) * 30) *
         Math.max(0, ny - 0.2) * 0.052;

    // Parieto-occipital sulcus — posterior upper
    d -= Math.exp(-Math.pow(nz + 0.55, 2) * 18) *
         Math.max(0, ny - 0.1) * 0.038;

    // Inferior flattening (base / brainstem attachment)
    d -= Math.max(0, -ny - 0.25) * 0.1;

    const rr = len + d;
    pos.setXYZ(i, nx * rr, ny * rr, nz * rr);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere(); // fix raycaster culling after displacement
  return geo;
}

// ── Cerebellum: oblate with dense transverse folia ──────────────────────────
function createCerebellumGeo() {
  const geo = new THREE.SphereGeometry(0.38, 52, 32);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 1e-4) continue;

    const nx = x / len, ny = y / len, nz = z / len;
    const phi = Math.acos(Math.max(-1, Math.min(1, ny)));

    // Dense folia (horizontal leaves) running mediolaterally
    const folia =
      Math.sin(phi * 30) * 0.034 +
      Math.sin(phi * 52) * 0.016 +
      Math.cos(phi * 18 - nx * 4) * 0.012;

    // Vermis groove along midline
    const vermis = Math.exp(-nx * nx * 35) * 0.04;

    const rr = len + folia - vermis;
    // Oblate: wider than tall; slightly elongated front-back
    pos.setXYZ(i, nx * rr * 1.38, ny * rr * 0.50, nz * rr * 1.1);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// ── Lighting ─────────────────────────────────────────────────────────────────
function setupLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0x1a2035, 1.4));

  const spot = new THREE.SpotLight(0xfff8f0, 80);
  spot.position.set(0, 8, 2);
  spot.angle = 0.4;
  spot.penumbra = 0.5;
  scene.add(spot);

  const fill = new THREE.PointLight(0xe8f4ff, 22);
  fill.position.set(0, 0, 5);
  scene.add(fill);

  const rim = new THREE.PointLight(0x1e3a5f, 9);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  const accent = new THREE.PointLight(0xede9fe, 10);
  accent.position.set(4, 2, 2);
  scene.add(accent);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BrainScene({ currentStep, activeTool, layerState, tumorProgress, onAction, showHighlight }: BrainSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ currentStep, activeTool, layerState, tumorProgress, onAction, showHighlight });
  useEffect(() => { propsRef.current = { currentStep, activeTool, layerState, tumorProgress, onAction, showHighlight }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    setupLights(scene);

    const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 4.8);

    const controls = new OrbitControls(camera, canvas);
    Object.assign(controls, {
      enablePan: false, minDistance: 2.5, maxDistance: 7,
      enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.6,
      minPolarAngle: 0.3, maxPolarAngle: Math.PI - 0.3,
    });

    // ── Brain group ────────────────────────────────────────────────────────
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Scalp
    const scalpMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.95, metalness: 0.02 });
    const scalpMesh = new THREE.Mesh(new THREE.SphereGeometry(1.62, 48, 48), scalpMat);
    brainGroup.add(scalpMesh);

    // Skull
    const skullMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc8, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 1,
    });
    const skullMesh = new THREE.Mesh(new THREE.SphereGeometry(1.47, 48, 48), skullMat);
    skullMesh.visible = false;
    brainGroup.add(skullMesh);

    // Dura
    const duraMat = new THREE.MeshStandardMaterial({
      color: 0x7393b3, roughness: 0.4, metalness: 0.1, transparent: true, opacity: 0.75,
    });
    const duraMesh = new THREE.Mesh(new THREE.SphereGeometry(1.32, 48, 48), duraMat);
    duraMesh.visible = false;
    brainGroup.add(duraMesh);

    // ── Cerebrum (anatomical) ────────────────────────────────────────────
    const brainMat = new THREE.MeshStandardMaterial({
      color: 0xcb9090,
      roughness: 0.82, metalness: 0.06,
      emissive: new THREE.Color(0xff2222), emissiveIntensity: 0,
    });
    const brainGeo = createBrainGeo(1.18, 80);
    const brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainMesh.visible = false;
    brainGroup.add(brainMesh);

    // ── Cerebellum ────────────────────────────────────────────────────────
    const cerebellumMat = new THREE.MeshStandardMaterial({
      color: 0xc09088, roughness: 0.85, metalness: 0.04,
    });
    const cerebellumMesh = new THREE.Mesh(createCerebellumGeo(), cerebellumMat);
    cerebellumMesh.position.set(0, -0.72, -0.68);
    cerebellumMesh.rotation.x = 0.15;
    cerebellumMesh.visible = false;
    brainGroup.add(cerebellumMesh);

    // ── Brainstem ─────────────────────────────────────────────────────────
    const brainstemMat = new THREE.MeshStandardMaterial({ color: 0xd4b0a8, roughness: 0.75, metalness: 0.04 });
    const brainstemGeo = new THREE.CylinderGeometry(0.115, 0.165, 0.5, 18);
    const brainstemMesh = new THREE.Mesh(brainstemGeo, brainstemMat);
    brainstemMesh.position.set(0.02, -1.1, 0.12);
    brainstemMesh.rotation.z = 0.08;
    brainstemMesh.visible = false;
    brainGroup.add(brainstemMesh);

    // ── Corpus callosum ridge (midline white matter band) ─────────────────
    const corpusMat = new THREE.MeshStandardMaterial({ color: 0xe8d8d0, roughness: 0.6, metalness: 0.08 });
    const corpusMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 12), corpusMat);
    corpusMesh.rotation.z = Math.PI / 2;
    corpusMesh.position.set(0, 0.05, 0);
    corpusMesh.visible = false;
    brainGroup.add(corpusMesh);

    // ── Tumor ─────────────────────────────────────────────────────────────
    const tumorGlowMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea, transparent: true, opacity: 0, side: THREE.BackSide,
    });
    const tumorGlowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), tumorGlowMat);
    tumorGlowMesh.position.set(0.25, 0.15, 0.65);
    tumorGlowMesh.visible = false;
    brainGroup.add(tumorGlowMesh);

    const tumorMat = new THREE.MeshStandardMaterial({
      color: 0x6b21a8, roughness: 0.6, metalness: 0.2,
      emissive: new THREE.Color(0x3b0764), emissiveIntensity: 0.5,
    });
    const tumorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), tumorMat);
    tumorMesh.position.set(0.25, 0.15, 0.65);
    tumorMesh.visible = false;
    brainGroup.add(tumorMesh);

    // ── Bleeding points ───────────────────────────────────────────────────
    const bleedPositions: [number, number, number][] = [
      [0.5, 0.7, 0.45], [-0.3, 0.65, 0.6], [0.1, 0.8, 0.35],
    ];
    const bleedMeshes = bleedPositions.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      const r = 1.22;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xef4444, emissive: new THREE.Color(0xef4444), emissiveIntensity: 0.8,
          transparent: true, opacity: 0.9,
        })
      );
      m.position.set(x / len * r, y / len * r, z / len * r);
      m.visible = false;
      brainGroup.add(m);
      return m;
    });

    // ── Highlight ring (fixed in world space, faces camera) ───────────────
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false,
    });
    const hlRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 12, 48), hlMat);
    scene.add(hlRing); // NOT in brainGroup — stays in world space

    // Where to point the highlight per step (world-space position facing camera)
    const hlPositions: Record<number, [number, number, number]> = {
      1: [0, 0.2, 1.72], 2: [0, 0.2, 1.72], 9: [0, 0.2, 1.72],
      3: [0, 0.2, 1.55],
      4: [0, 0.2, 1.40], 8: [0, 0.2, 1.40],
      5: [0, 0.2, 1.30],
      6: [0.15, 0.1, 1.30],
      7: [0.3, 0.5, 1.30],
    };

    // ── Hotspot spheres — simple spheres at hlPositions, guaranteed clickable ─
    const HS_DEF: { steps: number[]; pos: [number,number,number]; layer: BrainLayer }[] = [
      { steps: [1,2,9], pos: [0,    0.2,  1.72], layer: 'scalp'    },
      { steps: [3],     pos: [0,    0.2,  1.55], layer: 'skull'    },
      { steps: [4,8],   pos: [0,    0.2,  1.40], layer: 'dura'     },
      { steps: [5],     pos: [0,    0.2,  1.30], layer: 'brain'    },
      { steps: [6],     pos: [0.15, 0.1,  1.30], layer: 'tumor'    },
      { steps: [7],     pos: [0.3,  0.5,  1.30], layer: 'bleeding' },
    ];
    const hotMats: THREE.MeshBasicMaterial[] = [];
    const hotMeshes = HS_DEF.map(h => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.4, depthTest: false });
      hotMats.push(mat);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), mat);
      m.position.set(...h.pos);
      m.visible = false;
      scene.add(m); // world space — not in brainGroup
      return m;
    });
    const hotLayerMap = new Map(hotMeshes.map((m, i) => [m, HS_DEF[i].layer]));

    // ── Raycaster ─────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getLayer = (m: THREE.Mesh): BrainLayer | null => {
      if (m === scalpMesh) return 'scalp';
      if (m === skullMesh) return 'skull';
      if (m === duraMesh) return 'dura';
      if (m === brainMesh) return 'brain';
      if (m === tumorMesh) return 'tumor';
      if (bleedMeshes.includes(m)) return 'bleeding';
      return hotLayerMap.get(m) ?? null;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      // Hotspots checked first — guaranteed hits, no complex geometry interference
      const hotHits = raycaster.intersectObjects(hotMeshes.filter(m => m.visible), false);
      if (hotHits.length > 0) {
        const layer = hotLayerMap.get(hotHits[0].object as THREE.Mesh);
        if (layer) { propsRef.current.onAction(layer); return; }
      }
      // Fallback: regular mesh hit
      const clickables = [scalpMesh, skullMesh, duraMesh, brainMesh, tumorMesh, ...bleedMeshes].filter(m => m.visible);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const layer = getLayer(hits[0].object as THREE.Mesh);
        if (layer) propsRef.current.onAction(layer);
      }
    };
    canvas.addEventListener('click', handleClick);

    // ── Resize ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // ── Animation loop ────────────────────────────────────────────────────
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const p = propsRef.current;
      const t = Date.now() * 0.001;
      const ls = p.layerState;

      brainGroup.rotation.y += 0.001;

      // Scalp
      scalpMesh.visible = !ls.skull.visible;
      if (scalpMesh.visible) {
        scalpMat.opacity = THREE.MathUtils.lerp(scalpMat.opacity, ls.scalp.incised ? 0.05 : 1, 0.04);
        scalpMat.transparent = scalpMat.opacity < 0.99;
      }

      // Skull
      skullMesh.visible = ls.skull.visible && !ls.dura.visible;
      if (skullMesh.visible) {
        const tgt = ls.skull.drillPoints.length >= 6 ? 0 : 1;
        skullMat.opacity = THREE.MathUtils.lerp(skullMat.opacity, tgt, 0.05);
        skullMat.transparent = skullMat.opacity < 0.99;
      }

      // Dura
      duraMesh.visible = ls.dura.visible;
      if (ls.dura.visible) {
        const tgt = ls.dura.opened ? Math.max(0, 0.75 - ls.dura.sutureProgress * 0.75) : 0.75;
        duraMat.opacity = THREE.MathUtils.lerp(duraMat.opacity, tgt, 0.05);
      }

      // Cerebrum + structures
      const showBrain = ls.brain.visible;
      brainMesh.visible = showBrain;
      cerebellumMesh.visible = showBrain;
      brainstemMesh.visible = showBrain;
      corpusMesh.visible = showBrain;
      if (showBrain) {
        const highlighted = p.currentStep === 5 && p.activeTool === 'probe';
        brainMesh.scale.setScalar(1 + Math.sin(t * 1.2) * 0.004);
        brainMat.color.lerp(highlighted ? new THREE.Color(0xff7070) : new THREE.Color(0xcb9090), 0.05);
        brainMat.emissiveIntensity = THREE.MathUtils.lerp(brainMat.emissiveIntensity, highlighted ? 0.12 : 0, 0.05);
      }

      // Tumor
      tumorMesh.visible = ls.tumor.visible;
      tumorGlowMesh.visible = ls.tumor.visible;
      if (ls.tumor.visible) {
        tumorMesh.scale.setScalar(
          THREE.MathUtils.lerp(tumorMesh.scale.x, Math.max(0.001, 1 - p.tumorProgress), 0.08)
        );
        tumorGlowMesh.scale.setScalar(tumorMesh.scale.x * 1.4);
        const gTgt = ls.tumor.found ? 0.35 + Math.sin(t * 3) * 0.15 : 0;
        tumorGlowMat.opacity = THREE.MathUtils.lerp(tumorGlowMat.opacity, gTgt, 0.08);
      }

      // Bleeding
      const showBleed = p.currentStep === 7;
      bleedMeshes.forEach((m, i) => {
        const pt = ls.bleeding.points[i];
        m.visible = showBleed && !!pt && !pt.stopped;
        if (m.visible) m.scale.setScalar(1 + Math.sin(t * 4 + i) * 0.3);
      });

      // Hotspots: show active one, pulse on highlight
      hotMeshes.forEach((m, i) => {
        const active = HS_DEF[i].steps.includes(p.currentStep);
        m.visible = active;
        if (active) {
          hotMats[i].opacity = p.showHighlight ? 0.85 + Math.sin(t * 5) * 0.12 : 0.38;
          m.scale.setScalar(p.showHighlight ? 1 + Math.sin(t * 4) * 0.2 : 1);
        }
      });

      // Highlight ring
      const hl = p.showHighlight;
      const hlPos = hlPositions[p.currentStep];
      if (hl && hlPos) {
        hlRing.position.set(...hlPos);
        hlRing.lookAt(camera.position);
        hlMat.opacity = 0.55 + Math.sin(t * 5) * 0.3;
        hlRing.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      } else {
        hlMat.opacity = THREE.MathUtils.lerp(hlMat.opacity, 0, 0.1);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', handleClick);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      brainGeo.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ cursor: 'grab' }} />;
}
