'use client';

import { useEffect, useRef, useState } from 'react';

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
          this.load.image('background', '/assets/background.png');

          //music
          this.load.audio('music', '/assets/background-music.mp3');
        }
        create() { this.scene.start('Game'); }
      }

      class GameScene extends Phaser.Scene {
        private character: any;
        private cursors: any;
        private bgMusic: any;
        private timerText: any;
        private timeLeft: number = 10;
        private gameActive: boolean = true;

        constructor() { super('Game'); }
        
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

