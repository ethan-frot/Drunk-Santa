import * as Phaser from 'phaser';

export class GiftManager {
  private scene: Phaser.Scene;
  private gifts: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 80; // Slightly slower than snowflakes
  private spawnTimer: any;
  private spawnDelay: number = 8000; // Spawn every 8 seconds initially
  private giftSize: number = 0.15; // Base size, will be upgraded

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setGiftSize(size: number) {
    this.giftSize = size;
  }

  public getGiftSize(): number {
    return this.giftSize;
  }

  public start() {
    this.startGiftSpawning();
  }

  public stop() {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
  }

  public getGifts(): Phaser.GameObjects.Sprite[] {
    return this.gifts;
  }

  public cleanup() {
    this.gifts.forEach(gift => {
      if (gift && gift.active) {
        gift.destroy();
      }
    });
    this.gifts = [];
    this.stop();
  }

  private startGiftSpawning() {
    // Create a timer to occasionally spawn gifts
    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnDelay,
      callback: () => this.spawnGift(),
      callbackScope: this,
      loop: true
    });
  }

  private spawnGift() {
    const { width, height } = this.scene.scale;
    
    // Random horizontal position
    const x = Phaser.Math.Between(50, width - 50);
    
    // Start above the screen
    const y = -30;
    
    // Create gift sprite
    const gift = this.scene.add.sprite(x, y, 'cadeau');
    
    // Use current gift size (upgradeable)
    gift.setScale(this.giftSize);
    
    // Random rotation
    const rotation = Phaser.Math.Between(0, 360) * Math.PI / 180;
    gift.setRotation(rotation);
    
    // Set alpha
    gift.setAlpha(1);
    
    // Add physics body
    this.scene.physics.add.existing(gift);
    const body = gift.body as Phaser.Physics.Arcade.Body;
    
    // Set fall speed (slower than snowflakes)
    body.setVelocityY(this.fallSpeed);
    
    // Add slight horizontal drift
    const driftSpeed = Phaser.Math.FloatBetween(-15, 15);
    body.setVelocityX(driftSpeed);
    
    // Add rotation animation (faster than snowflakes)
    const rotationSpeed = Phaser.Math.FloatBetween(-120, 120);
    this.scene.tweens.add({
      targets: gift,
      rotation: gift.rotation + (rotationSpeed * Math.PI / 180),
      duration: Phaser.Math.Between(3000, 5000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add floating animation (more subtle than snowflakes)
    this.scene.tweens.add({
      targets: gift,
      x: gift.x + Phaser.Math.Between(-25, 25),
      duration: Phaser.Math.Between(2000, 3500),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add to gifts array
    this.gifts.push(gift);
    
    // Randomize next spawn time (between 5-12 seconds)
    this.spawnDelay = Phaser.Math.Between(5000, 12000);
    
    // Update the timer with new delay
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.startGiftSpawning();
    }
  }

  public cleanupGifts() {
    // Remove gifts that are off screen
    this.gifts.forEach((gift, index) => {
      if (gift && gift.y > this.scene.scale.height + 50) {
        gift.destroy();
        this.gifts.splice(index, 1);
      }
    });
  }
}