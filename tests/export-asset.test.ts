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

function buildScene({ title = "Jarvis AI Robot" } = {}) {
  const metadata = {
    use_case: "website",
    style: "futuristic",
    created_at: "2026-03-26T00:00:00.000Z"
  };

  if (title !== undefined) {
    metadata.title = title;
  }

  return {
    scene_id: "scene_jarvis",
    metadata,
    environment: {
      background: {
        type: "color",
        value: "#050a15"
      }
    },
    camera: {
      type: "perspective",
      position: [0, 2, 5],
      fov: 45,
      target: [0, 0, 0]
    },
    lighting: [],
    objects: [],
    animations: []
  };
}

function runExportAsset(input) {
  const payload = JSON.stringify(input);

  return runJson(`
    import { exportAssetTool } from "${DIST_ROOT}/tools/export_asset.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const result = unwrapToolPayload(await exportAssetTool.execute(${payload}));
    console.log(JSON.stringify(result));
  `);
}

test("r3f_packages_code_correctly", () => {
  const r3fCode = `import React from "react";

export default function JarvisRobot() {
  return <group><mesh /></group>;
}`;

  const result = runExportAsset({
    format: "r3f",
    r3f_code: r3fCode,
    filename: "JarvisRobot"
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.file_name, "JarvisRobot.tsx");
  assert.equal(result.mime_type, "text/plain");
  assert.equal(result.content, r3fCode);
  assert.equal(result.byte_size, r3fCode.length);
  assert.equal(result.download_ready, true);
  assert.ok(result.metadata.line_count > 0);
});

test("json_packages_scene_correctly", () => {
  const scene = buildScene();
  const result = runExportAsset({
    format: "json",
    scene_data: scene
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.file_name, "jarvis-ai-robot.json");
  assert.equal(result.mime_type, "application/json");
  assert.deepEqual(JSON.parse(result.content), scene);
});

test("r3f_missing_r3f_code_returns_error", () => {
  const result = runExportAsset({
    format: "r3f"
  });

  assert.equal(result.status, "ERROR");
  assert.match(result.error, /generate_r3f_code/i);
  assert.ok(result.hint);
});

test("json_missing_scene_data_returns_error", () => {
  const result = runExportAsset({
    format: "json"
  });

  assert.equal(result.status, "ERROR");
  assert.match(result.error, /scene_data/i);
});

test("legacy_synthesized_components_rejected", () => {
  const r3fCode = `import React from "react";

export default function JarvisRobot() {
  return <group><mesh /></group>;
}`;

  const result = runExportAsset({
    format: "r3f",
    r3f_code: r3fCode,
    synthesized_components: {
      "obj-1": "<mesh />"
    }
  });

  assert.equal(result.status, "ERROR");
  assert.match(result.error, /generate_r3f_code/i);
  assert.match(result.hint, /generate_r3f_code/);
});

test("filename_derived_from_scene_title", () => {
  const result = runExportAsset({
    format: "json",
    scene_data: buildScene({ title: "Jarvis AI Robot" })
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.file_name, "jarvis-ai-robot.json");
});

test("filename_fallback_when_no_title", () => {
  const r3fCode = `import React from "react";

export default function Scene() {
  return <group><mesh /></group>;
}`;

  const result = runExportAsset({
    format: "r3f",
    r3f_code: r3fCode,
    scene_data: {
      scene_id: "scene_untitled",
      metadata: {}
    }
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.file_name, "scene.tsx");
});

test("r3f_too_short_returns_error", () => {
  const result = runExportAsset({
    format: "r3f",
    r3f_code: "hi"
  });

  assert.equal(result.status, "ERROR");
  assert.match(result.error, /too short/i);
});

test("toKebabCase utility correctness", () => {
  const result = runJson(`
    import { toKebabCase } from "${DIST_ROOT}/utils/export.utils.js";

    console.log(JSON.stringify({
      jarvis: toKebabCase("Jarvis AI Robot"),
      scene: toKebabCase("my_scene_01"),
      hello: toKebabCase("  Hello World  "),
      kebab: toKebabCase("already-kebab"),
      special: toKebabCase("Special!@#Chars"),
      empty: toKebabCase("")
    }));
  `);

  assert.equal(result.jarvis, "jarvis-ai-robot");
  assert.equal(result.scene, "my-scene-01");
  assert.equal(result.hello, "hello-world");
  assert.equal(result.kebab, "already-kebab");
  assert.equal(result.special, "specialchars");
  assert.equal(result.empty, "scene");
});
