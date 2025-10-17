'use client';

import { useEffect, useRef, useState } from 'react';
import { renderAlternating } from '../utils/renderAlternating';
import { SnowflakeManager } from '../utils/snowflake';
import { GiftManager } from '../utils/gift';
import { AbilityManager } from '../utils/abilities';
import { VodkaManager } from '../utils/vodka';
import { AntiBoostManager } from '../utils/freeze';
import SoundManager from '../utils/soundManager';
import GamepadManager from '@/app/utils/gamepadManager';


export default function GameCanvas({ onGameEnd, isPaused = false }: { onGameEnd?: (snowflakesEarned: number, totalScore: number) => void; isPaused?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const creatingRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadingDots, setLoadingDots] = useState(1);
  const reportedRef = useRef(false);
  const [abilityManager] = useState(() => AbilityManager.getInstance());
  const onGameEndRef = useRef(onGameEnd);
  
  // Keep the ref updated
  onGameEndRef.current = onGameEnd;

  // Animate dots while loading
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => setLoadingDots((d) => (d % 3) + 1), 420);
    return () => clearInterval(id);
  }, [ready]);

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
          // Load gift sprites (three types)
          this.load.image('cadeau', '/assets/items/gift.png'); // legacy/fallback
          this.load.image('gift1', '/assets/items/gift1.png'); // double points 10s
          this.load.image('gift2', '/assets/items/gift2.png'); // +150 points
          this.load.image('gift3', '/assets/items/gift3.png'); // golden snowballs 10s
          // Load animated snowflake frames
          this.load.image('snow1', '/assets/items/snowflakes/snow1.png');
          this.load.image('snow2', '/assets/items/snowflakes/snow2.png');
          this.load.image('snow3', '/assets/items/snowflakes/snow3.png');
          this.load.image('snow4', '/assets/items/snowflakes/snow4.png');
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
          // Load bonus background for power-up icons
          this.load.image('bonus_bg', '/assets/items/bonus-background.png');
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

          // Dash HUD icon
          this.load.image('dash_ui', '/assets/ui/game/dash.png');

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

        // Monster B (monster4) - allow multiple concurrent instances
        private monstersB: any[] = [];
  
        private score: number = 0;
        private scoreText: any;
        private bgMusic: any;
        private timerText: any;
        private timerEvent: any;
        private timeLeft: number = 60;
        private gameActive: boolean = true;
        private isStunned: boolean = false;
        private hasEnded: boolean = false;
        private isDashing: boolean = false;
        private isThrowing: boolean = false;
        private dashCooldown: number = 0; // remaining ms
        private dashCooldownTotal: number = 0; // total ms for current cooldown
        private spaceKey: any;
        private keyQ: any;
        private keyD: any;
        private gpLeft: boolean = false;
        private gpRight: boolean = false;
        private removeGpListener: (() => void) | null = null;
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
        private powerupHudItems: any[] = [];
        // Enemy hit cooldown
        private lastEnemyHitTime: number = 0;
        private enemyHitCooldownMs: number = 800;
        private hopOffset: number = 0;
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

          this.timeLeft = 60;
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
          // Snowflake animation (loops through snow1 -> snow4)
          if (!this.anims.exists('snowflake_anim')) {
            this.anims.create({
              key: 'snowflake_anim',
              frames: [
                { key: 'snow1' },
                { key: 'snow2' },
                { key: 'snow3' },
                { key: 'snow4' }
              ],
              frameRate: 2,
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
          
          // Check if sound is enabled before playing music
          const soundEnabled = localStorage.getItem('soundEnabled');
          const musicEnabled = localStorage.getItem('musicEnabled');
          if (soundEnabled !== 'false' && musicEnabled !== 'false') {
            this.bgMusic = this.sound.add('music', { loop: true, volume: 0.5 });
            this.bgMusic.play();
          }
          
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
          this.keyQ = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
          this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

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
              try { this.removeGpListener?.(); } catch {}
            });
          }
          this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

          // Gamepad listeners (A=throw, B=dash, Dpad Left/Right for movement)
          try {
            this.removeGpListener = GamepadManager.getInstance().addListener((btn) => {
              if (!this.gameActive) return;
              if (this.isStunned) return;
              if (btn === 'A') {
                this.tryThrowSnowball();
                return;
              }
              if (btn === 'B') {
                if (!this.isDashing && this.dashCooldown <= 0 && !this.isThrowing) {
                  // Dash in last intended or facing direction
                  const dir = this.gpLeft ? -1 : (this.gpRight ? 1 : (this.character?.flipX ? -1 : 1));
                  this.performDash(dir);
                }
                return;
              }
            });
            GamepadManager.getInstance().addConnectionListener((connected) => {
              if (!connected) { this.gpLeft = false; this.gpRight = false; }
            });
          } catch {}

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

          // Periodic spawner for Monster B to increase pressure
          // Attempts spawn every ~4s up to 3 simultaneous Monster B (plus Slime)
          this.time.addEvent({
            delay: 4000,
            callback: () => {
              const maxB = 3;
              const activeB = this.monstersB.filter(m => m && m.active).length;
              if (activeB < maxB) {
                this.spawnMonsterB();
              }
            },
            loop: true
          });

          // Mouse click to throw snowball (only if slime exists)
          this.input.on('pointerdown', () => {
            this.tryThrowSnowball();
          });
          // Create Dash Cooldown HUD
          this.createDashHud();
          // Create Power-up HUD
          this.createPowerupHud();
          // Create timer text
          this.timerText = this.add.text(this.scale.width / 2, 50, '60', {
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
          // Base ground Y (no hop). Used by enemies and world.
          return this.scale.height - paddingFromBottom;
        }

        private getCharacterBottomY() {
          const paddingFromBottom = 12;
          // Character-only hop offset
          return this.scale.height - paddingFromBottom - (this.hopOffset || 0);
        }

        private keepCharacterAtBottom() {
          // Lock only Y to the bottom for the character (with hop), do not modify X
          this.character.y = this.getCharacterBottomY();
          // Clamp X inside bounds in case of resize
          const halfWidth = (this.character.displayWidth || 0) / 2;
          const minX = halfWidth;
          const maxX = this.scale.width - halfWidth;
          if (this.character.x < minX) this.character.x = minX;
          if (this.character.x > maxX) this.character.x = maxX;
        }

        private positionCharacterAtBottomCenter() {
          this.character.setPosition(this.scale.width / 2, this.getCharacterBottomY());
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
          const soundEnabled = localStorage.getItem('soundEnabled');
          if (soundEnabled !== 'false') {
            try { this.sound.play('dash_sfx', { volume: 1, seek: 0.26 }); } catch {}
          }
          
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
          const afterimageCount = 7; // more pronounced trail
          const afterimageDelay = 35; // quicker spawn cadence

          // Determine facing direction (right = 1, left = -1)
          const dirX = this.character.flipX ? -1 : 1;
          // Try to capture current animation frame index for visual coherence
          const currentFrameIndex = (() => {
            try {
              const f: any = this.character.anims?.currentFrame;
              const idx = typeof f?.index === 'number' ? f.index : undefined;
              return typeof idx === 'number' ? idx : undefined;
            } catch { return undefined; }
          })();

          for (let i = 0; i < afterimageCount; i++) {
            this.time.delayedCall(i * afterimageDelay, () => {
              // Position slightly behind the character along dash direction
              const offset = 8 * i * -dirX;
              const afterimage = this.add.sprite(
                this.character.x + offset,
                this.character.y,
                'character'
              );

              // Match frame and flip for cohesion
              try { if (typeof currentFrameIndex === 'number') afterimage.setFrame(currentFrameIndex); } catch {}
              afterimage.setFlipX(this.character.flipX);

              // Visuals
              afterimage.setScale(3.5); // match character scale for consistency
              afterimage.setOrigin(0.5, 1);
              // Ensure trail renders above background but just behind the player
              const baseDepth = (typeof this.character.depth === 'number') ? this.character.depth : 6;
              afterimage.setDepth(Math.max(1, baseDepth - 1));
              const startAlpha = Math.max(0.15, 0.5 - i * 0.05);
              afterimage.setAlpha(startAlpha);
              afterimage.setTint(0x66e0ff); // soft cyan

              // Fade and shrink slightly
              this.tweens.add({
                targets: afterimage,
                alpha: 0,
                scaleX: 3.3,
                scaleY: 3.3,
                duration: 280 + i * 20,
                ease: 'Quadratic.Out',
                onComplete: () => { afterimage.destroy(); }
              });
            });
          }
        }

        private createDashHud() {
          const size = this.dashHudSize; // 96
          const hudX = this.scale.width - (size / 2 + 20);
          const hudY = 88 + size / 2; // even more top margin

          this.dashHudContainer = this.add.container(hudX, hudY).setScrollFactor(0);
          this.dashHudContainer.setDepth(10000);

          this.dashImage = this.add.image(0, 0, 'dash_ui');
          this.dashImage.setDisplaySize(size, size);
          this.dashImage.setDepth(10001);
          this.dashHudContainer.add(this.dashImage);

          // Dash icon is always visible; flashes only during cooldown
          if (this.dashImage) { this.dashImage.setVisible(true); this.dashImage.setAlpha(1); }
        }

        private createPowerupHud() {
          const baseX = this.scale.width - (this.dashHudSize / 2 + 20);
          const baseY = 88 + this.dashHudSize + 56; // even larger margin below dash icon
          this.powerupHudContainer = this.add.container(baseX, baseY).setScrollFactor(0);
          this.powerupHudContainer.setDepth(10000);
          this.powerupHudItems = [];
        }

        private refreshPowerupHud() {
          if (!this.powerupHudContainer) return;
          // Clear existing
          this.powerupHudItems.forEach((it) => { try { it.bg?.destroy(); it.icon?.destroy(); } catch {} });
          this.powerupHudItems = [];

          // Determine active bonuses (order: double, golden, vodka)
          const now = this.time?.now || 0;
          const active: { key: 'gift1' | 'gift3' | 'vodka'; remaining: number }[] = [];
          if (this.scoreMultiplier > 1 && this.multiplierEndTime > now) active.push({ key: 'gift1', remaining: this.multiplierEndTime - now });
          if (this.goldenSnowballActive && this.goldenEndTime > now) active.push({ key: 'gift3', remaining: this.goldenEndTime - now });
          if (this.boostEndTime > now) active.push({ key: 'vodka', remaining: this.boostEndTime - now });

          if (active.length === 0) return;

          // Normalized sizing and vertical layout
          const bgSize = 96; // consistent background size
          const gap = 22; // even more spacing between stacked bonus icons
          let y = 0;
          active.forEach((a) => {
            const icon = this.add.image(0, y, a.key);
            // Slightly reduce gift icons so they don't overflow the background edges
            const iconSize = a.key === 'vodka' ? 72 : 64;
            icon.setDisplaySize(iconSize, iconSize);
            icon.setDepth(10001);
            const bg = this.add.image(0, y, 'bonus_bg');
            bg.setDisplaySize(bgSize, bgSize);
            bg.setDepth(10000);
            this.powerupHudContainer.add(bg);
            this.powerupHudContainer.add(icon);
            // Flashing based on remaining
            const rem = a.remaining;
            const hz = rem < 500 ? 10 : rem < 1000 ? 6 : rem < 2000 ? 3 : 0;
            if (hz > 0) {
              const t = this.time.now / 1000;
              const alpha = 0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t);
              icon.setAlpha(alpha);
              bg.setAlpha(alpha);
            } else {
              icon.setAlpha(1);
              bg.setAlpha(1);
            }
            this.powerupHudItems.push({ bg, icon });
            y += bgSize + gap;
          });
        }

        private updateDashHud() {
          if (!this.dashHudContainer) return;
          const remaining = Math.max(0, this.dashCooldown);
          if (this.dashImage) {
            if (remaining <= 0) {
              // Ready: visible, no flashing
              this.dashImage.setVisible(true);
              this.dashImage.setAlpha(1);
            } else {
              // Cooldown: flash
              const t = this.time.now / 1000;
              const alpha = 0.5 + 0.5 * Math.sin(2 * Math.PI * 6 * t); // 6Hz flash
              this.dashImage.setAlpha(alpha);
            }
          }
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

          // Update held direction from gamepad each frame (no latching)
          try {
            this.gpLeft = GamepadManager.getInstance().isHeld('Left' as any);
            this.gpRight = GamepadManager.getInstance().isHeld('Right' as any);
          } catch {}

          // Handle power-up expirations and icon flashing
          if (this.scoreMultiplier > 1) {
            const remaining = this.multiplierEndTime - this.time.now;
            if (remaining <= 0) {
              this.scoreMultiplier = 1;
              this.multiplierEndTime = 0;
            }
          }
          if (this.goldenSnowballActive) {
            const remaining = this.goldenEndTime - this.time.now;
            if (remaining <= 0) {
              this.goldenSnowballActive = false;
              this.goldenEndTime = 0;
            }
          }

          // Refresh stacked Power-up HUD under dash icon
          this.refreshPowerupHud();

           // Handle dash mechanic (disabled while stunned or throwing)
           if (!this.isStunned && !this.isThrowing && this.spaceKey?.isDown && !this.isDashing && this.dashCooldown <= 0) {
            if (this.cursors?.left.isDown || this.keyQ?.isDown) {
              this.performDash(-1); // Dash left
            } else if (this.cursors?.right.isDown || this.keyD?.isDown) {
              this.performDash(1); // Dash right
            }
          }

           // Handle normal horizontal movement (only if not dashing, stunned, or throwing)
           if (!this.isDashing && !this.isStunned && !this.isThrowing) {
            // Use base speed scaled by current multiplier
            const moveSpeed = this.baseMoveSpeed * this.speedMultiplier;

            if (this.cursors?.left.isDown || this.keyQ?.isDown || this.gpLeft) {
              this.character.setVelocityX(-moveSpeed);
              this.character.setFlipX(true);
              if (this.character.anims?.currentAnim?.key !== 'run') {
                this.character.play('run');
              }
            } else if (this.cursors?.right.isDown || this.keyD?.isDown || this.gpRight) {
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
            // Play speed ended sound
            SoundManager.getInstance().playSpeedEnded();
            
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
          // Enemy collisions (score damage)
          this.checkEnemyCollisions();
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
          const mob = this.physics.add.sprite(x, y, 'monster4');
          mob.setOrigin(0.5, 1);
          mob.setScale(1.0);
          mob.play('monster4_anim');
          mob.setDepth(6);
          mob.setAlpha(1);
          (mob as any).__hitsTaken = 0;
          this.monstersB.push(mob);
        }

        private updateMonsterB() {
          if (!this.monstersB || this.monstersB.length === 0) return;
          this.monstersB = this.monstersB.filter((mob) => {
            if (!mob || !mob.active) return false;
            mob.y = this.getBottomY();
            const targetX = this.character.x + (this.character.flipX ? 1 : -1) * this.slimeTargetOffset;
            const distance = Math.abs(targetX - mob.x);
            if (distance <= 6) {
              mob.setVelocityX(0);
            } else {
              const dir = targetX > mob.x ? 1 : -1;
              mob.setVelocityX(dir * this.slimeSpeed);
              mob.setFlipX(dir > 0);
            }
            if (mob.x < -120 || mob.x > this.scale.width + 120) {
              mob.destroy();
              return false;
            }
            return true;
          });
        }

        private tryThrowSnowball() {
          const hasA = this.slime && this.slime.active;
          const hasB = (this.monstersB && this.monstersB.some(m => m && m.active));
          if (this.isStunned) return;
          if (this.isThrowing) return;
          if (this.time.now < this.nextThrowTime) return;
          this.nextThrowTime = this.time.now + this.throwCooldownMs;

          // Play throw animation once, then restore run/idle
          this.isThrowing = true;
          this.isDashing = false;
          this.character.setVelocityX(0);
          const wasRunning = this.character.anims?.currentAnim?.key === 'run';
          // Use current sprite facing for throw direction (no pointer aim)
          const faceRight = !this.character.flipX;
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

          // Prepare to spawn snowball timed to animation (around frame 3 of 0..5)
          let hasSpawned = false;
          const spawnSnowball = () => {
            if (hasSpawned) return;
            hasSpawned = true;
            // Spawn a snowball sprite and launch in facing direction
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
            // Straight horizontal velocity based on facing direction
            const speed = isGolden ? 560 : 480;
            const dirX = faceRight ? 1 : -1;
            body.setVelocity(speed * dirX, 0);

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
          };

          // Spawn when animation passes the release frame
          this.throwSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_anim: any, frame: any) => {
            try {
              if (!hasSpawned && typeof frame?.index === 'number' && frame.index >= 3) {
                spawnSnowball();
              }
            } catch {}
          });
          this.throwSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.throwSprite?.destroy();
            this.throwSprite = null;
            this.isThrowing = false;
            // Ensure snowball exists even if update event was missed
            if (!hasSpawned) spawnSnowball();
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
              this.isThrowing = false;
            }
          });
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
            // Collision with monster B (any)
            if (this.monstersB && this.monstersB.length > 0) {
              const hitDistB = 28;
              for (let i = 0; i < this.monstersB.length; i++) {
                const mob = this.monstersB[i];
                if (!mob || !mob.active) continue;
                const dB = Phaser.Math.Distance.Between(ball.x, ball.y, mob.x, mob.y - mob.displayHeight * 0.5);
                if (dB < hitDistB) {
                  try { (ball as any).__animTimer?.remove?.(); } catch {}
                  ball.destroy();
                  this.snowballs.splice(index, 1);
                  this.onSnowballHitMonsterB(mob, i);
                  break;
                }
              }
            }
          });
        }

        private onSnowballHitMonsterA() {
          // Play snowball hit sound
          SoundManager.getInstance().playSnowballHit();
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
                // Spawns handled by periodic spawner
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
                // Spawns handled by periodic spawner
              }
            });
          }
        }

        private trySpawnMonsterBSequence() {
          // Deprecated: replaced by periodic spawner
          // Keep no-op to avoid runtime errors if called elsewhere
          return;
        }

        private onSnowballHitMonsterB(mob: any, index: number) {
          // Play snowball hit sound
          SoundManager.getInstance().playSnowballHit();
          if (!mob || !mob.active) return;
          if (this.goldenSnowballActive) {
            this.tweens.add({
              targets: mob,
              scaleX: 0,
              scaleY: 0,
              duration: 120,
              ease: 'Back.easeIn',
              onComplete: () => {
                mob?.destroy();
                this.monstersB.splice(index, 1);
              }
            });
            return;
          }
          (mob as any).__hitsTaken = ((mob as any).__hitsTaken || 0) + 1;
          try {
            mob.setTint(0xaaffff);
            this.time.delayedCall(100, () => mob?.clearTint?.());
          } catch {}

          if ((mob as any).__hitsTaken >= 3) {
            this.tweens.add({
              targets: mob,
              scaleX: 0,
              scaleY: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                mob?.destroy();
                this.monstersB.splice(index, 1);
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
          // Play snowflake collection sound
          SoundManager.getInstance().playSnowflakeCollect();
          
          // Currency (shop/upgrade) uses upgrade value; score is fixed per flake (10) and doubled by gift
          const currencyPerFlake = this.abilityManager.getCurrentValue('snowflake_value');
          this.snowflakesEarned += currencyPerFlake;

          // In-game score: fixed 10 per flake, affected by scoreMultiplier (double points gift)
          const scorePerFlake = 10 * this.scoreMultiplier;
          this.score += scorePerFlake;
          this.scoreText.setText(`Score: ${this.score}`);

          // Show +score effect (not currency)
          this.createCatchEffect(snowflake.x, snowflake.y, scorePerFlake);
          
          // Destroy the snowflake
          snowflake.destroy();
        }

        private catchGift(gift: Phaser.GameObjects.Sprite, index: number) {
          // Play bonus gift sound
          SoundManager.getInstance().playBonusGift();
          
          const type = (gift as any).giftType as string | undefined;
          if (type === 'gift1') {
            // Double points for 10 seconds
            this.scoreMultiplier = 2;
            this.multiplierEndTime = this.time.now + 10000;
            // HUD refresh handled by refreshPowerupHud
            // No points awarded, no +text display
          } else if (type === 'gift2') {
            // Instant bonus points (doubles if double-points is active)
            const baseBonus = 150;
            const bonusAward = baseBonus * (this.scoreMultiplier > 1 ? this.scoreMultiplier : 1);
            this.score += bonusAward;
            this.scoreText.setText(`Score: ${this.score}`);
            this.createBonusCatchEffect(gift.x, gift.y, `+${bonusAward}`);
          } else if (type === 'gift3') {
            // Golden snowballs for 10 seconds
            this.goldenSnowballActive = true;
            this.goldenEndTime = this.time.now + 10000;
            // HUD refresh handled by refreshPowerupHud
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
          // Play freezing sound
          SoundManager.getInstance().playFreezing();
          
          // Apply 4-second stun: stop movement and ignore input/dash
          const stunDurationMs = 2000;
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
            // Stop freezing sound when effect ends
            SoundManager.getInstance().stopFreezing();
            
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
          // Play turbo speed sound
          SoundManager.getInstance().playTurboSpeed();
          
          // Speed boost for a short duration with ghost trail
          const boostDurationMs = 2500;
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

          // HUD refresh handled by refreshPowerupHud
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

        private createDamageEffect(x: number, y: number, text: string) {
          // Red damage text for enemy hits
          const effect = this.add.text(x, y, text, {
            fontSize: '28px',
            fontFamily: 'November, sans-serif',
            color: '#ff3b3b',
            stroke: '#000000',
            strokeThickness: 3
          });
          this.tweens.add({
            targets: effect,
            y: y - 60,
            alpha: 0,
            duration: 900,
            ease: 'Power2',
            onComplete: () => effect.destroy()
          });
        }

        private checkEnemyCollisions() {
          const now = this.time.now;
          if (now - this.lastEnemyHitTime < this.enemyHitCooldownMs) return;
          const charBounds = this.getShrinkBounds(this.character, 0.85);
          // Slime
          if (this.slime && this.slime.active) {
            const slimeBounds = this.getShrinkBounds(this.slime, 0.85);
            if (this.rectsOverlap(charBounds, slimeBounds)) {
              const dir = this.character.x < this.slime.x ? -1 : 1; // push away from slime
              this.applyEnemyHit(dir);
              return;
            }
          }
          // Monster B (any)
          if (this.monstersB && this.monstersB.length > 0) {
            for (let i = 0; i < this.monstersB.length; i++) {
              const mob = this.monstersB[i];
              if (!mob || !mob.active) continue;
              const mBounds = this.getShrinkBounds(mob, 0.85);
              if (this.rectsOverlap(charBounds, mBounds)) {
                const dir = this.character.x < mob.x ? -1 : 1; // push away from mob
                this.applyEnemyHit(dir);
                return;
              }
            }
          }
        }

        private applyEnemyHit(direction: number) {
          // Play point deduction sound
          SoundManager.getInstance().playPointDeduction();
          
          this.lastEnemyHitTime = this.time.now;
          // Reduce score by 50, not affecting snowflakesEarned (currency)
          this.score = Math.max(0, this.score - 50);
          this.scoreText.setText(`Score: ${this.score}`);
          // Show damage effect above character
          this.createDamageEffect(this.character.x, this.character.y - this.character.displayHeight, '-50');
          
          // Brief red tint feedback
          try { (this.character as any).setTint?.(0xff5555); } catch {}
          this.time.delayedCall(120, () => {
            try { (this.character as any).clearTint?.(); } catch {}
          });

          // Apply short hit-stun and horizontal knockback
          const knockbackDurationMs = 250;
          const knockbackSpeed = 480; // horizontal velocity
          this.isStunned = true;
          this.isDashing = false;
          // ensure animation not running uncontrollably
          if (this.character?.anims) {
            this.character.play('idle');
          }
          // set knockback velocity away from enemy and clamp inside bounds
          const dir = Math.sign(direction) || 1;
          this.character.setVelocityX(knockbackSpeed * dir);

          // Small vertical hop during hit
          const hopHeight = 18;
          this.hopOffset = hopHeight;
          this.tweens.add({
            targets: this,
            hopOffset: 0,
            duration: 220,
            ease: 'Quad.easeOut'
          });

          // Stop knockback after duration
          this.time.delayedCall(knockbackDurationMs, () => {
            this.character.setVelocityX(0);
            this.isStunned = false;
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            fontWeight: 700,
            color: '#e7e9ff',
            fontFamily: 'November, sans-serif',
            fontSize: 'clamp(18px, 2.4vw, 24px)',
            textShadow: '0 2px 0 rgba(0,0,0,0.25)'
          }}>
            {renderAlternating(`Chargement${'.'.repeat(loadingDots)}`, true)}
          </div>
        </div>
      )}
    </div>
  );
}

