
import {JsonPatchError, getValueByPointer, _areEquals} from "./util";


export function patch<T>(value: T, operations: ReadonlyArray<Operation>): PatchResult<T> {
	if (operations.length === 0) return { tag: "success", value };

	let current: T | null = value;

	for (let i = 0; i < operations.length; i += 1) {
		const ret: PatchResult<T> = applyOperation(current, operations[i], i, true);
		if (ret.tag === "error") return ret;
		else current = ret.value;
	}

	return { tag: "success", value: current };
}

function applyOperation<T>(value: T, operation: Operation, index: number, banPrototypeModifications=true): PatchResult<T | null> {
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
				throw new JsonPatchError("Test operation failed", "TEST_OPERATION_FAILED", index, operation, value);
			} else {
				return { tag: "success", value: operation.value };
			}
        } else if (operation.op === "remove") { // a remove on root
            return { tag: "success", value: null };
        } else {
			throw new JsonPatchError("Operation `op` property is not one of operations defined in RFC-6902", "OPERATION_OP_INVALID", index, operation, value);
        }
    } else {
		throw new Error("TODO");
    }
}
