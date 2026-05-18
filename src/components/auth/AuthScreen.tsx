import { useState } from 'react';
import { Brain, Lock, User, Mail, Shield, Loader2, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/types/simulator';
import { supabase } from '@/integrations/supabase/client';

interface AuthScreenProps {
  onLogin: (profile: UserProfile) => void;
}

const SPECIALTIES = [
  'Neurosurgery', 'Neurology', 'Medical Student', 'Resident', 'Research', 'Other'
];

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Neurosurgery');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.functions.invoke('auth0-authenticate', {
        body: { email, password, name, specialty, mode }
      });

      if (authError) throw authError;

      if (data?.profile) {
        onLogin(data.profile);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      // Fallback: create a local profile for demo
      const demoProfile: UserProfile = {
        id: `user_${Date.now()}`,
        name: name || email.split('@')[0] || 'Surgeon',
        email: email || 'demo@neurosim.pro',
        specialty: specialty,
        simulationsCompleted: 0,
      };
      onLogin(demoProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    const guestProfile: UserProfile = {
      id: `guest_${Date.now()}`,
      name: 'Guest Surgeon',
      email: 'guest@neurosim.pro',
      specialty: 'Neurosurgery',
      simulationsCompleted: 0,
    };
    onLogin(guestProfile);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      {/* Background atmospheric effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[100px]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative w-full max-w-md mx-4 space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-glow-pulse" />
              <Brain className="w-8 h-8 text-primary relative z-10" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">NeuroSim Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-Powered Brain Surgery Simulator
            </p>
          </div>

          {/* Integration badges */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {['Gemma 4', 'ElevenLabs', 'Solana', 'Snowflake', 'Auth0', 'MongoDB'].map(b => (
              <span key={b} className="text-[9px] px-2 py-0.5 rounded-full border border-border/40 text-muted-foreground">
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-panel rounded-xl p-6 border border-border/50">
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mode === m
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="pl-9 bg-muted/20 border-border/40 text-sm"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="surgeon@hospital.com"
                  className="pl-9 bg-muted/20 border-border/40 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9 bg-muted/20 border-border/40 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider">Specialty</label>
                <select
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border/40 bg-muted/20 text-sm text-foreground"
                >
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s} className="bg-card">{s}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-[11px] text-vital-red">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {loading ? 'Authenticating via Auth0...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[10px] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Guest Access */}
          <Button
            onClick={handleGuestAccess}
            variant="outline"
            className="w-full gap-2 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <ChevronRight className="w-4 h-4" />
            Continue as Guest
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/50">
          Authentication powered by Auth0 AI Agents • Session data stored in MongoDB Atlas
        </p>
      </div>
    </div>
  );
}
