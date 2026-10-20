import { describe, expect, it } from 'vitest';
import { Player } from '../src/engine/player';

// Durations deliberately differ so that wrong step selection and time carry
// cannot pass by producing the same number at an adjacent step.
const durations = [1000, 2000, 500];

describe('Player: lesson time and explicit user actions', () => {
  it('starts stopped and establishes the first clock sample without advancing', () => {
    const player = new Player(durations);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 0, status: 'ready', speed: 1,
      motion: false, stepStop: false,
    });
    player.tick(8000);
    expect(player.getState().stepTimeMs).toBe(0);
    player.playPause();
    player.tick(9000);
    expect(player.getState()).toMatchObject({ status: 'playing', stepTimeMs: 0 });
    player.tick(9250);
    expect(player.getState().stepTimeMs).toBe(250);
  });

  it('carries elapsed lesson time across steps during ordinary continuous playback', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(1500);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 500, status: 'playing',
    });
    player.tick(4000);
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 500, status: 'lesson-ended',
    });
  });

  it('stops at a teacher step boundary and discards elapsed time beyond that boundary', () => {
    const player = new Player(durations, { stepStop: true });
    player.playPause();
    player.tick(0);
    player.tick(1500);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 1000, status: 'step-ended',
    });
    player.tick(9000);
    expect(player.getState()).toMatchObject({ stepIndex: 0, stepTimeMs: 1000 });
    player.playPause();
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 0, status: 'playing',
    });
    player.tick(10000);
    player.tick(10250);
    expect(player.getState()).toMatchObject({ stepIndex: 1, stepTimeMs: 250 });
  });

  it('uses teacher Space to pause and resume the same unfinished step', () => {
    const player = new Player(durations, { stepStop: true });
    player.playPause();
    player.tick(0);
    player.tick(200);
    player.playPause();
    expect(player.getState()).toMatchObject({ status: 'paused', stepTimeMs: 200 });
    player.tick(9000);
    player.playPause();
    player.tick(10000);
    player.tick(10200);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 400, status: 'playing',
    });
  });

  it('repeats only the current step with R even when ordinary playback is continuous', () => {
    const player = new Player(durations);
    player.seekStep(1);
    player.playPause();
    player.tick(0);
    player.tick(500);
    player.restartStep();
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 0, status: 'playing', stepStop: false,
    });
    player.tick(1000);
    player.tick(11000);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 2000, status: 'step-ended', stepStop: false,
    });
    player.tick(12000);
    expect(player.getState()).toMatchObject({ stepIndex: 1, stepTimeMs: 2000 });
    // An explicit play after that stop may start the following step normally.
    player.playPause();
    player.tick(13000);
    player.tick(13500);
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 500, status: 'lesson-ended',
    });
  });

  it('does not rewind or loop at the lesson end without an explicit replay action', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(10000);
    player.playPause();
    player.tick(20000);
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 500, status: 'lesson-ended',
    });
    player.restartStep();
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 0, status: 'playing',
    });
    player.tick(21000);
    player.tick(21500);
    expect(player.getState().status).toBe('lesson-ended');
    player.home();
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 0, status: 'ready',
    });
  });

  it('changes speed only for time following the most recent clock sample', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(200);
    player.setSpeed(1.5);
    expect(player.getState().stepTimeMs).toBe(200);
    player.tick(600);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 800, speed: 1.5,
    });
    player.setSpeed(0.5);
    player.tick(800);
    expect(player.getState().stepTimeMs).toBe(900);
    player.tick(1000);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 0, status: 'playing',
    });
  });

  it('allows changing speed while paused without adding paused real time', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(300);
    player.playPause();
    player.setSpeed(0.5);
    player.tick(8000);
    expect(player.getState()).toMatchObject({
      status: 'paused', stepTimeMs: 300, speed: 0.5,
    });
    player.playPause();
    player.tick(9000);
    player.tick(9400);
    expect(player.getState()).toMatchObject({ status: 'playing', stepTimeMs: 500 });
  });

  it('seeks to the selected step start and resets the clock used on resuming', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(200);
    player.seekStep(2);
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 0, status: 'ready',
    });
    player.tick(8000);
    player.playPause();
    player.tick(9000);
    player.tick(9100);
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 100, status: 'playing',
    });
  });

  it('navigates previous, next, and Home without starting playback', () => {
    const player = new Player(durations);
    player.seekStep(1);
    player.next();
    expect(player.getState()).toMatchObject({ stepIndex: 2, stepTimeMs: 0, status: 'ready' });
    player.previous();
    expect(player.getState()).toMatchObject({ stepIndex: 1, stepTimeMs: 0, status: 'ready' });
    player.home();
    expect(player.getState()).toMatchObject({ stepIndex: 0, stepTimeMs: 0, status: 'ready' });
    player.previous();
    expect(player.getState()).toMatchObject({ stepIndex: 0, stepTimeMs: 0, status: 'ready' });
  });

  it('clamps invalid seek ranges and rejects unsupported speeds', () => {
    const player = new Player(durations);
    player.seekStep(-100);
    expect(player.getState().stepIndex).toBe(0);
    player.seekStep(100);
    expect(player.getState().stepIndex).toBe(2);
    expect(() => player.setSpeed(2 as 1)).toThrow();
  });

  it('turns step stopping on without rewinding an unfinished step', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(700);
    player.setStepStop(true);
    expect(player.getState()).toMatchObject({ stepTimeMs: 700, status: 'playing' });
    player.tick(1500);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 1000, status: 'step-ended', stepStop: true,
    });
  });
});

describe('Player: static frames and visibility', () => {
  it('shows completed static frames and never animates them on clock ticks', () => {
    const player = new Player(durations, { motion: true });
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 1000, status: 'step-ended', motion: true,
    });
    player.tick(0);
    player.tick(10000);
    expect(player.getState()).toMatchObject({ stepIndex: 0, stepTimeMs: 1000 });
    player.playPause();
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 2000, status: 'step-ended',
    });
    player.next();
    expect(player.getState()).toMatchObject({
      stepIndex: 2, stepTimeMs: 500, status: 'lesson-ended',
    });
    player.playPause();
    expect(player.getState()).toMatchObject({ stepIndex: 2, status: 'lesson-ended' });
  });

  it('keeps static R on the current completed frame and static Home on the first completed frame', () => {
    const player = new Player(durations, { motion: true });
    player.seekStep(1);
    player.restartStep();
    player.tick(0);
    player.tick(10000);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 2000, status: 'step-ended',
    });
    player.previous();
    expect(player.getState()).toMatchObject({ stepIndex: 0, stepTimeMs: 1000 });
    player.seekStep(2);
    player.home();
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 1000, status: 'step-ended',
    });
  });

  it('switches to the current completed frame and back to the same step start, both stopped', () => {
    const player = new Player(durations);
    player.seekStep(1);
    player.playPause();
    player.tick(0);
    player.tick(600);
    player.setMotion(true);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 2000, status: 'step-ended', motion: true,
    });
    player.tick(10000);
    player.setMotion(false);
    expect(player.getState()).toMatchObject({
      stepIndex: 1, stepTimeMs: 0, status: 'ready', motion: false,
    });
    player.tick(11000);
    expect(player.getState().stepTimeMs).toBe(0);
  });

  it('pauses on hiding and does not resume or count hidden time on showing', () => {
    const player = new Player(durations);
    player.playPause();
    player.tick(0);
    player.tick(300);
    player.onVisibilityChange(true);
    expect(player.getState()).toMatchObject({ status: 'paused', stepTimeMs: 300 });
    player.tick(50000);
    player.onVisibilityChange(false);
    player.tick(60000);
    expect(player.getState()).toMatchObject({ status: 'paused', stepTimeMs: 300 });
    player.playPause();
    player.tick(61000);
    player.tick(61200);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 500, status: 'playing',
    });
  });

  it('does not change a completed teacher frame when the tab is hidden', () => {
    const player = new Player(durations, { stepStop: true });
    player.playPause();
    player.tick(0);
    player.tick(1000);
    player.onVisibilityChange(true);
    player.onVisibilityChange(false);
    expect(player.getState()).toMatchObject({
      stepIndex: 0, stepTimeMs: 1000, status: 'step-ended',
    });
  });
});

describe('Player: public model boundaries', () => {
  it('rejects an empty lesson and non-positive or non-finite durations', () => {
    for (const invalid of [[], [0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]]) {
      expect(() => new Player(invalid)).toThrow();
    }
  });

  it('notifies subscribers about operations and lets them unsubscribe', () => {
    const player = new Player(durations);
    const recorded: number[] = [];
    const unsubscribe = player.subscribe(state => recorded.push(state.stepIndex));
    player.seekStep(1);
    expect(recorded.at(-1)).toBe(1);
    unsubscribe();
    const count = recorded.length;
    player.seekStep(2);
    expect(recorded.length).toBe(count);
    player.dispose();
  });
});
