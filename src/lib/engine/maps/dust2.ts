import { MapData } from "../types";

const c = (to: string, sightline: boolean = true) => ({ to, sightline });

export const DUST2_MAP: MapData = {
  id: "dust2",
  name: "Dust II",
  spawnPoints: {
    T: "t_spawn",
    CT: "ct_spawn",
  },
  bombSites: {
    A: "a_site",
    B: "b_site"
  },
  strategies: {
    split: {
      A: [
        { name: "Long", pincerPoint: "long_pit" }, // More specific than long_doors
        { name: "Short", pincerPoint: "catwalk_lower" } // More specific than a_short
      ],
      B: [
        { name: "Tunnels", pincerPoint: "upper_tunnels" },
        { name: "Mid", pincerPoint: "ct_mid" } // More specific
      ]
    }
  },
  postPlantPositions: {
    A: ["ct_ramp", "a_boxes", "long_corner"], // More specific positions
    B: ["b_back_plat", "b_closet", "connector"]
  },
  zones: [
    // ==================
    // T SPAWN & INITIAL
    // ==================
    {
      id: "t_spawn",
      name: "T Spawn",
      x: 500,
      y: 50,
      connections: [c("top_mid"), c("outside_tunnels"), c("outside_long")],
      cover: 0.2,
    },

    // ==================
    // LONG A (5 zones - was 3)
    // ==================
    {
      id: "outside_long",
      name: "Outside Long",
      x: 800,
      y: 100,
      connections: [c("t_spawn"), c("long_doors")],
      cover: 0.3,
    },
    {
      id: "long_doors",
      name: "Long Doors",
      x: 900,
      y: 200,
      connections: [c("outside_long"), c("long_corner")],
      cover: 0.8, // Good choke point
    },
    // NEW: Long Corner - Critical AWP position
    {
      id: "long_corner",
      name: "Long Corner",
      x: 930,
      y: 280,
      connections: [c("long_doors"), c("long_pit")],
      cover: 0.6,
    },
    // NEW: Pit - Key defender position
    {
      id: "long_pit",
      name: "Long Pit",
      x: 940,
      y: 380,
      connections: [c("long_corner"), c("long_a")],
      cover: 0.8,
    },
    {
      id: "long_a",
      name: "Long A",
      x: 920,
      y: 500,
      connections: [c("long_pit"), c("a_ramp")],
      cover: 0.2, // Open area
    },
    {
      id: "a_ramp",
      name: "A Ramp",
      x: 880,
      y: 650,
      connections: [c("long_a"), c("a_site"), c("a_boxes")],
      cover: 0.4,
    },

    // ==================
    // A SITE (4 zones - was 1)
    // ==================
    {
      id: "a_site",
      name: "A Site",
      x: 800,
      y: 800,
      connections: [c("a_ramp"), c("a_boxes"), c("a_default"), c("a_short"), c("ct_ramp")],
      cover: 0.5, // Average of different positions
    },
    // NEW: Default Plant Position
    {
      id: "a_default",
      name: "A Default",
      x: 820,
      y: 820,
      connections: [c("a_site"), c("a_boxes"), c("ct_ramp")],
      cover: 0.7,
    },
    // NEW: Triple Boxes - Key cover position
    {
      id: "a_boxes",
      name: "A Triple",
      x: 760,
      y: 760,
      connections: [c("a_site"), c("a_default"), c("a_short"), c("a_ramp")],
      cover: 0.9, // Excellent cover
    },
    // NEW: CT Ramp - Rotation point
    {
      id: "ct_ramp",
      name: "CT Ramp",
      x: 750,
      y: 850,
      connections: [c("a_site"), c("a_default"), c("ct_spawn")],
      cover: 0.5,
    },

    // ==================
    // SHORT / CATWALK (4 zones - was 2)
    // ==================
    {
      id: "a_short",
      name: "A Short",
      x: 700,
      y: 700,
      connections: [c("a_site"), c("a_boxes"), c("catwalk_upper")],
      cover: 0.5,
    },
    // NEW: Split catwalk into upper/lower for better granularity
    {
      id: "catwalk_upper",
      name: "Upper Cat",
      x: 650,  // Changed from 650, 640 to align with snippet
      y: 640,
      connections: [c("a_short"), c("catwalk_lower")],
      cover: 0.4,
    },
    {
      id: "catwalk_lower",
      name: "Lower Cat",
      x: 600,
      y: 580,
      connections: [c("catwalk_upper"), c("ct_cat"), c("suicide")],
      cover: 0.3,
    },
    // NEW: CT side of cat
    {
      id: "ct_cat",
      name: "CT Cat",
      x: 580,
      y: 650,
      connections: [c("catwalk_lower"), c("ct_mid")],
      cover: 0.5,
    },

    // ==================
    // MID (6 zones - was 3)
    // ==================
    {
      id: "top_mid",
      name: "Top Mid",
      x: 500,
      y: 200,
      connections: [c("t_spawn"), c("upper_mid")],
      cover: 0.4,
    },
    // NEW: Upper Mid - Before suicide/xbox
    {
      id: "upper_mid",
      name: "Upper Mid",
      x: 510,
      y: 320,
      connections: [c("top_mid"), c("xbox"), c("suicide")],
      cover: 0.3,
    },
    // NEW: Xbox - Critical mid position
    {
      id: "xbox",
      name: "Xbox",
      x: 520,
      y: 420,
      connections: [c("upper_mid"), c("suicide"), c("lower_mid")],
      cover: 0.7,
    },
    // NEW: Suicide - Open mid crossing
    {
      id: "suicide",
      name: "Suicide",
      x: 480,
      y: 500,
      connections: [c("xbox"), c("catwalk_lower"), c("lower_mid")],
      cover: 0.05, // Very exposed
    },
    // NEW: Lower Mid
    {
      id: "lower_mid",
      name: "Lower Mid",
      x: 500,
      y: 580,
      connections: [c("xbox"), c("suicide"), c("ct_mid"), c("lower_tunnels")],
      cover: 0.2,
    },
    // NEW: CT Mid - CT side connector
    {
      id: "ct_mid",
      name: "CT Mid",
      x: 500,
      y: 680,
      connections: [c("lower_mid"), c("ct_cat"), c("mid_doors")],
      cover: 0.4,
    },
    {
      id: "mid_doors",
      name: "Mid Doors",
      x: 500,
      y: 750,
      connections: [c("ct_mid"), c("ct_spawn"), c("connector")],
      cover: 0.9, // Door cover
    },

    // ==================
    // B TUNNELS (3 zones - unchanged)
    // ==================
    {
      id: "outside_tunnels",
      name: "Outside Tunnels",
      x: 200,
      y: 100,
      connections: [c("t_spawn"), c("upper_tunnels")],
      cover: 0.3,
    },
    {
      id: "upper_tunnels",
      name: "Upper Tunnels",
      x: 150,
      y: 300,
      connections: [c("outside_tunnels"), c("b_tunnels"), c("lower_tunnels")],
      cover: 0.8,
    },
    {
      id: "lower_tunnels",
      name: "Lower Tunnels",
      x: 350,
      y: 450,
      connections: [c("upper_tunnels"), c("lower_mid")],
      cover: 0.6,
    },
    {
      id: "b_tunnels",
      name: "B Tunnels",
      x: 150,
      y: 600,
      connections: [c("upper_tunnels"), c("b_site")],
      cover: 0.7,
    },

    // ==================
    // B SITE (5 zones - was 2)
    // ==================
    {
      id: "b_site",
      name: "B Site",
      x: 150,
      y: 780,
      connections: [c("b_tunnels"), c("b_default"), c("b_closet"), c("b_window"), c("b_doors")],
      cover: 0.6,
    },
    // NEW: B Default Plant
    {
      id: "b_default",
      name: "B Default",
      x: 160,
      y: 820,
      connections: [c("b_site"), c("b_back_plat")],
      cover: 0.7,
    },
    // NEW: Back Plat - Behind site
    {
      id: "b_back_plat",
      name: "B Back Plat",
      x: 130,
      y: 850,
      connections: [c("b_default"), c("b_window")],
      cover: 0.8,
    },
    // NEW: Closet/Fence - Key hold position
    {
      id: "b_closet",
      name: "B Closet",
      x: 190,
      y: 770,
      connections: [c("b_site"), c("b_doors")],
      cover: 0.9,
    },
    {
      id: "b_window",
      name: "B Window",
      x: 300,
      y: 820,
      connections: [c("b_site"), c("b_back_plat"), c("connector"), c("ct_spawn")],
      cover: 0.6,
    },
    {
      id: "b_doors",
      name: "B Doors",
      x: 220,
      y: 750,
      connections: [c("b_site"), c("b_closet"), c("connector")],
      cover: 0.5
    },
    // NEW: Connector - Link between mid and B
    {
      id: "connector",
      name: "Connector",
      x: 380,
      y: 760,
      connections: [c("mid_doors"), c("b_doors"), c("b_window")],
      cover: 0.5,
    },

    // ==================
    // CT SPAWN
    // ==================
    {
      id: "ct_spawn",
      name: "CT Spawn",
      x: 500,
      y: 920,
      connections: [c("ct_ramp"), c("mid_doors"), c("b_window")],
      cover: 0.5,
    },
  ],
};
