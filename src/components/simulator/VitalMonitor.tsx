import { useEffect, useRef, useState } from 'react';
import { Heart, Activity, Thermometer, Wind } from 'lucide-react';
import { Vitals } from '@/types/simulator';

interface VitalMonitorProps {
  vitals: Vitals;
  currentStep: number;
}

function ECGCanvas({ heartRate }: { heartRate: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const posRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const mid = H / 2;

    // Initialize with flat line
    if (dataRef.current.length === 0) {
      dataRef.current = new Array(W).fill(mid);
    }

    const bpm = heartRate;
    const period = Math.round((60 / bpm) * 60); // frames per beat
    let frame = 0;

    const generateECGPoint = (phase: number): number => {
      const p = phase % 1;
      // P wave
      if (p < 0.1) return mid - Math.sin(p / 0.1 * Math.PI) * 6;
      // PR segment
      if (p < 0.18) return mid;
      // Q wave
      if (p < 0.21) return mid + (p - 0.18) / 0.03 * 12;
      // R wave (tall spike)
      if (p < 0.24) return mid - (p - 0.21) / 0.03 * (H * 0.7);
      // S wave
      if (p < 0.28) return mid + (0.28 - p) / 0.04 * 8;
      // ST segment
      if (p < 0.4) return mid - 2;
      // T wave
      if (p < 0.55) return mid - Math.sin((p - 0.4) / 0.15 * Math.PI) * 14;
      // Baseline
      return mid;
    };

    const animate = () => {
      // Shift existing data left
      dataRef.current.shift();
      const phase = (frame % period) / period;
      dataRef.current.push(generateECGPoint(phase));
      frame++;

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // ECG line
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 4;

      for (let i = 0; i < dataRef.current.length; i++) {
        if (i === 0) ctx.moveTo(i, dataRef.current[i]);
        else ctx.lineTo(i, dataRef.current[i]);
      }
      ctx.stroke();

      // Scan line (moving dot at front)
      const scanX = dataRef.current.length - 1;
      ctx.beginPath();
      ctx.arc(scanX, dataRef.current[scanX], 2, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.fill();
    };

    const intervalId = setInterval(animate, 1000 / 60);
    return () => clearInterval(intervalId);
  }, [heartRate]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={60}
      className="w-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded border ${alert ? 'border-vital-red/40 bg-vital-red/5' : 'border-border/40 bg-muted/20'}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color} ${alert ? 'animate-blink' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
        <div className={`font-mono-display font-bold text-sm ${color} text-glow-green`}>
          {value}
          <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export function VitalMonitor({ vitals, currentStep }: VitalMonitorProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hrAlert = vitals.heartRate > 100 || vitals.heartRate < 50;
  const spo2Alert = vitals.spo2 < 95;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Patient Monitor</span>
        <span className="text-[10px] text-vital-green font-mono-display animate-blink">● LIVE</span>
      </div>

      {/* ECG Display */}
      <div className="glass-panel rounded p-1.5 relative overflow-hidden">
        <div className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">ECG — Lead II</div>
        <ECGCanvas heartRate={vitals.heartRate} />
      </div>

      {/* Heart Rate Big Display */}
      <div className="glass-panel rounded p-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Heart className={`w-4 h-4 text-vital-red ${!hrAlert ? 'animate-heartbeat' : 'animate-blink'}`} />
          <span className={`font-mono-display text-2xl font-black ${hrAlert ? 'text-vital-red' : 'text-vital-green'} text-glow-green`}>
            {vitals.heartRate}
          </span>
          <span className="text-muted-foreground text-xs">BPM</span>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 gap-1.5 flex-1">
        <VitalCard
          icon={Activity}
          label="Blood Pressure"
          value={vitals.bloodPressure}
          unit="mmHg"
          color="text-vital-cyan"
        />
        <VitalCard
          icon={Wind}
          label="SpO2"
          value={vitals.spo2}
          unit="%"
          color={spo2Alert ? 'text-vital-red' : 'text-vital-green'}
          alert={spo2Alert}
        />
        <VitalCard
          icon={Thermometer}
          label="Temp"
          value={vitals.temperature}
          unit="°F"
          color="text-vital-yellow"
        />
        <VitalCard
          icon={Activity}
          label="EtCO2"
          value={vitals.etco2}
          unit="mmHg"
          color="text-accent"
        />
      </div>

      {/* OR Time */}
      <div className="glass-panel rounded p-1.5 text-center">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">OR Time</div>
        <ORTimer />
      </div>
    </div>
  );
}

function ORTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <div className="font-mono-display text-sm font-bold text-foreground">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}
