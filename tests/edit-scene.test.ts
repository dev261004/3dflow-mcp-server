/** @jest-environment node */
// @ts-nocheck

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const DIST_ROOT = process.env.TEST_DIST_ROOT ?? "./dist";

function runJson(script) {
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  return JSON.parse(output.trim());
}

function buildEditableScene() {
  return {
    scene_id: "scene_edit_mock",
    metadata: {
      title: "Editable Scene",
      use_case: "advertisement",
      style: "premium",
      design_tokens: {
        use_case: "advertisement",
        theme: "premium",
        material_preset: "metal_chrome",
        animation: "none",
        lighting_preset: "studio_dramatic",
        background_preset: "dark_studio",
        composition: "hero_centered"
      },
      created_at: "2026-04-01T00:00:00.000Z"
    },
    environment: {
      background: {
        type: "color",
        value: "#090910"
      }
    },
    camera: {
      type: "perspective",
      position: [0, 2, 5],
      fov: 45,
      target: [0, 0, 0]
    },
    lighting: [
      {
        id: "ambient_1",
        type: "ambient",
        intensity: 0.4,
        color: "#ffffff"
      },
      {
        id: "spot_1",
        type: "spot",
        intensity: 1,
        color: "#ffffff",
        position: [1, 3, 2]
      }
    ],
    objects: [
      {
        id: "obj-a",
        type: "primitive",
        name: "sneaker",
        shape: "box",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          type: "metal",
          color: "#f6f7fb"
        }
      },
      {
        id: "obj-b",
        type: "primitive",
        name: "wallet",
        shape: "box",
        position: [1, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          type: "standard",
          color: "#c6924c"
        }
      }
    ],
    animations: []
  };
}

function runEditScene(scene, editPrompt) {
  const payload = JSON.stringify({ scene_data: scene, edit_prompt: editPrompt });

  return runJson(`
    import { editSceneTool } from "${DIST_ROOT}/tools/editScene.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const result = unwrapToolPayload(await editSceneTool.execute(${payload}));
    console.log(JSON.stringify(result));
  `);
}

test("edit_scene applies rotate animation to the named wallet instead of the primary object", () => {
  const result = runEditScene(
    buildEditableScene(),
    "add rotate animation to the wallet"
  );

  const rotateAnimations = result.scene_data.animations.filter((entry) => entry.type === "rotate");

  assert.ok(rotateAnimations.some((entry) => entry.target_id === "obj-b"));
  assert.ok(!rotateAnimations.some((entry) => entry.target_id === "obj-a"));
  assert.ok(result.edit_summary.applied.some((entry) => entry.includes("wallet")));
});

test("edit_scene falls back to the primary object when no animation target is named", () => {
  const result = runEditScene(
    buildEditableScene(),
    "add float animation"
  );

  const floatAnimations = result.scene_data.animations.filter((entry) => entry.type === "float");

  assert.ok(floatAnimations.some((entry) => entry.target_id === "obj-a"));
});

test("edit_scene background intent is never silently dropped", () => {
  const scene = buildEditableScene();
  const result = runEditScene(
    scene,
    "make the background warmer dark"
  );

  const mentionsBackground = [
    ...result.edit_summary.applied,
    ...result.edit_summary.skipped
  ].some((entry) => /background/i.test(entry));

  assert.ok(mentionsBackground);

  if (result.edit_summary.applied.some((entry) => /background/i.test(entry))) {
    assert.notEqual(result.scene_data.environment.background.value, "#090910");
  } else {
    assert.ok(result.edit_summary.skipped[0].toLowerCase().includes("background"));
  }
});

test("edit_scene preserves working material edits", () => {
  const result = runEditScene(
    buildEditableScene(),
    "make the material glass"
  );

  assert.ok(result.edit_summary.applied.length > 0);
  assert.equal(result.edit_summary.skipped.length, 0);
});

test("edit_scene reports totally unrecognised prompts in skipped", () => {
  const result = runEditScene(
    buildEditableScene(),
    "xyzzy frobnicate the purple"
  );

  assert.ok(result.edit_summary.skipped.length > 0);
  assert.match(result.edit_summary.skipped[0], /edit not recognised/i);
});
