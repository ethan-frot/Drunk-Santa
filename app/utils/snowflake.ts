import Phaser from 'phaser';

export class SnowflakeManager {
  private scene: Phaser.Scene;
  private snowflakes: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 100;
  private speedIncreaseTimer: any;
  private spawnTimer: any;
  private snowflakeValue: number = 1; // Base value, will be upgraded

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setSnowflakeValue(value: number) {
    this.snowflakeValue = value;
  }

  public getSnowflakeValue(): number {
    return this.snowflakeValue;
  }

  public start() {
    this.startSnowflakeSpawning();
    this.startSpeedIncreaseTimer();
  }

  public stop() {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
    if (this.speedIncreaseTimer) {
      this.speedIncreaseTimer.destroy();
    }
  }

  public getSnowflakes(): Phaser.GameObjects.Sprite[] {
    return this.snowflakes;
  }

  public cleanup() {
    this.snowflakes.forEach(snowflake => {
      if (snowflake && snowflake.active) {
        snowflake.destroy();
      }
    });
    this.snowflakes = [];
    this.stop();
  }

  private startSnowflakeSpawning() {
    // Create a timer to continuously spawn new snowflakes
    this.spawnTimer = this.scene.time.addEvent({
      delay: 800, // Spawn a new snowflake every 800ms
      callback: () => this.spawnSnowflake(),
      callbackScope: this,
      loop: true
    });
  }

  private startSpeedIncreaseTimer() {
    // Create a timer to increase fall speed every second
    this.speedIncreaseTimer = this.scene.time.addEvent({
      delay: 1000, // Every 1000ms (1 second)
      callback: () => this.increaseFallSpeed(),
      callbackScope: this,
      loop: true
    });
  }

  private increaseFallSpeed() {
    this.fallSpeed += 1;
    // Update velocity for all existing snowflakes
    this.snowflakes.forEach((snowflake) => {
      if (snowflake && snowflake.active) {
        const body = snowflake.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocityY(this.fallSpeed);
        }
      }
    });
  }

  private spawnSnowflake() {
    const { width, height } = this.scene.scale;
    
    // Random horizontal position
    const x = Phaser.Math.Between(50, width - 50);
    
    // Start above the screen
    const y = -20;
    
    // Create snowflake sprite
    const snowflake = this.scene.add.sprite(x, y, 'snowflake');
    
    // Fixed size for consistency
    const scale = 0.3;
    snowflake.setScale(scale);
    
    // Random rotation
    const rotation = Phaser.Math.Between(0, 360) * Math.PI / 180;
    snowflake.setRotation(rotation);
    
    // Fixed alpha
    const alpha = 1;
    snowflake.setAlpha(alpha);
    
    // Add physics body
    this.scene.physics.add.existing(snowflake);
    const body = snowflake.body as Phaser.Physics.Arcade.Body;
    
    // Use current fall speed
    body.setVelocityY(this.fallSpeed);
    
    // Add slight horizontal drift
    const driftSpeed = Phaser.Math.FloatBetween(-20, 20);
    body.setVelocityX(driftSpeed);
    
    // Add rotation animation
    const rotationSpeed = Phaser.Math.FloatBetween(-160, 160);
    this.scene.tweens.add({
      targets: snowflake,
      rotation: snowflake.rotation + (rotationSpeed * Math.PI / 180),
      duration: Phaser.Math.Between(2000, 4000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add floating animation
    this.scene.tweens.add({
      targets: snowflake,
      x: snowflake.x + Phaser.Math.Between(-40, 40),
      duration: Phaser.Math.Between(1500, 3000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add to snowflakes array
    this.snowflakes.push(snowflake);
  }

  public cleanupSnowflakes() {
    // Remove snowflakes that are off screen
    this.snowflakes.forEach((snowflake, index) => {
      if (snowflake && snowflake.y > this.scene.scale.height + 50) {
        snowflake.destroy();
        this.snowflakes.splice(index, 1);
      }
    });
  }
}