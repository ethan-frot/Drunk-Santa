class SoundManager {
  private static instance: SoundManager;
  private buttonClickAudio: HTMLAudioElement | null = null;
  private snowflakeCollectAudio: HTMLAudioElement | null = null;
  private turboSpeedAudio: HTMLAudioElement | null = null;
  private speedEndedAudio: HTMLAudioElement | null = null;
  private pointDeductionAudio: HTMLAudioElement | null = null;
  private freezingAudio: HTMLAudioElement | null = null;
  private snowballHitAudio: HTMLAudioElement | null = null;
  private bonusGiftAudio: HTMLAudioElement | null = null;
  private soundEnabled: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.buttonClickAudio = new Audio('/sounds/button-click.mp3');
      this.buttonClickAudio.preload = 'auto';
      this.buttonClickAudio.volume = 0.5; // Moderate volume for clicks
      
      this.snowflakeCollectAudio = new Audio('/sounds/sound-of-collecting-snowflakes.mp3');
      this.snowflakeCollectAudio.preload = 'auto';
      this.snowflakeCollectAudio.volume = 0.6; // Slightly louder for collection sound
      
      this.turboSpeedAudio = new Audio('/sounds/sound-turbo-speed.mp3');
      this.turboSpeedAudio.preload = 'auto';
      this.turboSpeedAudio.volume = 0.7; // Louder for speed effect
      
      this.speedEndedAudio = new Audio('/sounds/sound-speed-has-ended.mp3');
      this.speedEndedAudio.preload = 'auto';
      this.speedEndedAudio.volume = 0.6; // Moderate volume for end effect
      
      this.pointDeductionAudio = new Audio('/sounds/sound-point-deduction.mp3');
      this.pointDeductionAudio.preload = 'auto';
      this.pointDeductionAudio.volume = 0.5; // Moderate volume for point deduction
      
      this.freezingAudio = new Audio('/sounds/sound-of-freezing.mp3');
      this.freezingAudio.preload = 'auto';
      this.freezingAudio.volume = 0.6; // Moderate volume for freezing effect
      
      this.snowballHitAudio = new Audio('/sounds/sound-snowball-hit.mp3');
      this.snowballHitAudio.preload = 'auto';
      this.snowballHitAudio.volume = 0.6; // Moderate volume for snowball hit
      
      this.bonusGiftAudio = new Audio('/sounds/sound-bonus-gift.mp3');
      this.bonusGiftAudio.preload = 'auto';
      this.bonusGiftAudio.volume = 0.7; // Louder for bonus gift sound
      
      // Initialize sound state from localStorage
      const soundEnabled = localStorage.getItem('soundEnabled');
      this.soundEnabled = soundEnabled !== 'false'; // Default to enabled
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  public playButtonClick(): void {
    if (!this.buttonClickAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.buttonClickAudio.currentTime = 0;
      this.buttonClickAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playSnowflakeCollect(): void {
    if (!this.snowflakeCollectAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.snowflakeCollectAudio.currentTime = 0;
      this.snowflakeCollectAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playTurboSpeed(): void {
    if (!this.turboSpeedAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.turboSpeedAudio.currentTime = 0;
      this.turboSpeedAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playSpeedEnded(): void {
    if (!this.speedEndedAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.speedEndedAudio.currentTime = 0;
      this.speedEndedAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playPointDeduction(): void {
    if (!this.pointDeductionAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.pointDeductionAudio.currentTime = 0;
      this.pointDeductionAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playFreezing(): void {
    if (!this.freezingAudio || !this.soundEnabled) return;
    
    try {
      // Reset audio to beginning and play
      this.freezingAudio.currentTime = 0;
      this.freezingAudio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public stopFreezing(): void {
    if (!this.freezingAudio) return;
    
    try {
      this.freezingAudio.pause();
      this.freezingAudio.currentTime = 0;
    } catch (error) {
      // Ignore errors
    }
  }

  public playSnowballHit(): void {
    if (!this.snowballHitAudio || !this.soundEnabled) return;
    
    try {
      this.snowballHitAudio.currentTime = 0;
      this.snowballHitAudio.play().catch(() => {
        // Ignore errors
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public playBonusGift(): void {
    if (!this.bonusGiftAudio || !this.soundEnabled) return;
    
    try {
      this.bonusGiftAudio.currentTime = 0;
      this.bonusGiftAudio.play().catch(() => {
        // Ignore errors
      });
    } catch (error) {
      // Ignore errors
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', enabled.toString());
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }
}

export default SoundManager;