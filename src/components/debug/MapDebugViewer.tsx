import React, { useMemo } from "react";
import { NAV_MESH, transformGameToSVG } from "@/lib/utils/navMesh";
import { MapData } from "@/lib/engine/types";

interface MapDebugViewerProps {
  mapData: MapData;
}

export const MapDebugViewer: React.FC<MapDebugViewerProps> = ({ mapData }) => {
  // Render Nav Mesh
  const navMeshNodes = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    const edges: React.ReactNode[] = [];

    Object.entries(NAV_MESH).forEach(([id, node]) => {
      const { x, y } = transformGameToSVG(node.pos[0], node.pos[1]);
      const nodeId = parseInt(id);

      // Render Node
      nodes.push(
        <circle
          key={`node-${id}`}
          cx={x}
          cy={y}
          r={1.5}
          fill="rgba(0, 255, 255, 0.4)"
        />
      );

      // Render Edges
      node.adj.forEach((neighborId) => {
        if (nodeId < neighborId) {
          const neighbor = NAV_MESH[neighborId.toString()];
          if (neighbor) {
            const { x: nx, y: ny } = transformGameToSVG(neighbor.pos[0], neighbor.pos[1]);
            edges.push(
              <line
                key={`edge-${id}-${neighborId}`}
                x1={x}
                y1={y}
                x2={nx}
                y2={ny}
                stroke="rgba(0, 255, 255, 0.2)"
                strokeWidth="0.5"
              />
            );
          }
        }
      });
    });

    return (
      <g className="nav-mesh-layer pointer-events-none">
        {edges}
        {nodes}
      </g>
    );
  }, []);

  // Render Zones
  const zoneNodes = useMemo(() => {
    return mapData.zones.map((zone) => {
      return (
        <g key={zone.id}>
          <circle
            cx={zone.x}
            cy={zone.y}
            r={4}
            fill="rgba(255, 50, 50, 0.8)"
            stroke="white"
            strokeWidth="1"
          />
          <text
            x={zone.x}
            y={zone.y - 6}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            style={{ textShadow: "1px 1px 1px black" }}
          >
            {zone.name}
          </text>
        </g>
      );
    });
  }, [mapData]);

  return (
    <div className="w-full h-full bg-zinc-900 border border-zinc-700 relative overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 1000 1000" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Map Background */}
        <image href="/dust2_2d.png" width="1000" height="1000" />

        {/* Nav Mesh */}
        {navMeshNodes}

        {/* Zones */}
        {zoneNodes}
      </svg>
    </div>
  );
};
