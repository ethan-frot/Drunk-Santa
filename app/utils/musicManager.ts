class MusicManager {
  private static instance: MusicManager;
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

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
        // Ignore autoplay restrictions
      });
      this.isPlaying = true;
    }
    // If music is already playing, don't restart it
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
