(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["immutability-helper-rfc6902"] = {}));
})(this, (function (exports) { 'use strict';

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var immutabilityHelper = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	function stringifiable(obj) {
	    // Safely stringify Object.create(null)
	    /* istanbul ignore next */
	    return typeof obj === 'object' && !('toString' in obj) ?
	        Object.prototype.toString.call(obj).slice(8, -1) :
	        obj;
	}
	var isProduction = typeof process === 'object' && process.env.NODE_ENV === 'production';
	function invariant(condition, message) {
	    if (!condition) {
	        /* istanbul ignore next */
	        if (isProduction) {
	            throw new Error('Invariant failed');
	        }
	        throw new Error(message());
	    }
	}
	exports.invariant = invariant;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var splice = Array.prototype.splice;
	var toString = Object.prototype.toString;
	function type(obj) {
	    return toString.call(obj).slice(8, -1);
	}
	var assign = Object.assign || /* istanbul ignore next */ (function (target, source) {
	    getAllKeys(source).forEach(function (key) {
	        if (hasOwnProperty.call(source, key)) {
	            target[key] = source[key];
	        }
	    });
	    return target;
	});
	var getAllKeys = typeof Object.getOwnPropertySymbols === 'function'
	    ? function (obj) { return Object.keys(obj).concat(Object.getOwnPropertySymbols(obj)); }
	    /* istanbul ignore next */
	    : function (obj) { return Object.keys(obj); };
	function copy(object) {
	    return Array.isArray(object)
	        ? assign(object.constructor(object.length), object)
	        : (type(object) === 'Map')
	            ? new Map(object)
	            : (type(object) === 'Set')
	                ? new Set(object)
	                : (object && typeof object === 'object')
	                    ? assign(Object.create(Object.getPrototypeOf(object)), object)
	                    /* istanbul ignore next */
	                    : object;
	}
	var Context = /** @class */ (function () {
	    function Context() {
	        this.commands = assign({}, defaultCommands);
	        this.update = this.update.bind(this);
	        // Deprecated: update.extend, update.isEquals and update.newContext
	        this.update.extend = this.extend = this.extend.bind(this);
	        this.update.isEquals = function (x, y) { return x === y; };
	        this.update.newContext = function () { return new Context().update; };
	    }
	    Object.defineProperty(Context.prototype, "isEquals", {
	        get: function () {
	            return this.update.isEquals;
	        },
	        set: function (value) {
	            this.update.isEquals = value;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Context.prototype.extend = function (directive, fn) {
	        this.commands[directive] = fn;
	    };
	    Context.prototype.update = function (object, $spec) {
	        var _this = this;
	        var spec = (typeof $spec === 'function') ? { $apply: $spec } : $spec;
	        if (!(Array.isArray(object) && Array.isArray(spec))) {
	            invariant(!Array.isArray(spec), function () { return "update(): You provided an invalid spec to update(). The spec may " +
	                "not contain an array except as the value of $set, $push, $unshift, " +
	                "$splice or any custom command allowing an array value."; });
	        }
	        invariant(typeof spec === 'object' && spec !== null, function () { return "update(): You provided an invalid spec to update(). The spec and " +
	            "every included key path must be plain objects containing one of the " +
	            ("following commands: " + Object.keys(_this.commands).join(', ') + "."); });
	        var nextObject = object;
	        getAllKeys(spec).forEach(function (key) {
	            if (hasOwnProperty.call(_this.commands, key)) {
	                var objectWasNextObject = object === nextObject;
	                nextObject = _this.commands[key](spec[key], nextObject, spec, object);
	                if (objectWasNextObject && _this.isEquals(nextObject, object)) {
	                    nextObject = object;
	                }
	            }
	            else {
	                var nextValueForKey = type(object) === 'Map'
	                    ? _this.update(object.get(key), spec[key])
	                    : _this.update(object[key], spec[key]);
	                var nextObjectValue = type(nextObject) === 'Map'
	                    ? nextObject.get(key)
	                    : nextObject[key];
	                if (!_this.isEquals(nextValueForKey, nextObjectValue)
	                    || typeof nextValueForKey === 'undefined'
	                        && !hasOwnProperty.call(object, key)) {
	                    if (nextObject === object) {
	                        nextObject = copy(object);
	                    }
	                    if (type(nextObject) === 'Map') {
	                        nextObject.set(key, nextValueForKey);
	                    }
	                    else {
	                        nextObject[key] = nextValueForKey;
	                    }
	                }
	            }
	        });
	        return nextObject;
	    };
	    return Context;
	}());
	exports.Context = Context;
	var defaultCommands = {
	    $push: function (value, nextObject, spec) {
	        invariantPushAndUnshift(nextObject, spec, '$push');
	        return value.length ? nextObject.concat(value) : nextObject;
	    },
	    $unshift: function (value, nextObject, spec) {
	        invariantPushAndUnshift(nextObject, spec, '$unshift');
	        return value.length ? value.concat(nextObject) : nextObject;
	    },
	    $splice: function (value, nextObject, spec, originalObject) {
	        invariantSplices(nextObject, spec);
	        value.forEach(function (args) {
	            invariantSplice(args);
	            if (nextObject === originalObject && args.length) {
	                nextObject = copy(originalObject);
	            }
	            splice.apply(nextObject, args);
	        });
	        return nextObject;
	    },
	    $set: function (value, _nextObject, spec) {
	        invariantSet(spec);
	        return value;
	    },
	    $toggle: function (targets, nextObject) {
	        invariantSpecArray(targets, '$toggle');
	        var nextObjectCopy = targets.length ? copy(nextObject) : nextObject;
	        targets.forEach(function (target) {
	            nextObjectCopy[target] = !nextObject[target];
	        });
	        return nextObjectCopy;
	    },
	    $unset: function (value, nextObject, _spec, originalObject) {
	        invariantSpecArray(value, '$unset');
	        value.forEach(function (key) {
	            if (Object.hasOwnProperty.call(nextObject, key)) {
	                if (nextObject === originalObject) {
	                    nextObject = copy(originalObject);
	                }
	                delete nextObject[key];
	            }
	        });
	        return nextObject;
	    },
	    $add: function (values, nextObject, _spec, originalObject) {
	        invariantMapOrSet(nextObject, '$add');
	        invariantSpecArray(values, '$add');
	        if (type(nextObject) === 'Map') {
	            values.forEach(function (_a) {
	                var key = _a[0], value = _a[1];
	                if (nextObject === originalObject && nextObject.get(key) !== value) {
	                    nextObject = copy(originalObject);
	                }
	                nextObject.set(key, value);
	            });
	        }
	        else {
	            values.forEach(function (value) {
	                if (nextObject === originalObject && !nextObject.has(value)) {
	                    nextObject = copy(originalObject);
	                }
	                nextObject.add(value);
	            });
	        }
	        return nextObject;
	    },
	    $remove: function (value, nextObject, _spec, originalObject) {
	        invariantMapOrSet(nextObject, '$remove');
	        invariantSpecArray(value, '$remove');
	        value.forEach(function (key) {
	            if (nextObject === originalObject && nextObject.has(key)) {
	                nextObject = copy(originalObject);
	            }
	            nextObject.delete(key);
	        });
	        return nextObject;
	    },
	    $merge: function (value, nextObject, _spec, originalObject) {
	        invariantMerge(nextObject, value);
	        getAllKeys(value).forEach(function (key) {
	            if (value[key] !== nextObject[key]) {
	                if (nextObject === originalObject) {
	                    nextObject = copy(originalObject);
	                }
	                nextObject[key] = value[key];
	            }
	        });
	        return nextObject;
	    },
	    $apply: function (value, original) {
	        invariantApply(value);
	        return value(original);
	    },
	};
	var defaultContext = new Context();
	exports.isEquals = defaultContext.update.isEquals;
	exports.extend = defaultContext.extend;
	exports.default = defaultContext.update;
	// @ts-ignore
	exports.default.default = module.exports = assign(exports.default, exports);
	// invariants
	function invariantPushAndUnshift(value, spec, command) {
	    invariant(Array.isArray(value), function () { return "update(): expected target of " + stringifiable(command) + " to be an array; got " + stringifiable(value) + "."; });
	    invariantSpecArray(spec[command], command);
	}
	function invariantSpecArray(spec, command) {
	    invariant(Array.isArray(spec), function () { return "update(): expected spec of " + stringifiable(command) + " to be an array; got " + stringifiable(spec) + ". " +
	        "Did you forget to wrap your parameter in an array?"; });
	}
	function invariantSplices(value, spec) {
	    invariant(Array.isArray(value), function () { return "Expected $splice target to be an array; got " + stringifiable(value); });
	    invariantSplice(spec.$splice);
	}
	function invariantSplice(value) {
	    invariant(Array.isArray(value), function () { return "update(): expected spec of $splice to be an array of arrays; got " + stringifiable(value) + ". " +
	        "Did you forget to wrap your parameters in an array?"; });
	}
	function invariantApply(fn) {
	    invariant(typeof fn === 'function', function () { return "update(): expected spec of $apply to be a function; got " + stringifiable(fn) + "."; });
	}
	function invariantSet(spec) {
	    invariant(Object.keys(spec).length === 1, function () { return "Cannot have more than one key in an object with $set"; });
	}
	function invariantMerge(target, specValue) {
	    invariant(specValue && typeof specValue === 'object', function () { return "update(): $merge expects a spec of type 'object'; got " + stringifiable(specValue); });
	    invariant(target && typeof target === 'object', function () { return "update(): $merge expects a target of type 'object'; got " + stringifiable(target); });
	}
	function invariantMapOrSet(target, command) {
	    var typeOfTarget = type(target);
	    invariant(typeOfTarget === 'Map' || typeOfTarget === 'Set', function () { return "update(): " + stringifiable(command) + " expects a target of type Set or Map; got " + stringifiable(typeOfTarget); });
	}
	});

	var update = unwrapExports(immutabilityHelper);
	immutabilityHelper.invariant;
	immutabilityHelper.Context;
	immutabilityHelper.isEquals;
	immutabilityHelper.extend;

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
	        // console.log(`-------------- Operation ${i} --------------`);
	        var ret = applyOperation(current, operations[i]);
	        if (ret.tag === "error")
	            return { tag: "error", msg: ret.msg + " (on operation ".concat(i, ")") };
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
	        var keys_1 = splitKeys(operation.path);
	        var spec = void 0;
	        // If there are no keys, just return the value
	        if (keys_1.length === 0)
	            return { tag: "error", msg: "Path was malformed." };
	        var isArray = function () { return valueAtPathIsArray(value, keys_1.slice(0, keys_1.length - 1)); };
	        if (operation.op === "add") {
	            var finalKey = keys_1[keys_1.length - 1];
	            if (isArray()) {
	                if (isInteger(finalKey)) {
	                    spec = { $splice: [[~~finalKey, 0, operation.value]] };
	                    keys_1.length = keys_1.length - 1;
	                }
	                else if (finalKey === "-") {
	                    spec = { $push: [operation.value] };
	                    keys_1.length = keys_1.length - 1;
	                }
	                else
	                    return { tag: "error", msg: "Wanted to add to array, but key was ".concat(finalKey, ".") };
	            }
	            else
	                spec = { $set: operation.value };
	            for (var i = keys_1.length - 1; i >= 0; i -= 1)
	                spec = (_a = {}, _a[keys_1[i]] = spec, _a);
	        }
	        else if (operation.op === "remove") {
	            var finalKey = keys_1[keys_1.length - 1];
	            if (isInteger(finalKey) && isArray())
	                spec = { $splice: [[~~finalKey, 1]] };
	            else
	                spec = { $unset: [finalKey] };
	            keys_1.length = keys_1.length - 1;
	            for (var i = keys_1.length - 1; i >= 0; i -= 1)
	                spec = (_b = {}, _b[keys_1[i]] = spec, _b);
	        }
	        else if (operation.op === "replace") {
	            var finalKey = keys_1[keys_1.length - 1];
	            if (isArray()) {
	                if (isInteger(finalKey)) {
	                    spec = { $splice: [[~~finalKey, 1, operation.value]] };
	                    keys_1.length = keys_1.length - 1;
	                }
	                else if (finalKey === "-") {
	                    spec = { $push: [operation.value] };
	                    keys_1.length = keys_1.length - 1;
	                }
	                else
	                    return { tag: "error", msg: "Wanted to replace on array, but key was ".concat(finalKey, ".") };
	            }
	            else
	                spec = { $set: operation.value };
	            for (var i = keys_1.length - 1; i >= 0; i -= 1)
	                spec = (_c = {}, _c[keys_1[i]] = spec, _c);
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
	function valueAtPathIsArray(root, keys) {
	    var value = getValueByKeys(root, keys);
	    return Array.isArray(value);
	}
	function getValueByKeys(value, keys) {
	    for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
	        var key = keys_2[_i];
	        if (isInteger(key) && Array.isArray(value))
	            value = value[~~key];
	        else
	            value = value[key];
	    }
	    return value;
	}

	exports.patch = patch;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
