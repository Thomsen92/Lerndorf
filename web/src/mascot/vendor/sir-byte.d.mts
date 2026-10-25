import * as THREE from 'three';
export type Reaction =
  'idle' | 'point' | 'cheeky' | 'celebrate' | 'think' | 'support' | 'surprise' | 'dry' | 'smug';
export interface SirByteInstance {
  root: THREE.Group;
  head: THREE.Group;
  behavior: { state: Reaction; react(state: Reaction): void; lookAt(x: number, y: number): void };
  update(
    dt: number,
    opts?: {
      reducedMotion?: boolean;
      speaking?: boolean;
      speechTime?: number;
      speechDuration?: number;
      speechLevel?: number;
      viewerPosition?: THREE.Vector3 | null;
    },
  ): void;
  playCane(): void;
  pointAtTask(target: THREE.Vector3): void;
  triangles: number;
}
export function createSirByte(): SirByteInstance;
