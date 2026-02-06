import React from 'react';
import { MatchState } from '@/lib/engine/types';
import { Bomb, BombStatus } from '@/lib/engine/Bomb';

interface MatchHUDProps {
  roundTimer: number; // in seconds
  matchState: MatchState;
  bombState: Bomb;
}

export const MatchHUD: React.FC<MatchHUDProps> = ({ roundTimer, matchState, bombState }) => {
  // Determine time to display
  let displayTime = roundTimer;
  let isBombActive = false;

  if (bombState.status === BombStatus.PLANTED || bombState.status === BombStatus.DEFUSING) {
      // Show bomb timer
      displayTime = Math.ceil(bombState.timer / 10);
      isBombActive = true;
  }

  // Format MM:SS
  const formatTime = (seconds: number) => {
    // Prevent negative display
    const safeSeconds = Math.max(0, seconds);
    const m = Math.floor(safeSeconds / 60);
    const s = Math.floor(safeSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const tScore = matchState.scores.T;
  const ctScore = matchState.scores.CT;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[70] flex flex-col items-center pointer-events-none">
      {/* Time Panel */}
      <div className={`
        flex items-center justify-center px-6 py-2 rounded-b-lg shadow-2xl border-x border-b border-white/10 backdrop-blur-sm
        transition-colors duration-300
        ${isBombActive ? 'bg-red-900/90 shadow-red-900/50' : 'bg-gray-900/90 shadow-black/50'}
      `}>
         <div className={`
            text-4xl font-mono font-bold tracking-widest drop-shadow-md
            ${isBombActive ? 'text-white animate-pulse' : 'text-yellow-500'}
         `}>
            {formatTime(displayTime)}
         </div>
      </div>

      {/* Score / Phase Info */}
      <div className="flex gap-4 mt-1 bg-black/80 px-6 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white uppercase tracking-widest shadow-lg backdrop-blur-sm">
          <span className="text-yellow-500 drop-shadow-sm">T {tScore}</span>
          <span className="text-gray-500 mx-1">|</span>
          <span className="text-white drop-shadow-sm">ROUND {matchState.round}</span>
          <span className="text-gray-500 mx-1">|</span>
          <span className="text-blue-500 drop-shadow-sm">CT {ctScore}</span>
      </div>

      {isBombActive && (
          <div className="mt-2 text-red-500 font-bold text-sm bg-black/50 px-2 py-0.5 rounded animate-bounce">
              ⚠️ BOMB PLANTED
          </div>
      )}
    </div>
  );
};
