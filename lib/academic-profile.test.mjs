import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}${specifier === "@/lib/database" ? "/index" : ""}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

let session, user, saves;
mock.module("next-auth", { namedExports: { getServerSession: async () => session } });
mock.module(new URL("./authOptions.ts", import.meta.url).href, { namedExports: { authOptions: {} } });
mock.module(new URL("./database/index.ts", import.meta.url).href, { namedExports: { connectToDatabase: async () => {} } });
mock.module(new URL("./database/models/User.ts", import.meta.url).href, { defaultExport: {
  findById() {
    return Object.assign(Promise.resolve(user), { lean: async () => user });
  },
} });
const profile = await import("../app/api/dashboard/profile/route.ts");
const patch = (body) => profile.PATCH(new Request("http://localhost/api/dashboard/profile", {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

beforeEach(() => {
  saves = 0;
  session = { user: { id: "000000000000000000000001" } };
  user = { _id: session.user.id, name: "Test student", email: "student@example.invalid", studentId: "20260001",
    program: "TEST", department: "SCI", year: "2026", campus: "silverest", role: "student",
    async save() { saves++; },
  };
});

test("profile returns the current database campus assignment", async () => {
  const result = await profile.GET();
  assert.equal(result.status, 200);
  assert.equal((await result.json()).profile.campus, "silverest");
});

test("students can update contact details without changing academic assignment", async () => {
  const result = await patch({ name: "Updated student", phone: "" });
  assert.equal(result.status, 200);
  assert.equal(user.name, "Updated student");
  assert.equal(user.phone, "");
  assert.equal(user.program, "TEST");
  assert.equal(saves, 1);
});

test("academic and campus reassignment are rejected without saving", async () => {
  for (const body of [{ program: "OTHER" }, { department: "OTHER" }, { year: "2025" }, { campus: "massmedia" }]) {
    assert.equal((await patch(body)).status, 403);
  }
  assert.equal(saves, 0);
});

test("invalid contact details are rejected rather than ignored", async () => {
  for (const body of [null, [], { name: 7 }, { phone: {} }, { name: "" }, { phone: "1".repeat(31) }]) {
    assert.equal((await patch(body)).status, 422);
  }
  assert.equal(saves, 0);
});

test("unauthenticated profile edits are denied", async () => {
  session = null;
  assert.equal((await patch({ name: "Changed" })).status, 401);
  assert.equal(saves, 0);
});
