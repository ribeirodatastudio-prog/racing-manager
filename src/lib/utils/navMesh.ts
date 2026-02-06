import navMeshData from "@/data/de_dust2_web.json";

// Type definition for the Nav Mesh structure
export interface NavMeshNode {
  pos: [number, number]; // [x, y]
  adj: number[];         // Neighbor IDs
}

export interface NavMesh {
  [key: string]: NavMeshNode;
}

// Cast the imported JSON to the NavMesh type
export const NAV_MESH: NavMesh = navMeshData as unknown as NavMesh;

// Transformation Constants for de_dust2
const MAP_OFFSET_X = -2486;
const MAP_OFFSET_Y = 3239;
const MAP_SCALE = 4.4;

/**
 * Transforms Source Engine Game Coordinates to 1000x1000 SVG Coordinates
 * for the visualizer.
 *
 * @param x Game X coordinate
 * @param y Game Y coordinate
 * @returns {x, y} SVG coordinates
 */
export const transformGameToSVG = (x: number, y: number): { x: number, y: number } => {
  // 1. Convert Game Unit -> Original Radar Image Pixel
  // Note: Y is inverted (Game Y Up vs Screen Y Down)
  const radarX = (x - MAP_OFFSET_X) / MAP_SCALE;
  const radarY = (MAP_OFFSET_Y - y) / MAP_SCALE;

  // 2. Scale Radar Pixel -> 1000x1000 SVG Container
  // The standard radar image is usually 1024x1024.
  const svgX = (radarX / 1024) * 1000;
  const svgY = (radarY / 1024) * 1000;

  return { x: svgX, y: svgY };
};
