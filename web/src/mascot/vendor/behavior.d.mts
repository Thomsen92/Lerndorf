import type { Reaction } from './sir-byte.mjs';
export interface Expression {
  label: string;
  line: string;
  duration: number;
  eyes: number[];
  tilt: number;
  lift: number;
}
export const EXPRESSIONS: Record<Reaction, Expression>;
export class ByteBehavior {
  state: Reaction;
  mistakes: number;
  revision: number;
  react(state: Reaction): Expression;
  feedback(correct: boolean): Expression;
  lookAt(x: number, y: number): void;
  update(dt: number): Expression;
}
