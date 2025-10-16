import * as Phaser from 'phaser';

export class VodkaManager {
  private scene: Phaser.Scene;
  private bottles: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 90; // between snowflake (100) and gift (80)
  private spawnTimer: any;
  private spawnDelay: number = 6000; // spawn every ~6s, randomized each time

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

    const x = Phaser.Math.Between(50, width - 50);
    const y = -40;

    const bottle = this.scene.add.sprite(x, y, 'vodka');
    bottle.setScale(0.16); // reduced size
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
    body.setVelocityX(Phaser.Math.FloatBetween(-12, 12));

    // Gentle swing
    this.scene.tweens.add({
      targets: bottle,
      angle: Phaser.Math.Between(-6, 6),
      duration: Phaser.Math.Between(1200, 2200),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.bottles.push(bottle);

    // Randomize next spawn between 4–10s
    this.spawnDelay = Phaser.Math.Between(4000, 10000);
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


