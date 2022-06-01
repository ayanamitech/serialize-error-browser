import { Stream } from 'stream';

// https://github.com/sindresorhus/type-fest/blob/043b732bf02c2b700245aa6501116a6646d50732/source/basic.d.ts
type JsonObject = {[Key in string]?: JsonValue};
type JsonArray = JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

const isBrowser = typeof window !== 'undefined';

export type ErrorObject = {
  name?: string;
  stack?: string;
  message?: string;
  code?: string;
} & JsonObject;

export interface Options {
  /**
	The maximum depth of properties to preserve when serializing/deserializing.

	@default Number.POSITIVE_INFINITY

	@example
	```
	import {serializeError} from 'serialize-error';

	const error = new Error('🦄');
	error.one = {two: {three: {}}};

	console.log(serializeError(error, {maxDepth: 1}));
	//=> {name: 'Error', message: '…', one: {}}

	console.log(serializeError(error, {maxDepth: 2}));
	//=> {name: 'Error', message: '…', one: { two: {}}}
	```
	*/
  readonly maxDepth?: number;
}

export class NonError extends Error {
  name = 'NonError';

  constructor(message: any) {
    super(NonError._prepareSuperMessage(message));
  }

  static _prepareSuperMessage(message: any) {
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}

const commonProperties = [
  {
    property: 'name',
    enumerable: false,
  },
  {
    property: 'message',
    enumerable: false,
  },
  {
    property: 'stack',
    enumerable: false,
  },
  {
    property: 'code',
    enumerable: true,
  },
];

const toJsonWasCalled = Symbol('.toJSON was called');

const toJSON = (from: any) => {
  from[toJsonWasCalled] = true;
  const json = from.toJSON();
  delete from[toJsonWasCalled];
  return json;
};

type circularOptions = {
  from: any;
  seen: Array<any>;
  to_?: any;
  forceEnumerable?: boolean;
  maxDepth: number;
  depth: number;
};

const destroyCircular = ({
  from,
  seen,
  to_,
  forceEnumerable,
  maxDepth,
  depth,
}: circularOptions) => {
  const to = to_ || (Array.isArray(from) ? [] : {});

  seen.push(from);

  if (depth >= maxDepth) {
    return to;
  }

  if (typeof from.toJSON === 'function' && from[toJsonWasCalled] !== true) {
    return toJSON(from);
  }

  for (const [key, value] of Object.entries(from)) {
    if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
      to[key] = '[object Buffer]';
      continue;
    }

    // TODO: Use `stream.isReadable()` when targeting Node.js 18.
    // Removed typeof value.pipe === 'function' from condition
    if (isBrowser === false && value !== null && typeof value === 'object' && value instanceof Stream) {
      to[key] = '[object Stream]';
      continue;
    }

    if (typeof value === 'function') {
      continue;
    }

    if (!value || typeof value !== 'object') {
      to[key] = value;
      continue;
    }

    if (!seen.includes(from[key])) {
      depth++;

      to[key] = destroyCircular({
        from: from[key],
        seen: [...seen],
        forceEnumerable,
        maxDepth,
        depth,
      });
      continue;
    }

    to[key] = '[Circular]';
  }

  for (const {property, enumerable} of commonProperties) {
    if (typeof from[property] === 'string') {
      Object.defineProperty(to, property, {
        value: from[property],
        enumerable: forceEnumerable ? true : enumerable,
        configurable: true,
        writable: true,
      });
    }
  }

  return to;
};

export function serializeError(value: any, options: Options = {}): any {
  const {maxDepth = Number.POSITIVE_INFINITY} = options;

  if (typeof value === 'object' && value !== null) {
    return destroyCircular({
      from: value,
      seen: [],
      forceEnumerable: true,
      maxDepth,
      depth: 0,
    });
  }

  // People sometimes throw things besides Error objects…
  if (typeof value === 'function') {
    // `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
    return `[Function: ${(value.name ?? 'anonymous')}]`;
  }

  return value;
}

export function deserializeError(value: any, options: Options = {}): Error {
  const {maxDepth = Number.POSITIVE_INFINITY} = options;

  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const newError = new Error();
    destroyCircular({
      from: value,
      seen: [],
      to_: newError,
      maxDepth,
      depth: 0,
    });
    return newError;
  }

  return new NonError(value);
}

export default serializeError;
