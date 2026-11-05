import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

let session, calls, response, failure;
mock.module("next-auth", { namedExports: { getServerSession: async () => session } });
mock.module(new URL("./authOptions.ts", import.meta.url).href, { namedExports: { authOptions: {} } });
class PortalError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
mock.module(new URL("./portal.ts", import.meta.url).href, { namedExports: {
  PortalError,
  portalRequest: async (...args) => { calls.push(args); if (failure) throw failure; return response; },
} });
const assessments = await import("../app/api/assessments/route.ts");
const programmes = await import("../app/api/programmes/route.ts");
const post = (body) => assessments.POST(new Request("http://localhost/api/assessments", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));
const assessmentId = "000000000000000000000001";

beforeEach(() => {
  session = { user: { studentId: "20260001" } };
  calls = [];
  response = Response.json({ assessments: [], serverTime: new Date().toISOString() });
  failure = null;
});

test("assessments require a signed-in student without contacting the portal", async () => {
  session = null;
  assert.equal((await assessments.GET(new Request("http://localhost/api/assessments"))).status, 401);
  assert.equal((await post({ action: "start", assessmentId })).status, 401);
  assert.equal(calls.length, 0);
});

test("assessment actions use session identity and forbid browser identity overrides", async () => {
  assert.equal((await post({ action: "start", assessmentId })).status, 200);
  assert.deepEqual(calls[0], ["assessments", { method: "POST", body: { action: "start", assessmentId, studentId: "20260001" } }]);
  assert.equal((await post({ action: "start", assessmentId, studentId: "other-student" })).status, 422);
  assert.equal(calls.length, 1);
});

test("invalid answers never reach the assessment service", async () => {
  for (const body of [
    { action: "answer", assessmentId, question: -1, option: 0 },
    { action: "answer", assessmentId, question: 0, option: 6 },
    { action: "submit", assessmentId: "invalid" },
  ]) assert.equal((await post(body)).status, 422);
  assert.equal(calls.length, 0);
});

test("assessment listing preserves central status and disables caching", async () => {
  response = Response.json({ error: "Inactive student." }, { status: 403 });
  const result = await assessments.GET(new Request("http://localhost/api/assessments"));
  assert.equal(result.status, 403);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(calls[0], ["assessments", { query: { studentId: "20260001" } }]);
});

test("programme catalogue is public, uncached, and preserves central failures", async () => {
  session = null;
  response = Response.json({ programmes: [] });
  const result = await programmes.GET();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), { programmes: [] });
  response = Response.json({ error: "Catalogue unavailable." }, { status: 503 });
  assert.equal((await programmes.GET()).status, 503);
});

test("unconfigured catalogue returns an explicit service error", async () => {
  failure = new PortalError("Central admin integration is not configured.", 503);
  const result = await programmes.GET();
  assert.equal(result.status, 503);
  assert.match((await result.json()).error, /not configured/);
});
