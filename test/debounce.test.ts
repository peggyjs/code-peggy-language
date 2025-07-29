import * as assert from "node:assert";
import { debouncePromise } from "../common/debounce.js";

let count = 0;
async function counter(): Promise<number> {
  return count++;
}

suite("debounce", () => {
  test("debouncePromise", async () => {
    const c = debouncePromise(counter, 50);
    const p = [c(), c(), c()];
    assert.equal(p[0], p[1]);
    assert.equal(p[1], p[2]);
    const res = await Promise.all(p);
    assert.deepEqual(res, [0, 0, 0]);
    assert.equal(await c(), 1);
  });
});
