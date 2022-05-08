
import assert from "assert";
import { applyPatch } from "fast-json-patch";
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

  const ourResult = patch(doc, patches);
  if (ourResult.tag === "success" && desired.tag === "success") {
    if (isEqual(ourResult.value, desired.value)) {
      console.log(`\u001B[32m✓\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${JSON.stringify(desired.value)}`);
    } else {
      console.log(`\u001B[31m✗\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${JSON.stringify(desired.value)}`);
      assert.fail(`Our result was ${JSON.stringify(ourResult.value)}`);
    }
  } else if (ourResult.tag === "error" && desired.tag === "error") {
    console.log(`\u001B[32m✓\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ERROR`);
  } else if (ourResult.tag === "success" && desired.tag === "error") {
    console.log(`\u001B[32mX\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ERROR`);
  } else if (ourResult.tag === "error" && desired.tag === "success") {
    console.log(`\u001B[32mX\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${JSON.stringify(desired.value)}`);
  }
}

function printHeading(label: string) {
  console.log("\n" + label + "\n");
}

// Root operations
printHeading("Root operations");
test({foo: "bar"}, [{op: "add", path: "", value: 42}]);
test({foo: "bar"}, [{op: "replace", path: "", value: 42}]);
test({foo: "bar"}, [{op: "remove", path: ""}]);
test({foo: "bar"}, [{op: "move", path: "", from: "/foo"}]);
test({foo: "bar"}, [{op: "copy", path: "", from: "/foo"}]);
test({foo: "bar"}, [{op: "test", path: "", value: 42}]);
test({foo: "bar"}, [{op: "test", path: "", value: {foo: "bar"}}]);

printHeading("Add");
test({foo: "bar"}, [{op: "add", path: "/baz", value: "qux"}]); // RFC A.1
test({foo: "bar", baz: {}}, [{op: "add", path: "/baz/baz2", value: "qux"}]);
test([], [{op: "add", path: "/0", value: "qux"}]);
test({foo: ["bar", "baz"]}, [{op: "add", path: "/foo/1", value: "qux"}]); // RFC A.2
test({foo: "bar"}, [{op: "add", path: "/child", value: {grandchild: {}}}]); // RFC A.10
test({foo: ["bar"]}, [{op: "add", path: "/foo/-", value: ["abc", "def"]}]); // RFC A.16
test({foo: "bar"}, [{op: "add", path: "/baz", value: "qux", xyz: 123} as Operation]); // RFC A.11

printHeading("Remove");
test({baz: "qux", foo: "bar"}, [{op: "remove", path: "/baz"}]); // RFC A.3
test({foo: ["bar", "qux", "baz"]}, [{op: "remove", path: "/foo/1"}]); // RFC A.4

printHeading("Replace");
test({baz: "qux", foo: "bar"}, [{op: "replace", path: "/baz", value: "boo"}]); // RFC A.5

printHeading("Move");
test({foo: {bar: "baz", waldo: "fred"}, qux: {corge: "grault"}}, [{op: "move", from: "/foo/waldo", path: "/qux/thud"}]); // RFC A.6
test({foo: ["all", "grass", "cows", "eat"]}, [{op: "move", from: "/foo/1", path: "/foo/3"}]); // RFC A.7

printHeading("Test");
test({foo: "bar"}, [{op: "test", path: "/foo", value: "bar"}]);
test({"/": 9, "~1": 10}, [{op: "test", path: "/~01", value: 10}]); // RFC A.14
test({"/": 9, "~1": 10}, [{op: "test", path: "/~01", value: "10"}]); // RFC A.15
