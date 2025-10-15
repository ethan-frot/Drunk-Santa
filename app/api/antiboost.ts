import * as Phaser from 'phaser';

export class AntiBoostManager {
  private scene: Phaser.Scene;
  private jars: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 140; // faster so it is clearly falling
  private spawnTimer: any;
  private spawnDelay: number = 3000; // faster initial spawn so it's visible quickly

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public start() {
    // Spawn one immediately so player can see it
    this.spawnJar();
    this.startSpawning();
  }

  public stop() {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
  }

  public getJars(): Phaser.GameObjects.Sprite[] {
    return this.jars;
  }

  public cleanup() {
    this.jars.forEach(jar => {
      if (jar && jar.active) {
        jar.destroy();
      }
    });
    this.jars = [];
    this.stop();
  }

  private startSpawning() {
    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnDelay,
      callback: () => this.spawnJar(),
      callbackScope: this,
      loop: true
    });
  }

  private spawnJar() {
    const { width } = this.scene.scale;
    const x = Phaser.Math.Between(50, width - 50);
    const y = -40;

    const jar = this.scene.add.sprite(x, y, 'antiboost');
    jar.setScale(0.18 * 7); // 7x larger
    jar.setAlpha(1);
    jar.setDepth(5);

    this.scene.physics.add.existing(jar);
    const body = jar.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocityY(this.fallSpeed);
      body.setVelocityX(Phaser.Math.FloatBetween(-12, 12));
      body.setAllowGravity(false);
    } else {
      // Fallback tween in unlikely case body isn't ready
      this.scene.tweens.add({
        targets: jar,
        y: this.scene.scale.height + 80,
        duration: 5000,
        ease: 'Linear'
      });
    }

    // Gentle swing similar to vodka
    this.scene.tweens.add({
      targets: jar,
      angle: Phaser.Math.Between(-6, 6),
      duration: Phaser.Math.Between(1200, 2200),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.jars.push(jar);

    // Randomize next spawn between 2–5s
    this.spawnDelay = Phaser.Math.Between(2000, 5000);
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.startSpawning();
    }
  }

  public cleanupJars() {
    this.jars.forEach((jar, index) => {
      if (jar && jar.y > this.scene.scale.height + 60) {
        jar.destroy();
        this.jars.splice(index, 1);
      }
    });
  }
}


