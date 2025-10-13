'use client';

import { useEffect, useRef, useState } from 'react';

export default function GameCanvas() {
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
        }
        create() { this.scene.start('Game'); }
      }

      class GameScene extends Phaser.Scene {
        private character: any;
        private cursors: any;

        constructor() { super('Game'); }
        
        create() {
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
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current!,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: [PreloadScene, GameScene]
      });
      setReady(true);
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

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

