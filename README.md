# serialize-error-browser

[![Build Status](https://github.com/ayanamitech/serialize-error-browser/actions/workflows/test.yml/badge.svg)](https://github.com/ayanamitech/serialize-error-browser/actions)
[![NPM Package Version](https://img.shields.io/npm/v/serialize-error-browser.svg)](https://npmjs.org/package/serialize-error-browser)
[![NPM Package Downloads](https://img.shields.io/npm/dm/serialize-error-browser.svg)](https://npmjs.org/package/serialize-error-browser)
[![Known Vulnerabilities](https://snyk.io/test/github/ayanamitech/serialize-error-browser/badge.svg?style=flat-square)](https://snyk.io/test/github/ayanamitech/serialize-error-browser)
[![GitHub Views](https://img.shields.io/badge/dynamic/json?color=green&label=Views&query=uniques&url=https://github.com/ayanamitech/node-github-repo-stats/blob/main/data/ayanamitech/serialize-error-browser/views.json?raw=True&logo=github)](https://github.com/ayanamitech/serialize-error-browser)
[![GitHub Clones](https://img.shields.io/badge/dynamic/json?color=success&label=Clone&query=uniques&url=https://github.com/ayanamitech/node-github-repo-stats/blob/main/data/ayanamitech/serialize-error-browser/clone.json?raw=True&logo=github)](https://github.com/ayanamitech/serialize-error-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> Serialize/deserialize an error into a plain object, for Browser and Node.js environment

Supports `JSON.stringify()` or `process.send()` for any Errors from any Environment (Node.js & Browser)

Typescript port of [serialize-error](https://github.com/sindresorhus/serialize-error) with Browser support added by default

## Install

**Node.js**

```sh
npm install serialize-error-browser
```

**Browser**

```html
<script src="https://cdn.jsdelivr.net/npm/serialize-error-browser@latest"></script>
```

```html
<script src="https://unpkg.com/serialize-error-browser@latest"></script>
```

## Usage

```js
const {serializeError, deserializeError} = require('serialize-error-browser');

const error = new Error('🦄');

console.log(error);
//=> [Error: 🦄]

const serialized = serializeError(error);

console.log(serialized);
//=> {name: 'Error', message: '🦄', stack: 'Error: 🦄\n    at Object.<anonymous> …'}

const deserialized = deserializeError(serialized);

console.log(deserialized);
//=> [Error: 🦄]
```

## API

### serializeError(value, options?)

Type: `Error | unknown`

Serialize an `Error` object into a plain object.

- Non-error values are passed through.
- Custom properties are preserved.
- Non-enumerable properties are kept non-enumerable (name, message, stack).
- Enumerable properties are kept enumerable (all properties besides the non-enumerable ones).
- Buffer properties are replaced with `[object Buffer]`.
- Circular references are handled.
- If the input object has a `.toJSON()` method, then it's called instead of serializing the object's properties.
- It's up to `.toJSON()` implementation to handle circular references and enumerability of the properties.

`.toJSON` examples:

```js
const {serializeError} = require('serialize-error-browser');

class ErrorWithDate extends Error {
	constructor() {
		super();
		this.date = new Date();
	}
}

const error = new ErrorWithDate();

serializeError(error);
// => {date: '1970-01-01T00:00:00.000Z', name, message, stack}
```

```js
const {serializeError} = require('serialize-error-browser');

class ErrorWithToJSON extends Error {
	constructor() {
		super('🦄');
		this.date = new Date();
	}

	toJSON() {
		return serializeError(this);
	}
}

const error = new ErrorWithToJSON();

console.log(serializeError(error));
// => {date: '1970-01-01T00:00:00.000Z', message: '🦄', name, stack}
```

### deserializeError(value, options?)

Type: `{[key: string]: unknown} | unknown`

Deserialize a plain object or any value into an `Error` object.

- `Error` objects are passed through.
- Non-error values are wrapped in a `NonError` error.
- Custom properties are preserved.
- Non-enumerable properties are kept non-enumerable (name, message, stack).
- Enumerable properties are kept enumerable (all properties besides the non-enumerable ones).
- Circular references are handled.

### options

Type: `object`

#### maxDepth

Type: `number`\
Default: `Number.POSITIVE_INFINITY`

The maximum depth of properties to preserve when serializing/deserializing.

```js
const {serializeError} = require('serialize-error-browser');

const error = new Error('🦄');
error.one = {two: {three: {}}};

console.log(serializeError(error, {maxDepth: 1}));
//=> {name: 'Error', message: '…', one: {}}

console.log(serializeError(error, {maxDepth: 2}));
//=> {name: 'Error', message: '…', one: { two: {}}}
```
