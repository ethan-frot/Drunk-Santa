'use client';

import { useEffect, useRef, useState } from 'react';
import { SnowflakeManager } from '../utils/snowflake';
import { GiftManager } from '../utils/gift';

export default function GameCanvas({ onGameEnd }: { onGameEnd?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('phaser').then((Phaser) => {
      class PreloadScene extends Phaser.Scene {
        constructor() { super('Preload'); }
        preload() {
          // Load character sprite
          this.load.image('character', '/assets/player.png');
          this.load.image('background', '/assets/background-image.png');
          // Load snowflake sprite
          this.load.image('snowflake', '/assets/snowflake.png');
          // Load gift sprite
          this.load.image('cadeau', '/assets/gifts.png');

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
        private score: number = 0;
        private scoreText: any;
        private bgMusic: any;
        private timerText: any;
        private timeLeft: number = 10;
        private gameActive: boolean = true;

        constructor() { 
          super('Game'); 
          this.snowflakeManager = new SnowflakeManager(this);
          this.giftManager = new GiftManager(this);
        }
        
        create() {
          // Reset game state
          this.timeLeft = 10;
          this.gameActive = true;

          // Add background image
          const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
          this.scale.on('resize', (gameSize: any) => {
            bg.setDisplaySize(gameSize.width, gameSize.height);
          });
          bg.setDisplaySize(this.scale.width, this.scale.height);

          // Create character sprite and place it at bottom center
          this.character = this.physics.add.sprite(0, 0, 'character');
          this.character.setScale(0.7);
          this.character.setOrigin(0.5, 1);
          this.character.setCollideWorldBounds(true);

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

          // Set up keyboard controls
          this.cursors = this.input.keyboard?.createCursorKeys();

          // Create score text
          this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
          }).setScrollFactor(0);

          // Start snowflake manager
          this.snowflakeManager.start();
          
          // Start gift manager
          this.giftManager.start();
          // Create timer text
          this.timerText = this.add.text(this.scale.width / 2, 50, '10', {
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

        update() {
          if (!this.gameActive) return;

          // Keep the character on the bottom each frame, but allow X to move
          this.keepCharacterAtBottom();

          // Handle horizontal movement
          if (this.cursors?.left.isDown) {
            this.character.setVelocityX(-200);
          } else if (this.cursors?.right.isDown) {
            this.character.setVelocityX(200);
          } else {
            this.character.setVelocityX(0);
          }

          // Check collisions between character and snowflakes
          this.checkSnowflakeCollisions();

          // Check collisions between character and gifts
          this.checkGiftCollisions();

          // Clean up snowflakes that are off screen
          this.snowflakeManager.cleanupSnowflakes();

          // Clean up gifts that are off screen
          this.giftManager.cleanupGifts();
        }

        private checkGiftCollisions() {
          this.giftManager.getGifts().forEach((gift, index) => {
            if (gift && gift.active) {
              // Calculate catch hitbox at the top of the character sprite
              const catchY = this.character.y - (this.character.displayHeight - 40);
              
              // Check if gift is close enough to the character's catch zone to be "caught"
              const distance = Phaser.Math.Distance.Between(
                this.character.x-50, catchY,
                gift.x, gift.y
              );
              
              // If gift is close enough, catch it
              if (distance < 30) {
                this.catchGift(gift, index);
              }
            }
          });
        }

        private checkSnowflakeCollisions() {
          this.snowflakeManager.getSnowflakes().forEach((snowflake, index) => {
            if (snowflake && snowflake.active) {
              // Calculate catch hitbox at the top of the character sprite
              const catchY = this.character.y - (this.character.displayHeight - 40);
              
              // Check if snowflake is close enough to the character's catch zone to be "caught"
              const distance = Phaser.Math.Distance.Between(
                this.character.x-50, catchY,
                snowflake.x, snowflake.y
              );
              
              // If snowflake is close enough, catch it
              if (distance < 30) {
                this.catchSnowflake(snowflake, index);
              }
            }
          });
        }

        private catchSnowflake(snowflake: Phaser.GameObjects.Sprite, index: number) {
          // Add score
          this.score += 10;
          this.scoreText.setText(`Score: ${this.score}`);
          
          // Create catch effect
          this.createCatchEffect(snowflake.x, snowflake.y);
          
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

        private createCatchEffect(x: number, y: number) {
          // Create a temporary particle effect
          const effect = this.add.text(x, y, '+10', {
            fontSize: '24px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
          });
          
          // Animate the effect
          this.tweens.add({
            targets: effect,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
              effect.destroy();
            }
          });
        }

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
          }

          // music stop
          if (this.bgMusic) {
            this.bgMusic.stop();
          }
          
          // call callback (if passed through game.registry)
          const onGameEnd = this.game.registry.get('onGameEnd');
          if (onGameEnd) {
            onGameEnd();
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
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameEnd]);

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

