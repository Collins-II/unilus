import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";
import mongoose from "mongoose";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}${specifier === "@/lib/database" ? "/index" : ""}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

let programme, department, existing, saved, locks;
mock.module(new URL("./database/index.ts", import.meta.url).href, { namedExports: { connectToDatabase: async () => {} } });
mock.module(new URL("./rate-limit.ts", import.meta.url).href, { namedExports: {
  rateLimit() {}, clientIp() { return "test"; }, RateLimitError: class RateLimitError extends Error {},
} });
mock.module("bcryptjs", { defaultExport: { hash: async () => "test-password-hash" } });
mock.module(new URL("./database/models/Programme.ts", import.meta.url).href, { defaultExport: {
  findOne(filter) {
    assert.deepEqual(filter, { code: "TEST-PROGRAMME" });
    return { session() { return this; }, async lean() { return programme; } };
  },
} });
mock.module(new URL("./database/models/User.ts", import.meta.url).href, { defaultExport: {
  exists: async () => existing,
  create: async (records) => { saved = records[0]; return [{ _id: "test-student", ...saved }]; },
} });
const registration = await import("../app/api/register/route.ts");
const register = (overrides = {}) => registration.POST(new Request("http://localhost/api/register", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test student", studentId: "20260001", email: "student@example.invalid",
    password: "Test-password", program: "test-programme", year: "2026", ...overrides }),
}));

beforeEach(() => {
  existing = false; saved = null; locks = 0;
  programme = { code: "TEST-PROGRAMME", department: "test-department", campus: "leopards-hill" };
  department = { code: "TEST-DEPT" };
  mock.method(mongoose.connection, "collection", (name) => {
    if (name === "campusschedulelocks") return { async updateOne() { locks++; } };
    assert.equal(name, "departments");
    return { async findOne() { return department; } };
  });
  mock.method(mongoose.connection, "transaction", async (callback) => callback({}));
});
afterEach(() => mock.restoreAll());

test("registration derives campus and department from the locked programme catalogue", async () => {
  const result = await register({ campus: "silverest", department: "BROWSER", role: "admin" });
  assert.equal(result.status, 201);
  assert.equal(saved.department, "TEST-DEPT");
  assert.equal(saved.campus, "leopards-hill");
  assert.equal(saved.program, "TEST-PROGRAMME");
  assert.equal(saved.role, "student");
  assert.equal(locks, 2);
  const body = await result.json();
  assert.equal(body.user.campus, "leopards-hill");
  assert.equal(body.user.password, undefined);
});

test("unknown programme or missing department prevents account creation", async () => {
  programme = null;
  assert.equal((await register()).status, 422);
  assert.equal(saved, null);
  programme = { code: "TEST-PROGRAMME", department: "missing", campus: "silverest" };
  department = null;
  assert.equal((await register()).status, 422);
  assert.equal(saved, null);
});

test("duplicate registration does not start a scheduling transaction", async () => {
  existing = true;
  assert.equal((await register()).status, 409);
  assert.equal(saved, null);
  assert.equal(locks, 0);
});
