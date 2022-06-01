import { strict as assert } from 'assert';
import { Buffer } from 'buffer';
import Stream from 'stream';
import { serializeError, deserializeError } from './index';

type JsonObject = {[Key in string]?: JsonValue};
type JsonArray = JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

const isBrowser = typeof window !== 'undefined';

function deserializeNonError(t: typeof assert, value: any) {
  const deserialized = deserializeError(value);
  t.ok(deserialized instanceof Error);
  t.equal(deserialized.constructor.name, 'NonError');
  t.equal(deserialized.message, JSON.stringify(value));
}

describe('serialize-error', () => {
  it('main', () => {
    const serialized = serializeError(new Error('foo'));
    const properties = Object.keys(serialized);

    assert.ok(properties.includes('name'));
    assert.ok(properties.includes('stack'));
    assert.ok(properties.includes('message'));
  });

  it('should destroy circular references', () => {
    const object: JsonObject = {};
    object.child = {parent: object};

    const serialized = serializeError(object);
    assert.equal(typeof serialized, 'object');
    assert.equal(serialized.child.parent, '[Circular]');
  });

  it('should not affect the original object', () => {
    const object: JsonObject = {};
    object.child = {parent: object};

    const serialized = serializeError(object);
    assert.notEqual(serialized, object);
    assert.equal(object.child.parent, object);
  });

  it('should only destroy parent references', () => {
    const object: JsonObject = {};
    const common = {thing: object};
    object.one = {firstThing: common};
    object.two = {secondThing: common};

    const serialized = serializeError(object);
    assert.equal(typeof serialized.one.firstThing, 'object');
    assert.equal(typeof serialized.two.secondThing, 'object');
    assert.equal(serialized.one.firstThing.thing, '[Circular]');
    assert.equal(serialized.two.secondThing.thing, '[Circular]');
  });

  it('should work on arrays', () => {
    const object: any = {};
    const common: any[] = [object];
    const x = [common];
    const y = [['test'], common];
    y[0][1] = y;
    object.a = {x};
    object.b = {y};

    const serialized = serializeError(object);
    assert.ok(Array.isArray(serialized.a.x));
    assert.equal(serialized.a.x[0][0], '[Circular]');
    assert.equal(serialized.b.y[0][0], 'test');
    assert.equal(serialized.b.y[1][0], '[Circular]');
    assert.equal(serialized.b.y[0][1], '[Circular]');
  });

  it('should discard nested functions', () => {
    function a() {} // eslint-disable-line @typescript-eslint/no-empty-function
    function b() {} // eslint-disable-line @typescript-eslint/no-empty-function
    a.b = b;
    const object = {a};

    const serialized = serializeError(object);
    assert.deepEqual(serialized, {});
  });

  if (isBrowser === false) {
    it('should discard buffers', () => {
      const object: any = {a: Buffer.alloc(1)};
      const serialized = serializeError(object);
      assert.deepEqual(serialized, {a: '[object Buffer]'});
    });

    it('should discard streams', () => {
      assert.deepEqual(serializeError({s: new Stream.Stream()}), {s: '[object Stream]'}, 'Stream.Stream');
      assert.deepEqual(serializeError({s: new Stream.Readable()}), {s: '[object Stream]'}, 'Stream.Readable');
      assert.deepEqual(serializeError({s: new Stream.Writable()}), {s: '[object Stream]'}, 'Stream.Writable');
      assert.deepEqual(serializeError({s: new Stream.Duplex()}), {s: '[object Stream]'}, 'Stream.Duplex');
      assert.deepEqual(serializeError({s: new Stream.Transform()}), {s: '[object Stream]'}, 'Stream.Transform');
      assert.deepEqual(serializeError({s: new Stream.PassThrough()}), {s: '[object Stream]'}, 'Stream.PassThrough');
    });
  }

  it('should replace top-level functions with a helpful string', () => {
    function a() {} // eslint-disable-line @typescript-eslint/no-empty-function
    function b() {} // eslint-disable-line @typescript-eslint/no-empty-function
    a.b = b;

    const serialized = serializeError(a);
    assert.equal(serialized, '[Function: a]');
  });

  it('should drop functions', () => {
    function a() {} // eslint-disable-line @typescript-eslint/no-empty-function
    a.foo = 'bar;';
    a.b = a;
    const object: any = {a};

    const serialized = serializeError(object);
    assert.deepEqual(serialized, {});
    assert.equal(Object.prototype.hasOwnProperty.call(serialized, 'a'), false);
  });

  it('should not access deep non-enumerable properties', () => {
    const error: any = new Error('some error');
    const object: any = {};
    Object.defineProperty(object, 'someProp', {
      enumerable: false,
      get() {
        throw new Error('some other error');
      },
    });
    error.object = object;
    assert.doesNotThrow(() => serializeError(error));
  });

  it('should serialize nested errors', () => {
    const error: any = new Error('outer error');
    error.innerError = new Error('inner error');

    const serialized = serializeError(error);
    assert.equal(serialized.message, 'outer error');
    assert.equal(serialized.innerError.message, 'inner error');
  });

  it('should handle top-level null values', () => {
    const serialized = serializeError(null);
    assert.equal(serialized, null);
  });

  it('should deserialize null', () => {
    deserializeNonError(assert, null);
  });

  it('should deserialize number', () => {
    deserializeNonError(assert, 1);
  });

  it('should deserialize boolean', () => {
    deserializeNonError(assert, true);
  });

  it('should deserialize string', () => {
    deserializeNonError(assert, '123');
  });

  it('should deserialize array', () => {
    deserializeNonError(assert, [1]);
  });

  it('should deserialize error', () => {
    const deserialized = deserializeError(new Error('test'));
    assert.ok(deserialized instanceof Error);
    assert.equal(deserialized.message, 'test');
  });

  /**
  it('should deserialize and preserve existing properties', () => {
    const deserialized: any = deserializeError({
      message: 'foo',
      customProperty: true,
    });
    assert.ok(deserialized instanceof Error);
    assert.equal(deserialized.message, 'foo');
    assert.ok(deserialized.customProperty);
  });

  it('should deserialize plain object', () => {
    const object = {
      message: 'error message',
      stack: 'at <anonymous>:1:13',
      name: 'name',
      code: 'code',
    };

    const deserialized = deserializeError(object);
    assert.equal(deserialized instanceof Error, true);
    assert.equal(deserialized.message, 'error message');
    assert.equal(deserialized.stack, 'at <anonymous>:1:13');
    assert.equal(deserialized.name, 'name');
    assert.equal(deserialized.code, 'code');
  });
  **/

  it('deserialized name, stack and message should not be enumerable, other props should be', () => {
    const object = {
      message: 'error message',
      stack: 'at <anonymous>:1:13',
      name: 'name',
    };
    const nonEnumerableProps = Object.keys(object);

    const enumerables = {
      code: 'code',
      path: './path',
      errno: 1,
      syscall: 'syscall',
      randomProperty: 'random',
    };
    const enumerableProps = Object.keys(enumerables);

    const deserialized = deserializeError({...object, ...enumerables});
    const deserializedEnumerableProps = Object.keys(deserialized);

    for (const prop of nonEnumerableProps) {
      assert.equal(deserializedEnumerableProps.includes(prop), false);
    }

    for (const prop of enumerableProps) {
      assert.ok(deserializedEnumerableProps.includes(prop));
    }
  });

  it('should deserialize properties up to `Options.maxDepth` levels deep', () => {
    const error: any = new Error('errorMessage');
    const object = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      one: {
        two: {
          three: {},
        },
      },
    };

    const levelZero = deserializeError(object, {maxDepth: 0});
    const emptyError = new Error('test');
    emptyError.message = '';
    assert.equal(levelZero instanceof Error, true);
    assert.deepEqual(levelZero, emptyError);

    const levelOne = deserializeError(object, {maxDepth: 1});
    error.one = {};
    assert.equal(levelOne instanceof Error, true);
    assert.deepEqual(levelOne, error);

    const levelTwo = deserializeError(object, {maxDepth: 2});
    error.one = {two: {}};
    assert.equal(levelTwo instanceof Error, true);
    assert.deepEqual(levelTwo, error);

    const levelThree = deserializeError(object, {maxDepth: 3});
    error.one = {two: {three: {}}};
    assert.equal(levelThree instanceof Error, true);
    assert.deepEqual(levelThree, error);
  });

  it('should serialize Date as ISO string', () => {
    const date = {date: new Date(0)};
    const serialized = serializeError(date);
    assert.deepEqual(serialized, {date: '1970-01-01T00:00:00.000Z'});
  });

  /**
  it('should serialize custom error with `.toJSON`', () => {
    class CustomError extends Error {
      constructor() {
        super('foo');
        this.name = this.constructor.name;
        this.value = 10;
      }

      toJSON() {
        return {
          message: this.message,
          amount: `$${this.value}`,
        };
      }
    }
    const error = new CustomError();
    const serialized = serializeError(error);
    assert.deepEqual(serialized, {
      message: 'foo',
      amount: '$10',
    });
    assert.ok(serialized.stack === undefined);
  });

  it('should serialize custom error with a property having `.toJSON`', () => {
    class CustomError extends Error {
      constructor(value) {
        super('foo');
        this.name = this.constructor.name;
        this.value = value;
      }
    }
    const value = {
      amount: 20,
      toJSON() {
        return {
          amount: `$${this.amount}`,
        };
      },
    };
    const error = new CustomError(value);
    const serialized = serializeError(error);
    const {stack, ...rest} = serialized;
    assert.deepEqual(rest, {
      message: 'foo',
      name: 'CustomError',
      value: {
        amount: '$20',
      },
    });
    assert.notEqual(stack, undefined);
  });

  it('should serialize custom error with `.toJSON` defined with `serializeError`', () => {
    class CustomError extends Error {
      constructor() {
        super('foo');
        this.name = this.constructor.name;
        this.value = 30;
      }

      toJSON() {
        return serializeError(this);
      }
    }
    const error = new CustomError();
    const serialized = serializeError(error);
    const {stack, ...rest} = serialized;
    assert.deepEqual(rest, {
      message: 'foo',
      name: 'CustomError',
      value: 30,
    });
    assert.notEqual(stack, undefined);
  });

  it('should serialize properties up to `Options.maxDepth` levels deep', () => {
    const error = new Error('errorMessage');
    error.one = {two: {three: {}}};
    const {message, name, stack} = error;

    const levelZero = serializeError(error, {maxDepth: 0});
    assert.deepEqual(levelZero, {});

    const levelOne = serializeError(error, {maxDepth: 1});
    assert.deepEqual(levelOne, {message, name, stack, one: {}});

    const levelTwo = serializeError(error, {maxDepth: 2});
    assert.deepEqual(levelTwo, {message, name, stack, one: {two: {}}});

    const levelThree = serializeError(error, {maxDepth: 3});
    assert.deepEqual(levelThree, {message, name, stack, one: {two: {three: {}}}});
  });
  **/
});
