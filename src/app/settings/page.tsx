"use client";

import React from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Map, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
           <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider border-l-4 border-primary pl-3">
             Settings
           </h2>
           <p className="text-sm text-muted-foreground mb-4">
             Configure application preferences and access developer tools.
           </p>
        </div>

        <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Developer Tools
            </h3>

            <Link href="/map-debug" className="block">
                <div className="bg-card border border-border p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-none text-primary">
                            <Map className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors">Map Debug Viewer</div>
                            <div className="text-xs text-muted-foreground">Visualize map geometry, zones, and navigation mesh.</div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </Link>
        </div>
      </div>
    </Shell>
  );
}
