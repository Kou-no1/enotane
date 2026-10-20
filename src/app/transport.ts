import type { Player, PlayerState } from '../engine/player';

export type PlayerCommand='play'|'pause'|'resume'|'home'|'previous'|'next'|'restart';
export interface PlayerSnapshot {ready:boolean;state:PlayerState}
export const EMPTY_PLAYER_SNAPSHOT:PlayerSnapshot={ready:false,state:{stepIndex:0,stepTimeMs:0,status:'ready',speed:1,motion:false,stepStop:false}};

/** A shared button chooses one intent, even when one lesson has reached a boundary. */
export function comparisonPlayCommand(left:PlayerSnapshot,right:PlayerSnapshot):'pause'|'resume'|null {
  if(!left.ready||!right.ready)return null;
  return left.state.status==='playing'||right.state.status==='playing'?'pause':'resume';
}
export function needsRestore(command:PlayerCommand,state:PlayerState):boolean {
  return ['home','previous','next','restart'].includes(command)||command==='resume'&&state.status!=='playing'||command==='play'&&state.status==='step-ended';
}
/** Commands during loading, restoration or a failed fetch have no effect. */
export function applyPlayerCommand(player:Player,command:PlayerCommand,ready:boolean):boolean {
  if(!ready)return false;
  const state=player.getState();
  if(command==='pause'){if(state.status==='playing')player.playPause();}
  else if(command==='resume'){if(state.status!=='playing'&&state.status!=='lesson-ended')player.playPause();}
  else if(command==='play')player.playPause();
  else if(command==='home')player.home();
  else if(command==='previous')player.previous();
  else if(command==='next')player.next();
  else player.restartStep();
  return true;
}
