
import assert from "assert";
import fc from "fast-check";
import { applyPatch, compare } from "fast-json-patch";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";

import {patch} from "../src/main";


function test(doc: any, patches: Operation[]) {
  // See what fast-json-patch has to say
  let desired: PatchResult<any>
  try {
    desired = { tag: "success", value: applyPatch(cloneDeep(doc), patches).newDocument };
  } catch (err: any) {
    desired = { tag: "error", msg: err.toString() };
  }

  const rhs = desired.tag === "success" ? JSON.stringify(desired.value) : "ERROR";
  const title = `${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${rhs}`;
  it(title, () => {
    const ourResult = patch(doc, patches);
    if (ourResult.tag === "success" && desired.tag === "success") {
      if (!isEqual(ourResult.value, desired.value)) {
        assert.fail(`Our result was ${JSON.stringify(ourResult.value)}`);
      }
    } else if (ourResult.tag === "error" && desired.tag === "error") {

    } else if (ourResult.tag === "success" && desired.tag === "error") {
      assert.fail("Our result succeeded but the reference implementation errored.");
    } else if (ourResult.tag === "error" && desired.tag === "success") {
      assert.fail("Our result errored but the reference implementation succeeded: " + ourResult.msg);
    }
  });
}

describe("Root operations", () => {
  test({foo: "bar"}, [{op: "add", path: "", value: 42}]);
  test({foo: "bar"}, [{op: "replace", path: "", value: 42}]);
  test({foo: "bar"}, [{op: "remove", path: ""}]);
  test({foo: "bar"}, [{op: "move", path: "", from: "/foo"}]);
  test({foo: "bar"}, [{op: "copy", path: "", from: "/foo"}]);
  test({foo: "bar"}, [{op: "test", path: "", value: 42}]);
  test({foo: "bar"}, [{op: "test", path: "", value: {foo: "bar"}}]);
  test([1, 2, 3], [{op: "remove", path: "-"}]); // remove last elem with dash
});

describe("Add", () => {
  test({foo: "bar"}, [{op: "add", path: "/baz", value: "qux"}]); // RFC A.1
  test({foo: "bar"}, [{op: "add", path: "/foo", value: "qux"}]); // Replacing a value with add
  test({foo: "bar", baz: {}}, [{op: "add", path: "/baz/baz2", value: "qux"}]);
  test([], [{op: "add", path: "/0", value: "qux"}]);
  test({foo: ["bar", "baz"]}, [{op: "add", path: "/foo/1", value: "qux"}]); // RFC A.2
  test({foo: "bar"}, [{op: "add", path: "/child", value: {grandchild: {}}}]); // RFC A.10
  test({foo: ["bar"]}, [{op: "add", path: "/foo/-", value: ["abc", "def"]}]); // RFC A.16
  test({foo: "bar"}, [{op: "add", path: "/baz", value: "qux", xyz: 123} as Operation]); // RFC A.11
  test({foo: "bar"}, [{op: "add", path: "/a/b", value: "qux"}]); // add with nonsensical target
  test({foo: "bar"}, [{op: "add", path: "/123", value: "qux"}]); // numeric key
});

describe("Remove", () => {
  test({baz: "qux", foo: "bar"}, [{op: "remove", path: "/baz"}]); // RFC A.3
  test({foo: ["bar", "qux", "baz"]}, [{op: "remove", path: "/foo/1"}]); // RFC A.4
  test({foo: [1, 2, 3]}, [{op: "remove", path: "/foo/-"}]); // dash key
  test({"123": "bar"}, [{op: "remove", path: "/123"}]); // numeric key
  test({"foo": [1, 2, 3]}, [{op: "remove", path: "/foo/-"}]); // remove last elem with dash
});

describe("Replace", () => {
  test({baz: "qux", foo: "bar"}, [{op: "replace", path: "/baz", value: "boo"}]); // RFC A.5
  test({foo: "bar"}, [{op: "replace", path: "/a", value: "abc"}]);
  test({"123": "bar"}, [{op: "replace", path: "/123", value: "abc"}]); // numeric key
  test({"foo": [1, 2, 3]}, [{op: "replace", path: "/foo/-", value: "abc"}]); // replace last elem with dash
});

describe("Move", () => {
  test({foo: {bar: "baz", waldo: "fred"}, qux: {corge: "grault"}}, [{op: "move", from: "/foo/waldo", path: "/qux/thud"}]); // RFC A.6
  test({foo: ["all", "grass", "cows", "eat"]}, [{op: "move", from: "/foo/1", path: "/foo/3"}]); // RFC A.7
  test({foo: ["all", "grass", "cows", "eat"]}, [{op: "move", from: "/foo/1", path: "/foo/-"}]); // RFC A.7 variation
  test({foo: "bar"}, [{op: "move", from: "/a", path: "/b"}]); // Move from nonexistent
  test({foo: {bar: "baz", waldo: "fred"}, qux: {corge: "grault"}}, [{op: "move", from: "/quz", path: "/qux/thud"}]); // Should error: move from proper prefix
});

describe("Test", () => {
  test({foo: "bar"}, [{op: "test", path: "/foo", value: "bar"}]);
  test({"/": 9, "~1": 10}, [{op: "test", path: "/~01", value: 10}]); // RFC A.14
  test({"/": 9, "~1": 10}, [{op: "test", path: "/~01", value: "10"}]); // RFC A.15
});

describe("Unusual", () => {
  test({}, [{op: "add", path: "/", value: 0 }]);
  test({}, [{op: 'add', path: '/', value: {}}]);
});

describe("Randomized tests", () => {
  it("does a random test", () => {
    fc.assert(fc.property(fc.anything(), fc.anything(), (originalDoc: any, newDoc: any) => {
      if (originalDoc === undefined || newDoc === undefined) return;
      if (originalDoc === null || newDoc === null) return;

      // console.log(`Trying case '${JSON.stringify(originalDoc)}', '${JSON.stringify(newDoc)}'`);

      const diff = compare(originalDoc, newDoc, false);
      test(originalDoc, diff);
    }));
  });
});
