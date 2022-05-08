import update from 'immutability-helper';

// based on https://github.com/epoberezkin/fast-deep-equal
// MIT License
// Copyright (c) 2017 Evgeny Poberezkin
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
function isEqual(a, b) {
    if (a === b)
        return true;
    if (a && b && typeof a == 'object' && typeof b == 'object') {
        var arrA = Array.isArray(a), arrB = Array.isArray(b), i, length, key;
        if (arrA && arrB) {
            length = a.length;
            if (length != b.length)
                return false;
            for (i = length; i-- !== 0;)
                if (!isEqual(a[i], b[i]))
                    return false;
            return true;
        }
        if (arrA != arrB)
            return false;
        var keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length)
            return false;
        for (i = length; i-- !== 0;)
            if (!b.hasOwnProperty(keys[i]))
                return false;
        for (i = length; i-- !== 0;) {
            key = keys[i];
            if (!isEqual(a[key], b[key]))
                return false;
        }
        return true;
    }
    return a !== a && b !== b;
}
//3x faster than cached /^\d+$/.test(str)
function isInteger(str) {
    var i = 0;
    var len = str.length;
    if (len === 0)
        return false;
    var charCode;
    while (i < len) {
        charCode = str.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
            i++;
            continue;
        }
        return false;
    }
    return true;
}
/**
 * Unescapes a json pointer path
 * @param path The escaped pointer
 * @return The unescaped path
 */
function unescapePathComponent(path) {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
}

function patch(value, operations) {
    if (operations.length === 0)
        return { tag: "success", value: value };
    var current = value;
    for (var i = 0; i < operations.length; i += 1) {
        var ret = applyOperation(current, operations[i]);
        if (ret.tag === "error")
            return ret;
        else
            current = ret.value;
    }
    return { tag: "success", value: current };
}
function applyOperation(value, operation) {
    var _a, _b, _c;
    if (operation.path === "") {
        /*** Operating on the root ***/
        if (operation.op === "add") {
            return { tag: "success", value: operation.value };
        }
        else if (operation.op === "replace") {
            return { tag: "success", value: operation.value };
        }
        else if (operation.op === "move" || operation.op === "copy") { // it's a move or copy to root
            return { tag: "success", value: getValueByKeys(value, splitKeys(operation.from)) };
        }
        else if (operation.op === "test") {
            if (isEqual(value, operation.value))
                return { tag: "success", value: operation.value };
            else
                return { tag: "error", msg: "Test failed." };
        }
        else if (operation.op === "remove") { // a remove on root
            return { tag: "success", value: null };
        }
        else {
            return { tag: "error", msg: "Unexpected op." };
        }
    }
    else {
        var keys = splitKeys(operation.path);
        var spec = void 0;
        if (operation.op === "add") {
            var finalKey = keys[keys.length - 1];
            if (isInteger(finalKey)) {
                spec = { $splice: [[~~finalKey, 0, operation.value]] };
                keys.length = keys.length - 1;
            }
            else if (finalKey === "-") {
                spec = { $push: [operation.value] };
                keys.length = keys.length - 1;
            }
            else
                spec = { $set: operation.value };
            for (var i = keys.length - 1; i >= 0; i -= 1)
                spec = (_a = {}, _a[keys[i]] = spec, _a);
        }
        else if (operation.op === "remove") {
            var finalKey = keys[keys.length - 1];
            if (isInteger(finalKey))
                spec = { $splice: [[~~finalKey, 1]] };
            else
                spec = { $unset: [finalKey] };
            keys.length = keys.length - 1;
            for (var i = keys.length - 1; i >= 0; i -= 1)
                spec = (_b = {}, _b[keys[i]] = spec, _b);
        }
        else if (operation.op === "replace") {
            var finalKey = keys[keys.length - 1];
            if (isInteger(finalKey)) {
                spec = { $splice: [[~~finalKey, 1, operation.value]] };
                keys.length = keys.length - 1;
            }
            else
                spec = { $set: operation.value };
            for (var i = keys.length - 1; i >= 0; i -= 1)
                spec = (_c = {}, _c[keys[i]] = spec, _c);
        }
        else if (operation.op === "copy") {
            var source = getValueByKeys(value, splitKeys(operation.from));
            return applyOperation(value, { op: "add", value: source, path: operation.path });
        }
        else if (operation.op === "move") {
            var source = getValueByKeys(value, splitKeys(operation.from));
            // TODO: this is inefficient because the next operation has to re-process keys
            var result1 = applyOperation(value, { op: "remove", path: operation.from });
            if (result1.tag === "error")
                return result1;
            return applyOperation(result1.value, { op: "add", value: source, path: operation.path });
        }
        else if (operation.op === "test") {
            var source = getValueByKeys(value, splitKeys(operation.path));
            if (isEqual(source, operation.value))
                return { tag: "success", value: value };
            else
                return { tag: "error", msg: "Test failed." };
        }
        if (!spec)
            throw new Error("TODO");
        try {
            return { tag: "success", value: update(value, spec) };
        }
        catch (err) {
            return { tag: "error", msg: err.toString() };
        }
    }
}
function splitKeys(path) {
    return path.split("/").slice(1).map(function (key) { return (key && key.indexOf('~') != -1) ? unescapePathComponent(key) : key; });
}
function getValueByKeys(value, keys) {
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        if (isInteger(key))
            value = value[~~key];
        else
            value = value[key];
    }
    return value;
}

export { patch };
