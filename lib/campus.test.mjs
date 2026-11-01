import assert from "node:assert/strict";
import { test } from "node:test";
import { campusPlaces, filterCampusPlaces } from "./campus.ts";

test("normalizes admin rooms without inventing map locations or identifiers", () => {
  const places = campusPlaces([
    { _id: "room-1", name: "Lecture 1", code: "L1", building: "Main", latitude: -15.4, longitude: 28.3, capacity: 100 },
    { id: "room-2", name: "Library", location: { coordinates: [28.4, -15.5] }, isAvailable: false },
    { id: "room-3", name: "Office" },
    { name: "No identifier" },
    { id: "room-4", latitude: 200, longitude: 28.3 },
    { id: "room-5", latitude: NaN, longitude: Infinity },
  ]);
  assert.equal(places.length, 5);
  assert.equal(places[0].lat, -15.4);
  assert.equal(places[1].lng, 28.4);
  assert.equal(places[1].isAvailable, false);
  for (const index of [2, 3, 4]) {
    assert.equal(places[index].lat, null);
    assert.equal(places[index].lng, null);
  }
});

test("searches room names, codes, buildings and categories with combined filters", () => {
  const places = campusPlaces([
    { id: "one", name: "Lecture 1", code: "LT01", building: "Silver", category: "lecture_hall" },
    { id: "two", name: "Library", code: "LIB", building: "Main", category: "library" },
  ]);
  assert.deepEqual(filterCampusPlaces(places, " lt01 ", "all").map((place) => place.id), ["one"]);
  assert.deepEqual(filterCampusPlaces(places, "MAIN", "library").map((place) => place.id), ["two"]);
  assert.deepEqual(filterCampusPlaces(places, "library", "lecture_hall"), []);
  assert.equal(filterCampusPlaces(places, "", "all").length, 2);
  assert.equal(filterCampusPlaces(places, "not a place", "all").length, 0);
});
