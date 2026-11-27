import { test } from "node:test";
import assert from "node:assert/strict";
import { supports, reassignSlots, aggregateStatus, musicApplies } from "./rules.ts";

test("reel needs one video", () => {
  assert.equal(supports("tiktok", "reel", ["video/mp4"]).ok, true);
  assert.equal(supports("tiktok", "reel", ["image/jpeg"]).ok, false);
});
test("carousel rules per platform", () => {
  const mixed = ["image/jpeg", "video/mp4"];
  assert.equal(supports("instagram", "carousel", mixed).ok, true);
  assert.equal(supports("facebook", "carousel", mixed).ok, false);
  assert.equal(supports("tiktok", "carousel", ["image/png", "image/png"]).ok, true);
  assert.equal(supports("youtube", "carousel", ["image/png", "image/png"]).ok, false);
  assert.equal(supports("instagram", "carousel", ["image/png"]).ok, false);
});
test("music only on instagram carousels", () => {
  assert.equal(musicApplies("instagram", "carousel"), true);
  assert.equal(musicApplies("instagram", "reel"), false);
  assert.equal(musicApplies("tiktok", "carousel"), false);
});
test("reorder keeps slots, permutes posts", () => {
  const r = reassignSlots([{ id: "b", at: 200 }, { id: "a", at: 100 }]);
  assert.deepEqual(r, [{ id: "b", at: 100 }, { id: "a", at: 200 }]);
});
test("aggregate status", () => {
  assert.equal(aggregateStatus([{ enabled: true, status: "published" }, { enabled: true, status: "skipped" }], true), "published");
  assert.equal(aggregateStatus([{ enabled: true, status: "published" }, { enabled: true, status: "failed" }], true), "partial");
  assert.equal(aggregateStatus([{ enabled: true, status: "scheduled" }], false), "draft");
});
