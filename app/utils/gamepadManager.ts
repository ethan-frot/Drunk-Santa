// Lightweight Gamepad manager built on the browser Gamepad API
// Supports standard mapping (A=0, B=1, X=2, Y=3, etc.) and debounced buttondown events

export type GamepadLogicalButton =
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'L'
  | 'R'
  | 'ZL'
  | 'ZR'
  | 'Start'
  | 'Select'
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right';

type Listener = (btn: GamepadLogicalButton) => void;
type ConnectionListener = (connected: boolean) => void;
type ScopeListener = (btn: GamepadLogicalButton) => boolean; // return true if consumed

const STANDARD_BUTTON_INDEX: Record<GamepadLogicalButton, number> = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  L: 4,
  R: 5,
  ZL: 6,
  ZR: 7,
  Select: 8,
  Start: 9,
  Up: 12,
  Down: 13,
  Left: 14,
  Right: 15,
};

// Some USB SNES pads swap A/B or X/Y; allow a simple remap here if needed later
let customRemap: Partial<Record<GamepadLogicalButton, number>> = {};

export function configureGamepadRemap(remap: Partial<Record<GamepadLogicalButton, number>>) {
  customRemap = { ...customRemap, ...remap };
}

function resolveIndex(btn: GamepadLogicalButton): number | undefined {
  return customRemap[btn] ?? STANDARD_BUTTON_INDEX[btn];
}

class GamepadManager {
  private static instance: GamepadManager | null = null;
  private listeners: Set<Listener> = new Set();
  private rafId: number | null = null;
  private prevPressed: Map<number, Set<number>> = new Map(); // gamepad.index -> pressed button indices
  private started = false;
  private connected = false;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private scopedHandlers: Set<ScopeListener> = new Set();
  private suppressUntil: Map<GamepadLogicalButton, number> = new Map();
  private heldButtons: Set<GamepadLogicalButton> = new Set();

  static getInstance(): GamepadManager {
    if (!GamepadManager.instance) {
      GamepadManager.instance = new GamepadManager();
    }
    return GamepadManager.instance;
  }

  addListener(listener: Listener): () => void {
    this.listeners.add(listener);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    // emit current state immediately
    try { listener(this.connected); } catch {}
    this.start();
    return () => {
      this.connectionListeners.delete(listener);
      if (this.listeners.size === 0 && this.connectionListeners.size === 0) this.stop();
    };
  }

  isConnected(): boolean { return this.connected; }

  isHeld(btn: GamepadLogicalButton): boolean {
    return this.heldButtons.has(btn);
  }

  onButton(target: GamepadLogicalButton, handler: () => void): () => void {
    const listener: Listener = (btn) => {
      if (btn === target) handler();
    };
    return this.addListener(listener);
  }

  // Push a modal/game scope to exclusively handle inputs; returns an unsubscribe to pop it
  pushScope(handler: ScopeListener): () => void {
    this.scopedHandlers.add(handler);
    this.start();
    return () => {
      this.scopedHandlers.delete(handler);
      if (this.listeners.size === 0 && this.connectionListeners.size === 0 && this.scopedHandlers.size === 0) this.stop();
    };
  }

  suppress(btn: GamepadLogicalButton, durationMs: number) {
    const until = Date.now() + Math.max(0, durationMs);
    this.suppressUntil.set(btn, until);
  }

  private start() {
    if (this.started) return;
    this.started = true;
    const loop = () => {
      try {
        this.scan();
      } catch {}
      this.rafId = typeof window !== 'undefined' ? window.requestAnimationFrame(loop) : null;
    };
    this.rafId = typeof window !== 'undefined' ? window.requestAnimationFrame(loop) : null;
  }

  private stop() {
    if (!this.started) return;
    this.started = false;
    if (this.rafId) {
      try { window.cancelAnimationFrame(this.rafId); } catch {}
      this.rafId = null;
    }
    this.prevPressed.clear();
  }

  private scan() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    if (!pads) return;
    let anyConnected = false;
    this.heldButtons.clear();
    for (const pad of pads) {
      if (!pad) continue;
      anyConnected = true;
      // Apply device-specific default remap once (do not override existing customRemap keys)
      try {
        const id = String((pad as any).id || '');
        // Common USB SNES pad: usb gamepad (Vendor: 0810 Product: e501)
        const looksLikeSNES0810 = /0810/i.test(id) && /e501/i.test(id);
        if (looksLikeSNES0810) {
          // Adjust mapping to match requested behavior on this device:
          // Physical A -> logical A, Physical B -> logical B
          // Based on observed indices: A=1, B=2, X=0, Y=3
          const proposed: Partial<Record<GamepadLogicalButton, number>> = {
            A: 1,
            B: 2,
            X: 0,
            Y: 3,
          };
          let applied = false;
          (Object.keys(proposed) as GamepadLogicalButton[]).forEach((k) => {
            if (customRemap[k] === undefined) {
              customRemap[k] = proposed[k];
              applied = true;
            }
          });
          if (applied) {
            try { console.info('[GamepadManager] Applied SNES (0810:e501) remap: A=1, B=2, X=0, Y=3'); } catch {}
          }
        }
      } catch {}
      const gpIndex = pad.index;
      const last = this.prevPressed.get(gpIndex) || new Set<number>();
      const now = new Set<number>();

      // buttons
      pad.buttons.forEach((b, idx) => {
        const pressed = typeof b === 'object' ? b.pressed : (b as any) > 0.5;
        if (pressed) now.add(idx);
      });

      // dpad from axes fallback if needed
      if (pad.axes && pad.axes.length >= 2) {
        const [axX, axY] = [pad.axes[0], pad.axes[1]];
        // Consider small deadzone to avoid drift
        const DEAD = 0.4;
        if (axX <= -DEAD) now.add(resolveIndex('Left') ?? 14);
        if (axX >= DEAD) now.add(resolveIndex('Right') ?? 15);
        if (axY <= -DEAD) now.add(resolveIndex('Up') ?? 12);
        if (axY >= DEAD) now.add(resolveIndex('Down') ?? 13);
      }

      // Detect rising edges and compute held set
      for (const btnName of Object.keys(STANDARD_BUTTON_INDEX) as GamepadLogicalButton[]) {
        const idx = resolveIndex(btnName);
        if (idx === undefined) continue;
        const wasPressed = last.has(idx);
        const isPressed = now.has(idx);
        if (isPressed) this.heldButtons.add(btnName);
        if (!wasPressed && isPressed) {
          this.emit(btnName);
        }
      }

      this.prevPressed.set(gpIndex, now);
    }
    if (anyConnected !== this.connected) {
      this.connected = anyConnected;
      for (const l of Array.from(this.connectionListeners)) {
        try { l(this.connected); } catch {}
      }
    }
  }

  private emit(btn: GamepadLogicalButton) {
    // Drop if suppressed globally for a short window
    const until = this.suppressUntil.get(btn) || 0;
    if (until > Date.now()) return;
    // If a scope is present, give it first chance to consume the input
    for (const h of Array.from(this.scopedHandlers)) {
      try {
        const consumed = h(btn);
        if (consumed) return;
      } catch {}
    }
    if (this.listeners.size === 0) return;
    for (const l of Array.from(this.listeners)) {
      try { l(btn); } catch {}
    }
  }
}

export default GamepadManager;


