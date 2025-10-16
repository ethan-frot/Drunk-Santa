'use client';

import { useEffect, useRef, useState } from 'react';
import { SnowflakeManager } from '../utils/snowflake';
import { GiftManager } from '../utils/gift';
import { AbilityManager } from '../utils/abilities';
import { VodkaManager } from '../utils/vodka';
import { AntiBoostManager } from '../utils/freeze';


export default function GameCanvas({ onGameEnd, isPaused = false }: { onGameEnd?: (snowflakesEarned: number, totalScore: number) => void; isPaused?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const creatingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const reportedRef = useRef(false);
  const [abilityManager] = useState(() => AbilityManager.getInstance());
  const onGameEndRef = useRef(onGameEnd);
  
  // Keep the ref updated
  onGameEndRef.current = onGameEnd;

  useEffect(() => {
    // Global focus helper and listeners to restore keyboard after overlays
    const focusCanvas = () => {
      const canvas: any = (gameRef.current as any)?.canvas;
      if (canvas) {
        canvas.setAttribute('tabindex', '0');
        try {
          canvas.focus({ preventScroll: true } as any);
        } catch (e) {
          // Canvas focus error - silently continue
        }
      }
    };
    const onWindowFocus = () => focusCanvas();
    const onVisibilityChange = () => { if (!document.hidden) focusCanvas(); };
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (gameRef.current || creatingRef.current) {
      return () => {};
    }
    creatingRef.current = true;
    // Create a unique effect token to avoid React Strict Mode double-create
    const w: any = typeof window !== 'undefined' ? window : {};
    const effectToken = Symbol('game_effect');
    w.__CATCH_EFFECT_TOKEN__ = effectToken;
    import('phaser').then((Phaser) => {
      // If a newer effect ran, abort this creation
      if (w.__CATCH_EFFECT_TOKEN__ !== effectToken) {
        creatingRef.current = false;
        return;
      }
      class PreloadScene extends Phaser.Scene {
        constructor() { super('Preload'); }
        preload() {
          // Load character sprite sheet (6 frames, 32x32)
          this.load.spritesheet('character', '/assets/characters/santa-walk.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          this.load.image('background', '/assets/ui/game/game-background.png');
          // Load snowflake sprite
          this.load.image('snowflake', '/assets/items/snowflake.png');
          // Load gift sprites (three types)
          this.load.image('cadeau', '/assets/items/gift.png'); // legacy/fallback
          this.load.image('gift1', '/assets/items/gift1.png'); // double points 10s
          this.load.image('gift2', '/assets/items/gift2.png'); // +150 points
          this.load.image('gift3', '/assets/items/gift3.png'); // golden snowballs 10s
          // Load vodka sprite
          this.load.image('vodka', '/assets/items/vodka.png');
          // Load anti-boost sprite
          this.load.image('antiboost', '/assets/items/freeze-bottle.png');
          // Load snowball sprites (two frames for animation)
          this.load.image('snowball1', '/assets/items/snowball1.png');
          this.load.image('snowball2', '/assets/items/snowball2.png');
          // Load golden snowball sprites (two frames for animation)
          this.load.image('goldball1', '/assets/items/goldball1.png');
          this.load.image('goldball2', '/assets/items/goldball2.png');
          // Load ice overlay as spritesheet (single strip animation 32x32 frames)
          this.load.spritesheet('ice', '/assets/abilities/freezing.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          // Load throw animation sheet (character throwing snowball)
          this.load.spritesheet('throw', '/assets/characters/santa-throw.png', {
            frameWidth: 32,
            frameHeight: 32,
            margin: 0,
            spacing: 0
          });
          // Load monster walk spritesheet (demon-walk.png). Sheet is 4x2 frames.
          this.load.spritesheet('monster5', '/assets/characters/demon-walk.png', {
            frameWidth: 80, // adjust to avoid cropping (w/ 4 columns on 320px width)
            frameHeight: 100, // adjust to full frame height (2 rows on 200px height)
            margin: 0,
            spacing: 0
          });
          // Load second monster (skeleton-walk.png) - 2x2 frames (80x100 each)
          this.load.spritesheet('monster4', '/assets/characters/skeleton-walk.png', {
            frameWidth: 80,
            frameHeight: 100,
            margin: 0,
            spacing: 0
          });

          // Dash icon assets (use user's images)
          this.load.image('dash_full', '/assets/abilities/dash/dash-full.png');
          this.load.image('dash_empty', '/assets/abilities/dash/dash-empty.png');
          this.load.image('dash1', '/assets/abilities/dash/dash1.png');
          this.load.image('dash2', '/assets/abilities/dash/dash2.png');
          this.load.image('dash3', '/assets/abilities/dash/dash3.png');

          //music
          this.load.audio('music', '/sounds/game-music.mp3');
          // dash sound effect
          this.load.audio('dash_sfx', '/sounds/dash-sound.mp3');
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
        private slime: any = null; // monster A instance (monster5)
        private slimeTargetOffset: number = 24; // stop this many px before character center
        private slimeSpeed: number = 70;
        private slimeHitsTaken: number = 0;

        private snowballs: Phaser.GameObjects.Sprite[] = [];
        private nextThrowTime: number = 0;
        private throwCooldownMs: number = 400;
        private throwSprite: any = null;
        private nextSnowballFrame: 1 | 2 = 1;

        // Monster B (monster4)
        private monsterB: any = null;
        private monsterBHitsTaken: number = 0;
        private monsterBSpawnsLeft: number = 0;
  
        private score: number = 0;
        private scoreText: any;
        private bgMusic: any;
        private timerText: any;
        private timerEvent: any;
        private timeLeft: number = 120;
        private gameActive: boolean = true;
        private isStunned: boolean = false;
        private hasEnded: boolean = false;
        private isDashing: boolean = false;
        private dashCooldown: number = 0; // remaining ms
        private dashCooldownTotal: number = 0; // total ms for current cooldown
        private spaceKey: any;
        private snowflakesEarned: number = 0;
        private abilityManager: any;
        private baseMoveSpeed: number = 200;
        private speedMultiplier: number = 1;
        private boostEndTime: number = 0;
        // Dash HUD elements (image-based)
        private dashHudContainer: any;
        private dashImage: any;
        private dashHudSize: number = 96;
        // Power-up states
        private scoreMultiplier: number = 1;
        private multiplierEndTime: number = 0;
        private goldenSnowballActive: boolean = false;
        private goldenEndTime: number = 0;
        // Power-up HUD (top-right, under dash)
        private powerupHudContainer: any;
        private doubleIcon: any;
        private goldenIcon: any;
        private vodkaIcon: any;
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
          this.hasEnded = false;

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
          this.character.setCollideWorldBounds(false);

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
          // Monster walk animation
          if (!this.anims.exists('monster_walk')) {
            this.anims.create({
              key: 'monster_walk',
              // Limit frames to avoid out-of-range on some sprite sheets
              frames: this.anims.generateFrameNumbers('monster5', { start: 0, end: 3 }),
              frameRate: 10,
              repeat: -1
            });
          }
          // Monster4 walk animation (4 frames)
          if (!this.anims.exists('monster4_anim')) {
            this.anims.create({
              key: 'monster4_anim',
              frames: this.anims.generateFrameNumbers('monster4', { start: 0, end: 3 }),
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
          // Now that position is set, size the physics body to 95% and align to bottom
          try {
            const body = this.character.body as Phaser.Physics.Arcade.Body;
            const width = this.character.displayWidth * 0.95;
            const height = this.character.displayHeight * 0.95;
            const offsetX = (this.character.displayWidth - width) / 2;
            const offsetY = this.character.displayHeight - height;
            body.setSize(width, height, false);
            body.setOffset(offsetX, offsetY);
            body.setAllowGravity(false);
            body.setImmovable(true);
          } catch {}

          // Reposition and resize bounds when the game resizes
          this.scale.on('resize', (gameSize: any) => {
            const { width, height } = gameSize;
            this.physics.world.setBounds(0, 0, width, height);
            this.keepCharacterAtBottom();
          });

          // Ensure keyboard input is enabled and capture keys
          if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
            try { this.input.keyboard.removeAllKeys(true); } catch {}
            this.input.keyboard.addCapture([
              Phaser.Input.Keyboard.KeyCodes.LEFT,
              Phaser.Input.Keyboard.KeyCodes.RIGHT,
              Phaser.Input.Keyboard.KeyCodes.SPACE
            ]);
            try {
              const onKeyDown = (ev: KeyboardEvent) => { /* keydown event */ };
              const onKeyUp = (ev: KeyboardEvent) => { /* keyup event */ };
              (this.input.keyboard as any).on('keydown', onKeyDown);
              (this.input.keyboard as any).on('keyup', onKeyUp);
              this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                try {
                  (this.input.keyboard as any).off('keydown', onKeyDown);
                  (this.input.keyboard as any).off('keyup', onKeyUp);
                } catch {}
              });
            } catch {}
          }
          // Set up keyboard controls (fresh bindings each scene create)
          this.cursors = this.input.keyboard?.createCursorKeys();

          // Ensure canvas keeps focus for reliable keyboard input
          const canvas: any = this.game.canvas as any;
          if (canvas) {
            canvas.setAttribute('tabindex', '0');
            try { canvas.focus({ preventScroll: true } as any); } catch {}

            const focusCanvas = () => { try { canvas.focus({ preventScroll: true } as any); } catch {} };
            // Refocus on any pointer interaction inside the game
            this.input.on('pointerdown', () => { focusCanvas(); });
            // Refocus when tab becomes visible again
            const onVisibility = () => { if (!document.hidden) focusCanvas(); };
            document.addEventListener('visibilitychange', onVisibility);

            // Clean up listeners on scene shutdown
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
              try { this.input.off('pointerdown', focusCanvas); } catch {}
              document.removeEventListener('visibilitychange', onVisibility);
            });
          }
          this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

          // Create score text
          this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            fontFamily: 'November, sans-serif',
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
          // Spawn monster A once after short delay
          this.time.delayedCall(1500, () => this.spawnMonsterA());

          // Mouse click to throw snowball (only if slime exists)
          this.input.on('pointerdown', () => {
            this.tryThrowSnowball();
          });
          // Create Dash Cooldown HUD
          this.createDashHud();
          // Create Power-up HUD
          this.createPowerupHud();
          // Create timer text
          this.timerText = this.add.text(this.scale.width / 2, 50, '120', {
            fontSize: '48px',
            fontFamily: 'November, sans-serif',
            color: '#e7e9ff',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Timer event - countdown every second
          this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
              const isPaused = this.game.registry.get('isPaused') || false;
              if (this.gameActive && !isPaused) {
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
            if (this.dashHudContainer) {
              this.dashHudContainer.setPosition(gameSize.width - (this.dashHudSize / 2 + 20), 20 + this.dashHudSize / 2);
            }
            if (this.powerupHudContainer) {
              const baseX = gameSize.width - (this.dashHudSize / 2 + 20);
              // Place just below dash HUD, with spacing
              this.powerupHudContainer.setPosition(baseX, 20 + this.dashHudSize + 20);
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
          
          // Apply bonus size progress to gifts and vodka
          const bonusProgress = this.abilityManager.getCurrentValue('bonus_size');
          this.giftManager.setGiftSize(bonusProgress);
          this.vodkaManager.setBonusSizeProgress?.(bonusProgress);
          
          // Apply dash cooldown upgrade
          const dashCooldown = this.abilityManager.getCurrentValue('dash_cooldown');
          this.dashCooldown = dashCooldown;
        }

        private performDash(direction: number) {
          this.isDashing = true;
          this.dashCooldownTotal = this.abilityManager.getCurrentValue('dash_cooldown');
          this.dashCooldown = this.dashCooldownTotal;
          // play dash sound effect starting 260ms into the clip and louder
          try { this.sound.play('dash_sfx', { volume: 1, seek: 0.26 }); } catch {}
          
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
          // Reflect cooldown start immediately on HUD
          this.updateDashHud();
          // Ensure the icon is visible during cooldown animation
          if (this.dashImage) this.dashImage.setVisible(true);
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

        private createDashHud() {
          const size = this.dashHudSize; // 96
          const hudX = this.scale.width - (size / 2 + 20);
          const hudY = 20 + size / 2; // top-right
          
          this.dashHudContainer = this.add.container(hudX, hudY).setScrollFactor(0);
          // Ensure HUD is always on top of everything
          this.dashHudContainer.setDepth(10000);
          
          // Single image that we swap based on stage
          this.dashImage = this.add.image(0, 0, 'dash_full');
          this.dashImage.setDisplaySize(size, size);
          this.dashImage.setDepth(10001);
          this.dashHudContainer.add(this.dashImage);

          // Initial state
          // Start hidden until first dash triggers animation
          if (this.dashImage) this.dashImage.setVisible(false);
        }

        private createPowerupHud() {
          const baseX = this.scale.width - (this.dashHudSize / 2 + 20);
          const baseY = 20 + this.dashHudSize + 20; // below dash icon
          this.powerupHudContainer = this.add.container(baseX, baseY).setScrollFactor(0);
          this.powerupHudContainer.setDepth(10000);

          // Icons start hidden; we reuse textures as icons
          const iconSize = 64;
          const vodkaIconSize = 88; // larger vodka icon
          this.doubleIcon = this.add.image(0, 0, 'gift1');
          this.doubleIcon.setDisplaySize(iconSize, iconSize);
          this.doubleIcon.setVisible(false);
          this.doubleIcon.setDepth(10001);
          this.powerupHudContainer.add(this.doubleIcon);

          this.goldenIcon = this.add.image(0, iconSize + 10, 'gift3');
          this.goldenIcon.setDisplaySize(iconSize, iconSize);
          this.goldenIcon.setVisible(false);
          this.goldenIcon.setDepth(10001);
          this.powerupHudContainer.add(this.goldenIcon);

          // Position vodka below others with adjusted offset for larger size
          const vodkaY = (iconSize + 10) * 2 + (vodkaIconSize - iconSize) / 2;
          this.vodkaIcon = this.add.image(0, vodkaY, 'vodka');
          this.vodkaIcon.setDisplaySize(vodkaIconSize, vodkaIconSize);
          this.vodkaIcon.setVisible(false);
          this.vodkaIcon.setDepth(10001);
          this.powerupHudContainer.add(this.vodkaIcon);
        }

        private updateDashHud() {
          if (!this.dashHudContainer) return;
          const remaining = Math.max(0, this.dashCooldown);
          if (remaining <= 0) {
            // Cooldown finished: hide icon until next dash
            if (this.dashImage) this.dashImage.setVisible(false);
            return;
          }
          // Ensure icon is visible while animating cooldown
          if (this.dashImage && !this.dashImage.visible) this.dashImage.setVisible(true);
          const ratio = Phaser.Math.Clamp(remaining / this.dashCooldownTotal, 0, 1);
          // Determine stage from ratio: 0 (empty) .. 4 (full)
          const stage = 4 - Math.ceil(ratio * 4);
          const key = stage <= 0 ? 'dash_empty' : stage === 1 ? 'dash1' : stage === 2 ? 'dash2' : stage === 3 ? 'dash3' : 'dash_full';
          if (this.dashImage) this.dashImage.setTexture(key);
          // No pulse animation during cooldown
        }

        update() {
          if (!this.gameActive) return;
          
          // Get pause state from registry
          const isPaused = this.game.registry.get('isPaused') || false;
          
          // Pause game if parent component requests it
          if (isPaused) {
            // Pause timer
            if (this.timerEvent) {
              this.timerEvent.paused = true;
            }
            // Keep character still when paused
            if (this.character) {
              this.character.setVelocityX(0);
              if (this.character.anims?.currentAnim?.key !== 'idle') {
                this.character.play('idle');
              }
            }
            return;
          } else {
            // Resume timer when not paused
            if (this.timerEvent) {
              this.timerEvent.paused = false;
            }
          }

          // Keep the character on the bottom each frame, but allow X to move
          this.keepCharacterAtBottom();

          // Update dash cooldown
          if (this.dashCooldown > 0) {
            this.dashCooldown -= 16; // Assuming 60fps, ~16ms per frame
          }
          // Update dash HUD progression every frame
          this.updateDashHud();

          // Handle power-up expirations and icon flashing
          if (this.scoreMultiplier > 1) {
            const remaining = this.multiplierEndTime - this.time.now;
            if (remaining <= 0) {
              this.scoreMultiplier = 1;
              this.multiplierEndTime = 0;
              if (this.doubleIcon) this.doubleIcon.setVisible(false);
            } else {
              // Flash faster in last 2s
              if (this.doubleIcon && this.doubleIcon.visible) {
                const hz = remaining < 500 ? 10 : remaining < 1000 ? 6 : remaining < 2000 ? 3 : 0;
                if (hz > 0) {
                  const t = this.time.now / 1000;
                  const alpha = 0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t);
                  this.doubleIcon.setAlpha(alpha);
                } else {
                  this.doubleIcon.setAlpha(1);
                }
              }
            }
          }
          if (this.goldenSnowballActive) {
            const remaining = this.goldenEndTime - this.time.now;
            if (remaining <= 0) {
              this.goldenSnowballActive = false;
              this.goldenEndTime = 0;
              if (this.goldenIcon) this.goldenIcon.setVisible(false);
            } else {
              if (this.goldenIcon && this.goldenIcon.visible) {
                const hz = remaining < 500 ? 10 : remaining < 1000 ? 6 : remaining < 2000 ? 3 : 0;
                const t = this.time.now / 1000;
                const alpha = hz > 0 ? 0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t) : 1;
                this.goldenIcon.setAlpha(alpha);
              }
            }
          }

          // Vodka boost HUD flashing based on boostEndTime
          if (this.boostEndTime > this.time.now) {
            if (this.vodkaIcon && !this.vodkaIcon.visible) {
              this.vodkaIcon.setVisible(true);
              this.vodkaIcon.setAlpha(1);
            }
            const remaining = this.boostEndTime - this.time.now;
            const hz = remaining < 500 ? 10 : remaining < 1000 ? 6 : remaining < 2000 ? 3 : 0;
            if (this.vodkaIcon) {
              const t = this.time.now / 1000;
              const alpha = hz > 0 ? 0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t) : 1;
              this.vodkaIcon.setAlpha(alpha);
            }
          } else {
            if (this.vodkaIcon && this.vodkaIcon.visible) {
              this.vodkaIcon.setVisible(false);
            }
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

          // Safety: ensure character is visible if no throw is playing
          if (!this.throwSprite && this.character && this.character.alpha === 0) {
            this.character.setAlpha(1);
          }

          // Update monsters towards the character
          this.updateMonsterA();
          this.updateMonsterB();

          // Update snowballs and collisions
          this.updateSnowballs();
        }

        private getShrinkBounds(obj: Phaser.GameObjects.Sprite, shrinkFactor: number = 0.95) {
          const width = (obj.displayWidth || 0) * shrinkFactor;
          const height = (obj.displayHeight || 0) * shrinkFactor;
          const originX = (obj.originX ?? 0.5);
          const originY = (obj.originY ?? 0.5);
          // Compute top-left relative to display size and origin
          const left = obj.x - width * originX;
          const top = obj.y - height * originY;
          return { left, top, right: left + width, bottom: top + height };
        }

        private rectsOverlap(a: {left:number;top:number;right:number;bottom:number}, b: {left:number;top:number;right:number;bottom:number}) {
          return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
        }

        private spawnMonsterA() {
          // Decide spawn side
          const fromLeft = Math.random() < 0.5;
          const y = this.getBottomY();
          const x = fromLeft ? -40 : this.scale.width + 40;
          if (this.slime) {
            this.slime.destroy();
          }
          this.slime = this.physics.add.sprite(x, y, 'monster5');
          this.slime.setOrigin(0.5, 1);
          this.slime.setScale(1.1);
          this.slime.play('monster_walk');
          this.slime.setDepth(4);
          // No bobbing/shadow effect
          this.slimeHitsTaken = 0;
        }

        private updateMonsterA() {
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
            // Monster A spawns only once — no respawn
          }
        }

        private spawnMonsterB() {
          const fromLeft = Math.random() < 0.5;
          const y = this.getBottomY();
          const x = fromLeft ? -40 : this.scale.width + 40;
          if (this.monsterB) {
            this.monsterB.destroy();
          }
          this.monsterB = this.physics.add.sprite(x, y, 'monster4');
          this.monsterB.setOrigin(0.5, 1);
          this.monsterB.setScale(1.0);
          this.monsterB.play('monster4_anim');
          this.monsterB.setDepth(6);
          this.monsterB.setAlpha(1);
          this.monsterBHitsTaken = 0;
        }

        private updateMonsterB() {
          if (!this.monsterB || !this.monsterB.active) return;
          this.monsterB.y = this.getBottomY();
          const targetX = this.character.x + (this.character.flipX ? 1 : -1) * this.slimeTargetOffset;
          const distance = Math.abs(targetX - this.monsterB.x);
          if (distance <= 6) {
            this.monsterB.setVelocityX(0);
            return;
          }
          const dir = targetX > this.monsterB.x ? 1 : -1;
          this.monsterB.setVelocityX(dir * this.slimeSpeed);
          this.monsterB.setFlipX(dir > 0);
          if (this.monsterB.x < -120 || this.monsterB.x > this.scale.width + 120) {
            this.monsterB.destroy();
          }
        }

        private tryThrowSnowball() {
          const hasA = this.slime && this.slime.active;
          const hasB = this.monsterB && this.monsterB.active;
          if (!hasA && !hasB) return;
          if (this.isStunned) return;
          if (this.time.now < this.nextThrowTime) return;
          this.nextThrowTime = this.time.now + this.throwCooldownMs;

          // Play throw animation once, then restore run/idle
          const wasRunning = this.character.anims?.currentAnim?.key === 'run';
          // Face the target before throwing
          const target = hasA ? this.slime : this.monsterB;
          const faceRight = target.x > this.character.x;
          this.character.setFlipX(!faceRight);
          // Create a temporary throw sprite over the character
          if (this.throwSprite) { this.throwSprite.destroy(); this.throwSprite = null; this.character.setAlpha(1); }
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
          // Fallback in case the completion event is lost
          this.time.delayedCall(600, () => {
            if (!this.throwSprite && this.character.alpha === 0) {
              this.character.setAlpha(prevAlpha);
            }
          });

          // Spawn a snowball sprite and launch toward target
          const startX = this.character.x + (this.character.flipX ? -10 : 10);
          const startY = this.character.y - this.character.displayHeight * 0.65;
          const isGolden = this.goldenSnowballActive;
          const frame = this.nextSnowballFrame; // alternate 1 and 2 each throw
          this.nextSnowballFrame = frame === 1 ? 2 : 1;
          const baseKey = isGolden ? 'goldball' : 'snowball';
          const snowball = this.add.sprite(startX, startY, `${baseKey}${frame}`) as any;
          snowball.setDepth?.(5);
          // Double visual size
          snowball.setScale(isGolden ? 2.0 : 1.8);
          this.physics.add.existing(snowball);
          const body = (snowball as any).body as Phaser.Physics.Arcade.Body;
          body.setAllowGravity(false);

          // velocity towards current slime position
          const dx = (target.x) - startX;
          const dy = (target.y - target.displayHeight * 0.5) - startY;
          const len = Math.max(1, Math.hypot(dx, dy));
          const speed = isGolden ? 560 : 480;
          body.setVelocity((dx / len) * speed, (dy / len) * speed);

          // Per-snowball small animation: toggle texture every 80ms
          const toggle = () => {
            if (!snowball || !snowball.active) return;
            const current = snowball.texture?.key || `${baseKey}${frame}`;
            const next = current.endsWith('1') ? `${baseKey}2` : `${baseKey}1`;
            snowball.setTexture(next);
          };
          const timer = this.time.addEvent({ delay: 80, callback: toggle, callbackScope: this, loop: true });
          (snowball as any).__animTimer = timer;
          this.snowballs.push(snowball as any);
        }

        private updateSnowballs() {
          if (this.snowballs.length === 0) return;
          this.snowballs.forEach((ball, index) => {
            if (!ball || !ball.active) return;
            // Remove off-screen
            if (ball.x < -50 || ball.x > this.scale.width + 50 || ball.y < -50 || ball.y > this.scale.height + 50) {
              try { (ball as any).__animTimer?.remove?.(); } catch {}
              ball.destroy();
              this.snowballs.splice(index, 1);
              return;
            }

            // Collision with monster A
            if (this.slime && this.slime.active) {
              const hitDist = 28; // fairly generous hitbox
              const d = Phaser.Math.Distance.Between(ball.x, ball.y, this.slime.x, this.slime.y - this.slime.displayHeight * 0.5);
              if (d < hitDist) {
                try { (ball as any).__animTimer?.remove?.(); } catch {}
                ball.destroy();
                this.snowballs.splice(index, 1);
                this.onSnowballHitMonsterA();
                return;
              }
            }
            // Collision with monster B
            if (this.monsterB && this.monsterB.active) {
              const hitDistB = 28;
              const dB = Phaser.Math.Distance.Between(ball.x, ball.y, this.monsterB.x, this.monsterB.y - this.monsterB.displayHeight * 0.5);
              if (dB < hitDistB) {
                try { (ball as any).__animTimer?.remove?.(); } catch {}
                ball.destroy();
                this.snowballs.splice(index, 1);
                this.onSnowballHitMonsterB();
              }
            }
          });
        }

        private onSnowballHitMonsterA() {
          if (!this.slime || !this.slime.active) return;
          if (this.goldenSnowballActive) {
            // Oneshoot: destroy immediately
            this.tweens.add({
              targets: this.slime,
              scaleX: 0,
              scaleY: 0,
              duration: 120,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.slime?.destroy();
                // Schedule Monster B spawns if not already scheduled
                this.monsterBSpawnsLeft = 2;
                this.time.delayedCall(30000, () => this.trySpawnMonsterBSequence());
              }
            });
            return;
          }
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
                // Start schedule for monster B spawns: 2 times with 30s pause
                this.monsterBSpawnsLeft = 2;
                this.time.delayedCall(30000, () => this.trySpawnMonsterBSequence());
              }
            });
          }
        }

        private trySpawnMonsterBSequence() {
          if (this.monsterBSpawnsLeft <= 0) return;
          this.spawnMonsterB();
          this.monsterBSpawnsLeft -= 1;
          if (this.monsterBSpawnsLeft > 0) {
            this.time.delayedCall(30000, () => this.trySpawnMonsterBSequence());
          }
        }

        private onSnowballHitMonsterB() {
          if (!this.monsterB || !this.monsterB.active) return;
          if (this.goldenSnowballActive) {
            this.tweens.add({
              targets: this.monsterB,
              scaleX: 0,
              scaleY: 0,
              duration: 120,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.monsterB?.destroy();
                this.monsterB = null;
                this.monsterBHitsTaken = 0;
              }
            });
            return;
          }
          this.monsterBHitsTaken += 1;
          try {
            this.monsterB.setTint(0xaaffff);
            this.time.delayedCall(100, () => this.monsterB?.clearTint?.());
          } catch {}

          if (this.monsterBHitsTaken >= 3) {
            this.tweens.add({
              targets: this.monsterB,
              scaleX: 0,
              scaleY: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.monsterB?.destroy();
                this.monsterB = null;
                this.monsterBHitsTaken = 0;
              }
            });
          }
        }

        private checkGiftCollisions() {
          const charBounds = this.getShrinkBounds(this.character, 0.95);
          this.giftManager.getGifts().forEach((gift, index) => {
            if (!gift || !gift.active) return;
            const giftBounds = this.getShrinkBounds(gift, 0.95);
            if (this.rectsOverlap(charBounds, giftBounds)) {
              this.catchGift(gift, index);
            }
          });
        }

        private checkSnowflakeCollisions() {
          const charBounds = this.getShrinkBounds(this.character, 0.95);
          this.snowflakeManager.getSnowflakes().forEach((snowflake, index) => {
            if (!snowflake || !snowflake.active) return;
            const flakeBounds = this.getShrinkBounds(snowflake, 0.95);
            if (this.rectsOverlap(charBounds, flakeBounds)) {
              this.catchSnowflake(snowflake, index);
            }
          });
        }

        private catchSnowflake(snowflake: Phaser.GameObjects.Sprite, index: number) {
          // Get snowflake value from manager
          const snowflakeValue = this.snowflakeManager.getSnowflakeValue();
          
          // Add score
          const earned = snowflakeValue * this.scoreMultiplier;
          this.score += earned;
          this.snowflakesEarned += 1; // Track for ability system
          this.scoreText.setText(`Score: ${this.score}`);
          
          // Create catch effect with dynamic value
          this.createCatchEffect(snowflake.x, snowflake.y, earned);
          
          // Destroy the snowflake
          snowflake.destroy();
        }

        private catchGift(gift: Phaser.GameObjects.Sprite, index: number) {
          const type = (gift as any).giftType as string | undefined;
          if (type === 'gift1') {
            // Double points for 10 seconds
            this.scoreMultiplier = 2;
            this.multiplierEndTime = this.time.now + 10000;
            if (this.doubleIcon) {
              this.doubleIcon.setVisible(true);
              this.doubleIcon.setAlpha(1);
            }
            // No points awarded, no +text display
          } else if (type === 'gift2') {
            // Instant +150 points
            this.score += 150;
            this.scoreText.setText(`Score: ${this.score}`);
            this.createBonusCatchEffect(gift.x, gift.y, '+150');
          } else if (type === 'gift3') {
            // Golden snowballs for 10 seconds
            this.goldenSnowballActive = true;
            this.goldenEndTime = this.time.now + 10000;
            if (this.goldenIcon) {
              this.goldenIcon.setVisible(true);
              this.goldenIcon.setAlpha(1);
            }
            // No points awarded, no +text display
          } else {
            // Fallback: no points, no display
          }
          gift.destroy();
        }

        private createCatchEffect(x: number, y: number, value: number = 10) {
          // Create a temporary particle effect showing earned value
          const effect = this.add.text(x, y, `+${value}` , {
            fontSize: '24px',
            fontFamily: 'November, sans-serif',
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
          const charBounds = this.getShrinkBounds(this.character, 0.95);
          this.vodkaManager.getBottles().forEach((bottle, index) => {
            if (!bottle || !bottle.active) return;
            const bottleBounds = this.getShrinkBounds(bottle, 0.95);
            if (this.rectsOverlap(charBounds, bottleBounds)) {
              this.catchVodka(bottle, index);
            }
          });
        }

        private checkAntiBoostCollisions() {
          const charBounds = this.getShrinkBounds(this.character, 0.95);
          this.antiBoostManager.getJars().forEach((jar, index) => {
            if (!jar || !jar.active) return;
            // Use an even tighter hitbox for freeze jars so they don't hit from too far
            const jarBounds = this.getShrinkBounds(jar, 0.5);
            if (this.rectsOverlap(charBounds, jarBounds)) {
              this.catchAntiBoost(jar, index);
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

          // Show vodka HUD icon when boost starts
          if (this.vodkaIcon) {
            this.vodkaIcon.setVisible(true);
            this.vodkaIcon.setAlpha(1);
          }
        }

        // no ghost trail function

        private createBonusCatchEffect(x: number, y: number, text: string) {
          // Create a special bonus effect text for gifts
          const effect = this.add.text(x, y, text, {
            fontSize: '28px',
            fontFamily: 'November, sans-serif',
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
          if (this.hasEnded) return;
          this.hasEnded = true;
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

          // call callback (if passed through game.registry)
          // call onGameEnd with snowflakes earned and total score
          const onGameEnd = this.game.registry.get('onGameEnd');
          if (onGameEnd) {
            onGameEnd(this.snowflakesEarned, this.score);
          }
          // stop timers to avoid any further callbacks
          this.time.removeAllEvents();
          if (this.snowflakeManager) this.snowflakeManager.stop();
          if (this.giftManager) this.giftManager.stop();
          // clear registry callback
          this.game.registry.set('onGameEnd', null);
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
      // Keep a global handle to avoid cross-destroy between effects
      w.__CATCH_GAME_INSTANCE__ = gameRef.current;
      // Ensure the Phaser canvas is focusable and focused soon after mount
      setTimeout(focusCanvas, 0);
      
      // Pass onGameEnd callback to the game
      if (onGameEndRef.current) {
        gameRef.current.registry.set('onGameEnd', (snowflakesEarned: number, totalScore: number) => {
          if (reportedRef.current) return;
          reportedRef.current = true;
          onGameEndRef.current?.(snowflakesEarned, totalScore);
        });
      }
      
      // Pass isPaused state to the game
      gameRef.current.registry.set('isPaused', isPaused);
      setReady(true);
      creatingRef.current = false;
    });

    return () => {
      creatingRef.current = false;
      const w: any = typeof window !== 'undefined' ? window : {};
      // Only destroy if this component still owns the instance
      if (gameRef.current && w.__CATCH_GAME_INSTANCE__ === gameRef.current) {
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
      // cleanup focus listeners
      try {
        window.removeEventListener('focus', onWindowFocus);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      } catch {}
    };
  }, []); // Remove isPaused from dependencies to prevent game recreation

  // Separate effect to update pause state without recreating the game
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set('isPaused', isPaused);
    }
  }, [isPaused]);

  return (
    <div ref={hostRef} style={{ position: 'fixed', inset: 0 }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, opacity: 0.8, color: '#e7e9ff' }}>
          Loading…
        </div>
      )}
    </div>
  );
}

