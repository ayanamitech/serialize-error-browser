import { AssertionError } from 'node:assert';

interface SystemError extends Error {
  address?: string;
  code?: string;
  dest?: string;
  errno?: number | string;
  info?: object;
  path?: string;
  port?: number;
  syscall?: string;
}

declare global {
  var AssertionError: AssertionError;
  var SystemError: SystemError;
}

const list = [
  // Native ES errors https://262.ecma-international.org/12.0/#sec-well-known-intrinsic-objects
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,

  // Built-in errors
  DOMException,

  // Node-specific errors
  // https://nodejs.org/api/errors.html
  globalThis.AssertionError,
  globalThis.SystemError,
]
// Non-native Errors are used with `globalThis` because they might be missing. This filter drops them when undefined.
  .filter(Boolean)
  .map(
    constructor => [constructor.name, constructor],
  );

/**
  We use the following definition since it has been proved to work despite of wrong parameter error from typescript compiler

  https://github.com/sindresorhus/serialize-error/issues/78
**/
// @ts-ignore
const errorConstructors: Map<string, ErrorConstructor> = new Map(list);

export default errorConstructors;
