class MusicManager {
  private static instance: MusicManager;
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private userInteracted = false;

  private constructor() {}

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  // Check if music is enabled according to user preferences
  private isMusicEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const enabled = localStorage.getItem('musicEnabled');
    const soundEnabled = localStorage.getItem('soundEnabled');
    return enabled !== 'false' && soundEnabled !== 'false'; // Both music and sound must be enabled
  }

  playMenuMusic() {
    // Don't play if user has disabled music
    if (!this.isMusicEnabled()) return;

    // Don't start if music is already playing
    if (this.isMusicAlreadyPlaying()) return;

    if (!this.audio) {
      this.audio = new Audio('/sounds/music-menu.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.3;
    }

    if (!this.isPlaying) {
      this.audio.play().catch(() => {
        // Ignore autoplay restrictions - music will start on first user interaction
      });
      this.isPlaying = true;
    }
  }

  // Call this on user interaction to start music if it should be playing
  startMusicOnInteraction() {
    if (!this.isMusicEnabled()) return;
    
    // Don't start if music is already playing
    if (this.isMusicAlreadyPlaying()) return;
    
    // Initialize audio if needed
    if (!this.audio) {
      this.audio = new Audio('/sounds/music-menu.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.3;
    }
    
    // Start music if it's not playing
    if (!this.isCurrentlyPlaying()) {
      this.userInteracted = true;
      this.audio.play().catch(() => {
        // Still ignore errors
      });
      this.isPlaying = true;
    }
  }

  stop() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  // Pause without resetting position
  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  // Resume from current position if available
  resume() {
    if (!this.isMusicEnabled()) return;
    if (!this.audio) {
      this.audio = new Audio('/sounds/music-menu.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.3;
    }
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
      this.isPlaying = true;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying && this.audio !== null && !this.audio.paused;
  }

  // Method to enable/disable music
  setMusicEnabled(enabled: boolean) {
    localStorage.setItem('musicEnabled', enabled.toString());
    if (!enabled) {
      this.stop();
    }
  }

  // Method to get current state
  getMusicEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const enabled = localStorage.getItem('musicEnabled');
    const soundEnabled = localStorage.getItem('soundEnabled');
    return enabled !== 'false' && soundEnabled !== 'false'; // Both music and sound must be enabled
  }

  // Method to resume music after reload if it was enabled
  resumeMusicIfEnabled() {
    if (!this.isMusicEnabled()) return;
    
    // Don't start if music is already playing
    if (this.isMusicAlreadyPlaying()) return;
    
    if (!this.audio) {
      this.audio = new Audio('/sounds/music-menu.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.3;
    }

    if (!this.isPlaying) {
      this.audio.play().catch(() => {
        // Ignore autoplay restrictions - music will start on first user interaction
      });
      this.isPlaying = true;
    }
  }

  // Method to check if music is already playing to avoid overlapping
  isMusicAlreadyPlaying(): boolean {
    return this.audio !== null && !this.audio.paused && !this.audio.ended;
  }
}

export default MusicManager;
