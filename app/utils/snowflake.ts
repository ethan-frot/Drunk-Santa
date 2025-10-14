import * as Phaser from 'phaser';

export class SnowflakeManager {
  private scene: Phaser.Scene;
  private snowflakes: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 100;
  private speedIncreaseTimer: any;
  private spawnTimer: any;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

export class SnowflakeScene extends Phaser.Scene {
  private snowflakes: Phaser.GameObjects.Sprite[] = [];
  private snowflakeTexture: string = 'snowflake';

  constructor() {
    super({ key: 'SnowflakeScene' });
  }

  preload() {
    // Load the snowflake image
    this.load.image(this.snowflakeTexture, '/snowflake.png');
  }

  create() {
    const { width, height } = this.scale;

    // Create initial snowflakes
    this.createSnowflakes(0);

    // Add some physics for more realistic movement
    this.physics.world.gravity.y = 50;

    // Create a timer to continuously spawn new snowflakes
    this.time.addEvent({
      delay: 1000, // Spawn a new snowflake every 200ms
      callback: this.spawnSnowflake,
      callbackScope: this,
      loop: true
    });
  }

  private createSnowflakes(count: number) {
    const { width } = this.scale;
    
    for (let i = 0; i < count; i++) {
      this.spawnSnowflake();
    }
  }

  private spawnSnowflake() {
    const { width, height } = this.scale;
    
    // Random horizontal position
    const x = Phaser.Math.Between(0, width);
    
    // Start above the screen
    const y = -10;
    
    // Create snowflake sprite
    const snowflake = this.add.sprite(x, y, this.snowflakeTexture);
    
    // Random size for variety (0.3 to 0.8 of original size)
    const scale = 0.3;
    snowflake.setScale(scale);
    
    // Random rotation
    const rotation = Phaser.Math.Between(0, 360) * Math.PI / 180;
    snowflake.setRotation(rotation);
    
    // Random alpha for depth effect
    const alpha = 1;
    snowflake.setAlpha(alpha);
    
    // Add physics body
    this.physics.add.existing(snowflake);
    const body = snowflake.body as Phaser.Physics.Arcade.Body;
    
    // Random fall speed
    const fallSpeed = 50;
    body.setVelocityY(fallSpeed);
    
    // Add slight horizontal drift
    const driftSpeed = Phaser.Math.FloatBetween(-20, 20);
    body.setVelocityX(driftSpeed);
    
    // Add rotation animation
    const rotationSpeed = Phaser.Math.FloatBetween(-50, 50);
    this.tweens.add({
      targets: snowflake,
      rotation: snowflake.rotation + (rotationSpeed * Math.PI / 180),
      duration: Phaser.Math.Between(2000, 4000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add floating animation
    this.tweens.add({
      targets: snowflake,
      x: snowflake.x + Phaser.Math.Between(-30, 30),
      duration: Phaser.Math.Between(1500, 3000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Remove snowflake when it goes off screen
    snowflake.on('destroy', () => {
      const index = this.snowflakes.indexOf(snowflake);
      if (index > -1) {
        this.snowflakes.splice(index, 1);
      }
    });
    
    // Add to snowflakes array
    this.snowflakes.push(snowflake);
    
    // Remove snowflakes that fall off screen
    this.physics.world.on('worldbounds', (event: any) => {
      if (event.gameObject === snowflake) {
        snowflake.destroy();
      }
    });
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, width, height);
    body.setCollideWorldBounds(false);
  }

  update() {
    // Remove snowflakes that are off screen
    this.snowflakes.forEach((snowflake, index) => {
      if (snowflake.y > this.scale.height + 50) {
        snowflake.destroy();
      }
    });
  }

  // Public method to control snowfall intensity
  public setSnowfallIntensity(intensity: number) {
    // Adjust spawn rate based on intensity (0-1)
    const delay = Math.max(50, 500 - (intensity * 450));
    this.time.removeAllEvents();
    this.time.addEvent({
      delay: delay,
      callback: this.spawnSnowflake,
      callbackScope: this,
      loop: true
    });
  }

  // Public method to clear all snowflakes
  public clearSnowflakes() {
    this.snowflakes.forEach(snowflake => snowflake.destroy());
    this.snowflakes = [];
  }
}

// Configuration for the Phaser game
export const snowflakeGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'snowflake-container',
  backgroundColor: '#87CEEB', // Sky blue background
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 50 },
      debug: false
    }
  },
  scene: SnowflakeScene
};

// Function to create and start the snowflake game
export function createSnowflakeGame(containerId: string = 'snowflake-container'): Phaser.Game {
  const config = {
    ...snowflakeGameConfig,
    parent: containerId
  };
  
  return new Phaser.Game(config);
}

// Function to destroy the snowflake game
export function destroySnowflakeGame(game: Phaser.Game) {
  if (game) {
    game.destroy(true);
  }
}

