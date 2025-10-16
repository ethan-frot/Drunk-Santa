class SoundManager {
  private static instance: SoundManager;
  private clickAudio: HTMLAudioElement | null = null;

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  playClickSound() {
    if (!this.clickAudio) {
      this.clickAudio = new Audio('/sounds/music-click.mp3');
      this.clickAudio.volume = 0.5;
    }

    // Reset audio to beginning and play
    this.clickAudio.currentTime = 0;
    this.clickAudio.play().catch(() => {
      // Ignore autoplay restrictions
    });
  }
}

export default SoundManager;
