'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AbilityUpgradeView } from './AbilityUpgradeView';
import SoundManager from '../../utils/soundManager';
import SoundToggleButton from '@/app/components/SoundToggleButton';

// Route page component without custom props to satisfy Next.js types
export default function Page() {
  const router = useRouter();
  const [snowflakesEarned, setSnowflakesEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    try {
      const se = parseInt((typeof window !== 'undefined' ? localStorage.getItem('snowflakesEarned') : '0') || '0', 10);
      const ts = parseInt((typeof window !== 'undefined' ? localStorage.getItem('gameScore') : '0') || '0', 10);
      setSnowflakesEarned(Number.isFinite(se) ? se : 0);
      setTotalScore(Number.isFinite(ts) ? ts : 0);
    } catch {}
  }, []);

  const handleContinue = () => {
    SoundManager.getInstance().playClickSound();
    router.push('/views/game');
  };

  return (
    <AbilityUpgradeView
      onContinue={handleContinue}
      snowflakesEarned={snowflakesEarned}
      totalScore={totalScore}
    />
    
    {/* Sound toggle button */}
    <SoundToggleButton />
  );
}
