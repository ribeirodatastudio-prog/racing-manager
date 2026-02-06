import React from "react";
import { GameMap } from "@/lib/engine/GameMap";
import { Bot } from "@/lib/engine/Bot";
import { ZoneState } from "@/lib/engine/types";

interface MapVisualizerProps {
  map: GameMap;
  bots: Bot[];
  zoneStates?: Record<string, ZoneState>;
  selectedBotId?: string | null;
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ map, bots, zoneStates, selectedBotId }) => {
  // Collect Dropped Weapons
  const droppedWeaponsNodes: React.ReactNode[] = [];
  if (zoneStates) {
      Object.values(zoneStates).forEach(state => {
          state.droppedWeapons.forEach(drop => {
              droppedWeaponsNodes.push(
                  <g key={drop.id} className="pointer-events-none">
                      <rect
                        x={drop.x - 3}
                        y={drop.y - 3}
                        width={6}
                        height={6}
                        transform={`rotate(45 ${drop.x} ${drop.y})`}
                        className="fill-purple-500 stroke-black stroke-[0.5]"
                      />
                  </g>
              );
          });
      });
  }

  // Draw Path for Selected Bot
  const pathLines: React.ReactNode[] = [];
  if (selectedBotId) {
    const selectedBot = bots.find(b => b.id === selectedBotId);
    if (selectedBot && selectedBot.path && selectedBot.path.length > 0) {
      const points = [selectedBot.pos, ...selectedBot.path];

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];
        pathLines.push(
            <line
              key={`path-${selectedBot.id}-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={selectedBot.side === "T" ? "#eab308" : "#3b82f6"}
              strokeWidth="2"
              strokeDasharray="5,5"
              className="opacity-80"
            />
        );
      }
    }
  }

  // Vision Cones (Simplified)
  const cones: React.ReactNode[] = [];
  bots.forEach((bot, index) => {
      if (bot.status === "DEAD") return;

      const offsetX = (index % 3) * 6 - 3;
      const offsetY = Math.floor(index / 3) * 6 - 3;

      const startX = bot.pos.x + offsetX;
      const startY = bot.pos.y + offsetY;

      let targetX = startX;
      let targetY = startY;

      // Determine facing direction
      if (bot.path.length > 0) {
          targetX = bot.path[0].x;
          targetY = bot.path[0].y;
      } else if (bot.focusZoneId) {
          // Look at focus zone centroid
          const z = map.getZone(bot.focusZoneId);
          if (z) {
              targetX = z.x;
              targetY = z.y;
          }
      }

      if (targetX !== startX || targetY !== startY) {
          const angle = Math.atan2(targetY - startY, targetX - startX);
          const length = 120;
          const width = Math.PI / 3; // 60 deg

          const leftAngle = angle - width / 2;
          const rightAngle = angle + width / 2;

          const x1 = startX + length * Math.cos(leftAngle);
          const y1 = startY + length * Math.sin(leftAngle);
          const x2 = startX + length * Math.cos(rightAngle);
          const y2 = startY + length * Math.sin(rightAngle);

          const isSelected = bot.id === selectedBotId;
          const color = bot.side === "T" ? "fill-yellow-500" : "fill-blue-500";
          const opacity = isSelected ? "opacity-30" : "opacity-10";

          const d = `M ${startX} ${startY} L ${x1} ${y1} A ${length} ${length} 0 0 1 ${x2} ${y2} Z`;

          cones.push(
              <path
                  key={`cone-${bot.id}`}
                  d={d}
                  className={`${color} ${opacity} pointer-events-none`}
              />
          );
      }
  });

  return (
    <div className="w-full h-full bg-zinc-900 border border-zinc-700 relative overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 1000 1000" className="w-full h-full" preserveAspectRatio="xMidYMid meet">

        {/* Map Background */}
        <image href="/dust2_2d.png" width="1000" height="1000" />

        {/* Path Lines */}
        {pathLines}

        {/* Vision Cones */}
        {cones}

        {/* Dropped Weapons */}
        {droppedWeaponsNodes}

        {/* Bots */}
        {bots.map((bot, index) => {
          if (bot.status === "DEAD") return null;

          const offsetX = (index % 3) * 6 - 3;
          const offsetY = Math.floor(index / 3) * 6 - 3;

          // Use exact position + offset
          const x = bot.pos.x + offsetX;
          const y = bot.pos.y + offsetY;

          const isSelected = bot.id === selectedBotId;

          return (
            <g key={bot.id}>
              {isSelected && (
                 <circle
                   cx={x}
                   cy={y}
                   r={14}
                   className="fill-none stroke-white"
                   strokeWidth="2"
                 />
              )}

              <circle
                cx={x}
                cy={y}
                r={8}
                className={bot.side === "T" ? "fill-yellow-500 stroke-black" : "fill-blue-500 stroke-black"}
                strokeWidth="1"
              />

              {/* HP Bar */}
              <rect
                x={x - 8}
                y={y - 12}
                width={16}
                height={3}
                className="fill-red-900"
              />
              <rect
                x={x - 8}
                y={y - 12}
                width={16 * (bot.hp / 100)}
                height={3}
                className="fill-green-500"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
