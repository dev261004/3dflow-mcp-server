import type { ThemeToken } from "../types/designTokens.js";
import { buildAnimations } from "./animationEngine.js";
import { getMaterial } from "./materialService.js";

function getSceneTheme(scene: any): ThemeToken {
  const tokenTheme = scene?.metadata?.design_tokens?.theme;

  if (tokenTheme === "premium" || tokenTheme === "minimal" || tokenTheme === "futuristic" || tokenTheme === "playful" || tokenTheme === "dark") {
    return tokenTheme;
  }

  if (scene?.metadata?.style === "dark") {
    return "dark";
  }

  return "minimal";
}

export function editScene(scene: any, prompt: string) {
  const lower = prompt.toLowerCase();

  // 🧠 CLONE (avoid mutation issues)
  const updated = JSON.parse(JSON.stringify(scene));
  const theme = getSceneTheme(updated);

  // 🎨 BACKGROUND / STYLE
  if (lower.includes("dark")) {
    updated.environment.background.value = "#0a0a0a";
    updated.metadata.style = "dark";
  }

  if (lower.includes("light")) {
    updated.environment.background.value = "#ffffff";
    updated.metadata.style = "minimal";
  }

  // 💎 MATERIAL CHANGES
  if (lower.includes("metal")) {
    updated.objects.forEach((obj: any, index: number) => {
      obj.material = getMaterial(theme, "metal_chrome", obj.name || "", index, "chrome");
    });
  }

  if (lower.includes("glass")) {
    updated.objects.forEach((obj: any, index: number) => {
      obj.material = getMaterial(theme, "glass_frost", obj.name || "", index, "glassmorphism");
    });
  }

  if (lower.includes("clay")) {
    updated.objects.forEach((obj: any, index: number) => {
      obj.material = getMaterial(theme, "matte_soft", obj.name || "", index, "clay");
    });
  }

  if (lower.includes("neon")) {
    updated.objects.forEach((obj: any, index: number) => {
      obj.material = getMaterial("futuristic", "plastic_gloss", obj.name || "", index, "neon");
    });
  }

  // 🎞️ ANIMATION
  if (lower.includes("rotate")) {
    updated.animations = buildAnimations(updated.objects, "rotate");
  }

  if (lower.includes("float")) {
    updated.animations = buildAnimations(updated.objects, "float");
  }

  if (lower.includes("pulse")) {
    updated.animations = buildAnimations(updated.objects, "pulse");
  }

  if (lower.includes("bounce")) {
    updated.animations = buildAnimations(updated.objects, "bounce");
  }

  // 📍 POSITION CHANGES
  if (lower.includes("move up")) {
    updated.objects[0].position[1] += 1;
  }

  if (lower.includes("move down")) {
    updated.objects[0].position[1] -= 1;
  }

  if (lower.includes("left")) {
    updated.objects[0].position[0] -= 1;
  }

  if (lower.includes("right")) {
    updated.objects[0].position[0] += 1;
  }

  return updated;
}
