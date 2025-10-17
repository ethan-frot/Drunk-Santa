import type * as Phaser from 'phaser';

export class VodkaManager {
  private scene: Phaser.Scene;
  private bottles: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 90; // between snowflake (100) and gift (80)
  private spawnTimer: any;
  private spawnDelay: number = 6000; // spawn every ~6s, randomized each time
  private bonusSizeProgress: number = 0; // 0..1 from ability

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public start() {
    this.startSpawning();
  }

  public stop() {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
  }

  public getBottles(): Phaser.GameObjects.Sprite[] {
    return this.bottles;
  }

  public setBonusSizeProgress(progress: number) {
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    this.bonusSizeProgress = clamp(progress, 0, 1);
  }

  public cleanup() {
    this.bottles.forEach(bottle => {
      if (bottle && bottle.active) {
        bottle.destroy();
      }
    });
    this.bottles = [];
    this.stop();
  }

  private startSpawning() {
    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnDelay,
      callback: () => this.spawnBottle(),
      callbackScope: this,
      loop: true
    });
  }

  private spawnBottle() {
    const { width } = this.scene.scale;
    const between = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const floatBetween = (min: number, max: number) => Math.random() * (max - min) + min;
    const x = between(50, width - 50);
    const y = -40;

    const bottle = this.scene.add.sprite(x, y, 'vodka');
    // Map bonus progress to scale: start smaller and grow to target at 1.0
    const finalScale = 0.14; // average between 0.16 and 0.12
    const minScale = finalScale * 0.6; // reduced at start
    const scale = minScale + (finalScale - minScale) * this.bonusSizeProgress;
    bottle.setScale(scale);
    bottle.setAlpha(1);

    this.scene.physics.add.existing(bottle);
    const body = bottle.body as Phaser.Physics.Arcade.Body;
    // Set physics body to 95% of displayed sprite size for tighter hitbox
    try {
      const width = bottle.displayWidth * 0.95;
      const height = bottle.displayHeight * 0.95;
      const offsetX = (bottle.displayWidth - width) / 2;
      const offsetY = (bottle.displayHeight - height) / 2;
      body.setSize(width, height, false);
      body.setOffset(offsetX, offsetY);
    } catch {}
    body.setVelocityY(this.fallSpeed);
    body.setVelocityX(floatBetween(-12, 12));

    // Gentle swing
    this.scene.tweens.add({
      targets: bottle,
      angle: between(-6, 6),
      duration: between(1200, 2200),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.bottles.push(bottle);

    // Randomize next spawn between 4–10s
    this.spawnDelay = between(4000, 10000);
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.startSpawning();
    }
  }

  public cleanupBottles() {
    this.bottles.forEach((bottle, index) => {
      if (bottle && bottle.y > this.scene.scale.height + 60) {
        bottle.destroy();
        this.bottles.splice(index, 1);
      }
    });
  }
}


