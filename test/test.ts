
import assert from "assert";
import { applyPatch } from "fast-json-patch";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";

import {patch} from "../src/main";


function test(doc: any, patches: Operation[]) {
  // See what fast-json-patch has to say
  const desired = applyPatch(cloneDeep(doc), patches).newDocument;

  const ourResult = patch(doc, patches);
  if (ourResult.tag === "success") {
    if (isEqual(ourResult.value, desired)) {
      console.log(`\u001B[32m✓\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${JSON.stringify(desired)}`);
    } else {
      console.log(`\u001B[31m✗\u001B[39m ${JSON.stringify(doc)} + ${JSON.stringify(patches)} --> ${JSON.stringify(desired)}`);
      assert.fail(`Our result was ${JSON.stringify(ourResult.value)}`);
    }
  } else {
    assert.fail("Exception from our library: " + ourResult.msg);
  }
}

function printHeading(label: string) {
  console.log("\n" + label + "\n");
}

// Basic sanity tests
printHeading("Basics");
const someDoc = {foo: "bar"};
test(cloneDeep(someDoc), [{op: "add", path: "", value: 42}]);
test(cloneDeep(someDoc), [{op: "replace", path: "", value: 42}]);
test(cloneDeep(someDoc), [{op: "remove", path: ""}]);
// test(someDoc, [{op: "move", path: "", from: "/foo"}]);
// test(someDoc, [{op: "copy", path: "", from: "foo"}]);
// test(someDoc, [{op: "test", path: "", value: 42}]);

printHeading("Add");
test({foo: "bar"}, [{"op": "add", "path": "/baz", "value": "qux"}]);
test({foo: "bar", baz: {}}, [{"op": "add", "path": "/baz/baz2", "value": "qux"}]);
test([], [{"op": "add", "path": "/0", "value": "qux"}]);
test({"foo": ["bar", "baz"]}, [{"op": "add", "path": "/foo/1", "value": "qux"}]);

printHeading("Remove");
test({"baz": "qux", "foo": "bar"}, [{"op": "remove", "path": "/baz"}]);
