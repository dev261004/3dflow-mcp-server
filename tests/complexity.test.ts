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

test("resolveDefaultComplexity covers the expected mapping combinations", () => {
  const result = runJson(`
    import { resolveDefaultComplexity } from "${DIST_ROOT}/lib/complexity.profiles.js";

    console.log(JSON.stringify({
      advertisement_hero: resolveDefaultComplexity("advertisement", "hero_centered"),
      advertisement_product: resolveDefaultComplexity("advertisement", "product_closeup"),
      website_hero: resolveDefaultComplexity("website", "hero_centered"),
      website_floating: resolveDefaultComplexity("website", "floating_showcase"),
      showcase_hero: resolveDefaultComplexity("showcase", "hero_centered"),
      showcase_floating: resolveDefaultComplexity("showcase", "floating_showcase"),
      mobile_override: resolveDefaultComplexity("website", "hero_centered", "mobile"),
      fallback: resolveDefaultComplexity()
    }));
  `);

  assert.deepEqual(result, {
    advertisement_hero: "high",
    advertisement_product: "medium",
    website_hero: "high",
    website_floating: "medium",
    showcase_hero: "high",
    showcase_floating: "high",
    mobile_override: "low",
    fallback: "medium"
  });
});

test("complexity profiles shape the synthesis contract as expected", () => {
  const result = runJson(`
    import { buildSynthesisContract } from "${DIST_ROOT}/lib/synthesisContract.js";

    const low = buildSynthesisContract({
      objectId: "robot_low",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF",
      complexity: "low"
    });

    const high = buildSynthesisContract({
      objectId: "robot_high",
      objectName: "robot",
      style: "futuristic",
      materialPreset: "metal_chrome",
      baseColor: "#f6f7fb",
      accentColor: "#00F5FF",
      complexity: "high"
    });

    console.log(JSON.stringify({
      low: {
        min_parts: low.min_parts,
        max_parts: low.max_parts,
        geometryOnly: low.constraints.geometryOnly,
        assemblyHint: low.constraints.assemblyHint
      },
      high: {
        min_parts: high.min_parts,
        max_parts: high.max_parts,
        geometryOnly: high.constraints.geometryOnly,
        assemblyHint: high.constraints.assemblyHint
      }
    }));
  `);

  assert.equal(result.low.min_parts, 4);
  assert.equal(result.low.max_parts, 7);
  assert.equal(result.high.min_parts, 28);
  assert.equal(result.high.max_parts, null);
  assert.doesNotMatch(result.low.geometryOnly, /CapsuleGeometry/);
  assert.match(result.high.geometryOnly, /RingGeometry/);
  assert.doesNotMatch(result.low.assemblyHint, /knee joint/i);
  assert.match(result.high.assemblyHint, /knee joint/i);
});

test('synthesize_geometry resolves target "mobile" to low complexity when complexity is omitted', () => {
  const result = runJson(`
    import { synthesizeGeometryTool } from "${DIST_ROOT}/tools/synthesizeGeometry.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const input = synthesizeGeometryTool.parameters.parse({
      object_name: "robot",
      style: "futuristic",
      material_preset: "metal_chrome",
      base_color: "#f6f7fb",
      accent_color: "#00F5FF",
      object_id: "robot_mobile",
      target: "mobile"
    });
    const payload = unwrapToolPayload(await synthesizeGeometryTool.execute(input));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.synthesis_contract.complexity_tier, "low");
  assert.equal(result.synthesis_contract.min_parts, 4);
});

test('synthesize_geometry defaults omitted complexity to "medium" for non-mobile targets', () => {
  const result = runJson(`
    import { synthesizeGeometryTool } from "${DIST_ROOT}/tools/synthesizeGeometry.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const input = synthesizeGeometryTool.parameters.parse({
      object_name: "robot",
      style: "futuristic",
      material_preset: "metal_chrome",
      base_color: "#f6f7fb",
      accent_color: "#00F5FF",
      object_id: "robot_default"
    });
    const payload = unwrapToolPayload(await synthesizeGeometryTool.execute(input));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.synthesis_contract.complexity_tier, "medium");
  assert.equal(result.synthesis_contract.min_parts, 10);
});
