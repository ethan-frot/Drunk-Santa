'use client';

import { useEffect, useRef, useState } from 'react';
import { SnowflakeManager } from '../utils/snowflake';
import { GiftManager } from '../utils/gift';
import { AbilityManager } from '../utils/abilities';
import { VodkaManager } from '../utils/vodka';
import { AntiBoostManager } from '../utils/antiboost';


export default function GameCanvas({ onGameEnd }: { onGameEnd?: (snowflakesEarned: number, totalScore: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [abilityManager] = useState(() => AbilityManager.getInstance());

  useEffect(() => {
    import('phaser').then((Phaser) => {
      class PreloadScene extends Phaser.Scene {
        constructor() { super('Preload'); }
        preload() {
          // Load character sprite sheet (6 frames, 32x32)
          this.load.spritesheet('character', '/assets/run_player.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          this.load.image('background', '/assets/background-image.png');
          // Load snowflake sprite
          this.load.image('snowflake', '/assets/snowflake.png');
          // Load gift sprite
          this.load.image('cadeau', '/assets/gifts.png');
          // Load vodka sprite
          this.load.image('vodka', '/assets/vodka.png');
          // Load anti-boost sprite
          this.load.image('antiboost', '/assets/anti-boost-slowly.png');
          // Load ice overlay as spritesheet (single strip animation 32x32 frames)
          this.load.spritesheet('ice', '/assets/Ice.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          // Load throw animation sheet (character throwing snowball)
          this.load.spritesheet('throw', '/assets/throw_sheet.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          // Load slime spritesheet (32x32)
          this.load.spritesheet('slime', '/assets/slime-spritesheet.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });

          //music
          this.load.audio('music', '/assets/background-music.mp3');
        }
        create() { this.scene.start('Game'); }
      }

      class GameScene extends Phaser.Scene {
        private character: any;
        private cursors: any;
        private snowflakeManager: SnowflakeManager;
        private giftManager: GiftManager;
        private vodkaManager: VodkaManager;
        private antiBoostManager: AntiBoostManager;
        private iceOverlay: any = null;
        private slime: any = null;
        private slimeTargetOffset: number = 24; // stop this many px before character center
        private slimeSpeed: number = 70;
        private slimeHitsTaken: number = 0;

        private snowballs: Phaser.GameObjects.Sprite[] = [];
        private nextThrowTime: number = 0;
        private throwCooldownMs: number = 400;
        private throwSprite: any = null;
  
        private score: number = 0;
        private scoreText: any;
        private bgMusic: any;
        private timerText: any;
        private timeLeft: number = 120;
        private gameActive: boolean = true;
        private isStunned: boolean = false;
        private isDashing: boolean = false;
        private dashCooldown: number = 0;
        private spaceKey: any;
        private snowflakesEarned: number = 0;
        private abilityManager: any;
        private baseMoveSpeed: number = 200;
        private speedMultiplier: number = 1;
        private boostEndTime: number = 0;

        constructor() { 
          super('Game'); 
          this.snowflakeManager = new SnowflakeManager(this);
          this.giftManager = new GiftManager(this);
          this.abilityManager = AbilityManager.getInstance();
          this.vodkaManager = new VodkaManager(this);
          this.antiBoostManager = new AntiBoostManager(this);

        }
        
        create() {
          // Reset game state
          this.timeLeft = 120;
          this.gameActive = true;

          // Add background image
          const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
          this.scale.on('resize', (gameSize: any) => {
            bg.setDisplaySize(gameSize.width, gameSize.height);
          });
          bg.setDisplaySize(this.scale.width, this.scale.height);

          // Create character sprite and place it at bottom center
          this.character = this.physics.add.sprite(0, 0, 'character');
          // Scale ~x5 total (0.7 * 5 = 3.5)
          this.character.setScale(3.5);
          this.character.setOrigin(0.5, 1);
          this.character.setCollideWorldBounds(true);

          // Create animations
          if (!this.anims.exists('run')) {
            this.anims.create({
              key: 'run',
              frames: this.anims.generateFrameNumbers('character', { start: 0, end: 5 }),
              frameRate: 10,
              repeat: -1
            });
          }
          if (!this.anims.exists('idle')) {
            this.anims.create({
              key: 'idle',
              frames: [{ key: 'character', frame: 0 }],
              frameRate: 1,
              repeat: -1
            });
          }
          // Ice animation built from spritesheet frames
          if (!this.anims.exists('ice_anim')) {
            this.anims.create({
              key: 'ice_anim',
              frames: this.anims.generateFrameNumbers('ice', { start: 0, end: 11 }),
              frameRate: 12,
              repeat: -1
            });
          }
          // Slime crawl animation (use first row or all frames sequentially)
          if (!this.anims.exists('slime_crawl')) {
            this.anims.create({
              key: 'slime_crawl',
              frames: this.anims.generateFrameNumbers('slime', { start: 0, end: 11 }),
              frameRate: 10,
              repeat: -1
            });
          }
          // Throw animation (separate spritesheet like run/idle)
          if (!this.anims.exists('throw_anim')) {
            this.anims.create({
              key: 'throw_anim',
              frames: this.anims.generateFrameNumbers('throw', { start: 0, end: 5 }),
              frameRate: 14,
              repeat: 0
            });
          }

          // Start in idle
          this.character.play('idle');

          // no ghost animation

          // Keep the world bounds in sync with the canvas size
          this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
          
          // Music background - stop previous music if exists
          if (this.bgMusic) {
            this.bgMusic.stop();
          }
          this.bgMusic = this.sound.add('music', { loop: true, volume: 0.5 });
          this.bgMusic.play();
          
          // Initial placement centered at bottom
          this.positionCharacterAtBottomCenter();

          // Reposition and resize bounds when the game resizes
          this.scale.on('resize', (gameSize: any) => {
            const { width, height } = gameSize;
            this.physics.world.setBounds(0, 0, width, height);
            this.keepCharacterAtBottom();
          });

          // Ensure keyboard input is enabled and capture keys
          if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
            this.input.keyboard.addCapture([
              Phaser.Input.Keyboard.KeyCodes.LEFT,
              Phaser.Input.Keyboard.KeyCodes.RIGHT,
              Phaser.Input.Keyboard.KeyCodes.SPACE
            ]);
          }
          // Set up keyboard controls
          this.cursors = this.input.keyboard?.createCursorKeys();

          // Ensure canvas keeps focus for reliable keyboard input
          const canvas: any = this.game.canvas as any;
          if (canvas) {
            canvas.setAttribute('tabindex', '0');
            try { canvas.focus(); } catch {}

            const focusCanvas = () => { try { canvas.focus(); } catch {} };
            // Refocus on any pointer interaction inside the game
            this.input.on('pointerdown', focusCanvas);
            // Refocus when tab becomes visible again
            const onVisibility = () => { if (!document.hidden) focusCanvas(); };
            document.addEventListener('visibilitychange', onVisibility);

            // Clean up listeners on scene shutdown
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
              this.input.off('pointerdown', focusCanvas);
              document.removeEventListener('visibilitychange', onVisibility);
            });
          }
          this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

          // Create score text
          this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
          }).setScrollFactor(0);

          // Apply ability upgrades
          this.applyAbilityUpgrades();
          
          // Start snowflake manager
          this.snowflakeManager.start();
          
          // Start gift manager
          this.giftManager.start();
          // Start vodka manager
          this.vodkaManager.start();
          // Start anti-boost manager
          this.antiBoostManager.start();
          // Spawn first slime after short delay
          this.time.delayedCall(1500, () => this.spawnSlime());

          // Mouse click to throw snowball (only if slime exists)
          this.input.on('pointerdown', () => {
            this.tryThrowSnowball();
          });
          // Create timer text
          this.timerText = this.add.text(this.scale.width / 2, 50, '120', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#e7e9ff',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Timer event - countdown every second
          this.time.addEvent({
            delay: 1000,
            callback: () => {
              if (this.gameActive) {
                this.timeLeft -= 1;
                this.timerText.setText(this.timeLeft.toString());
                
                if (this.timeLeft <= 0) {
                  this.gameActive = false;
                  this.gameOver();
                }
              }
            },
            loop: true
          });

          // Update timer position on resize
          this.scale.on('resize', (gameSize: any) => {
            if (this.timerText) {
              this.timerText.setPosition(gameSize.width / 2, 50);
            }
          });
        }

        private getBottomY() {
          const paddingFromBottom = 12;
          return this.scale.height - paddingFromBottom;
        }

        private keepCharacterAtBottom() {
          // Lock only Y to the bottom, do not modify X
          this.character.y = this.getBottomY();
          // Clamp X inside bounds in case of resize
          const halfWidth = (this.character.displayWidth || 0) / 2;
          const minX = halfWidth;
          const maxX = this.scale.width - halfWidth;
          if (this.character.x < minX) this.character.x = minX;
          if (this.character.x > maxX) this.character.x = maxX;
        }

        private positionCharacterAtBottomCenter() {
          this.character.setPosition(this.scale.width / 2, this.getBottomY());
        }

        private applyAbilityUpgrades() {
          // Apply snowflake value upgrade
          const snowflakeValue = this.abilityManager.getCurrentValue('snowflake_value');
          this.snowflakeManager.setSnowflakeValue(snowflakeValue);
          
          // Apply gift size upgrade
          const giftSize = this.abilityManager.getCurrentValue('gift_size');
          this.giftManager.setGiftSize(giftSize);
          
          // Apply dash cooldown upgrade
          const dashCooldown = this.abilityManager.getCurrentValue('dash_cooldown');
          this.dashCooldown = dashCooldown;
        }

        private performDash(direction: number) {
          this.isDashing = true;
          this.dashCooldown = this.abilityManager.getCurrentValue('dash_cooldown');
          
          // Calculate dash distance (quarter of map width)
          const dashDistance = this.scale.width * 0.25;
          const targetX = this.character.x + (dashDistance * direction);
          
          // Clamp target position within bounds
          const halfWidth = (this.character.displayWidth || 0) / 2;
          const minX = halfWidth;
          const maxX = this.scale.width - halfWidth;
          const clampedTargetX = Phaser.Math.Clamp(targetX, minX, maxX);
          
          // Set high velocity for dash
          const dashSpeed = 1200; // Increased speed for wider dash
          this.character.setVelocityX(dashSpeed * direction);
          
          // Create afterimage trail
          this.createAfterimageTrail();
          
          // Stop dash after a short duration
          this.time.delayedCall(300, () => {
            this.isDashing = false;
            this.character.setVelocityX(0);
          });
        }

        private createAfterimageTrail() {
          const afterimageCount = 5; // Number of afterimages
          const afterimageDelay = 50; // Delay between each afterimage
          
          for (let i = 0; i < afterimageCount; i++) {
            this.time.delayedCall(i * afterimageDelay, () => {
              // Create afterimage sprite at current character position
              const afterimage = this.add.sprite(
                this.character.x, 
                this.character.y, 
                'character'
              );
              
              // Set afterimage properties
              afterimage.setScale(0.7);
              afterimage.setOrigin(0.5, 1);
              afterimage.setAlpha(0.3 - (i * 0.05)); // Fade out progressively
              afterimage.setTint(0x00ffff); // Cyan tint for afterimage
              
              // Animate the afterimage
              this.tweens.add({
                targets: afterimage,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                  afterimage.destroy();
                }
              });
            });
          }
        }

        update() {
          if (!this.gameActive) return;

          // Keep the character on the bottom each frame, but allow X to move
          this.keepCharacterAtBottom();

          // Update dash cooldown
          if (this.dashCooldown > 0) {
            this.dashCooldown -= 16; // Assuming 60fps, ~16ms per frame
          }

           // Handle dash mechanic (disabled while stunned)
           if (!this.isStunned && this.spaceKey?.isDown && !this.isDashing && this.dashCooldown <= 0) {
            if (this.cursors?.left.isDown) {
              this.performDash(-1); // Dash left
            } else if (this.cursors?.right.isDown) {
              this.performDash(1); // Dash right
            }
          }

           // Handle normal horizontal movement (only if not dashing or stunned)
           if (!this.isDashing && !this.isStunned) {
            // Use base speed scaled by current multiplier
            const moveSpeed = this.baseMoveSpeed * this.speedMultiplier;

            if (this.cursors?.left.isDown) {
              this.character.setVelocityX(-moveSpeed);
              this.character.setFlipX(true);
              if (this.character.anims?.currentAnim?.key !== 'run') {
                this.character.play('run');
              }
            } else if (this.cursors?.right.isDown) {
              this.character.setVelocityX(moveSpeed);
              this.character.setFlipX(false);
              if (this.character.anims?.currentAnim?.key !== 'run') {
                this.character.play('run');
              }
            } else {
              this.character.setVelocityX(0);
              if (this.character.anims?.currentAnim?.key !== 'idle') {
                this.character.play('idle');
              }
            }
          }

          // no trail logic (removed)

          // Handle boost expiration
          if (this.speedMultiplier > 1 && this.time.now > this.boostEndTime) {
            this.speedMultiplier = 1;
            if (this.character?.anims) {
              this.character.anims.timeScale = 1;
            }
          }

          // Check collisions between character and snowflakes
          this.checkSnowflakeCollisions();

          // Check collisions between character and gifts
          this.checkGiftCollisions();
          // Check collisions between character and vodka
          this.checkVodkaCollisions();
          // Check collisions between character and anti-boost
          this.checkAntiBoostCollisions();

          // Clean up snowflakes that are off screen
          this.snowflakeManager.cleanupSnowflakes();

          // Clean up gifts that are off screen
          this.giftManager.cleanupGifts();
          // Clean up vodka bottles that are off screen
          this.vodkaManager.cleanupBottles();
          // Clean up anti-boost jars that are off screen
          this.antiBoostManager.cleanupJars();

          // Keep ice overlay attached to character while stunned
          if (this.iceOverlay && this.iceOverlay.active) {
            this.iceOverlay.setPosition(this.character.x, this.character.y);
          }

          // Update slime crawling towards the character
          this.updateSlime();

          // Update snowballs and collisions
          this.updateSnowballs();
        }

        private spawnSlime() {
          // Decide spawn side
          const fromLeft = Math.random() < 0.5;
          const y = this.getBottomY();
          const x = fromLeft ? -40 : this.scale.width + 40;
          if (this.slime) {
            this.slime.destroy();
          }
          this.slime = this.physics.add.sprite(x, y, 'slime');
          this.slime.setOrigin(0.5, 1);
          this.slime.setScale(3.2);
          this.slime.play('slime_crawl');
          this.slime.setDepth(4);
          // No bobbing/shadow effect
          this.slimeHitsTaken = 0;
        }

        private updateSlime() {
          if (!this.slime || !this.slime.active) return;
          // Keep on the ground
          this.slime.y = this.getBottomY();

          // Compute target x: stop a bit in front of character
          const targetX = this.character.x + (this.character.flipX ? 1 : -1) * this.slimeTargetOffset;
          const distance = Math.abs(targetX - this.slime.x);

          if (distance <= 6) {
            // Stop near the character
            this.slime.setVelocityX(0);
            return;
          }

          const dir = targetX > this.slime.x ? 1 : -1;
          this.slime.setVelocityX(dir * this.slimeSpeed);
          // If the base spritesheet faces left by default, flip when moving right
          this.slime.setFlipX(dir > 0);

          // Despawn if it walks off far beyond
          if (this.slime.x < -120 || this.slime.x > this.scale.width + 120) {
            this.slime.destroy();
            this.time.delayedCall(3000, () => this.spawnSlime());
          }
        }

        private tryThrowSnowball() {
          if (!this.slime || !this.slime.active) return;
          if (this.isStunned) return;
          if (this.time.now < this.nextThrowTime) return;
          this.nextThrowTime = this.time.now + this.throwCooldownMs;

          // Play throw animation once, then restore run/idle
          const wasRunning = this.character.anims?.currentAnim?.key === 'run';
          // Face the target before throwing
          const faceRight = this.slime.x > this.character.x;
          this.character.setFlipX(!faceRight);
          // Create a temporary throw sprite over the character
          if (this.throwSprite) { this.throwSprite.destroy(); this.throwSprite = null; }
          this.throwSprite = this.add.sprite(this.character.x, this.character.y, 'throw');
          this.throwSprite.setOrigin(0.5, 1);
          this.throwSprite.setScale(3.5);
          this.throwSprite.setFlipX(this.character.flipX);
          this.throwSprite.setDepth((this.character.depth || 0) + 1);
          // Hide main character during the throw for clean visuals
          const prevAlpha = this.character.alpha;
          this.character.setAlpha(0);
          this.throwSprite.play('throw_anim');
          this.throwSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.throwSprite?.destroy();
            this.throwSprite = null;
            this.character.setAlpha(prevAlpha);
            if (wasRunning) {
              this.character.play('run');
            } else {
              this.character.play('idle');
            }
          });

          // Spawn a snowball and launch toward slime
          const startX = this.character.x + (this.character.flipX ? -10 : 10);
          const startY = this.character.y - this.character.displayHeight * 0.65;
          const snowball = this.add.circle(startX, startY, 7, 0xffffff) as any;
          (snowball as any).setDepth?.(5);
          this.physics.add.existing(snowball);
          const body = (snowball as any).body as Phaser.Physics.Arcade.Body;
          body.setAllowGravity(false);

          // velocity towards current slime position
          const dx = (this.slime.x) - startX;
          const dy = (this.slime.y - this.slime.displayHeight * 0.5) - startY;
          const len = Math.max(1, Math.hypot(dx, dy));
          const speed = 480;
          body.setVelocity((dx / len) * speed, (dy / len) * speed);

          this.snowballs.push(snowball as any);
        }

        private updateSnowballs() {
          if (this.snowballs.length === 0) return;
          this.snowballs.forEach((ball, index) => {
            if (!ball || !ball.active) return;
            // Remove off-screen
            if (ball.x < -50 || ball.x > this.scale.width + 50 || ball.y < -50 || ball.y > this.scale.height + 50) {
              ball.destroy();
              this.snowballs.splice(index, 1);
              return;
            }

            // Collision with slime
            if (this.slime && this.slime.active) {
              const hitDist = 28; // fairly generous hitbox
              const d = Phaser.Math.Distance.Between(ball.x, ball.y, this.slime.x, this.slime.y - this.slime.displayHeight * 0.5);
              if (d < hitDist) {
                ball.destroy();
                this.snowballs.splice(index, 1);
                this.onSnowballHitSlime();
              }
            }
          });
        }

        private onSnowballHitSlime() {
          if (!this.slime || !this.slime.active) return;
          this.slimeHitsTaken += 1;
          // small hit flash
          try {
            this.slime.setTint(0xaaffff);
            this.time.delayedCall(100, () => this.slime?.clearTint?.());
          } catch {}

          if (this.slimeHitsTaken >= 3) {
            // Death animation: quick scale down then destroy
            this.tweens.add({
              targets: this.slime,
              scaleX: 0,
              scaleY: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.slime?.destroy();
                this.time.delayedCall(3000, () => this.spawnSlime());
              }
            });
          }
        }

        private checkGiftCollisions() {
          this.giftManager.getGifts().forEach((gift, index) => {
            if (gift && gift.active) {
              // Calculate catch hitbox at the top of the character sprite
              const topPortion = 0.3; // top 30% of character counts as catch zone
              const horizontalOffsetFactor = 0.4; // offset left from center by 40% width (hand area)
              const radiusFactor = 0.45; // catch radius is 45% of character size

              const catchY = this.character.y - (this.character.displayHeight - this.character.displayHeight * topPortion);
              const offsetX = this.character.displayWidth * horizontalOffsetFactor;
              const catchRadius = Math.min(this.character.displayWidth, this.character.displayHeight) * radiusFactor;
              
              // Check if gift is close enough to the character's catch zone to be "caught"
              const distance = Phaser.Math.Distance.Between(
                this.character.x - offsetX, catchY,
                gift.x, gift.y
              );
              
              // If gift is close enough, catch it
              if (distance < catchRadius) {
                this.catchGift(gift, index);
              }
            }
          });
        }

        private checkSnowflakeCollisions() {
          this.snowflakeManager.getSnowflakes().forEach((snowflake, index) => {
            if (snowflake && snowflake.active) {
              // Calculate catch hitbox at the top of the character sprite
              const topPortion = 0.3; // top 30% of character counts as catch zone
              const horizontalOffsetFactor = 0.4; // offset left from center by 40% width (hand area)
              const radiusFactor = 0.45; // catch radius is 45% of character size

              const catchY = this.character.y - (this.character.displayHeight - this.character.displayHeight * topPortion);
              const offsetX = this.character.displayWidth * horizontalOffsetFactor;
              const catchRadius = Math.min(this.character.displayWidth, this.character.displayHeight) * radiusFactor;
              
              // Check if snowflake is close enough to the character's catch zone to be "caught"
              const distance = Phaser.Math.Distance.Between(
                this.character.x - offsetX, catchY,
                snowflake.x, snowflake.y
              );
              
              // If snowflake is close enough, catch it
              if (distance < catchRadius) {
                this.catchSnowflake(snowflake, index);
              }
            }
          });
        }

        private catchSnowflake(snowflake: Phaser.GameObjects.Sprite, index: number) {
          // Get snowflake value from manager
          const snowflakeValue = this.snowflakeManager.getSnowflakeValue();
          
          // Add score
          this.score += snowflakeValue;
          this.snowflakesEarned += 1; // Track for ability system
          this.scoreText.setText(`Score: ${this.score}`);
          
          // Create catch effect with dynamic value
          this.createCatchEffect(snowflake.x, snowflake.y, snowflakeValue);
          
          // Destroy the snowflake
          snowflake.destroy();
        }

        private catchGift(gift: Phaser.GameObjects.Sprite, index: number) {
          // Add bonus score for gifts
          this.score += 50;
          this.scoreText.setText(`Score: ${this.score}`);
          
          // Create bonus catch effect
          this.createBonusCatchEffect(gift.x, gift.y);
          
          // Destroy the gift
          gift.destroy();
        }

        private createCatchEffect(x: number, y: number, value: number = 10) {
          // Create a temporary particle effect showing earned value
          const effect = this.add.text(x, y, `+${value}` , {
            fontSize: '24px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
          });

          this.tweens.add({
            targets: effect,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => effect.destroy()
          });
        }

        private checkVodkaCollisions() {
          this.vodkaManager.getBottles().forEach((bottle, index) => {
            if (bottle && bottle.active) {
              const topPortion = 0.3;
              const horizontalOffsetFactor = 0.4;
              const radiusFactor = 0.45;

              const catchY = this.character.y - (this.character.displayHeight - this.character.displayHeight * topPortion);
              const offsetX = this.character.displayWidth * horizontalOffsetFactor;
              const catchRadius = Math.min(this.character.displayWidth, this.character.displayHeight) * radiusFactor;

              const distance = Phaser.Math.Distance.Between(
                this.character.x - offsetX, catchY,
                bottle.x, bottle.y
              );

              if (distance < catchRadius) {
                this.catchVodka(bottle, index);
              }
            }
          });
        }

        private checkAntiBoostCollisions() {
          this.antiBoostManager.getJars().forEach((jar, index) => {
            if (jar && jar.active) {
              const topPortion = 0.3;
              const horizontalOffsetFactor = 0.4;
              const radiusFactor = 0.45;

              const catchY = this.character.y - (this.character.displayHeight - this.character.displayHeight * topPortion);
              const offsetX = this.character.displayWidth * horizontalOffsetFactor;
              const catchRadius = Math.min(this.character.displayWidth, this.character.displayHeight) * radiusFactor;

              const distance = Phaser.Math.Distance.Between(
                this.character.x - offsetX, catchY,
                jar.x, jar.y
              );

              if (distance < catchRadius) {
                this.catchAntiBoost(jar, index);
              }
            }
          });
        }

        private catchAntiBoost(jar: Phaser.GameObjects.Sprite, index: number) {
          // Apply 4-second stun: stop movement and ignore input/dash
          const stunDurationMs = 4000;
          this.isStunned = true;
          this.isDashing = false;
          this.character.setVelocityX(0);
          if (this.character?.anims) {
            this.character.play('idle');
          }

          // Remove any speed boost while stunned
          this.speedMultiplier = 1;
          this.boostEndTime = 0;

          // Create or refresh ice overlay on character
          if (this.iceOverlay) {
            this.iceOverlay.destroy();
          }
          this.iceOverlay = this.add.sprite(this.character.x, this.character.y, 'ice');
          this.iceOverlay.setOrigin(0.5, 1);
          // Match character scale
          this.iceOverlay.setScale(3.5);
          this.iceOverlay.setDepth((this.character.depth || 0) + 1);
          // Play looping ice animation frames
          this.iceOverlay.play('ice_anim');

          // Tint the character blue for the stun duration
          try { (this.character as any).setTint?.(0x66ccff); } catch {}

          // Destroy the jar
          jar.destroy();

          // End stun after duration
          this.time.delayedCall(stunDurationMs, () => {
            this.isStunned = false;
            // Clear tint and remove ice overlay
            try { (this.character as any).clearTint?.(); } catch {}
            if (this.iceOverlay) {
              this.tweens.add({
                targets: this.iceOverlay,
                alpha: 0,
                duration: 250,
                onComplete: () => {
                  this.iceOverlay?.destroy();
                  this.iceOverlay = null;
                }
              });
            }
          });
        }

       
        private catchVodka(bottle: Phaser.GameObjects.Sprite, index: number) {
          // Speed boost for a short duration with ghost trail
          const boostDurationMs = 5000;
          this.speedMultiplier = 2;
          this.boostEndTime = this.time.now + boostDurationMs;

          // Speed up run animation while boosted
          if (this.character?.anims) {
            this.character.anims.timeScale = 1.8;
          }
          // no overlay usage

          // Optional: small score for collecting
          this.score += 5;
          this.scoreText.setText(`Score: ${this.score}`);
          bottle.destroy();
        }

        // no ghost trail function

        private createBonusCatchEffect(x: number, y: number) {
          // Create a special bonus effect for gifts
          const effect = this.add.text(x, y, '+50 BONUS!', {
            fontSize: '28px',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
          });
          
          // Animate the effect with more dramatic movement
          this.tweens.add({
            targets: effect,
            y: y - 80,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
              effect.destroy();
            }
          });
        }

        gameOver() {
          //personage stop
          if (this.character) {
            this.character.setVelocityX(0);
            // Set idle pose on game over
            if (this.character.anims) {
              this.character.play('idle');
            } else {
              this.character.setFrame?.(0);
            }
          }

          // music stop
          if (this.bgMusic) {
            this.bgMusic.stop();
          }

          // Call onGameEnd with snowflakes earned and total score
          const onGameEndCallback = this.game.registry.get('onGameEnd');
          if (onGameEndCallback) {
            onGameEndCallback(this.snowflakesEarned, this.score);
          }

          // stop boost
          this.speedMultiplier = 1;
          this.isStunned = false;
          // stop managers
          if (this.antiBoostManager) {
            this.antiBoostManager.cleanup();
          }
          try { (this.character as any).clearTint?.(); } catch {}
          if (this.iceOverlay) {
            this.iceOverlay.destroy();
            this.iceOverlay = null;
          }
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current!,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: Math.max(window.innerWidth, 320),
          height: Math.max(window.innerHeight, 240),
          min: {
            width: 320,
            height: 240
          }
        },
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: [PreloadScene, GameScene]
      });
      // Ensure the Phaser canvas is focusable and focused for keyboard input
      setTimeout(() => {
        const canvas: any = (gameRef.current as any)?.canvas;
        if (canvas) {
          canvas.setAttribute('tabindex', '0');
          try { canvas.focus(); } catch {}
        }
      }, 0);
      
      // Pass onGameEnd callback to the game
      if (onGameEnd) {
        gameRef.current.registry.set('onGameEnd', onGameEnd);
      }
      setReady(true);
    });

    return () => {
      if (gameRef.current) {
        // Clean up managers before destroying the game
        const gameScene = gameRef.current.scene.getScene('Game');
        if (gameScene && gameScene.snowflakeManager) {
          gameScene.snowflakeManager.cleanup();
        }
        if (gameScene && gameScene.giftManager) {
          gameScene.giftManager.cleanup();
        }
        // Blur canvas to release keyboard focus before destroy
        try { (gameRef.current as any)?.canvas?.blur?.(); } catch {}
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameEnd]);

  return (
    <div ref={hostRef} tabIndex={0} style={{ position: 'fixed', inset: 0 }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, opacity: 0.8, color: '#e7e9ff' }}>
          Loading…
        </div>
      )}
    </div>
  );
}

