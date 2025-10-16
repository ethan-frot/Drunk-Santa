class SoundManager {
  private static instance: SoundManager;
  private buttonClickAudio: HTMLAudioElement | null = null;
  private soundEnabled: boolean = true;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.buttonClickAudio = new Audio('/sounds/button-click.mp3');
      this.buttonClickAudio.preload = 'auto';
      this.buttonClickAudio.volume = 0.5; // Moderate volume for clicks
      
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