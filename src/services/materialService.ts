import { Material } from "../types/scene.js";
import { LightingPresetToken, MaterialPresetToken, ThemeToken } from "../types/designTokens.js";

export type MaterialStyleToken =
  | "glassmorphism"
  | "matte_dark"
  | "neon"
  | "clay"
  | "chrome"
  | "frosted";

interface MaterialPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  dark: string;
}

const THEME_PALETTES: Record<ThemeToken, MaterialPalette> = {
  minimal: {
    primary: "#f3efe8",
    secondary: "#dfd4c3",
    accent: "#8ca4ff",
    neutral: "#ffffff",
    dark: "#20232b"
  },
  premium: {
    primary: "#d9c1a3",
    secondary: "#f2e6d6",
    accent: "#c6924c",
    neutral: "#fdf8f1",
    dark: "#221a14"
  },
  futuristic: {
    primary: "#b7d1ff",
    secondary: "#e4f1ff",
    accent: "#49d7ff",
    neutral: "#e8fbff",
    dark: "#0b1120"
  },
  playful: {
    primary: "#ffb380",
    secondary: "#ffe08a",
    accent: "#ff5cc8",
    neutral: "#fff6f2",
    dark: "#2a2134"
  },
  dark: {
    primary: "#2f3440",
    secondary: "#454d60",
    accent: "#7c86ff",
    neutral: "#d8def0",
    dark: "#0d0d14"
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function mixColors(base: string, target: string, amount: number) {
  const left = hexToRgb(base);
  const right = hexToRgb(target);
  const ratio = clamp(amount, 0, 1);

  return rgbToHex(
    left.r + (right.r - left.r) * ratio,
    left.g + (right.g - left.g) * ratio,
    left.b + (right.b - left.b) * ratio
  );
}

function normalizeStyleToken(value: string) {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function getVariantMix(objectIndex: number) {
  if (objectIndex <= 0) {
    return 0;
  }

  return clamp(0.18 * objectIndex, 0.18, 0.42);
}

function getAccentColor(theme: ThemeToken, lightingPreset: LightingPresetToken) {
  if (lightingPreset === "neon_edge") {
    return "#00e5ff";
  }

  return THEME_PALETTES[theme].accent;
}

function isAccentObject(name: string) {
  return /(orb|ring|glow|halo)/i.test(name);
}

function getGlassBaseColor(theme: ThemeToken, lightingPreset: LightingPresetToken, objectIndex: number) {
  const palette = THEME_PALETTES[theme];

  if (lightingPreset === "neon_edge") {
    const glassPrimary = theme === "premium" ? "#d9e8ff" : "#cde6ff";
    const glassSupport = theme === "premium" ? "#eef6ff" : "#f3fbff";

    return objectIndex === 0 ? glassPrimary : mixColors(glassSupport, "#ffffff", getVariantMix(objectIndex) * 0.45);
  }

  if (theme === "premium") {
    return objectIndex === 0 ? "#edf3ff" : mixColors("#edf3ff", "#ffffff", getVariantMix(objectIndex) * 0.5);
  }

  return objectIndex === 0 ? palette.secondary : mixColors(palette.secondary, palette.neutral, getVariantMix(objectIndex) + 0.12);
}

export function resolveMaterialStyleToken(
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  rawStyle?: string
): MaterialStyleToken {
  const normalizedStyle = typeof rawStyle === "string" ? normalizeStyleToken(rawStyle) : "";

  switch (materialPreset) {
    case "glass_frost":
      return "glassmorphism";
    case "glass_clear":
      return "frosted";
    case "metal_chrome":
      return "chrome";
    case "metal_brushed":
      if (["matte_dark", "dark_matte"].includes(normalizedStyle)) {
        return "matte_dark";
      }

      return theme === "dark" ? "matte_dark" : "chrome";
    case "plastic_gloss":
      if (["neon", "glow", "glowing", "futuristic"].includes(normalizedStyle)) {
        return "neon";
      }

      return theme === "futuristic" ? "neon" : "clay";
    case "matte_soft":
    default:
      if (["glassmorphism", "glass", "glass_frost"].includes(normalizedStyle)) {
        return "glassmorphism";
      }

      if (["frosted", "frosted_glass"].includes(normalizedStyle)) {
        return "frosted";
      }

      if (["chrome", "metal", "metallic", "premium"].includes(normalizedStyle)) {
        return "chrome";
      }

      if (["matte_dark", "dark_matte"].includes(normalizedStyle)) {
        return "matte_dark";
      }

      if (["neon", "glow", "glowing", "futuristic"].includes(normalizedStyle)) {
        return "neon";
      }

      if (["clay", "matte", "minimal"].includes(normalizedStyle)) {
        return "clay";
      }

      switch (theme) {
        case "dark":
          return "matte_dark";
        case "futuristic":
          return "neon";
        case "premium":
          return "chrome";
        case "minimal":
        case "playful":
        default:
          return "clay";
      }
  }
}

export function getMaterial(
  theme: ThemeToken,
  materialPreset: MaterialPresetToken,
  lightingPreset: LightingPresetToken,
  name = "",
  objectIndex = 0,
  rawStyle?: string
): Material {
  const normalizedName = name.toLowerCase();
  const palette = THEME_PALETTES[theme];
  const accentColor = getAccentColor(theme, lightingPreset);
  const materialStyle = normalizedName.includes("ice")
    ? "frosted"
    : resolveMaterialStyleToken(theme, materialPreset, rawStyle);
  const supportMix = getVariantMix(objectIndex);
  const mainColor = objectIndex === 0;
  const accentObject = isAccentObject(name) && lightingPreset === "neon_edge";

  switch (materialStyle) {
    case "glassmorphism":
      return {
        type: "glass",
        color: getGlassBaseColor(theme, lightingPreset, objectIndex),
        metalness: mainColor ? 0.08 : 0.03,
        roughness: mainColor ? 0.06 : 0.14,
        transmission: mainColor ? 0.88 : 0.74,
        emissive: accentObject ? accentColor : undefined,
        emissiveIntensity: accentObject ? (mainColor ? 0.3 : 0.5) : undefined
      };

    case "matte_dark":
      return {
        type: "matte",
        color: mainColor ? "#0d0d14" : mixColors("#0d0d14", palette.secondary, supportMix),
        metalness: mainColor ? 0.6 : 0.36,
        roughness: mainColor ? 0.15 : 0.28
      };

    case "neon":
      return {
        type: "standard",
        color: mainColor ? mixColors(palette.dark, palette.secondary, 0.22) : mixColors(palette.secondary, palette.neutral, supportMix + 0.08),
        metalness: mainColor ? 0.2 : 0.1,
        roughness: mainColor ? 0.08 : 0.18,
        emissive: accentColor,
        emissiveIntensity: mainColor ? 1.2 : 0.7
      };

    case "chrome":
      return {
        type: "metal",
        color: mainColor ? "#f6f7fb" : mixColors("#f6f7fb", palette.secondary, supportMix),
        metalness: 1,
        roughness: mainColor ? 0.05 : 0.12,
        envMapIntensity: mainColor ? 1.5 : 1
      };

    case "frosted":
      return {
        type: "glass",
        color: mainColor ? "#f8fbff" : mixColors("#f8fbff", palette.secondary, supportMix * 0.5),
        metalness: 0.03,
        roughness: mainColor ? 0.18 : 0.28,
        transmission: mainColor ? 0.68 : 0.56,
        emissive: accentObject ? accentColor : undefined,
        emissiveIntensity: accentObject ? 0.35 : undefined
      };

    case "clay":
    default:
      return {
        type: "matte",
        color: mainColor ? palette.primary : mixColors(palette.primary, palette.neutral, supportMix),
        metalness: 0,
        roughness: 0.9,
        flatShading: true
      };
  }
}
