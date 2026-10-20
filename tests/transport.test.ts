import { describe, expect, it } from 'vitest';
import { Player } from '../src/engine/player';
import { applyPlayerCommand, comparisonPlayCommand, needsRestore, type PlayerSnapshot } from '../src/app/transport';

const snapshot=(player:Player,ready=true):PlayerSnapshot=>({state:player.getState(),ready});
describe('shared comparison transport',()=>{
  it('pauses both when the shorter step has ended and the other is still playing',()=>{
    const left=new Player([5000,5000],{stepStop:true}),right=new Player([6000,6000],{stepStop:true});for(const player of [left,right]){applyPlayerCommand(player,'resume',true);player.tick(0);player.tick(5500);}
    expect(left.getState().status).toBe('step-ended');expect(right.getState().status).toBe('playing');const intent=comparisonPlayCommand(snapshot(left),snapshot(right));expect(intent).toBe('pause');for(const player of [left,right])applyPlayerCommand(player,intent!,true);
    expect(left.getState()).toMatchObject({status:'step-ended',stepIndex:0,stepTimeMs:5000});expect(right.getState()).toMatchObject({status:'paused',stepIndex:0,stepTimeMs:5500});
    const resume=comparisonPlayCommand(snapshot(left),snapshot(right));expect(resume).toBe('resume');for(const player of [left,right])applyPlayerCommand(player,resume!,true);expect(left.getState()).toMatchObject({status:'playing',stepIndex:1,stepTimeMs:0});expect(right.getState()).toMatchObject({status:'playing',stepIndex:0,stepTimeMs:5500});
  });
  it('does not start either side if one is loading or has a fetch error',()=>{const left=new Player([5000]),right=new Player([5000]);for(const ready of [false]){const intent=comparisonPlayCommand(snapshot(left,true),snapshot(right,ready));expect(intent).toBeNull();expect(left.getState().status).toBe('ready');expect(right.getState().status).toBe('ready');}});
  it('never toggles a playing lesson off when given an explicit resume',()=>{const player=new Player([5000]);applyPlayerCommand(player,'resume',true);applyPlayerCommand(player,'resume',true);expect(player.getState().status).toBe('playing');applyPlayerCommand(player,'pause',true);applyPlayerCommand(player,'pause',true);expect(player.getState().status).toBe('paused');});
  it('allows the unfinished lesson to continue after the other has reached its final end',()=>{const left=new Player([1000]),right=new Player([3000]);for(const player of [left,right]){player.playPause();player.tick(0);player.tick(1500);}applyPlayerCommand(right,'pause',true);const intent=comparisonPlayCommand(snapshot(left),snapshot(right));expect(intent).toBe('resume');applyPlayerCommand(left,intent!,true);applyPlayerCommand(right,intent!,true);expect(left.getState().status).toBe('lesson-ended');expect(right.getState().status).toBe('playing');});
});
describe('loading and restoration ownership',()=>{
  it('ignores play, replay and seek commands until the current restore is ready',()=>{const player=new Player([5000,5000]);player.playPause();player.tick(0);player.tick(2100);player.playPause();const pending=player.getState();for(const command of ['play','resume','restart','next','home'] as const)expect(applyPlayerCommand(player,command,false)).toBe(false);expect(player.getState()).toEqual(pending);expect(applyPlayerCommand(player,'restart',true)).toBe(true);expect(player.getState()).toMatchObject({stepIndex:0,stepTimeMs:0,status:'playing'});});
  it('schedules both resumes on one animation frame while retaining the middle pause position',()=>{const player=new Player([1000,1000],{stepStop:true});expect(needsRestore('resume',player.getState())).toBe(true);player.playPause();player.tick(0);player.tick(500);player.playPause();expect(needsRestore('resume',player.getState())).toBe(true);applyPlayerCommand(player,'resume',true);expect(player.getState()).toMatchObject({stepIndex:0,stepTimeMs:500,status:'playing'});player.tick(500);player.tick(1500);expect(needsRestore('resume',player.getState())).toBe(true);expect(needsRestore('pause',player.getState())).toBe(false);});
});
