

export function getValueByPointer(document: any, pointer: string) {
  if (pointer == '') {
    return document;
  }
  var getOriginalDestination: GetOperation<any> = { op: "_get", value: null, path: pointer };
  return null; // TODO
  // applyOperation(document, getOriginalDestination);
  // return getOriginalDestination.value;
}

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
export function _areEquals(a: any, b: any) {
  if (a === b)
    return true;
  if (a && b && typeof a == 'object' && typeof b == 'object') {
    var arrA = Array.isArray(a), arrB = Array.isArray(b), i, length, key;
    if (arrA && arrB) {
      length = a.length;
      if (length != b.length)
        return false;
      for (i = length; i-- !== 0;)
        if (!_areEquals(a[i], b[i]))
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
      if (!_areEquals(a[key], b[key]))
        return false;
    }
    return true;
  }
  return a !== a && b !== b;
}


function patchErrorMessageFormatter(message: string, args: any) {
  var messageParts = [message];
  for (var key in args) {
    var value = typeof args[key] === 'object' ? JSON.stringify(args[key], null, 2) : args[key]; // pretty print
    if (typeof value !== 'undefined') {
      messageParts.push(key + ": " + value);
    }
  }
  return messageParts.join('\n');
}

export class JsonPatchError {
  message: string;
  constructor(message: string, name: string, index: number, operation: Operation, tree: any) {
    this.message = patchErrorMessageFormatter(message, { name: name, index: index, operation: operation, tree: tree })
  }
}

//3x faster than cached /^\d+$/.test(str)
export function isInteger(str: string) {
  var i = 0;
  var len = str.length;
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
export function unescapePathComponent(path: string) {
  return path.replace(/~1/g, '/').replace(/~0/g, '~');
}
