"use client";

import React from "react";
import { DUST2_MAP } from "@/lib/engine/maps/dust2";
import { MapDebugViewer } from "@/components/debug/MapDebugViewer";

export default function MapDebugPage() {
  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      <div className="p-4 bg-zinc-800 text-white flex justify-between items-center">
        <h1 className="text-xl font-bold">Map Debug: Dust 2</h1>
        <div className="text-sm text-zinc-400">
          Red dots = Zones (defined in dust2.ts) | Cyan = NavMesh Nodes (from de_dust2_web.json)
        </div>
      </div>
      <div className="flex-grow p-4 overflow-hidden">
        <MapDebugViewer mapData={DUST2_MAP} />
      </div>
    </div>
  );
}
