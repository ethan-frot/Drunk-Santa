import type * as Phaser from 'phaser';

export class GiftManager {
  private scene: Phaser.Scene;
  private gifts: Phaser.GameObjects.Sprite[] = [];
  private fallSpeed: number = 80; // Slightly slower than snowflakes
  private spawnTimer: any;
  private spawnDelay: number = 8000; // Spawn every 8 seconds initially
  // bonus size progress 0..1 mapped to visual scale
  private bonusSizeProgress: number = 0; 

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setGiftSize(progress: number) {
    this.bonusSizeProgress = Phaser.Math.Clamp(progress, 0, 1);
  }

  public getGiftSize(): number {
    return this.bonusSizeProgress;
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
    const between = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const floatBetween = (min: number, max: number) => Math.random() * (max - min) + min;
    const x = between(50, width - 50);
    
    // Start above the screen
    const y = -30;
    
    // Randomly choose a gift type: 1 (double points), 2 (+150), 3 (golden snowball)
    const roll = between(1, 3);
    const type = roll === 1 ? 'gift1' : roll === 2 ? 'gift2' : 'gift3';

    // Create gift sprite with selected texture
    const gift = this.scene.add.sprite(x, y, type);
    // Store type on the sprite for catch handling
    (gift as any).giftType = type;
    
    // Map bonus progress to scale: start smaller and grow to target at 1.0
    // Base target size for gifts (previously 0.15), we divided by 4 -> 0.0375
    const baseFinalScale = 0.0375;
    // At max upgrade, make gifts larger for extra reward
    const finalScale = this.bonusSizeProgress >= 1 ? baseFinalScale * 1.7 : baseFinalScale;
    const minScale = baseFinalScale * 0.6; // reduced at start
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const t = clamp(this.bonusSizeProgress, 0, 1);
    const scale = minScale + (finalScale - minScale) * t;
    gift.setScale(scale);
    
    // Random rotation
    const rotation = between(0, 360) * Math.PI / 180;
    gift.setRotation(rotation);
    
    // Set alpha
    gift.setAlpha(1);
    
    // Add physics body
    this.scene.physics.add.existing(gift);
    const body = gift.body as Phaser.Physics.Arcade.Body;
    
    // Set physics body to 95% of displayed sprite size for tighter hitbox
    try {
      const width = gift.displayWidth * 0.95;
      const height = gift.displayHeight * 0.95;
      const offsetX = (gift.displayWidth - width) / 2;
      const offsetY = (gift.displayHeight - height) / 2;
      body.setSize(width, height, false);
      body.setOffset(offsetX, offsetY);
    } catch {}

    // Set fall speed (slower than snowflakes)
    body.setVelocityY(this.fallSpeed);
    
    // Add slight horizontal drift
    const driftSpeed = floatBetween(-15, 15);
    body.setVelocityX(driftSpeed);
    
    // Add rotation animation (faster than snowflakes)
    const rotationSpeed = floatBetween(-120, 120);
    this.scene.tweens.add({
      targets: gift,
      rotation: gift.rotation + (rotationSpeed * Math.PI / 180),
      duration: between(3000, 5000),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add floating animation (more subtle than snowflakes)
    this.scene.tweens.add({
      targets: gift,
      x: gift.x + between(-25, 25),
      duration: between(2000, 3500),
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });
    
    // Add to gifts array
    this.gifts.push(gift);
    
    // Randomize next spawn time (between 5-12 seconds)
    this.spawnDelay = between(5000, 12000);
    
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