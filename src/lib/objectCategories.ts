import type { ComplexityTier } from "./complexity.profiles.js";

export type ObjectCategory =
  | "character"
  | "humanoid"
  | "vehicle"
  | "device"
  | "container"
  | "accessory"
  | "footwear"
  | "apparel"
  | "furniture"
  | "book"
  | "food"
  | "plant"
  | "tool"
  | "organic"
  | "structure"
  | "surface"
  | "environment"
  | "particle_system"
  | "unknown";

type NormalizedCategory = Exclude<ObjectCategory, "character">;

export interface CategoryConfig {
  bbox: [number, number, number];
  minParts: number;
  complexityHint: ComplexityTier;
  assemblyHint: string;
}

type CategoryProfile = {
  bbox: Record<ComplexityTier, [number, number, number]>;
  defaultComplexity: ComplexityTier;
  minParts: number;
  assemblyHints: Record<ComplexityTier, string>;
};

type KeywordEntry = {
  category: NormalizedCategory;
  keyword: string;
};

type ObjectVariantProfile = KeywordEntry & {
  bbox: [number, number, number];
  assemblyHint: string;
};

const UNKNOWN_ASSEMBLY_HINT =
  "Build a detailed object using the listed geometry primitives. Identify natural sub-components (top, bottom, sides, handles, openings, decorative elements) and represent each as a separate mesh with distinct material properties.";
const CONTAINER_BAG_HINT =
  "Main body panel, back panel, side gussets, top flap with closure, dual handles or chain strap with connectors, hardware (clasp disc, outer ring), stitching lines, corner reinforcements, base plate, stud feet, logo plate, interior zipper strip with pull, and chain attachment loops.";
const CONTAINER_WALLET_HINT =
  "Main body (thin flat box), two card slot panels, fold crease line, inner lining strip, snap or button closure disc, logo plate.";
const CONTAINER_BOTTLE_HINT =
  "Body cylinder, bottom base disc, shoulder taper, neck cylinder, cap or lid, label panel, cap thread rings.";
const FOOTWEAR_HINT =
  "Sole base (flat box), midsole layer, upper body shell, toe cap, heel counter, tongue panel, eyelets row, lace loops or velcro strap, insole inner panel.";
const ACCESSORY_WATCH_HINT =
  "Case body disc, bezel ring, watch face disc, hour/minute hands (thin cylinders), crown knob, strap (two rectangular links), buckle ring.";
const ACCESSORY_RING_HINT =
  "Band torus, gemstone (sphere or faceted box), prong settings (small cylinders), inner bore (inner torus), hallmark stamp (small rectangle on band).";
const APPAREL_HAT_HINT =
  "Crown dome (hemisphere), brim ring, sweatband inner ring, button top disc, seam lines.";
const FURNITURE_CHAIR_HINT =
  "Seat platform, seat cushion, back rest panel, four legs, two armrests (optional), leg cross-braces, foot pads.";
const BOOK_HINT =
  "Cover front (flat box), cover back (flat box), spine (thin tall box), page block (slightly thinner box), page-edge tinting strip, bookmark ribbon.";
const DEVICE_PHONE_HINT =
  "Screen panel, chassis body, back panel, camera module (small cylinder cluster), button strips (side), speaker grille strip, port cutout, logo disc.";

const CATEGORY_PROFILES: Record<NormalizedCategory, CategoryProfile> = {
  humanoid: {
    bbox: {
      low: [0.4, 1.2, 0.4],
      medium: [0.5, 1.6, 0.5],
      high: [0.6, 1.8, 0.5]
    },
    defaultComplexity: "high",
    minParts: 7,
    assemblyHints: {
      low: "Simple head + body + 2 arm stubs + 2 leg stubs.",
      medium: "Head + neck + torso + 2 arms (upper+forearm) + 2 legs (thigh+shin) + basic hands.",
      high: "Head with visor + eyes, neck, torso with chest ring + core + side panels, waist + accent strip, 2 arms (shoulder joint + upper arm + elbow joint + forearm + hand), 2 legs (hip joint + upper leg + knee joint + lower leg + foot), antenna + base ring."
    }
  },
  vehicle: {
    bbox: {
      low: [1.4, 0.6, 0.8],
      medium: [2.0, 0.8, 1.0],
      high: [2.4, 0.95, 1.2]
    },
    defaultComplexity: "high",
    minParts: 6,
    assemblyHints: {
      low: "Simple chassis shell + wheel forms + one identifying detail.",
      medium: "Body shell + cabin volume + wheel or wing supports + front and rear detail clusters.",
      high: "Detailed vehicle assembly with body shell, support frame, wheel or rotor elements, trim surfaces, lights, intakes, and separate accent panels."
    }
  },
  device: {
    bbox: {
      low: [0.075, 0.16, 0.008],
      medium: [0.16, 0.22, 0.03],
      high: [0.22, 0.28, 0.04]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: DEVICE_PHONE_HINT,
      medium: DEVICE_PHONE_HINT,
      high: DEVICE_PHONE_HINT
    }
  },
  container: {
    bbox: {
      low: [0.4, 0.18, 0.18],
      medium: [1.0, 0.7, 0.45],
      high: [1.1, 0.8, 0.5]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: "Primary container body + closure or opening + one identifying detail.",
      medium: "Primary container body + secondary paneling + handle, cap, or closure element + 1 to 2 hardware details.",
      high: "Detailed container assembly with body shell, support panels, openings, closure hardware, trim accents, and interior or seam details."
    }
  },
  accessory: {
    bbox: {
      low: [0.03, 0.03, 0.03],
      medium: [0.05, 0.02, 0.05],
      high: [0.08, 0.03, 0.08]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: ACCESSORY_RING_HINT,
      medium: ACCESSORY_RING_HINT,
      high: ACCESSORY_WATCH_HINT
    }
  },
  footwear: {
    bbox: {
      low: [0.3, 0.12, 0.1],
      medium: [0.32, 0.14, 0.12],
      high: [0.36, 0.16, 0.14]
    },
    defaultComplexity: "medium",
    minParts: 5,
    assemblyHints: {
      low: FOOTWEAR_HINT,
      medium: FOOTWEAR_HINT,
      high: FOOTWEAR_HINT
    }
  },
  apparel: {
    bbox: {
      low: [0.22, 0.12, 0.12],
      medium: [0.28, 0.18, 0.28],
      high: [0.32, 0.22, 0.32]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: APPAREL_HAT_HINT,
      medium: APPAREL_HAT_HINT,
      high: APPAREL_HAT_HINT
    }
  },
  furniture: {
    bbox: {
      low: [0.55, 0.9, 0.55],
      medium: [0.9, 0.9, 0.75],
      high: [1.2, 0.95, 0.8]
    },
    defaultComplexity: "medium",
    minParts: 5,
    assemblyHints: {
      low: FURNITURE_CHAIR_HINT,
      medium: FURNITURE_CHAIR_HINT,
      high: FURNITURE_CHAIR_HINT
    }
  },
  book: {
    bbox: {
      low: [0.22, 0.3, 0.03],
      medium: [0.24, 0.32, 0.04],
      high: [0.28, 0.36, 0.05]
    },
    defaultComplexity: "low",
    minParts: 4,
    assemblyHints: {
      low: BOOK_HINT,
      medium: BOOK_HINT,
      high: BOOK_HINT
    }
  },
  food: {
    bbox: {
      low: [0.3, 0.18, 0.3],
      medium: [0.5, 0.25, 0.5],
      high: [0.7, 0.32, 0.7]
    },
    defaultComplexity: "low",
    minParts: 3,
    assemblyHints: {
      low: "Primary edible silhouette + one topping, wrapper, or garnish layer.",
      medium: "Primary edible body + stacked garnish or wrapper layers + supporting plate or base.",
      high: "Detailed food silhouette with layered fillings, garnish, surface accents, and supporting plate or wrapper elements."
    }
  },
  plant: {
    bbox: {
      low: [0.2, 0.4, 0.2],
      medium: [0.28, 0.55, 0.28],
      high: [0.4, 0.8, 0.4]
    },
    defaultComplexity: "low",
    minParts: 3,
    assemblyHints: {
      low: "Stem or trunk + one leaf or bloom volume + base or pot.",
      medium: "Main stem + layered leaves or petals + secondary cluster forms + base or pot.",
      high: "Detailed plant silhouette with main stem, layered leaf or petal volumes, branch accents, and secondary growth clusters."
    }
  },
  tool: {
    bbox: {
      low: [0.015, 0.19, 0.015],
      medium: [0.12, 0.25, 0.05],
      high: [0.2, 0.32, 0.08]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: "Primary handle shaft + one working tip or head element.",
      medium: "Handle + grip segmentation + working tip or tool head + one accent detail.",
      high: "Detailed tool assembly with handle, grip breaks, working head, fasteners, trim accents, and secondary functional parts."
    }
  },
  organic: {
    bbox: {
      low: [0.6, 0.8, 0.6],
      medium: [1.0, 1.2, 1.0],
      high: [1.4, 1.6, 1.4]
    },
    defaultComplexity: "low",
    minParts: 3,
    assemblyHints: {
      low: "Primary body shape + one secondary accent + base or stem.",
      medium: "Main organic body + layered secondary forms + stem, base, or branching accents.",
      high: "Detailed organic silhouette with layered volumes, accent clusters, stem or branch elements, and varied surface detail panels."
    }
  },
  structure: {
    bbox: {
      low: [1.2, 1.8, 1.2],
      medium: [2.0, 3.0, 2.0],
      high: [3.0, 4.5, 3.0]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: "Main structural body + base + one opening or trim detail.",
      medium: "Main volume + base + 2 to 3 facade or support details.",
      high: "Detailed structural assembly with primary massing, facade layers, support members, base foundation, openings, trim lines, and accent architectural elements."
    }
  },
  surface: {
    bbox: {
      low: [2.0, 0.05, 2.0],
      medium: [4.0, 0.05, 4.0],
      high: [6.0, 0.05, 6.0]
    },
    defaultComplexity: "medium",
    minParts: 1,
    assemblyHints: {
      low: "Single flat plane.",
      medium: "Flat plane + 1 to 2 ring or grid detail elements.",
      high: "Mirror-finish plane + 5 concentric emissive rings + dot accent clusters at ring intersections + 4 radial strip elements + subtle elevation variance tiles."
    }
  },
  environment: {
    bbox: {
      low: [3.0, 2.0, 3.0],
      medium: [5.0, 3.0, 5.0],
      high: [8.0, 5.0, 8.0]
    },
    defaultComplexity: "medium",
    minParts: 3,
    assemblyHints: {
      low: "Simple background plane or hemisphere.",
      medium: "Background + 2 to 3 ambient floating elements.",
      high: "Rich environment with layered depth: background surface, mid-ground accent objects, foreground particles or bokeh planes, and emissive accent lines."
    }
  },
  particle_system: {
    bbox: {
      low: [0.6, 0.6, 0.6],
      medium: [0.8, 0.8, 0.8],
      high: [1.2, 1.2, 1.2]
    },
    defaultComplexity: "medium",
    minParts: 8,
    assemblyHints: {
      low: "8 to 12 small spheres scattered in a loose cluster.",
      medium: "20 mixed-shape particles using spheres, boxes, and cones at varied positions and sizes.",
      high: "28+ particles mixing spheres, boxes, and cones at distinct 3D positions, varied sizes, with emissive intensity variation between particles to create visual depth."
    }
  },
  unknown: {
    bbox: {
      low: [1, 1, 1],
      medium: [1, 1, 1],
      high: [1, 1, 1]
    },
    defaultComplexity: "medium",
    minParts: 4,
    assemblyHints: {
      low: UNKNOWN_ASSEMBLY_HINT,
      medium: UNKNOWN_ASSEMBLY_HINT,
      high: UNKNOWN_ASSEMBLY_HINT
    }
  }
};

const CATEGORY_KEYWORDS: Array<{ category: NormalizedCategory; keywords: string[] }> = [
  {
    category: "particle_system",
    keywords: ["particle", "particles", "dust", "sparkle", "sparkles", "confetti", "glitter", "bokeh"]
  },
  {
    category: "surface",
    keywords: ["floor", "ground", "surface", "plane", "reflection", "mirror", "platform", "stage"]
  },
  {
    category: "environment",
    keywords: ["sky", "background", "environment", "backdrop", "horizon", "panorama", "scene"]
  },
  {
    category: "humanoid",
    keywords: ["robot", "human", "figure", "avatar", "alien", "creature", "person", "character", "android", "cyborg"]
  },
  {
    category: "vehicle",
    keywords: ["motorcycle", "bicycle", "scooter", "spaceship", "helicopter", "car", "truck", "bike", "bus", "train", "plane", "boat", "ship", "drone", "rocket", "aircraft", "ufo"]
  },
  {
    category: "device",
    keywords: ["smartphone", "headphones", "controller", "keyboard", "monitor", "speaker", "earbuds", "charger", "laptop", "tablet", "camera", "remote", "console", "phone", "mouse", "tv", "watch"]
  },
  {
    category: "container",
    keywords: ["cardholder", "briefcase", "backpack", "handbag", "suitcase", "coldrink", "billfold", "thermos", "satchel", "wallet", "bottle", "basket", "bucket", "clutch", "pouch", "crate", "flask", "trunk", "purse", "luggage", "tumbler", "mug", "bag", "box", "bowl", "cup", "jar", "can", "tin", "pot", "vase", "tote"]
  },
  {
    category: "accessory",
    keywords: ["smartwatch", "bracelet", "cufflink", "tie clip", "hair clip", "bag clip", "necklace", "earring", "brooch", "bangle", "pendant", "choker", "anklet", "charm", "watch", "ring", "pin"]
  },
  {
    category: "footwear",
    keywords: ["flip flop", "sneaker", "slipper", "loafer", "oxford", "trainer", "sandal", "pump", "wedge", "mule", "clog", "shoe", "boot", "heel"]
  },
  {
    category: "apparel",
    keywords: ["sunglasses", "glasses", "goggles", "bowtie", "helmet", "beanie", "scarf", "mitten", "beret", "glove", "belt", "mask", "sock", "hat", "cap", "tie"]
  },
  {
    category: "furniture",
    keywords: ["wardrobe", "cabinet", "dresser", "mattress", "cushion", "pillow", "bench", "chair", "couch", "stool", "table", "desk", "shelf", "sofa", "bed"]
  },
  {
    category: "book",
    keywords: ["notebook", "magazine", "catalogue", "journal", "manual", "comic", "diary", "book"]
  },
  {
    category: "food",
    keywords: ["croissant", "sandwich", "burger", "coffee", "donut", "sushi", "pizza", "apple", "cake", "fruit", "bread", "tea"]
  },
  {
    category: "plant",
    keywords: ["succulent", "cactus", "branch", "flower", "plant", "tree", "leaf"]
  },
  {
    category: "tool",
    keywords: ["screwdriver", "scissors", "hammer", "wrench", "pliers", "pencil", "brush", "knife", "drill", "saw", "pen"]
  },
  {
    category: "organic",
    keywords: ["crystal", "coral", "rock", "gem"]
  },
  {
    category: "structure",
    keywords: ["building", "monument", "bridge", "tower", "house", "arch"]
  }
];

const OBJECT_VARIANTS: ObjectVariantProfile[] = [
  ...[
    "bag",
    "handbag",
    "purse",
    "tote",
    "backpack",
    "satchel",
    "pouch",
    "clutch",
    "briefcase",
    "luggage",
    "suitcase",
    "trunk"
  ].map((keyword) => ({
    category: "container" as const,
    keyword,
    bbox: [1.0, 0.7, 0.45] as [number, number, number],
    assemblyHint: CONTAINER_BAG_HINT
  })),
  ...["wallet", "billfold", "cardholder"].map((keyword) => ({
    category: "container" as const,
    keyword,
    bbox: [0.2, 0.01, 0.12] as [number, number, number],
    assemblyHint: CONTAINER_WALLET_HINT
  })),
  ...["bottle", "jar", "can", "tin", "flask", "thermos", "vase", "pot"].map((keyword) => ({
    category: "container" as const,
    keyword,
    bbox: [0.12, 0.35, 0.12] as [number, number, number],
    assemblyHint: CONTAINER_BOTTLE_HINT
  })),
  ...["watch", "smartwatch"].map((keyword) => ({
    category: "accessory" as const,
    keyword,
    bbox: [0.05, 0.01, 0.05] as [number, number, number],
    assemblyHint: ACCESSORY_WATCH_HINT
  })),
  ...[
    "ring",
    "bracelet",
    "bangle",
    "earring",
    "necklace",
    "anklet",
    "choker",
    "brooch",
    "pin",
    "cufflink",
    "tie clip",
    "pendant",
    "charm",
    "hair clip",
    "bag clip"
  ].map((keyword) => ({
    category: "accessory" as const,
    keyword,
    bbox: [0.03, 0.03, 0.03] as [number, number, number],
    assemblyHint: ACCESSORY_RING_HINT
  })),
  ...[
    "shoe",
    "sneaker",
    "boot",
    "heel",
    "sandal",
    "slipper",
    "loafer",
    "oxford",
    "trainer",
    "pump",
    "wedge",
    "mule",
    "clog",
    "flip flop"
  ].map((keyword) => ({
    category: "footwear" as const,
    keyword,
    bbox: [0.3, 0.12, 0.1] as [number, number, number],
    assemblyHint: FOOTWEAR_HINT
  })),
  ...["hat", "cap", "beanie", "beret", "helmet"].map((keyword) => ({
    category: "apparel" as const,
    keyword,
    bbox: [0.28, 0.18, 0.28] as [number, number, number],
    assemblyHint: APPAREL_HAT_HINT
  })),
  ...["glasses", "sunglasses", "goggles", "mask"].map((keyword) => ({
    category: "apparel" as const,
    keyword,
    bbox: [0.16, 0.05, 0.06] as [number, number, number],
    assemblyHint: APPAREL_HAT_HINT
  })),
  ...["chair", "stool", "bench"].map((keyword) => ({
    category: "furniture" as const,
    keyword,
    bbox: [0.55, 0.9, 0.55] as [number, number, number],
    assemblyHint: FURNITURE_CHAIR_HINT
  })),
  ...["table", "desk"].map((keyword) => ({
    category: "furniture" as const,
    keyword,
    bbox: [1.2, 0.75, 0.7] as [number, number, number],
    assemblyHint: FURNITURE_CHAIR_HINT
  })),
  ...["book", "notebook", "journal", "diary", "magazine", "comic", "manual", "catalogue"].map((keyword) => ({
    category: "book" as const,
    keyword,
    bbox: [0.22, 0.3, 0.03] as [number, number, number],
    assemblyHint: BOOK_HINT
  })),
  ...["phone", "smartphone"].map((keyword) => ({
    category: "device" as const,
    keyword,
    bbox: [0.075, 0.16, 0.008] as [number, number, number],
    assemblyHint: DEVICE_PHONE_HINT
  })),
  ...["car", "truck", "bus"].map((keyword) => ({
    category: "vehicle" as const,
    keyword,
    bbox: [2.0, 0.8, 1.0] as [number, number, number],
    assemblyHint: "Detailed vehicle assembly with body shell, cabin, wheel sets, lights, trim lines, and separate support or chassis volumes."
  })),
  ...["flower", "plant", "tree", "cactus", "succulent", "leaf", "branch"].map((keyword) => ({
    category: "plant" as const,
    keyword,
    bbox: [0.2, 0.4, 0.2] as [number, number, number],
    assemblyHint: "Stem or trunk, layered leaves or petals, central bud or bloom, supporting branches, and base or pot volume."
  })),
  ...["pen", "pencil", "brush"].map((keyword) => ({
    category: "tool" as const,
    keyword,
    bbox: [0.015, 0.19, 0.015] as [number, number, number],
    assemblyHint: "Long shaft body, tapered or functional tip, grip section, cap or ferrule, and one secondary accent piece."
  }))
];

const NORMALIZED_OBJECT_VARIANTS = OBJECT_VARIANTS.map((entry) => ({
  ...entry,
  keyword: normalizeObjectName(entry.keyword)
}));

const KEYWORD_ENTRIES: KeywordEntry[] = CATEGORY_KEYWORDS.flatMap((entry) =>
  entry.keywords.map((keyword) => ({
    category: entry.category,
    keyword: normalizeObjectName(keyword)
  }))
);

function normalizeObjectName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeywordBoundaryMatch(normalizedObjectName: string, keyword: string) {
  return new RegExp(`(?:^| )${escapeRegex(keyword)}(?:$| )`).test(normalizedObjectName);
}

function findBestKeywordMatch<T extends KeywordEntry>(
  objectName: string,
  entries: readonly T[],
  requireSpecificEntry = false
) {
  const normalized = normalizeObjectName(objectName);

  if (!normalized) {
    return undefined;
  }

  const exactMatches = entries.filter((entry) => entry.keyword === normalized);

  if (exactMatches.length > 0) {
    return exactMatches.sort((left, right) => right.keyword.length - left.keyword.length)[0];
  }

  if (requireSpecificEntry) {
    return undefined;
  }

  const fuzzyMatches = entries.filter((entry) => hasKeywordBoundaryMatch(normalized, entry.keyword));

  if (fuzzyMatches.length === 0) {
    return undefined;
  }

  return fuzzyMatches.sort((left, right) => right.keyword.length - left.keyword.length)[0];
}

function getSpecificObjectProfile(objectName?: string) {
  if (!objectName) {
    return undefined;
  }

  return findBestKeywordMatch(objectName, NORMALIZED_OBJECT_VARIANTS, false);
}

function createCategoryConfig(category: NormalizedCategory): CategoryConfig {
  const profile = CATEGORY_PROFILES[category];

  return {
    bbox: profile.bbox.medium,
    minParts: profile.minParts,
    complexityHint: profile.defaultComplexity,
    assemblyHint: profile.assemblyHints.medium
  };
}

export function normalizeObjectCategory(category: ObjectCategory | string | undefined): NormalizedCategory {
  if (category === "character") {
    return "humanoid";
  }

  if (category && category in CATEGORY_PROFILES) {
    return category as NormalizedCategory;
  }

  return "unknown";
}

export function detectCategory(objectName: string): ObjectCategory {
  const specificProfile = getSpecificObjectProfile(objectName);

  if (specificProfile) {
    return specificProfile.category;
  }

  const keywordMatch = findBestKeywordMatch(objectName, KEYWORD_ENTRIES);

  return keywordMatch?.category ?? "unknown";
}

export function getBoundingBox(
  category: ObjectCategory | string | undefined,
  complexityTier: ComplexityTier,
  objectName?: string
) {
  const specificProfile = getSpecificObjectProfile(objectName);

  if (specificProfile) {
    return specificProfile.bbox;
  }

  const normalizedCategory = normalizeObjectCategory(category);
  const categoryProfile = CATEGORY_PROFILES[normalizedCategory];

  return categoryProfile.bbox[complexityTier] ?? categoryProfile.bbox.medium;
}

export function getCategoryComplexityHint(category: ObjectCategory | string | undefined): ComplexityTier {
  return CATEGORY_PROFILES[normalizeObjectCategory(category)].defaultComplexity;
}

export function buildAssemblyHint(
  category: ObjectCategory | string | undefined,
  complexityTier: ComplexityTier,
  objectName?: string
) {
  const specificProfile = getSpecificObjectProfile(objectName);

  if (specificProfile) {
    return specificProfile.assemblyHint;
  }

  const normalizedCategory = normalizeObjectCategory(category);
  const categoryProfile = CATEGORY_PROFILES[normalizedCategory];

  return categoryProfile.assemblyHints[complexityTier] ?? categoryProfile.assemblyHints.medium;
}

export const CATEGORY_MAP: Record<ObjectCategory, CategoryConfig> = {
  character: createCategoryConfig("humanoid"),
  humanoid: createCategoryConfig("humanoid"),
  vehicle: createCategoryConfig("vehicle"),
  device: createCategoryConfig("device"),
  container: createCategoryConfig("container"),
  accessory: createCategoryConfig("accessory"),
  footwear: createCategoryConfig("footwear"),
  apparel: createCategoryConfig("apparel"),
  furniture: createCategoryConfig("furniture"),
  book: createCategoryConfig("book"),
  food: createCategoryConfig("food"),
  plant: createCategoryConfig("plant"),
  tool: createCategoryConfig("tool"),
  organic: createCategoryConfig("organic"),
  structure: createCategoryConfig("structure"),
  surface: createCategoryConfig("surface"),
  environment: createCategoryConfig("environment"),
  particle_system: createCategoryConfig("particle_system"),
  unknown: createCategoryConfig("unknown")
};
