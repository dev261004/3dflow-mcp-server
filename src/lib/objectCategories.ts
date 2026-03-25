export type ObjectCategory =
  | "character"
  | "vehicle"
  | "device"
  | "container"
  | "footwear"
  | "furniture"
  | "food"
  | "organic"
  | "structure"
  | "unknown";

export interface CategoryConfig {
  bbox: [number, number, number];
  minParts: number;
  complexityHint: "low" | "medium" | "high";
  assemblyHint: string;
}

export const CATEGORY_MAP: Record<ObjectCategory, CategoryConfig> = {
  character: {
    bbox: [1, 2, 1],
    minParts: 7,
    complexityHint: "high",
    assemblyHint: "Humanoid or creature: needs head, torso, 2 arms, 2 legs, and at least one detail element (eyes, antenna, joints, etc.)"
  },
  vehicle: {
    bbox: [2.5, 1, 4],
    minParts: 6,
    complexityHint: "high",
    assemblyHint: "Vehicle body: needs chassis, 4 wheels or engine pods, windshield/cockpit, and at least one detail element"
  },
  device: {
    bbox: [0.4, 0.85, 0.08],
    minParts: 4,
    complexityHint: "medium",
    assemblyHint: "Electronic device: needs body slab, screen panel, at least 2 UI/hardware detail elements (buttons, camera, speaker grille)"
  },
  container: {
    bbox: [0.5, 1.6, 0.5],
    minParts: 3,
    complexityHint: "medium",
    assemblyHint: "Container: needs main body (cylinder or box), top/cap element, and at least one label or detail band"
  },
  footwear: {
    bbox: [1.1, 0.55, 0.42],
    minParts: 5,
    complexityHint: "medium",
    assemblyHint: "Shoe: needs sole slab, upper body, heel, toe box, and at least one detail (laces, stripe, logo panel)"
  },
  furniture: {
    bbox: [1.2, 1.1, 1.2],
    minParts: 5,
    complexityHint: "medium",
    assemblyHint: "Furniture: needs primary surface (seat/tabletop), support structure (legs/base), and 2+ detail elements"
  },
  food: {
    bbox: [1, 0.6, 1],
    minParts: 3,
    complexityHint: "low",
    assemblyHint: "Food item: needs primary shape, at least one texture/color layer, and a base or plate element if applicable"
  },
  organic: {
    bbox: [1, 1.2, 1],
    minParts: 3,
    complexityHint: "low",
    assemblyHint: "Organic form: needs primary body shape, secondary accent shapes, and a base/stem element"
  },
  structure: {
    bbox: [2, 3, 2],
    minParts: 4,
    complexityHint: "medium",
    assemblyHint: "Structure: needs main body, at least 2 architectural detail elements, and a base/foundation"
  },
  unknown: {
    bbox: [1, 1, 1],
    minParts: 4,
    complexityHint: "medium",
    assemblyHint: "General object: build a recognizable 3D representation using primitive geometries. Prioritize silhouette accuracy."
  }
};

export const CATEGORY_KEYWORDS: Record<string, ObjectCategory> = {
  robot: "character",
  human: "character",
  figure: "character",
  avatar: "character",
  alien: "character",
  creature: "character",
  person: "character",
  character: "character",
  android: "character",
  cyborg: "character",

  car: "vehicle",
  spaceship: "vehicle",
  drone: "vehicle",
  truck: "vehicle",
  bike: "vehicle",
  boat: "vehicle",
  ship: "vehicle",
  rocket: "vehicle",
  aircraft: "vehicle",
  ufo: "vehicle",
  helicopter: "vehicle",

  phone: "device",
  smartphone: "device",
  tablet: "device",
  laptop: "device",
  watch: "device",
  camera: "device",
  headphones: "device",
  earbuds: "device",
  console: "device",
  controller: "device",
  monitor: "device",
  keyboard: "device",

  bottle: "container",
  can: "container",
  cup: "container",
  jar: "container",
  box: "container",
  bag: "container",
  vase: "container",
  flask: "container",
  mug: "container",
  tumbler: "container",
  coldrink: "container",
  soda: "container",

  shoe: "footwear",
  sneaker: "footwear",
  boot: "footwear",
  sandal: "footwear",
  heel: "footwear",
  trainer: "footwear",

  chair: "furniture",
  table: "furniture",
  sofa: "furniture",
  desk: "furniture",
  shelf: "furniture",
  lamp: "furniture",
  couch: "furniture",
  bench: "furniture",

  apple: "food",
  burger: "food",
  pizza: "food",
  cake: "food",
  fruit: "food",
  bread: "food",
  donut: "food",
  sandwich: "food",

  plant: "organic",
  tree: "organic",
  flower: "organic",
  leaf: "organic",
  crystal: "organic",
  gem: "organic",
  rock: "organic",
  coral: "organic",

  building: "structure",
  tower: "structure",
  arch: "structure",
  bridge: "structure",
  house: "structure",
  monument: "structure"
};

export function detectCategory(objectName: string): ObjectCategory {
  const normalized = objectName.toLowerCase().trim();

  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }

  return "unknown";
}
