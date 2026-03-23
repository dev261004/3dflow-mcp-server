import { existsSync } from "node:fs";
import path from "node:path";

const assetLibrary = {
  perfume: "perfume_bottle.glb",
  shoe: "shoe.glb",
  phone: "smartphone.glb",
  chair: "chair.glb"
};

const MODEL_DIRECTORY_CANDIDATES = [
  "public/models",
  "models",
  "assets/models",
  "static/models"
];

export function getAssetForObject(name: string): string | null {
  const key = name.toLowerCase();

  for (const asset in assetLibrary) {
    if (key.includes(asset)) {
      return assetLibrary[asset as keyof typeof assetLibrary];
    }
  }

  return null;
}

export function isAssetConfirmed(asset: string): boolean {
  return MODEL_DIRECTORY_CANDIDATES.some((directory) => {
    return existsSync(path.join(process.cwd(), directory, asset));
  });
}

export function resolveAssetForObject(name: string) {
  const asset = getAssetForObject(name);

  return {
    asset,
    confirmed: asset ? isAssetConfirmed(asset) : false
  };
}
