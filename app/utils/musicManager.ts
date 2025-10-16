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

  playMenuMusic() {
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
    // If music is already playing, don't restart it
  }

  // Call this on first user interaction to start music
  startMusicOnInteraction() {
    if (!this.userInteracted && this.audio && this.audio.paused) {
      this.userInteracted = true;
      this.audio.play().catch(() => {
        // Still ignore errors
      });
    }
  }

  stop() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying && this.audio && !this.audio.paused;
  }
}

export default MusicManager;
