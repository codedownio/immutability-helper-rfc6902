
import update from "immutability-helper";

import { isEqual, unescapePathComponent, isInteger } from "./util";


export function patch<T>(value: T, operations: ReadonlyArray<Operation>): PatchResult<T> {
  if (operations.length === 0) return { tag: "success", value };

  let current: T | null = value;

  for (let i = 0; i < operations.length; i += 1) {
    // console.log(`-------------- Operation ${i} --------------`);
    const ret: PatchResult<T> = applyOperation(current, operations[i]);
    if (ret.tag === "error") return {tag: "error", msg: ret.msg + ` (on operation ${i})`};
    else current = ret.value;
  }

  return { tag: "success", value: current };
}

function applyOperation<T>(value: T, operation: Operation): PatchResult<T | null> {
  if (operation.path === "") {
    /*** Operating on the root ***/
    if (operation.op === "add") {
      return { tag: "success", value: operation.value };
    } else if (operation.op === "replace") {
      return { tag: "success", value: operation.value };
    } else if (operation.op === "move" || operation.op === "copy") { // it's a move or copy to root
      return { tag: "success", value: getValueByKeys(value, splitKeys(operation.from)) };
    } else if (operation.op === "test") {
      if (isEqual(value, operation.value)) return { tag: "success", value: operation.value };
      else return { tag: "error", msg: "Test failed." };
    } else if (operation.op === "remove") { // a remove on root
      return { tag: "success", value: null };
    } else {
      return { tag: "error", msg: "Unexpected op." };
    }
  } else {
    const keys: string[] = splitKeys(operation.path);
    let spec: any;

    // If there are no keys, just return the value
    if (keys.length === 0) return { tag: "error", msg: "Path was malformed." };

    const isArray = () => valueAtPathIsArray(value, keys.slice(0, keys.length - 1));

    if (operation.op === "add") {
      const finalKey = keys[keys.length - 1];
      if (isArray()) {
        if (isInteger(finalKey)) {
          spec = {$splice: [[~~finalKey, 0, operation.value]]};
          keys.length = keys.length - 1;
        } else if (finalKey === "-") {
          spec = {$push: [operation.value]};
          keys.length = keys.length - 1;
        } else return { tag: "error", msg: `Wanted to add to array, but key was ${finalKey}.` };
      } else spec = {$set: operation.value};

      for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
    } else if (operation.op === "remove") {
      const finalKey = keys[keys.length - 1];
      if (isInteger(finalKey) && isArray()) spec = {$splice: [[~~finalKey, 1]]};
      else spec = {$unset: [finalKey]};
      keys.length = keys.length - 1;

      for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
    } else if (operation.op === "replace") {
      const finalKey = keys[keys.length - 1];
      if (isArray()) {
        if (isInteger(finalKey)) {
          spec = {$splice: [[~~finalKey, 1, operation.value]]};
          keys.length = keys.length - 1;
        } else if (finalKey === "-") {
          spec = {$push: [operation.value]};
          keys.length = keys.length - 1;
        } else return { tag: "error", msg: `Wanted to replace on array, but key was ${finalKey}.` };
      } else spec = {$set: operation.value};

      for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
    } else if (operation.op === "copy") {
      const source = getValueByKeys(value, splitKeys(operation.from));
      return applyOperation(value, {op: "add", value: source, path: operation.path});
    } else if (operation.op === "move") {
      const source = getValueByKeys(value, splitKeys(operation.from));
      // TODO: this is inefficient because the next operation has to re-process keys
      const result1 = applyOperation(value, {op: "remove", path: operation.from});
      if (result1.tag === "error") return result1;
      return applyOperation(result1.value, {op: "add", value: source, path: operation.path});
    } else if (operation.op === "test") {
      const source = getValueByKeys(value, splitKeys(operation.path));
      if (isEqual(source, operation.value)) return { tag: "success", value };
      else return { tag: "error", msg: "Test failed." };
    }

    try {
      return { tag: "success", value: update(value, spec) };
    } catch (err: any) {
      return { tag: "error", msg: err.toString() };
    }
  }
}

function splitKeys(path: string) {
  return path.split("/").slice(1).map((key) => (key && key.indexOf('~') != -1) ? unescapePathComponent(key) : key);
}

function valueAtPathIsArray(root: any, keys: string[]) {
  const value = getValueByKeys(root, keys);
  return Array.isArray(value);
}

function getValueByKeys(value: any, keys: string[]) {
  for (let key of keys) {
    if (isInteger(key) && Array.isArray(value)) value = value[~~key]
    else value = value[key];
  }

  return value;
}
