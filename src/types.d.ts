
declare module "immutability-helper-rfc6902";

declare type Operation =
  AddOperation<any>
  | RemoveOperation
  | ReplaceOperation<any>
  | MoveOperation
  | CopyOperation
  | TestOperation<any>
  | GetOperation<any>;

interface BaseOperation {
  path: string;
}

interface AddOperation<T> extends BaseOperation {
  op: "add";
  value: T;
}

interface RemoveOperation extends BaseOperation {
  op: "remove";
}

interface ReplaceOperation<T> extends BaseOperation {
  op: "replace";
  value: T;
}

interface MoveOperation extends BaseOperation {
  op: "move";
  from: string;
}

interface CopyOperation extends BaseOperation {
  op: "copy";
  from: string;
}

interface TestOperation<T> extends BaseOperation {
  op: "test";
  value: T;
}

interface GetOperation<T> extends BaseOperation {
  op: "_get";
  value: T;
}

type PatchResult<T> = { tag: "success"; value: T | null; }
                    | { tag: "error"; msg: string; }
