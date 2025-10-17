import type * as Phaser from 'phaser';

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
    const between = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const floatBetween = (min: number, max: number) => Math.random() * (max - min) + min;
    const x = between(50, width - 50);
    
    // Start above the screen
    const y = -20;
    
    // Create snowflake sprite (animated)
    const snowflake = this.scene.add.sprite(x, y, 'snow1');
    
    // Fixed size for consistency (60% of original 0.3 => 0.18)
    const scale = 0.18;
    snowflake.setScale(scale);
    
    // Random rotation is now handled subtly by tween; avoid hard-setting to keep frames aligned
    
    // Fixed alpha
    const alpha = 1;
    snowflake.setAlpha(alpha);

    // Play the snowflake frame animation
    try {
      snowflake.play('snowflake_anim');
    } catch {}
    
    // Add physics body
    this.scene.physics.add.existing(snowflake);
    const body = snowflake.body as Phaser.Physics.Arcade.Body;
    
    // Set physics body to 95% of displayed sprite size for tighter hitbox
    try {
      const width = snowflake.displayWidth * 0.95;
      const height = snowflake.displayHeight * 0.95;
      const offsetX = (snowflake.displayWidth - width) / 2;
      const offsetY = (snowflake.displayHeight - height) / 2;
      body.setSize(width, height, false);
      body.setOffset(offsetX, offsetY);
    } catch {}

    // Use current fall speed
    body.setVelocityY(this.fallSpeed);
    
    // Add slight horizontal drift
    const driftSpeed = floatBetween(-20, 20);
    body.setVelocityX(driftSpeed);
    
    // Add rotation animation
    const rotationSpeed = floatBetween(-160, 160);
    this.scene.tweens.add({
      targets: snowflake,
      rotation: snowflake.rotation + (rotationSpeed * Math.PI / 180),
      duration: between(2000, 4000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add floating animation
    this.scene.tweens.add({
      targets: snowflake,
      x: snowflake.x + between(-40, 40),
      duration: between(1500, 3000),
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