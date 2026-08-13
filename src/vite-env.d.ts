/// <reference types="vite/client" />

// @3d-dice/dice-box ships no type declarations. The narrow surface we use
// is modelled in engine/dice3d.ts (DiceBoxLike); this declaration just
// stops the untyped import from failing the build.
declare module '@3d-dice/dice-box' {
  export default class DiceBox {
    constructor(config: Record<string, unknown>);
    init(): Promise<unknown>;
    roll(notation: string): Promise<Array<{ sides: number; value: number }>>;
    clear(): void;
    hide?: () => void;
    show?: () => void;
  }
}
