export function createScenePlan(prompt: string, context: any) {
  return {
    objects: ["product", "platform"],
    environment: "minimal",
    lighting: "soft",
    camera: "orbit",
    animation: context.animation || "none"
  };
}