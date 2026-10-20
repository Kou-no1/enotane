export type PlayerStatus = 'ready' | 'playing' | 'paused' | 'step-ended' | 'lesson-ended';
export type Speed = 0.5 | 1 | 1.5;
export interface PlayerState {
  stepIndex: number;
  stepTimeMs: number;
  status: PlayerStatus;
  speed: Speed;
  motion: boolean;
  stepStop: boolean;
}

/** The clock is injected through tick so timing is testable without a browser. */
export class Player {
  private durations: number[];
  private state: PlayerState;
  private lastTimestamp: number | null = null;
  private oneShot = false;
  private hidden = false;
  private listeners = new Set<(state: PlayerState) => void>();

  constructor(durations: number[], options: { stepStop?: boolean; motion?: boolean } = {}) {
    if (!durations.length || durations.some(t => !Number.isFinite(t) || t <= 0)) {
      throw new Error('ステップの長さは正の数で指定してください。');
    }
    this.durations = [...durations];
    this.state = { stepIndex: 0, stepTimeMs: 0, status: 'ready', speed: 1, motion: options.motion ?? false, stepStop: options.stepStop ?? false };
    if (this.state.motion) this.toStill();
  }

  getState(): PlayerState { return { ...this.state }; }
  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void { for (const listener of this.listeners) listener(this.getState()); }
  private endStatus(): PlayerStatus { return this.state.stepIndex === this.durations.length - 1 ? 'lesson-ended' : 'step-ended'; }
  private toStill(): void {
    this.state.stepTimeMs = this.durations[this.state.stepIndex];
    this.state.status = this.endStatus();
    this.lastTimestamp = null;
  }

  tick(realTimestampMs: number): void {
    if (!Number.isFinite(realTimestampMs) || this.state.status !== 'playing' || this.hidden) return;
    if (this.lastTimestamp === null) { this.lastTimestamp = realTimestampMs; return; }
    const elapsed = Math.max(0, realTimestampMs - this.lastTimestamp) * this.state.speed;
    this.lastTimestamp = realTimestampMs;
    let remaining = elapsed;
    while (remaining > 0 && this.state.status === 'playing') {
      const available = this.durations[this.state.stepIndex] - this.state.stepTimeMs;
      if (remaining < available) { this.state.stepTimeMs += remaining; remaining = 0; }
      else {
        this.state.stepTimeMs = this.durations[this.state.stepIndex];
        remaining -= available;
        if (this.oneShot || this.state.stepStop || this.state.stepIndex === this.durations.length - 1) {
          this.state.status = this.endStatus();
          this.oneShot = false;
          this.lastTimestamp = null;
        } else { this.state.stepIndex++; this.state.stepTimeMs = 0; }
      }
    }
    this.emit();
  }

  playPause(): void {
    if (this.state.motion) { this.next(); return; }
    if (this.state.status === 'playing') { this.state.status = 'paused'; this.lastTimestamp = null; }
    else if (!this.hidden && this.state.status !== 'lesson-ended') {
      if (this.state.status === 'step-ended') { this.state.stepIndex++; this.state.stepTimeMs = 0; this.oneShot = false; }
      this.state.status = 'playing'; this.lastTimestamp = null;
    }
    this.emit();
  }
  restartStep(): void {
    this.lastTimestamp = null;
    if (this.state.motion) this.toStill();
    else { this.state.stepTimeMs = 0; this.state.status = this.hidden ? 'paused' : 'playing'; this.oneShot = true; }
    this.emit();
  }
  seekStep(index: number): void {
    this.state.stepIndex = Math.max(0, Math.min(this.durations.length - 1, Math.trunc(Number.isFinite(index) ? index : 0)));
    this.state.stepTimeMs = 0; this.state.status = 'ready'; this.lastTimestamp = null; this.oneShot = false;
    if (this.state.motion) this.toStill();
    this.emit();
  }
  home(): void { this.seekStep(0); }
  previous(): void { if (this.state.stepIndex > 0) this.seekStep(this.state.stepIndex - 1); }
  next(): void { if (this.state.stepIndex < this.durations.length - 1) this.seekStep(this.state.stepIndex + 1); }
  setSpeed(speed: Speed): void {
    if (![0.5, 1, 1.5].includes(speed)) throw new Error('速さは0.5、1、1.5から選んでください。');
    this.state.speed = speed; this.emit();
  }
  setMotion(on: boolean): void {
    if (this.state.motion === on) return;
    this.state.motion = on;
    if (on) { this.oneShot = false; this.toStill(); this.emit(); }
    else this.seekStep(this.state.stepIndex);
  }
  setStepStop(on: boolean): void { this.state.stepStop = on; this.emit(); }
  onVisibilityChange(hidden: boolean): void {
    this.hidden = hidden; this.lastTimestamp = null;
    if (hidden && this.state.status === 'playing') { this.state.status = 'paused'; this.emit(); }
  }
  dispose(): void { this.listeners.clear(); this.lastTimestamp = null; this.state.status = 'paused'; }
}
