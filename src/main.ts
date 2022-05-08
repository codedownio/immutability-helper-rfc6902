
import update from "immutability-helper";

import { JsonPatchError, getValueByPointer, _areEquals, unescapePathComponent, isInteger } from "./util";


export function patch<T>(value: T, operations: ReadonlyArray<Operation>): PatchResult<T> {
	if (operations.length === 0) return { tag: "success", value };

	let current: T | null = value;

	for (let i = 0; i < operations.length; i += 1) {
		const ret: PatchResult<T> = applyOperation(current, operations[i]);
		if (ret.tag === "error") return ret;
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
			return { tag: "success", value: getValueByPointer(value, operation.from) };
        } else if (operation.op === "test") {
			if (!_areEquals(value, operation.value)) {
				throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", 0, operation, value);
			} else {
				return { tag: "success", value: operation.value };
			}
        } else if (operation.op === "remove") { // a remove on root
            return { tag: "success", value: null };
        } else {
			throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", 0, operation, value);
        }
    } else {
		const keys: string[] = splitKeys(operation.path);

		let spec: any;

		if (operation.op === "add") {
			const finalKey = keys[keys.length - 1];
			if (isInteger(finalKey)) {
				spec = {$splice: [[~~finalKey, 0, operation.value]]};
				keys.length = keys.length - 1;
			} else if (finalKey === "-") {
				spec = {$push: [operation.value]};
				keys.length = keys.length - 1;
			} else spec = {$set: operation.value};

			for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
        } else if (operation.op === "remove") {
			const finalKey = keys[keys.length - 1];
			if (isInteger(finalKey)) spec = {$splice: [[~~finalKey, 1]]};
			else spec = {$unset: [finalKey]};
			keys.length = keys.length - 1;

			for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
        } else if (operation.op === "replace") {
			const finalKey = keys[keys.length - 1];
			if (isInteger(finalKey)) {
				spec = {$splice: [[~~finalKey, 1, operation.value]]};
				keys.length = keys.length - 1;
			} else spec = {$set: operation.value};

			for (let i = keys.length - 1; i >= 0; i -= 1) spec = {[keys[i]]: spec};
        } else if (operation.op === "move") {
			const source = getValueByKeys(value, splitKeys(operation.from));
			// TODO: this is inefficient because the next operation has to re-process keys
			const result1 = applyOperation(value, {op: "remove", path: operation.from});
			if (result1.tag === "error") return result1;
			return applyOperation(result1.value, {op: "add", value: source, path: operation.path});
        }

		if (!spec) throw new Error("TODO");

		// console.log("Got spec", spec);

		return { tag: "success", value: update(value, spec) };
    }
}

function splitKeys(path: string) {
	return path.split("/").slice(1).map((key) => (key && key.indexOf('~') != -1) ? unescapePathComponent(key) : key);
}

function getValueByKeys(value: any, keys: string[]) {
	for (let key of keys) {
		if (isInteger(key)) value = value[~~key]
		else value = value[key];
	}

	return value;
}
