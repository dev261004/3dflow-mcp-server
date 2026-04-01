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

test("generate_scene returns structured error payload with partial data", () => {
  const result = runJson(`
    import { generateSceneTool } from "${DIST_ROOT}/tools/generateScene.tool.js";
    import { unwrapToolPayload } from "${DIST_ROOT}/utils/toolPayload.js";

    const payload = unwrapToolPayload(await generateSceneTool.execute({
      scene_plan: {
        objects: [],
        style: "minimal",
        use_case: "website"
      }
    }));

    console.log(JSON.stringify(payload));
  `);

  assert.equal(result.status, "ERROR");
  assert.equal(result.error_code, "INTERNAL_ERROR");
  assert.match(result.error_message, /at least one object/i);
  assert.deepEqual(result.partial_data.scene_plan, {
    objects: [],
    style: "minimal",
    use_case: "website"
  });
  assert.deepEqual(result.partial_data.objects, []);
});
