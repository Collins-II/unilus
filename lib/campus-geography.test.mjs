import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { campuses, campusIds, campusFor, campusName } from "./campus-geography.ts";

test("all three UNILUS campus centres are in their respective navigation scopes", () => {
  assert.deepEqual(campusIds, ["silverest", "massmedia", "leopards-hill"]);
  for (const campus of campuses) {
    assert.equal(campusFor({ latitude: campus.centre[0], longitude: campus.centre[1] })?.id, campus.id);
    assert.equal(campusName(campus.id), campus.name);
  }
});

test("UNZA campuses, city centre and invalid coordinates are not UNILUS locations", () => {
  for (const [latitude, longitude] of [[-15.3948733, 28.3315259], [-15.4280748, 28.3096636], [-15.4167, 28.2833], [NaN, 28.33], [-15.4, Infinity]]) {
    assert.equal(campusFor({ latitude, longitude }), undefined);
  }
});

test("Massmedia has an explicit approximate viewing area and no invented polygon", () => {
  const campus = campuses.find((campus) => campus.id === "massmedia");
  assert.equal(campus.scopeKind, "approximate");
  assert.deepEqual(campus.polygon, []);
  assert.match(campus.address, /Alick Nkhata Road/);
  assert.equal(campusFor({ latitude: -15.404, longitude: campus.centre[1] }), undefined);
});

test("community outline vertices are accepted and lie within map bounds", () => {
  for (const campus of campuses.filter((campus) => campus.scopeKind === "outline")) {
    assert.ok(campus.polygon.length > 3);
    for (const [longitude, latitude] of campus.polygon) {
      assert.equal(campusFor({ latitude, longitude })?.id, campus.id);
      assert.ok(latitude >= campus.bounds[0][0] && latitude <= campus.bounds[1][0]);
      assert.ok(longitude >= campus.bounds[0][1] && longitude <= campus.bounds[1][1]);
    }
  }
});

const portalGeography = new URL("../../unilus-portal/lib/campus/geography.ts", import.meta.url);
test("student and administration apps use identical campus geography", { skip: !existsSync(portalGeography) }, () => {
  const student = readFileSync(new URL("./campus-geography.ts", import.meta.url), "utf8");
  const portal = readFileSync(portalGeography, "utf8");
  assert.equal(student, portal);
});
