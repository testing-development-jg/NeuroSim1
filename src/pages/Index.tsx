import { useState } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { BrainSurgerySimulator } from '@/components/simulator/BrainSurgerySimulator';
import { UserProfile } from '@/types/simulator';

const Index = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleLogin = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleLogout = () => {
    setUserProfile(null);
  };

  if (!userProfile) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <BrainSurgerySimulator
      userProfile={userProfile}
      onLogout={handleLogout}
    />
  );
};

export default Index;
