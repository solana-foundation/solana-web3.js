var solanaWeb3 = (function (exports) {
	'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var buffer = {};

	var base64Js = {};

	var hasRequiredBase64Js;

	function requireBase64Js () {
		if (hasRequiredBase64Js) return base64Js;
		hasRequiredBase64Js = 1;

		base64Js.byteLength = byteLength;
		base64Js.toByteArray = toByteArray;
		base64Js.fromByteArray = fromByteArray;

		var lookup = [];
		var revLookup = [];
		var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

		var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		for (var i = 0, len = code.length; i < len; ++i) {
		  lookup[i] = code[i];
		  revLookup[code.charCodeAt(i)] = i;
		}

		// Support decoding URL-safe base64 strings, as Node.js does.
		// See: https://en.wikipedia.org/wiki/Base64#URL_applications
		revLookup['-'.charCodeAt(0)] = 62;
		revLookup['_'.charCodeAt(0)] = 63;

		function getLens (b64) {
		  var len = b64.length;

		  if (len % 4 > 0) {
		    throw new Error('Invalid string. Length must be a multiple of 4')
		  }

		  // Trim off extra bytes after placeholder bytes are found
		  // See: https://github.com/beatgammit/base64-js/issues/42
		  var validLen = b64.indexOf('=');
		  if (validLen === -1) validLen = len;

		  var placeHoldersLen = validLen === len
		    ? 0
		    : 4 - (validLen % 4);

		  return [validLen, placeHoldersLen]
		}

		// base64 is 4/3 + up to two characters of the original data
		function byteLength (b64) {
		  var lens = getLens(b64);
		  var validLen = lens[0];
		  var placeHoldersLen = lens[1];
		  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
		}

		function _byteLength (b64, validLen, placeHoldersLen) {
		  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
		}

		function toByteArray (b64) {
		  var tmp;
		  var lens = getLens(b64);
		  var validLen = lens[0];
		  var placeHoldersLen = lens[1];

		  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

		  var curByte = 0;

		  // if there are placeholders, only get up to the last complete 4 chars
		  var len = placeHoldersLen > 0
		    ? validLen - 4
		    : validLen;

		  var i;
		  for (i = 0; i < len; i += 4) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 18) |
		      (revLookup[b64.charCodeAt(i + 1)] << 12) |
		      (revLookup[b64.charCodeAt(i + 2)] << 6) |
		      revLookup[b64.charCodeAt(i + 3)];
		    arr[curByte++] = (tmp >> 16) & 0xFF;
		    arr[curByte++] = (tmp >> 8) & 0xFF;
		    arr[curByte++] = tmp & 0xFF;
		  }

		  if (placeHoldersLen === 2) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 2) |
		      (revLookup[b64.charCodeAt(i + 1)] >> 4);
		    arr[curByte++] = tmp & 0xFF;
		  }

		  if (placeHoldersLen === 1) {
		    tmp =
		      (revLookup[b64.charCodeAt(i)] << 10) |
		      (revLookup[b64.charCodeAt(i + 1)] << 4) |
		      (revLookup[b64.charCodeAt(i + 2)] >> 2);
		    arr[curByte++] = (tmp >> 8) & 0xFF;
		    arr[curByte++] = tmp & 0xFF;
		  }

		  return arr
		}

		function tripletToBase64 (num) {
		  return lookup[num >> 18 & 0x3F] +
		    lookup[num >> 12 & 0x3F] +
		    lookup[num >> 6 & 0x3F] +
		    lookup[num & 0x3F]
		}

		function encodeChunk (uint8, start, end) {
		  var tmp;
		  var output = [];
		  for (var i = start; i < end; i += 3) {
		    tmp =
		      ((uint8[i] << 16) & 0xFF0000) +
		      ((uint8[i + 1] << 8) & 0xFF00) +
		      (uint8[i + 2] & 0xFF);
		    output.push(tripletToBase64(tmp));
		  }
		  return output.join('')
		}

		function fromByteArray (uint8) {
		  var tmp;
		  var len = uint8.length;
		  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
		  var parts = [];
		  var maxChunkLength = 16383; // must be multiple of 3

		  // go through the array every three bytes, we'll deal with trailing stuff later
		  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
		    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
		  }

		  // pad the end with zeros, but make sure to not forget the extra bytes
		  if (extraBytes === 1) {
		    tmp = uint8[len - 1];
		    parts.push(
		      lookup[tmp >> 2] +
		      lookup[(tmp << 4) & 0x3F] +
		      '=='
		    );
		  } else if (extraBytes === 2) {
		    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
		    parts.push(
		      lookup[tmp >> 10] +
		      lookup[(tmp >> 4) & 0x3F] +
		      lookup[(tmp << 2) & 0x3F] +
		      '='
		    );
		  }

		  return parts.join('')
		}
		return base64Js;
	}

	var ieee754 = {};

	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

	var hasRequiredIeee754;

	function requireIeee754 () {
		if (hasRequiredIeee754) return ieee754;
		hasRequiredIeee754 = 1;
		ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
		  var e, m;
		  var eLen = (nBytes * 8) - mLen - 1;
		  var eMax = (1 << eLen) - 1;
		  var eBias = eMax >> 1;
		  var nBits = -7;
		  var i = isLE ? (nBytes - 1) : 0;
		  var d = isLE ? -1 : 1;
		  var s = buffer[offset + i];

		  i += d;

		  e = s & ((1 << (-nBits)) - 1);
		  s >>= (-nBits);
		  nBits += eLen;
		  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

		  m = e & ((1 << (-nBits)) - 1);
		  e >>= (-nBits);
		  nBits += mLen;
		  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

		  if (e === 0) {
		    e = 1 - eBias;
		  } else if (e === eMax) {
		    return m ? NaN : ((s ? -1 : 1) * Infinity)
		  } else {
		    m = m + Math.pow(2, mLen);
		    e = e - eBias;
		  }
		  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
		};

		ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
		  var e, m, c;
		  var eLen = (nBytes * 8) - mLen - 1;
		  var eMax = (1 << eLen) - 1;
		  var eBias = eMax >> 1;
		  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
		  var i = isLE ? 0 : (nBytes - 1);
		  var d = isLE ? 1 : -1;
		  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

		  value = Math.abs(value);

		  if (isNaN(value) || value === Infinity) {
		    m = isNaN(value) ? 1 : 0;
		    e = eMax;
		  } else {
		    e = Math.floor(Math.log(value) / Math.LN2);
		    if (value * (c = Math.pow(2, -e)) < 1) {
		      e--;
		      c *= 2;
		    }
		    if (e + eBias >= 1) {
		      value += rt / c;
		    } else {
		      value += rt * Math.pow(2, 1 - eBias);
		    }
		    if (value * c >= 2) {
		      e++;
		      c /= 2;
		    }

		    if (e + eBias >= eMax) {
		      m = 0;
		      e = eMax;
		    } else if (e + eBias >= 1) {
		      m = ((value * c) - 1) * Math.pow(2, mLen);
		      e = e + eBias;
		    } else {
		      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
		      e = 0;
		    }
		  }

		  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

		  e = (e << mLen) | m;
		  eLen += mLen;
		  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

		  buffer[offset + i - d] |= s * 128;
		};
		return ieee754;
	}

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */

	var hasRequiredBuffer;

	function requireBuffer () {
		if (hasRequiredBuffer) return buffer;
		hasRequiredBuffer = 1;
		(function (exports) {

			const base64 = /*@__PURE__*/ requireBase64Js();
			const ieee754 = /*@__PURE__*/ requireIeee754();
			const customInspectSymbol =
			  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
			    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
			    : null;

			exports.Buffer = Buffer;
			exports.SlowBuffer = SlowBuffer;
			exports.INSPECT_MAX_BYTES = 50;

			const K_MAX_LENGTH = 0x7fffffff;
			exports.kMaxLength = K_MAX_LENGTH;

			/**
			 * If `Buffer.TYPED_ARRAY_SUPPORT`:
			 *   === true    Use Uint8Array implementation (fastest)
			 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
			 *               implementation (most compatible, even IE6)
			 *
			 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
			 * Opera 11.6+, iOS 4.2+.
			 *
			 * We report that the browser does not support typed arrays if the are not subclassable
			 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
			 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
			 * for __proto__ and has a buggy typed array implementation.
			 */
			Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

			if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
			    typeof console.error === 'function') {
			  console.error(
			    'This browser lacks typed array (Uint8Array) support which is required by ' +
			    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
			  );
			}

			function typedArraySupport () {
			  // Can typed array instances can be augmented?
			  try {
			    const arr = new Uint8Array(1);
			    const proto = { foo: function () { return 42 } };
			    Object.setPrototypeOf(proto, Uint8Array.prototype);
			    Object.setPrototypeOf(arr, proto);
			    return arr.foo() === 42
			  } catch (e) {
			    return false
			  }
			}

			Object.defineProperty(Buffer.prototype, 'parent', {
			  enumerable: true,
			  get: function () {
			    if (!Buffer.isBuffer(this)) return undefined
			    return this.buffer
			  }
			});

			Object.defineProperty(Buffer.prototype, 'offset', {
			  enumerable: true,
			  get: function () {
			    if (!Buffer.isBuffer(this)) return undefined
			    return this.byteOffset
			  }
			});

			function createBuffer (length) {
			  if (length > K_MAX_LENGTH) {
			    throw new RangeError('The value "' + length + '" is invalid for option "size"')
			  }
			  // Return an augmented `Uint8Array` instance
			  const buf = new Uint8Array(length);
			  Object.setPrototypeOf(buf, Buffer.prototype);
			  return buf
			}

			/**
			 * The Buffer constructor returns instances of `Uint8Array` that have their
			 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
			 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
			 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
			 * returns a single octet.
			 *
			 * The `Uint8Array` prototype remains unmodified.
			 */

			function Buffer (arg, encodingOrOffset, length) {
			  // Common case.
			  if (typeof arg === 'number') {
			    if (typeof encodingOrOffset === 'string') {
			      throw new TypeError(
			        'The "string" argument must be of type string. Received type number'
			      )
			    }
			    return allocUnsafe(arg)
			  }
			  return from(arg, encodingOrOffset, length)
			}

			Buffer.poolSize = 8192; // not used by this implementation

			function from (value, encodingOrOffset, length) {
			  if (typeof value === 'string') {
			    return fromString(value, encodingOrOffset)
			  }

			  if (ArrayBuffer.isView(value)) {
			    return fromArrayView(value)
			  }

			  if (value == null) {
			    throw new TypeError(
			      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
			      'or Array-like Object. Received type ' + (typeof value)
			    )
			  }

			  if (isInstance(value, ArrayBuffer) ||
			      (value && isInstance(value.buffer, ArrayBuffer))) {
			    return fromArrayBuffer(value, encodingOrOffset, length)
			  }

			  if (typeof SharedArrayBuffer !== 'undefined' &&
			      (isInstance(value, SharedArrayBuffer) ||
			      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
			    return fromArrayBuffer(value, encodingOrOffset, length)
			  }

			  if (typeof value === 'number') {
			    throw new TypeError(
			      'The "value" argument must not be of type number. Received type number'
			    )
			  }

			  const valueOf = value.valueOf && value.valueOf();
			  if (valueOf != null && valueOf !== value) {
			    return Buffer.from(valueOf, encodingOrOffset, length)
			  }

			  const b = fromObject(value);
			  if (b) return b

			  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
			      typeof value[Symbol.toPrimitive] === 'function') {
			    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
			  }

			  throw new TypeError(
			    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
			    'or Array-like Object. Received type ' + (typeof value)
			  )
			}

			/**
			 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
			 * if value is a number.
			 * Buffer.from(str[, encoding])
			 * Buffer.from(array)
			 * Buffer.from(buffer)
			 * Buffer.from(arrayBuffer[, byteOffset[, length]])
			 **/
			Buffer.from = function (value, encodingOrOffset, length) {
			  return from(value, encodingOrOffset, length)
			};

			// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
			// https://github.com/feross/buffer/pull/148
			Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
			Object.setPrototypeOf(Buffer, Uint8Array);

			function assertSize (size) {
			  if (typeof size !== 'number') {
			    throw new TypeError('"size" argument must be of type number')
			  } else if (size < 0) {
			    throw new RangeError('The value "' + size + '" is invalid for option "size"')
			  }
			}

			function alloc (size, fill, encoding) {
			  assertSize(size);
			  if (size <= 0) {
			    return createBuffer(size)
			  }
			  if (fill !== undefined) {
			    // Only pay attention to encoding if it's a string. This
			    // prevents accidentally sending in a number that would
			    // be interpreted as a start offset.
			    return typeof encoding === 'string'
			      ? createBuffer(size).fill(fill, encoding)
			      : createBuffer(size).fill(fill)
			  }
			  return createBuffer(size)
			}

			/**
			 * Creates a new filled Buffer instance.
			 * alloc(size[, fill[, encoding]])
			 **/
			Buffer.alloc = function (size, fill, encoding) {
			  return alloc(size, fill, encoding)
			};

			function allocUnsafe (size) {
			  assertSize(size);
			  return createBuffer(size < 0 ? 0 : checked(size) | 0)
			}

			/**
			 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
			 * */
			Buffer.allocUnsafe = function (size) {
			  return allocUnsafe(size)
			};
			/**
			 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
			 */
			Buffer.allocUnsafeSlow = function (size) {
			  return allocUnsafe(size)
			};

			function fromString (string, encoding) {
			  if (typeof encoding !== 'string' || encoding === '') {
			    encoding = 'utf8';
			  }

			  if (!Buffer.isEncoding(encoding)) {
			    throw new TypeError('Unknown encoding: ' + encoding)
			  }

			  const length = byteLength(string, encoding) | 0;
			  let buf = createBuffer(length);

			  const actual = buf.write(string, encoding);

			  if (actual !== length) {
			    // Writing a hex string, for example, that contains invalid characters will
			    // cause everything after the first invalid character to be ignored. (e.g.
			    // 'abxxcd' will be treated as 'ab')
			    buf = buf.slice(0, actual);
			  }

			  return buf
			}

			function fromArrayLike (array) {
			  const length = array.length < 0 ? 0 : checked(array.length) | 0;
			  const buf = createBuffer(length);
			  for (let i = 0; i < length; i += 1) {
			    buf[i] = array[i] & 255;
			  }
			  return buf
			}

			function fromArrayView (arrayView) {
			  if (isInstance(arrayView, Uint8Array)) {
			    const copy = new Uint8Array(arrayView);
			    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
			  }
			  return fromArrayLike(arrayView)
			}

			function fromArrayBuffer (array, byteOffset, length) {
			  if (byteOffset < 0 || array.byteLength < byteOffset) {
			    throw new RangeError('"offset" is outside of buffer bounds')
			  }

			  if (array.byteLength < byteOffset + (length || 0)) {
			    throw new RangeError('"length" is outside of buffer bounds')
			  }

			  let buf;
			  if (byteOffset === undefined && length === undefined) {
			    buf = new Uint8Array(array);
			  } else if (length === undefined) {
			    buf = new Uint8Array(array, byteOffset);
			  } else {
			    buf = new Uint8Array(array, byteOffset, length);
			  }

			  // Return an augmented `Uint8Array` instance
			  Object.setPrototypeOf(buf, Buffer.prototype);

			  return buf
			}

			function fromObject (obj) {
			  if (Buffer.isBuffer(obj)) {
			    const len = checked(obj.length) | 0;
			    const buf = createBuffer(len);

			    if (buf.length === 0) {
			      return buf
			    }

			    obj.copy(buf, 0, 0, len);
			    return buf
			  }

			  if (obj.length !== undefined) {
			    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
			      return createBuffer(0)
			    }
			    return fromArrayLike(obj)
			  }

			  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
			    return fromArrayLike(obj.data)
			  }
			}

			function checked (length) {
			  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
			  // length is NaN (which is otherwise coerced to zero.)
			  if (length >= K_MAX_LENGTH) {
			    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
			                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
			  }
			  return length | 0
			}

			function SlowBuffer (length) {
			  if (+length != length) { // eslint-disable-line eqeqeq
			    length = 0;
			  }
			  return Buffer.alloc(+length)
			}

			Buffer.isBuffer = function isBuffer (b) {
			  return b != null && b._isBuffer === true &&
			    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
			};

			Buffer.compare = function compare (a, b) {
			  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
			  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
			  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
			    throw new TypeError(
			      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
			    )
			  }

			  if (a === b) return 0

			  let x = a.length;
			  let y = b.length;

			  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
			    if (a[i] !== b[i]) {
			      x = a[i];
			      y = b[i];
			      break
			    }
			  }

			  if (x < y) return -1
			  if (y < x) return 1
			  return 0
			};

			Buffer.isEncoding = function isEncoding (encoding) {
			  switch (String(encoding).toLowerCase()) {
			    case 'hex':
			    case 'utf8':
			    case 'utf-8':
			    case 'ascii':
			    case 'latin1':
			    case 'binary':
			    case 'base64':
			    case 'ucs2':
			    case 'ucs-2':
			    case 'utf16le':
			    case 'utf-16le':
			      return true
			    default:
			      return false
			  }
			};

			Buffer.concat = function concat (list, length) {
			  if (!Array.isArray(list)) {
			    throw new TypeError('"list" argument must be an Array of Buffers')
			  }

			  if (list.length === 0) {
			    return Buffer.alloc(0)
			  }

			  let i;
			  if (length === undefined) {
			    length = 0;
			    for (i = 0; i < list.length; ++i) {
			      length += list[i].length;
			    }
			  }

			  const buffer = Buffer.allocUnsafe(length);
			  let pos = 0;
			  for (i = 0; i < list.length; ++i) {
			    let buf = list[i];
			    if (isInstance(buf, Uint8Array)) {
			      if (pos + buf.length > buffer.length) {
			        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
			        buf.copy(buffer, pos);
			      } else {
			        Uint8Array.prototype.set.call(
			          buffer,
			          buf,
			          pos
			        );
			      }
			    } else if (!Buffer.isBuffer(buf)) {
			      throw new TypeError('"list" argument must be an Array of Buffers')
			    } else {
			      buf.copy(buffer, pos);
			    }
			    pos += buf.length;
			  }
			  return buffer
			};

			function byteLength (string, encoding) {
			  if (Buffer.isBuffer(string)) {
			    return string.length
			  }
			  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
			    return string.byteLength
			  }
			  if (typeof string !== 'string') {
			    throw new TypeError(
			      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
			      'Received type ' + typeof string
			    )
			  }

			  const len = string.length;
			  const mustMatch = (arguments.length > 2 && arguments[2] === true);
			  if (!mustMatch && len === 0) return 0

			  // Use a for loop to avoid recursion
			  let loweredCase = false;
			  for (;;) {
			    switch (encoding) {
			      case 'ascii':
			      case 'latin1':
			      case 'binary':
			        return len
			      case 'utf8':
			      case 'utf-8':
			        return utf8ToBytes(string).length
			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return len * 2
			      case 'hex':
			        return len >>> 1
			      case 'base64':
			        return base64ToBytes(string).length
			      default:
			        if (loweredCase) {
			          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
			        }
			        encoding = ('' + encoding).toLowerCase();
			        loweredCase = true;
			    }
			  }
			}
			Buffer.byteLength = byteLength;

			function slowToString (encoding, start, end) {
			  let loweredCase = false;

			  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
			  // property of a typed array.

			  // This behaves neither like String nor Uint8Array in that we set start/end
			  // to their upper/lower bounds if the value passed is out of range.
			  // undefined is handled specially as per ECMA-262 6th Edition,
			  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
			  if (start === undefined || start < 0) {
			    start = 0;
			  }
			  // Return early if start > this.length. Done here to prevent potential uint32
			  // coercion fail below.
			  if (start > this.length) {
			    return ''
			  }

			  if (end === undefined || end > this.length) {
			    end = this.length;
			  }

			  if (end <= 0) {
			    return ''
			  }

			  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
			  end >>>= 0;
			  start >>>= 0;

			  if (end <= start) {
			    return ''
			  }

			  if (!encoding) encoding = 'utf8';

			  while (true) {
			    switch (encoding) {
			      case 'hex':
			        return hexSlice(this, start, end)

			      case 'utf8':
			      case 'utf-8':
			        return utf8Slice(this, start, end)

			      case 'ascii':
			        return asciiSlice(this, start, end)

			      case 'latin1':
			      case 'binary':
			        return latin1Slice(this, start, end)

			      case 'base64':
			        return base64Slice(this, start, end)

			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return utf16leSlice(this, start, end)

			      default:
			        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
			        encoding = (encoding + '').toLowerCase();
			        loweredCase = true;
			    }
			  }
			}

			// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
			// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
			// reliably in a browserify context because there could be multiple different
			// copies of the 'buffer' package in use. This method works even for Buffer
			// instances that were created from another copy of the `buffer` package.
			// See: https://github.com/feross/buffer/issues/154
			Buffer.prototype._isBuffer = true;

			function swap (b, n, m) {
			  const i = b[n];
			  b[n] = b[m];
			  b[m] = i;
			}

			Buffer.prototype.swap16 = function swap16 () {
			  const len = this.length;
			  if (len % 2 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 16-bits')
			  }
			  for (let i = 0; i < len; i += 2) {
			    swap(this, i, i + 1);
			  }
			  return this
			};

			Buffer.prototype.swap32 = function swap32 () {
			  const len = this.length;
			  if (len % 4 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 32-bits')
			  }
			  for (let i = 0; i < len; i += 4) {
			    swap(this, i, i + 3);
			    swap(this, i + 1, i + 2);
			  }
			  return this
			};

			Buffer.prototype.swap64 = function swap64 () {
			  const len = this.length;
			  if (len % 8 !== 0) {
			    throw new RangeError('Buffer size must be a multiple of 64-bits')
			  }
			  for (let i = 0; i < len; i += 8) {
			    swap(this, i, i + 7);
			    swap(this, i + 1, i + 6);
			    swap(this, i + 2, i + 5);
			    swap(this, i + 3, i + 4);
			  }
			  return this
			};

			Buffer.prototype.toString = function toString () {
			  const length = this.length;
			  if (length === 0) return ''
			  if (arguments.length === 0) return utf8Slice(this, 0, length)
			  return slowToString.apply(this, arguments)
			};

			Buffer.prototype.toLocaleString = Buffer.prototype.toString;

			Buffer.prototype.equals = function equals (b) {
			  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
			  if (this === b) return true
			  return Buffer.compare(this, b) === 0
			};

			Buffer.prototype.inspect = function inspect () {
			  let str = '';
			  const max = exports.INSPECT_MAX_BYTES;
			  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
			  if (this.length > max) str += ' ... ';
			  return '<Buffer ' + str + '>'
			};
			if (customInspectSymbol) {
			  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
			}

			Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
			  if (isInstance(target, Uint8Array)) {
			    target = Buffer.from(target, target.offset, target.byteLength);
			  }
			  if (!Buffer.isBuffer(target)) {
			    throw new TypeError(
			      'The "target" argument must be one of type Buffer or Uint8Array. ' +
			      'Received type ' + (typeof target)
			    )
			  }

			  if (start === undefined) {
			    start = 0;
			  }
			  if (end === undefined) {
			    end = target ? target.length : 0;
			  }
			  if (thisStart === undefined) {
			    thisStart = 0;
			  }
			  if (thisEnd === undefined) {
			    thisEnd = this.length;
			  }

			  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
			    throw new RangeError('out of range index')
			  }

			  if (thisStart >= thisEnd && start >= end) {
			    return 0
			  }
			  if (thisStart >= thisEnd) {
			    return -1
			  }
			  if (start >= end) {
			    return 1
			  }

			  start >>>= 0;
			  end >>>= 0;
			  thisStart >>>= 0;
			  thisEnd >>>= 0;

			  if (this === target) return 0

			  let x = thisEnd - thisStart;
			  let y = end - start;
			  const len = Math.min(x, y);

			  const thisCopy = this.slice(thisStart, thisEnd);
			  const targetCopy = target.slice(start, end);

			  for (let i = 0; i < len; ++i) {
			    if (thisCopy[i] !== targetCopy[i]) {
			      x = thisCopy[i];
			      y = targetCopy[i];
			      break
			    }
			  }

			  if (x < y) return -1
			  if (y < x) return 1
			  return 0
			};

			// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
			// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
			//
			// Arguments:
			// - buffer - a Buffer to search
			// - val - a string, Buffer, or number
			// - byteOffset - an index into `buffer`; will be clamped to an int32
			// - encoding - an optional encoding, relevant is val is a string
			// - dir - true for indexOf, false for lastIndexOf
			function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
			  // Empty buffer means no match
			  if (buffer.length === 0) return -1

			  // Normalize byteOffset
			  if (typeof byteOffset === 'string') {
			    encoding = byteOffset;
			    byteOffset = 0;
			  } else if (byteOffset > 0x7fffffff) {
			    byteOffset = 0x7fffffff;
			  } else if (byteOffset < -0x80000000) {
			    byteOffset = -0x80000000;
			  }
			  byteOffset = +byteOffset; // Coerce to Number.
			  if (numberIsNaN(byteOffset)) {
			    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
			    byteOffset = dir ? 0 : (buffer.length - 1);
			  }

			  // Normalize byteOffset: negative offsets start from the end of the buffer
			  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
			  if (byteOffset >= buffer.length) {
			    if (dir) return -1
			    else byteOffset = buffer.length - 1;
			  } else if (byteOffset < 0) {
			    if (dir) byteOffset = 0;
			    else return -1
			  }

			  // Normalize val
			  if (typeof val === 'string') {
			    val = Buffer.from(val, encoding);
			  }

			  // Finally, search either indexOf (if dir is true) or lastIndexOf
			  if (Buffer.isBuffer(val)) {
			    // Special case: looking for empty string/buffer always fails
			    if (val.length === 0) {
			      return -1
			    }
			    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
			  } else if (typeof val === 'number') {
			    val = val & 0xFF; // Search for a byte value [0-255]
			    if (typeof Uint8Array.prototype.indexOf === 'function') {
			      if (dir) {
			        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
			      } else {
			        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
			      }
			    }
			    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
			  }

			  throw new TypeError('val must be string, number or Buffer')
			}

			function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
			  let indexSize = 1;
			  let arrLength = arr.length;
			  let valLength = val.length;

			  if (encoding !== undefined) {
			    encoding = String(encoding).toLowerCase();
			    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
			        encoding === 'utf16le' || encoding === 'utf-16le') {
			      if (arr.length < 2 || val.length < 2) {
			        return -1
			      }
			      indexSize = 2;
			      arrLength /= 2;
			      valLength /= 2;
			      byteOffset /= 2;
			    }
			  }

			  function read (buf, i) {
			    if (indexSize === 1) {
			      return buf[i]
			    } else {
			      return buf.readUInt16BE(i * indexSize)
			    }
			  }

			  let i;
			  if (dir) {
			    let foundIndex = -1;
			    for (i = byteOffset; i < arrLength; i++) {
			      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
			        if (foundIndex === -1) foundIndex = i;
			        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
			      } else {
			        if (foundIndex !== -1) i -= i - foundIndex;
			        foundIndex = -1;
			      }
			    }
			  } else {
			    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
			    for (i = byteOffset; i >= 0; i--) {
			      let found = true;
			      for (let j = 0; j < valLength; j++) {
			        if (read(arr, i + j) !== read(val, j)) {
			          found = false;
			          break
			        }
			      }
			      if (found) return i
			    }
			  }

			  return -1
			}

			Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
			  return this.indexOf(val, byteOffset, encoding) !== -1
			};

			Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
			  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
			};

			Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
			  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
			};

			function hexWrite (buf, string, offset, length) {
			  offset = Number(offset) || 0;
			  const remaining = buf.length - offset;
			  if (!length) {
			    length = remaining;
			  } else {
			    length = Number(length);
			    if (length > remaining) {
			      length = remaining;
			    }
			  }

			  const strLen = string.length;

			  if (length > strLen / 2) {
			    length = strLen / 2;
			  }
			  let i;
			  for (i = 0; i < length; ++i) {
			    const parsed = parseInt(string.substr(i * 2, 2), 16);
			    if (numberIsNaN(parsed)) return i
			    buf[offset + i] = parsed;
			  }
			  return i
			}

			function utf8Write (buf, string, offset, length) {
			  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
			}

			function asciiWrite (buf, string, offset, length) {
			  return blitBuffer(asciiToBytes(string), buf, offset, length)
			}

			function base64Write (buf, string, offset, length) {
			  return blitBuffer(base64ToBytes(string), buf, offset, length)
			}

			function ucs2Write (buf, string, offset, length) {
			  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
			}

			Buffer.prototype.write = function write (string, offset, length, encoding) {
			  // Buffer#write(string)
			  if (offset === undefined) {
			    encoding = 'utf8';
			    length = this.length;
			    offset = 0;
			  // Buffer#write(string, encoding)
			  } else if (length === undefined && typeof offset === 'string') {
			    encoding = offset;
			    length = this.length;
			    offset = 0;
			  // Buffer#write(string, offset[, length][, encoding])
			  } else if (isFinite(offset)) {
			    offset = offset >>> 0;
			    if (isFinite(length)) {
			      length = length >>> 0;
			      if (encoding === undefined) encoding = 'utf8';
			    } else {
			      encoding = length;
			      length = undefined;
			    }
			  } else {
			    throw new Error(
			      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
			    )
			  }

			  const remaining = this.length - offset;
			  if (length === undefined || length > remaining) length = remaining;

			  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
			    throw new RangeError('Attempt to write outside buffer bounds')
			  }

			  if (!encoding) encoding = 'utf8';

			  let loweredCase = false;
			  for (;;) {
			    switch (encoding) {
			      case 'hex':
			        return hexWrite(this, string, offset, length)

			      case 'utf8':
			      case 'utf-8':
			        return utf8Write(this, string, offset, length)

			      case 'ascii':
			      case 'latin1':
			      case 'binary':
			        return asciiWrite(this, string, offset, length)

			      case 'base64':
			        // Warning: maxLength not taken into account in base64Write
			        return base64Write(this, string, offset, length)

			      case 'ucs2':
			      case 'ucs-2':
			      case 'utf16le':
			      case 'utf-16le':
			        return ucs2Write(this, string, offset, length)

			      default:
			        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
			        encoding = ('' + encoding).toLowerCase();
			        loweredCase = true;
			    }
			  }
			};

			Buffer.prototype.toJSON = function toJSON () {
			  return {
			    type: 'Buffer',
			    data: Array.prototype.slice.call(this._arr || this, 0)
			  }
			};

			function base64Slice (buf, start, end) {
			  if (start === 0 && end === buf.length) {
			    return base64.fromByteArray(buf)
			  } else {
			    return base64.fromByteArray(buf.slice(start, end))
			  }
			}

			function utf8Slice (buf, start, end) {
			  end = Math.min(buf.length, end);
			  const res = [];

			  let i = start;
			  while (i < end) {
			    const firstByte = buf[i];
			    let codePoint = null;
			    let bytesPerSequence = (firstByte > 0xEF)
			      ? 4
			      : (firstByte > 0xDF)
			          ? 3
			          : (firstByte > 0xBF)
			              ? 2
			              : 1;

			    if (i + bytesPerSequence <= end) {
			      let secondByte, thirdByte, fourthByte, tempCodePoint;

			      switch (bytesPerSequence) {
			        case 1:
			          if (firstByte < 0x80) {
			            codePoint = firstByte;
			          }
			          break
			        case 2:
			          secondByte = buf[i + 1];
			          if ((secondByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
			            if (tempCodePoint > 0x7F) {
			              codePoint = tempCodePoint;
			            }
			          }
			          break
			        case 3:
			          secondByte = buf[i + 1];
			          thirdByte = buf[i + 2];
			          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
			            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
			              codePoint = tempCodePoint;
			            }
			          }
			          break
			        case 4:
			          secondByte = buf[i + 1];
			          thirdByte = buf[i + 2];
			          fourthByte = buf[i + 3];
			          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
			            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
			            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
			              codePoint = tempCodePoint;
			            }
			          }
			      }
			    }

			    if (codePoint === null) {
			      // we did not generate a valid codePoint so insert a
			      // replacement char (U+FFFD) and advance only 1 byte
			      codePoint = 0xFFFD;
			      bytesPerSequence = 1;
			    } else if (codePoint > 0xFFFF) {
			      // encode to utf16 (surrogate pair dance)
			      codePoint -= 0x10000;
			      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
			      codePoint = 0xDC00 | codePoint & 0x3FF;
			    }

			    res.push(codePoint);
			    i += bytesPerSequence;
			  }

			  return decodeCodePointsArray(res)
			}

			// Based on http://stackoverflow.com/a/22747272/680742, the browser with
			// the lowest limit is Chrome, with 0x10000 args.
			// We go 1 magnitude less, for safety
			const MAX_ARGUMENTS_LENGTH = 0x1000;

			function decodeCodePointsArray (codePoints) {
			  const len = codePoints.length;
			  if (len <= MAX_ARGUMENTS_LENGTH) {
			    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
			  }

			  // Decode in chunks to avoid "call stack size exceeded".
			  let res = '';
			  let i = 0;
			  while (i < len) {
			    res += String.fromCharCode.apply(
			      String,
			      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
			    );
			  }
			  return res
			}

			function asciiSlice (buf, start, end) {
			  let ret = '';
			  end = Math.min(buf.length, end);

			  for (let i = start; i < end; ++i) {
			    ret += String.fromCharCode(buf[i] & 0x7F);
			  }
			  return ret
			}

			function latin1Slice (buf, start, end) {
			  let ret = '';
			  end = Math.min(buf.length, end);

			  for (let i = start; i < end; ++i) {
			    ret += String.fromCharCode(buf[i]);
			  }
			  return ret
			}

			function hexSlice (buf, start, end) {
			  const len = buf.length;

			  if (!start || start < 0) start = 0;
			  if (!end || end < 0 || end > len) end = len;

			  let out = '';
			  for (let i = start; i < end; ++i) {
			    out += hexSliceLookupTable[buf[i]];
			  }
			  return out
			}

			function utf16leSlice (buf, start, end) {
			  const bytes = buf.slice(start, end);
			  let res = '';
			  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
			  for (let i = 0; i < bytes.length - 1; i += 2) {
			    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
			  }
			  return res
			}

			Buffer.prototype.slice = function slice (start, end) {
			  const len = this.length;
			  start = ~~start;
			  end = end === undefined ? len : ~~end;

			  if (start < 0) {
			    start += len;
			    if (start < 0) start = 0;
			  } else if (start > len) {
			    start = len;
			  }

			  if (end < 0) {
			    end += len;
			    if (end < 0) end = 0;
			  } else if (end > len) {
			    end = len;
			  }

			  if (end < start) end = start;

			  const newBuf = this.subarray(start, end);
			  // Return an augmented `Uint8Array` instance
			  Object.setPrototypeOf(newBuf, Buffer.prototype);

			  return newBuf
			};

			/*
			 * Need to make sure that buffer isn't trying to write out of bounds.
			 */
			function checkOffset (offset, ext, length) {
			  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
			  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
			}

			Buffer.prototype.readUintLE =
			Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let val = this[offset];
			  let mul = 1;
			  let i = 0;
			  while (++i < byteLength && (mul *= 0x100)) {
			    val += this[offset + i] * mul;
			  }

			  return val
			};

			Buffer.prototype.readUintBE =
			Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    checkOffset(offset, byteLength, this.length);
			  }

			  let val = this[offset + --byteLength];
			  let mul = 1;
			  while (byteLength > 0 && (mul *= 0x100)) {
			    val += this[offset + --byteLength] * mul;
			  }

			  return val
			};

			Buffer.prototype.readUint8 =
			Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 1, this.length);
			  return this[offset]
			};

			Buffer.prototype.readUint16LE =
			Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  return this[offset] | (this[offset + 1] << 8)
			};

			Buffer.prototype.readUint16BE =
			Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  return (this[offset] << 8) | this[offset + 1]
			};

			Buffer.prototype.readUint32LE =
			Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return ((this[offset]) |
			      (this[offset + 1] << 8) |
			      (this[offset + 2] << 16)) +
			      (this[offset + 3] * 0x1000000)
			};

			Buffer.prototype.readUint32BE =
			Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset] * 0x1000000) +
			    ((this[offset + 1] << 16) |
			    (this[offset + 2] << 8) |
			    this[offset + 3])
			};

			Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const lo = first +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 24;

			  const hi = this[++offset] +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    last * 2 ** 24;

			  return BigInt(lo) + (BigInt(hi) << BigInt(32))
			});

			Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const hi = first * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    this[++offset];

			  const lo = this[++offset] * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    last;

			  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
			});

			Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let val = this[offset];
			  let mul = 1;
			  let i = 0;
			  while (++i < byteLength && (mul *= 0x100)) {
			    val += this[offset + i] * mul;
			  }
			  mul *= 0x80;

			  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

			  return val
			};

			Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) checkOffset(offset, byteLength, this.length);

			  let i = byteLength;
			  let mul = 1;
			  let val = this[offset + --i];
			  while (i > 0 && (mul *= 0x100)) {
			    val += this[offset + --i] * mul;
			  }
			  mul *= 0x80;

			  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

			  return val
			};

			Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 1, this.length);
			  if (!(this[offset] & 0x80)) return (this[offset])
			  return ((0xff - this[offset] + 1) * -1)
			};

			Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  const val = this[offset] | (this[offset + 1] << 8);
			  return (val & 0x8000) ? val | 0xFFFF0000 : val
			};

			Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 2, this.length);
			  const val = this[offset + 1] | (this[offset] << 8);
			  return (val & 0x8000) ? val | 0xFFFF0000 : val
			};

			Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset]) |
			    (this[offset + 1] << 8) |
			    (this[offset + 2] << 16) |
			    (this[offset + 3] << 24)
			};

			Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);

			  return (this[offset] << 24) |
			    (this[offset + 1] << 16) |
			    (this[offset + 2] << 8) |
			    (this[offset + 3])
			};

			Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const val = this[offset + 4] +
			    this[offset + 5] * 2 ** 8 +
			    this[offset + 6] * 2 ** 16 +
			    (last << 24); // Overflow

			  return (BigInt(val) << BigInt(32)) +
			    BigInt(first +
			    this[++offset] * 2 ** 8 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 24)
			});

			Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
			  offset = offset >>> 0;
			  validateNumber(offset, 'offset');
			  const first = this[offset];
			  const last = this[offset + 7];
			  if (first === undefined || last === undefined) {
			    boundsError(offset, this.length - 8);
			  }

			  const val = (first << 24) + // Overflow
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    this[++offset];

			  return (BigInt(val) << BigInt(32)) +
			    BigInt(this[++offset] * 2 ** 24 +
			    this[++offset] * 2 ** 16 +
			    this[++offset] * 2 ** 8 +
			    last)
			});

			Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);
			  return ieee754.read(this, offset, true, 23, 4)
			};

			Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 4, this.length);
			  return ieee754.read(this, offset, false, 23, 4)
			};

			Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 8, this.length);
			  return ieee754.read(this, offset, true, 52, 8)
			};

			Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
			  offset = offset >>> 0;
			  if (!noAssert) checkOffset(offset, 8, this.length);
			  return ieee754.read(this, offset, false, 52, 8)
			};

			function checkInt (buf, value, offset, ext, max, min) {
			  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
			  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
			  if (offset + ext > buf.length) throw new RangeError('Index out of range')
			}

			Buffer.prototype.writeUintLE =
			Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			    checkInt(this, value, offset, byteLength, maxBytes, 0);
			  }

			  let mul = 1;
			  let i = 0;
			  this[offset] = value & 0xFF;
			  while (++i < byteLength && (mul *= 0x100)) {
			    this[offset + i] = (value / mul) & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeUintBE =
			Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  byteLength = byteLength >>> 0;
			  if (!noAssert) {
			    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
			    checkInt(this, value, offset, byteLength, maxBytes, 0);
			  }

			  let i = byteLength - 1;
			  let mul = 1;
			  this[offset + i] = value & 0xFF;
			  while (--i >= 0 && (mul *= 0x100)) {
			    this[offset + i] = (value / mul) & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeUint8 =
			Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
			  this[offset] = (value & 0xff);
			  return offset + 1
			};

			Buffer.prototype.writeUint16LE =
			Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  return offset + 2
			};

			Buffer.prototype.writeUint16BE =
			Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
			  this[offset] = (value >>> 8);
			  this[offset + 1] = (value & 0xff);
			  return offset + 2
			};

			Buffer.prototype.writeUint32LE =
			Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
			  this[offset + 3] = (value >>> 24);
			  this[offset + 2] = (value >>> 16);
			  this[offset + 1] = (value >>> 8);
			  this[offset] = (value & 0xff);
			  return offset + 4
			};

			Buffer.prototype.writeUint32BE =
			Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
			  this[offset] = (value >>> 24);
			  this[offset + 1] = (value >>> 16);
			  this[offset + 2] = (value >>> 8);
			  this[offset + 3] = (value & 0xff);
			  return offset + 4
			};

			function wrtBigUInt64LE (buf, value, offset, min, max) {
			  checkIntBI(value, min, max, buf, offset, 7);

			  let lo = Number(value & BigInt(0xffffffff));
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  lo = lo >> 8;
			  buf[offset++] = lo;
			  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  hi = hi >> 8;
			  buf[offset++] = hi;
			  return offset
			}

			function wrtBigUInt64BE (buf, value, offset, min, max) {
			  checkIntBI(value, min, max, buf, offset, 7);

			  let lo = Number(value & BigInt(0xffffffff));
			  buf[offset + 7] = lo;
			  lo = lo >> 8;
			  buf[offset + 6] = lo;
			  lo = lo >> 8;
			  buf[offset + 5] = lo;
			  lo = lo >> 8;
			  buf[offset + 4] = lo;
			  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
			  buf[offset + 3] = hi;
			  hi = hi >> 8;
			  buf[offset + 2] = hi;
			  hi = hi >> 8;
			  buf[offset + 1] = hi;
			  hi = hi >> 8;
			  buf[offset] = hi;
			  return offset + 8
			}

			Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
			  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
			});

			Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
			  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
			});

			Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    const limit = Math.pow(2, (8 * byteLength) - 1);

			    checkInt(this, value, offset, byteLength, limit - 1, -limit);
			  }

			  let i = 0;
			  let mul = 1;
			  let sub = 0;
			  this[offset] = value & 0xFF;
			  while (++i < byteLength && (mul *= 0x100)) {
			    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
			      sub = 1;
			    }
			    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    const limit = Math.pow(2, (8 * byteLength) - 1);

			    checkInt(this, value, offset, byteLength, limit - 1, -limit);
			  }

			  let i = byteLength - 1;
			  let mul = 1;
			  let sub = 0;
			  this[offset + i] = value & 0xFF;
			  while (--i >= 0 && (mul *= 0x100)) {
			    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
			      sub = 1;
			    }
			    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
			  }

			  return offset + byteLength
			};

			Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
			  if (value < 0) value = 0xff + value + 1;
			  this[offset] = (value & 0xff);
			  return offset + 1
			};

			Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  return offset + 2
			};

			Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
			  this[offset] = (value >>> 8);
			  this[offset + 1] = (value & 0xff);
			  return offset + 2
			};

			Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
			  this[offset] = (value & 0xff);
			  this[offset + 1] = (value >>> 8);
			  this[offset + 2] = (value >>> 16);
			  this[offset + 3] = (value >>> 24);
			  return offset + 4
			};

			Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
			  if (value < 0) value = 0xffffffff + value + 1;
			  this[offset] = (value >>> 24);
			  this[offset + 1] = (value >>> 16);
			  this[offset + 2] = (value >>> 8);
			  this[offset + 3] = (value & 0xff);
			  return offset + 4
			};

			Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
			  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
			});

			Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
			  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
			});

			function checkIEEE754 (buf, value, offset, ext, max, min) {
			  if (offset + ext > buf.length) throw new RangeError('Index out of range')
			  if (offset < 0) throw new RangeError('Index out of range')
			}

			function writeFloat (buf, value, offset, littleEndian, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    checkIEEE754(buf, value, offset, 4);
			  }
			  ieee754.write(buf, value, offset, littleEndian, 23, 4);
			  return offset + 4
			}

			Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
			  return writeFloat(this, value, offset, true, noAssert)
			};

			Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
			  return writeFloat(this, value, offset, false, noAssert)
			};

			function writeDouble (buf, value, offset, littleEndian, noAssert) {
			  value = +value;
			  offset = offset >>> 0;
			  if (!noAssert) {
			    checkIEEE754(buf, value, offset, 8);
			  }
			  ieee754.write(buf, value, offset, littleEndian, 52, 8);
			  return offset + 8
			}

			Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
			  return writeDouble(this, value, offset, true, noAssert)
			};

			Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
			  return writeDouble(this, value, offset, false, noAssert)
			};

			// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
			Buffer.prototype.copy = function copy (target, targetStart, start, end) {
			  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
			  if (!start) start = 0;
			  if (!end && end !== 0) end = this.length;
			  if (targetStart >= target.length) targetStart = target.length;
			  if (!targetStart) targetStart = 0;
			  if (end > 0 && end < start) end = start;

			  // Copy 0 bytes; we're done
			  if (end === start) return 0
			  if (target.length === 0 || this.length === 0) return 0

			  // Fatal error conditions
			  if (targetStart < 0) {
			    throw new RangeError('targetStart out of bounds')
			  }
			  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
			  if (end < 0) throw new RangeError('sourceEnd out of bounds')

			  // Are we oob?
			  if (end > this.length) end = this.length;
			  if (target.length - targetStart < end - start) {
			    end = target.length - targetStart + start;
			  }

			  const len = end - start;

			  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
			    // Use built-in when available, missing from IE11
			    this.copyWithin(targetStart, start, end);
			  } else {
			    Uint8Array.prototype.set.call(
			      target,
			      this.subarray(start, end),
			      targetStart
			    );
			  }

			  return len
			};

			// Usage:
			//    buffer.fill(number[, offset[, end]])
			//    buffer.fill(buffer[, offset[, end]])
			//    buffer.fill(string[, offset[, end]][, encoding])
			Buffer.prototype.fill = function fill (val, start, end, encoding) {
			  // Handle string cases:
			  if (typeof val === 'string') {
			    if (typeof start === 'string') {
			      encoding = start;
			      start = 0;
			      end = this.length;
			    } else if (typeof end === 'string') {
			      encoding = end;
			      end = this.length;
			    }
			    if (encoding !== undefined && typeof encoding !== 'string') {
			      throw new TypeError('encoding must be a string')
			    }
			    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
			      throw new TypeError('Unknown encoding: ' + encoding)
			    }
			    if (val.length === 1) {
			      const code = val.charCodeAt(0);
			      if ((encoding === 'utf8' && code < 128) ||
			          encoding === 'latin1') {
			        // Fast path: If `val` fits into a single byte, use that numeric value.
			        val = code;
			      }
			    }
			  } else if (typeof val === 'number') {
			    val = val & 255;
			  } else if (typeof val === 'boolean') {
			    val = Number(val);
			  }

			  // Invalid ranges are not set to a default, so can range check early.
			  if (start < 0 || this.length < start || this.length < end) {
			    throw new RangeError('Out of range index')
			  }

			  if (end <= start) {
			    return this
			  }

			  start = start >>> 0;
			  end = end === undefined ? this.length : end >>> 0;

			  if (!val) val = 0;

			  let i;
			  if (typeof val === 'number') {
			    for (i = start; i < end; ++i) {
			      this[i] = val;
			    }
			  } else {
			    const bytes = Buffer.isBuffer(val)
			      ? val
			      : Buffer.from(val, encoding);
			    const len = bytes.length;
			    if (len === 0) {
			      throw new TypeError('The value "' + val +
			        '" is invalid for argument "value"')
			    }
			    for (i = 0; i < end - start; ++i) {
			      this[i + start] = bytes[i % len];
			    }
			  }

			  return this
			};

			// CUSTOM ERRORS
			// =============

			// Simplified versions from Node, changed for Buffer-only usage
			const errors = {};
			function E (sym, getMessage, Base) {
			  errors[sym] = class NodeError extends Base {
			    constructor () {
			      super();

			      Object.defineProperty(this, 'message', {
			        value: getMessage.apply(this, arguments),
			        writable: true,
			        configurable: true
			      });

			      // Add the error code to the name to include it in the stack trace.
			      this.name = `${this.name} [${sym}]`;
			      // Access the stack to generate the error message including the error code
			      // from the name.
			      this.stack; // eslint-disable-line no-unused-expressions
			      // Reset the name to the actual name.
			      delete this.name;
			    }

			    get code () {
			      return sym
			    }

			    set code (value) {
			      Object.defineProperty(this, 'code', {
			        configurable: true,
			        enumerable: true,
			        value,
			        writable: true
			      });
			    }

			    toString () {
			      return `${this.name} [${sym}]: ${this.message}`
			    }
			  };
			}

			E('ERR_BUFFER_OUT_OF_BOUNDS',
			  function (name) {
			    if (name) {
			      return `${name} is outside of buffer bounds`
			    }

			    return 'Attempt to access memory outside buffer bounds'
			  }, RangeError);
			E('ERR_INVALID_ARG_TYPE',
			  function (name, actual) {
			    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
			  }, TypeError);
			E('ERR_OUT_OF_RANGE',
			  function (str, range, input) {
			    let msg = `The value of "${str}" is out of range.`;
			    let received = input;
			    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
			      received = addNumericalSeparator(String(input));
			    } else if (typeof input === 'bigint') {
			      received = String(input);
			      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
			        received = addNumericalSeparator(received);
			      }
			      received += 'n';
			    }
			    msg += ` It must be ${range}. Received ${received}`;
			    return msg
			  }, RangeError);

			function addNumericalSeparator (val) {
			  let res = '';
			  let i = val.length;
			  const start = val[0] === '-' ? 1 : 0;
			  for (; i >= start + 4; i -= 3) {
			    res = `_${val.slice(i - 3, i)}${res}`;
			  }
			  return `${val.slice(0, i)}${res}`
			}

			// CHECK FUNCTIONS
			// ===============

			function checkBounds (buf, offset, byteLength) {
			  validateNumber(offset, 'offset');
			  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
			    boundsError(offset, buf.length - (byteLength + 1));
			  }
			}

			function checkIntBI (value, min, max, buf, offset, byteLength) {
			  if (value > max || value < min) {
			    const n = typeof min === 'bigint' ? 'n' : '';
			    let range;
			    {
			      if (min === 0 || min === BigInt(0)) {
			        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
			      } else {
			        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
			                `${(byteLength + 1) * 8 - 1}${n}`;
			      }
			    }
			    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
			  }
			  checkBounds(buf, offset, byteLength);
			}

			function validateNumber (value, name) {
			  if (typeof value !== 'number') {
			    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
			  }
			}

			function boundsError (value, length, type) {
			  if (Math.floor(value) !== value) {
			    validateNumber(value, type);
			    throw new errors.ERR_OUT_OF_RANGE('offset', 'an integer', value)
			  }

			  if (length < 0) {
			    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
			  }

			  throw new errors.ERR_OUT_OF_RANGE('offset',
			                                    `>= ${0} and <= ${length}`,
			                                    value)
			}

			// HELPER FUNCTIONS
			// ================

			const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

			function base64clean (str) {
			  // Node takes equal signs as end of the Base64 encoding
			  str = str.split('=')[0];
			  // Node strips out invalid characters like \n and \t from the string, base64-js does not
			  str = str.trim().replace(INVALID_BASE64_RE, '');
			  // Node converts strings with length < 2 to ''
			  if (str.length < 2) return ''
			  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
			  while (str.length % 4 !== 0) {
			    str = str + '=';
			  }
			  return str
			}

			function utf8ToBytes (string, units) {
			  units = units || Infinity;
			  let codePoint;
			  const length = string.length;
			  let leadSurrogate = null;
			  const bytes = [];

			  for (let i = 0; i < length; ++i) {
			    codePoint = string.charCodeAt(i);

			    // is surrogate component
			    if (codePoint > 0xD7FF && codePoint < 0xE000) {
			      // last char was a lead
			      if (!leadSurrogate) {
			        // no lead yet
			        if (codePoint > 0xDBFF) {
			          // unexpected trail
			          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			          continue
			        } else if (i + 1 === length) {
			          // unpaired lead
			          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			          continue
			        }

			        // valid lead
			        leadSurrogate = codePoint;

			        continue
			      }

			      // 2 leads in a row
			      if (codePoint < 0xDC00) {
			        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			        leadSurrogate = codePoint;
			        continue
			      }

			      // valid surrogate pair
			      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
			    } else if (leadSurrogate) {
			      // valid bmp char, but last char was a lead
			      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
			    }

			    leadSurrogate = null;

			    // encode utf8
			    if (codePoint < 0x80) {
			      if ((units -= 1) < 0) break
			      bytes.push(codePoint);
			    } else if (codePoint < 0x800) {
			      if ((units -= 2) < 0) break
			      bytes.push(
			        codePoint >> 0x6 | 0xC0,
			        codePoint & 0x3F | 0x80
			      );
			    } else if (codePoint < 0x10000) {
			      if ((units -= 3) < 0) break
			      bytes.push(
			        codePoint >> 0xC | 0xE0,
			        codePoint >> 0x6 & 0x3F | 0x80,
			        codePoint & 0x3F | 0x80
			      );
			    } else if (codePoint < 0x110000) {
			      if ((units -= 4) < 0) break
			      bytes.push(
			        codePoint >> 0x12 | 0xF0,
			        codePoint >> 0xC & 0x3F | 0x80,
			        codePoint >> 0x6 & 0x3F | 0x80,
			        codePoint & 0x3F | 0x80
			      );
			    } else {
			      throw new Error('Invalid code point')
			    }
			  }

			  return bytes
			}

			function asciiToBytes (str) {
			  const byteArray = [];
			  for (let i = 0; i < str.length; ++i) {
			    // Node's code seems to be doing this and not & 0x7F..
			    byteArray.push(str.charCodeAt(i) & 0xFF);
			  }
			  return byteArray
			}

			function utf16leToBytes (str, units) {
			  let c, hi, lo;
			  const byteArray = [];
			  for (let i = 0; i < str.length; ++i) {
			    if ((units -= 2) < 0) break

			    c = str.charCodeAt(i);
			    hi = c >> 8;
			    lo = c % 256;
			    byteArray.push(lo);
			    byteArray.push(hi);
			  }

			  return byteArray
			}

			function base64ToBytes (str) {
			  return base64.toByteArray(base64clean(str))
			}

			function blitBuffer (src, dst, offset, length) {
			  let i;
			  for (i = 0; i < length; ++i) {
			    if ((i + offset >= dst.length) || (i >= src.length)) break
			    dst[i + offset] = src[i];
			  }
			  return i
			}

			// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
			// the `instanceof` check but they should be treated as of that type.
			// See: https://github.com/feross/buffer/issues/166
			function isInstance (obj, type) {
			  return obj instanceof type ||
			    (obj != null && obj.constructor != null && obj.constructor.name != null &&
			      obj.constructor.name === type.name)
			}
			function numberIsNaN (obj) {
			  // For IE11 support
			  return obj !== obj // eslint-disable-line no-self-compare
			}

			// Create lookup table for `toString('hex')`
			// See: https://github.com/feross/buffer/issues/219
			const hexSliceLookupTable = (function () {
			  const alphabet = '0123456789abcdef';
			  const table = new Array(256);
			  for (let i = 0; i < 16; ++i) {
			    const i16 = i * 16;
			    for (let j = 0; j < 16; ++j) {
			      table[i16 + j] = alphabet[i] + alphabet[j];
			    }
			  }
			  return table
			})();

			// Return not function with Error if BigInt not supported
			function defineBigIntMethod (fn) {
			  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
			}

			function BufferBigIntNotDefined () {
			  throw new Error('BigInt not supported')
			} 
		} (buffer));
		return buffer;
	}

	var bufferExports = /*@__PURE__*/ requireBuffer();

	// src/codes.ts
	var SOLANA_ERROR__ADDRESSES__INVALID_BYTE_LENGTH = 28e5;
	var SOLANA_ERROR__ADDRESSES__STRING_LENGTH_OUT_OF_RANGE = 2800001;
	var SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED = 2800007;
	var SOLANA_ERROR__ADDRESSES__PDA_ENDS_WITH_PDA_MARKER = 2800010;
	var SOLANA_ERROR__SUBTLE_CRYPTO__DISALLOWED_IN_INSECURE_CONTEXT = 361e4;
	var SOLANA_ERROR__SUBTLE_CRYPTO__DIGEST_UNIMPLEMENTED = 3610001;
	var SOLANA_ERROR__SUBTLE_CRYPTO__EXPORT_FUNCTION_UNIMPLEMENTED = 3610003;
	var SOLANA_ERROR__SUBTLE_CRYPTO__SIGN_FUNCTION_UNIMPLEMENTED = 3610005;
	var SOLANA_ERROR__SUBTLE_CRYPTO__VERIFY_FUNCTION_UNIMPLEMENTED = 3610006;
	var SOLANA_ERROR__SUBTLE_CRYPTO__CANNOT_EXPORT_NON_EXTRACTABLE_KEY = 3610007;
	var SOLANA_ERROR__CRYPTO__RANDOM_VALUES_FUNCTION_UNIMPLEMENTED = 3611e3;
	var SOLANA_ERROR__KEYS__INVALID_KEY_PAIR_BYTE_LENGTH = 3704e3;
	var SOLANA_ERROR__KEYS__INVALID_PRIVATE_KEY_BYTE_LENGTH = 3704001;
	var SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH = 3704002;
	var SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY = 3704004;
	var SOLANA_ERROR__CODECS__CANNOT_DECODE_EMPTY_BYTE_ARRAY = 8078e3;
	var SOLANA_ERROR__CODECS__INVALID_BYTE_LENGTH = 8078001;
	var SOLANA_ERROR__CODECS__ENCODER_DECODER_SIZE_COMPATIBILITY_MISMATCH = 8078004;
	var SOLANA_ERROR__CODECS__ENCODER_DECODER_FIXED_SIZE_MISMATCH = 8078005;
	var SOLANA_ERROR__CODECS__ENCODER_DECODER_MAX_SIZE_MISMATCH = 8078006;
	var SOLANA_ERROR__CODECS__INVALID_NUMBER_OF_ITEMS = 8078007;
	var SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE = 8078008;
	var SOLANA_ERROR__CODECS__INVALID_ENUM_VARIANT = 8078010;
	var SOLANA_ERROR__CODECS__NUMBER_OUT_OF_RANGE = 8078011;
	var SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE = 8078012;
	var SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS = 8078022;

	// src/context.ts
	function encodeValue$1(value) {
	  if (Array.isArray(value)) {
	    const commaSeparatedValues = value.map(encodeValue$1).join(
	      "%2C%20"
	      /* ", " */
	    );
	    return "%5B" + commaSeparatedValues + /* "]" */
	    "%5D";
	  } else if (typeof value === "bigint") {
	    return `${value}n`;
	  } else {
	    return encodeURIComponent(
	      String(
	        value != null && Object.getPrototypeOf(value) === null ? (
	          // Plain objects with no prototype don't have a `toString` method.
	          // Convert them before stringifying them.
	          { ...value }
	        ) : value
	      )
	    );
	  }
	}
	function encodeObjectContextEntry$1([key, value]) {
	  return `${key}=${encodeValue$1(value)}`;
	}
	function encodeContextObject$1(context) {
	  const searchParamsString = Object.entries(context).map(encodeObjectContextEntry$1).join("&");
	  return btoa(searchParamsString);
	}
	function getErrorMessage$1(code, context = {}) {
	  {
	    let decodingAdviceMessage = `Solana error #${code}; Decode this error by running \`npx @solana/errors decode -- ${code}`;
	    if (Object.keys(context).length) {
	      decodingAdviceMessage += ` '${encodeContextObject$1(context)}'`;
	    }
	    return `${decodingAdviceMessage}\``;
	  }
	}
	var SolanaError$1 = class SolanaError extends Error {
	  /**
	   * Indicates the root cause of this {@link SolanaError}, if any.
	   *
	   * For example, a transaction error might have an instruction error as its root cause. In this
	   * case, you will be able to access the instruction error on the transaction error as `cause`.
	   */
	  cause = this.cause;
	  /**
	   * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
	   */
	  context;
	  constructor(...[code, contextAndErrorOptions]) {
	    let context;
	    let errorOptions;
	    if (contextAndErrorOptions) {
	      Object.entries(Object.getOwnPropertyDescriptors(contextAndErrorOptions)).forEach(([name, descriptor]) => {
	        if (name === "cause") {
	          errorOptions = { cause: descriptor.value };
	        } else {
	          if (context === void 0) {
	            context = {
	              __code: code
	            };
	          }
	          Object.defineProperty(context, name, descriptor);
	        }
	      });
	    }
	    const message = getErrorMessage$1(code, context);
	    super(message, errorOptions);
	    this.context = Object.freeze(
	      context === void 0 ? {
	        __code: code
	      } : context
	    );
	    this.name = "SolanaError";
	  }
	};

	function padBytes(bytes, length) {
	  if (bytes.length >= length) return bytes;
	  const paddedBytes = new Uint8Array(length).fill(0);
	  paddedBytes.set(bytes);
	  return paddedBytes;
	}
	var fixBytes = (bytes, length) => padBytes(bytes.length <= length ? bytes : bytes.slice(0, length), length);
	function bytesEqual(bytes1, bytes2) {
	  return bytes1.length === bytes2.length && bytes1.every((value, index) => value === bytes2[index]);
	}
	function getEncodedSize(value, encoder) {
	  return "fixedSize" in encoder ? encoder.fixedSize : encoder.getSizeFromValue(value);
	}
	function createEncoder(encoder) {
	  return Object.freeze({
	    ...encoder,
	    encode: (value) => {
	      const bytes = new Uint8Array(getEncodedSize(value, encoder));
	      encoder.write(value, bytes, 0);
	      return bytes;
	    }
	  });
	}
	function createDecoder(decoder) {
	  return Object.freeze({
	    ...decoder,
	    decode: (bytes, offset = 0) => decoder.read(bytes, offset)[0]
	  });
	}
	function createCodec(codec) {
	  return Object.freeze({
	    ...codec,
	    decode: (bytes, offset = 0) => codec.read(bytes, offset)[0],
	    encode: (value) => {
	      const bytes = new Uint8Array(getEncodedSize(value, codec));
	      codec.write(value, bytes, 0);
	      return bytes;
	    }
	  });
	}
	function isFixedSize(codec) {
	  return "fixedSize" in codec && typeof codec.fixedSize === "number";
	}
	function isVariableSize(codec) {
	  return !isFixedSize(codec);
	}
	function combineCodec(encoder, decoder) {
	  if (isFixedSize(encoder) !== isFixedSize(decoder)) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_SIZE_COMPATIBILITY_MISMATCH);
	  }
	  if (isFixedSize(encoder) && isFixedSize(decoder) && encoder.fixedSize !== decoder.fixedSize) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_FIXED_SIZE_MISMATCH, {
	      decoderFixedSize: decoder.fixedSize,
	      encoderFixedSize: encoder.fixedSize
	    });
	  }
	  if (!isFixedSize(encoder) && !isFixedSize(decoder) && encoder.maxSize !== decoder.maxSize) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__ENCODER_DECODER_MAX_SIZE_MISMATCH, {
	      decoderMaxSize: decoder.maxSize,
	      encoderMaxSize: encoder.maxSize
	    });
	  }
	  return {
	    ...decoder,
	    ...encoder,
	    decode: decoder.decode,
	    encode: encoder.encode,
	    read: decoder.read,
	    write: encoder.write
	  };
	}
	function assertByteArrayIsNotEmptyForCodec(codecDescription, bytes, offset = 0) {
	  if (bytes.length - offset <= 0) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__CANNOT_DECODE_EMPTY_BYTE_ARRAY, {
	      codecDescription
	    });
	  }
	}
	function assertByteArrayHasEnoughBytesForCodec(codecDescription, expected, bytes, offset = 0) {
	  const bytesLength = bytes.length - offset;
	  if (bytesLength < expected) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_BYTE_LENGTH, {
	      bytesLength,
	      codecDescription,
	      expected
	    });
	  }
	}

	// src/add-codec-size-prefix.ts
	function addEncoderSizePrefix(encoder, prefix) {
	  const write = ((value, bytes, offset) => {
	    const encoderBytes = encoder.encode(value);
	    offset = prefix.write(encoderBytes.length, bytes, offset);
	    bytes.set(encoderBytes, offset);
	    return offset + encoderBytes.length;
	  });
	  if (isFixedSize(prefix) && isFixedSize(encoder)) {
	    return createEncoder({ ...encoder, fixedSize: prefix.fixedSize + encoder.fixedSize, write });
	  }
	  const prefixMaxSize = isFixedSize(prefix) ? prefix.fixedSize : prefix.maxSize ?? null;
	  const encoderMaxSize = isFixedSize(encoder) ? encoder.fixedSize : encoder.maxSize ?? null;
	  const maxSize = prefixMaxSize !== null && encoderMaxSize !== null ? prefixMaxSize + encoderMaxSize : null;
	  return createEncoder({
	    ...encoder,
	    ...maxSize !== null ? { maxSize } : {},
	    getSizeFromValue: (value) => {
	      const encoderSize = getEncodedSize(value, encoder);
	      return getEncodedSize(encoderSize, prefix) + encoderSize;
	    },
	    write
	  });
	}
	function addDecoderSizePrefix(decoder, prefix) {
	  const read = ((bytes, offset) => {
	    const [bigintSize, decoderOffset] = prefix.read(bytes, offset);
	    const size = Number(bigintSize);
	    offset = decoderOffset;
	    if (offset > 0 || bytes.length > size) {
	      bytes = bytes.slice(offset, offset + size);
	    }
	    assertByteArrayHasEnoughBytesForCodec("addDecoderSizePrefix", size, bytes);
	    return [decoder.decode(bytes), offset + size];
	  });
	  if (isFixedSize(prefix) && isFixedSize(decoder)) {
	    return createDecoder({ ...decoder, fixedSize: prefix.fixedSize + decoder.fixedSize, read });
	  }
	  const prefixMaxSize = isFixedSize(prefix) ? prefix.fixedSize : prefix.maxSize ?? null;
	  const decoderMaxSize = isFixedSize(decoder) ? decoder.fixedSize : decoder.maxSize ?? null;
	  const maxSize = prefixMaxSize !== null && decoderMaxSize !== null ? prefixMaxSize + decoderMaxSize : null;
	  return createDecoder({ ...decoder, ...maxSize !== null ? { maxSize } : {}, read });
	}
	function addCodecSizePrefix(codec, prefix) {
	  return combineCodec(addEncoderSizePrefix(codec, prefix), addDecoderSizePrefix(codec, prefix));
	}

	// src/array-buffers.ts
	function toArrayBuffer(bytes, offset, length) {
	  const bytesOffset = bytes.byteOffset + (offset ?? 0);
	  const bytesLength = length ?? bytes.byteLength;
	  let buffer;
	  if (typeof SharedArrayBuffer === "undefined") {
	    buffer = bytes.buffer;
	  } else if (bytes.buffer instanceof SharedArrayBuffer) {
	    buffer = new ArrayBuffer(bytes.length);
	    new Uint8Array(buffer).set(new Uint8Array(bytes));
	  } else {
	    buffer = bytes.buffer;
	  }
	  return (bytesOffset === 0 || bytesOffset === -bytes.byteLength) && bytesLength === bytes.byteLength ? buffer : buffer.slice(bytesOffset, bytesOffset + bytesLength);
	}

	// src/fix-codec-size.ts
	function fixEncoderSize(encoder, fixedBytes) {
	  return createEncoder({
	    fixedSize: fixedBytes,
	    write: (value, bytes, offset) => {
	      const variableByteArray = encoder.encode(value);
	      const fixedByteArray = variableByteArray.length > fixedBytes ? variableByteArray.slice(0, fixedBytes) : variableByteArray;
	      bytes.set(fixedByteArray, offset);
	      return offset + fixedBytes;
	    }
	  });
	}
	function fixDecoderSize(decoder, fixedBytes) {
	  return createDecoder({
	    fixedSize: fixedBytes,
	    read: (bytes, offset) => {
	      assertByteArrayHasEnoughBytesForCodec("fixCodecSize", fixedBytes, bytes, offset);
	      if (offset > 0 || bytes.length > fixedBytes) {
	        bytes = bytes.slice(offset, offset + fixedBytes);
	      }
	      if (isFixedSize(decoder)) {
	        bytes = fixBytes(bytes, decoder.fixedSize);
	      }
	      const [value] = decoder.read(bytes, 0);
	      return [value, offset + fixedBytes];
	    }
	  });
	}
	function fixCodecSize(codec, fixedBytes) {
	  return combineCodec(fixEncoderSize(codec, fixedBytes), fixDecoderSize(codec, fixedBytes));
	}

	// src/transform-codec.ts
	function transformEncoder(encoder, unmap) {
	  return createEncoder({
	    ...isVariableSize(encoder) ? { ...encoder, getSizeFromValue: (value) => encoder.getSizeFromValue(unmap(value)) } : encoder,
	    write: (value, bytes, offset) => encoder.write(unmap(value), bytes, offset)
	  });
	}
	function transformDecoder(decoder, map) {
	  return createDecoder({
	    ...decoder,
	    read: (bytes, offset) => {
	      const [value, newOffset] = decoder.read(bytes, offset);
	      return [map(value, bytes, offset), newOffset];
	    }
	  });
	}
	function transformCodec(codec, unmap, map) {
	  return createCodec({
	    ...transformEncoder(codec, unmap),
	    read: map ? transformDecoder(codec, map).read : codec.read
	  });
	}

	// src/assertions.ts
	function assertValidBaseString(alphabet4, testValue, givenValue = testValue) {
	  if (!testValue.match(new RegExp(`^[${alphabet4}]*$`))) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
	      alphabet: alphabet4,
	      base: alphabet4.length,
	      value: givenValue
	    });
	  }
	}
	var getBaseXEncoder = (alphabet4) => {
	  return createEncoder({
	    getSizeFromValue: (value) => {
	      const [leadingZeroes, tailChars] = partitionLeadingZeroes(value, alphabet4[0]);
	      if (!tailChars) return value.length;
	      const base10Number = getBigIntFromBaseX(tailChars, alphabet4);
	      return leadingZeroes.length + Math.ceil(base10Number.toString(16).length / 2);
	    },
	    write(value, bytes, offset) {
	      assertValidBaseString(alphabet4, value);
	      if (value === "") return offset;
	      const [leadingZeroes, tailChars] = partitionLeadingZeroes(value, alphabet4[0]);
	      if (!tailChars) {
	        bytes.set(new Uint8Array(leadingZeroes.length).fill(0), offset);
	        return offset + leadingZeroes.length;
	      }
	      let base10Number = getBigIntFromBaseX(tailChars, alphabet4);
	      const tailBytes = [];
	      while (base10Number > 0n) {
	        tailBytes.unshift(Number(base10Number % 256n));
	        base10Number /= 256n;
	      }
	      const bytesToAdd = [...Array(leadingZeroes.length).fill(0), ...tailBytes];
	      bytes.set(bytesToAdd, offset);
	      return offset + bytesToAdd.length;
	    }
	  });
	};
	var getBaseXDecoder = (alphabet4) => {
	  return createDecoder({
	    read(rawBytes, offset) {
	      const bytes = offset === 0 ? rawBytes : rawBytes.slice(offset);
	      if (bytes.length === 0) return ["", 0];
	      let trailIndex = bytes.findIndex((n) => n !== 0);
	      trailIndex = trailIndex === -1 ? bytes.length : trailIndex;
	      const leadingZeroes = alphabet4[0].repeat(trailIndex);
	      if (trailIndex === bytes.length) return [leadingZeroes, rawBytes.length];
	      const base10Number = bytes.slice(trailIndex).reduce((sum, byte) => sum * 256n + BigInt(byte), 0n);
	      const tailChars = getBaseXFromBigInt(base10Number, alphabet4);
	      return [leadingZeroes + tailChars, rawBytes.length];
	    }
	  });
	};
	var getBaseXCodec = (alphabet4) => combineCodec(getBaseXEncoder(alphabet4), getBaseXDecoder(alphabet4));
	function partitionLeadingZeroes(value, zeroCharacter) {
	  const [leadingZeros, tailChars] = value.split(new RegExp(`((?!${zeroCharacter}).*)`));
	  return [leadingZeros, tailChars];
	}
	function getBigIntFromBaseX(value, alphabet4) {
	  const base = BigInt(alphabet4.length);
	  let sum = 0n;
	  for (const char of value) {
	    sum *= base;
	    sum += BigInt(alphabet4.indexOf(char));
	  }
	  return sum;
	}
	function getBaseXFromBigInt(value, alphabet4) {
	  const base = BigInt(alphabet4.length);
	  const tailChars = [];
	  while (value > 0n) {
	    tailChars.unshift(alphabet4[Number(value % base)]);
	    value /= base;
	  }
	  return tailChars.join("");
	}
	var INVALID_STRING_ERROR_BASE_CONFIG = {
	  alphabet: "0123456789abcdef",
	  base: 16
	};
	function charCodeToBase16(char) {
	  if (char >= 48 /* ZERO */ && char <= 57 /* NINE */) return char - 48 /* ZERO */;
	  if (char >= 65 /* A_UP */ && char <= 70 /* F_UP */) return char - (65 /* A_UP */ - 10);
	  if (char >= 97 /* A_LO */ && char <= 102 /* F_LO */) return char - (97 /* A_LO */ - 10);
	}
	var getBase16Encoder = () => createEncoder({
	  getSizeFromValue: (value) => Math.ceil(value.length / 2),
	  write(value, bytes, offset) {
	    const len = value.length;
	    const al = len / 2;
	    if (len === 1) {
	      const c = value.charCodeAt(0);
	      const n = charCodeToBase16(c);
	      if (n === void 0) {
	        throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
	          ...INVALID_STRING_ERROR_BASE_CONFIG,
	          value
	        });
	      }
	      bytes.set([n], offset);
	      return 1 + offset;
	    }
	    const hexBytes = new Uint8Array(al);
	    for (let i = 0, j = 0; i < al; i++) {
	      const c1 = value.charCodeAt(j++);
	      const c2 = value.charCodeAt(j++);
	      const n1 = charCodeToBase16(c1);
	      const n2 = charCodeToBase16(c2);
	      if (n1 === void 0 || n2 === void 0 && !Number.isNaN(c2)) {
	        throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
	          ...INVALID_STRING_ERROR_BASE_CONFIG,
	          value
	        });
	      }
	      hexBytes[i] = !Number.isNaN(c2) ? n1 << 4 | (n2 ?? 0) : n1;
	    }
	    bytes.set(hexBytes, offset);
	    return hexBytes.length + offset;
	  }
	});

	// src/base58.ts
	var alphabet2 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
	var getBase58Encoder = () => getBaseXEncoder(alphabet2);
	var getBase58Decoder = () => getBaseXDecoder(alphabet2);
	var getBase58Codec = () => getBaseXCodec(alphabet2);

	// src/base64.ts
	var alphabet3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var getBase64Encoder = () => {
	  {
	    return createEncoder({
	      getSizeFromValue: (value) => {
	        try {
	          return atob(value).length;
	        } catch {
	          throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
	            alphabet: alphabet3,
	            base: 64,
	            value
	          });
	        }
	      },
	      write(value, bytes, offset) {
	        try {
	          const bytesToAdd = atob(value).split("").map((c) => c.charCodeAt(0));
	          bytes.set(bytesToAdd, offset);
	          return bytesToAdd.length + offset;
	        } catch {
	          throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_STRING_FOR_BASE, {
	            alphabet: alphabet3,
	            base: 64,
	            value
	          });
	        }
	      }
	    });
	  }
	};
	var getBase64Decoder = () => {
	  {
	    return createDecoder({
	      read(bytes, offset = 0) {
	        const slice = bytes.slice(offset);
	        const value = btoa(String.fromCharCode(...slice));
	        return [value, bytes.length];
	      }
	    });
	  }
	};
	var getBase64Codec = () => combineCodec(getBase64Encoder(), getBase64Decoder());

	// src/null-characters.ts
	var removeNullCharacters = (value) => (
	  // eslint-disable-next-line no-control-regex
	  value.replace(/\u0000/g, "")
	);

	// ../text-encoding-impl/dist/index.browser.mjs
	var e = globalThis.TextDecoder;
	var o = globalThis.TextEncoder;

	// src/utf8.ts
	var getUtf8Encoder = () => {
	  let textEncoder;
	  return createEncoder({
	    getSizeFromValue: (value) => (textEncoder ||= new o()).encode(value).length,
	    write: (value, bytes, offset) => {
	      const bytesToAdd = (textEncoder ||= new o()).encode(value);
	      bytes.set(bytesToAdd, offset);
	      return offset + bytesToAdd.length;
	    }
	  });
	};
	var getUtf8Decoder = () => {
	  let textDecoder;
	  return createDecoder({
	    read(bytes, offset) {
	      const value = (textDecoder ||= new e()).decode(bytes.slice(offset));
	      return [removeNullCharacters(value), bytes.length];
	    }
	  });
	};
	var getUtf8Codec = () => combineCodec(getUtf8Encoder(), getUtf8Decoder());

	// src/crypto.ts
	function assertPRNGIsAvailable() {
	  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.getRandomValues !== "function") {
	    throw new SolanaError$1(SOLANA_ERROR__CRYPTO__RANDOM_VALUES_FUNCTION_UNIMPLEMENTED);
	  }
	}
	function assertIsSecureContext() {
	  if (!globalThis.isSecureContext) {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__DISALLOWED_IN_INSECURE_CONTEXT);
	  }
	}
	function assertDigestCapabilityIsAvailable() {
	  assertIsSecureContext();
	  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.digest !== "function") {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__DIGEST_UNIMPLEMENTED);
	  }
	}
	function assertKeyExporterIsAvailable() {
	  assertIsSecureContext();
	  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.exportKey !== "function") {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__EXPORT_FUNCTION_UNIMPLEMENTED);
	  }
	}
	function assertSigningCapabilityIsAvailable() {
	  assertIsSecureContext();
	  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.sign !== "function") {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__SIGN_FUNCTION_UNIMPLEMENTED);
	  }
	}
	function assertVerificationCapabilityIsAvailable() {
	  assertIsSecureContext();
	  if (typeof globalThis.crypto === "undefined" || typeof globalThis.crypto.subtle?.verify !== "function") {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__VERIFY_FUNCTION_UNIMPLEMENTED);
	  }
	}

	// src/address.ts
	var memoizedBase58Encoder;
	var memoizedBase58Decoder;
	function getMemoizedBase58Encoder() {
	  if (!memoizedBase58Encoder) memoizedBase58Encoder = getBase58Encoder();
	  return memoizedBase58Encoder;
	}
	function getMemoizedBase58Decoder() {
	  if (!memoizedBase58Decoder) memoizedBase58Decoder = getBase58Decoder();
	  return memoizedBase58Decoder;
	}
	function assertIsAddress(putativeAddress) {
	  if (
	    // Lowest address (32 bytes of zeroes)
	    putativeAddress.length < 32 || // Highest address (32 bytes of 255)
	    putativeAddress.length > 44
	  ) {
	    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__STRING_LENGTH_OUT_OF_RANGE, {
	      actualLength: putativeAddress.length
	    });
	  }
	  const base58Encoder = getMemoizedBase58Encoder();
	  const bytes = base58Encoder.encode(putativeAddress);
	  const numBytes = bytes.byteLength;
	  if (numBytes !== 32) {
	    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__INVALID_BYTE_LENGTH, {
	      actualLength: numBytes
	    });
	  }
	}
	function address(putativeAddress) {
	  assertIsAddress(putativeAddress);
	  return putativeAddress;
	}
	function getAddressEncoder() {
	  return transformEncoder(
	    fixEncoderSize(getMemoizedBase58Encoder(), 32),
	    (putativeAddress) => address(putativeAddress)
	  );
	}
	function getAddressDecoder() {
	  return fixDecoderSize(getMemoizedBase58Decoder(), 32);
	}
	function getAddressCodec() {
	  return combineCodec(getAddressEncoder(), getAddressDecoder());
	}
	var MAX_SEED_LENGTH$1 = 32;
	var PDA_MARKER_BYTES$1 = [
	  // The string 'ProgramDerivedAddress'
	  80,
	  114,
	  111,
	  103,
	  114,
	  97,
	  109,
	  68,
	  101,
	  114,
	  105,
	  118,
	  101,
	  100,
	  65,
	  100,
	  100,
	  114,
	  101,
	  115,
	  115
	];
	async function createAddressWithSeed({ baseAddress, programAddress, seed }) {
	  const { encode, decode } = getAddressCodec();
	  const seedBytes = typeof seed === "string" ? new TextEncoder().encode(seed) : seed;
	  if (seedBytes.byteLength > MAX_SEED_LENGTH$1) {
	    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__MAX_PDA_SEED_LENGTH_EXCEEDED, {
	      actual: seedBytes.byteLength,
	      index: 0,
	      maxSeedLength: MAX_SEED_LENGTH$1
	    });
	  }
	  const programAddressBytes = encode(programAddress);
	  if (programAddressBytes.length >= PDA_MARKER_BYTES$1.length && bytesEqual(programAddressBytes.slice(-PDA_MARKER_BYTES$1.length), new Uint8Array(PDA_MARKER_BYTES$1))) {
	    throw new SolanaError$1(SOLANA_ERROR__ADDRESSES__PDA_ENDS_WITH_PDA_MARKER);
	  }
	  const addressBytesBuffer = await crypto.subtle.digest(
	    "SHA-256",
	    new Uint8Array([...encode(baseAddress), ...seedBytes, ...programAddressBytes])
	  );
	  const addressBytes = new Uint8Array(addressBytesBuffer);
	  return decode(addressBytes);
	}

	// src/key-pair.ts

	// src/algorithm.ts
	var ED25519_ALGORITHM_IDENTIFIER = (
	  // Resist the temptation to convert this to a simple string; As of version 133.0.3, Firefox
	  // requires the object form of `AlgorithmIdentifier` and will throw a `DOMException` otherwise.
	  Object.freeze({ name: "Ed25519" })
	);
	function addPkcs8Header(bytes) {
	  return new Uint8Array([
	    /**
	     * PKCS#8 header
	     */
	    48,
	    // ASN.1 sequence tag
	    46,
	    // Length of sequence (46 more bytes)
	    2,
	    // ASN.1 integer tag
	    1,
	    // Length of integer
	    0,
	    // Version number
	    48,
	    // ASN.1 sequence tag
	    5,
	    // Length of sequence
	    6,
	    // ASN.1 object identifier tag
	    3,
	    // Length of object identifier
	    // Edwards curve algorithms identifier https://oid-rep.orange-labs.fr/get/1.3.101.112
	    43,
	    // iso(1) / identified-organization(3) (The first node is multiplied by the decimal 40 and the result is added to the value of the second node)
	    101,
	    // thawte(101)
	    // Ed25519 identifier
	    112,
	    // id-Ed25519(112)
	    /**
	     * Private key payload
	     */
	    4,
	    // ASN.1 octet string tag
	    34,
	    // String length (34 more bytes)
	    // Private key bytes as octet string
	    4,
	    // ASN.1 octet string tag
	    32,
	    // String length (32 bytes)
	    ...bytes
	  ]);
	}
	async function createPrivateKeyFromBytes(bytes, extractable = false) {
	  const actualLength = bytes.byteLength;
	  if (actualLength !== 32) {
	    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_PRIVATE_KEY_BYTE_LENGTH, {
	      actualLength
	    });
	  }
	  const privateKeyBytesPkcs8 = addPkcs8Header(bytes);
	  return await crypto.subtle.importKey("pkcs8", privateKeyBytesPkcs8, ED25519_ALGORITHM_IDENTIFIER, extractable, [
	    "sign"
	  ]);
	}
	async function getPublicKeyFromPrivateKey(privateKey, extractable = false) {
	  assertKeyExporterIsAvailable();
	  if (privateKey.extractable === false) {
	    throw new SolanaError$1(SOLANA_ERROR__SUBTLE_CRYPTO__CANNOT_EXPORT_NON_EXTRACTABLE_KEY, { key: privateKey });
	  }
	  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
	  return await crypto.subtle.importKey(
	    "jwk",
	    {
	      crv: "Ed25519",
	      ext: extractable,
	      key_ops: ["verify"],
	      kty: "OKP",
	      x: jwk.x
	    },
	    "Ed25519",
	    extractable,
	    ["verify"]
	  );
	}
	function assertIsSignatureBytes(putativeSignatureBytes) {
	  const numBytes = putativeSignatureBytes.byteLength;
	  if (numBytes !== 64) {
	    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_SIGNATURE_BYTE_LENGTH, {
	      actualLength: numBytes
	    });
	  }
	}
	async function signBytes(key, data) {
	  assertSigningCapabilityIsAvailable();
	  const signedData = await crypto.subtle.sign(ED25519_ALGORITHM_IDENTIFIER, key, toArrayBuffer(data));
	  return new Uint8Array(signedData);
	}
	function signatureBytes(putativeSignatureBytes) {
	  assertIsSignatureBytes(putativeSignatureBytes);
	  return putativeSignatureBytes;
	}
	async function verifySignature(key, signature2, data) {
	  assertVerificationCapabilityIsAvailable();
	  return await crypto.subtle.verify(ED25519_ALGORITHM_IDENTIFIER, key, toArrayBuffer(signature2), toArrayBuffer(data));
	}
	async function createKeyPairFromBytes(bytes, extractable = false) {
	  assertPRNGIsAvailable();
	  if (bytes.byteLength !== 64) {
	    throw new SolanaError$1(SOLANA_ERROR__KEYS__INVALID_KEY_PAIR_BYTE_LENGTH, { byteLength: bytes.byteLength });
	  }
	  const [publicKey, privateKey] = await Promise.all([
	    crypto.subtle.importKey(
	      "raw",
	      bytes.slice(32),
	      ED25519_ALGORITHM_IDENTIFIER,
	      /* extractable */
	      true,
	      [
	        "verify"
	      ]
	    ),
	    createPrivateKeyFromBytes(bytes.slice(0, 32), extractable)
	  ]);
	  const randomBytes = new Uint8Array(32);
	  crypto.getRandomValues(randomBytes);
	  const signedData = await signBytes(privateKey, randomBytes);
	  const isValid = await verifySignature(publicKey, signedData, randomBytes);
	  if (!isValid) {
	    throw new SolanaError$1(SOLANA_ERROR__KEYS__PUBLIC_KEY_MUST_MATCH_PRIVATE_KEY);
	  }
	  return { privateKey, publicKey };
	}
	async function createKeyPairFromPrivateKeyBytes(bytes, extractable = false) {
	  const privateKeyPromise = createPrivateKeyFromBytes(bytes, extractable);
	  const [publicKey, privateKey] = await Promise.all([
	    // This nested promise makes things efficient by
	    // creating the public key in parallel with the
	    // second private key creation, if it is needed.
	    (extractable ? privateKeyPromise : createPrivateKeyFromBytes(
	      bytes,
	      true
	      /* extractable */
	    )).then(
	      async (privateKey2) => await getPublicKeyFromPrivateKey(
	        privateKey2,
	        true
	        /* extractable */
	      )
	    ),
	    privateKeyPromise
	  ]);
	  return { privateKey, publicKey };
	}

	function anumber$1(n) {
	    if (!Number.isSafeInteger(n) || n < 0)
	        throw new Error('positive integer expected, got ' + n);
	}
	// copied from utils
	function isBytes$2(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	function abytes$2(b, ...lengths) {
	    if (!isBytes$2(b))
	        throw new Error('Uint8Array expected');
	    if (lengths.length > 0 && !lengths.includes(b.length))
	        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
	}
	function aexists$1(instance, checkFinished = true) {
	    if (instance.destroyed)
	        throw new Error('Hash instance has been destroyed');
	    if (checkFinished && instance.finished)
	        throw new Error('Hash#digest() has already been called');
	}
	function aoutput$1(out, instance) {
	    abytes$2(out);
	    const min = instance.outputLen;
	    if (out.length < min) {
	        throw new Error('digestInto() expects output buffer of length at least ' + min);
	    }
	}

	/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
	// node.js versions earlier than v19 don't declare it in global scope.
	// For node.js, package.json#exports field mapping rewrites import
	// from `crypto` to `cryptoNode`, which imports native module.
	// Makes the utils un-importable in browsers without a bundler.
	// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
	const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
	// Cast array to view
	const createView$1 = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
	// The rotate right (circular right shift) operation for uint32
	const rotr$1 = (word, shift) => (word << (32 - shift)) | (word >>> shift);
	const isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
	// The byte swap operation for uint32
	const byteSwap = (word) => ((word << 24) & 0xff000000) |
	    ((word << 8) & 0xff0000) |
	    ((word >>> 8) & 0xff00) |
	    ((word >>> 24) & 0xff);
	// In place byte swap for Uint32Array
	function byteSwap32(arr) {
	    for (let i = 0; i < arr.length; i++) {
	        arr[i] = byteSwap(arr[i]);
	    }
	}
	/**
	 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
	 */
	function utf8ToBytes$2(str) {
	    if (typeof str !== 'string')
	        throw new Error('utf8ToBytes expected string, got ' + typeof str);
	    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
	}
	/**
	 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
	 * Warning: when Uint8Array is passed, it would NOT get copied.
	 * Keep in mind for future mutable operations.
	 */
	function toBytes$1(data) {
	    if (typeof data === 'string')
	        data = utf8ToBytes$2(data);
	    abytes$2(data);
	    return data;
	}
	// For runtime check if class implements interface
	let Hash$1 = class Hash {
	    // Safe version that clones internal state
	    clone() {
	        return this._cloneInto();
	    }
	};
	function wrapConstructor$1(hashCons) {
	    const hashC = (msg) => hashCons().update(toBytes$1(msg)).digest();
	    const tmp = hashCons();
	    hashC.outputLen = tmp.outputLen;
	    hashC.blockLen = tmp.blockLen;
	    hashC.create = () => hashCons();
	    return hashC;
	}

	/**
	 * Polyfill for Safari 14
	 */
	function setBigUint64$1(view, byteOffset, value, isLE) {
	    if (typeof view.setBigUint64 === 'function')
	        return view.setBigUint64(byteOffset, value, isLE);
	    const _32n = BigInt(32);
	    const _u32_max = BigInt(0xffffffff);
	    const wh = Number((value >> _32n) & _u32_max);
	    const wl = Number(value & _u32_max);
	    const h = isLE ? 4 : 0;
	    const l = isLE ? 0 : 4;
	    view.setUint32(byteOffset + h, wh, isLE);
	    view.setUint32(byteOffset + l, wl, isLE);
	}
	/**
	 * Choice: a ? b : c
	 */
	const Chi$1 = (a, b, c) => (a & b) ^ (~a & c);
	/**
	 * Majority function, true if any two inputs is true
	 */
	const Maj$1 = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
	/**
	 * Merkle-Damgard hash construction base class.
	 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
	 */
	let HashMD$1 = class HashMD extends Hash$1 {
	    constructor(blockLen, outputLen, padOffset, isLE) {
	        super();
	        this.blockLen = blockLen;
	        this.outputLen = outputLen;
	        this.padOffset = padOffset;
	        this.isLE = isLE;
	        this.finished = false;
	        this.length = 0;
	        this.pos = 0;
	        this.destroyed = false;
	        this.buffer = new Uint8Array(blockLen);
	        this.view = createView$1(this.buffer);
	    }
	    update(data) {
	        aexists$1(this);
	        const { view, buffer, blockLen } = this;
	        data = toBytes$1(data);
	        const len = data.length;
	        for (let pos = 0; pos < len;) {
	            const take = Math.min(blockLen - this.pos, len - pos);
	            // Fast path: we have at least one block in input, cast it to view and process
	            if (take === blockLen) {
	                const dataView = createView$1(data);
	                for (; blockLen <= len - pos; pos += blockLen)
	                    this.process(dataView, pos);
	                continue;
	            }
	            buffer.set(data.subarray(pos, pos + take), this.pos);
	            this.pos += take;
	            pos += take;
	            if (this.pos === blockLen) {
	                this.process(view, 0);
	                this.pos = 0;
	            }
	        }
	        this.length += data.length;
	        this.roundClean();
	        return this;
	    }
	    digestInto(out) {
	        aexists$1(this);
	        aoutput$1(out, this);
	        this.finished = true;
	        // Padding
	        // We can avoid allocation of buffer for padding completely if it
	        // was previously not allocated here. But it won't change performance.
	        const { buffer, view, blockLen, isLE } = this;
	        let { pos } = this;
	        // append the bit '1' to the message
	        buffer[pos++] = 0b10000000;
	        this.buffer.subarray(pos).fill(0);
	        // we have less than padOffset left in buffer, so we cannot put length in
	        // current block, need process it and pad again
	        if (this.padOffset > blockLen - pos) {
	            this.process(view, 0);
	            pos = 0;
	        }
	        // Pad until full block byte with zeros
	        for (let i = pos; i < blockLen; i++)
	            buffer[i] = 0;
	        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
	        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
	        // So we just write lowest 64 bits of that value.
	        setBigUint64$1(view, blockLen - 8, BigInt(this.length * 8), isLE);
	        this.process(view, 0);
	        const oview = createView$1(out);
	        const len = this.outputLen;
	        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
	        if (len % 4)
	            throw new Error('_sha2: outputLen should be aligned to 32bit');
	        const outLen = len / 4;
	        const state = this.get();
	        if (outLen > state.length)
	            throw new Error('_sha2: outputLen bigger than state');
	        for (let i = 0; i < outLen; i++)
	            oview.setUint32(4 * i, state[i], isLE);
	    }
	    digest() {
	        const { buffer, outputLen } = this;
	        this.digestInto(buffer);
	        const res = buffer.slice(0, outputLen);
	        this.destroy();
	        return res;
	    }
	    _cloneInto(to) {
	        to || (to = new this.constructor());
	        to.set(...this.get());
	        const { blockLen, buffer, length, finished, destroyed, pos } = this;
	        to.length = length;
	        to.pos = pos;
	        to.finished = finished;
	        to.destroyed = destroyed;
	        if (length % blockLen)
	            to.buffer.set(buffer);
	        return to;
	    }
	};

	// SHA2-256 need to try 2^128 hashes to execute birthday attack.
	// BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per late 2024.
	// Round constants:
	// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
	// prettier-ignore
	const SHA256_K$1 = /* @__PURE__ */ new Uint32Array([
	    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	]);
	// Initial state:
	// first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
	// prettier-ignore
	const SHA256_IV$1 = /* @__PURE__ */ new Uint32Array([
	    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	]);
	// Temporary buffer, not used to store anything between runs
	// Named this way because it matches specification.
	const SHA256_W$1 = /* @__PURE__ */ new Uint32Array(64);
	let SHA256$1 = class SHA256 extends HashMD$1 {
	    constructor() {
	        super(64, 32, 8, false);
	        // We cannot use array here since array allows indexing by variable
	        // which means optimizer/compiler cannot use registers.
	        this.A = SHA256_IV$1[0] | 0;
	        this.B = SHA256_IV$1[1] | 0;
	        this.C = SHA256_IV$1[2] | 0;
	        this.D = SHA256_IV$1[3] | 0;
	        this.E = SHA256_IV$1[4] | 0;
	        this.F = SHA256_IV$1[5] | 0;
	        this.G = SHA256_IV$1[6] | 0;
	        this.H = SHA256_IV$1[7] | 0;
	    }
	    get() {
	        const { A, B, C, D, E, F, G, H } = this;
	        return [A, B, C, D, E, F, G, H];
	    }
	    // prettier-ignore
	    set(A, B, C, D, E, F, G, H) {
	        this.A = A | 0;
	        this.B = B | 0;
	        this.C = C | 0;
	        this.D = D | 0;
	        this.E = E | 0;
	        this.F = F | 0;
	        this.G = G | 0;
	        this.H = H | 0;
	    }
	    process(view, offset) {
	        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
	        for (let i = 0; i < 16; i++, offset += 4)
	            SHA256_W$1[i] = view.getUint32(offset, false);
	        for (let i = 16; i < 64; i++) {
	            const W15 = SHA256_W$1[i - 15];
	            const W2 = SHA256_W$1[i - 2];
	            const s0 = rotr$1(W15, 7) ^ rotr$1(W15, 18) ^ (W15 >>> 3);
	            const s1 = rotr$1(W2, 17) ^ rotr$1(W2, 19) ^ (W2 >>> 10);
	            SHA256_W$1[i] = (s1 + SHA256_W$1[i - 7] + s0 + SHA256_W$1[i - 16]) | 0;
	        }
	        // Compression function main loop, 64 rounds
	        let { A, B, C, D, E, F, G, H } = this;
	        for (let i = 0; i < 64; i++) {
	            const sigma1 = rotr$1(E, 6) ^ rotr$1(E, 11) ^ rotr$1(E, 25);
	            const T1 = (H + sigma1 + Chi$1(E, F, G) + SHA256_K$1[i] + SHA256_W$1[i]) | 0;
	            const sigma0 = rotr$1(A, 2) ^ rotr$1(A, 13) ^ rotr$1(A, 22);
	            const T2 = (sigma0 + Maj$1(A, B, C)) | 0;
	            H = G;
	            G = F;
	            F = E;
	            E = (D + T1) | 0;
	            D = C;
	            C = B;
	            B = A;
	            A = (T1 + T2) | 0;
	        }
	        // Add the compressed chunk to the current hash value
	        A = (A + this.A) | 0;
	        B = (B + this.B) | 0;
	        C = (C + this.C) | 0;
	        D = (D + this.D) | 0;
	        E = (E + this.E) | 0;
	        F = (F + this.F) | 0;
	        G = (G + this.G) | 0;
	        H = (H + this.H) | 0;
	        this.set(A, B, C, D, E, F, G, H);
	    }
	    roundClean() {
	        SHA256_W$1.fill(0);
	    }
	    destroy() {
	        this.set(0, 0, 0, 0, 0, 0, 0, 0);
	        this.buffer.fill(0);
	    }
	};
	/**
	 * SHA2-256 hash function
	 * @param message - data that would be hashed
	 */
	const sha256$2 = /* @__PURE__ */ wrapConstructor$1(() => new SHA256$1());

	/**
	 * Convert common byte containers into a Uint8Array view when possible.
	 *
	 * Note: For sliced views, this preserves the original backing buffer and
	 * byte offsets. For `Array<number>`, this creates a copy because arrays do
	 * not have an `ArrayBuffer` backing store.
	 *
	 * Use `toPackedUint8Array` when a tightly packed buffer is required.
	 */
	const toUint8ArrayView = arr => {
	  return Array.isArray(arr) ? new Uint8Array(arr) : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
	};

	/**
	 * Ensure byte-like input is tightly packed and only includes the intended bytes.
	 *
	 * This copies when the input is a view into a larger backing store so callers
	 * like signing/verifying cannot observe unrelated bytes.
	 */
	const toPackedUint8Array = arr => {
	  if (Array.isArray(arr)) {
	    return new Uint8Array(arr);
	  }
	  if (arr.byteOffset === 0 && arr.byteLength === arr.buffer.byteLength) {
	    return arr instanceof Uint8Array ? arr : new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
	  }
	  return Uint8Array.from(arr);
	};

	/**
	 * Concatenate byte sequences into a newly allocated Uint8Array.
	 */
	const concatUint8Arrays = arrays => {
	  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
	  const result = new Uint8Array(totalLength);
	  let offset = 0;
	  for (const array of arrays) {
	    result.set(array, offset);
	    offset += array.length;
	  }
	  return result;
	};

	/**
	 * Calculate the SHA-256 hash of the input data using the Web Crypto API.
	 *
	 * @param data The input data to hash.
	 * @returns A promise that resolves to the SHA-256 hash of the input data.
	 */
	async function sha256$1(data) {
	  assertDigestCapabilityIsAvailable();
	  const normalizedData = toPackedUint8Array(data);
	  const digest = await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(normalizedData));
	  return new Uint8Array(digest);
	}

	/**
	 * Calculate the SHA-256 hash of the input data.
	 *
	 * @param data The input data to hash.
	 * @returns The SHA-256 hash of the input data.
	 * @deprecated Use `sha256` instead, which uses the Web Crypto API and reduces attack surface in modern environments.
	 */
	const sha256Sync = data => sha256$2(data);

	function anumber(n) {
	    if (!Number.isSafeInteger(n) || n < 0)
	        throw new Error('positive integer expected, got ' + n);
	}
	// copied from utils
	function isBytes$1(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	function abytes$1(b, ...lengths) {
	    if (!isBytes$1(b))
	        throw new Error('Uint8Array expected');
	    if (lengths.length > 0 && !lengths.includes(b.length))
	        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
	}
	function ahash(h) {
	    if (typeof h !== 'function' || typeof h.create !== 'function')
	        throw new Error('Hash should be wrapped by utils.wrapConstructor');
	    anumber(h.outputLen);
	    anumber(h.blockLen);
	}
	function aexists(instance, checkFinished = true) {
	    if (instance.destroyed)
	        throw new Error('Hash instance has been destroyed');
	    if (checkFinished && instance.finished)
	        throw new Error('Hash#digest() has already been called');
	}
	function aoutput(out, instance) {
	    abytes$1(out);
	    const min = instance.outputLen;
	    if (out.length < min) {
	        throw new Error('digestInto() expects output buffer of length at least ' + min);
	    }
	}

	const crypto$1 = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

	/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
	// node.js versions earlier than v19 don't declare it in global scope.
	// For node.js, package.json#exports field mapping rewrites import
	// from `crypto` to `cryptoNode`, which imports native module.
	// Makes the utils un-importable in browsers without a bundler.
	// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
	// Cast array to view
	const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
	// The rotate right (circular right shift) operation for uint32
	const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
	/**
	 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
	 */
	function utf8ToBytes$1(str) {
	    if (typeof str !== 'string')
	        throw new Error('utf8ToBytes expected string, got ' + typeof str);
	    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
	}
	/**
	 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
	 * Warning: when Uint8Array is passed, it would NOT get copied.
	 * Keep in mind for future mutable operations.
	 */
	function toBytes(data) {
	    if (typeof data === 'string')
	        data = utf8ToBytes$1(data);
	    abytes$1(data);
	    return data;
	}
	/**
	 * Copies several Uint8Arrays into one.
	 */
	function concatBytes$1(...arrays) {
	    let sum = 0;
	    for (let i = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        abytes$1(a);
	        sum += a.length;
	    }
	    const res = new Uint8Array(sum);
	    for (let i = 0, pad = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        res.set(a, pad);
	        pad += a.length;
	    }
	    return res;
	}
	// For runtime check if class implements interface
	class Hash {
	    // Safe version that clones internal state
	    clone() {
	        return this._cloneInto();
	    }
	}
	function wrapConstructor(hashCons) {
	    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
	    const tmp = hashCons();
	    hashC.outputLen = tmp.outputLen;
	    hashC.blockLen = tmp.blockLen;
	    hashC.create = () => hashCons();
	    return hashC;
	}
	/**
	 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
	 */
	function randomBytes(bytesLength = 32) {
	    if (crypto$1 && typeof crypto$1.getRandomValues === 'function') {
	        return crypto$1.getRandomValues(new Uint8Array(bytesLength));
	    }
	    // Legacy Node.js compatibility
	    if (crypto$1 && typeof crypto$1.randomBytes === 'function') {
	        return crypto$1.randomBytes(bytesLength);
	    }
	    throw new Error('crypto.getRandomValues must be defined');
	}

	/**
	 * Polyfill for Safari 14
	 */
	function setBigUint64(view, byteOffset, value, isLE) {
	    if (typeof view.setBigUint64 === 'function')
	        return view.setBigUint64(byteOffset, value, isLE);
	    const _32n = BigInt(32);
	    const _u32_max = BigInt(0xffffffff);
	    const wh = Number((value >> _32n) & _u32_max);
	    const wl = Number(value & _u32_max);
	    const h = isLE ? 4 : 0;
	    const l = isLE ? 0 : 4;
	    view.setUint32(byteOffset + h, wh, isLE);
	    view.setUint32(byteOffset + l, wl, isLE);
	}
	/**
	 * Choice: a ? b : c
	 */
	const Chi = (a, b, c) => (a & b) ^ (~a & c);
	/**
	 * Majority function, true if any two inputs is true
	 */
	const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
	/**
	 * Merkle-Damgard hash construction base class.
	 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
	 */
	class HashMD extends Hash {
	    constructor(blockLen, outputLen, padOffset, isLE) {
	        super();
	        this.blockLen = blockLen;
	        this.outputLen = outputLen;
	        this.padOffset = padOffset;
	        this.isLE = isLE;
	        this.finished = false;
	        this.length = 0;
	        this.pos = 0;
	        this.destroyed = false;
	        this.buffer = new Uint8Array(blockLen);
	        this.view = createView(this.buffer);
	    }
	    update(data) {
	        aexists(this);
	        const { view, buffer, blockLen } = this;
	        data = toBytes(data);
	        const len = data.length;
	        for (let pos = 0; pos < len;) {
	            const take = Math.min(blockLen - this.pos, len - pos);
	            // Fast path: we have at least one block in input, cast it to view and process
	            if (take === blockLen) {
	                const dataView = createView(data);
	                for (; blockLen <= len - pos; pos += blockLen)
	                    this.process(dataView, pos);
	                continue;
	            }
	            buffer.set(data.subarray(pos, pos + take), this.pos);
	            this.pos += take;
	            pos += take;
	            if (this.pos === blockLen) {
	                this.process(view, 0);
	                this.pos = 0;
	            }
	        }
	        this.length += data.length;
	        this.roundClean();
	        return this;
	    }
	    digestInto(out) {
	        aexists(this);
	        aoutput(out, this);
	        this.finished = true;
	        // Padding
	        // We can avoid allocation of buffer for padding completely if it
	        // was previously not allocated here. But it won't change performance.
	        const { buffer, view, blockLen, isLE } = this;
	        let { pos } = this;
	        // append the bit '1' to the message
	        buffer[pos++] = 0b10000000;
	        this.buffer.subarray(pos).fill(0);
	        // we have less than padOffset left in buffer, so we cannot put length in
	        // current block, need process it and pad again
	        if (this.padOffset > blockLen - pos) {
	            this.process(view, 0);
	            pos = 0;
	        }
	        // Pad until full block byte with zeros
	        for (let i = pos; i < blockLen; i++)
	            buffer[i] = 0;
	        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
	        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
	        // So we just write lowest 64 bits of that value.
	        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
	        this.process(view, 0);
	        const oview = createView(out);
	        const len = this.outputLen;
	        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
	        if (len % 4)
	            throw new Error('_sha2: outputLen should be aligned to 32bit');
	        const outLen = len / 4;
	        const state = this.get();
	        if (outLen > state.length)
	            throw new Error('_sha2: outputLen bigger than state');
	        for (let i = 0; i < outLen; i++)
	            oview.setUint32(4 * i, state[i], isLE);
	    }
	    digest() {
	        const { buffer, outputLen } = this;
	        this.digestInto(buffer);
	        const res = buffer.slice(0, outputLen);
	        this.destroy();
	        return res;
	    }
	    _cloneInto(to) {
	        to || (to = new this.constructor());
	        to.set(...this.get());
	        const { blockLen, buffer, length, finished, destroyed, pos } = this;
	        to.length = length;
	        to.pos = pos;
	        to.finished = finished;
	        to.destroyed = destroyed;
	        if (length % blockLen)
	            to.buffer.set(buffer);
	        return to;
	    }
	}

	const U32_MASK64$1 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
	const _32n$1 = /* @__PURE__ */ BigInt(32);
	// BigUint64Array is too slow as per 2024, so we implement it using Uint32Array.
	// TODO: re-check https://issues.chromium.org/issues/42212588
	function fromBig$1(n, le = false) {
	    if (le)
	        return { h: Number(n & U32_MASK64$1), l: Number((n >> _32n$1) & U32_MASK64$1) };
	    return { h: Number((n >> _32n$1) & U32_MASK64$1) | 0, l: Number(n & U32_MASK64$1) | 0 };
	}
	function split$1(lst, le = false) {
	    let Ah = new Uint32Array(lst.length);
	    let Al = new Uint32Array(lst.length);
	    for (let i = 0; i < lst.length; i++) {
	        const { h, l } = fromBig$1(lst[i], le);
	        [Ah[i], Al[i]] = [h, l];
	    }
	    return [Ah, Al];
	}
	const toBig = (h, l) => (BigInt(h >>> 0) << _32n$1) | BigInt(l >>> 0);
	// for Shift in [0, 32)
	const shrSH = (h, _l, s) => h >>> s;
	const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
	// Right rotate for Shift in [1, 32)
	const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
	const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
	// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
	const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
	// Right rotate for shift===32 (just swaps l&h)
	const rotr32H = (_h, l) => l;
	const rotr32L = (h, _l) => h;
	// Left rotate for Shift in [1, 32)
	const rotlSH$1 = (h, l, s) => (h << s) | (l >>> (32 - s));
	const rotlSL$1 = (h, l, s) => (l << s) | (h >>> (32 - s));
	// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotlBH$1 = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
	const rotlBL$1 = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
	// JS uses 32-bit signed integers for bitwise operations which means we cannot
	// simple take carry out of low bit sum by shift, we need to use division.
	function add(Ah, Al, Bh, Bl) {
	    const l = (Al >>> 0) + (Bl >>> 0);
	    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
	}
	// Addition with more than 2 elements
	const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
	const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
	const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
	const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
	const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
	const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
	// prettier-ignore
	const u64$1 = {
	    fromBig: fromBig$1, split: split$1, toBig,
	    shrSH, shrSL,
	    rotrSH, rotrSL, rotrBH, rotrBL,
	    rotr32H, rotr32L,
	    rotlSH: rotlSH$1, rotlSL: rotlSL$1, rotlBH: rotlBH$1, rotlBL: rotlBL$1,
	    add, add3L, add3H, add4L, add4H, add5H, add5L,
	};

	// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
	// prettier-ignore
	const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => u64$1.split([
	    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
	    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
	    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
	    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
	    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
	    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
	    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
	    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
	    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
	    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
	    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
	    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
	    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
	    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
	    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
	    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
	    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
	    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
	    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
	    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
	].map(n => BigInt(n))))();
	// Temporary buffer, not used to store anything between runs
	const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
	const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
	class SHA512 extends HashMD {
	    constructor() {
	        super(128, 64, 16, false);
	        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
	        // Also looks cleaner and easier to verify with spec.
	        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
	        // h -- high 32 bits, l -- low 32 bits
	        this.Ah = 0x6a09e667 | 0;
	        this.Al = 0xf3bcc908 | 0;
	        this.Bh = 0xbb67ae85 | 0;
	        this.Bl = 0x84caa73b | 0;
	        this.Ch = 0x3c6ef372 | 0;
	        this.Cl = 0xfe94f82b | 0;
	        this.Dh = 0xa54ff53a | 0;
	        this.Dl = 0x5f1d36f1 | 0;
	        this.Eh = 0x510e527f | 0;
	        this.El = 0xade682d1 | 0;
	        this.Fh = 0x9b05688c | 0;
	        this.Fl = 0x2b3e6c1f | 0;
	        this.Gh = 0x1f83d9ab | 0;
	        this.Gl = 0xfb41bd6b | 0;
	        this.Hh = 0x5be0cd19 | 0;
	        this.Hl = 0x137e2179 | 0;
	    }
	    // prettier-ignore
	    get() {
	        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
	        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
	    }
	    // prettier-ignore
	    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
	        this.Ah = Ah | 0;
	        this.Al = Al | 0;
	        this.Bh = Bh | 0;
	        this.Bl = Bl | 0;
	        this.Ch = Ch | 0;
	        this.Cl = Cl | 0;
	        this.Dh = Dh | 0;
	        this.Dl = Dl | 0;
	        this.Eh = Eh | 0;
	        this.El = El | 0;
	        this.Fh = Fh | 0;
	        this.Fl = Fl | 0;
	        this.Gh = Gh | 0;
	        this.Gl = Gl | 0;
	        this.Hh = Hh | 0;
	        this.Hl = Hl | 0;
	    }
	    process(view, offset) {
	        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
	        for (let i = 0; i < 16; i++, offset += 4) {
	            SHA512_W_H[i] = view.getUint32(offset);
	            SHA512_W_L[i] = view.getUint32((offset += 4));
	        }
	        for (let i = 16; i < 80; i++) {
	            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
	            const W15h = SHA512_W_H[i - 15] | 0;
	            const W15l = SHA512_W_L[i - 15] | 0;
	            const s0h = u64$1.rotrSH(W15h, W15l, 1) ^ u64$1.rotrSH(W15h, W15l, 8) ^ u64$1.shrSH(W15h, W15l, 7);
	            const s0l = u64$1.rotrSL(W15h, W15l, 1) ^ u64$1.rotrSL(W15h, W15l, 8) ^ u64$1.shrSL(W15h, W15l, 7);
	            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
	            const W2h = SHA512_W_H[i - 2] | 0;
	            const W2l = SHA512_W_L[i - 2] | 0;
	            const s1h = u64$1.rotrSH(W2h, W2l, 19) ^ u64$1.rotrBH(W2h, W2l, 61) ^ u64$1.shrSH(W2h, W2l, 6);
	            const s1l = u64$1.rotrSL(W2h, W2l, 19) ^ u64$1.rotrBL(W2h, W2l, 61) ^ u64$1.shrSL(W2h, W2l, 6);
	            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
	            const SUMl = u64$1.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
	            const SUMh = u64$1.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
	            SHA512_W_H[i] = SUMh | 0;
	            SHA512_W_L[i] = SUMl | 0;
	        }
	        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
	        // Compression function main loop, 80 rounds
	        for (let i = 0; i < 80; i++) {
	            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
	            const sigma1h = u64$1.rotrSH(Eh, El, 14) ^ u64$1.rotrSH(Eh, El, 18) ^ u64$1.rotrBH(Eh, El, 41);
	            const sigma1l = u64$1.rotrSL(Eh, El, 14) ^ u64$1.rotrSL(Eh, El, 18) ^ u64$1.rotrBL(Eh, El, 41);
	            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
	            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
	            const CHIl = (El & Fl) ^ (~El & Gl);
	            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
	            // prettier-ignore
	            const T1ll = u64$1.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
	            const T1h = u64$1.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
	            const T1l = T1ll | 0;
	            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
	            const sigma0h = u64$1.rotrSH(Ah, Al, 28) ^ u64$1.rotrBH(Ah, Al, 34) ^ u64$1.rotrBH(Ah, Al, 39);
	            const sigma0l = u64$1.rotrSL(Ah, Al, 28) ^ u64$1.rotrBL(Ah, Al, 34) ^ u64$1.rotrBL(Ah, Al, 39);
	            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
	            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
	            Hh = Gh | 0;
	            Hl = Gl | 0;
	            Gh = Fh | 0;
	            Gl = Fl | 0;
	            Fh = Eh | 0;
	            Fl = El | 0;
	            ({ h: Eh, l: El } = u64$1.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
	            Dh = Ch | 0;
	            Dl = Cl | 0;
	            Ch = Bh | 0;
	            Cl = Bl | 0;
	            Bh = Ah | 0;
	            Bl = Al | 0;
	            const All = u64$1.add3L(T1l, sigma0l, MAJl);
	            Ah = u64$1.add3H(All, T1h, sigma0h, MAJh);
	            Al = All | 0;
	        }
	        // Add the compressed chunk to the current hash value
	        ({ h: Ah, l: Al } = u64$1.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
	        ({ h: Bh, l: Bl } = u64$1.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
	        ({ h: Ch, l: Cl } = u64$1.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
	        ({ h: Dh, l: Dl } = u64$1.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
	        ({ h: Eh, l: El } = u64$1.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
	        ({ h: Fh, l: Fl } = u64$1.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
	        ({ h: Gh, l: Gl } = u64$1.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
	        ({ h: Hh, l: Hl } = u64$1.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
	        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	    }
	    roundClean() {
	        SHA512_W_H.fill(0);
	        SHA512_W_L.fill(0);
	    }
	    destroy() {
	        this.buffer.fill(0);
	        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	    }
	}
	const sha512 = /* @__PURE__ */ wrapConstructor(() => new SHA512());

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// 100 lines of code in the file are duplicated from noble-hashes (utils).
	// This is OK: `abstract` directory does not use noble-hashes.
	// User may opt-in into using different hashing library. This way, noble-hashes
	// won't be included into their bundle.
	const _0n$5 = /* @__PURE__ */ BigInt(0);
	const _1n$7 = /* @__PURE__ */ BigInt(1);
	const _2n$5 = /* @__PURE__ */ BigInt(2);
	function isBytes(a) {
	    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
	}
	function abytes(item) {
	    if (!isBytes(item))
	        throw new Error('Uint8Array expected');
	}
	function abool(title, value) {
	    if (typeof value !== 'boolean')
	        throw new Error(title + ' boolean expected, got ' + value);
	}
	// Array where index 0xf0 (240) is mapped to string 'f0'
	const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
	/**
	 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
	 */
	function bytesToHex(bytes) {
	    abytes(bytes);
	    // pre-caching improves the speed 6x
	    let hex = '';
	    for (let i = 0; i < bytes.length; i++) {
	        hex += hexes[bytes[i]];
	    }
	    return hex;
	}
	function numberToHexUnpadded(num) {
	    const hex = num.toString(16);
	    return hex.length & 1 ? '0' + hex : hex;
	}
	function hexToNumber(hex) {
	    if (typeof hex !== 'string')
	        throw new Error('hex string expected, got ' + typeof hex);
	    return hex === '' ? _0n$5 : BigInt('0x' + hex); // Big Endian
	}
	// We use optimized technique to convert hex string to byte array
	const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
	function asciiToBase16(ch) {
	    if (ch >= asciis._0 && ch <= asciis._9)
	        return ch - asciis._0; // '2' => 50-48
	    if (ch >= asciis.A && ch <= asciis.F)
	        return ch - (asciis.A - 10); // 'B' => 66-(65-10)
	    if (ch >= asciis.a && ch <= asciis.f)
	        return ch - (asciis.a - 10); // 'b' => 98-(97-10)
	    return;
	}
	/**
	 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
	 */
	function hexToBytes(hex) {
	    if (typeof hex !== 'string')
	        throw new Error('hex string expected, got ' + typeof hex);
	    const hl = hex.length;
	    const al = hl / 2;
	    if (hl % 2)
	        throw new Error('hex string expected, got unpadded hex of length ' + hl);
	    const array = new Uint8Array(al);
	    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
	        const n1 = asciiToBase16(hex.charCodeAt(hi));
	        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
	        if (n1 === undefined || n2 === undefined) {
	            const char = hex[hi] + hex[hi + 1];
	            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
	        }
	        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
	    }
	    return array;
	}
	// BE: Big Endian, LE: Little Endian
	function bytesToNumberBE(bytes) {
	    return hexToNumber(bytesToHex(bytes));
	}
	function bytesToNumberLE(bytes) {
	    abytes(bytes);
	    return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
	}
	function numberToBytesBE(n, len) {
	    return hexToBytes(n.toString(16).padStart(len * 2, '0'));
	}
	function numberToBytesLE(n, len) {
	    return numberToBytesBE(n, len).reverse();
	}
	// Unpadded, rarely used
	function numberToVarBytesBE(n) {
	    return hexToBytes(numberToHexUnpadded(n));
	}
	/**
	 * Takes hex string or Uint8Array, converts to Uint8Array.
	 * Validates output length.
	 * Will throw error for other types.
	 * @param title descriptive title for an error e.g. 'private key'
	 * @param hex hex string or Uint8Array
	 * @param expectedLength optional, will compare to result array's length
	 * @returns
	 */
	function ensureBytes(title, hex, expectedLength) {
	    let res;
	    if (typeof hex === 'string') {
	        try {
	            res = hexToBytes(hex);
	        }
	        catch (e) {
	            throw new Error(title + ' must be hex string or Uint8Array, cause: ' + e);
	        }
	    }
	    else if (isBytes(hex)) {
	        // Uint8Array.from() instead of hash.slice() because node.js Buffer
	        // is instance of Uint8Array, and its slice() creates **mutable** copy
	        res = Uint8Array.from(hex);
	    }
	    else {
	        throw new Error(title + ' must be hex string or Uint8Array');
	    }
	    const len = res.length;
	    if (typeof expectedLength === 'number' && len !== expectedLength)
	        throw new Error(title + ' of length ' + expectedLength + ' expected, got ' + len);
	    return res;
	}
	/**
	 * Copies several Uint8Arrays into one.
	 */
	function concatBytes(...arrays) {
	    let sum = 0;
	    for (let i = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        abytes(a);
	        sum += a.length;
	    }
	    const res = new Uint8Array(sum);
	    for (let i = 0, pad = 0; i < arrays.length; i++) {
	        const a = arrays[i];
	        res.set(a, pad);
	        pad += a.length;
	    }
	    return res;
	}
	// Compares 2 u8a-s in kinda constant time
	function equalBytes(a, b) {
	    if (a.length !== b.length)
	        return false;
	    let diff = 0;
	    for (let i = 0; i < a.length; i++)
	        diff |= a[i] ^ b[i];
	    return diff === 0;
	}
	/**
	 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
	 */
	function utf8ToBytes(str) {
	    if (typeof str !== 'string')
	        throw new Error('string expected');
	    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
	}
	// Is positive bigint
	const isPosBig = (n) => typeof n === 'bigint' && _0n$5 <= n;
	function inRange(n, min, max) {
	    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
	}
	/**
	 * Asserts min <= n < max. NOTE: It's < max and not <= max.
	 * @example
	 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
	 */
	function aInRange(title, n, min, max) {
	    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
	    // consider P=256n, min=0n, max=P
	    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
	    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
	    // - our way is the cleanest:               `inRange('x', x, 0n, P)
	    if (!inRange(n, min, max))
	        throw new Error('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
	}
	// Bit operations
	/**
	 * Calculates amount of bits in a bigint.
	 * Same as `n.toString(2).length`
	 */
	function bitLen(n) {
	    let len;
	    for (len = 0; n > _0n$5; n >>= _1n$7, len += 1)
	        ;
	    return len;
	}
	/**
	 * Gets single bit at position.
	 * NOTE: first bit position is 0 (same as arrays)
	 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
	 */
	function bitGet(n, pos) {
	    return (n >> BigInt(pos)) & _1n$7;
	}
	/**
	 * Sets single bit at position.
	 */
	function bitSet(n, pos, value) {
	    return n | ((value ? _1n$7 : _0n$5) << BigInt(pos));
	}
	/**
	 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
	 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
	 */
	const bitMask = (n) => (_2n$5 << BigInt(n - 1)) - _1n$7;
	// DRBG
	const u8n = (data) => new Uint8Array(data); // creates Uint8Array
	const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
	/**
	 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
	 * @returns function that will call DRBG until 2nd arg returns something meaningful
	 * @example
	 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
	 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
	 */
	function createHmacDrbg(hashLen, qByteLen, hmacFn) {
	    if (typeof hashLen !== 'number' || hashLen < 2)
	        throw new Error('hashLen must be a number');
	    if (typeof qByteLen !== 'number' || qByteLen < 2)
	        throw new Error('qByteLen must be a number');
	    if (typeof hmacFn !== 'function')
	        throw new Error('hmacFn must be a function');
	    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
	    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
	    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
	    let i = 0; // Iterations counter, will throw when over 1000
	    const reset = () => {
	        v.fill(1);
	        k.fill(0);
	        i = 0;
	    };
	    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
	    const reseed = (seed = u8n()) => {
	        // HMAC-DRBG reseed() function. Steps D-G
	        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
	        v = h(); // v = hmac(k || v)
	        if (seed.length === 0)
	            return;
	        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
	        v = h(); // v = hmac(k || v)
	    };
	    const gen = () => {
	        // HMAC-DRBG generate() function
	        if (i++ >= 1000)
	            throw new Error('drbg: tried 1000 values');
	        let len = 0;
	        const out = [];
	        while (len < qByteLen) {
	            v = h();
	            const sl = v.slice();
	            out.push(sl);
	            len += v.length;
	        }
	        return concatBytes(...out);
	    };
	    const genUntil = (seed, pred) => {
	        reset();
	        reseed(seed); // Steps D-G
	        let res = undefined; // Step H: grind until k is in [1..n-1]
	        while (!(res = pred(gen())))
	            reseed();
	        reset();
	        return res;
	    };
	    return genUntil;
	}
	// Validating curves and fields
	const validatorFns = {
	    bigint: (val) => typeof val === 'bigint',
	    function: (val) => typeof val === 'function',
	    boolean: (val) => typeof val === 'boolean',
	    string: (val) => typeof val === 'string',
	    stringOrUint8Array: (val) => typeof val === 'string' || isBytes(val),
	    isSafeInteger: (val) => Number.isSafeInteger(val),
	    array: (val) => Array.isArray(val),
	    field: (val, object) => object.Fp.isValid(val),
	    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
	};
	// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
	function validateObject(object, validators, optValidators = {}) {
	    const checkField = (fieldName, type, isOptional) => {
	        const checkVal = validatorFns[type];
	        if (typeof checkVal !== 'function')
	            throw new Error('invalid validator function');
	        const val = object[fieldName];
	        if (isOptional && val === undefined)
	            return;
	        if (!checkVal(val, object)) {
	            throw new Error('param ' + String(fieldName) + ' is invalid. Expected ' + type + ', got ' + val);
	        }
	    };
	    for (const [fieldName, type] of Object.entries(validators))
	        checkField(fieldName, type, false);
	    for (const [fieldName, type] of Object.entries(optValidators))
	        checkField(fieldName, type, true);
	    return object;
	}
	// validate type tests
	// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
	// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
	// // Should fail type-check
	// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
	// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
	// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
	// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });
	/**
	 * throws not implemented error
	 */
	const notImplemented = () => {
	    throw new Error('not implemented');
	};
	/**
	 * Memoizes (caches) computation result.
	 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
	 */
	function memoized(fn) {
	    const map = new WeakMap();
	    return (arg, ...args) => {
	        const val = map.get(arg);
	        if (val !== undefined)
	            return val;
	        const computed = fn(arg, ...args);
	        map.set(arg, computed);
	        return computed;
	    };
	}

	var ut = /*#__PURE__*/Object.freeze({
		__proto__: null,
		aInRange: aInRange,
		abool: abool,
		abytes: abytes,
		bitGet: bitGet,
		bitLen: bitLen,
		bitMask: bitMask,
		bitSet: bitSet,
		bytesToHex: bytesToHex,
		bytesToNumberBE: bytesToNumberBE,
		bytesToNumberLE: bytesToNumberLE,
		concatBytes: concatBytes,
		createHmacDrbg: createHmacDrbg,
		ensureBytes: ensureBytes,
		equalBytes: equalBytes,
		hexToBytes: hexToBytes,
		hexToNumber: hexToNumber,
		inRange: inRange,
		isBytes: isBytes,
		memoized: memoized,
		notImplemented: notImplemented,
		numberToBytesBE: numberToBytesBE,
		numberToBytesLE: numberToBytesLE,
		numberToHexUnpadded: numberToHexUnpadded,
		numberToVarBytesBE: numberToVarBytesBE,
		utf8ToBytes: utf8ToBytes,
		validateObject: validateObject
	});

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// Utilities for modular arithmetics and finite fields
	// prettier-ignore
	const _0n$4 = BigInt(0), _1n$6 = BigInt(1), _2n$4 = /* @__PURE__ */ BigInt(2), _3n$1 = /* @__PURE__ */ BigInt(3);
	// prettier-ignore
	const _4n = /* @__PURE__ */ BigInt(4), _5n$1 = /* @__PURE__ */ BigInt(5), _8n$2 = /* @__PURE__ */ BigInt(8);
	// Calculates a modulo b
	function mod(a, b) {
	    const result = a % b;
	    return result >= _0n$4 ? result : b + result;
	}
	/**
	 * Efficiently raise num to power and do modular division.
	 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
	 * @example
	 * pow(2n, 6n, 11n) // 64n % 11n == 9n
	 */
	// TODO: use field version && remove
	function pow(num, power, modulo) {
	    if (power < _0n$4)
	        throw new Error('invalid exponent, negatives unsupported');
	    if (modulo <= _0n$4)
	        throw new Error('invalid modulus');
	    if (modulo === _1n$6)
	        return _0n$4;
	    let res = _1n$6;
	    while (power > _0n$4) {
	        if (power & _1n$6)
	            res = (res * num) % modulo;
	        num = (num * num) % modulo;
	        power >>= _1n$6;
	    }
	    return res;
	}
	// Does x ^ (2 ^ power) mod p. pow2(30, 4) == 30 ^ (2 ^ 4)
	function pow2(x, power, modulo) {
	    let res = x;
	    while (power-- > _0n$4) {
	        res *= res;
	        res %= modulo;
	    }
	    return res;
	}
	// Inverses number over modulo
	function invert(number, modulo) {
	    if (number === _0n$4)
	        throw new Error('invert: expected non-zero number');
	    if (modulo <= _0n$4)
	        throw new Error('invert: expected positive modulus, got ' + modulo);
	    // Euclidean GCD https://brilliant.org/wiki/extended-euclidean-algorithm/
	    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
	    let a = mod(number, modulo);
	    let b = modulo;
	    // prettier-ignore
	    let x = _0n$4, u = _1n$6;
	    while (a !== _0n$4) {
	        // JIT applies optimization if those two lines follow each other
	        const q = b / a;
	        const r = b % a;
	        const m = x - u * q;
	        // prettier-ignore
	        b = a, a = r, x = u, u = m;
	    }
	    const gcd = b;
	    if (gcd !== _1n$6)
	        throw new Error('invert: does not exist');
	    return mod(x, modulo);
	}
	/**
	 * Tonelli-Shanks square root search algorithm.
	 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
	 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
	 * Will start an infinite loop if field order P is not prime.
	 * @param P field order
	 * @returns function that takes field Fp (created from P) and number n
	 */
	function tonelliShanks(P) {
	    // Legendre constant: used to calculate Legendre symbol (a | p),
	    // which denotes the value of a^((p-1)/2) (mod p).
	    // (a | p) ≡ 1    if a is a square (mod p)
	    // (a | p) ≡ -1   if a is not a square (mod p)
	    // (a | p) ≡ 0    if a ≡ 0 (mod p)
	    const legendreC = (P - _1n$6) / _2n$4;
	    let Q, S, Z;
	    // Step 1: By factoring out powers of 2 from p - 1,
	    // find q and s such that p - 1 = q*(2^s) with q odd
	    for (Q = P - _1n$6, S = 0; Q % _2n$4 === _0n$4; Q /= _2n$4, S++)
	        ;
	    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
	    for (Z = _2n$4; Z < P && pow(Z, legendreC, P) !== P - _1n$6; Z++) {
	        // Crash instead of infinity loop, we cannot reasonable count until P.
	        if (Z > 1000)
	            throw new Error('Cannot find square root: likely non-prime P');
	    }
	    // Fast-path
	    if (S === 1) {
	        const p1div4 = (P + _1n$6) / _4n;
	        return function tonelliFast(Fp, n) {
	            const root = Fp.pow(n, p1div4);
	            if (!Fp.eql(Fp.sqr(root), n))
	                throw new Error('Cannot find square root');
	            return root;
	        };
	    }
	    // Slow-path
	    const Q1div2 = (Q + _1n$6) / _2n$4;
	    return function tonelliSlow(Fp, n) {
	        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
	        if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
	            throw new Error('Cannot find square root');
	        let r = S;
	        // TODO: will fail at Fp2/etc
	        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
	        let x = Fp.pow(n, Q1div2); // first guess at the square root
	        let b = Fp.pow(n, Q); // first guess at the fudge factor
	        while (!Fp.eql(b, Fp.ONE)) {
	            if (Fp.eql(b, Fp.ZERO))
	                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
	            // Find m such b^(2^m)==1
	            let m = 1;
	            for (let t2 = Fp.sqr(b); m < r; m++) {
	                if (Fp.eql(t2, Fp.ONE))
	                    break;
	                t2 = Fp.sqr(t2); // t2 *= t2
	            }
	            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
	            const ge = Fp.pow(g, _1n$6 << BigInt(r - m - 1)); // ge = 2^(r-m-1)
	            g = Fp.sqr(ge); // g = ge * ge
	            x = Fp.mul(x, ge); // x *= ge
	            b = Fp.mul(b, g); // b *= g
	            r = m;
	        }
	        return x;
	    };
	}
	function FpSqrt(P) {
	    // NOTE: different algorithms can give different roots, it is up to user to decide which one they want.
	    // For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
	    // P ≡ 3 (mod 4)
	    // √n = n^((P+1)/4)
	    if (P % _4n === _3n$1) {
	        // Not all roots possible!
	        // const ORDER =
	        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
	        // const NUM = 72057594037927816n;
	        const p1div4 = (P + _1n$6) / _4n;
	        return function sqrt3mod4(Fp, n) {
	            const root = Fp.pow(n, p1div4);
	            // Throw if root**2 != n
	            if (!Fp.eql(Fp.sqr(root), n))
	                throw new Error('Cannot find square root');
	            return root;
	        };
	    }
	    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
	    if (P % _8n$2 === _5n$1) {
	        const c1 = (P - _5n$1) / _8n$2;
	        return function sqrt5mod8(Fp, n) {
	            const n2 = Fp.mul(n, _2n$4);
	            const v = Fp.pow(n2, c1);
	            const nv = Fp.mul(n, v);
	            const i = Fp.mul(Fp.mul(nv, _2n$4), v);
	            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
	            if (!Fp.eql(Fp.sqr(root), n))
	                throw new Error('Cannot find square root');
	            return root;
	        };
	    }
	    // Other cases: Tonelli-Shanks algorithm
	    return tonelliShanks(P);
	}
	// Little-endian check for first LE bit (last BE bit);
	const isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n$6) === _1n$6;
	// prettier-ignore
	const FIELD_FIELDS = [
	    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
	    'eql', 'add', 'sub', 'mul', 'pow', 'div',
	    'addN', 'subN', 'mulN', 'sqrN'
	];
	function validateField(field) {
	    const initial = {
	        ORDER: 'bigint',
	        MASK: 'bigint',
	        BYTES: 'isSafeInteger',
	        BITS: 'isSafeInteger',
	    };
	    const opts = FIELD_FIELDS.reduce((map, val) => {
	        map[val] = 'function';
	        return map;
	    }, initial);
	    return validateObject(field, opts);
	}
	// Generic field functions
	/**
	 * Same as `pow` but for Fp: non-constant-time.
	 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
	 */
	function FpPow(f, num, power) {
	    // Should have same speed as pow for bigints
	    // TODO: benchmark!
	    if (power < _0n$4)
	        throw new Error('invalid exponent, negatives unsupported');
	    if (power === _0n$4)
	        return f.ONE;
	    if (power === _1n$6)
	        return num;
	    let p = f.ONE;
	    let d = num;
	    while (power > _0n$4) {
	        if (power & _1n$6)
	            p = f.mul(p, d);
	        d = f.sqr(d);
	        power >>= _1n$6;
	    }
	    return p;
	}
	/**
	 * Efficiently invert an array of Field elements.
	 * `inv(0)` will return `undefined` here: make sure to throw an error.
	 */
	function FpInvertBatch(f, nums) {
	    const tmp = new Array(nums.length);
	    // Walk from first to last, multiply them by each other MOD p
	    const lastMultiplied = nums.reduce((acc, num, i) => {
	        if (f.is0(num))
	            return acc;
	        tmp[i] = acc;
	        return f.mul(acc, num);
	    }, f.ONE);
	    // Invert last element
	    const inverted = f.inv(lastMultiplied);
	    // Walk from last to first, multiply them by inverted each other MOD p
	    nums.reduceRight((acc, num, i) => {
	        if (f.is0(num))
	            return acc;
	        tmp[i] = f.mul(acc, tmp[i]);
	        return f.mul(acc, num);
	    }, inverted);
	    return tmp;
	}
	// CURVE.n lengths
	function nLength(n, nBitLength) {
	    // Bit size, byte size of CURVE.n
	    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
	    const nByteLength = Math.ceil(_nBitLength / 8);
	    return { nBitLength: _nBitLength, nByteLength };
	}
	/**
	 * Initializes a finite field over prime. **Non-primes are not supported.**
	 * Do not init in loop: slow. Very fragile: always run a benchmark on a change.
	 * Major performance optimizations:
	 * * a) denormalized operations like mulN instead of mul
	 * * b) same object shape: never add or remove keys
	 * * c) Object.freeze
	 * NOTE: operations don't check 'isValid' for all elements for performance reasons,
	 * it is caller responsibility to check this.
	 * This is low-level code, please make sure you know what you doing.
	 * @param ORDER prime positive bigint
	 * @param bitLen how many bits the field consumes
	 * @param isLE (def: false) if encoding / decoding should be in little-endian
	 * @param redef optional faster redefinitions of sqrt and other methods
	 */
	function Field(ORDER, bitLen, isLE = false, redef = {}) {
	    if (ORDER <= _0n$4)
	        throw new Error('invalid field: expected ORDER > 0, got ' + ORDER);
	    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
	    if (BYTES > 2048)
	        throw new Error('invalid field: expected ORDER of <= 2048 bytes');
	    let sqrtP; // cached sqrtP
	    const f = Object.freeze({
	        ORDER,
	        BITS,
	        BYTES,
	        MASK: bitMask(BITS),
	        ZERO: _0n$4,
	        ONE: _1n$6,
	        create: (num) => mod(num, ORDER),
	        isValid: (num) => {
	            if (typeof num !== 'bigint')
	                throw new Error('invalid field element: expected bigint, got ' + typeof num);
	            return _0n$4 <= num && num < ORDER; // 0 is valid element, but it's not invertible
	        },
	        is0: (num) => num === _0n$4,
	        isOdd: (num) => (num & _1n$6) === _1n$6,
	        neg: (num) => mod(-num, ORDER),
	        eql: (lhs, rhs) => lhs === rhs,
	        sqr: (num) => mod(num * num, ORDER),
	        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
	        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
	        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
	        pow: (num, power) => FpPow(f, num, power),
	        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
	        // Same as above, but doesn't normalize
	        sqrN: (num) => num * num,
	        addN: (lhs, rhs) => lhs + rhs,
	        subN: (lhs, rhs) => lhs - rhs,
	        mulN: (lhs, rhs) => lhs * rhs,
	        inv: (num) => invert(num, ORDER),
	        sqrt: redef.sqrt ||
	            ((n) => {
	                if (!sqrtP)
	                    sqrtP = FpSqrt(ORDER);
	                return sqrtP(f, n);
	            }),
	        invertBatch: (lst) => FpInvertBatch(f, lst),
	        // TODO: do we really need constant cmov?
	        // We don't have const-time bigints anyway, so probably will be not very useful
	        cmov: (a, b, c) => (c ? b : a),
	        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
	        fromBytes: (bytes) => {
	            if (bytes.length !== BYTES)
	                throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
	            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
	        },
	    });
	    return Object.freeze(f);
	}
	/**
	 * Returns total number of bytes consumed by the field element.
	 * For example, 32 bytes for usual 256-bit weierstrass curve.
	 * @param fieldOrder number of field elements, usually CURVE.n
	 * @returns byte length of field
	 */
	function getFieldBytesLength(fieldOrder) {
	    if (typeof fieldOrder !== 'bigint')
	        throw new Error('field order must be bigint');
	    const bitLength = fieldOrder.toString(2).length;
	    return Math.ceil(bitLength / 8);
	}
	/**
	 * Returns minimal amount of bytes that can be safely reduced
	 * by field order.
	 * Should be 2^-128 for 128-bit curve such as P256.
	 * @param fieldOrder number of field elements, usually CURVE.n
	 * @returns byte length of target hash
	 */
	function getMinHashLength(fieldOrder) {
	    const length = getFieldBytesLength(fieldOrder);
	    return length + Math.ceil(length / 2);
	}
	/**
	 * "Constant-time" private key generation utility.
	 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
	 * and convert them into private scalar, with the modulo bias being negligible.
	 * Needs at least 48 bytes of input for 32-byte private key.
	 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
	 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
	 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
	 * @param hash hash output from SHA3 or a similar function
	 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
	 * @param isLE interpret hash bytes as LE num
	 * @returns valid private scalar
	 */
	function mapHashToField(key, fieldOrder, isLE = false) {
	    const len = key.length;
	    const fieldLen = getFieldBytesLength(fieldOrder);
	    const minLen = getMinHashLength(fieldOrder);
	    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
	    if (len < 16 || len < minLen || len > 1024)
	        throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
	    const num = isLE ? bytesToNumberBE(key) : bytesToNumberLE(key);
	    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
	    const reduced = mod(num, fieldOrder - _1n$6) + _1n$6;
	    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
	}

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// Abelian group utilities
	const _0n$3 = BigInt(0);
	const _1n$5 = BigInt(1);
	function constTimeNegate(condition, item) {
	    const neg = item.negate();
	    return condition ? neg : item;
	}
	function validateW(W, bits) {
	    if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
	        throw new Error('invalid window size, expected [1..' + bits + '], got W=' + W);
	}
	function calcWOpts(W, bits) {
	    validateW(W, bits);
	    const windows = Math.ceil(bits / W) + 1; // +1, because
	    const windowSize = 2 ** (W - 1); // -1 because we skip zero
	    return { windows, windowSize };
	}
	function validateMSMPoints(points, c) {
	    if (!Array.isArray(points))
	        throw new Error('array expected');
	    points.forEach((p, i) => {
	        if (!(p instanceof c))
	            throw new Error('invalid point at index ' + i);
	    });
	}
	function validateMSMScalars(scalars, field) {
	    if (!Array.isArray(scalars))
	        throw new Error('array of scalars expected');
	    scalars.forEach((s, i) => {
	        if (!field.isValid(s))
	            throw new Error('invalid scalar at index ' + i);
	    });
	}
	// Since points in different groups cannot be equal (different object constructor),
	// we can have single place to store precomputes
	const pointPrecomputes = new WeakMap();
	const pointWindowSizes = new WeakMap(); // This allows use make points immutable (nothing changes inside)
	function getW(P) {
	    return pointWindowSizes.get(P) || 1;
	}
	// Elliptic curve multiplication of Point by scalar. Fragile.
	// Scalars should always be less than curve order: this should be checked inside of a curve itself.
	// Creates precomputation tables for fast multiplication:
	// - private scalar is split by fixed size windows of W bits
	// - every window point is collected from window's table & added to accumulator
	// - since windows are different, same point inside tables won't be accessed more than once per calc
	// - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
	// - +1 window is neccessary for wNAF
	// - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
	// TODO: Research returning 2d JS array of windows, instead of a single window. This would allow
	// windows to be in different memory locations
	function wNAF(c, bits) {
	    return {
	        constTimeNegate,
	        hasPrecomputes(elm) {
	            return getW(elm) !== 1;
	        },
	        // non-const time multiplication ladder
	        unsafeLadder(elm, n, p = c.ZERO) {
	            let d = elm;
	            while (n > _0n$3) {
	                if (n & _1n$5)
	                    p = p.add(d);
	                d = d.double();
	                n >>= _1n$5;
	            }
	            return p;
	        },
	        /**
	         * Creates a wNAF precomputation window. Used for caching.
	         * Default window size is set by `utils.precompute()` and is equal to 8.
	         * Number of precomputed points depends on the curve size:
	         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
	         * - 𝑊 is the window size
	         * - 𝑛 is the bitlength of the curve order.
	         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
	         * @param elm Point instance
	         * @param W window size
	         * @returns precomputed point tables flattened to a single array
	         */
	        precomputeWindow(elm, W) {
	            const { windows, windowSize } = calcWOpts(W, bits);
	            const points = [];
	            let p = elm;
	            let base = p;
	            for (let window = 0; window < windows; window++) {
	                base = p;
	                points.push(base);
	                // =1, because we skip zero
	                for (let i = 1; i < windowSize; i++) {
	                    base = base.add(p);
	                    points.push(base);
	                }
	                p = base.double();
	            }
	            return points;
	        },
	        /**
	         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
	         * @param W window size
	         * @param precomputes precomputed tables
	         * @param n scalar (we don't check here, but should be less than curve order)
	         * @returns real and fake (for const-time) points
	         */
	        wNAF(W, precomputes, n) {
	            // TODO: maybe check that scalar is less than group order? wNAF behavious is undefined otherwise
	            // But need to carefully remove other checks before wNAF. ORDER == bits here
	            const { windows, windowSize } = calcWOpts(W, bits);
	            let p = c.ZERO;
	            let f = c.BASE;
	            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
	            const maxNumber = 2 ** W;
	            const shiftBy = BigInt(W);
	            for (let window = 0; window < windows; window++) {
	                const offset = window * windowSize;
	                // Extract W bits.
	                let wbits = Number(n & mask);
	                // Shift number by W bits.
	                n >>= shiftBy;
	                // If the bits are bigger than max size, we'll split those.
	                // +224 => 256 - 32
	                if (wbits > windowSize) {
	                    wbits -= maxNumber;
	                    n += _1n$5;
	                }
	                // This code was first written with assumption that 'f' and 'p' will never be infinity point:
	                // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
	                // there is negate now: it is possible that negated element from low value
	                // would be the same as high element, which will create carry into next window.
	                // It's not obvious how this can fail, but still worth investigating later.
	                // Check if we're onto Zero point.
	                // Add random point inside current window to f.
	                const offset1 = offset;
	                const offset2 = offset + Math.abs(wbits) - 1; // -1 because we skip zero
	                const cond1 = window % 2 !== 0;
	                const cond2 = wbits < 0;
	                if (wbits === 0) {
	                    // The most important part for const-time getPublicKey
	                    f = f.add(constTimeNegate(cond1, precomputes[offset1]));
	                }
	                else {
	                    p = p.add(constTimeNegate(cond2, precomputes[offset2]));
	                }
	            }
	            // JIT-compiler should not eliminate f here, since it will later be used in normalizeZ()
	            // Even if the variable is still unused, there are some checks which will
	            // throw an exception, so compiler needs to prove they won't happen, which is hard.
	            // At this point there is a way to F be infinity-point even if p is not,
	            // which makes it less const-time: around 1 bigint multiply.
	            return { p, f };
	        },
	        /**
	         * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
	         * @param W window size
	         * @param precomputes precomputed tables
	         * @param n scalar (we don't check here, but should be less than curve order)
	         * @param acc accumulator point to add result of multiplication
	         * @returns point
	         */
	        wNAFUnsafe(W, precomputes, n, acc = c.ZERO) {
	            const { windows, windowSize } = calcWOpts(W, bits);
	            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
	            const maxNumber = 2 ** W;
	            const shiftBy = BigInt(W);
	            for (let window = 0; window < windows; window++) {
	                const offset = window * windowSize;
	                if (n === _0n$3)
	                    break; // No need to go over empty scalar
	                // Extract W bits.
	                let wbits = Number(n & mask);
	                // Shift number by W bits.
	                n >>= shiftBy;
	                // If the bits are bigger than max size, we'll split those.
	                // +224 => 256 - 32
	                if (wbits > windowSize) {
	                    wbits -= maxNumber;
	                    n += _1n$5;
	                }
	                if (wbits === 0)
	                    continue;
	                let curr = precomputes[offset + Math.abs(wbits) - 1]; // -1 because we skip zero
	                if (wbits < 0)
	                    curr = curr.negate();
	                // NOTE: by re-using acc, we can save a lot of additions in case of MSM
	                acc = acc.add(curr);
	            }
	            return acc;
	        },
	        getPrecomputes(W, P, transform) {
	            // Calculate precomputes on a first run, reuse them after
	            let comp = pointPrecomputes.get(P);
	            if (!comp) {
	                comp = this.precomputeWindow(P, W);
	                if (W !== 1)
	                    pointPrecomputes.set(P, transform(comp));
	            }
	            return comp;
	        },
	        wNAFCached(P, n, transform) {
	            const W = getW(P);
	            return this.wNAF(W, this.getPrecomputes(W, P, transform), n);
	        },
	        wNAFCachedUnsafe(P, n, transform, prev) {
	            const W = getW(P);
	            if (W === 1)
	                return this.unsafeLadder(P, n, prev); // For W=1 ladder is ~x2 faster
	            return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n, prev);
	        },
	        // We calculate precomputes for elliptic curve point multiplication
	        // using windowed method. This specifies window size and
	        // stores precomputed values. Usually only base point would be precomputed.
	        setWindowSize(P, W) {
	            validateW(W, bits);
	            pointWindowSizes.set(P, W);
	            pointPrecomputes.delete(P);
	        },
	    };
	}
	/**
	 * Pippenger algorithm for multi-scalar multiplication (MSM, Pa + Qb + Rc + ...).
	 * 30x faster vs naive addition on L=4096, 10x faster with precomputes.
	 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
	 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
	 * @param c Curve Point constructor
	 * @param fieldN field over CURVE.N - important that it's not over CURVE.P
	 * @param points array of L curve points
	 * @param scalars array of L scalars (aka private keys / bigints)
	 */
	function pippenger(c, fieldN, points, scalars) {
	    // If we split scalars by some window (let's say 8 bits), every chunk will only
	    // take 256 buckets even if there are 4096 scalars, also re-uses double.
	    // TODO:
	    // - https://eprint.iacr.org/2024/750.pdf
	    // - https://tches.iacr.org/index.php/TCHES/article/view/10287
	    // 0 is accepted in scalars
	    validateMSMPoints(points, c);
	    validateMSMScalars(scalars, fieldN);
	    if (points.length !== scalars.length)
	        throw new Error('arrays of points and scalars must have equal length');
	    const zero = c.ZERO;
	    const wbits = bitLen(BigInt(points.length));
	    const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1; // in bits
	    const MASK = (1 << windowSize) - 1;
	    const buckets = new Array(MASK + 1).fill(zero); // +1 for zero array
	    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
	    let sum = zero;
	    for (let i = lastBits; i >= 0; i -= windowSize) {
	        buckets.fill(zero);
	        for (let j = 0; j < scalars.length; j++) {
	            const scalar = scalars[j];
	            const wbits = Number((scalar >> BigInt(i)) & BigInt(MASK));
	            buckets[wbits] = buckets[wbits].add(points[j]);
	        }
	        let resI = zero; // not using this will do small speed-up, but will lose ct
	        // Skip first bucket, because it is zero
	        for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
	            sumI = sumI.add(buckets[j]);
	            resI = resI.add(sumI);
	        }
	        sum = sum.add(resI);
	        if (i !== 0)
	            for (let j = 0; j < windowSize; j++)
	                sum = sum.double();
	    }
	    return sum;
	}
	function validateBasic(curve) {
	    validateField(curve.Fp);
	    validateObject(curve, {
	        n: 'bigint',
	        h: 'bigint',
	        Gx: 'field',
	        Gy: 'field',
	    }, {
	        nBitLength: 'isSafeInteger',
	        nByteLength: 'isSafeInteger',
	    });
	    // Set defaults
	    return Object.freeze({
	        ...nLength(curve.n, curve.nBitLength),
	        ...curve,
	        ...{ p: curve.Fp.ORDER },
	    });
	}

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y²
	// Be friendly to bad ECMAScript parsers by not using bigint literals
	// prettier-ignore
	const _0n$2 = BigInt(0), _1n$4 = BigInt(1), _2n$3 = BigInt(2), _8n$1 = BigInt(8);
	// verification rule is either zip215 or rfc8032 / nist186-5. Consult fromHex:
	const VERIFY_DEFAULT = { zip215: true };
	function validateOpts$1(curve) {
	    const opts = validateBasic(curve);
	    validateObject(curve, {
	        hash: 'function',
	        a: 'bigint',
	        d: 'bigint',
	        randomBytes: 'function',
	    }, {
	        adjustScalarBytes: 'function',
	        domain: 'function',
	        uvRatio: 'function',
	        mapToCurve: 'function',
	    });
	    // Set defaults
	    return Object.freeze({ ...opts });
	}
	/**
	 * Creates Twisted Edwards curve with EdDSA signatures.
	 * @example
	 * import { Field } from '@noble/curves/abstract/modular';
	 * // Before that, define BigInt-s: a, d, p, n, Gx, Gy, h
	 * const curve = twistedEdwards({ a, d, Fp: Field(p), n, Gx, Gy, h })
	 */
	function twistedEdwards(curveDef) {
	    const CURVE = validateOpts$1(curveDef);
	    const { Fp, n: CURVE_ORDER, prehash: prehash, hash: cHash, randomBytes, nByteLength, h: cofactor, } = CURVE;
	    // Important:
	    // There are some places where Fp.BYTES is used instead of nByteLength.
	    // So far, everything has been tested with curves of Fp.BYTES == nByteLength.
	    // TODO: test and find curves which behave otherwise.
	    const MASK = _2n$3 << (BigInt(nByteLength * 8) - _1n$4);
	    const modP = Fp.create; // Function overrides
	    const Fn = Field(CURVE.n, CURVE.nBitLength);
	    // sqrt(u/v)
	    const uvRatio = CURVE.uvRatio ||
	        ((u, v) => {
	            try {
	                return { isValid: true, value: Fp.sqrt(u * Fp.inv(v)) };
	            }
	            catch (e) {
	                return { isValid: false, value: _0n$2 };
	            }
	        });
	    const adjustScalarBytes = CURVE.adjustScalarBytes || ((bytes) => bytes); // NOOP
	    const domain = CURVE.domain ||
	        ((data, ctx, phflag) => {
	            abool('phflag', phflag);
	            if (ctx.length || phflag)
	                throw new Error('Contexts/pre-hash are not supported');
	            return data;
	        }); // NOOP
	    // 0 <= n < MASK
	    // Coordinates larger than Fp.ORDER are allowed for zip215
	    function aCoordinate(title, n) {
	        aInRange('coordinate ' + title, n, _0n$2, MASK);
	    }
	    function assertPoint(other) {
	        if (!(other instanceof Point))
	            throw new Error('ExtendedPoint expected');
	    }
	    // Converts Extended point to default (x, y) coordinates.
	    // Can accept precomputed Z^-1 - for example, from invertBatch.
	    const toAffineMemo = memoized((p, iz) => {
	        const { ex: x, ey: y, ez: z } = p;
	        const is0 = p.is0();
	        if (iz == null)
	            iz = is0 ? _8n$1 : Fp.inv(z); // 8 was chosen arbitrarily
	        const ax = modP(x * iz);
	        const ay = modP(y * iz);
	        const zz = modP(z * iz);
	        if (is0)
	            return { x: _0n$2, y: _1n$4 };
	        if (zz !== _1n$4)
	            throw new Error('invZ was invalid');
	        return { x: ax, y: ay };
	    });
	    const assertValidMemo = memoized((p) => {
	        const { a, d } = CURVE;
	        if (p.is0())
	            throw new Error('bad point: ZERO'); // TODO: optimize, with vars below?
	        // Equation in affine coordinates: ax² + y² = 1 + dx²y²
	        // Equation in projective coordinates (X/Z, Y/Z, Z):  (aX² + Y²)Z² = Z⁴ + dX²Y²
	        const { ex: X, ey: Y, ez: Z, et: T } = p;
	        const X2 = modP(X * X); // X²
	        const Y2 = modP(Y * Y); // Y²
	        const Z2 = modP(Z * Z); // Z²
	        const Z4 = modP(Z2 * Z2); // Z⁴
	        const aX2 = modP(X2 * a); // aX²
	        const left = modP(Z2 * modP(aX2 + Y2)); // (aX² + Y²)Z²
	        const right = modP(Z4 + modP(d * modP(X2 * Y2))); // Z⁴ + dX²Y²
	        if (left !== right)
	            throw new Error('bad point: equation left != right (1)');
	        // In Extended coordinates we also have T, which is x*y=T/Z: check X*Y == Z*T
	        const XY = modP(X * Y);
	        const ZT = modP(Z * T);
	        if (XY !== ZT)
	            throw new Error('bad point: equation left != right (2)');
	        return true;
	    });
	    // Extended Point works in extended coordinates: (x, y, z, t) ∋ (x=x/z, y=y/z, t=xy).
	    // https://en.wikipedia.org/wiki/Twisted_Edwards_curve#Extended_coordinates
	    class Point {
	        constructor(ex, ey, ez, et) {
	            this.ex = ex;
	            this.ey = ey;
	            this.ez = ez;
	            this.et = et;
	            aCoordinate('x', ex);
	            aCoordinate('y', ey);
	            aCoordinate('z', ez);
	            aCoordinate('t', et);
	            Object.freeze(this);
	        }
	        get x() {
	            return this.toAffine().x;
	        }
	        get y() {
	            return this.toAffine().y;
	        }
	        static fromAffine(p) {
	            if (p instanceof Point)
	                throw new Error('extended point not allowed');
	            const { x, y } = p || {};
	            aCoordinate('x', x);
	            aCoordinate('y', y);
	            return new Point(x, y, _1n$4, modP(x * y));
	        }
	        static normalizeZ(points) {
	            const toInv = Fp.invertBatch(points.map((p) => p.ez));
	            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
	        }
	        // Multiscalar Multiplication
	        static msm(points, scalars) {
	            return pippenger(Point, Fn, points, scalars);
	        }
	        // "Private method", don't use it directly
	        _setWindowSize(windowSize) {
	            wnaf.setWindowSize(this, windowSize);
	        }
	        // Not required for fromHex(), which always creates valid points.
	        // Could be useful for fromAffine().
	        assertValidity() {
	            assertValidMemo(this);
	        }
	        // Compare one point to another.
	        equals(other) {
	            assertPoint(other);
	            const { ex: X1, ey: Y1, ez: Z1 } = this;
	            const { ex: X2, ey: Y2, ez: Z2 } = other;
	            const X1Z2 = modP(X1 * Z2);
	            const X2Z1 = modP(X2 * Z1);
	            const Y1Z2 = modP(Y1 * Z2);
	            const Y2Z1 = modP(Y2 * Z1);
	            return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
	        }
	        is0() {
	            return this.equals(Point.ZERO);
	        }
	        negate() {
	            // Flips point sign to a negative one (-x, y in affine coords)
	            return new Point(modP(-this.ex), this.ey, this.ez, modP(-this.et));
	        }
	        // Fast algo for doubling Extended Point.
	        // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
	        // Cost: 4M + 4S + 1*a + 6add + 1*2.
	        double() {
	            const { a } = CURVE;
	            const { ex: X1, ey: Y1, ez: Z1 } = this;
	            const A = modP(X1 * X1); // A = X12
	            const B = modP(Y1 * Y1); // B = Y12
	            const C = modP(_2n$3 * modP(Z1 * Z1)); // C = 2*Z12
	            const D = modP(a * A); // D = a*A
	            const x1y1 = X1 + Y1;
	            const E = modP(modP(x1y1 * x1y1) - A - B); // E = (X1+Y1)2-A-B
	            const G = D + B; // G = D+B
	            const F = G - C; // F = G-C
	            const H = D - B; // H = D-B
	            const X3 = modP(E * F); // X3 = E*F
	            const Y3 = modP(G * H); // Y3 = G*H
	            const T3 = modP(E * H); // T3 = E*H
	            const Z3 = modP(F * G); // Z3 = F*G
	            return new Point(X3, Y3, Z3, T3);
	        }
	        // Fast algo for adding 2 Extended Points.
	        // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
	        // Cost: 9M + 1*a + 1*d + 7add.
	        add(other) {
	            assertPoint(other);
	            const { a, d } = CURVE;
	            const { ex: X1, ey: Y1, ez: Z1, et: T1 } = this;
	            const { ex: X2, ey: Y2, ez: Z2, et: T2 } = other;
	            // Faster algo for adding 2 Extended Points when curve's a=-1.
	            // http://hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html#addition-add-2008-hwcd-4
	            // Cost: 8M + 8add + 2*2.
	            // Note: It does not check whether the `other` point is valid.
	            if (a === BigInt(-1)) {
	                const A = modP((Y1 - X1) * (Y2 + X2));
	                const B = modP((Y1 + X1) * (Y2 - X2));
	                const F = modP(B - A);
	                if (F === _0n$2)
	                    return this.double(); // Same point. Tests say it doesn't affect timing
	                const C = modP(Z1 * _2n$3 * T2);
	                const D = modP(T1 * _2n$3 * Z2);
	                const E = D + C;
	                const G = B + A;
	                const H = D - C;
	                const X3 = modP(E * F);
	                const Y3 = modP(G * H);
	                const T3 = modP(E * H);
	                const Z3 = modP(F * G);
	                return new Point(X3, Y3, Z3, T3);
	            }
	            const A = modP(X1 * X2); // A = X1*X2
	            const B = modP(Y1 * Y2); // B = Y1*Y2
	            const C = modP(T1 * d * T2); // C = T1*d*T2
	            const D = modP(Z1 * Z2); // D = Z1*Z2
	            const E = modP((X1 + Y1) * (X2 + Y2) - A - B); // E = (X1+Y1)*(X2+Y2)-A-B
	            const F = D - C; // F = D-C
	            const G = D + C; // G = D+C
	            const H = modP(B - a * A); // H = B-a*A
	            const X3 = modP(E * F); // X3 = E*F
	            const Y3 = modP(G * H); // Y3 = G*H
	            const T3 = modP(E * H); // T3 = E*H
	            const Z3 = modP(F * G); // Z3 = F*G
	            return new Point(X3, Y3, Z3, T3);
	        }
	        subtract(other) {
	            return this.add(other.negate());
	        }
	        wNAF(n) {
	            return wnaf.wNAFCached(this, n, Point.normalizeZ);
	        }
	        // Constant-time multiplication.
	        multiply(scalar) {
	            const n = scalar;
	            aInRange('scalar', n, _1n$4, CURVE_ORDER); // 1 <= scalar < L
	            const { p, f } = this.wNAF(n);
	            return Point.normalizeZ([p, f])[0];
	        }
	        // Non-constant-time multiplication. Uses double-and-add algorithm.
	        // It's faster, but should only be used when you don't care about
	        // an exposed private key e.g. sig verification.
	        // Does NOT allow scalars higher than CURVE.n.
	        // Accepts optional accumulator to merge with multiply (important for sparse scalars)
	        multiplyUnsafe(scalar, acc = Point.ZERO) {
	            const n = scalar;
	            aInRange('scalar', n, _0n$2, CURVE_ORDER); // 0 <= scalar < L
	            if (n === _0n$2)
	                return I;
	            if (this.is0() || n === _1n$4)
	                return this;
	            return wnaf.wNAFCachedUnsafe(this, n, Point.normalizeZ, acc);
	        }
	        // Checks if point is of small order.
	        // If you add something to small order point, you will have "dirty"
	        // point with torsion component.
	        // Multiplies point by cofactor and checks if the result is 0.
	        isSmallOrder() {
	            return this.multiplyUnsafe(cofactor).is0();
	        }
	        // Multiplies point by curve order and checks if the result is 0.
	        // Returns `false` is the point is dirty.
	        isTorsionFree() {
	            return wnaf.unsafeLadder(this, CURVE_ORDER).is0();
	        }
	        // Converts Extended point to default (x, y) coordinates.
	        // Can accept precomputed Z^-1 - for example, from invertBatch.
	        toAffine(iz) {
	            return toAffineMemo(this, iz);
	        }
	        clearCofactor() {
	            const { h: cofactor } = CURVE;
	            if (cofactor === _1n$4)
	                return this;
	            return this.multiplyUnsafe(cofactor);
	        }
	        // Converts hash string or Uint8Array to Point.
	        // Uses algo from RFC8032 5.1.3.
	        static fromHex(hex, zip215 = false) {
	            const { d, a } = CURVE;
	            const len = Fp.BYTES;
	            hex = ensureBytes('pointHex', hex, len); // copy hex to a new array
	            abool('zip215', zip215);
	            const normed = hex.slice(); // copy again, we'll manipulate it
	            const lastByte = hex[len - 1]; // select last byte
	            normed[len - 1] = lastByte & ~0x80; // clear last bit
	            const y = bytesToNumberLE(normed);
	            // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
	            // RFC8032 prohibits >= p, but ZIP215 doesn't
	            // zip215=true:  0 <= y < MASK (2^256 for ed25519)
	            // zip215=false: 0 <= y < P (2^255-19 for ed25519)
	            const max = zip215 ? MASK : Fp.ORDER;
	            aInRange('pointHex.y', y, _0n$2, max);
	            // Ed25519: x² = (y²-1)/(dy²+1) mod p. Ed448: x² = (y²-1)/(dy²-1) mod p. Generic case:
	            // ax²+y²=1+dx²y² => y²-1=dx²y²-ax² => y²-1=x²(dy²-a) => x²=(y²-1)/(dy²-a)
	            const y2 = modP(y * y); // denominator is always non-0 mod p.
	            const u = modP(y2 - _1n$4); // u = y² - 1
	            const v = modP(d * y2 - a); // v = d y² + 1.
	            let { isValid, value: x } = uvRatio(u, v); // √(u/v)
	            if (!isValid)
	                throw new Error('Point.fromHex: invalid y coordinate');
	            const isXOdd = (x & _1n$4) === _1n$4; // There are 2 square roots. Use x_0 bit to select proper
	            const isLastByteOdd = (lastByte & 0x80) !== 0; // x_0, last bit
	            if (!zip215 && x === _0n$2 && isLastByteOdd)
	                // if x=0 and x_0 = 1, fail
	                throw new Error('Point.fromHex: x=0 and x_0=1');
	            if (isLastByteOdd !== isXOdd)
	                x = modP(-x); // if x_0 != x mod 2, set x = p-x
	            return Point.fromAffine({ x, y });
	        }
	        static fromPrivateKey(privKey) {
	            return getExtendedPublicKey(privKey).point;
	        }
	        toRawBytes() {
	            const { x, y } = this.toAffine();
	            const bytes = numberToBytesLE(y, Fp.BYTES); // each y has 2 x values (x, -y)
	            bytes[bytes.length - 1] |= x & _1n$4 ? 0x80 : 0; // when compressing, it's enough to store y
	            return bytes; // and use the last byte to encode sign of x
	        }
	        toHex() {
	            return bytesToHex(this.toRawBytes()); // Same as toRawBytes, but returns string.
	        }
	    }
	    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, _1n$4, modP(CURVE.Gx * CURVE.Gy));
	    Point.ZERO = new Point(_0n$2, _1n$4, _1n$4, _0n$2); // 0, 1, 1, 0
	    const { BASE: G, ZERO: I } = Point;
	    const wnaf = wNAF(Point, nByteLength * 8);
	    function modN(a) {
	        return mod(a, CURVE_ORDER);
	    }
	    // Little-endian SHA512 with modulo n
	    function modN_LE(hash) {
	        return modN(bytesToNumberLE(hash));
	    }
	    /** Convenience method that creates public key and other stuff. RFC8032 5.1.5 */
	    function getExtendedPublicKey(key) {
	        const len = Fp.BYTES;
	        key = ensureBytes('private key', key, len);
	        // Hash private key with curve's hash function to produce uniformingly random input
	        // Check byte lengths: ensure(64, h(ensure(32, key)))
	        const hashed = ensureBytes('hashed private key', cHash(key), 2 * len);
	        const head = adjustScalarBytes(hashed.slice(0, len)); // clear first half bits, produce FE
	        const prefix = hashed.slice(len, 2 * len); // second half is called key prefix (5.1.6)
	        const scalar = modN_LE(head); // The actual private scalar
	        const point = G.multiply(scalar); // Point on Edwards curve aka public key
	        const pointBytes = point.toRawBytes(); // Uint8Array representation
	        return { head, prefix, scalar, point, pointBytes };
	    }
	    // Calculates EdDSA pub key. RFC8032 5.1.5. Privkey is hashed. Use first half with 3 bits cleared
	    function getPublicKey(privKey) {
	        return getExtendedPublicKey(privKey).pointBytes;
	    }
	    // int('LE', SHA512(dom2(F, C) || msgs)) mod N
	    function hashDomainToScalar(context = new Uint8Array(), ...msgs) {
	        const msg = concatBytes(...msgs);
	        return modN_LE(cHash(domain(msg, ensureBytes('context', context), !!prehash)));
	    }
	    /** Signs message with privateKey. RFC8032 5.1.6 */
	    function sign(msg, privKey, options = {}) {
	        msg = ensureBytes('message', msg);
	        if (prehash)
	            msg = prehash(msg); // for ed25519ph etc.
	        const { prefix, scalar, pointBytes } = getExtendedPublicKey(privKey);
	        const r = hashDomainToScalar(options.context, prefix, msg); // r = dom2(F, C) || prefix || PH(M)
	        const R = G.multiply(r).toRawBytes(); // R = rG
	        const k = hashDomainToScalar(options.context, R, pointBytes, msg); // R || A || PH(M)
	        const s = modN(r + k * scalar); // S = (r + k * s) mod L
	        aInRange('signature.s', s, _0n$2, CURVE_ORDER); // 0 <= s < l
	        const res = concatBytes(R, numberToBytesLE(s, Fp.BYTES));
	        return ensureBytes('result', res, Fp.BYTES * 2); // 64-byte signature
	    }
	    const verifyOpts = VERIFY_DEFAULT;
	    /**
	     * Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
	     * An extended group equation is checked.
	     */
	    function verify(sig, msg, publicKey, options = verifyOpts) {
	        const { context, zip215 } = options;
	        const len = Fp.BYTES; // Verifies EdDSA signature against message and public key. RFC8032 5.1.7.
	        sig = ensureBytes('signature', sig, 2 * len); // An extended group equation is checked.
	        msg = ensureBytes('message', msg);
	        publicKey = ensureBytes('publicKey', publicKey, len);
	        if (zip215 !== undefined)
	            abool('zip215', zip215);
	        if (prehash)
	            msg = prehash(msg); // for ed25519ph, etc
	        const s = bytesToNumberLE(sig.slice(len, 2 * len));
	        let A, R, SB;
	        try {
	            // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
	            // zip215=true:  0 <= y < MASK (2^256 for ed25519)
	            // zip215=false: 0 <= y < P (2^255-19 for ed25519)
	            A = Point.fromHex(publicKey, zip215);
	            R = Point.fromHex(sig.slice(0, len), zip215);
	            SB = G.multiplyUnsafe(s); // 0 <= s < l is done inside
	        }
	        catch (error) {
	            return false;
	        }
	        if (!zip215 && A.isSmallOrder())
	            return false;
	        const k = hashDomainToScalar(context, R.toRawBytes(), A.toRawBytes(), msg);
	        const RkA = R.add(A.multiplyUnsafe(k));
	        // Extended group equation
	        // [8][S]B = [8]R + [8][k]A'
	        return RkA.subtract(SB).clearCofactor().equals(Point.ZERO);
	    }
	    G._setWindowSize(8); // Enable precomputes. Slows down first publicKey computation by 20ms.
	    const utils = {
	        getExtendedPublicKey,
	        // ed25519 private keys are uniform 32b. No need to check for modulo bias, like in secp256k1.
	        randomPrivateKey: () => randomBytes(Fp.BYTES),
	        /**
	         * We're doing scalar multiplication (used in getPublicKey etc) with precomputed BASE_POINT
	         * values. This slows down first getPublicKey() by milliseconds (see Speed section),
	         * but allows to speed-up subsequent getPublicKey() calls up to 20x.
	         * @param windowSize 2, 4, 8, 16
	         */
	        precompute(windowSize = 8, point = Point.BASE) {
	            point._setWindowSize(windowSize);
	            point.multiply(BigInt(3));
	            return point;
	        },
	    };
	    return {
	        CURVE,
	        getPublicKey,
	        sign,
	        verify,
	        ExtendedPoint: Point,
	        utils,
	    };
	}

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	/**
	 * ed25519 Twisted Edwards curve with following addons:
	 * - X25519 ECDH
	 * - Ristretto cofactor elimination
	 * - Elligator hash-to-group / point indistinguishability
	 */
	const ED25519_P = BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949');
	// √(-1) aka √(a) aka 2^((p-1)/4)
	const ED25519_SQRT_M1 = /* @__PURE__ */ BigInt('19681161376707505956807079304988542015446066515923890162744021073123829784752');
	// prettier-ignore
	BigInt(0); const _1n$3 = BigInt(1), _2n$2 = BigInt(2); BigInt(3);
	// prettier-ignore
	const _5n = BigInt(5), _8n = BigInt(8);
	function ed25519_pow_2_252_3(x) {
	    // prettier-ignore
	    const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
	    const P = ED25519_P;
	    const x2 = (x * x) % P;
	    const b2 = (x2 * x) % P; // x^3, 11
	    const b4 = (pow2(b2, _2n$2, P) * b2) % P; // x^15, 1111
	    const b5 = (pow2(b4, _1n$3, P) * x) % P; // x^31
	    const b10 = (pow2(b5, _5n, P) * b5) % P;
	    const b20 = (pow2(b10, _10n, P) * b10) % P;
	    const b40 = (pow2(b20, _20n, P) * b20) % P;
	    const b80 = (pow2(b40, _40n, P) * b40) % P;
	    const b160 = (pow2(b80, _80n, P) * b80) % P;
	    const b240 = (pow2(b160, _80n, P) * b80) % P;
	    const b250 = (pow2(b240, _10n, P) * b10) % P;
	    const pow_p_5_8 = (pow2(b250, _2n$2, P) * x) % P;
	    // ^ To pow to (p+3)/8, multiply it by x.
	    return { pow_p_5_8, b2 };
	}
	function adjustScalarBytes(bytes) {
	    // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
	    // set the three least significant bits of the first byte
	    bytes[0] &= 248; // 0b1111_1000
	    // and the most significant bit of the last to zero,
	    bytes[31] &= 127; // 0b0111_1111
	    // set the second most significant bit of the last byte to 1
	    bytes[31] |= 64; // 0b0100_0000
	    return bytes;
	}
	// sqrt(u/v)
	function uvRatio(u, v) {
	    const P = ED25519_P;
	    const v3 = mod(v * v * v, P); // v³
	    const v7 = mod(v3 * v3 * v, P); // v⁷
	    // (p+3)/8 and (p-5)/8
	    const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
	    let x = mod(u * v3 * pow, P); // (uv³)(uv⁷)^(p-5)/8
	    const vx2 = mod(v * x * x, P); // vx²
	    const root1 = x; // First root candidate
	    const root2 = mod(x * ED25519_SQRT_M1, P); // Second root candidate
	    const useRoot1 = vx2 === u; // If vx² = u (mod p), x is a square root
	    const useRoot2 = vx2 === mod(-u, P); // If vx² = -u, set x <-- x * 2^((p-1)/4)
	    const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P); // There is no valid root, vx² = -u√(-1)
	    if (useRoot1)
	        x = root1;
	    if (useRoot2 || noRoot)
	        x = root2; // We return root2 anyway, for const-time
	    if (isNegativeLE(x, P))
	        x = mod(-x, P);
	    return { isValid: useRoot1 || useRoot2, value: x };
	}
	const Fp = /* @__PURE__ */ (() => Field(ED25519_P, undefined, true))();
	const ed25519Defaults = /* @__PURE__ */ (() => ({
	    // Param: a
	    a: BigInt(-1), // Fp.create(-1) is proper; our way still works and is faster
	    // d is equal to -121665/121666 over finite field.
	    // Negative number is P - number, and division is invert(number, P)
	    d: BigInt('37095705934669439343138083508754565189542113879843219016388785533085940283555'),
	    // Finite field 𝔽p over which we'll do calculations; 2n**255n - 19n
	    Fp,
	    // Subgroup order: how many points curve has
	    // 2n**252n + 27742317777372353535851937790883648493n;
	    n: BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989'),
	    // Cofactor
	    h: _8n,
	    // Base point (x, y) aka generator point
	    Gx: BigInt('15112221349535400772501151409588531511454012693041857206046113283949847762202'),
	    Gy: BigInt('46316835694926478169428394003475163141307993866256225615783033603165251855960'),
	    hash: sha512,
	    randomBytes,
	    adjustScalarBytes,
	    // dom2
	    // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
	    // Constant-time, u/√v
	    uvRatio,
	}))();
	/**
	 * ed25519 curve with EdDSA signatures.
	 */
	const ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();

	function isOnCurve(publicKey) {
	  try {
	    ed25519.ExtendedPoint.fromHex(publicKey);
	    return true;
	  } catch {
	    return false;
	  }
	}
	const sign = (message, secretKey) => ed25519.sign(message, secretKey.slice(0, 32));
	const verify = ed25519.verify;

	function assert$1 (condition, message) {
	  if (!condition) {
	    throw new Error(message || 'Assertion failed');
	  }
	}

	var _Address;

	/**
	 * Maximum length of derived pubkey seed
	 */
	const MAX_SEED_LENGTH = 32;

	/**
	 * Maximum number of seeds used to derive a program address.
	 */
	const MAX_SEEDS = 16;

	/**
	 * Size of public key in bytes
	 */
	const PUBLIC_KEY_LENGTH = 32;

	/**
	 * Value to be converted into public key
	 */

	const ERROR__INVALID_PUBLIC_KEY_INPUT = 'Invalid public key input';
	const ERROR__INVALID_SEEDS_POINT_ON_CURVE = 'Invalid seeds, address must fall off the curve';
	const ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE = 'Unable to find a viable program address nonce';
	const ADDRESS_CODEC = getAddressCodec();
	const PDA_MARKER_BYTES = new TextEncoder().encode('ProgramDerivedAddress');

	// local counter used by Address.unique()
	let uniquePublicKeyCounter = 1;

	/**
	 * A Solana address
	 */
	class Address {
	  /**
	   * Create a new Address object
	   * @param value ed25519 public key as bytes or base-58 encoded string
	   */
	  constructor(value) {
	    this._publicKeyBytes = void 0;
	    if (typeof value === 'string') {
	      this._publicKeyBytes = bytesFromAddressString(value);
	    } else if (isUint8ArrayLike(value)) {
	      this._publicKeyBytes = bytesFromUint8Array(new Uint8Array(value));
	    } else if (Array.isArray(value)) {
	      this._publicKeyBytes = bytesFromNumberArray(value);
	    } else if (value instanceof Address) {
	      this._publicKeyBytes = value.toBytes();
	    } else if (typeof value === 'number') {
	      this._publicKeyBytes = bytesFromNumber(value);
	    } else if (typeof value === 'bigint') {
	      this._publicKeyBytes = bytesFromBigInt(value);
	    } else {
	      assertUnreachablePublicKeyInput();
	    }
	  }

	  /**
	   * Returns a unique PublicKey for tests and benchmarks using a counter
	   * @deprecated To be removed in v3, and replaced with test-specific utilities for generating unique public keys.
	   */
	  static unique() {
	    const key = new Address(uniquePublicKeyCounter);
	    uniquePublicKeyCounter += 1;
	    return new Address(key.toBytes());
	  }

	  /**
	   * Default public key value. The base58-encoded string representation is all ones (as seen below)
	   * The underlying number is 32 bytes that are all zeros
	   */

	  /**
	   * Checks if two publicKeys are equal
	   */
	  equals(address) {
	    if (this === address) {
	      return true;
	    }
	    const left = this._publicKeyBytes;
	    const right = address._publicKeyBytes;
	    for (let index = 0; index < PUBLIC_KEY_LENGTH; index += 1) {
	      if (left[index] !== right[index]) {
	        return false;
	      }
	    }
	    return true;
	  }

	  /**
	   * Return the base-58 representation of the public key
	   */
	  toBase58() {
	    return ADDRESS_CODEC.decode(this._publicKeyBytes);
	  }
	  toJSON() {
	    return this.toBase58();
	  }

	  /**
	   * Return the byte array representation of the public key in big endian
	   */
	  toBytes() {
	    return new Uint8Array(this._publicKeyBytes);
	  }

	  /**
	   * Verify a signature for the provided message with this public key.
	   * @since 2.0.0
	   */
	  async verifySignature(signature, message) {
	    assertVerificationCapabilityIsAvailable();
	    const publicKeyBytes = Uint8Array.from(this._publicKeyBytes);
	    const publicKeyCryptoKey = await globalThis.crypto.subtle.importKey('raw', publicKeyBytes, {
	      name: 'Ed25519'
	    }, false, ['verify']);
	    return verifySignature(publicKeyCryptoKey, signatureBytes(signature), message);
	  }

	  /**
	   * Verify a signature for the provided message with this public key.
	   * @deprecated Deprecated: scheduled for removal in v3. Use {@link verifySignature} instead.
	   */
	  verifySignatureSync(signature, message) {
	    return verify(signature, message, this.toBytes());
	  }

	  /**
	   * Return the Buffer representation of the public key in big endian
	   * @deprecated Deprecated: scheduled for removal in v3. Use {@link toBytes} instead.
	   */
	  toBuffer() {
	    return bufferExports.Buffer.from(this._publicKeyBytes);
	  }

	  /**
	   * Borsh-compatible encoding (little-endian)
	   */
	  encode() {
	    return Uint8Array.from(this._publicKeyBytes).reverse();
	  }

	  /**
	   * Borsh-compatible decoding (little-endian)
	   */
	  static decode(data) {
	    const encoded = toUint8ArrayView(data);
	    assert$1(encoded.length === PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
	    return new Address(reverseCopyLittleEndianPublicKeyBytes(encoded));
	  }

	  /**
	   * Borsh-compatible unchecked decoding (little-endian)
	   */
	  static decodeUnchecked(data) {
	    const encoded = toUint8ArrayView(data);
	    assert$1(encoded.length >= PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
	    const firstField = encoded.subarray(0, PUBLIC_KEY_LENGTH);
	    return new Address(reverseCopyLittleEndianPublicKeyBytes(firstField));
	  }
	  get [Symbol.toStringTag]() {
	    return `Address(${this.toString()})`;
	  }

	  /**
	   * Return the base-58 representation of the public key
	   */
	  toString() {
	    return this.toBase58();
	  }

	  /**
	   * Derive a public key from another key, a seed, and a program ID.
	   * The program ID will also serve as the owner of the public key, giving
	   * it permission to write data to the account.
	   */
	  static async createWithSeed(fromAddress, seed, programId) {
	    const baseAddress = fromAddress.toBase58();
	    assertIsAddress(baseAddress);
	    const programAddress = programId.toBase58();
	    assertIsAddress(programAddress);
	    const derivedAddress = await createAddressWithSeed({
	      baseAddress,
	      programAddress,
	      seed
	    });
	    return new Address(derivedAddress);
	  }

	  /**
	   * Sync version of createProgramAddress
	   * For backwards compatibility
	   *
	   * @deprecated Use {@link createProgramAddress} instead
	   */
	  static createProgramAddressSync(seeds, programId) {
	    const bytes = buildProgramDerivedAddressInputBytes(seeds, programId);
	    const publicKeyBytes = sha256Sync(bytes);
	    if (isOnCurve(publicKeyBytes)) {
	      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
	    }
	    return new Address(publicKeyBytes);
	  }

	  /**
	   * Derive a program address from seeds and a program ID.
	   */
	  static async createProgramAddress(seeds, programId) {
	    const bytes = buildProgramDerivedAddressInputBytes(seeds, programId);
	    const publicKeyBytes = await sha256$1(bytes);
	    if (isOnCurve(publicKeyBytes)) {
	      throw new Error(ERROR__INVALID_SEEDS_POINT_ON_CURVE);
	    }
	    return new Address(publicKeyBytes);
	  }

	  /**
	   * Find a valid program address
	   *
	   * Valid program addresses must fall off the ed25519 curve.  This function
	   * iterates a nonce until it finds one that when combined with the seeds
	   * results in a valid program address.
	   */
	  static findProgramAddressSync(seeds, programId) {
	    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
	      try {
	        const derivedAddress = this.createProgramAddressSync(seedsWithNonce, programId);
	        return [derivedAddress, nonce];
	      } catch (err) {
	        if (isInvalidSeedsPointOnCurveError(err)) {
	          continue;
	        }
	        throw err;
	      }
	    }
	    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
	  }

	  /**
	   * Async version of findProgramAddressSync
	   * For backwards compatibility
	   *
	   * @deprecated Use {@link findProgramAddressSync} instead
	   */
	  static async findProgramAddress(seeds, programId) {
	    for (const [nonce, seedsWithNonce] of programAddressNonceCandidates(seeds)) {
	      try {
	        const derivedAddress = await this.createProgramAddress(seedsWithNonce, programId);
	        return [derivedAddress, nonce];
	      } catch (err) {
	        if (isInvalidSeedsPointOnCurveError(err)) {
	          continue;
	        }
	        throw err;
	      }
	    }
	    throw new Error(ERROR__FAILED_TO_FIND_VIABLE_PROGRAM_ADDRESS_NONCE);
	  }

	  /**
	   * Check that a pubkey is on the ed25519 curve.
	   */
	  static isOnCurve(addressData) {
	    const address = new Address(addressData);
	    return isOnCurve(address.toBytes());
	  }
	}
	_Address = Address;
	Address.default = new _Address('11111111111111111111111111111111');
	function isUint8ArrayLike(value) {
	  return value instanceof Uint8Array;
	}
	function assertUnreachablePublicKeyInput(value) {
	  throw new Error(ERROR__INVALID_PUBLIC_KEY_INPUT);
	}
	function isInvalidSeedsPointOnCurveError(error) {
	  return error instanceof Error && error.message === ERROR__INVALID_SEEDS_POINT_ON_CURVE;
	}
	function* programAddressNonceCandidates(seeds) {
	  let nonce = 255;
	  while (nonce != 0) {
	    yield [nonce, seeds.concat(Uint8Array.of(nonce))];
	    nonce--;
	  }
	}
	function buildProgramDerivedAddressInputBytes(seeds, programId) {
	  if (seeds.length > MAX_SEEDS) {
	    throw new TypeError(`Max seed count exceeded`);
	  }
	  for (const seed of seeds) {
	    if (seed.length > MAX_SEED_LENGTH) {
	      throw new TypeError(`Max seed length exceeded`);
	    }
	  }
	  return concatUint8Arrays([...seeds, programId.toBytes(), PDA_MARKER_BYTES]);
	}
	function reverseCopyLittleEndianPublicKeyBytes(bytes) {
	  const reversedBytes = new Uint8Array(PUBLIC_KEY_LENGTH);
	  for (let index = 0; index < PUBLIC_KEY_LENGTH; index++) {
	    reversedBytes[index] = bytes[PUBLIC_KEY_LENGTH - 1 - index];
	  }
	  return reversedBytes;
	}

	/**
	 * Normalize constructor Uint8Array input into a canonical 32-byte public key byte array.
	 * @internal
	 */
	function bytesFromUint8Array(bytes) {
	  assert$1(bytes.length <= PUBLIC_KEY_LENGTH, ERROR__INVALID_PUBLIC_KEY_INPUT);
	  if (bytes.length === PUBLIC_KEY_LENGTH) {
	    return new Uint8Array(bytes);
	  }
	  const padded = new Uint8Array(PUBLIC_KEY_LENGTH);
	  padded.set(bytes, PUBLIC_KEY_LENGTH - bytes.length);
	  return padded;
	}

	/**
	 * Convert constructor number input into a canonical 32-byte public key byte array.
	 * @internal
	 */
	function bytesFromNumber(value) {
	  const isValidNumber = Number.isSafeInteger(value) && value >= 0;
	  assert$1(isValidNumber, ERROR__INVALID_PUBLIC_KEY_INPUT);
	  return bytesFromBigInt(BigInt(value));
	}

	/**
	 * Convert constructor bigint input into a canonical 32-byte public key byte array.
	 * @internal
	 */
	function bytesFromBigInt(value) {
	  assert$1(value >= 0n && value <= 0xffffffffffffffff_ffffffffffffffff_ffffffffffffffff_ffffffffffffffffn, ERROR__INVALID_PUBLIC_KEY_INPUT);
	  const out = new Uint8Array(PUBLIC_KEY_LENGTH);
	  let remainder = value;
	  for (let index = PUBLIC_KEY_LENGTH - 1; index >= 0 && remainder > 0n; index -= 1) {
	    out[index] = Number(remainder & 0xffn);
	    remainder >>= 8n;
	  }
	  return out;
	}

	/**
	 * Convert constructor address-string input into a public key byte array.
	 * @internal
	 */
	function bytesFromAddressString(value) {
	  assertIsAddress(value);
	  const encoded = ADDRESS_CODEC.encode(value);
	  return new Uint8Array(encoded);
	}

	/**
	 * Convert constructor number-array input into a canonical 32-byte public key byte array.
	 * @internal
	 */
	function bytesFromNumberArray(value) {
	  const parsed = new Uint8Array(value.length);
	  for (let index = 0; index < value.length; index += 1) {
	    const byteValue = value[index];
	    const isValidByte = Number.isInteger(byteValue) && byteValue >= 0 && byteValue <= 0xff;
	    assert$1(isValidByte, ERROR__INVALID_PUBLIC_KEY_INPUT);
	    parsed[index] = byteValue;
	  }
	  return bytesFromUint8Array(parsed);
	}

	const BPF_LOADER_DEPRECATED_PROGRAM_ID = new Address('BPFLoader1111111111111111111111111111111111');

	// src/assertions.ts
	function assertNumberIsBetweenForCodec(codecDescription, min, max, value) {
	  if (value < min || value > max) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__NUMBER_OUT_OF_RANGE, {
	      codecDescription,
	      max,
	      min,
	      value
	    });
	  }
	}
	function isLittleEndian(config) {
	  return config?.endian === 1 /* Big */ ? false : true;
	}
	function numberEncoderFactory(input) {
	  return createEncoder({
	    fixedSize: input.size,
	    write(value, bytes, offset) {
	      if (input.range) {
	        assertNumberIsBetweenForCodec(input.name, input.range[0], input.range[1], value);
	      }
	      const arrayBuffer = new ArrayBuffer(input.size);
	      input.set(new DataView(arrayBuffer), value, isLittleEndian(input.config));
	      bytes.set(new Uint8Array(arrayBuffer), offset);
	      return offset + input.size;
	    }
	  });
	}
	function numberDecoderFactory(input) {
	  return createDecoder({
	    fixedSize: input.size,
	    read(bytes, offset = 0) {
	      assertByteArrayIsNotEmptyForCodec(input.name, bytes, offset);
	      assertByteArrayHasEnoughBytesForCodec(input.name, input.size, bytes, offset);
	      const view = new DataView(toArrayBuffer(bytes, offset, input.size));
	      return [input.get(view, isLittleEndian(input.config)), offset + input.size];
	    }
	  });
	}
	var getI64Encoder = (config = {}) => numberEncoderFactory({
	  config,
	  name: "i64",
	  range: [-BigInt("0x7fffffffffffffff") - 1n, BigInt("0x7fffffffffffffff")],
	  set: (view, value, le) => view.setBigInt64(0, BigInt(value), le),
	  size: 8
	});
	var getI64Decoder = (config = {}) => numberDecoderFactory({
	  config,
	  get: (view, le) => view.getBigInt64(0, le),
	  name: "i64",
	  size: 8
	});
	var getI64Codec = (config = {}) => combineCodec(getI64Encoder(config), getI64Decoder(config));
	var getShortU16Encoder = () => createEncoder({
	  getSizeFromValue: (value) => {
	    if (value <= 127) return 1;
	    if (value <= 16383) return 2;
	    return 3;
	  },
	  maxSize: 3,
	  write: (value, bytes, offset) => {
	    assertNumberIsBetweenForCodec("shortU16", 0, 65535, value);
	    const shortU16Bytes = [0];
	    for (let ii = 0; ; ii += 1) {
	      const alignedValue = Number(value) >> ii * 7;
	      if (alignedValue === 0) {
	        break;
	      }
	      const nextSevenBits = 127 & alignedValue;
	      shortU16Bytes[ii] = nextSevenBits;
	      if (ii > 0) {
	        shortU16Bytes[ii - 1] |= 128;
	      }
	    }
	    bytes.set(shortU16Bytes, offset);
	    return offset + shortU16Bytes.length;
	  }
	});
	var getShortU16Decoder = () => createDecoder({
	  maxSize: 3,
	  read: (bytes, offset) => {
	    let value = 0;
	    let byteCount = 0;
	    while (++byteCount) {
	      const byteIndex = byteCount - 1;
	      const currentByte = bytes[offset + byteIndex];
	      const nextSevenBits = 127 & currentByte;
	      value |= nextSevenBits << byteIndex * 7;
	      if ((currentByte & 128) === 0) {
	        break;
	      }
	    }
	    return [value, offset + byteCount];
	  }
	});
	var getU16Encoder = (config = {}) => numberEncoderFactory({
	  config,
	  name: "u16",
	  range: [0, Number("0xffff")],
	  set: (view, value, le) => view.setUint16(0, Number(value), le),
	  size: 2
	});
	var getU32Encoder = (config = {}) => numberEncoderFactory({
	  config,
	  name: "u32",
	  range: [0, Number("0xffffffff")],
	  set: (view, value, le) => view.setUint32(0, Number(value), le),
	  size: 4
	});
	var getU32Decoder = (config = {}) => numberDecoderFactory({
	  config,
	  get: (view, le) => view.getUint32(0, le),
	  name: "u32",
	  size: 4
	});
	var getU32Codec = (config = {}) => combineCodec(getU32Encoder(config), getU32Decoder(config));
	var getU64Encoder = (config = {}) => numberEncoderFactory({
	  config,
	  name: "u64",
	  range: [0n, BigInt("0xffffffffffffffff")],
	  set: (view, value, le) => view.setBigUint64(0, BigInt(value), le),
	  size: 8
	});
	var getU64Decoder = (config = {}) => numberDecoderFactory({
	  config,
	  get: (view, le) => view.getBigUint64(0, le),
	  name: "u64",
	  size: 8
	});
	var getU64Codec = (config = {}) => combineCodec(getU64Encoder(config), getU64Decoder(config));
	var getU8Encoder = () => numberEncoderFactory({
	  name: "u8",
	  range: [0, Number("0xff")],
	  set: (view, value) => view.setUint8(0, Number(value)),
	  size: 1
	});
	var getU8Decoder = () => numberDecoderFactory({
	  get: (view) => view.getUint8(0),
	  name: "u8",
	  size: 1
	});
	var getU8Codec = () => combineCodec(getU8Encoder(), getU8Decoder());

	// src/array.ts
	function assertValidNumberOfItemsForCodec(codecDescription, expected, actual) {
	  if (expected !== actual) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_NUMBER_OF_ITEMS, {
	      actual,
	      codecDescription,
	      expected
	    });
	  }
	}
	function sumCodecSizes(sizes) {
	  return sizes.reduce((all, size) => all === null || size === null ? null : all + size, 0);
	}
	function getFixedSize(codec) {
	  return isFixedSize(codec) ? codec.fixedSize : null;
	}
	function getMaxSize(codec) {
	  return isFixedSize(codec) ? codec.fixedSize : codec.maxSize ?? null;
	}

	// src/array.ts
	function getArrayEncoder(item, config = {}) {
	  const size = config.size ?? getU32Encoder();
	  const fixedSize = computeArrayLikeCodecSize(size, getFixedSize(item));
	  const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? void 0;
	  return createEncoder({
	    ...fixedSize !== null ? { fixedSize } : {
	      getSizeFromValue: (array) => {
	        const prefixSize = typeof size === "object" ? getEncodedSize(array.length, size) : 0;
	        return prefixSize + [...array].reduce((all, value) => all + getEncodedSize(value, item), 0);
	      },
	      maxSize
	    },
	    write: (array, bytes, offset) => {
	      if (typeof size === "number") {
	        assertValidNumberOfItemsForCodec("array", size, array.length);
	      }
	      if (typeof size === "object") {
	        offset = size.write(array.length, bytes, offset);
	      }
	      array.forEach((value) => {
	        offset = item.write(value, bytes, offset);
	      });
	      return offset;
	    }
	  });
	}
	function getArrayDecoder(item, config = {}) {
	  const size = config.size ?? getU32Decoder();
	  const itemSize = getFixedSize(item);
	  const fixedSize = computeArrayLikeCodecSize(size, itemSize);
	  const maxSize = computeArrayLikeCodecSize(size, getMaxSize(item)) ?? void 0;
	  return createDecoder({
	    ...fixedSize !== null ? { fixedSize } : { maxSize },
	    read: (bytes, offset) => {
	      const array = [];
	      if (typeof size === "object" && bytes.slice(offset).length === 0) {
	        return [array, offset];
	      }
	      if (size === "remainder") {
	        while (offset < bytes.length) {
	          const [value, newOffset2] = item.read(bytes, offset);
	          offset = newOffset2;
	          array.push(value);
	        }
	        return [array, offset];
	      }
	      const [resolvedSize, newOffset] = typeof size === "number" ? [size, offset] : size.read(bytes, offset);
	      offset = newOffset;
	      for (let i = 0; i < resolvedSize; i += 1) {
	        const [value, newOffset2] = item.read(bytes, offset);
	        offset = newOffset2;
	        array.push(value);
	      }
	      return [array, offset];
	    }
	  });
	}
	function getArrayCodec(item, config = {}) {
	  return combineCodec(getArrayEncoder(item, config), getArrayDecoder(item, config));
	}
	function computeArrayLikeCodecSize(size, itemSize) {
	  if (typeof size !== "number") return null;
	  if (size === 0) return 0;
	  return itemSize === null ? null : itemSize * size;
	}
	function getBytesEncoder() {
	  return createEncoder({
	    getSizeFromValue: (value) => value.length,
	    write: (value, bytes, offset) => {
	      bytes.set(value, offset);
	      return offset + value.length;
	    }
	  });
	}
	function getBytesDecoder() {
	  return createDecoder({
	    read: (bytes, offset) => {
	      const slice = bytes.slice(offset);
	      return [slice, offset + slice.length];
	    }
	  });
	}
	function getBytesCodec() {
	  return combineCodec(getBytesEncoder(), getBytesDecoder());
	}

	// src/enum-helpers.ts
	function getEnumStats(constructor) {
	  const numericalValues = [...new Set(Object.values(constructor).filter((v) => typeof v === "number"))].sort();
	  const enumRecord = Object.fromEntries(Object.entries(constructor).slice(numericalValues.length));
	  const enumKeys = Object.keys(enumRecord);
	  const enumValues = Object.values(enumRecord);
	  const stringValues = [
	    .../* @__PURE__ */ new Set([...enumKeys, ...enumValues.filter((v) => typeof v === "string")])
	  ];
	  return { enumKeys, enumRecord, enumValues, numericalValues, stringValues };
	}
	function getEnumIndexFromVariant({
	  enumKeys,
	  enumValues,
	  variant
	}) {
	  const valueIndex = findLastIndex(enumValues, (value) => value === variant);
	  if (valueIndex >= 0) return valueIndex;
	  return enumKeys.findIndex((key) => key === variant);
	}
	function getEnumIndexFromDiscriminator({
	  discriminator,
	  enumKeys,
	  enumValues,
	  useValuesAsDiscriminators
	}) {
	  if (!useValuesAsDiscriminators) {
	    return discriminator >= 0 && discriminator < enumKeys.length ? discriminator : -1;
	  }
	  return findLastIndex(enumValues, (value) => value === discriminator);
	}
	function findLastIndex(array, predicate) {
	  let l = array.length;
	  while (l--) {
	    if (predicate(array[l], l, array)) return l;
	  }
	  return -1;
	}
	function formatNumericalValues(values) {
	  if (values.length === 0) return "";
	  let range = [values[0], values[0]];
	  const ranges = [];
	  for (let index = 1; index < values.length; index++) {
	    const value = values[index];
	    if (range[1] + 1 === value) {
	      range[1] = value;
	    } else {
	      ranges.push(range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`);
	      range = [value, value];
	    }
	  }
	  ranges.push(range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`);
	  return ranges.join(", ");
	}

	// src/enum.ts
	function getEnumEncoder(constructor, config = {}) {
	  const prefix = config.size ?? getU8Encoder();
	  const useValuesAsDiscriminators = config.useValuesAsDiscriminators ?? false;
	  const { enumKeys, enumValues, numericalValues, stringValues } = getEnumStats(constructor);
	  if (useValuesAsDiscriminators && enumValues.some((value) => typeof value === "string")) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS, {
	      stringValues: enumValues.filter((v) => typeof v === "string")
	    });
	  }
	  return transformEncoder(prefix, (variant) => {
	    const index = getEnumIndexFromVariant({ enumKeys, enumValues, variant });
	    if (index < 0) {
	      throw new SolanaError$1(SOLANA_ERROR__CODECS__INVALID_ENUM_VARIANT, {
	        formattedNumericalValues: formatNumericalValues(numericalValues),
	        numericalValues,
	        stringValues,
	        variant
	      });
	    }
	    return useValuesAsDiscriminators ? enumValues[index] : index;
	  });
	}
	function getEnumDecoder(constructor, config = {}) {
	  const prefix = config.size ?? getU8Decoder();
	  const useValuesAsDiscriminators = config.useValuesAsDiscriminators ?? false;
	  const { enumKeys, enumValues, numericalValues } = getEnumStats(constructor);
	  if (useValuesAsDiscriminators && enumValues.some((value) => typeof value === "string")) {
	    throw new SolanaError$1(SOLANA_ERROR__CODECS__CANNOT_USE_LEXICAL_VALUES_AS_ENUM_DISCRIMINATORS, {
	      stringValues: enumValues.filter((v) => typeof v === "string")
	    });
	  }
	  return transformDecoder(prefix, (value) => {
	    const discriminator = Number(value);
	    const index = getEnumIndexFromDiscriminator({
	      discriminator,
	      enumKeys,
	      enumValues,
	      useValuesAsDiscriminators
	    });
	    if (index < 0) {
	      const validDiscriminators = useValuesAsDiscriminators ? numericalValues : [...Array(enumKeys.length).keys()];
	      throw new SolanaError$1(SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE, {
	        discriminator,
	        formattedValidDiscriminators: formatNumericalValues(validDiscriminators),
	        validDiscriminators
	      });
	    }
	    return enumValues[index];
	  });
	}
	function getEnumCodec(constructor, config = {}) {
	  return combineCodec(getEnumEncoder(constructor, config), getEnumDecoder(constructor, config));
	}
	function getStructEncoder(fields) {
	  const fieldCodecs = fields.map(([, codec]) => codec);
	  const fixedSize = sumCodecSizes(fieldCodecs.map(getFixedSize));
	  const maxSize = sumCodecSizes(fieldCodecs.map(getMaxSize)) ?? void 0;
	  return createEncoder({
	    ...fixedSize === null ? {
	      getSizeFromValue: (value) => fields.map(([key, codec]) => getEncodedSize(value[key], codec)).reduce((all, one) => all + one, 0),
	      maxSize
	    } : { fixedSize },
	    write: (struct, bytes, offset) => {
	      fields.forEach(([key, codec]) => {
	        offset = codec.write(struct[key], bytes, offset);
	      });
	      return offset;
	    }
	  });
	}
	function getStructDecoder(fields) {
	  const fieldCodecs = fields.map(([, codec]) => codec);
	  const fixedSize = sumCodecSizes(fieldCodecs.map(getFixedSize));
	  const maxSize = sumCodecSizes(fieldCodecs.map(getMaxSize)) ?? void 0;
	  return createDecoder({
	    ...fixedSize === null ? { maxSize } : { fixedSize },
	    read: (bytes, offset) => {
	      const struct = {};
	      fields.forEach(([key, codec]) => {
	        const [value, newOffset] = codec.read(bytes, offset);
	        offset = newOffset;
	        struct[key] = value;
	      });
	      return [struct, offset];
	    }
	  });
	}
	function getStructCodec(fields) {
	  return combineCodec(
	    getStructEncoder(fields),
	    getStructDecoder(fields)
	  );
	}

	/**
	 * Maximum over-the-wire size of a Transaction
	 *
	 * 1280 is IPv6 minimum MTU
	 * 40 bytes is the size of the IPv6 header
	 * 8 bytes is the size of the fragment header
	 */
	const PACKET_DATA_SIZE = 1280 - 40 - 8;
	const VERSION_PREFIX_MASK = 0x7f;
	const SIGNATURE_LENGTH_IN_BYTES = 64;

	class TransactionExpiredBlockheightExceededError extends Error {
	  constructor(signature) {
	    super(`Signature ${signature} has expired: block height exceeded.`);
	    this.signature = void 0;
	    this.signature = signature;
	  }
	}
	Object.defineProperty(TransactionExpiredBlockheightExceededError.prototype, 'name', {
	  value: 'TransactionExpiredBlockheightExceededError'
	});
	class TransactionExpiredTimeoutError extends Error {
	  constructor(signature, timeoutSeconds) {
	    super(`Transaction was not confirmed in ${timeoutSeconds.toFixed(2)} seconds. It is ` + 'unknown if it succeeded or failed. Check signature ' + `${signature} using the Solana Explorer or CLI tools.`);
	    this.signature = void 0;
	    this.signature = signature;
	  }
	}
	Object.defineProperty(TransactionExpiredTimeoutError.prototype, 'name', {
	  value: 'TransactionExpiredTimeoutError'
	});
	class TransactionExpiredNonceInvalidError extends Error {
	  constructor(signature) {
	    super(`Signature ${signature} has expired: the nonce is no longer valid.`);
	    this.signature = void 0;
	    this.signature = signature;
	  }
	}
	Object.defineProperty(TransactionExpiredNonceInvalidError.prototype, 'name', {
	  value: 'TransactionExpiredNonceInvalidError'
	});

	class MessageAccountKeys {
	  constructor(staticAccountKeys, accountKeysFromLookups) {
	    this.staticAccountKeys = void 0;
	    this.accountKeysFromLookups = void 0;
	    this.staticAccountKeys = staticAccountKeys;
	    this.accountKeysFromLookups = accountKeysFromLookups;
	  }
	  keySegments() {
	    const keySegments = [this.staticAccountKeys];
	    if (this.accountKeysFromLookups) {
	      keySegments.push(this.accountKeysFromLookups.writable);
	      keySegments.push(this.accountKeysFromLookups.readonly);
	    }
	    return keySegments;
	  }
	  get(index) {
	    for (const keySegment of this.keySegments()) {
	      if (index < keySegment.length) {
	        return keySegment[index];
	      } else {
	        index -= keySegment.length;
	      }
	    }
	    return;
	  }
	  get length() {
	    return this.keySegments().flat().length;
	  }
	  compileInstructions(instructions) {
	    // Bail early if any account indexes would overflow a u8
	    const U8_MAX = 255;
	    if (this.length > U8_MAX + 1) {
	      throw new Error('Account index overflow encountered during compilation');
	    }
	    const keyIndexMap = new Map();
	    this.keySegments().flat().forEach((key, index) => {
	      keyIndexMap.set(key.toBase58(), index);
	    });
	    const findKeyIndex = key => {
	      const keyIndex = keyIndexMap.get(key.toBase58());
	      if (keyIndex === undefined) throw new Error('Encountered an unknown instruction account key during compilation');
	      return keyIndex;
	    };
	    return instructions.map(instruction => {
	      return {
	        programIdIndex: findKeyIndex(instruction.programId),
	        accountKeyIndexes: instruction.keys.map(meta => findKeyIndex(meta.pubkey)),
	        data: instruction.data
	      };
	    });
	  }
	}

	class CompiledKeys {
	  constructor(payer, keyMetaMap) {
	    this.payer = void 0;
	    this.keyMetaMap = void 0;
	    this.payer = payer;
	    this.keyMetaMap = keyMetaMap;
	  }
	  static compile(instructions, payer) {
	    const keyMetaMap = new Map();
	    const getOrInsertDefault = pubkey => {
	      const address = pubkey.toBase58();
	      let keyMeta = keyMetaMap.get(address);
	      if (keyMeta === undefined) {
	        keyMeta = {
	          isSigner: false,
	          isWritable: false,
	          isInvoked: false
	        };
	        keyMetaMap.set(address, keyMeta);
	      }
	      return keyMeta;
	    };
	    const payerKeyMeta = getOrInsertDefault(payer);
	    payerKeyMeta.isSigner = true;
	    payerKeyMeta.isWritable = true;
	    for (const ix of instructions) {
	      getOrInsertDefault(ix.programId).isInvoked = true;
	      for (const accountMeta of ix.keys) {
	        const keyMeta = getOrInsertDefault(accountMeta.pubkey);
	        keyMeta.isSigner ||= accountMeta.isSigner;
	        keyMeta.isWritable ||= accountMeta.isWritable;
	      }
	    }
	    return new CompiledKeys(payer, keyMetaMap);
	  }
	  getMessageComponents() {
	    const mapEntries = [...this.keyMetaMap.entries()];
	    assert$1(mapEntries.length <= 256, 'Max static account keys length exceeded');
	    const writableSigners = mapEntries.filter(([, meta]) => meta.isSigner && meta.isWritable);
	    const readonlySigners = mapEntries.filter(([, meta]) => meta.isSigner && !meta.isWritable);
	    const writableNonSigners = mapEntries.filter(([, meta]) => !meta.isSigner && meta.isWritable);
	    const readonlyNonSigners = mapEntries.filter(([, meta]) => !meta.isSigner && !meta.isWritable);
	    const header = {
	      numRequiredSignatures: writableSigners.length + readonlySigners.length,
	      numReadonlySignedAccounts: readonlySigners.length,
	      numReadonlyUnsignedAccounts: readonlyNonSigners.length
	    };

	    // sanity checks
	    {
	      assert$1(writableSigners.length > 0, 'Expected at least one writable signer key');
	      const [payerAddress] = writableSigners[0];
	      assert$1(payerAddress === this.payer.toBase58(), 'Expected first writable signer key to be the fee payer');
	    }
	    const staticAccountKeys = [...writableSigners.map(([address]) => new Address(address)), ...readonlySigners.map(([address]) => new Address(address)), ...writableNonSigners.map(([address]) => new Address(address)), ...readonlyNonSigners.map(([address]) => new Address(address))];
	    return [header, staticAccountKeys];
	  }
	  extractTableLookup(lookupTable) {
	    const [writableIndexes, drainedWritableKeys] = this.drainKeysFoundInLookupTable(lookupTable.state.addresses, keyMeta => !keyMeta.isSigner && !keyMeta.isInvoked && keyMeta.isWritable);
	    const [readonlyIndexes, drainedReadonlyKeys] = this.drainKeysFoundInLookupTable(lookupTable.state.addresses, keyMeta => !keyMeta.isSigner && !keyMeta.isInvoked && !keyMeta.isWritable);

	    // Don't extract lookup if no keys were found
	    if (writableIndexes.length === 0 && readonlyIndexes.length === 0) {
	      return;
	    }
	    return [{
	      accountKey: lookupTable.key,
	      writableIndexes,
	      readonlyIndexes
	    }, {
	      writable: drainedWritableKeys,
	      readonly: drainedReadonlyKeys
	    }];
	  }

	  /** @internal */
	  drainKeysFoundInLookupTable(lookupTableEntries, keyMetaFilter) {
	    const lookupTableIndexes = new Array();
	    const drainedKeys = new Array();
	    for (const [address, keyMeta] of this.keyMetaMap.entries()) {
	      if (keyMetaFilter(keyMeta)) {
	        const key = new Address(address);
	        const lookupTableIndex = lookupTableEntries.findIndex(entry => entry.equals(key));
	        if (lookupTableIndex >= 0) {
	          assert$1(lookupTableIndex < 256, 'Max lookup table index exceeded');
	          lookupTableIndexes.push(lookupTableIndex);
	          drainedKeys.push(key);
	          this.keyMetaMap.delete(address);
	        }
	      }
	    }
	    return [lookupTableIndexes, drainedKeys];
	  }
	}

	const SHORT_U16_ENCODER$2 = getShortU16Encoder();
	const SHORT_U16_DECODER$3 = getShortU16Decoder();
	const U8_DECODER$3 = getU8Decoder();
	const U8_ENCODER$1 = getU8Encoder();
	const BASE58_ENCODER$2 = getBase58Encoder();
	const BASE58_DECODER$1 = getBase58Decoder();
	const PUBLIC_KEY_DECODER$1 = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
	const COMPILED_INSTRUCTION_DECODER$1 = getStructDecoder([['programIdIndex', U8_DECODER$3], ['accounts', getArrayDecoder(U8_DECODER$3, {
	  size: SHORT_U16_DECODER$3
	})], ['data', getArrayDecoder(U8_DECODER$3, {
	  size: SHORT_U16_DECODER$3
	})]]);
	const MESSAGE_DECODER = getStructDecoder([['numRequiredSignatures', U8_DECODER$3], ['numReadonlySignedAccounts', U8_DECODER$3], ['numReadonlyUnsignedAccounts', U8_DECODER$3], ['accountKeys', getArrayDecoder(PUBLIC_KEY_DECODER$1, {
	  size: SHORT_U16_DECODER$3
	})], ['recentBlockhash', PUBLIC_KEY_DECODER$1], ['instructions', getArrayDecoder(COMPILED_INSTRUCTION_DECODER$1, {
	  size: SHORT_U16_DECODER$3
	})]]);

	/**
	 * An instruction to execute by a program
	 *
	 * @property {number} programIdIndex
	 * @property {number[]} accounts
	 * @property {string} data
	 */

	/**
	 * Message constructor arguments
	 */

	/**
	 * List of instructions to be processed atomically
	 */
	class Message {
	  constructor(args) {
	    this.header = void 0;
	    this.accountKeys = void 0;
	    this.recentBlockhash = void 0;
	    this.instructions = void 0;
	    this.indexToProgramIds = new Map();
	    this.header = args.header;
	    this.accountKeys = args.accountKeys.map(account => new Address(account));
	    this.recentBlockhash = args.recentBlockhash;
	    this.instructions = args.instructions;
	    this.instructions.forEach(ix => this.indexToProgramIds.set(ix.programIdIndex, this.accountKeys[ix.programIdIndex]));
	  }
	  get version() {
	    return 'legacy';
	  }
	  get staticAccountKeys() {
	    return this.accountKeys;
	  }
	  get compiledInstructions() {
	    return this.instructions.map(ix => ({
	      programIdIndex: ix.programIdIndex,
	      accountKeyIndexes: ix.accounts,
	      data: Uint8Array.from(BASE58_ENCODER$2.encode(ix.data))
	    }));
	  }
	  get addressTableLookups() {
	    return [];
	  }
	  getAccountKeys() {
	    return new MessageAccountKeys(this.staticAccountKeys);
	  }
	  static compile(args) {
	    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);
	    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
	    const accountKeys = new MessageAccountKeys(staticAccountKeys);
	    const instructions = accountKeys.compileInstructions(args.instructions).map(ix => ({
	      programIdIndex: ix.programIdIndex,
	      accounts: ix.accountKeyIndexes,
	      data: BASE58_DECODER$1.decode(ix.data)
	    }));
	    return new Message({
	      header,
	      accountKeys: staticAccountKeys,
	      recentBlockhash: args.recentBlockhash,
	      instructions
	    });
	  }
	  isAccountSigner(index) {
	    return index < this.header.numRequiredSignatures;
	  }
	  isAccountWritable(index) {
	    const numSignedAccounts = this.header.numRequiredSignatures;
	    if (index >= this.header.numRequiredSignatures) {
	      const unsignedAccountIndex = index - numSignedAccounts;
	      const numUnsignedAccounts = this.accountKeys.length - numSignedAccounts;
	      const numWritableUnsignedAccounts = numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
	      return unsignedAccountIndex < numWritableUnsignedAccounts;
	    } else {
	      const numWritableSignedAccounts = numSignedAccounts - this.header.numReadonlySignedAccounts;
	      return index < numWritableSignedAccounts;
	    }
	  }
	  isProgramId(index) {
	    return this.indexToProgramIds.has(index);
	  }
	  programIds() {
	    return [...this.indexToProgramIds.values()];
	  }
	  nonProgramIds() {
	    return this.accountKeys.filter((_, index) => !this.isProgramId(index));
	  }
	  serialize() {
	    const numKeys = this.accountKeys.length;
	    const keyCount = SHORT_U16_ENCODER$2.encode(numKeys);
	    const instructions = this.instructions.map(instruction => {
	      const {
	        accounts,
	        programIdIndex
	      } = instruction;
	      const data = Array.from(BASE58_ENCODER$2.encode(instruction.data));
	      return {
	        programIdIndex,
	        keyIndicesCount: SHORT_U16_ENCODER$2.encode(accounts.length),
	        keyIndices: accounts,
	        dataLength: SHORT_U16_ENCODER$2.encode(data.length),
	        data
	      };
	    });
	    const instructionBuffer = new Uint8Array(PACKET_DATA_SIZE);
	    const instructionCount = SHORT_U16_ENCODER$2.encode(instructions.length);
	    instructionBuffer.set(instructionCount, 0);
	    let instructionBufferLength = instructionCount.length;
	    instructions.forEach(instruction => {
	      const instructionLayout = getStructEncoder([['programIdIndex', U8_ENCODER$1], ['keyIndicesCount', fixEncoderSize(getBytesEncoder(), instruction.keyIndicesCount.length)], ['keyIndices', getArrayEncoder(U8_ENCODER$1, {
	        size: instruction.keyIndices.length
	      })], ['dataLength', fixEncoderSize(getBytesEncoder(), instruction.dataLength.length)], ['data', getArrayEncoder(U8_ENCODER$1, {
	        size: instruction.data.length
	      })]]);
	      const encodedInstruction = instructionLayout.encode(instruction);
	      instructionBuffer.set(encodedInstruction, instructionBufferLength);
	      instructionBufferLength += encodedInstruction.length;
	    });
	    const instructionData = instructionBuffer.subarray(0, instructionBufferLength);
	    const signDataLayout = getStructEncoder([['numRequiredSignatures', fixEncoderSize(getBytesEncoder(), 1)], ['numReadonlySignedAccounts', fixEncoderSize(getBytesEncoder(), 1)], ['numReadonlyUnsignedAccounts', fixEncoderSize(getBytesEncoder(), 1)], ['keyCount', fixEncoderSize(getBytesEncoder(), keyCount.length)], ['keys', getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
	      size: numKeys
	    })], ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)]]);
	    const transaction = {
	      numRequiredSignatures: Uint8Array.from([this.header.numRequiredSignatures]),
	      numReadonlySignedAccounts: Uint8Array.from([this.header.numReadonlySignedAccounts]),
	      numReadonlyUnsignedAccounts: Uint8Array.from([this.header.numReadonlyUnsignedAccounts]),
	      keyCount,
	      keys: this.accountKeys.map(key => key.toBytes()),
	      recentBlockhash: BASE58_ENCODER$2.encode(this.recentBlockhash)
	    };
	    const signData = new Uint8Array(2048);
	    const encodedSignData = signDataLayout.encode(transaction);
	    signData.set(encodedSignData, 0);
	    const length = encodedSignData.length;
	    signData.set(instructionData, length);
	    return toPackedUint8Array(signData.subarray(0, length + instructionData.length));
	  }

	  /**
	   * Decode a compiled message into a Message object.
	   */
	  static from(buffer) {
	    const decodedMessage = MESSAGE_DECODER.decode(toUint8ArrayView(buffer));
	    const numRequiredSignatures = decodedMessage.numRequiredSignatures;
	    if (numRequiredSignatures !== (numRequiredSignatures & VERSION_PREFIX_MASK)) {
	      throw new Error('Versioned messages must be deserialized with VersionedMessage.deserialize()');
	    }
	    const accountKeys = decodedMessage.accountKeys.map(account => new Address(account));
	    const instructions = decodedMessage.instructions.map(instruction => ({
	      programIdIndex: instruction.programIdIndex,
	      accounts: [...instruction.accounts],
	      data: BASE58_DECODER$1.decode(toUint8ArrayView(instruction.data))
	    }));
	    const messageArgs = {
	      header: {
	        numRequiredSignatures,
	        numReadonlySignedAccounts: decodedMessage.numReadonlySignedAccounts,
	        numReadonlyUnsignedAccounts: decodedMessage.numReadonlyUnsignedAccounts
	      },
	      recentBlockhash: BASE58_DECODER$1.decode(decodedMessage.recentBlockhash),
	      accountKeys,
	      instructions
	    };
	    return new Message(messageArgs);
	  }
	}

	const BYTES_ENCODER = getBytesEncoder();
	const SHORT_U16_ENCODER$1 = getShortU16Encoder();
	const SHORT_U16_DECODER$2 = getShortU16Decoder();
	const U8_DECODER$2 = getU8Decoder();
	const U8_ENCODER = getU8Encoder();
	const BASE58_ENCODER$1 = getBase58Encoder();
	const BASE58_DECODER = getBase58Decoder();
	const PUBLIC_KEY_DECODER = fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH);
	const COMPILED_INSTRUCTION_DECODER = getStructDecoder([['programIdIndex', U8_DECODER$2], ['accountKeyIndexes', getArrayDecoder(U8_DECODER$2, {
	  size: SHORT_U16_DECODER$2
	})], ['data', getArrayDecoder(U8_DECODER$2, {
	  size: SHORT_U16_DECODER$2
	})]]);
	const ADDRESS_TABLE_LOOKUP_DECODER = getStructDecoder([['accountKey', PUBLIC_KEY_DECODER], ['writableIndexes', getArrayDecoder(U8_DECODER$2, {
	  size: SHORT_U16_DECODER$2
	})], ['readonlyIndexes', getArrayDecoder(U8_DECODER$2, {
	  size: SHORT_U16_DECODER$2
	})]]);
	const MESSAGE_V0_DECODER = getStructDecoder([['prefix', U8_DECODER$2], ['header', getStructDecoder([['numRequiredSignatures', U8_DECODER$2], ['numReadonlySignedAccounts', U8_DECODER$2], ['numReadonlyUnsignedAccounts', U8_DECODER$2]])], ['staticAccountKeys', getArrayDecoder(PUBLIC_KEY_DECODER, {
	  size: SHORT_U16_DECODER$2
	})], ['recentBlockhash', PUBLIC_KEY_DECODER], ['compiledInstructions', getArrayDecoder(COMPILED_INSTRUCTION_DECODER, {
	  size: SHORT_U16_DECODER$2
	})], ['addressTableLookups', getArrayDecoder(ADDRESS_TABLE_LOOKUP_DECODER, {
	  size: SHORT_U16_DECODER$2
	})]]);

	/**
	 * Message constructor arguments
	 */

	class MessageV0 {
	  constructor(args) {
	    this.header = void 0;
	    this.staticAccountKeys = void 0;
	    this.recentBlockhash = void 0;
	    this.compiledInstructions = void 0;
	    this.addressTableLookups = void 0;
	    this.header = args.header;
	    this.staticAccountKeys = args.staticAccountKeys;
	    this.recentBlockhash = args.recentBlockhash;
	    this.compiledInstructions = args.compiledInstructions;
	    this.addressTableLookups = args.addressTableLookups;
	  }
	  get version() {
	    return 0;
	  }
	  get numAccountKeysFromLookups() {
	    let count = 0;
	    for (const lookup of this.addressTableLookups) {
	      count += lookup.readonlyIndexes.length + lookup.writableIndexes.length;
	    }
	    return count;
	  }
	  getAccountKeys(args) {
	    let accountKeysFromLookups;
	    if (args && 'accountKeysFromLookups' in args && args.accountKeysFromLookups) {
	      if (this.numAccountKeysFromLookups != args.accountKeysFromLookups.writable.length + args.accountKeysFromLookups.readonly.length) {
	        throw new Error('Failed to get account keys because of a mismatch in the number of account keys from lookups');
	      }
	      accountKeysFromLookups = args.accountKeysFromLookups;
	    } else if (args && 'addressLookupTableAccounts' in args && args.addressLookupTableAccounts) {
	      accountKeysFromLookups = this.resolveAddressTableLookups(args.addressLookupTableAccounts);
	    } else if (this.addressTableLookups.length > 0) {
	      throw new Error('Failed to get account keys because address table lookups were not resolved');
	    }
	    return new MessageAccountKeys(this.staticAccountKeys, accountKeysFromLookups);
	  }
	  isAccountSigner(index) {
	    return index < this.header.numRequiredSignatures;
	  }
	  isAccountWritable(index) {
	    const numSignedAccounts = this.header.numRequiredSignatures;
	    const numStaticAccountKeys = this.staticAccountKeys.length;
	    if (index >= numStaticAccountKeys) {
	      const lookupAccountKeysIndex = index - numStaticAccountKeys;
	      const numWritableLookupAccountKeys = this.addressTableLookups.reduce((count, lookup) => count + lookup.writableIndexes.length, 0);
	      return lookupAccountKeysIndex < numWritableLookupAccountKeys;
	    } else if (index >= this.header.numRequiredSignatures) {
	      const unsignedAccountIndex = index - numSignedAccounts;
	      const numUnsignedAccounts = numStaticAccountKeys - numSignedAccounts;
	      const numWritableUnsignedAccounts = numUnsignedAccounts - this.header.numReadonlyUnsignedAccounts;
	      return unsignedAccountIndex < numWritableUnsignedAccounts;
	    } else {
	      const numWritableSignedAccounts = numSignedAccounts - this.header.numReadonlySignedAccounts;
	      return index < numWritableSignedAccounts;
	    }
	  }
	  resolveAddressTableLookups(addressLookupTableAccounts) {
	    const accountKeysFromLookups = {
	      writable: [],
	      readonly: []
	    };
	    for (const tableLookup of this.addressTableLookups) {
	      const tableAccount = addressLookupTableAccounts.find(account => account.key.equals(tableLookup.accountKey));
	      if (!tableAccount) {
	        throw new Error(`Failed to find address lookup table account for table key ${tableLookup.accountKey.toBase58()}`);
	      }
	      for (const index of tableLookup.writableIndexes) {
	        if (index < tableAccount.state.addresses.length) {
	          accountKeysFromLookups.writable.push(tableAccount.state.addresses[index]);
	        } else {
	          throw new Error(`Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`);
	        }
	      }
	      for (const index of tableLookup.readonlyIndexes) {
	        if (index < tableAccount.state.addresses.length) {
	          accountKeysFromLookups.readonly.push(tableAccount.state.addresses[index]);
	        } else {
	          throw new Error(`Failed to find address for index ${index} in address lookup table ${tableLookup.accountKey.toBase58()}`);
	        }
	      }
	    }
	    return accountKeysFromLookups;
	  }
	  static compile(args) {
	    const compiledKeys = CompiledKeys.compile(args.instructions, args.payerKey);
	    const addressTableLookups = new Array();
	    const accountKeysFromLookups = {
	      writable: new Array(),
	      readonly: new Array()
	    };
	    const lookupTableAccounts = args.addressLookupTableAccounts || [];
	    for (const lookupTable of lookupTableAccounts) {
	      const extractResult = compiledKeys.extractTableLookup(lookupTable);
	      if (extractResult !== undefined) {
	        const [addressTableLookup, {
	          writable,
	          readonly
	        }] = extractResult;
	        addressTableLookups.push(addressTableLookup);
	        accountKeysFromLookups.writable.push(...writable);
	        accountKeysFromLookups.readonly.push(...readonly);
	      }
	    }
	    const [header, staticAccountKeys] = compiledKeys.getMessageComponents();
	    const accountKeys = new MessageAccountKeys(staticAccountKeys, accountKeysFromLookups);
	    const compiledInstructions = accountKeys.compileInstructions(args.instructions);
	    return new MessageV0({
	      header,
	      staticAccountKeys,
	      recentBlockhash: args.recentBlockhash,
	      compiledInstructions,
	      addressTableLookups
	    });
	  }
	  serialize() {
	    const encodedStaticAccountKeysLength = SHORT_U16_ENCODER$1.encode(this.staticAccountKeys.length);
	    const serializedInstructions = this.serializeInstructions();
	    const encodedInstructionsLength = SHORT_U16_ENCODER$1.encode(this.compiledInstructions.length);
	    const serializedAddressTableLookups = this.serializeAddressTableLookups();
	    const encodedAddressTableLookupsLength = SHORT_U16_ENCODER$1.encode(this.addressTableLookups.length);
	    const messageLayout = getStructEncoder([['prefix', U8_ENCODER], ['header', getStructEncoder([['numRequiredSignatures', U8_ENCODER], ['numReadonlySignedAccounts', U8_ENCODER], ['numReadonlyUnsignedAccounts', U8_ENCODER]])], ['staticAccountKeysLength', fixEncoderSize(getBytesEncoder(), encodedStaticAccountKeysLength.length)], ['staticAccountKeys', getArrayEncoder(fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH), {
	      size: this.staticAccountKeys.length
	    })], ['recentBlockhash', fixEncoderSize(getBytesEncoder(), PUBLIC_KEY_LENGTH)], ['instructionsLength', fixEncoderSize(getBytesEncoder(), encodedInstructionsLength.length)], ['serializedInstructions', fixEncoderSize(getBytesEncoder(), serializedInstructions.length)], ['addressTableLookupsLength', fixEncoderSize(getBytesEncoder(), encodedAddressTableLookupsLength.length)], ['serializedAddressTableLookups', fixEncoderSize(getBytesEncoder(), serializedAddressTableLookups.length)]]);
	    const MESSAGE_VERSION_0_PREFIX = 1 << 7;
	    const encodedMessage = messageLayout.encode({
	      prefix: MESSAGE_VERSION_0_PREFIX,
	      header: this.header,
	      staticAccountKeysLength: encodedStaticAccountKeysLength,
	      staticAccountKeys: this.staticAccountKeys.map(key => key.toBytes()),
	      recentBlockhash: BASE58_ENCODER$1.encode(this.recentBlockhash),
	      instructionsLength: encodedInstructionsLength,
	      serializedInstructions,
	      addressTableLookupsLength: encodedAddressTableLookupsLength,
	      serializedAddressTableLookups
	    });
	    return toUint8ArrayView(encodedMessage);
	  }
	  serializeInstructions() {
	    let serializedLength = 0;
	    const serializedInstructions = new Uint8Array(PACKET_DATA_SIZE);
	    for (const instruction of this.compiledInstructions) {
	      const encodedAccountKeyIndexesLength = SHORT_U16_ENCODER$1.encode(instruction.accountKeyIndexes.length);
	      const encodedDataLength = SHORT_U16_ENCODER$1.encode(instruction.data.length);
	      const instructionLayout = getStructEncoder([['programIdIndex', U8_ENCODER], ['encodedAccountKeyIndexesLength', fixEncoderSize(getBytesEncoder(), encodedAccountKeyIndexesLength.length)], ['accountKeyIndexes', getArrayEncoder(U8_ENCODER, {
	        size: instruction.accountKeyIndexes.length
	      })], ['encodedDataLength', fixEncoderSize(getBytesEncoder(), encodedDataLength.length)], ['data', fixEncoderSize(getBytesEncoder(), instruction.data.length)]]);
	      serializedLength = instructionLayout.write({
	        programIdIndex: instruction.programIdIndex,
	        encodedAccountKeyIndexesLength,
	        accountKeyIndexes: instruction.accountKeyIndexes,
	        encodedDataLength,
	        data: instruction.data
	      }, serializedInstructions, serializedLength);
	    }
	    return serializedInstructions.slice(0, serializedLength);
	  }
	  serializeAddressTableLookups() {
	    const bytes = new Uint8Array(PACKET_DATA_SIZE);
	    let offset = 0;
	    for (const lookup of this.addressTableLookups) {
	      offset = BYTES_ENCODER.write(lookup.accountKey.toBytes(), bytes, offset);
	      offset = SHORT_U16_ENCODER$1.write(lookup.writableIndexes.length, bytes, offset);
	      offset = BYTES_ENCODER.write(Uint8Array.from(lookup.writableIndexes), bytes, offset);
	      offset = SHORT_U16_ENCODER$1.write(lookup.readonlyIndexes.length, bytes, offset);
	      offset = BYTES_ENCODER.write(Uint8Array.from(lookup.readonlyIndexes), bytes, offset);
	    }
	    return bytes.slice(0, offset);
	  }
	  static deserialize(serializedMessage) {
	    const prefix = serializedMessage[0];
	    const maskedPrefix = prefix & VERSION_PREFIX_MASK;
	    assert$1(prefix !== maskedPrefix, `Expected versioned message but received legacy message`);
	    const version = maskedPrefix;
	    assert$1(version === 0, `Expected versioned message with version 0 but found version ${version}`);
	    const decodedMessage = MESSAGE_V0_DECODER.decode(serializedMessage);
	    const header = decodedMessage.header;
	    const staticAccountKeys = decodedMessage.staticAccountKeys.map(accountKey => new Address(accountKey));
	    const recentBlockhash = BASE58_DECODER.decode(Uint8Array.from(decodedMessage.recentBlockhash));
	    const compiledInstructions = decodedMessage.compiledInstructions.map(instruction => ({
	      programIdIndex: instruction.programIdIndex,
	      accountKeyIndexes: [...instruction.accountKeyIndexes],
	      data: Uint8Array.from(instruction.data)
	    }));
	    const addressTableLookups = decodedMessage.addressTableLookups.map(lookup => ({
	      accountKey: new Address(lookup.accountKey),
	      writableIndexes: [...lookup.writableIndexes],
	      readonlyIndexes: [...lookup.readonlyIndexes]
	    }));
	    return new MessageV0({
	      header,
	      staticAccountKeys,
	      recentBlockhash,
	      compiledInstructions,
	      addressTableLookups
	    });
	  }
	}

	// eslint-disable-next-line no-redeclare
	const VersionedMessage = {
	  deserializeMessageVersion(serializedMessage) {
	    const prefix = serializedMessage[0];
	    const maskedPrefix = prefix & VERSION_PREFIX_MASK;

	    // if the highest bit of the prefix is not set, the message is not versioned
	    if (maskedPrefix === prefix) {
	      return 'legacy';
	    }

	    // the lower 7 bits of the prefix indicate the message version
	    return maskedPrefix;
	  },
	  deserialize: serializedMessage => {
	    const version = VersionedMessage.deserializeMessageVersion(serializedMessage);
	    if (version === 'legacy') {
	      return Message.from(serializedMessage);
	    }
	    if (version === 0) {
	      return MessageV0.deserialize(serializedMessage);
	    } else {
	      throw new Error(`Transaction message version ${version} deserialization is not supported`);
	    }
	  }
	};

	/** @internal */

	/**
	 * Transaction signature as base-58 encoded string
	 */

	let TransactionStatus = /*#__PURE__*/function (TransactionStatus) {
	  TransactionStatus[TransactionStatus["BLOCKHEIGHT_EXCEEDED"] = 0] = "BLOCKHEIGHT_EXCEEDED";
	  TransactionStatus[TransactionStatus["PROCESSED"] = 1] = "PROCESSED";
	  TransactionStatus[TransactionStatus["TIMED_OUT"] = 2] = "TIMED_OUT";
	  TransactionStatus[TransactionStatus["NONCE_INVALID"] = 3] = "NONCE_INVALID";
	  return TransactionStatus;
	}({});

	/**
	 * Default (empty) signature
	 */
	const DEFAULT_SIGNATURE = new Uint8Array(SIGNATURE_LENGTH_IN_BYTES);
	const BASE58_CODEC = getBase58Codec();
	const SHORT_U16_ENCODER = getShortU16Encoder();
	const SHORT_U16_DECODER$1 = getShortU16Decoder();
	const SIGNATURE_DECODER$1 = fixDecoderSize(getBytesDecoder(), SIGNATURE_LENGTH_IN_BYTES);
	const TRANSACTION_WIRE_DECODER = getStructDecoder([['signatures', getArrayDecoder(SIGNATURE_DECODER$1, {
	  size: SHORT_U16_DECODER$1
	})], ['messageBytes', getBytesDecoder()]]);

	/**
	 * Account metadata used to define instructions
	 */

	/**
	 * List of TransactionInstruction object fields that may be initialized at construction
	 */

	/**
	 * Configuration object for Transaction.serialize()
	 */

	/**
	 * @internal
	 */

	/**
	 * Transaction Instruction class
	 */
	class TransactionInstruction {
	  get data() {
	    return this._data;
	  }
	  set data(data) {
	    this._data = Object.getPrototypeOf(data) === Uint8Array.prototype ? data : Uint8Array.from(data);
	  }
	  constructor(opts) {
	    /**
	     * Public keys to include in this transaction
	     * Boolean represents whether this pubkey needs to sign the transaction
	     */
	    this.keys = void 0;
	    /**
	     * Program Id to execute
	     */
	    this.programId = void 0;
	    /**
	     * Program input
	     */
	    this._data = new Uint8Array(0);
	    this.programId = opts.programId;
	    this.keys = opts.keys;
	    if (opts.data) {
	      this.data = opts.data;
	    }
	  }

	  /**
	   * @internal
	   */
	  toJSON() {
	    return {
	      keys: this.keys.map(({
	        pubkey,
	        isSigner,
	        isWritable
	      }) => ({
	        pubkey: pubkey.toJSON(),
	        isSigner,
	        isWritable
	      })),
	      programId: this.programId.toJSON(),
	      data: [...this.data]
	    };
	  }
	}

	/**
	 * Pair of signature and corresponding public key
	 */

	/**
	 * List of Transaction object fields that may be initialized at construction
	 */

	// For backward compatibility; an unfortunate consequence of being
	// forced to over-export types by the documentation generator.
	// See https://github.com/solana-labs/solana/pull/25820

	/**
	 * Blockhash-based transactions have a lifetime that are defined by
	 * the blockhash they include. Any transaction whose blockhash is
	 * too old will be rejected.
	 */

	/**
	 * Use these options to construct a durable nonce transaction.
	 */

	/**
	 * Nonce information to be used to build an offline Transaction.
	 */

	/**
	 * @internal
	 */

	/**
	 * Transaction class
	 */
	class Transaction {
	  /**
	   * The first (payer) Transaction signature
	   *
	   * @returns {Uint8Array | null} The payer's signature bytes
	   */
	  get signature() {
	    if (this.signatures.length > 0) {
	      return this.signatures[0].signature;
	    }
	    return null;
	  }

	  /**
	   * The transaction fee payer
	   */

	  // Construct a transaction with a blockhash and lastValidBlockHeight

	  // Construct a transaction using a durable nonce

	  /**
	   * @deprecated `TransactionCtorFields` has been deprecated and will be removed in a future version.
	   * Please supply a `TransactionBlockhashCtor` instead.
	   */

	  /**
	   * Construct an empty Transaction
	   */
	  constructor(opts) {
	    /**
	     * Signatures for the transaction.  Typically created by invoking the
	     * `sign()` method
	     */
	    this.signatures = [];
	    this.feePayer = void 0;
	    /**
	     * The instructions to atomically execute
	     */
	    this.instructions = [];
	    /**
	     * A recent transaction id. Must be populated by the caller
	     */
	    this.recentBlockhash = void 0;
	    /**
	     * the last block chain can advance to before tx is declared expired
	     * */
	    this.lastValidBlockHeight = void 0;
	    /**
	     * Optional Nonce information. If populated, transaction will use a durable
	     * Nonce hash instead of a recentBlockhash. Must be populated by the caller
	     */
	    this.nonceInfo = void 0;
	    /**
	     * If this is a nonce transaction this represents the minimum slot from which
	     * to evaluate if the nonce has advanced when attempting to confirm the
	     * transaction. This protects against a case where the transaction confirmation
	     * logic loads the nonce account from an old slot and assumes the mismatch in
	     * nonce value implies that the nonce has been advanced.
	     */
	    this.minNonceContextSlot = void 0;
	    /**
	     * @internal
	     */
	    this._message = void 0;
	    /**
	     * @internal
	     */
	    this._json = void 0;
	    if (!opts) {
	      return;
	    }
	    if (opts.feePayer) {
	      this.feePayer = opts.feePayer;
	    }
	    if (opts.signatures) {
	      this.signatures = opts.signatures.map(({
	        publicKey,
	        signature
	      }) => ({
	        publicKey,
	        signature: signature == null ? null : Uint8Array.from(signature)
	      }));
	    }
	    if (Object.prototype.hasOwnProperty.call(opts, 'nonceInfo')) {
	      const {
	        minContextSlot,
	        nonceInfo
	      } = opts;
	      this.minNonceContextSlot = minContextSlot;
	      this.nonceInfo = nonceInfo;
	    } else if (Object.prototype.hasOwnProperty.call(opts, 'lastValidBlockHeight')) {
	      const {
	        blockhash,
	        lastValidBlockHeight
	      } = opts;
	      this.recentBlockhash = blockhash;
	      this.lastValidBlockHeight = lastValidBlockHeight;
	    } else {
	      const {
	        recentBlockhash,
	        nonceInfo
	      } = opts;
	      if (nonceInfo) {
	        this.nonceInfo = nonceInfo;
	      }
	      this.recentBlockhash = recentBlockhash;
	    }
	  }

	  /**
	   * @internal
	   */
	  toJSON() {
	    return {
	      recentBlockhash: this.recentBlockhash || null,
	      feePayer: this.feePayer ? this.feePayer.toJSON() : null,
	      nonceInfo: this.nonceInfo ? {
	        nonce: this.nonceInfo.nonce,
	        nonceInstruction: this.nonceInfo.nonceInstruction.toJSON()
	      } : null,
	      instructions: this.instructions.map(instruction => instruction.toJSON()),
	      signers: this.signatures.map(({
	        publicKey
	      }) => {
	        return publicKey.toJSON();
	      })
	    };
	  }

	  /**
	   * Add one or more instructions to this Transaction
	   *
	   * @param {Array< Transaction | TransactionInstruction | TransactionInstructionCtorFields >} items - Instructions to add to the Transaction
	   */
	  add(...items) {
	    if (items.length === 0) {
	      throw new Error('No instructions');
	    }
	    items.forEach(item => {
	      if ('instructions' in item) {
	        this.instructions = this.instructions.concat(item.instructions);
	      } else if ('data' in item && 'programId' in item && 'keys' in item) {
	        this.instructions.push(item);
	      } else {
	        this.instructions.push(new TransactionInstruction(item));
	      }
	    });
	    return this;
	  }

	  /**
	   * Compile transaction data
	   */
	  compileMessage() {
	    if (this._message && JSON.stringify(this.toJSON()) === JSON.stringify(this._json)) {
	      return this._message;
	    }
	    let recentBlockhash;
	    let instructions;
	    if (this.nonceInfo) {
	      recentBlockhash = this.nonceInfo.nonce;
	      if (this.instructions[0] != this.nonceInfo.nonceInstruction) {
	        instructions = [this.nonceInfo.nonceInstruction, ...this.instructions];
	      } else {
	        instructions = this.instructions;
	      }
	    } else {
	      recentBlockhash = this.recentBlockhash;
	      instructions = this.instructions;
	    }
	    if (!recentBlockhash) {
	      throw new Error('Transaction recentBlockhash required');
	    }
	    if (instructions.length < 1) {
	      console.warn('No instructions provided');
	    }
	    let feePayer;
	    if (this.feePayer) {
	      feePayer = this.feePayer;
	    } else if (this.signatures.length > 0 && this.signatures[0].publicKey) {
	      // Use implicit fee payer
	      feePayer = this.signatures[0].publicKey;
	    } else {
	      throw new Error('Transaction fee payer required');
	    }
	    for (let i = 0; i < instructions.length; i++) {
	      if (instructions[i].programId === undefined) {
	        throw new Error(`Transaction instruction index ${i} has undefined program id`);
	      }
	    }
	    const programIds = [];
	    const accountMetas = [];
	    instructions.forEach(instruction => {
	      instruction.keys.forEach(accountMeta => {
	        accountMetas.push({
	          ...accountMeta
	        });
	      });
	      const programId = instruction.programId.toString();
	      if (!programIds.includes(programId)) {
	        programIds.push(programId);
	      }
	    });

	    // Append programID account metas
	    programIds.forEach(programId => {
	      accountMetas.push({
	        pubkey: new Address(programId),
	        isSigner: false,
	        isWritable: false
	      });
	    });

	    // Cull duplicate account metas
	    const uniqueMetas = [];
	    accountMetas.forEach(accountMeta => {
	      const pubkeyString = accountMeta.pubkey.toString();
	      const uniqueIndex = uniqueMetas.findIndex(x => {
	        return x.pubkey.toString() === pubkeyString;
	      });
	      if (uniqueIndex > -1) {
	        uniqueMetas[uniqueIndex].isWritable = uniqueMetas[uniqueIndex].isWritable || accountMeta.isWritable;
	        uniqueMetas[uniqueIndex].isSigner = uniqueMetas[uniqueIndex].isSigner || accountMeta.isSigner;
	      } else {
	        uniqueMetas.push(accountMeta);
	      }
	    });

	    // Sort. Prioritizing first by signer, then by writable
	    uniqueMetas.sort(function (x, y) {
	      if (x.isSigner !== y.isSigner) {
	        // Signers always come before non-signers
	        return x.isSigner ? -1 : 1;
	      }
	      if (x.isWritable !== y.isWritable) {
	        // Writable accounts always come before read-only accounts
	        return x.isWritable ? -1 : 1;
	      }
	      // Otherwise, sort by pubkey, stringwise.
	      const options = {
	        localeMatcher: 'best fit',
	        usage: 'sort',
	        sensitivity: 'variant',
	        ignorePunctuation: false,
	        numeric: false,
	        caseFirst: 'lower'
	      };
	      return x.pubkey.toBase58().localeCompare(y.pubkey.toBase58(), 'en', options);
	    });

	    // Move fee payer to the front
	    const feePayerIndex = uniqueMetas.findIndex(x => {
	      return x.pubkey.equals(feePayer);
	    });
	    if (feePayerIndex > -1) {
	      const [payerMeta] = uniqueMetas.splice(feePayerIndex, 1);
	      payerMeta.isSigner = true;
	      payerMeta.isWritable = true;
	      uniqueMetas.unshift(payerMeta);
	    } else {
	      uniqueMetas.unshift({
	        pubkey: feePayer,
	        isSigner: true,
	        isWritable: true
	      });
	    }

	    // Disallow unknown signers
	    for (const signature of this.signatures) {
	      const uniqueIndex = uniqueMetas.findIndex(x => {
	        return x.pubkey.equals(signature.publicKey);
	      });
	      if (uniqueIndex > -1) {
	        if (!uniqueMetas[uniqueIndex].isSigner) {
	          uniqueMetas[uniqueIndex].isSigner = true;
	          console.warn('Transaction references a signature that is unnecessary, ' + 'only the fee payer and instruction signer accounts should sign a transaction. ' + 'This behavior is deprecated and will throw an error in the next major version release.');
	        }
	      } else {
	        throw new Error(`unknown signer: ${signature.publicKey.toString()}`);
	      }
	    }
	    let numRequiredSignatures = 0;
	    let numReadonlySignedAccounts = 0;
	    let numReadonlyUnsignedAccounts = 0;

	    // Split out signing from non-signing keys and count header values
	    const signedKeys = [];
	    const unsignedKeys = [];
	    uniqueMetas.forEach(({
	      pubkey,
	      isSigner,
	      isWritable
	    }) => {
	      if (isSigner) {
	        signedKeys.push(pubkey.toString());
	        numRequiredSignatures += 1;
	        if (!isWritable) {
	          numReadonlySignedAccounts += 1;
	        }
	      } else {
	        unsignedKeys.push(pubkey.toString());
	        if (!isWritable) {
	          numReadonlyUnsignedAccounts += 1;
	        }
	      }
	    });
	    const accountKeys = signedKeys.concat(unsignedKeys);
	    const compiledInstructions = instructions.map(instruction => {
	      const {
	        data,
	        programId
	      } = instruction;
	      return {
	        programIdIndex: accountKeys.indexOf(programId.toString()),
	        accounts: instruction.keys.map(meta => accountKeys.indexOf(meta.pubkey.toString())),
	        data: BASE58_CODEC.decode(data)
	      };
	    });
	    compiledInstructions.forEach(instruction => {
	      assert$1(instruction.programIdIndex >= 0);
	      instruction.accounts.forEach(keyIndex => assert$1(keyIndex >= 0));
	    });
	    return new Message({
	      header: {
	        numRequiredSignatures,
	        numReadonlySignedAccounts,
	        numReadonlyUnsignedAccounts
	      },
	      accountKeys,
	      recentBlockhash,
	      instructions: compiledInstructions
	    });
	  }

	  /**
	   * @internal
	   */
	  _compile() {
	    const message = this.compileMessage();
	    const signedKeys = message.accountKeys.slice(0, message.header.numRequiredSignatures);
	    if (this.signatures.length === signedKeys.length) {
	      const valid = this.signatures.every((pair, index) => {
	        return signedKeys[index].equals(pair.publicKey);
	      });
	      if (valid) return message;
	    }
	    this.signatures = signedKeys.map(publicKey => ({
	      signature: null,
	      publicKey
	    }));
	    return message;
	  }

	  /**
	   * Get the Transaction data that need to be covered by signatures
	   */
	  serializeMessage() {
	    return this._compile().serialize();
	  }

	  /**
	   * Get the estimated fee associated with a transaction
	   *
	   * @param {Connection} connection Connection to RPC Endpoint.
	   *
	   * @returns {Promise<bigint | null>} The estimated fee for the transaction
	   */
	  async getEstimatedFee(connection) {
	    return (await connection.getFeeForMessage(this.compileMessage())).value;
	  }

	  /**
	   * Specify the public keys which will be used to sign the Transaction.
	   * The first signer will be used as the transaction fee payer account.
	   *
	   * Signatures can be added with either `partialSign` or `addSignature`
	   *
	   * @deprecated Deprecated since v0.84.0. Only the fee payer needs to be
	   * specified and it can be set in the Transaction constructor or with the
	   * `feePayer` property.
	   */
	  setSigners(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    }
	    const seen = new Set();
	    this.signatures = signers.filter(publicKey => {
	      const key = publicKey.toString();
	      if (seen.has(key)) {
	        return false;
	      } else {
	        seen.add(key);
	        return true;
	      }
	    }).map(publicKey => ({
	      signature: null,
	      publicKey
	    }));
	  }

	  /**
	   * Sign the Transaction with the specified signers. Multiple signatures may
	   * be applied to a Transaction. The first signature is considered "primary"
	   * and is used identify and confirm transactions.
	   *
	   * If the Transaction `feePayer` is not set, the first signer will be used
	   * as the transaction fee payer account.
	   *
	   * Transaction fields should not be modified after the first call to `sign`,
	   * as doing so may invalidate the signature and cause the Transaction to be
	   * rejected.
	   *
	   * The Transaction must be assigned a valid `recentBlockhash` before invoking this method
	   *
	  * @param {Array<Signer>} signers Array of signers that will sign the transaction
	   */
	  async sign(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    }
	    const uniqueSigners = this._dedupeSigners(signers);
	    this.signatures = uniqueSigners.map(signer => ({
	      signature: null,
	      publicKey: signer.publicKey
	    }));
	    const message = this._compile();
	    await this._partialSign(message, ...uniqueSigners);
	  }

	  /**
	   * Partially sign a transaction with the specified accounts. All accounts must
	   * correspond to either the fee payer or a signer account in the transaction
	   * instructions.
	   *
	   * All the caveats from the `sign` method apply to `partialSign`
	   *
	   * @param {Array<Signer>} signers Array of signers that will sign the transaction
	   */
	  async partialSign(...signers) {
	    if (signers.length === 0) {
	      throw new Error('No signers');
	    }
	    const uniqueSigners = this._dedupeSigners(signers);
	    const message = this._compile();
	    await this._partialSign(message, ...uniqueSigners);
	  }

	  /**
	   * @internal
	   */
	  async _partialSign(message, ...signers) {
	    const signData = message.serialize();
	    for (const signer of signers) {
	      const signature = await signer.signBytes(signData);
	      this._addSignature(signer.publicKey, signature);
	    }
	  }
	  _dedupeSigners(signers) {
	    const seen = new Set();
	    const uniqueSigners = [];
	    for (const signer of signers) {
	      const key = signer.publicKey.toString();
	      if (seen.has(key)) {
	        continue;
	      }
	      seen.add(key);
	      uniqueSigners.push(signer);
	    }
	    return uniqueSigners;
	  }

	  /**
	   * Add an externally created signature to a transaction. The public key
	   * must correspond to either the fee payer or a signer account in the transaction
	   * instructions.
	   *
	   * @param {Address} pubkey Public key that will be added to the transaction.
	   * @param {Uint8Array} signature An externally created signature to add to the transaction.
	   */
	  addSignature(pubkey, signature) {
	    this._compile(); // Ensure signatures array is populated
	    this._addSignature(pubkey, signature);
	  }

	  /**
	   * @internal
	   */
	  _addSignature(pubkey, signature) {
	    assert$1(signature.length === 64);
	    const index = this.signatures.findIndex(sigpair => pubkey.equals(sigpair.publicKey));
	    if (index < 0) {
	      throw new Error(`unknown signer: ${pubkey.toString()}`);
	    }
	    this.signatures[index].signature = Uint8Array.from(signature);
	  }

	  /**
	   * Verify signatures of a Transaction
	   * Optional parameter specifies if we're expecting a fully signed Transaction or a partially signed one.
	   * If no boolean is provided, we expect a fully signed Transaction by default.
	   *
	   * @param {boolean} [requireAllSignatures=true] Require a fully signed Transaction
	   */
	  verifySignatures(requireAllSignatures = true) {
	    const signatureErrors = this._getMessageSignednessErrors(this.serializeMessage(), requireAllSignatures);
	    return !signatureErrors;
	  }

	  /**
	   * @internal
	   */
	  _getMessageSignednessErrors(message, requireAllSignatures) {
	    const errors = {};
	    for (const {
	      signature,
	      publicKey
	    } of this.signatures) {
	      if (signature === null) {
	        if (requireAllSignatures) {
	          (errors.missing ||= []).push(publicKey);
	        }
	      } else {
	        if (!verify(signature, message, publicKey.toBytes())) {
	          (errors.invalid ||= []).push(publicKey);
	        }
	      }
	    }
	    return errors.invalid || errors.missing ? errors : undefined;
	  }

	  /**
	   * Serialize the Transaction in the wire format.
	   *
	  * @param {SerializeConfig} [config] Config of transaction.
	   *
	  * @returns {Uint8Array} Signature of transaction in wire format.
	   */
	  serialize(config) {
	    const {
	      requireAllSignatures,
	      verifySignatures
	    } = Object.assign({
	      requireAllSignatures: true,
	      verifySignatures: true
	    }, config);
	    const signData = this.serializeMessage();
	    if (verifySignatures) {
	      const sigErrors = this._getMessageSignednessErrors(signData, requireAllSignatures);
	      if (sigErrors) {
	        let errorMessage = 'Signature verification failed.';
	        if (sigErrors.invalid) {
	          errorMessage += `\nInvalid signature for public key${sigErrors.invalid.length === 1 ? '' : '(s)'} [\`${sigErrors.invalid.map(p => p.toBase58()).join('`, `')}\`].`;
	        }
	        if (sigErrors.missing) {
	          errorMessage += `\nMissing signature for public key${sigErrors.missing.length === 1 ? '' : '(s)'} [\`${sigErrors.missing.map(p => p.toBase58()).join('`, `')}\`].`;
	        }
	        throw new Error(errorMessage);
	      }
	    }
	    return this._serialize(signData);
	  }

	  /**
	   * @internal
	   */
	  _serialize(signData) {
	    const {
	      signatures
	    } = this;
	    const signatureCount = SHORT_U16_ENCODER.encode(signatures.length);
	    const transactionLength = signatureCount.length + signatures.length * 64 + signData.length;
	    const wireTransaction = new Uint8Array(transactionLength);
	    assert$1(signatures.length < 256);
	    wireTransaction.set(signatureCount, 0);
	    signatures.forEach(({
	      signature
	    }, index) => {
	      if (signature !== null) {
	        assert$1(signature.length === 64, `signature has invalid length`);
	        wireTransaction.set(signature, signatureCount.length + index * 64);
	      }
	    });
	    wireTransaction.set(signData, signatureCount.length + signatures.length * 64);
	    assert$1(wireTransaction.length <= PACKET_DATA_SIZE, `Transaction too large: ${wireTransaction.length} > ${PACKET_DATA_SIZE}`);
	    return wireTransaction;
	  }

	  /**
	   * Deprecated method
	   * @internal
	   */
	  get keys() {
	    assert$1(this.instructions.length === 1);
	    return this.instructions[0].keys.map(keyObj => keyObj.pubkey);
	  }

	  /**
	   * Deprecated method
	   * @internal
	   */
	  get programId() {
	    assert$1(this.instructions.length === 1);
	    return this.instructions[0].programId;
	  }

	  /**
	   * Deprecated method
	   * @internal
	   */
	  get data() {
	    assert$1(this.instructions.length === 1);
	    return this.instructions[0].data;
	  }

	  /**
	   * Parse a wire transaction into a Transaction object.
	   *
	   * @param {Uint8Array | Array<number>} buffer Signature of wire Transaction
	   *
	   * @returns {Transaction} Transaction associated with the signature
	   */
	  static from(buffer) {
	    const {
	      signatures: decodedSignatures,
	      messageBytes
	    } = TRANSACTION_WIRE_DECODER.decode(toUint8ArrayView(buffer));
	    const signatures = decodedSignatures.map(signature => BASE58_CODEC.decode(signature));
	    return Transaction.populate(Message.from(toUint8ArrayView(messageBytes)), signatures);
	  }

	  /**
	   * Populate Transaction object from message and signatures
	   *
	   * @param {Message} message Message of transaction
	   * @param {Array<string>} signatures List of signatures to assign to the transaction
	   *
	   * @returns {Transaction} The populated Transaction
	   */
	  static populate(message, signatures = []) {
	    const transaction = new Transaction();
	    transaction.recentBlockhash = message.recentBlockhash;
	    if (message.header.numRequiredSignatures > 0) {
	      transaction.feePayer = message.accountKeys[0];
	    }
	    signatures.forEach((signature, index) => {
	      const sigPubkeyPair = {
	        signature: signature == BASE58_CODEC.decode(DEFAULT_SIGNATURE) ? null : Uint8Array.from(BASE58_CODEC.encode(signature)),
	        publicKey: message.accountKeys[index]
	      };
	      transaction.signatures.push(sigPubkeyPair);
	    });
	    message.instructions.forEach(instruction => {
	      const keys = instruction.accounts.map(account => {
	        const pubkey = message.accountKeys[account];
	        return {
	          pubkey,
	          isSigner: transaction.signatures.some(keyObj => keyObj.publicKey.toString() === pubkey.toString()) || message.isAccountSigner(account),
	          isWritable: message.isAccountWritable(account)
	        };
	      });
	      transaction.instructions.push(new TransactionInstruction({
	        keys,
	        programId: message.accountKeys[instruction.programIdIndex],
	        data: Uint8Array.from(BASE58_CODEC.encode(instruction.data))
	      }));
	    });
	    transaction._message = message;
	    transaction._json = transaction.toJSON();
	    return transaction;
	  }
	}

	class TransactionMessage {
	  constructor(args) {
	    this.payerKey = void 0;
	    this.instructions = void 0;
	    this.recentBlockhash = void 0;
	    this.payerKey = args.payerKey;
	    this.instructions = args.instructions;
	    this.recentBlockhash = args.recentBlockhash;
	  }
	  static decompile(message, args) {
	    const {
	      header,
	      compiledInstructions,
	      recentBlockhash
	    } = message;
	    const {
	      numRequiredSignatures,
	      numReadonlySignedAccounts,
	      numReadonlyUnsignedAccounts
	    } = header;
	    const numWritableSignedAccounts = numRequiredSignatures - numReadonlySignedAccounts;
	    assert$1(numWritableSignedAccounts > 0, 'Message header is invalid');
	    const numWritableUnsignedAccounts = message.staticAccountKeys.length - numRequiredSignatures - numReadonlyUnsignedAccounts;
	    assert$1(numWritableUnsignedAccounts >= 0, 'Message header is invalid');
	    const accountKeys = message.getAccountKeys(args);
	    const payerKey = accountKeys.get(0);
	    if (payerKey === undefined) {
	      throw new Error('Failed to decompile message because no account keys were found');
	    }
	    const instructions = [];
	    for (const compiledIx of compiledInstructions) {
	      const keys = [];
	      for (const keyIndex of compiledIx.accountKeyIndexes) {
	        const pubkey = accountKeys.get(keyIndex);
	        if (pubkey === undefined) {
	          throw new Error(`Failed to find key for account key index ${keyIndex}`);
	        }
	        const isSigner = keyIndex < numRequiredSignatures;
	        let isWritable;
	        if (isSigner) {
	          isWritable = keyIndex < numWritableSignedAccounts;
	        } else if (keyIndex < accountKeys.staticAccountKeys.length) {
	          isWritable = keyIndex - numRequiredSignatures < numWritableUnsignedAccounts;
	        } else {
	          isWritable = keyIndex - accountKeys.staticAccountKeys.length <
	          // accountKeysFromLookups cannot be undefined because we already found a pubkey for this index above
	          accountKeys.accountKeysFromLookups.writable.length;
	        }
	        keys.push({
	          pubkey,
	          isSigner: keyIndex < header.numRequiredSignatures,
	          isWritable
	        });
	      }
	      const programId = accountKeys.get(compiledIx.programIdIndex);
	      if (programId === undefined) {
	        throw new Error(`Failed to find program id for program id index ${compiledIx.programIdIndex}`);
	      }
	      instructions.push(new TransactionInstruction({
	        programId,
	        data: compiledIx.data,
	        keys
	      }));
	    }
	    return new TransactionMessage({
	      payerKey,
	      instructions,
	      recentBlockhash
	    });
	  }
	  compileToLegacyMessage() {
	    return Message.compile({
	      payerKey: this.payerKey,
	      recentBlockhash: this.recentBlockhash,
	      instructions: this.instructions
	    });
	  }
	  compileToV0Message(addressLookupTableAccounts) {
	    return MessageV0.compile({
	      payerKey: this.payerKey,
	      recentBlockhash: this.recentBlockhash,
	      instructions: this.instructions,
	      addressLookupTableAccounts
	    });
	  }
	}

	const SIGNATURE_ENCODER = fixEncoderSize(getBytesEncoder(), SIGNATURE_LENGTH_IN_BYTES);
	const SIGNATURE_DECODER = fixDecoderSize(getBytesDecoder(), SIGNATURE_LENGTH_IN_BYTES);
	const VERSIONED_TRANSACTION_ENCODER = getStructEncoder([['signatures', getArrayEncoder(SIGNATURE_ENCODER, {
	  size: getShortU16Encoder()
	})], ['serializedMessage', getBytesEncoder()]]);
	const VERSIONED_TRANSACTION_DECODER = getStructDecoder([['signatures', getArrayDecoder(SIGNATURE_DECODER, {
	  size: getShortU16Decoder()
	})], ['serializedMessage', getBytesDecoder()]]);
	/**
	 * Versioned transaction class
	 */
	class VersionedTransaction {
	  get version() {
	    return this.message.version;
	  }
	  constructor(message, signatures) {
	    this.signatures = void 0;
	    this.message = void 0;
	    if (signatures !== undefined) {
	      assert$1(signatures.length === message.header.numRequiredSignatures, 'Expected signatures length to be equal to the number of required signatures');
	      this.signatures = signatures;
	    } else {
	      const defaultSignatures = [];
	      for (let i = 0; i < message.header.numRequiredSignatures; i++) {
	        defaultSignatures.push(new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));
	      }
	      this.signatures = defaultSignatures;
	    }
	    this.message = message;
	  }
	  serialize() {
	    const serializedMessage = this.message.serialize();
	    for (const signature of this.signatures) {
	      assert$1(signature.byteLength === SIGNATURE_LENGTH_IN_BYTES, 'Signature must be 64 bytes long');
	    }
	    return Uint8Array.from(VERSIONED_TRANSACTION_ENCODER.encode({
	      signatures: this.signatures,
	      serializedMessage
	    }));
	  }
	  static deserialize(serializedTransaction) {
	    const {
	      serializedMessage,
	      signatures
	    } = VERSIONED_TRANSACTION_DECODER.decode(serializedTransaction);
	    const message = VersionedMessage.deserialize(Uint8Array.from(serializedMessage));
	    return new VersionedTransaction(message, signatures.map(signature => Uint8Array.from(signature)));
	  }
	  async sign(signers) {
	    const messageData = this.message.serialize();
	    const signerPubkeys = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures);
	    for (const signer of signers) {
	      const signerIndex = signerPubkeys.findIndex(pubkey => pubkey.equals(signer.publicKey));
	      assert$1(signerIndex >= 0, `Cannot sign with non signer key ${signer.publicKey.toBase58()}`);
	      const signature = await signer.signBytes(messageData);
	      assert$1(signature.byteLength === SIGNATURE_LENGTH_IN_BYTES, 'Signature must be 64 bytes long');
	      this.signatures[signerIndex] = signature;
	    }
	  }
	  addSignature(publicKey, signature) {
	    assert$1(signature.byteLength === 64, 'Signature must be 64 bytes long');
	    const signerPubkeys = this.message.staticAccountKeys.slice(0, this.message.header.numRequiredSignatures);
	    const signerIndex = signerPubkeys.findIndex(pubkey => pubkey.equals(publicKey));
	    assert$1(signerIndex >= 0, `Can not add signature; \`${publicKey.toBase58()}\` is not required to sign this transaction`);
	    this.signatures[signerIndex] = signature;
	  }
	}

	// TODO: These constants should be removed in favor of reading them out of a
	// Syscall account

	/**
	 * @internal
	 */
	const NUM_TICKS_PER_SECOND = 160;

	/**
	 * @internal
	 */
	const DEFAULT_TICKS_PER_SLOT = 64;

	/**
	 * @internal
	 */
	const NUM_SLOTS_PER_SECOND = NUM_TICKS_PER_SECOND / DEFAULT_TICKS_PER_SLOT;

	/**
	 * @internal
	 */
	const MS_PER_SLOT = 1000 / NUM_SLOTS_PER_SECOND;

	const SYSVAR_CLOCK_PUBKEY = new Address('SysvarC1ock11111111111111111111111111111111');
	const SYSVAR_EPOCH_SCHEDULE_PUBKEY = new Address('SysvarEpochSchedu1e111111111111111111111111');
	const SYSVAR_INSTRUCTIONS_PUBKEY = new Address('Sysvar1nstructions1111111111111111111111111');
	const SYSVAR_RECENT_BLOCKHASHES_PUBKEY = new Address('SysvarRecentB1ockHashes11111111111111111111');
	const SYSVAR_RENT_PUBKEY = new Address('SysvarRent111111111111111111111111111111111');
	const SYSVAR_REWARDS_PUBKEY = new Address('SysvarRewards111111111111111111111111111111');
	const SYSVAR_SLOT_HASHES_PUBKEY = new Address('SysvarS1otHashes111111111111111111111111111');
	const SYSVAR_SLOT_HISTORY_PUBKEY = new Address('SysvarS1otHistory11111111111111111111111111');
	const SYSVAR_STAKE_HISTORY_PUBKEY = new Address('SysvarStakeHistory1111111111111111111111111');

	class SendTransactionError extends Error {
	  constructor({
	    action,
	    signature,
	    transactionMessage,
	    logs
	  }) {
	    const maybeLogsOutput = logs ? `Logs: \n${JSON.stringify(logs.slice(-10), null, 2)}. ` : '';
	    const guideText = '\nCatch the `SendTransactionError` and call `getLogs()` on it for full details.';
	    let message;
	    switch (action) {
	      case 'send':
	        message = `Transaction ${signature} resulted in an error. \n` + `${transactionMessage}. ` + maybeLogsOutput + guideText;
	        break;
	      case 'simulate':
	        message = `Simulation failed. \nMessage: ${transactionMessage}. \n` + maybeLogsOutput + guideText;
	        break;
	      default:
	        {
	          message = `Unknown action '${(a => a)(action)}'`;
	        }
	    }
	    super(message);
	    this.signature = void 0;
	    this.transactionMessage = void 0;
	    this.transactionLogs = void 0;
	    this.signature = signature;
	    this.transactionMessage = transactionMessage;
	    this.transactionLogs = logs ? logs : undefined;
	  }
	  get transactionError() {
	    return {
	      message: this.transactionMessage,
	      logs: Array.isArray(this.transactionLogs) ? this.transactionLogs : undefined
	    };
	  }

	  /* @deprecated Use `await getLogs()` instead */
	  get logs() {
	    const cachedLogs = this.transactionLogs;
	    if (cachedLogs != null && typeof cachedLogs === 'object' && 'then' in cachedLogs) {
	      return undefined;
	    }
	    return cachedLogs;
	  }
	  async getLogs(connection) {
	    if (!Array.isArray(this.transactionLogs)) {
	      this.transactionLogs = new Promise((resolve, reject) => {
	        connection.getTransaction(this.signature).then(tx => {
	          if (tx && tx.meta && tx.meta.logMessages) {
	            const logs = tx.meta.logMessages;
	            this.transactionLogs = logs;
	            resolve(logs);
	          } else {
	            reject(new Error('Log messages not found'));
	          }
	        }).catch(reject);
	      });
	    }
	    return await this.transactionLogs;
	  }
	}

	// Keep in sync with client/src/rpc_custom_errors.rs
	// Typescript `enums` thwart tree-shaking. See https://bargsten.org/jsts/enums/
	const SolanaJSONRPCErrorCode = {
	  JSON_RPC_SERVER_ERROR_BLOCK_CLEANED_UP: -32001,
	  JSON_RPC_SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE: -32002,
	  JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_VERIFICATION_FAILURE: -32003,
	  JSON_RPC_SERVER_ERROR_BLOCK_NOT_AVAILABLE: -32004,
	  JSON_RPC_SERVER_ERROR_NODE_UNHEALTHY: -32005,
	  JSON_RPC_SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE: -32006,
	  JSON_RPC_SERVER_ERROR_SLOT_SKIPPED: -32007,
	  JSON_RPC_SERVER_ERROR_NO_SNAPSHOT: -32008,
	  JSON_RPC_SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED: -32009,
	  JSON_RPC_SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX: -32010,
	  JSON_RPC_SERVER_ERROR_TRANSACTION_HISTORY_NOT_AVAILABLE: -32011,
	  JSON_RPC_SCAN_ERROR: -32012,
	  JSON_RPC_SERVER_ERROR_TRANSACTION_SIGNATURE_LEN_MISMATCH: -32013,
	  JSON_RPC_SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET: -32014,
	  JSON_RPC_SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION: -32015,
	  JSON_RPC_SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED: -32016
	};
	class SolanaJSONRPCError extends Error {
	  constructor({
	    code,
	    message,
	    data
	  }, customMessage) {
	    super(customMessage != null ? `${customMessage}: ${message}` : message);
	    this.code = void 0;
	    this.data = void 0;
	    this.code = code;
	    this.data = data;
	    this.name = 'SolanaJSONRPCError';
	  }
	}

	/**
	 * Sign, send and confirm a transaction.
	 *
	 * If `commitment` option is not specified, defaults to 'finalized' commitment.
	 *
	 * @param {Connection} connection
	 * @param {Transaction} transaction
	 * @param {Array<Signer>} signers
	 * @param {ConfirmOptions} [options]
	 * @returns {Promise<TransactionSignature>}
	 */
	async function sendAndConfirmTransaction(connection, transaction, signers, options) {
	  const sendOptions = options && {
	    skipPreflight: options.skipPreflight,
	    preflightCommitment: options.preflightCommitment || options.commitment,
	    maxRetries: options.maxRetries,
	    minContextSlot: options.minContextSlot
	  };
	  const signature = await connection.sendTransaction(transaction, signers, sendOptions);
	  let status;
	  if (transaction.recentBlockhash != null && transaction.lastValidBlockHeight != null) {
	    status = (await connection.confirmTransaction({
	      abortSignal: options?.abortSignal,
	      signature: signature,
	      blockhash: transaction.recentBlockhash,
	      lastValidBlockHeight: transaction.lastValidBlockHeight
	    }, options && options.commitment)).value;
	  } else if (transaction.minNonceContextSlot != null && transaction.nonceInfo != null) {
	    const {
	      nonceInstruction
	    } = transaction.nonceInfo;
	    const nonceAccountPubkey = nonceInstruction.keys[0].pubkey;
	    status = (await connection.confirmTransaction({
	      abortSignal: options?.abortSignal,
	      minContextSlot: transaction.minNonceContextSlot,
	      nonceAccountPubkey,
	      nonceValue: transaction.nonceInfo.nonce,
	      signature
	    }, options && options.commitment)).value;
	  } else {
	    if (options?.abortSignal != null) {
	      console.warn('sendAndConfirmTransaction(): A transaction with a deprecated confirmation strategy was ' + 'supplied along with an `abortSignal`. Only transactions having `lastValidBlockHeight` ' + 'or a combination of `nonceInfo` and `minNonceContextSlot` are abortable.');
	    }
	    status = (await connection.confirmTransaction(signature, options && options.commitment)).value;
	  }
	  if (status.err) {
	    if (signature != null) {
	      throw new SendTransactionError({
	        action: 'send',
	        signature: signature,
	        transactionMessage: `Status: (${JSON.stringify(status)})`
	      });
	    }
	    throw new Error(`Transaction ${signature} failed (${JSON.stringify(status)})`);
	  }
	  return signature;
	}

	// zzz
	function sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}

	var Layout = {};

	/* The MIT License (MIT)
	 *
	 * Copyright 2015-2018 Peter A. Bigot
	 *
	 * Permission is hereby granted, free of charge, to any person obtaining a copy
	 * of this software and associated documentation files (the "Software"), to deal
	 * in the Software without restriction, including without limitation the rights
	 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	 * copies of the Software, and to permit persons to whom the Software is
	 * furnished to do so, subject to the following conditions:
	 *
	 * The above copyright notice and this permission notice shall be included in
	 * all copies or substantial portions of the Software.
	 *
	 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	 * THE SOFTWARE.
	 */

	var hasRequiredLayout;

	function requireLayout () {
		if (hasRequiredLayout) return Layout;
		hasRequiredLayout = 1;
		Object.defineProperty(Layout, "__esModule", { value: true });
		Layout.s16 = Layout.s8 = Layout.nu64be = Layout.u48be = Layout.u40be = Layout.u32be = Layout.u24be = Layout.u16be = Layout.nu64 = Layout.u48 = Layout.u40 = Layout.u32 = Layout.u24 = Layout.u16 = Layout.u8 = Layout.offset = Layout.greedy = Layout.Constant = Layout.UTF8 = Layout.CString = Layout.Blob = Layout.Boolean = Layout.BitField = Layout.BitStructure = Layout.VariantLayout = Layout.Union = Layout.UnionLayoutDiscriminator = Layout.UnionDiscriminator = Layout.Structure = Layout.Sequence = Layout.DoubleBE = Layout.Double = Layout.FloatBE = Layout.Float = Layout.NearInt64BE = Layout.NearInt64 = Layout.NearUInt64BE = Layout.NearUInt64 = Layout.IntBE = Layout.Int = Layout.UIntBE = Layout.UInt = Layout.OffsetLayout = Layout.GreedyCount = Layout.ExternalLayout = Layout.bindConstructorLayout = Layout.nameWithProperty = Layout.Layout = Layout.uint8ArrayToBuffer = Layout.checkUint8Array = void 0;
		Layout.constant = Layout.utf8 = Layout.cstr = Layout.blob = Layout.unionLayoutDiscriminator = Layout.union = Layout.seq = Layout.bits = Layout.struct = Layout.f64be = Layout.f64 = Layout.f32be = Layout.f32 = Layout.ns64be = Layout.s48be = Layout.s40be = Layout.s32be = Layout.s24be = Layout.s16be = Layout.ns64 = Layout.s48 = Layout.s40 = Layout.s32 = Layout.s24 = void 0;
		const buffer_1 = /*@__PURE__*/ requireBuffer();
		/* Check if a value is a Uint8Array.
		 *
		 * @ignore */
		function checkUint8Array(b) {
		    if (!(b instanceof Uint8Array)) {
		        throw new TypeError('b must be a Uint8Array');
		    }
		}
		Layout.checkUint8Array = checkUint8Array;
		/* Create a Buffer instance from a Uint8Array.
		 *
		 * @ignore */
		function uint8ArrayToBuffer(b) {
		    checkUint8Array(b);
		    return buffer_1.Buffer.from(b.buffer, b.byteOffset, b.length);
		}
		Layout.uint8ArrayToBuffer = uint8ArrayToBuffer;
		/**
		 * Base class for layout objects.
		 *
		 * **NOTE** This is an abstract base class; you can create instances
		 * if it amuses you, but they won't support the {@link
		 * Layout#encode|encode} or {@link Layout#decode|decode} functions.
		 *
		 * @param {Number} span - Initializer for {@link Layout#span|span}.  The
		 * parameter must be an integer; a negative value signifies that the
		 * span is {@link Layout#getSpan|value-specific}.
		 *
		 * @param {string} [property] - Initializer for {@link
		 * Layout#property|property}.
		 *
		 * @abstract
		 */
		let Layout$1 = class Layout {
		    constructor(span, property) {
		        if (!Number.isInteger(span)) {
		            throw new TypeError('span must be an integer');
		        }
		        /** The span of the layout in bytes.
		         *
		         * Positive values are generally expected.
		         *
		         * Zero will only appear in {@link Constant}s and in {@link
		         * Sequence}s where the {@link Sequence#count|count} is zero.
		         *
		         * A negative value indicates that the span is value-specific, and
		         * must be obtained using {@link Layout#getSpan|getSpan}. */
		        this.span = span;
		        /** The property name used when this layout is represented in an
		         * Object.
		         *
		         * Used only for layouts that {@link Layout#decode|decode} to Object
		         * instances.  If left undefined the span of the unnamed layout will
		         * be treated as padding: it will not be mutated by {@link
		         * Layout#encode|encode} nor represented as a property in the
		         * decoded Object. */
		        this.property = property;
		    }
		    /** Function to create an Object into which decoded properties will
		     * be written.
		     *
		     * Used only for layouts that {@link Layout#decode|decode} to Object
		     * instances, which means:
		     * * {@link Structure}
		     * * {@link Union}
		     * * {@link VariantLayout}
		     * * {@link BitStructure}
		     *
		     * If left undefined the JavaScript representation of these layouts
		     * will be Object instances.
		     *
		     * See {@link bindConstructorLayout}.
		     */
		    makeDestinationObject() {
		        return {};
		    }
		    /**
		     * Calculate the span of a specific instance of a layout.
		     *
		     * @param {Uint8Array} b - the buffer that contains an encoded instance.
		     *
		     * @param {Number} [offset] - the offset at which the encoded instance
		     * starts.  If absent a zero offset is inferred.
		     *
		     * @return {Number} - the number of bytes covered by the layout
		     * instance.  If this method is not overridden in a subclass the
		     * definition-time constant {@link Layout#span|span} will be
		     * returned.
		     *
		     * @throws {RangeError} - if the length of the value cannot be
		     * determined.
		     */
		    getSpan(b, offset) {
		        if (0 > this.span) {
		            throw new RangeError('indeterminate span');
		        }
		        return this.span;
		    }
		    /**
		     * Replicate the layout using a new property.
		     *
		     * This function must be used to get a structurally-equivalent layout
		     * with a different name since all {@link Layout} instances are
		     * immutable.
		     *
		     * **NOTE** This is a shallow copy.  All fields except {@link
		     * Layout#property|property} are strictly equal to the origin layout.
		     *
		     * @param {String} property - the value for {@link
		     * Layout#property|property} in the replica.
		     *
		     * @returns {Layout} - the copy with {@link Layout#property|property}
		     * set to `property`.
		     */
		    replicate(property) {
		        const rv = Object.create(this.constructor.prototype);
		        Object.assign(rv, this);
		        rv.property = property;
		        return rv;
		    }
		    /**
		     * Create an object from layout properties and an array of values.
		     *
		     * **NOTE** This function returns `undefined` if invoked on a layout
		     * that does not return its value as an Object.  Objects are
		     * returned for things that are a {@link Structure}, which includes
		     * {@link VariantLayout|variant layouts} if they are structures, and
		     * excludes {@link Union}s.  If you want this feature for a union
		     * you must use {@link Union.getVariant|getVariant} to select the
		     * desired layout.
		     *
		     * @param {Array} values - an array of values that correspond to the
		     * default order for properties.  As with {@link Layout#decode|decode}
		     * layout elements that have no property name are skipped when
		     * iterating over the array values.  Only the top-level properties are
		     * assigned; arguments are not assigned to properties of contained
		     * layouts.  Any unused values are ignored.
		     *
		     * @return {(Object|undefined)}
		     */
		    fromArray(values) {
		        return undefined;
		    }
		};
		Layout.Layout = Layout$1;
		/* Provide text that carries a name (such as for a function that will
		 * be throwing an error) annotated with the property of a given layout
		 * (such as one for which the value was unacceptable).
		 *
		 * @ignore */
		function nameWithProperty(name, lo) {
		    if (lo.property) {
		        return name + '[' + lo.property + ']';
		    }
		    return name;
		}
		Layout.nameWithProperty = nameWithProperty;
		/**
		 * Augment a class so that instances can be encoded/decoded using a
		 * given layout.
		 *
		 * Calling this function couples `Class` with `layout` in several ways:
		 *
		 * * `Class.layout_` becomes a static member property equal to `layout`;
		 * * `layout.boundConstructor_` becomes a static member property equal
		 *    to `Class`;
		 * * The {@link Layout#makeDestinationObject|makeDestinationObject()}
		 *   property of `layout` is set to a function that returns a `new
		 *   Class()`;
		 * * `Class.decode(b, offset)` becomes a static member function that
		 *   delegates to {@link Layout#decode|layout.decode}.  The
		 *   synthesized function may be captured and extended.
		 * * `Class.prototype.encode(b, offset)` provides an instance member
		 *   function that delegates to {@link Layout#encode|layout.encode}
		 *   with `src` set to `this`.  The synthesized function may be
		 *   captured and extended, but when the extension is invoked `this`
		 *   must be explicitly bound to the instance.
		 *
		 * @param {class} Class - a JavaScript class with a nullary
		 * constructor.
		 *
		 * @param {Layout} layout - the {@link Layout} instance used to encode
		 * instances of `Class`.
		 */
		// `Class` must be a constructor Function, but the assignment of a `layout_` property to it makes it difficult to type
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		function bindConstructorLayout(Class, layout) {
		    if ('function' !== typeof Class) {
		        throw new TypeError('Class must be constructor');
		    }
		    if (Object.prototype.hasOwnProperty.call(Class, 'layout_')) {
		        throw new Error('Class is already bound to a layout');
		    }
		    if (!(layout && (layout instanceof Layout$1))) {
		        throw new TypeError('layout must be a Layout');
		    }
		    if (Object.prototype.hasOwnProperty.call(layout, 'boundConstructor_')) {
		        throw new Error('layout is already bound to a constructor');
		    }
		    Class.layout_ = layout;
		    layout.boundConstructor_ = Class;
		    layout.makeDestinationObject = (() => new Class());
		    Object.defineProperty(Class.prototype, 'encode', {
		        value(b, offset) {
		            return layout.encode(this, b, offset);
		        },
		        writable: true,
		    });
		    Object.defineProperty(Class, 'decode', {
		        value(b, offset) {
		            return layout.decode(b, offset);
		        },
		        writable: true,
		    });
		}
		Layout.bindConstructorLayout = bindConstructorLayout;
		/**
		 * An object that behaves like a layout but does not consume space
		 * within its containing layout.
		 *
		 * This is primarily used to obtain metadata about a member, such as a
		 * {@link OffsetLayout} that can provide data about a {@link
		 * Layout#getSpan|value-specific span}.
		 *
		 * **NOTE** This is an abstract base class; you can create instances
		 * if it amuses you, but they won't support {@link
		 * ExternalLayout#isCount|isCount} or other {@link Layout} functions.
		 *
		 * @param {Number} span - initializer for {@link Layout#span|span}.
		 * The parameter can range from 1 through 6.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @abstract
		 * @augments {Layout}
		 */
		class ExternalLayout extends Layout$1 {
		    /**
		     * Return `true` iff the external layout decodes to an unsigned
		     * integer layout.
		     *
		     * In that case it can be used as the source of {@link
		     * Sequence#count|Sequence counts}, {@link Blob#length|Blob lengths},
		     * or as {@link UnionLayoutDiscriminator#layout|external union
		     * discriminators}.
		     *
		     * @abstract
		     */
		    isCount() {
		        throw new Error('ExternalLayout is abstract');
		    }
		}
		Layout.ExternalLayout = ExternalLayout;
		/**
		 * An {@link ExternalLayout} that determines its {@link
		 * Layout#decode|value} based on offset into and length of the buffer
		 * on which it is invoked.
		 *
		 * *Factory*: {@link module:Layout.greedy|greedy}
		 *
		 * @param {Number} [elementSpan] - initializer for {@link
		 * GreedyCount#elementSpan|elementSpan}.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {ExternalLayout}
		 */
		class GreedyCount extends ExternalLayout {
		    constructor(elementSpan = 1, property) {
		        if ((!Number.isInteger(elementSpan)) || (0 >= elementSpan)) {
		            throw new TypeError('elementSpan must be a (positive) integer');
		        }
		        super(-1, property);
		        /** The layout for individual elements of the sequence.  The value
		         * must be a positive integer.  If not provided, the value will be
		         * 1. */
		        this.elementSpan = elementSpan;
		    }
		    /** @override */
		    isCount() {
		        return true;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        checkUint8Array(b);
		        const rem = b.length - offset;
		        return Math.floor(rem / this.elementSpan);
		    }
		    /** @override */
		    encode(src, b, offset) {
		        return 0;
		    }
		}
		Layout.GreedyCount = GreedyCount;
		/**
		 * An {@link ExternalLayout} that supports accessing a {@link Layout}
		 * at a fixed offset from the start of another Layout.  The offset may
		 * be before, within, or after the base layout.
		 *
		 * *Factory*: {@link module:Layout.offset|offset}
		 *
		 * @param {Layout} layout - initializer for {@link
		 * OffsetLayout#layout|layout}, modulo `property`.
		 *
		 * @param {Number} [offset] - Initializes {@link
		 * OffsetLayout#offset|offset}.  Defaults to zero.
		 *
		 * @param {string} [property] - Optional new property name for a
		 * {@link Layout#replicate| replica} of `layout` to be used as {@link
		 * OffsetLayout#layout|layout}.  If not provided the `layout` is used
		 * unchanged.
		 *
		 * @augments {Layout}
		 */
		class OffsetLayout extends ExternalLayout {
		    constructor(layout, offset = 0, property) {
		        if (!(layout instanceof Layout$1)) {
		            throw new TypeError('layout must be a Layout');
		        }
		        if (!Number.isInteger(offset)) {
		            throw new TypeError('offset must be integer or undefined');
		        }
		        super(layout.span, property || layout.property);
		        /** The subordinated layout. */
		        this.layout = layout;
		        /** The location of {@link OffsetLayout#layout} relative to the
		         * start of another layout.
		         *
		         * The value may be positive or negative, but an error will thrown
		         * if at the point of use it goes outside the span of the Uint8Array
		         * being accessed.  */
		        this.offset = offset;
		    }
		    /** @override */
		    isCount() {
		        return ((this.layout instanceof UInt)
		            || (this.layout instanceof UIntBE));
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return this.layout.decode(b, offset + this.offset);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        return this.layout.encode(src, b, offset + this.offset);
		    }
		}
		Layout.OffsetLayout = OffsetLayout;
		/**
		 * Represent an unsigned integer in little-endian format.
		 *
		 * *Factory*: {@link module:Layout.u8|u8}, {@link
		 *  module:Layout.u16|u16}, {@link module:Layout.u24|u24}, {@link
		 *  module:Layout.u32|u32}, {@link module:Layout.u40|u40}, {@link
		 *  module:Layout.u48|u48}
		 *
		 * @param {Number} span - initializer for {@link Layout#span|span}.
		 * The parameter can range from 1 through 6.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class UInt extends Layout$1 {
		    constructor(span, property) {
		        super(span, property);
		        if (6 < this.span) {
		            throw new RangeError('span must not exceed 6 bytes');
		        }
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readUIntLE(offset, this.span);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeUIntLE(src, offset, this.span);
		        return this.span;
		    }
		}
		Layout.UInt = UInt;
		/**
		 * Represent an unsigned integer in big-endian format.
		 *
		 * *Factory*: {@link module:Layout.u8be|u8be}, {@link
		 * module:Layout.u16be|u16be}, {@link module:Layout.u24be|u24be},
		 * {@link module:Layout.u32be|u32be}, {@link
		 * module:Layout.u40be|u40be}, {@link module:Layout.u48be|u48be}
		 *
		 * @param {Number} span - initializer for {@link Layout#span|span}.
		 * The parameter can range from 1 through 6.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class UIntBE extends Layout$1 {
		    constructor(span, property) {
		        super(span, property);
		        if (6 < this.span) {
		            throw new RangeError('span must not exceed 6 bytes');
		        }
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readUIntBE(offset, this.span);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeUIntBE(src, offset, this.span);
		        return this.span;
		    }
		}
		Layout.UIntBE = UIntBE;
		/**
		 * Represent a signed integer in little-endian format.
		 *
		 * *Factory*: {@link module:Layout.s8|s8}, {@link
		 *  module:Layout.s16|s16}, {@link module:Layout.s24|s24}, {@link
		 *  module:Layout.s32|s32}, {@link module:Layout.s40|s40}, {@link
		 *  module:Layout.s48|s48}
		 *
		 * @param {Number} span - initializer for {@link Layout#span|span}.
		 * The parameter can range from 1 through 6.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Int extends Layout$1 {
		    constructor(span, property) {
		        super(span, property);
		        if (6 < this.span) {
		            throw new RangeError('span must not exceed 6 bytes');
		        }
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readIntLE(offset, this.span);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeIntLE(src, offset, this.span);
		        return this.span;
		    }
		}
		Layout.Int = Int;
		/**
		 * Represent a signed integer in big-endian format.
		 *
		 * *Factory*: {@link module:Layout.s8be|s8be}, {@link
		 * module:Layout.s16be|s16be}, {@link module:Layout.s24be|s24be},
		 * {@link module:Layout.s32be|s32be}, {@link
		 * module:Layout.s40be|s40be}, {@link module:Layout.s48be|s48be}
		 *
		 * @param {Number} span - initializer for {@link Layout#span|span}.
		 * The parameter can range from 1 through 6.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class IntBE extends Layout$1 {
		    constructor(span, property) {
		        super(span, property);
		        if (6 < this.span) {
		            throw new RangeError('span must not exceed 6 bytes');
		        }
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readIntBE(offset, this.span);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeIntBE(src, offset, this.span);
		        return this.span;
		    }
		}
		Layout.IntBE = IntBE;
		const V2E32 = Math.pow(2, 32);
		/* True modulus high and low 32-bit words, where low word is always
		 * non-negative. */
		function divmodInt64(src) {
		    const hi32 = Math.floor(src / V2E32);
		    const lo32 = src - (hi32 * V2E32);
		    return { hi32, lo32 };
		}
		/* Reconstruct Number from quotient and non-negative remainder */
		function roundedInt64(hi32, lo32) {
		    return hi32 * V2E32 + lo32;
		}
		/**
		 * Represent an unsigned 64-bit integer in little-endian format when
		 * encoded and as a near integral JavaScript Number when decoded.
		 *
		 * *Factory*: {@link module:Layout.nu64|nu64}
		 *
		 * **NOTE** Values with magnitude greater than 2^52 may not decode to
		 * the exact value of the encoded representation.
		 *
		 * @augments {Layout}
		 */
		class NearUInt64 extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const buffer = uint8ArrayToBuffer(b);
		        const lo32 = buffer.readUInt32LE(offset);
		        const hi32 = buffer.readUInt32LE(offset + 4);
		        return roundedInt64(hi32, lo32);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        const split = divmodInt64(src);
		        const buffer = uint8ArrayToBuffer(b);
		        buffer.writeUInt32LE(split.lo32, offset);
		        buffer.writeUInt32LE(split.hi32, offset + 4);
		        return 8;
		    }
		}
		Layout.NearUInt64 = NearUInt64;
		/**
		 * Represent an unsigned 64-bit integer in big-endian format when
		 * encoded and as a near integral JavaScript Number when decoded.
		 *
		 * *Factory*: {@link module:Layout.nu64be|nu64be}
		 *
		 * **NOTE** Values with magnitude greater than 2^52 may not decode to
		 * the exact value of the encoded representation.
		 *
		 * @augments {Layout}
		 */
		class NearUInt64BE extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const buffer = uint8ArrayToBuffer(b);
		        const hi32 = buffer.readUInt32BE(offset);
		        const lo32 = buffer.readUInt32BE(offset + 4);
		        return roundedInt64(hi32, lo32);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        const split = divmodInt64(src);
		        const buffer = uint8ArrayToBuffer(b);
		        buffer.writeUInt32BE(split.hi32, offset);
		        buffer.writeUInt32BE(split.lo32, offset + 4);
		        return 8;
		    }
		}
		Layout.NearUInt64BE = NearUInt64BE;
		/**
		 * Represent a signed 64-bit integer in little-endian format when
		 * encoded and as a near integral JavaScript Number when decoded.
		 *
		 * *Factory*: {@link module:Layout.ns64|ns64}
		 *
		 * **NOTE** Values with magnitude greater than 2^52 may not decode to
		 * the exact value of the encoded representation.
		 *
		 * @augments {Layout}
		 */
		class NearInt64 extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const buffer = uint8ArrayToBuffer(b);
		        const lo32 = buffer.readUInt32LE(offset);
		        const hi32 = buffer.readInt32LE(offset + 4);
		        return roundedInt64(hi32, lo32);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        const split = divmodInt64(src);
		        const buffer = uint8ArrayToBuffer(b);
		        buffer.writeUInt32LE(split.lo32, offset);
		        buffer.writeInt32LE(split.hi32, offset + 4);
		        return 8;
		    }
		}
		Layout.NearInt64 = NearInt64;
		/**
		 * Represent a signed 64-bit integer in big-endian format when
		 * encoded and as a near integral JavaScript Number when decoded.
		 *
		 * *Factory*: {@link module:Layout.ns64be|ns64be}
		 *
		 * **NOTE** Values with magnitude greater than 2^52 may not decode to
		 * the exact value of the encoded representation.
		 *
		 * @augments {Layout}
		 */
		class NearInt64BE extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const buffer = uint8ArrayToBuffer(b);
		        const hi32 = buffer.readInt32BE(offset);
		        const lo32 = buffer.readUInt32BE(offset + 4);
		        return roundedInt64(hi32, lo32);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        const split = divmodInt64(src);
		        const buffer = uint8ArrayToBuffer(b);
		        buffer.writeInt32BE(split.hi32, offset);
		        buffer.writeUInt32BE(split.lo32, offset + 4);
		        return 8;
		    }
		}
		Layout.NearInt64BE = NearInt64BE;
		/**
		 * Represent a 32-bit floating point number in little-endian format.
		 *
		 * *Factory*: {@link module:Layout.f32|f32}
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Float extends Layout$1 {
		    constructor(property) {
		        super(4, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readFloatLE(offset);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeFloatLE(src, offset);
		        return 4;
		    }
		}
		Layout.Float = Float;
		/**
		 * Represent a 32-bit floating point number in big-endian format.
		 *
		 * *Factory*: {@link module:Layout.f32be|f32be}
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class FloatBE extends Layout$1 {
		    constructor(property) {
		        super(4, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readFloatBE(offset);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeFloatBE(src, offset);
		        return 4;
		    }
		}
		Layout.FloatBE = FloatBE;
		/**
		 * Represent a 64-bit floating point number in little-endian format.
		 *
		 * *Factory*: {@link module:Layout.f64|f64}
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Double extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readDoubleLE(offset);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeDoubleLE(src, offset);
		        return 8;
		    }
		}
		Layout.Double = Double;
		/**
		 * Represent a 64-bit floating point number in big-endian format.
		 *
		 * *Factory*: {@link module:Layout.f64be|f64be}
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class DoubleBE extends Layout$1 {
		    constructor(property) {
		        super(8, property);
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        return uint8ArrayToBuffer(b).readDoubleBE(offset);
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        uint8ArrayToBuffer(b).writeDoubleBE(src, offset);
		        return 8;
		    }
		}
		Layout.DoubleBE = DoubleBE;
		/**
		 * Represent a contiguous sequence of a specific layout as an Array.
		 *
		 * *Factory*: {@link module:Layout.seq|seq}
		 *
		 * @param {Layout} elementLayout - initializer for {@link
		 * Sequence#elementLayout|elementLayout}.
		 *
		 * @param {(Number|ExternalLayout)} count - initializer for {@link
		 * Sequence#count|count}.  The parameter must be either a positive
		 * integer or an instance of {@link ExternalLayout}.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Sequence extends Layout$1 {
		    constructor(elementLayout, count, property) {
		        if (!(elementLayout instanceof Layout$1)) {
		            throw new TypeError('elementLayout must be a Layout');
		        }
		        if (!(((count instanceof ExternalLayout) && count.isCount())
		            || (Number.isInteger(count) && (0 <= count)))) {
		            throw new TypeError('count must be non-negative integer '
		                + 'or an unsigned integer ExternalLayout');
		        }
		        let span = -1;
		        if ((!(count instanceof ExternalLayout))
		            && (0 < elementLayout.span)) {
		            span = count * elementLayout.span;
		        }
		        super(span, property);
		        /** The layout for individual elements of the sequence. */
		        this.elementLayout = elementLayout;
		        /** The number of elements in the sequence.
		         *
		         * This will be either a non-negative integer or an instance of
		         * {@link ExternalLayout} for which {@link
		         * ExternalLayout#isCount|isCount()} is `true`. */
		        this.count = count;
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        if (0 <= this.span) {
		            return this.span;
		        }
		        let span = 0;
		        let count = this.count;
		        if (count instanceof ExternalLayout) {
		            count = count.decode(b, offset);
		        }
		        if (0 < this.elementLayout.span) {
		            span = count * this.elementLayout.span;
		        }
		        else {
		            let idx = 0;
		            while (idx < count) {
		                span += this.elementLayout.getSpan(b, offset + span);
		                ++idx;
		            }
		        }
		        return span;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const rv = [];
		        let i = 0;
		        let count = this.count;
		        if (count instanceof ExternalLayout) {
		            count = count.decode(b, offset);
		        }
		        while (i < count) {
		            rv.push(this.elementLayout.decode(b, offset));
		            offset += this.elementLayout.getSpan(b, offset);
		            i += 1;
		        }
		        return rv;
		    }
		    /** Implement {@link Layout#encode|encode} for {@link Sequence}.
		     *
		     * **NOTE** If `src` is shorter than {@link Sequence#count|count} then
		     * the unused space in the buffer is left unchanged.  If `src` is
		     * longer than {@link Sequence#count|count} the unneeded elements are
		     * ignored.
		     *
		     * **NOTE** If {@link Layout#count|count} is an instance of {@link
		     * ExternalLayout} then the length of `src` will be encoded as the
		     * count after `src` is encoded. */
		    encode(src, b, offset = 0) {
		        const elo = this.elementLayout;
		        const span = src.reduce((span, v) => {
		            return span + elo.encode(v, b, offset + span);
		        }, 0);
		        if (this.count instanceof ExternalLayout) {
		            this.count.encode(src.length, b, offset);
		        }
		        return span;
		    }
		}
		Layout.Sequence = Sequence;
		/**
		 * Represent a contiguous sequence of arbitrary layout elements as an
		 * Object.
		 *
		 * *Factory*: {@link module:Layout.struct|struct}
		 *
		 * **NOTE** The {@link Layout#span|span} of the structure is variable
		 * if any layout in {@link Structure#fields|fields} has a variable
		 * span.  When {@link Layout#encode|encoding} we must have a value for
		 * all variable-length fields, or we wouldn't be able to figure out
		 * how much space to use for storage.  We can only identify the value
		 * for a field when it has a {@link Layout#property|property}.  As
		 * such, although a structure may contain both unnamed fields and
		 * variable-length fields, it cannot contain an unnamed
		 * variable-length field.
		 *
		 * @param {Layout[]} fields - initializer for {@link
		 * Structure#fields|fields}.  An error is raised if this contains a
		 * variable-length field for which a {@link Layout#property|property}
		 * is not defined.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @param {Boolean} [decodePrefixes] - initializer for {@link
		 * Structure#decodePrefixes|property}.
		 *
		 * @throws {Error} - if `fields` contains an unnamed variable-length
		 * layout.
		 *
		 * @augments {Layout}
		 */
		class Structure extends Layout$1 {
		    constructor(fields, property, decodePrefixes) {
		        if (!(Array.isArray(fields)
		            && fields.reduce((acc, v) => acc && (v instanceof Layout$1), true))) {
		            throw new TypeError('fields must be array of Layout instances');
		        }
		        if (('boolean' === typeof property)
		            && (undefined === decodePrefixes)) {
		            decodePrefixes = property;
		            property = undefined;
		        }
		        /* Verify absence of unnamed variable-length fields. */
		        for (const fd of fields) {
		            if ((0 > fd.span)
		                && (undefined === fd.property)) {
		                throw new Error('fields cannot contain unnamed variable-length layout');
		            }
		        }
		        let span = -1;
		        try {
		            span = fields.reduce((span, fd) => span + fd.getSpan(), 0);
		        }
		        catch (e) {
		            // ignore error
		        }
		        super(span, property);
		        /** The sequence of {@link Layout} values that comprise the
		         * structure.
		         *
		         * The individual elements need not be the same type, and may be
		         * either scalar or aggregate layouts.  If a member layout leaves
		         * its {@link Layout#property|property} undefined the
		         * corresponding region of the buffer associated with the element
		         * will not be mutated.
		         *
		         * @type {Layout[]} */
		        this.fields = fields;
		        /** Control behavior of {@link Layout#decode|decode()} given short
		         * buffers.
		         *
		         * In some situations a structure many be extended with additional
		         * fields over time, with older installations providing only a
		         * prefix of the full structure.  If this property is `true`
		         * decoding will accept those buffers and leave subsequent fields
		         * undefined, as long as the buffer ends at a field boundary.
		         * Defaults to `false`. */
		        this.decodePrefixes = !!decodePrefixes;
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        if (0 <= this.span) {
		            return this.span;
		        }
		        let span = 0;
		        try {
		            span = this.fields.reduce((span, fd) => {
		                const fsp = fd.getSpan(b, offset);
		                offset += fsp;
		                return span + fsp;
		            }, 0);
		        }
		        catch (e) {
		            throw new RangeError('indeterminate span');
		        }
		        return span;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        checkUint8Array(b);
		        const dest = this.makeDestinationObject();
		        for (const fd of this.fields) {
		            if (undefined !== fd.property) {
		                dest[fd.property] = fd.decode(b, offset);
		            }
		            offset += fd.getSpan(b, offset);
		            if (this.decodePrefixes
		                && (b.length === offset)) {
		                break;
		            }
		        }
		        return dest;
		    }
		    /** Implement {@link Layout#encode|encode} for {@link Structure}.
		     *
		     * If `src` is missing a property for a member with a defined {@link
		     * Layout#property|property} the corresponding region of the buffer is
		     * left unmodified. */
		    encode(src, b, offset = 0) {
		        const firstOffset = offset;
		        let lastOffset = 0;
		        let lastWrote = 0;
		        for (const fd of this.fields) {
		            let span = fd.span;
		            lastWrote = (0 < span) ? span : 0;
		            if (undefined !== fd.property) {
		                const fv = src[fd.property];
		                if (undefined !== fv) {
		                    lastWrote = fd.encode(fv, b, offset);
		                    if (0 > span) {
		                        /* Read the as-encoded span, which is not necessarily the
		                         * same as what we wrote. */
		                        span = fd.getSpan(b, offset);
		                    }
		                }
		            }
		            lastOffset = offset;
		            offset += span;
		        }
		        /* Use (lastOffset + lastWrote) instead of offset because the last
		         * item may have had a dynamic length and we don't want to include
		         * the padding between it and the end of the space reserved for
		         * it. */
		        return (lastOffset + lastWrote) - firstOffset;
		    }
		    /** @override */
		    fromArray(values) {
		        const dest = this.makeDestinationObject();
		        for (const fd of this.fields) {
		            if ((undefined !== fd.property)
		                && (0 < values.length)) {
		                dest[fd.property] = values.shift();
		            }
		        }
		        return dest;
		    }
		    /**
		     * Get access to the layout of a given property.
		     *
		     * @param {String} property - the structure member of interest.
		     *
		     * @return {Layout} - the layout associated with `property`, or
		     * undefined if there is no such property.
		     */
		    layoutFor(property) {
		        if ('string' !== typeof property) {
		            throw new TypeError('property must be string');
		        }
		        for (const fd of this.fields) {
		            if (fd.property === property) {
		                return fd;
		            }
		        }
		        return undefined;
		    }
		    /**
		     * Get the offset of a structure member.
		     *
		     * @param {String} property - the structure member of interest.
		     *
		     * @return {Number} - the offset in bytes to the start of `property`
		     * within the structure, or undefined if `property` is not a field
		     * within the structure.  If the property is a member but follows a
		     * variable-length structure member a negative number will be
		     * returned.
		     */
		    offsetOf(property) {
		        if ('string' !== typeof property) {
		            throw new TypeError('property must be string');
		        }
		        let offset = 0;
		        for (const fd of this.fields) {
		            if (fd.property === property) {
		                return offset;
		            }
		            if (0 > fd.span) {
		                offset = -1;
		            }
		            else if (0 <= offset) {
		                offset += fd.span;
		            }
		        }
		        return undefined;
		    }
		}
		Layout.Structure = Structure;
		/**
		 * An object that can provide a {@link
		 * Union#discriminator|discriminator} API for {@link Union}.
		 *
		 * **NOTE** This is an abstract base class; you can create instances
		 * if it amuses you, but they won't support the {@link
		 * UnionDiscriminator#encode|encode} or {@link
		 * UnionDiscriminator#decode|decode} functions.
		 *
		 * @param {string} [property] - Default for {@link
		 * UnionDiscriminator#property|property}.
		 *
		 * @abstract
		 */
		class UnionDiscriminator {
		    constructor(property) {
		        /** The {@link Layout#property|property} to be used when the
		         * discriminator is referenced in isolation (generally when {@link
		         * Union#decode|Union decode} cannot delegate to a specific
		         * variant). */
		        this.property = property;
		    }
		    /** Analog to {@link Layout#decode|Layout decode} for union discriminators.
		     *
		     * The implementation of this method need not reference the buffer if
		     * variant information is available through other means. */
		    decode(b, offset) {
		        throw new Error('UnionDiscriminator is abstract');
		    }
		    /** Analog to {@link Layout#decode|Layout encode} for union discriminators.
		     *
		     * The implementation of this method need not store the value if
		     * variant information is maintained through other means. */
		    encode(src, b, offset) {
		        throw new Error('UnionDiscriminator is abstract');
		    }
		}
		Layout.UnionDiscriminator = UnionDiscriminator;
		/**
		 * An object that can provide a {@link
		 * UnionDiscriminator|discriminator API} for {@link Union} using an
		 * unsigned integral {@link Layout} instance located either inside or
		 * outside the union.
		 *
		 * @param {ExternalLayout} layout - initializes {@link
		 * UnionLayoutDiscriminator#layout|layout}.  Must satisfy {@link
		 * ExternalLayout#isCount|isCount()}.
		 *
		 * @param {string} [property] - Default for {@link
		 * UnionDiscriminator#property|property}, superseding the property
		 * from `layout`, but defaulting to `variant` if neither `property`
		 * nor layout provide a property name.
		 *
		 * @augments {UnionDiscriminator}
		 */
		class UnionLayoutDiscriminator extends UnionDiscriminator {
		    constructor(layout, property) {
		        if (!((layout instanceof ExternalLayout)
		            && layout.isCount())) {
		            throw new TypeError('layout must be an unsigned integer ExternalLayout');
		        }
		        super(property || layout.property || 'variant');
		        /** The {@link ExternalLayout} used to access the discriminator
		         * value. */
		        this.layout = layout;
		    }
		    /** Delegate decoding to {@link UnionLayoutDiscriminator#layout|layout}. */
		    decode(b, offset) {
		        return this.layout.decode(b, offset);
		    }
		    /** Delegate encoding to {@link UnionLayoutDiscriminator#layout|layout}. */
		    encode(src, b, offset) {
		        return this.layout.encode(src, b, offset);
		    }
		}
		Layout.UnionLayoutDiscriminator = UnionLayoutDiscriminator;
		/**
		 * Represent any number of span-compatible layouts.
		 *
		 * *Factory*: {@link module:Layout.union|union}
		 *
		 * If the union has a {@link Union#defaultLayout|default layout} that
		 * layout must have a non-negative {@link Layout#span|span}.  The span
		 * of a fixed-span union includes its {@link
		 * Union#discriminator|discriminator} if the variant is a {@link
		 * Union#usesPrefixDiscriminator|prefix of the union}, plus the span
		 * of its {@link Union#defaultLayout|default layout}.
		 *
		 * If the union does not have a default layout then the encoded span
		 * of the union depends on the encoded span of its variant (which may
		 * be fixed or variable).
		 *
		 * {@link VariantLayout#layout|Variant layout}s are added through
		 * {@link Union#addVariant|addVariant}.  If the union has a default
		 * layout, the span of the {@link VariantLayout#layout|layout
		 * contained by the variant} must not exceed the span of the {@link
		 * Union#defaultLayout|default layout} (minus the span of a {@link
		 * Union#usesPrefixDiscriminator|prefix disriminator}, if used).  The
		 * span of the variant will equal the span of the union itself.
		 *
		 * The variant for a buffer can only be identified from the {@link
		 * Union#discriminator|discriminator} {@link
		 * UnionDiscriminator#property|property} (in the case of the {@link
		 * Union#defaultLayout|default layout}), or by using {@link
		 * Union#getVariant|getVariant} and examining the resulting {@link
		 * VariantLayout} instance.
		 *
		 * A variant compatible with a JavaScript object can be identified
		 * using {@link Union#getSourceVariant|getSourceVariant}.
		 *
		 * @param {(UnionDiscriminator|ExternalLayout|Layout)} discr - How to
		 * identify the layout used to interpret the union contents.  The
		 * parameter must be an instance of {@link UnionDiscriminator}, an
		 * {@link ExternalLayout} that satisfies {@link
		 * ExternalLayout#isCount|isCount()}, or {@link UInt} (or {@link
		 * UIntBE}).  When a non-external layout element is passed the layout
		 * appears at the start of the union.  In all cases the (synthesized)
		 * {@link UnionDiscriminator} instance is recorded as {@link
		 * Union#discriminator|discriminator}.
		 *
		 * @param {(Layout|null)} defaultLayout - initializer for {@link
		 * Union#defaultLayout|defaultLayout}.  If absent defaults to `null`.
		 * If `null` there is no default layout: the union has data-dependent
		 * length and attempts to decode or encode unrecognized variants will
		 * throw an exception.  A {@link Layout} instance must have a
		 * non-negative {@link Layout#span|span}, and if it lacks a {@link
		 * Layout#property|property} the {@link
		 * Union#defaultLayout|defaultLayout} will be a {@link
		 * Layout#replicate|replica} with property `content`.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Union extends Layout$1 {
		    constructor(discr, defaultLayout, property) {
		        let discriminator;
		        if ((discr instanceof UInt)
		            || (discr instanceof UIntBE)) {
		            discriminator = new UnionLayoutDiscriminator(new OffsetLayout(discr));
		        }
		        else if ((discr instanceof ExternalLayout)
		            && discr.isCount()) {
		            discriminator = new UnionLayoutDiscriminator(discr);
		        }
		        else if (!(discr instanceof UnionDiscriminator)) {
		            throw new TypeError('discr must be a UnionDiscriminator '
		                + 'or an unsigned integer layout');
		        }
		        else {
		            discriminator = discr;
		        }
		        if (undefined === defaultLayout) {
		            defaultLayout = null;
		        }
		        if (!((null === defaultLayout)
		            || (defaultLayout instanceof Layout$1))) {
		            throw new TypeError('defaultLayout must be null or a Layout');
		        }
		        if (null !== defaultLayout) {
		            if (0 > defaultLayout.span) {
		                throw new Error('defaultLayout must have constant span');
		            }
		            if (undefined === defaultLayout.property) {
		                defaultLayout = defaultLayout.replicate('content');
		            }
		        }
		        /* The union span can be estimated only if there's a default
		         * layout.  The union spans its default layout, plus any prefix
		         * variant layout.  By construction both layouts, if present, have
		         * non-negative span. */
		        let span = -1;
		        if (defaultLayout) {
		            span = defaultLayout.span;
		            if ((0 <= span) && ((discr instanceof UInt)
		                || (discr instanceof UIntBE))) {
		                span += discriminator.layout.span;
		            }
		        }
		        super(span, property);
		        /** The interface for the discriminator value in isolation.
		         *
		         * This a {@link UnionDiscriminator} either passed to the
		         * constructor or synthesized from the `discr` constructor
		         * argument.  {@link
		         * Union#usesPrefixDiscriminator|usesPrefixDiscriminator} will be
		         * `true` iff the `discr` parameter was a non-offset {@link
		         * Layout} instance. */
		        this.discriminator = discriminator;
		        /** `true` if the {@link Union#discriminator|discriminator} is the
		         * first field in the union.
		         *
		         * If `false` the discriminator is obtained from somewhere
		         * else. */
		        this.usesPrefixDiscriminator = (discr instanceof UInt)
		            || (discr instanceof UIntBE);
		        /** The layout for non-discriminator content when the value of the
		         * discriminator is not recognized.
		         *
		         * This is the value passed to the constructor.  It is
		         * structurally equivalent to the second component of {@link
		         * Union#layout|layout} but may have a different property
		         * name. */
		        this.defaultLayout = defaultLayout;
		        /** A registry of allowed variants.
		         *
		         * The keys are unsigned integers which should be compatible with
		         * {@link Union.discriminator|discriminator}.  The property value
		         * is the corresponding {@link VariantLayout} instances assigned
		         * to this union by {@link Union#addVariant|addVariant}.
		         *
		         * **NOTE** The registry remains mutable so that variants can be
		         * {@link Union#addVariant|added} at any time.  Users should not
		         * manipulate the content of this property. */
		        this.registry = {};
		        /* Private variable used when invoking getSourceVariant */
		        let boundGetSourceVariant = this.defaultGetSourceVariant.bind(this);
		        /** Function to infer the variant selected by a source object.
		         *
		         * Defaults to {@link
		         * Union#defaultGetSourceVariant|defaultGetSourceVariant} but may
		         * be overridden using {@link
		         * Union#configGetSourceVariant|configGetSourceVariant}.
		         *
		         * @param {Object} src - as with {@link
		         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
		         *
		         * @returns {(undefined|VariantLayout)} The default variant
		         * (`undefined`) or first registered variant that uses a property
		         * available in `src`. */
		        this.getSourceVariant = function (src) {
		            return boundGetSourceVariant(src);
		        };
		        /** Function to override the implementation of {@link
		         * Union#getSourceVariant|getSourceVariant}.
		         *
		         * Use this if the desired variant cannot be identified using the
		         * algorithm of {@link
		         * Union#defaultGetSourceVariant|defaultGetSourceVariant}.
		         *
		         * **NOTE** The provided function will be invoked bound to this
		         * Union instance, providing local access to {@link
		         * Union#registry|registry}.
		         *
		         * @param {Function} gsv - a function that follows the API of
		         * {@link Union#defaultGetSourceVariant|defaultGetSourceVariant}. */
		        this.configGetSourceVariant = function (gsv) {
		            boundGetSourceVariant = gsv.bind(this);
		        };
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        if (0 <= this.span) {
		            return this.span;
		        }
		        /* Default layouts always have non-negative span, so we don't have
		         * one and we have to recognize the variant which will in turn
		         * determine the span. */
		        const vlo = this.getVariant(b, offset);
		        if (!vlo) {
		            throw new Error('unable to determine span for unrecognized variant');
		        }
		        return vlo.getSpan(b, offset);
		    }
		    /**
		     * Method to infer a registered Union variant compatible with `src`.
		     *
		     * The first satisfied rule in the following sequence defines the
		     * return value:
		     * * If `src` has properties matching the Union discriminator and
		     *   the default layout, `undefined` is returned regardless of the
		     *   value of the discriminator property (this ensures the default
		     *   layout will be used);
		     * * If `src` has a property matching the Union discriminator, the
		     *   value of the discriminator identifies a registered variant, and
		     *   either (a) the variant has no layout, or (b) `src` has the
		     *   variant's property, then the variant is returned (because the
		     *   source satisfies the constraints of the variant it identifies);
		     * * If `src` does not have a property matching the Union
		     *   discriminator, but does have a property matching a registered
		     *   variant, then the variant is returned (because the source
		     *   matches a variant without an explicit conflict);
		     * * An error is thrown (because we either can't identify a variant,
		     *   or we were explicitly told the variant but can't satisfy it).
		     *
		     * @param {Object} src - an object presumed to be compatible with
		     * the content of the Union.
		     *
		     * @return {(undefined|VariantLayout)} - as described above.
		     *
		     * @throws {Error} - if `src` cannot be associated with a default or
		     * registered variant.
		     */
		    defaultGetSourceVariant(src) {
		        if (Object.prototype.hasOwnProperty.call(src, this.discriminator.property)) {
		            if (this.defaultLayout && this.defaultLayout.property
		                && Object.prototype.hasOwnProperty.call(src, this.defaultLayout.property)) {
		                return undefined;
		            }
		            const vlo = this.registry[src[this.discriminator.property]];
		            if (vlo
		                && ((!vlo.layout)
		                    || (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)))) {
		                return vlo;
		            }
		        }
		        else {
		            for (const tag in this.registry) {
		                const vlo = this.registry[tag];
		                if (vlo.property && Object.prototype.hasOwnProperty.call(src, vlo.property)) {
		                    return vlo;
		                }
		            }
		        }
		        throw new Error('unable to infer src variant');
		    }
		    /** Implement {@link Layout#decode|decode} for {@link Union}.
		     *
		     * If the variant is {@link Union#addVariant|registered} the return
		     * value is an instance of that variant, with no explicit
		     * discriminator.  Otherwise the {@link Union#defaultLayout|default
		     * layout} is used to decode the content. */
		    decode(b, offset = 0) {
		        let dest;
		        const dlo = this.discriminator;
		        const discr = dlo.decode(b, offset);
		        const clo = this.registry[discr];
		        if (undefined === clo) {
		            const defaultLayout = this.defaultLayout;
		            let contentOffset = 0;
		            if (this.usesPrefixDiscriminator) {
		                contentOffset = dlo.layout.span;
		            }
		            dest = this.makeDestinationObject();
		            dest[dlo.property] = discr;
		            // defaultLayout.property can be undefined, but this is allowed by buffer-layout
		            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		            dest[defaultLayout.property] = defaultLayout.decode(b, offset + contentOffset);
		        }
		        else {
		            dest = clo.decode(b, offset);
		        }
		        return dest;
		    }
		    /** Implement {@link Layout#encode|encode} for {@link Union}.
		     *
		     * This API assumes the `src` object is consistent with the union's
		     * {@link Union#defaultLayout|default layout}.  To encode variants
		     * use the appropriate variant-specific {@link VariantLayout#encode}
		     * method. */
		    encode(src, b, offset = 0) {
		        const vlo = this.getSourceVariant(src);
		        if (undefined === vlo) {
		            const dlo = this.discriminator;
		            // this.defaultLayout is not undefined when vlo is undefined
		            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		            const clo = this.defaultLayout;
		            let contentOffset = 0;
		            if (this.usesPrefixDiscriminator) {
		                contentOffset = dlo.layout.span;
		            }
		            dlo.encode(src[dlo.property], b, offset);
		            // clo.property is not undefined when vlo is undefined
		            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		            return contentOffset + clo.encode(src[clo.property], b, offset + contentOffset);
		        }
		        return vlo.encode(src, b, offset);
		    }
		    /** Register a new variant structure within a union.  The newly
		     * created variant is returned.
		     *
		     * @param {Number} variant - initializer for {@link
		     * VariantLayout#variant|variant}.
		     *
		     * @param {Layout} layout - initializer for {@link
		     * VariantLayout#layout|layout}.
		     *
		     * @param {String} property - initializer for {@link
		     * Layout#property|property}.
		     *
		     * @return {VariantLayout} */
		    addVariant(variant, layout, property) {
		        const rv = new VariantLayout(this, variant, layout, property);
		        this.registry[variant] = rv;
		        return rv;
		    }
		    /**
		     * Get the layout associated with a registered variant.
		     *
		     * If `vb` does not produce a registered variant the function returns
		     * `undefined`.
		     *
		     * @param {(Number|Uint8Array)} vb - either the variant number, or a
		     * buffer from which the discriminator is to be read.
		     *
		     * @param {Number} offset - offset into `vb` for the start of the
		     * union.  Used only when `vb` is an instance of {Uint8Array}.
		     *
		     * @return {({VariantLayout}|undefined)}
		     */
		    getVariant(vb, offset = 0) {
		        let variant;
		        if (vb instanceof Uint8Array) {
		            variant = this.discriminator.decode(vb, offset);
		        }
		        else {
		            variant = vb;
		        }
		        return this.registry[variant];
		    }
		}
		Layout.Union = Union;
		/**
		 * Represent a specific variant within a containing union.
		 *
		 * **NOTE** The {@link Layout#span|span} of the variant may include
		 * the span of the {@link Union#discriminator|discriminator} used to
		 * identify it, but values read and written using the variant strictly
		 * conform to the content of {@link VariantLayout#layout|layout}.
		 *
		 * **NOTE** User code should not invoke this constructor directly.  Use
		 * the union {@link Union#addVariant|addVariant} helper method.
		 *
		 * @param {Union} union - initializer for {@link
		 * VariantLayout#union|union}.
		 *
		 * @param {Number} variant - initializer for {@link
		 * VariantLayout#variant|variant}.
		 *
		 * @param {Layout} [layout] - initializer for {@link
		 * VariantLayout#layout|layout}.  If absent the variant carries no
		 * data.
		 *
		 * @param {String} [property] - initializer for {@link
		 * Layout#property|property}.  Unlike many other layouts, variant
		 * layouts normally include a property name so they can be identified
		 * within their containing {@link Union}.  The property identifier may
		 * be absent only if `layout` is is absent.
		 *
		 * @augments {Layout}
		 */
		class VariantLayout extends Layout$1 {
		    constructor(union, variant, layout, property) {
		        if (!(union instanceof Union)) {
		            throw new TypeError('union must be a Union');
		        }
		        if ((!Number.isInteger(variant)) || (0 > variant)) {
		            throw new TypeError('variant must be a (non-negative) integer');
		        }
		        if (('string' === typeof layout)
		            && (undefined === property)) {
		            property = layout;
		            layout = null;
		        }
		        if (layout) {
		            if (!(layout instanceof Layout$1)) {
		                throw new TypeError('layout must be a Layout');
		            }
		            if ((null !== union.defaultLayout)
		                && (0 <= layout.span)
		                && (layout.span > union.defaultLayout.span)) {
		                throw new Error('variant span exceeds span of containing union');
		            }
		            if ('string' !== typeof property) {
		                throw new TypeError('variant must have a String property');
		            }
		        }
		        let span = union.span;
		        if (0 > union.span) {
		            span = layout ? layout.span : 0;
		            if ((0 <= span) && union.usesPrefixDiscriminator) {
		                span += union.discriminator.layout.span;
		            }
		        }
		        super(span, property);
		        /** The {@link Union} to which this variant belongs. */
		        this.union = union;
		        /** The unsigned integral value identifying this variant within
		         * the {@link Union#discriminator|discriminator} of the containing
		         * union. */
		        this.variant = variant;
		        /** The {@link Layout} to be used when reading/writing the
		         * non-discriminator part of the {@link
		         * VariantLayout#union|union}.  If `null` the variant carries no
		         * data. */
		        this.layout = layout || null;
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        if (0 <= this.span) {
		            /* Will be equal to the containing union span if that is not
		             * variable. */
		            return this.span;
		        }
		        let contentOffset = 0;
		        if (this.union.usesPrefixDiscriminator) {
		            contentOffset = this.union.discriminator.layout.span;
		        }
		        /* Span is defined solely by the variant (and prefix discriminator) */
		        let span = 0;
		        if (this.layout) {
		            span = this.layout.getSpan(b, offset + contentOffset);
		        }
		        return contentOffset + span;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const dest = this.makeDestinationObject();
		        if (this !== this.union.getVariant(b, offset)) {
		            throw new Error('variant mismatch');
		        }
		        let contentOffset = 0;
		        if (this.union.usesPrefixDiscriminator) {
		            contentOffset = this.union.discriminator.layout.span;
		        }
		        if (this.layout) {
		            dest[this.property] = this.layout.decode(b, offset + contentOffset);
		        }
		        else if (this.property) {
		            dest[this.property] = true;
		        }
		        else if (this.union.usesPrefixDiscriminator) {
		            dest[this.union.discriminator.property] = this.variant;
		        }
		        return dest;
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        let contentOffset = 0;
		        if (this.union.usesPrefixDiscriminator) {
		            contentOffset = this.union.discriminator.layout.span;
		        }
		        if (this.layout
		            && (!Object.prototype.hasOwnProperty.call(src, this.property))) {
		            throw new TypeError('variant lacks property ' + this.property);
		        }
		        this.union.discriminator.encode(this.variant, b, offset);
		        let span = contentOffset;
		        if (this.layout) {
		            this.layout.encode(src[this.property], b, offset + contentOffset);
		            span += this.layout.getSpan(b, offset + contentOffset);
		            if ((0 <= this.union.span)
		                && (span > this.union.span)) {
		                throw new Error('encoded variant overruns containing union');
		            }
		        }
		        return span;
		    }
		    /** Delegate {@link Layout#fromArray|fromArray} to {@link
		     * VariantLayout#layout|layout}. */
		    fromArray(values) {
		        if (this.layout) {
		            return this.layout.fromArray(values);
		        }
		        return undefined;
		    }
		}
		Layout.VariantLayout = VariantLayout;
		/** JavaScript chose to define bitwise operations as operating on
		 * signed 32-bit values in 2's complement form, meaning any integer
		 * with bit 31 set is going to look negative.  For right shifts that's
		 * not a problem, because `>>>` is a logical shift, but for every
		 * other bitwise operator we have to compensate for possible negative
		 * results. */
		function fixBitwiseResult(v) {
		    if (0 > v) {
		        v += 0x100000000;
		    }
		    return v;
		}
		/**
		 * Contain a sequence of bit fields as an unsigned integer.
		 *
		 * *Factory*: {@link module:Layout.bits|bits}
		 *
		 * This is a container element; within it there are {@link BitField}
		 * instances that provide the extracted properties.  The container
		 * simply defines the aggregate representation and its bit ordering.
		 * The representation is an object containing properties with numeric
		 * or {@link Boolean} values.
		 *
		 * {@link BitField}s are added with the {@link
		 * BitStructure#addField|addField} and {@link
		 * BitStructure#addBoolean|addBoolean} methods.

		 * @param {Layout} word - initializer for {@link
		 * BitStructure#word|word}.  The parameter must be an instance of
		 * {@link UInt} (or {@link UIntBE}) that is no more than 4 bytes wide.
		 *
		 * @param {bool} [msb] - `true` if the bit numbering starts at the
		 * most significant bit of the containing word; `false` (default) if
		 * it starts at the least significant bit of the containing word.  If
		 * the parameter at this position is a string and `property` is
		 * `undefined` the value of this argument will instead be used as the
		 * value of `property`.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class BitStructure extends Layout$1 {
		    constructor(word, msb, property) {
		        if (!((word instanceof UInt)
		            || (word instanceof UIntBE))) {
		            throw new TypeError('word must be a UInt or UIntBE layout');
		        }
		        if (('string' === typeof msb)
		            && (undefined === property)) {
		            property = msb;
		            msb = false;
		        }
		        if (4 < word.span) {
		            throw new RangeError('word cannot exceed 32 bits');
		        }
		        super(word.span, property);
		        /** The layout used for the packed value.  {@link BitField}
		         * instances are packed sequentially depending on {@link
		         * BitStructure#msb|msb}. */
		        this.word = word;
		        /** Whether the bit sequences are packed starting at the most
		         * significant bit growing down (`true`), or the least significant
		         * bit growing up (`false`).
		         *
		         * **NOTE** Regardless of this value, the least significant bit of
		         * any {@link BitField} value is the least significant bit of the
		         * corresponding section of the packed value. */
		        this.msb = !!msb;
		        /** The sequence of {@link BitField} layouts that comprise the
		         * packed structure.
		         *
		         * **NOTE** The array remains mutable to allow fields to be {@link
		         * BitStructure#addField|added} after construction.  Users should
		         * not manipulate the content of this property.*/
		        this.fields = [];
		        /* Storage for the value.  Capture a variable instead of using an
		         * instance property because we don't want anything to change the
		         * value without going through the mutator. */
		        let value = 0;
		        this._packedSetValue = function (v) {
		            value = fixBitwiseResult(v);
		            return this;
		        };
		        this._packedGetValue = function () {
		            return value;
		        };
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const dest = this.makeDestinationObject();
		        const value = this.word.decode(b, offset);
		        this._packedSetValue(value);
		        for (const fd of this.fields) {
		            if (undefined !== fd.property) {
		                dest[fd.property] = fd.decode(b);
		            }
		        }
		        return dest;
		    }
		    /** Implement {@link Layout#encode|encode} for {@link BitStructure}.
		     *
		     * If `src` is missing a property for a member with a defined {@link
		     * Layout#property|property} the corresponding region of the packed
		     * value is left unmodified.  Unused bits are also left unmodified. */
		    encode(src, b, offset = 0) {
		        const value = this.word.decode(b, offset);
		        this._packedSetValue(value);
		        for (const fd of this.fields) {
		            if (undefined !== fd.property) {
		                const fv = src[fd.property];
		                if (undefined !== fv) {
		                    fd.encode(fv);
		                }
		            }
		        }
		        return this.word.encode(this._packedGetValue(), b, offset);
		    }
		    /** Register a new bitfield with a containing bit structure.  The
		     * resulting bitfield is returned.
		     *
		     * @param {Number} bits - initializer for {@link BitField#bits|bits}.
		     *
		     * @param {string} property - initializer for {@link
		     * Layout#property|property}.
		     *
		     * @return {BitField} */
		    addField(bits, property) {
		        const bf = new BitField(this, bits, property);
		        this.fields.push(bf);
		        return bf;
		    }
		    /** As with {@link BitStructure#addField|addField} for single-bit
		     * fields with `boolean` value representation.
		     *
		     * @param {string} property - initializer for {@link
		     * Layout#property|property}.
		     *
		     * @return {Boolean} */
		    // `Boolean` conflicts with the native primitive type
		    // eslint-disable-next-line @typescript-eslint/ban-types
		    addBoolean(property) {
		        // This is my Boolean, not the Javascript one.
		        const bf = new Boolean(this, property);
		        this.fields.push(bf);
		        return bf;
		    }
		    /**
		     * Get access to the bit field for a given property.
		     *
		     * @param {String} property - the bit field of interest.
		     *
		     * @return {BitField} - the field associated with `property`, or
		     * undefined if there is no such property.
		     */
		    fieldFor(property) {
		        if ('string' !== typeof property) {
		            throw new TypeError('property must be string');
		        }
		        for (const fd of this.fields) {
		            if (fd.property === property) {
		                return fd;
		            }
		        }
		        return undefined;
		    }
		}
		Layout.BitStructure = BitStructure;
		/**
		 * Represent a sequence of bits within a {@link BitStructure}.
		 *
		 * All bit field values are represented as unsigned integers.
		 *
		 * **NOTE** User code should not invoke this constructor directly.
		 * Use the container {@link BitStructure#addField|addField} helper
		 * method.
		 *
		 * **NOTE** BitField instances are not instances of {@link Layout}
		 * since {@link Layout#span|span} measures 8-bit units.
		 *
		 * @param {BitStructure} container - initializer for {@link
		 * BitField#container|container}.
		 *
		 * @param {Number} bits - initializer for {@link BitField#bits|bits}.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 */
		class BitField {
		    constructor(container, bits, property) {
		        if (!(container instanceof BitStructure)) {
		            throw new TypeError('container must be a BitStructure');
		        }
		        if ((!Number.isInteger(bits)) || (0 >= bits)) {
		            throw new TypeError('bits must be positive integer');
		        }
		        const totalBits = 8 * container.span;
		        const usedBits = container.fields.reduce((sum, fd) => sum + fd.bits, 0);
		        if ((bits + usedBits) > totalBits) {
		            throw new Error('bits too long for span remainder ('
		                + (totalBits - usedBits) + ' of '
		                + totalBits + ' remain)');
		        }
		        /** The {@link BitStructure} instance to which this bit field
		         * belongs. */
		        this.container = container;
		        /** The span of this value in bits. */
		        this.bits = bits;
		        /** A mask of {@link BitField#bits|bits} bits isolating value bits
		         * that fit within the field.
		         *
		         * That is, it masks a value that has not yet been shifted into
		         * position within its containing packed integer. */
		        this.valueMask = (1 << bits) - 1;
		        if (32 === bits) { // shifted value out of range
		            this.valueMask = 0xFFFFFFFF;
		        }
		        /** The offset of the value within the containing packed unsigned
		         * integer.  The least significant bit of the packed value is at
		         * offset zero, regardless of bit ordering used. */
		        this.start = usedBits;
		        if (this.container.msb) {
		            this.start = totalBits - usedBits - bits;
		        }
		        /** A mask of {@link BitField#bits|bits} isolating the field value
		         * within the containing packed unsigned integer. */
		        this.wordMask = fixBitwiseResult(this.valueMask << this.start);
		        /** The property name used when this bitfield is represented in an
		         * Object.
		         *
		         * Intended to be functionally equivalent to {@link
		         * Layout#property}.
		         *
		         * If left undefined the corresponding span of bits will be
		         * treated as padding: it will not be mutated by {@link
		         * Layout#encode|encode} nor represented as a property in the
		         * decoded Object. */
		        this.property = property;
		    }
		    /** Store a value into the corresponding subsequence of the containing
		     * bit field. */
		    decode(b, offset) {
		        const word = this.container._packedGetValue();
		        const wordValue = fixBitwiseResult(word & this.wordMask);
		        const value = wordValue >>> this.start;
		        return value;
		    }
		    /** Store a value into the corresponding subsequence of the containing
		     * bit field.
		     *
		     * **NOTE** This is not a specialization of {@link
		     * Layout#encode|Layout.encode} and there is no return value. */
		    encode(value) {
		        if ('number' !== typeof value
		            || !Number.isInteger(value)
		            || (value !== fixBitwiseResult(value & this.valueMask))) {
		            throw new TypeError(nameWithProperty('BitField.encode', this)
		                + ' value must be integer not exceeding ' + this.valueMask);
		        }
		        const word = this.container._packedGetValue();
		        const wordValue = fixBitwiseResult(value << this.start);
		        this.container._packedSetValue(fixBitwiseResult(word & ~this.wordMask)
		            | wordValue);
		    }
		}
		Layout.BitField = BitField;
		/**
		 * Represent a single bit within a {@link BitStructure} as a
		 * JavaScript boolean.
		 *
		 * **NOTE** User code should not invoke this constructor directly.
		 * Use the container {@link BitStructure#addBoolean|addBoolean} helper
		 * method.
		 *
		 * @param {BitStructure} container - initializer for {@link
		 * BitField#container|container}.
		 *
		 * @param {string} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {BitField}
		 */
		/* eslint-disable no-extend-native */
		class Boolean extends BitField {
		    constructor(container, property) {
		        super(container, 1, property);
		    }
		    /** Override {@link BitField#decode|decode} for {@link Boolean|Boolean}.
		     *
		     * @returns {boolean} */
		    decode(b, offset) {
		        return !!super.decode(b, offset);
		    }
		    /** @override */
		    encode(value) {
		        if ('boolean' === typeof value) {
		            // BitField requires integer values
		            value = +value;
		        }
		        super.encode(value);
		    }
		}
		Layout.Boolean = Boolean;
		/* eslint-enable no-extend-native */
		/**
		 * Contain a fixed-length block of arbitrary data, represented as a
		 * Uint8Array.
		 *
		 * *Factory*: {@link module:Layout.blob|blob}
		 *
		 * @param {(Number|ExternalLayout)} length - initializes {@link
		 * Blob#length|length}.
		 *
		 * @param {String} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Blob extends Layout$1 {
		    constructor(length, property) {
		        if (!(((length instanceof ExternalLayout) && length.isCount())
		            || (Number.isInteger(length) && (0 <= length)))) {
		            throw new TypeError('length must be positive integer '
		                + 'or an unsigned integer ExternalLayout');
		        }
		        let span = -1;
		        if (!(length instanceof ExternalLayout)) {
		            span = length;
		        }
		        super(span, property);
		        /** The number of bytes in the blob.
		         *
		         * This may be a non-negative integer, or an instance of {@link
		         * ExternalLayout} that satisfies {@link
		         * ExternalLayout#isCount|isCount()}. */
		        this.length = length;
		    }
		    /** @override */
		    getSpan(b, offset) {
		        let span = this.span;
		        if (0 > span) {
		            span = this.length.decode(b, offset);
		        }
		        return span;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        let span = this.span;
		        if (0 > span) {
		            span = this.length.decode(b, offset);
		        }
		        return uint8ArrayToBuffer(b).slice(offset, offset + span);
		    }
		    /** Implement {@link Layout#encode|encode} for {@link Blob}.
		     *
		     * **NOTE** If {@link Layout#count|count} is an instance of {@link
		     * ExternalLayout} then the length of `src` will be encoded as the
		     * count after `src` is encoded. */
		    encode(src, b, offset) {
		        let span = this.length;
		        if (this.length instanceof ExternalLayout) {
		            span = src.length;
		        }
		        if (!(src instanceof Uint8Array && span === src.length)) {
		            throw new TypeError(nameWithProperty('Blob.encode', this)
		                + ' requires (length ' + span + ') Uint8Array as src');
		        }
		        if ((offset + span) > b.length) {
		            throw new RangeError('encoding overruns Uint8Array');
		        }
		        const srcBuffer = uint8ArrayToBuffer(src);
		        uint8ArrayToBuffer(b).write(srcBuffer.toString('hex'), offset, span, 'hex');
		        if (this.length instanceof ExternalLayout) {
		            this.length.encode(span, b, offset);
		        }
		        return span;
		    }
		}
		Layout.Blob = Blob;
		/**
		 * Contain a `NUL`-terminated UTF8 string.
		 *
		 * *Factory*: {@link module:Layout.cstr|cstr}
		 *
		 * **NOTE** Any UTF8 string that incorporates a zero-valued byte will
		 * not be correctly decoded by this layout.
		 *
		 * @param {String} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class CString extends Layout$1 {
		    constructor(property) {
		        super(-1, property);
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        checkUint8Array(b);
		        let idx = offset;
		        while ((idx < b.length) && (0 !== b[idx])) {
		            idx += 1;
		        }
		        return 1 + idx - offset;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const span = this.getSpan(b, offset);
		        return uint8ArrayToBuffer(b).slice(offset, offset + span - 1).toString('utf-8');
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        /* Must force this to a string, lest it be a number and the
		         * "utf8-encoding" below actually allocate a buffer of length
		         * src */
		        if ('string' !== typeof src) {
		            src = String(src);
		        }
		        const srcb = buffer_1.Buffer.from(src, 'utf8');
		        const span = srcb.length;
		        if ((offset + span) > b.length) {
		            throw new RangeError('encoding overruns Buffer');
		        }
		        const buffer = uint8ArrayToBuffer(b);
		        srcb.copy(buffer, offset);
		        buffer[offset + span] = 0;
		        return span + 1;
		    }
		}
		Layout.CString = CString;
		/**
		 * Contain a UTF8 string with implicit length.
		 *
		 * *Factory*: {@link module:Layout.utf8|utf8}
		 *
		 * **NOTE** Because the length is implicit in the size of the buffer
		 * this layout should be used only in isolation, or in a situation
		 * where the length can be expressed by operating on a slice of the
		 * containing buffer.
		 *
		 * @param {Number} [maxSpan] - the maximum length allowed for encoded
		 * string content.  If not provided there is no bound on the allowed
		 * content.
		 *
		 * @param {String} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class UTF8 extends Layout$1 {
		    constructor(maxSpan, property) {
		        if (('string' === typeof maxSpan) && (undefined === property)) {
		            property = maxSpan;
		            maxSpan = undefined;
		        }
		        if (undefined === maxSpan) {
		            maxSpan = -1;
		        }
		        else if (!Number.isInteger(maxSpan)) {
		            throw new TypeError('maxSpan must be an integer');
		        }
		        super(-1, property);
		        /** The maximum span of the layout in bytes.
		         *
		         * Positive values are generally expected.  Zero is abnormal.
		         * Attempts to encode or decode a value that exceeds this length
		         * will throw a `RangeError`.
		         *
		         * A negative value indicates that there is no bound on the length
		         * of the content. */
		        this.maxSpan = maxSpan;
		    }
		    /** @override */
		    getSpan(b, offset = 0) {
		        checkUint8Array(b);
		        return b.length - offset;
		    }
		    /** @override */
		    decode(b, offset = 0) {
		        const span = this.getSpan(b, offset);
		        if ((0 <= this.maxSpan)
		            && (this.maxSpan < span)) {
		            throw new RangeError('text length exceeds maxSpan');
		        }
		        return uint8ArrayToBuffer(b).slice(offset, offset + span).toString('utf-8');
		    }
		    /** @override */
		    encode(src, b, offset = 0) {
		        /* Must force this to a string, lest it be a number and the
		         * "utf8-encoding" below actually allocate a buffer of length
		         * src */
		        if ('string' !== typeof src) {
		            src = String(src);
		        }
		        const srcb = buffer_1.Buffer.from(src, 'utf8');
		        const span = srcb.length;
		        if ((0 <= this.maxSpan)
		            && (this.maxSpan < span)) {
		            throw new RangeError('text length exceeds maxSpan');
		        }
		        if ((offset + span) > b.length) {
		            throw new RangeError('encoding overruns Buffer');
		        }
		        srcb.copy(uint8ArrayToBuffer(b), offset);
		        return span;
		    }
		}
		Layout.UTF8 = UTF8;
		/**
		 * Contain a constant value.
		 *
		 * This layout may be used in cases where a JavaScript value can be
		 * inferred without an expression in the binary encoding.  An example
		 * would be a {@link VariantLayout|variant layout} where the content
		 * is implied by the union {@link Union#discriminator|discriminator}.
		 *
		 * @param {Object|Number|String} value - initializer for {@link
		 * Constant#value|value}.  If the value is an object (or array) and
		 * the application intends the object to remain unchanged regardless
		 * of what is done to values decoded by this layout, the value should
		 * be frozen prior passing it to this constructor.
		 *
		 * @param {String} [property] - initializer for {@link
		 * Layout#property|property}.
		 *
		 * @augments {Layout}
		 */
		class Constant extends Layout$1 {
		    constructor(value, property) {
		        super(0, property);
		        /** The value produced by this constant when the layout is {@link
		         * Constant#decode|decoded}.
		         *
		         * Any JavaScript value including `null` and `undefined` is
		         * permitted.
		         *
		         * **WARNING** If `value` passed in the constructor was not
		         * frozen, it is possible for users of decoded values to change
		         * the content of the value. */
		        this.value = value;
		    }
		    /** @override */
		    decode(b, offset) {
		        return this.value;
		    }
		    /** @override */
		    encode(src, b, offset) {
		        /* Constants take no space */
		        return 0;
		    }
		}
		Layout.Constant = Constant;
		/** Factory for {@link GreedyCount}. */
		Layout.greedy = ((elementSpan, property) => new GreedyCount(elementSpan, property));
		/** Factory for {@link OffsetLayout}. */
		Layout.offset = ((layout, offset, property) => new OffsetLayout(layout, offset, property));
		/** Factory for {@link UInt|unsigned int layouts} spanning one
		 * byte. */
		Layout.u8 = ((property) => new UInt(1, property));
		/** Factory for {@link UInt|little-endian unsigned int layouts}
		 * spanning two bytes. */
		Layout.u16 = ((property) => new UInt(2, property));
		/** Factory for {@link UInt|little-endian unsigned int layouts}
		 * spanning three bytes. */
		Layout.u24 = ((property) => new UInt(3, property));
		/** Factory for {@link UInt|little-endian unsigned int layouts}
		 * spanning four bytes. */
		Layout.u32 = ((property) => new UInt(4, property));
		/** Factory for {@link UInt|little-endian unsigned int layouts}
		 * spanning five bytes. */
		Layout.u40 = ((property) => new UInt(5, property));
		/** Factory for {@link UInt|little-endian unsigned int layouts}
		 * spanning six bytes. */
		Layout.u48 = ((property) => new UInt(6, property));
		/** Factory for {@link NearUInt64|little-endian unsigned int
		 * layouts} interpreted as Numbers. */
		Layout.nu64 = ((property) => new NearUInt64(property));
		/** Factory for {@link UInt|big-endian unsigned int layouts}
		 * spanning two bytes. */
		Layout.u16be = ((property) => new UIntBE(2, property));
		/** Factory for {@link UInt|big-endian unsigned int layouts}
		 * spanning three bytes. */
		Layout.u24be = ((property) => new UIntBE(3, property));
		/** Factory for {@link UInt|big-endian unsigned int layouts}
		 * spanning four bytes. */
		Layout.u32be = ((property) => new UIntBE(4, property));
		/** Factory for {@link UInt|big-endian unsigned int layouts}
		 * spanning five bytes. */
		Layout.u40be = ((property) => new UIntBE(5, property));
		/** Factory for {@link UInt|big-endian unsigned int layouts}
		 * spanning six bytes. */
		Layout.u48be = ((property) => new UIntBE(6, property));
		/** Factory for {@link NearUInt64BE|big-endian unsigned int
		 * layouts} interpreted as Numbers. */
		Layout.nu64be = ((property) => new NearUInt64BE(property));
		/** Factory for {@link Int|signed int layouts} spanning one
		 * byte. */
		Layout.s8 = ((property) => new Int(1, property));
		/** Factory for {@link Int|little-endian signed int layouts}
		 * spanning two bytes. */
		Layout.s16 = ((property) => new Int(2, property));
		/** Factory for {@link Int|little-endian signed int layouts}
		 * spanning three bytes. */
		Layout.s24 = ((property) => new Int(3, property));
		/** Factory for {@link Int|little-endian signed int layouts}
		 * spanning four bytes. */
		Layout.s32 = ((property) => new Int(4, property));
		/** Factory for {@link Int|little-endian signed int layouts}
		 * spanning five bytes. */
		Layout.s40 = ((property) => new Int(5, property));
		/** Factory for {@link Int|little-endian signed int layouts}
		 * spanning six bytes. */
		Layout.s48 = ((property) => new Int(6, property));
		/** Factory for {@link NearInt64|little-endian signed int layouts}
		 * interpreted as Numbers. */
		Layout.ns64 = ((property) => new NearInt64(property));
		/** Factory for {@link Int|big-endian signed int layouts}
		 * spanning two bytes. */
		Layout.s16be = ((property) => new IntBE(2, property));
		/** Factory for {@link Int|big-endian signed int layouts}
		 * spanning three bytes. */
		Layout.s24be = ((property) => new IntBE(3, property));
		/** Factory for {@link Int|big-endian signed int layouts}
		 * spanning four bytes. */
		Layout.s32be = ((property) => new IntBE(4, property));
		/** Factory for {@link Int|big-endian signed int layouts}
		 * spanning five bytes. */
		Layout.s40be = ((property) => new IntBE(5, property));
		/** Factory for {@link Int|big-endian signed int layouts}
		 * spanning six bytes. */
		Layout.s48be = ((property) => new IntBE(6, property));
		/** Factory for {@link NearInt64BE|big-endian signed int layouts}
		 * interpreted as Numbers. */
		Layout.ns64be = ((property) => new NearInt64BE(property));
		/** Factory for {@link Float|little-endian 32-bit floating point} values. */
		Layout.f32 = ((property) => new Float(property));
		/** Factory for {@link FloatBE|big-endian 32-bit floating point} values. */
		Layout.f32be = ((property) => new FloatBE(property));
		/** Factory for {@link Double|little-endian 64-bit floating point} values. */
		Layout.f64 = ((property) => new Double(property));
		/** Factory for {@link DoubleBE|big-endian 64-bit floating point} values. */
		Layout.f64be = ((property) => new DoubleBE(property));
		/** Factory for {@link Structure} values. */
		Layout.struct = ((fields, property, decodePrefixes) => new Structure(fields, property, decodePrefixes));
		/** Factory for {@link BitStructure} values. */
		Layout.bits = ((word, msb, property) => new BitStructure(word, msb, property));
		/** Factory for {@link Sequence} values. */
		Layout.seq = ((elementLayout, count, property) => new Sequence(elementLayout, count, property));
		/** Factory for {@link Union} values. */
		Layout.union = ((discr, defaultLayout, property) => new Union(discr, defaultLayout, property));
		/** Factory for {@link UnionLayoutDiscriminator} values. */
		Layout.unionLayoutDiscriminator = ((layout, property) => new UnionLayoutDiscriminator(layout, property));
		/** Factory for {@link Blob} values. */
		Layout.blob = ((length, property) => new Blob(length, property));
		/** Factory for {@link CString} values. */
		Layout.cstr = ((property) => new CString(property));
		/** Factory for {@link UTF8} values. */
		Layout.utf8 = ((maxSpan, property) => new UTF8(maxSpan, property));
		/** Factory for {@link Constant} values. */
		Layout.constant = ((value, property) => new Constant(value, property));
		
		return Layout;
	}

	var LayoutExports = /*@__PURE__*/ requireLayout();

	const UTF8_ENCODER = new TextEncoder();
	const UTF8_DECODER = new TextDecoder('utf-8');

	/**
	 * Layout for a public key
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const publicKey = (property = 'publicKey') => {
	  return LayoutExports.blob(32, property);
	};
	/**
	 * Layout for a Rust String type
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const rustString = (property = 'string') => {
	  const rsl = LayoutExports.struct([LayoutExports.u32('length'), LayoutExports.u32('lengthPadding'), LayoutExports.blob(LayoutExports.offset(LayoutExports.u32(), -8), 'chars')], property);
	  const _decode = rsl.decode.bind(rsl);
	  const _encode = rsl.encode.bind(rsl);
	  const rslShim = rsl;
	  rslShim.decode = (b, offset) => {
	    const data = _decode(b, offset);
	    return UTF8_DECODER.decode(data['chars']);
	  };
	  rslShim.encode = (str, b, offset) => {
	    const data = {
	      chars: UTF8_ENCODER.encode(str)
	    };
	    return _encode(data, b, offset);
	  };
	  rslShim.alloc = str => {
	    return LayoutExports.u32().span + LayoutExports.u32().span + UTF8_ENCODER.encode(str).length;
	  };
	  return rslShim;
	};

	/**
	 * Layout for an Authorized object
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const authorized = (property = 'authorized') => {
	  return LayoutExports.struct([publicKey('staker'), publicKey('withdrawer')], property);
	};

	/**
	 * Layout for a Lockup object
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const lockup = (property = 'lockup') => {
	  return LayoutExports.struct([LayoutExports.ns64('unixTimestamp'), LayoutExports.ns64('epoch'), publicKey('custodian')], property);
	};

	/**
	 *  Layout for a VoteInit object
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const voteInit = (property = 'voteInit') => {
	  return LayoutExports.struct([publicKey('nodePubkey'), publicKey('authorizedVoter'), publicKey('authorizedWithdrawer'), LayoutExports.u8('commission')], property);
	};

	/**
	 *  Layout for a VoteAuthorizeWithSeedArgs object
	 * @deprecated To be removed in v3. Use codecs-based layout helpers instead.
	 */
	const voteAuthorizeWithSeedArgs = (property = 'voteAuthorizeWithSeedArgs') => {
	  return LayoutExports.struct([LayoutExports.u32('voteAuthorizationType'), publicKey('currentAuthorityDerivedKeyOwnerPubkey'), rustString('currentAuthorityDerivedKeySeed'), publicKey('newAuthorized')], property);
	};

	/**
	 * Program instruction definition.
	 * @internal
	 */

	const assertInstructionIndex = (data, index) => {
	  const instructionIndex = data.instruction;
	  if (instructionIndex !== index) {
	    throw new Error(`invalid instruction; instruction index mismatch ${instructionIndex} != ${index}`);
	  }
	};

	/**
	 * Factory class for building program instruction data codec and transaction builder
	 * @experimental target for stabilization in v3
	 */
	class ProgramInstructions {
	  static create(config) {
	    return new ProgramInstructions(config);
	  }
	  constructor(config) {
	    this.programId = void 0;
	    this.instructions = void 0;
	    this.instructionIndexCodec = void 0;
	    this.byIndex = void 0;
	    this.programId = config.programId;
	    this.instructionIndexCodec = config.instructionIndexCodec;
	    const {
	      entries,
	      byIndex
	    } = buildProgramInstructionEntries({
	      programId: config.programId,
	      instructions: config.instructions
	    });
	    this.byIndex = byIndex;

	    // Make instructions available as both a property and under `instructions`
	    this.instructions = entries;
	    Object.assign(this, entries);
	    Object.freeze(this);
	  }
	  getInstructionType(data) {
	    const bytes = data instanceof TransactionInstruction ? data.data : data;
	    const index = this.instructionIndexCodec.decode(bytes);
	    const type = this.byIndex.get(index);
	    if (!type) {
	      throw new Error(`invalid instruction; unknown instruction index ${index}`);
	    }
	    return type;
	  }
	}
	function encodeProgramInstructionData(definition, params) {
	  const data = {
	    instruction: definition.index,
	    ...(params ?? {})
	  };
	  return toUint8ArrayView(definition.codec.encode(data));
	}
	function buildProgramInstructionEntries(config) {
	  const byIndex = new Map();
	  const entries = {};
	  for (const [instructionName, definition] of Object.entries(config.instructions)) {
	    if (byIndex.has(definition.index)) {
	      throw new Error(`Duplicate instruction index ${definition.index}`);
	    }
	    byIndex.set(definition.index, instructionName);
	    const encode = params => {
	      return encodeProgramInstructionData(definition, params);
	    };
	    const decode = data => {
	      const bytes = data instanceof TransactionInstruction ? data.data : data;
	      let decoded;
	      try {
	        decoded = definition.codec.decode(bytes);
	      } catch (err) {
	        throw new Error('invalid instruction; ' + err);
	      }
	      assertInstructionIndex(decoded, definition.index);
	      const {
	        instruction: _instruction,
	        ...rest
	      } = decoded;
	      return rest;
	    };
	    const build = (params, options = {}) => {
	      const data = options.data ?? encodeProgramInstructionData(definition, params);
	      return new TransactionInstruction({
	        programId: options.programId ?? config.programId,
	        keys: options.keys ?? (definition.accounts ? definition.accounts(params ?? {}) : []),
	        data
	      });
	    };
	    entries[instructionName] = Object.freeze({
	      encode,
	      decode,
	      build
	    });
	  }
	  return {
	    entries: Object.freeze(entries),
	    byIndex
	  };
	}

	const U32_DECODER$1 = getU32Decoder();
	const U64_DECODER$1 = getU64Decoder();
	const BYTES_DECODER = getBytesDecoder();

	/**
	 * See https://github.com/anza-xyz/solana-sdk/blob/e7db3b9d9f61efcb8fa2547f7371a4be2b6942d7/nonce/src/state.rs
	 *
	 * @internal
	 */
	const NONCE_ACCOUNT_DECODER = getStructDecoder([['version', U32_DECODER$1], ['state', U32_DECODER$1], ['authorizedPubkey', fixDecoderSize(BYTES_DECODER, 32)], ['nonce', fixDecoderSize(BYTES_DECODER, 32)], ['lamportsPerSignature', U64_DECODER$1]]);
	const NONCE_ACCOUNT_LENGTH = 80;

	/**
	 * A durable nonce is a 32 byte value encoded as a base58 string.
	 */

	/**
	 * NonceAccount class
	 */
	class NonceAccount {
	  /**
	   * @internal
	   */
	  constructor(args) {
	    this.authorizedPubkey = void 0;
	    this.nonce = void 0;
	    this.feeCalculator = void 0;
	    this.authorizedPubkey = args.authorizedPubkey;
	    this.nonce = args.nonce;
	    this.feeCalculator = args.feeCalculator;
	  }

	  /**
	   * Deserialize NonceAccount from the account data.
	   *
	   * @param buffer account data
	   * @return NonceAccount
	   */
	  static fromAccountData(buffer) {
	    const nonceAccount = NONCE_ACCOUNT_DECODER.decode(toUint8ArrayView(buffer));
	    assert$1(nonceAccount.lamportsPerSignature <= BigInt(Number.MAX_SAFE_INTEGER), 'lamportsPerSignature exceeds safe integer range');
	    return new NonceAccount({
	      authorizedPubkey: new Address(nonceAccount.authorizedPubkey),
	      nonce: new Address(toUint8ArrayView(nonceAccount.nonce)).toString(),
	      feeCalculator: {
	        lamportsPerSignature: Number(nonceAccount.lamportsPerSignature)
	      }
	    });
	  }
	}

	function u64(property) {
	  const layout = LayoutExports.blob(8 /* bytes */, property);
	  const decode = layout.decode.bind(layout);
	  const encode = layout.encode.bind(layout);
	  const bigIntLayout = layout;
	  const codec = getU64Codec();
	  bigIntLayout.decode = (buffer, offset = 0) => {
	    const src = decode(buffer, offset);
	    return codec.decode(src);
	  };
	  bigIntLayout.encode = (bigInt, buffer, offset = 0) => {
	    const src = codec.encode(bigInt);
	    return encode(src, buffer, offset);
	  };
	  return bigIntLayout;
	}

	const SYSTEM_PROGRAM_ID = new Address('11111111111111111111111111111111');
	const U32_CODEC$6 = getU32Codec();
	const U64_CODEC$5 = getU64Codec();
	const I64_NUMBER_CODEC$2 = transformCodec(getI64Codec(), value => BigInt(value), value => Number(value));
	const PUBLIC_KEY_BYTES_CODEC$3 = fixCodecSize(getBytesCodec(), 32);
	const getRustStringCodec$2 = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$5);
	const RUST_STRING_CODEC$2 = getRustStringCodec$2();

	/**
	 * Create account system transaction params
	 */

	/**
	 * Transfer system transaction params
	 */

	/**
	 * Assign system transaction params
	 */

	/**
	 * Create account with seed system transaction params
	 */

	/**
	 * Create nonce account system transaction params
	 */

	/**
	 * Create nonce account with seed system transaction params
	 */

	/**
	 * Initialize nonce account system instruction params
	 */

	/**
	 * Advance nonce account system instruction params
	 */

	/**
	 * Withdraw nonce account system transaction params
	 */

	/**
	 * Authorize nonce account system transaction params
	 */

	/**
	 * Allocate account system transaction params
	 */

	/**
	 * Allocate account with seed system transaction params
	 */

	/**
	 * Assign account with seed system transaction params
	 */

	/**
	 * Transfer with seed system transaction params
	 */

	/** Decoded transfer system transaction instruction */

	/** Decoded transferWithSeed system transaction instruction */

	/**
	 * System Instruction class
	 */
	class SystemInstruction {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Decode a system instruction and retrieve the instruction type.
	   */
	  static decodeInstructionType(instruction) {
	    this.checkProgramId(instruction.programId);
	    return INSTRUCTIONS$4.getInstructionType(instruction);
	  }

	  /**
	   * Decode a create account system instruction and retrieve the instruction params.
	   */
	  static decodeCreateAccount(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      lamports,
	      space,
	      programId
	    } = INSTRUCTIONS$4.Create.decode(instruction);
	    return {
	      fromPubkey: instruction.keys[0].pubkey,
	      newAccountPubkey: instruction.keys[1].pubkey,
	      lamports,
	      space,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode a transfer system instruction and retrieve the instruction params.
	   */
	  static decodeTransfer(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      lamports
	    } = INSTRUCTIONS$4.Transfer.decode(instruction);
	    return {
	      fromPubkey: instruction.keys[0].pubkey,
	      toPubkey: instruction.keys[1].pubkey,
	      lamports
	    };
	  }

	  /**
	   * Decode a transfer with seed system instruction and retrieve the instruction params.
	   */
	  static decodeTransferWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      lamports,
	      seed,
	      programId
	    } = INSTRUCTIONS$4.TransferWithSeed.decode(instruction);
	    return {
	      fromPubkey: instruction.keys[0].pubkey,
	      basePubkey: instruction.keys[1].pubkey,
	      toPubkey: instruction.keys[2].pubkey,
	      lamports,
	      seed,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode an allocate system instruction and retrieve the instruction params.
	   */
	  static decodeAllocate(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 1);
	    const {
	      space
	    } = INSTRUCTIONS$4.Allocate.decode(instruction);
	    return {
	      accountPubkey: instruction.keys[0].pubkey,
	      space
	    };
	  }

	  /**
	   * Decode an allocate with seed system instruction and retrieve the instruction params.
	   */
	  static decodeAllocateWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 1);
	    const {
	      base,
	      seed,
	      space,
	      programId
	    } = INSTRUCTIONS$4.AllocateWithSeed.decode(instruction);
	    return {
	      accountPubkey: instruction.keys[0].pubkey,
	      basePubkey: new Address(base),
	      seed,
	      space,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode an assign system instruction and retrieve the instruction params.
	   */
	  static decodeAssign(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 1);
	    const {
	      programId
	    } = INSTRUCTIONS$4.Assign.decode(instruction);
	    return {
	      accountPubkey: instruction.keys[0].pubkey,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode an assign with seed system instruction and retrieve the instruction params.
	   */
	  static decodeAssignWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 1);
	    const {
	      base,
	      seed,
	      programId
	    } = INSTRUCTIONS$4.AssignWithSeed.decode(instruction);
	    return {
	      accountPubkey: instruction.keys[0].pubkey,
	      basePubkey: new Address(base),
	      seed,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode a create account with seed system instruction and retrieve the instruction params.
	   */
	  static decodeCreateWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      base,
	      seed,
	      lamports,
	      space,
	      programId
	    } = INSTRUCTIONS$4.CreateWithSeed.decode(instruction);
	    return {
	      fromPubkey: instruction.keys[0].pubkey,
	      newAccountPubkey: instruction.keys[1].pubkey,
	      basePubkey: new Address(base),
	      seed,
	      lamports,
	      space,
	      programId: new Address(programId)
	    };
	  }

	  /**
	   * Decode a nonce initialize system instruction and retrieve the instruction params.
	   */
	  static decodeNonceInitialize(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      authorized
	    } = INSTRUCTIONS$4.InitializeNonceAccount.decode(instruction);
	    return {
	      noncePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: new Address(authorized)
	    };
	  }

	  /**
	   * Decode a nonce advance system instruction and retrieve the instruction params.
	   */
	  static decodeNonceAdvance(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    INSTRUCTIONS$4.AdvanceNonceAccount.decode(instruction);
	    return {
	      noncePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: instruction.keys[2].pubkey
	    };
	  }

	  /**
	   * Decode a nonce withdraw system instruction and retrieve the instruction params.
	   */
	  static decodeNonceWithdraw(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 5);
	    const {
	      lamports
	    } = INSTRUCTIONS$4.WithdrawNonceAccount.decode(instruction);
	    return {
	      noncePubkey: instruction.keys[0].pubkey,
	      toPubkey: instruction.keys[1].pubkey,
	      authorizedPubkey: instruction.keys[4].pubkey,
	      lamports
	    };
	  }

	  /**
	   * Decode a nonce authorize system instruction and retrieve the instruction params.
	   */
	  static decodeNonceAuthorize(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      authorized
	    } = INSTRUCTIONS$4.AuthorizeNonceAccount.decode(instruction);
	    return {
	      noncePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: instruction.keys[1].pubkey,
	      newAuthorizedPubkey: new Address(authorized)
	    };
	  }

	  /**
	   * @internal
	   */
	  static checkProgramId(programId) {
	    if (!programId.equals(SystemProgram.programId)) {
	      throw new Error('invalid instruction; programId is not SystemProgram');
	    }
	  }

	  /**
	   * @internal
	   */
	  static checkKeyLength(keys, expectedLength) {
	    if (keys.length < expectedLength) {
	      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
	    }
	  }
	}

	/**
	 * An enumeration of valid SystemInstructionType's
	 */

	const INSTRUCTION_DEFS$3 = {
	  Create: {
	    index: 0,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', I64_NUMBER_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  Assign: {
	    index: 1,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  Transfer: {
	    index: 2,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', U64_CODEC$5]])
	  },
	  CreateWithSeed: {
	    index: 3,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['lamports', I64_NUMBER_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  AdvanceNonceAccount: {
	    index: 4,
	    codec: getStructCodec([['instruction', U32_CODEC$6]])
	  },
	  WithdrawNonceAccount: {
	    index: 5,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', I64_NUMBER_CODEC$2]])
	  },
	  InitializeNonceAccount: {
	    index: 6,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['authorized', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  AuthorizeNonceAccount: {
	    index: 7,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['authorized', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  Allocate: {
	    index: 8,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['space', I64_NUMBER_CODEC$2]])
	  },
	  AllocateWithSeed: {
	    index: 9,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['space', I64_NUMBER_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  AssignWithSeed: {
	    index: 10,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['base', PUBLIC_KEY_BYTES_CODEC$3], ['seed', RUST_STRING_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  TransferWithSeed: {
	    index: 11,
	    codec: getStructCodec([['instruction', U32_CODEC$6], ['lamports', U64_CODEC$5], ['seed', RUST_STRING_CODEC$2], ['programId', PUBLIC_KEY_BYTES_CODEC$3]])
	  },
	  UpgradeNonceAccount: {
	    index: 12,
	    codec: getStructCodec([['instruction', U32_CODEC$6]])
	  }
	};

	/**
	 * @internal
	 */
	const SYSTEM_INSTRUCTIONS = ProgramInstructions.create({
	  programId: SYSTEM_PROGRAM_ID,
	  instructionIndexCodec: U32_CODEC$6,
	  instructions: INSTRUCTION_DEFS$3
	});
	const INSTRUCTIONS$4 = SYSTEM_INSTRUCTIONS;

	/**
	 * An enumeration of valid system InstructionType's
	 * @internal
	 * @deprecated To be removed in v3. Use SystemProgram helpers or ProgramInstructions instead.
	 */
	const SYSTEM_INSTRUCTION_LAYOUTS = Object.freeze({
	  Create: {
	    index: 0,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('lamports'), LayoutExports.ns64('space'), publicKey('programId')])
	  },
	  Assign: {
	    index: 1,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('programId')])
	  },
	  Transfer: {
	    index: 2,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), u64('lamports')])
	  },
	  CreateWithSeed: {
	    index: 3,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('base'), rustString('seed'), LayoutExports.ns64('lamports'), LayoutExports.ns64('space'), publicKey('programId')])
	  },
	  AdvanceNonceAccount: {
	    index: 4,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  WithdrawNonceAccount: {
	    index: 5,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('lamports')])
	  },
	  InitializeNonceAccount: {
	    index: 6,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('authorized')])
	  },
	  AuthorizeNonceAccount: {
	    index: 7,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('authorized')])
	  },
	  Allocate: {
	    index: 8,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('space')])
	  },
	  AllocateWithSeed: {
	    index: 9,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('base'), rustString('seed'), LayoutExports.ns64('space'), publicKey('programId')])
	  },
	  AssignWithSeed: {
	    index: 10,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('base'), rustString('seed'), publicKey('programId')])
	  },
	  TransferWithSeed: {
	    index: 11,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), u64('lamports'), rustString('seed'), publicKey('programId')])
	  },
	  UpgradeNonceAccount: {
	    index: 12,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  }
	});

	/**
	 * Factory class for transactions to interact with the System program
	 */
	class SystemProgram {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the System program
	   */

	  /**
	   * Generate a transaction instruction that creates a new account
	   */
	  static createAccount(params) {
	    return INSTRUCTIONS$4.Create.build({
	      lamports: params.lamports,
	      space: params.space,
	      programId: params.programId.toBytes()
	    }, {
	      keys: [{
	        pubkey: params.fromPubkey,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: params.newAccountPubkey,
	        isSigner: true,
	        isWritable: true
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction instruction that transfers lamports from one account to another
	   */
	  static transfer(params) {
	    let keys;
	    if ('basePubkey' in params) {
	      keys = [{
	        pubkey: params.fromPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }];
	      return INSTRUCTIONS$4.TransferWithSeed.build({
	        lamports: BigInt(params.lamports),
	        seed: params.seed,
	        programId: params.programId.toBytes()
	      }, {
	        keys,
	        programId: this.programId
	      });
	    } else {
	      keys = [{
	        pubkey: params.fromPubkey,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }];
	      return INSTRUCTIONS$4.Transfer.build({
	        lamports: BigInt(params.lamports)
	      }, {
	        keys,
	        programId: this.programId
	      });
	    }
	  }

	  /**
	   * Generate a transaction instruction that assigns an account to a program
	   */
	  static assign(params) {
	    let keys;
	    if ('basePubkey' in params) {
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }];
	      return INSTRUCTIONS$4.AssignWithSeed.build({
	        base: params.basePubkey.toBytes(),
	        seed: params.seed,
	        programId: params.programId.toBytes()
	      }, {
	        keys,
	        programId: this.programId
	      });
	    } else {
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: true,
	        isWritable: true
	      }];
	      return INSTRUCTIONS$4.Assign.build({
	        programId: params.programId.toBytes()
	      }, {
	        keys,
	        programId: this.programId
	      });
	    }
	  }

	  /**
	   * Generate a transaction instruction that creates a new account at
	   *   an address generated with `from`, a seed, and programId
	   */
	  static createAccountWithSeed(params) {
	    let keys = [{
	      pubkey: params.fromPubkey,
	      isSigner: true,
	      isWritable: true
	    }, {
	      pubkey: params.newAccountPubkey,
	      isSigner: false,
	      isWritable: true
	    }];
	    if (!params.basePubkey.equals(params.fromPubkey)) {
	      keys.push({
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      });
	    }
	    return INSTRUCTIONS$4.CreateWithSeed.build({
	      base: params.basePubkey.toBytes(),
	      seed: params.seed,
	      lamports: params.lamports,
	      space: params.space,
	      programId: params.programId.toBytes()
	    }, {
	      keys,
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction that creates a new Nonce account
	   */
	  static createNonceAccount(params) {
	    const transaction = new Transaction();
	    if ('basePubkey' in params && 'seed' in params) {
	      transaction.add(SystemProgram.createAccountWithSeed({
	        fromPubkey: params.fromPubkey,
	        newAccountPubkey: params.noncePubkey,
	        basePubkey: params.basePubkey,
	        seed: params.seed,
	        lamports: params.lamports,
	        space: NONCE_ACCOUNT_LENGTH,
	        programId: this.programId
	      }));
	    } else {
	      transaction.add(SystemProgram.createAccount({
	        fromPubkey: params.fromPubkey,
	        newAccountPubkey: params.noncePubkey,
	        lamports: params.lamports,
	        space: NONCE_ACCOUNT_LENGTH,
	        programId: this.programId
	      }));
	    }
	    const initParams = {
	      noncePubkey: params.noncePubkey,
	      authorizedPubkey: params.authorizedPubkey
	    };
	    transaction.add(this.nonceInitialize(initParams));
	    return transaction;
	  }

	  /**
	   * Generate an instruction to initialize a Nonce account
	   */
	  static nonceInitialize(params) {
	    return INSTRUCTIONS$4.InitializeNonceAccount.build({
	      authorized: params.authorizedPubkey.toBytes()
	    }, {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate an instruction to advance the nonce in a Nonce account
	   */
	  static nonceAdvance(params) {
	    return INSTRUCTIONS$4.AdvanceNonceAccount.build(undefined, {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction instruction that withdraws lamports from a Nonce account
	   */
	  static nonceWithdraw(params) {
	    return INSTRUCTIONS$4.WithdrawNonceAccount.build({
	      lamports: params.lamports
	    }, {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.toPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction instruction that authorizes a new Address as the authority
	   * on a Nonce account.
	   */
	  static nonceAuthorize(params) {
	    return INSTRUCTIONS$4.AuthorizeNonceAccount.build({
	      authorized: params.newAuthorizedPubkey.toBytes()
	    }, {
	      keys: [{
	        pubkey: params.noncePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction instruction that allocates space in an account without funding
	   */
	  static allocate(params) {
	    let keys;
	    if ('basePubkey' in params) {
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: params.basePubkey,
	        isSigner: true,
	        isWritable: false
	      }];
	      return INSTRUCTIONS$4.AllocateWithSeed.build({
	        base: params.basePubkey.toBytes(),
	        seed: params.seed,
	        space: params.space,
	        programId: params.programId.toBytes()
	      }, {
	        keys,
	        programId: this.programId
	      });
	    } else {
	      keys = [{
	        pubkey: params.accountPubkey,
	        isSigner: true,
	        isWritable: true
	      }];
	      return INSTRUCTIONS$4.Allocate.build({
	        space: params.space
	      }, {
	        keys,
	        programId: this.programId
	      });
	    }
	  }
	}
	SystemProgram.programId = SYSTEM_PROGRAM_ID;

	// Keep program chunks under PACKET_DATA_SIZE, leaving enough room for the
	// rest of the Transaction fields
	//
	// TODO: replace 300 with a proper constant for the size of the other
	// Transaction fields
	const CHUNK_SIZE = PACKET_DATA_SIZE - 300;
	const U32_CODEC$5 = getU32Codec();
	const LOAD_INSTRUCTION_HEADER_CODEC = getStructCodec([['instruction', U32_CODEC$5], ['offset', U32_CODEC$5], ['bytesLength', U32_CODEC$5], ['bytesLengthPadding', U32_CODEC$5]]);
	const FINALIZE_INSTRUCTION_CODEC = getStructCodec([['instruction', U32_CODEC$5]]);
	const encodeLoadInstructionChunk = ({
	  instruction,
	  offset,
	  bytes,
	  chunkSize,
	  bytesLengthPadding = 0
	}) => {
	  if (bytes.length > chunkSize) {
	    throw new Error('instruction data exceeds chunk size');
	  }
	  const header = LOAD_INSTRUCTION_HEADER_CODEC.encode({
	    instruction,
	    offset,
	    bytesLength: bytes.length,
	    bytesLengthPadding
	  });
	  const data = new Uint8Array(header.length + chunkSize);
	  data.set(header, 0);
	  data.set(bytes, header.length);
	  return data;
	};

	/**
	 * Program loader interface
	 */
	class Loader {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Amount of program data placed in each load Transaction
	   */

	  /**
	   * Minimum number of signatures required to load a program not including
	   * retries
	   *
	   * Can be used to calculate transaction fees
	   */
	  static getMinNumSignatures(dataLength) {
	    return 2 * (
	    // Every transaction requires two signatures (payer + program)
	    Math.ceil(dataLength / Loader.chunkSize) + 1 +
	    // Add one for Create transaction
	    1) // Add one for Finalize transaction
	    ;
	  }

	  /**
	   * Loads a generic program
	   *
	   * @param connection The connection to use
	   * @param payer System account that pays to load the program
	   * @param program Account to load the program into
	   * @param programId Public key that identifies the loader
	   * @param data Program octets
	   * @return true if program was loaded successfully, false if program was already loaded
	   */
	  static async load(connection, payer, program, programId, data) {
	    {
	      const balanceNeeded = await connection.getMinimumBalanceForRentExemption(data.length);

	      // Fetch program account info to check if it has already been created
	      const programInfo = await connection.getAccountInfo(program.publicKey, 'confirmed');
	      let transaction = null;
	      if (programInfo !== null) {
	        if (programInfo.executable) {
	          console.error('Program load failed, account is already executable');
	          return false;
	        }
	        if (programInfo.data.length !== data.length) {
	          transaction = transaction || new Transaction();
	          transaction.add(SystemProgram.allocate({
	            accountPubkey: program.publicKey,
	            space: data.length
	          }));
	        }
	        if (!programInfo.owner.equals(programId)) {
	          transaction = transaction || new Transaction();
	          transaction.add(SystemProgram.assign({
	            accountPubkey: program.publicKey,
	            programId
	          }));
	        }
	        if (programInfo.lamports < BigInt(balanceNeeded)) {
	          transaction = transaction || new Transaction();
	          transaction.add(SystemProgram.transfer({
	            fromPubkey: payer.publicKey,
	            toPubkey: program.publicKey,
	            lamports: BigInt(balanceNeeded) - programInfo.lamports
	          }));
	        }
	      } else {
	        transaction = new Transaction().add(SystemProgram.createAccount({
	          fromPubkey: payer.publicKey,
	          newAccountPubkey: program.publicKey,
	          lamports: balanceNeeded > 0 ? balanceNeeded : 1,
	          space: data.length,
	          programId
	        }));
	      }

	      // If the account is already created correctly, skip this step
	      // and proceed directly to loading instructions
	      if (transaction !== null) {
	        await sendAndConfirmTransaction(connection, transaction, [payer, program], {
	          commitment: 'confirmed'
	        });
	      }
	    }
	    const chunkSize = Loader.chunkSize;
	    let offset = 0;
	    let bytesRemaining = toUint8ArrayView(data);
	    let transactions = [];
	    while (bytesRemaining.length > 0) {
	      const bytes = bytesRemaining.subarray(0, chunkSize);
	      const data = encodeLoadInstructionChunk({
	        instruction: 0,
	        // Load instruction
	        offset,
	        bytes,
	        chunkSize
	      });
	      const transaction = new Transaction().add({
	        keys: [{
	          pubkey: program.publicKey,
	          isSigner: true,
	          isWritable: true
	        }],
	        programId,
	        data
	      });
	      transactions.push(sendAndConfirmTransaction(connection, transaction, [payer, program], {
	        commitment: 'confirmed'
	      }));

	      // Delay between sends in an attempt to reduce rate limit errors
	      if (connection._rpcEndpoint.includes('solana.com')) {
	        const REQUESTS_PER_SECOND = 4;
	        await sleep(1000 / REQUESTS_PER_SECOND);
	      }
	      offset += chunkSize;
	      bytesRemaining = bytesRemaining.subarray(chunkSize);
	    }
	    await Promise.all(transactions);

	    // Finalize the account loaded with program data for execution
	    {
	      const data = toUint8ArrayView(FINALIZE_INSTRUCTION_CODEC.encode({
	        instruction: 1 // Finalize instruction
	      }));
	      const transaction = new Transaction().add({
	        keys: [{
	          pubkey: program.publicKey,
	          isSigner: true,
	          isWritable: true
	        }, {
	          pubkey: SYSVAR_RENT_PUBKEY,
	          isSigner: false,
	          isWritable: false
	        }],
	        programId,
	        data
	      });
	      const deployCommitment = 'processed';
	      const finalizeSignature = await connection.sendTransaction(transaction, [payer, program], {
	        preflightCommitment: deployCommitment
	      });
	      const {
	        context,
	        value
	      } = await connection.confirmTransaction({
	        signature: finalizeSignature,
	        lastValidBlockHeight: transaction.lastValidBlockHeight,
	        blockhash: transaction.recentBlockhash
	      }, deployCommitment);
	      if (value.err) {
	        throw new Error(`Transaction ${finalizeSignature} failed (${JSON.stringify(value)})`);
	      }
	      // We prevent programs from being usable until the slot after their deployment.
	      // See https://github.com/solana-labs/solana/pull/29654
	      while (true // eslint-disable-line no-constant-condition
	      ) {
	        try {
	          const currentSlot = await connection.getSlot({
	            commitment: deployCommitment
	          });
	          if (currentSlot > context.slot) {
	            break;
	          }
	        } catch {
	          /* empty */
	        }
	        await new Promise(resolve => setTimeout(resolve, Math.round(MS_PER_SLOT / 2)));
	      }
	    }

	    // success
	    return true;
	  }
	}
	Loader.chunkSize = CHUNK_SIZE;

	/**
	 * @deprecated Deprecated since Solana v1.17.20.
	 */
	const BPF_LOADER_PROGRAM_ID = new Address('BPFLoader2111111111111111111111111111111111');

	/**
	 * Factory class for transactions to interact with a program loader
	 *
	 * @deprecated Deprecated since Solana v1.17.20.
	 */
	class BpfLoader {
	  /**
	   * Minimum number of signatures required to load a program not including
	   * retries
	   *
	   * Can be used to calculate transaction fees
	   */
	  static getMinNumSignatures(dataLength) {
	    return Loader.getMinNumSignatures(dataLength);
	  }

	  /**
	   * Load a SBF program
	   *
	   * @param connection The connection to use
	   * @param payer Account that will pay program loading fees
	   * @param program Account to load the program into
	   * @param elf The entire ELF containing the SBF program
	   * @param loaderProgramId The program id of the BPF loader to use
	   * @return true if program was loaded successfully, false if program was already loaded
	   */
	  static load(connection, payer, program, elf, loaderProgramId) {
	    return Loader.load(connection, payer, program, loaderProgramId, elf);
	  }
	}

	// src/codes.ts
	var SOLANA_ERROR__LAMPORTS_OUT_OF_RANGE = 6;
	var SOLANA_ERROR__MALFORMED_JSON_RPC_ERROR = 10;
	var SOLANA_ERROR__JSON_RPC__PARSE_ERROR = -32700;
	var SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR = -32603;
	var SOLANA_ERROR__JSON_RPC__INVALID_PARAMS = -32602;
	var SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND = -32601;
	var SOLANA_ERROR__JSON_RPC__INVALID_REQUEST = -32600;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION = -32015;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET = -32014;
	var SOLANA_ERROR__JSON_RPC__SCAN_ERROR = -32012;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX = -32010;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED = -32009;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SLOT_SKIPPED = -32007;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE = -32006;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_NOT_AVAILABLE = -32004;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE = -32002;
	var SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_CLEANED_UP = -32001;
	var SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN = 4615e3;
	var SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM = 4615026;
	var SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN = 705e4;
	var SOLANA_ERROR__TRANSACTION_ERROR__DUPLICATE_INSTRUCTION = 7050030;
	var SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT = 7050031;
	var SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED = 7050035;
	var SOLANA_ERROR__RPC__INTEGER_OVERFLOW = 81e5;
	var SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD = 8100003;

	// src/context.ts
	function encodeValue(value) {
	  if (Array.isArray(value)) {
	    const commaSeparatedValues = value.map(encodeValue).join(
	      "%2C%20"
	      /* ", " */
	    );
	    return "%5B" + commaSeparatedValues + /* "]" */
	    "%5D";
	  } else if (typeof value === "bigint") {
	    return `${value}n`;
	  } else {
	    return encodeURIComponent(
	      String(
	        value != null && Object.getPrototypeOf(value) === null ? (
	          // Plain objects with no prototype don't have a `toString` method.
	          // Convert them before stringifying them.
	          { ...value }
	        ) : value
	      )
	    );
	  }
	}
	function encodeObjectContextEntry([key, value]) {
	  return `${key}=${encodeValue(value)}`;
	}
	function encodeContextObject(context) {
	  const searchParamsString = Object.entries(context).map(encodeObjectContextEntry).join("&");
	  return btoa(searchParamsString);
	}
	function getErrorMessage(code, context = {}) {
	  {
	    let decodingAdviceMessage = `Solana error #${code}; Decode this error by running \`npx @solana/errors decode -- ${code}`;
	    if (Object.keys(context).length) {
	      decodingAdviceMessage += ` '${encodeContextObject(context)}'`;
	    }
	    return `${decodingAdviceMessage}\``;
	  }
	}
	var SolanaError = class extends Error {
	  /**
	   * Indicates the root cause of this {@link SolanaError}, if any.
	   *
	   * For example, a transaction error might have an instruction error as its root cause. In this
	   * case, you will be able to access the instruction error on the transaction error as `cause`.
	   */
	  cause = this.cause;
	  /**
	   * Contains context that can assist in understanding or recovering from a {@link SolanaError}.
	   */
	  context;
	  constructor(...[code, contextAndErrorOptions]) {
	    let context;
	    let errorOptions;
	    if (contextAndErrorOptions) {
	      Object.entries(Object.getOwnPropertyDescriptors(contextAndErrorOptions)).forEach(([name, descriptor]) => {
	        if (name === "cause") {
	          errorOptions = { cause: descriptor.value };
	        } else {
	          if (context === void 0) {
	            context = {
	              __code: code
	            };
	          }
	          Object.defineProperty(context, name, descriptor);
	        }
	      });
	    }
	    const message = getErrorMessage(code, context);
	    super(message, errorOptions);
	    this.context = Object.freeze(
	      context === void 0 ? {
	        __code: code
	      } : context
	    );
	    this.name = "SolanaError";
	  }
	};

	// src/stack-trace.ts
	function safeCaptureStackTrace(...args) {
	  if ("captureStackTrace" in Error && typeof Error.captureStackTrace === "function") {
	    Error.captureStackTrace(...args);
	  }
	}

	// src/rpc-enum-errors.ts
	function getSolanaErrorFromRpcError({ errorCodeBaseOffset, getErrorContext, orderedErrorNames, rpcEnumError }, constructorOpt) {
	  let rpcErrorName;
	  let rpcErrorContext;
	  if (typeof rpcEnumError === "string") {
	    rpcErrorName = rpcEnumError;
	  } else {
	    rpcErrorName = Object.keys(rpcEnumError)[0];
	    rpcErrorContext = rpcEnumError[rpcErrorName];
	  }
	  const codeOffset = orderedErrorNames.indexOf(rpcErrorName);
	  const errorCode = errorCodeBaseOffset + codeOffset;
	  const errorContext = getErrorContext(errorCode, rpcErrorName, rpcErrorContext);
	  const err = new SolanaError(errorCode, errorContext);
	  safeCaptureStackTrace(err, constructorOpt);
	  return err;
	}

	// src/instruction-error.ts
	var ORDERED_ERROR_NAMES = [
	  // Keep synced with RPC source: https://github.com/anza-xyz/solana-sdk/blob/master/instruction-error/src/lib.rs
	  // If this list ever gets too large, consider implementing a compression strategy like this:
	  // https://gist.github.com/steveluscher/aaa7cbbb5433b1197983908a40860c47
	  "GenericError",
	  "InvalidArgument",
	  "InvalidInstructionData",
	  "InvalidAccountData",
	  "AccountDataTooSmall",
	  "InsufficientFunds",
	  "IncorrectProgramId",
	  "MissingRequiredSignature",
	  "AccountAlreadyInitialized",
	  "UninitializedAccount",
	  "UnbalancedInstruction",
	  "ModifiedProgramId",
	  "ExternalAccountLamportSpend",
	  "ExternalAccountDataModified",
	  "ReadonlyLamportChange",
	  "ReadonlyDataModified",
	  "DuplicateAccountIndex",
	  "ExecutableModified",
	  "RentEpochModified",
	  "NotEnoughAccountKeys",
	  "AccountDataSizeChanged",
	  "AccountNotExecutable",
	  "AccountBorrowFailed",
	  "AccountBorrowOutstanding",
	  "DuplicateAccountOutOfSync",
	  "Custom",
	  "InvalidError",
	  "ExecutableDataModified",
	  "ExecutableLamportChange",
	  "ExecutableAccountNotRentExempt",
	  "UnsupportedProgramId",
	  "CallDepth",
	  "MissingAccount",
	  "ReentrancyNotAllowed",
	  "MaxSeedLengthExceeded",
	  "InvalidSeeds",
	  "InvalidRealloc",
	  "ComputationalBudgetExceeded",
	  "PrivilegeEscalation",
	  "ProgramEnvironmentSetupFailure",
	  "ProgramFailedToComplete",
	  "ProgramFailedToCompile",
	  "Immutable",
	  "IncorrectAuthority",
	  "BorshIoError",
	  "AccountNotRentExempt",
	  "InvalidAccountOwner",
	  "ArithmeticOverflow",
	  "UnsupportedSysvar",
	  "IllegalOwner",
	  "MaxAccountsDataAllocationsExceeded",
	  "MaxAccountsExceeded",
	  "MaxInstructionTraceLengthExceeded",
	  "BuiltinProgramsMustConsumeComputeUnits"
	];
	function getSolanaErrorFromInstructionError(index, instructionError) {
	  const numberIndex = Number(index);
	  return getSolanaErrorFromRpcError(
	    {
	      errorCodeBaseOffset: 4615001,
	      getErrorContext(errorCode, rpcErrorName, rpcErrorContext) {
	        if (errorCode === SOLANA_ERROR__INSTRUCTION_ERROR__UNKNOWN) {
	          return {
	            errorName: rpcErrorName,
	            index: numberIndex,
	            ...rpcErrorContext !== void 0 ? { instructionErrorContext: rpcErrorContext } : null
	          };
	        } else if (errorCode === SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) {
	          return {
	            code: Number(rpcErrorContext),
	            index: numberIndex
	          };
	        }
	        return { index: numberIndex };
	      },
	      orderedErrorNames: ORDERED_ERROR_NAMES,
	      rpcEnumError: instructionError
	    },
	    getSolanaErrorFromInstructionError
	  );
	}

	// src/transaction-error.ts
	var ORDERED_ERROR_NAMES2 = [
	  // Keep synced with RPC source: https://github.com/anza-xyz/agave/blob/master/sdk/src/transaction/error.rs
	  // If this list ever gets too large, consider implementing a compression strategy like this:
	  // https://gist.github.com/steveluscher/aaa7cbbb5433b1197983908a40860c47
	  "AccountInUse",
	  "AccountLoadedTwice",
	  "AccountNotFound",
	  "ProgramAccountNotFound",
	  "InsufficientFundsForFee",
	  "InvalidAccountForFee",
	  "AlreadyProcessed",
	  "BlockhashNotFound",
	  // `InstructionError` intentionally omitted; delegated to `getSolanaErrorFromInstructionError`
	  "CallChainTooDeep",
	  "MissingSignatureForFee",
	  "InvalidAccountIndex",
	  "SignatureFailure",
	  "InvalidProgramForExecution",
	  "SanitizeFailure",
	  "ClusterMaintenance",
	  "AccountBorrowOutstanding",
	  "WouldExceedMaxBlockCostLimit",
	  "UnsupportedVersion",
	  "InvalidWritableAccount",
	  "WouldExceedMaxAccountCostLimit",
	  "WouldExceedAccountDataBlockLimit",
	  "TooManyAccountLocks",
	  "AddressLookupTableNotFound",
	  "InvalidAddressLookupTableOwner",
	  "InvalidAddressLookupTableData",
	  "InvalidAddressLookupTableIndex",
	  "InvalidRentPayingAccount",
	  "WouldExceedMaxVoteCostLimit",
	  "WouldExceedAccountDataTotalLimit",
	  "DuplicateInstruction",
	  "InsufficientFundsForRent",
	  "MaxLoadedAccountsDataSizeExceeded",
	  "InvalidLoadedAccountsDataSizeLimit",
	  "ResanitizationNeeded",
	  "ProgramExecutionTemporarilyRestricted",
	  "UnbalancedTransaction"
	];
	function getSolanaErrorFromTransactionError(transactionError) {
	  if (typeof transactionError === "object" && "InstructionError" in transactionError) {
	    return getSolanaErrorFromInstructionError(
	      ...transactionError.InstructionError
	    );
	  }
	  return getSolanaErrorFromRpcError(
	    {
	      errorCodeBaseOffset: 7050001,
	      getErrorContext(errorCode, rpcErrorName, rpcErrorContext) {
	        if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__UNKNOWN) {
	          return {
	            errorName: rpcErrorName,
	            ...rpcErrorContext !== void 0 ? { transactionErrorContext: rpcErrorContext } : null
	          };
	        } else if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__DUPLICATE_INSTRUCTION) {
	          return {
	            index: Number(rpcErrorContext)
	          };
	        } else if (errorCode === SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_RENT || errorCode === SOLANA_ERROR__TRANSACTION_ERROR__PROGRAM_EXECUTION_TEMPORARILY_RESTRICTED) {
	          return {
	            accountIndex: Number(rpcErrorContext.account_index)
	          };
	        }
	      },
	      orderedErrorNames: ORDERED_ERROR_NAMES2,
	      rpcEnumError: transactionError
	    },
	    getSolanaErrorFromTransactionError
	  );
	}

	// src/json-rpc-error.ts
	function getSolanaErrorFromJsonRpcError(putativeErrorResponse) {
	  let out;
	  if (isRpcErrorResponse(putativeErrorResponse)) {
	    const { code: rawCode, data, message } = putativeErrorResponse;
	    const code = Number(rawCode);
	    if (code === SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE) {
	      const { err, ...preflightErrorContext } = data;
	      const causeObject = err ? { cause: getSolanaErrorFromTransactionError(err) } : null;
	      out = new SolanaError(SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE, {
	        ...preflightErrorContext,
	        ...causeObject
	      });
	    } else {
	      let errorContext;
	      switch (code) {
	        case SOLANA_ERROR__JSON_RPC__INTERNAL_ERROR:
	        case SOLANA_ERROR__JSON_RPC__INVALID_PARAMS:
	        case SOLANA_ERROR__JSON_RPC__INVALID_REQUEST:
	        case SOLANA_ERROR__JSON_RPC__METHOD_NOT_FOUND:
	        case SOLANA_ERROR__JSON_RPC__PARSE_ERROR:
	        case SOLANA_ERROR__JSON_RPC__SCAN_ERROR:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_CLEANED_UP:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_NOT_AVAILABLE:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_BLOCK_STATUS_NOT_AVAILABLE_YET:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_KEY_EXCLUDED_FROM_SECONDARY_INDEX:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_LONG_TERM_STORAGE_SLOT_SKIPPED:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SLOT_SKIPPED:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_TRANSACTION_PRECOMPILE_VERIFICATION_FAILURE:
	        case SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION:
	          errorContext = { __serverMessage: message };
	          break;
	        default:
	          if (typeof data === "object" && !Array.isArray(data)) {
	            errorContext = data;
	          }
	      }
	      out = new SolanaError(code, errorContext);
	    }
	  } else {
	    const message = typeof putativeErrorResponse === "object" && putativeErrorResponse !== null && "message" in putativeErrorResponse && typeof putativeErrorResponse.message === "string" ? putativeErrorResponse.message : "Malformed JSON-RPC error with no message attribute";
	    out = new SolanaError(SOLANA_ERROR__MALFORMED_JSON_RPC_ERROR, { error: putativeErrorResponse, message });
	  }
	  safeCaptureStackTrace(out, getSolanaErrorFromJsonRpcError);
	  return out;
	}
	function isRpcErrorResponse(value) {
	  return typeof value === "object" && value !== null && "code" in value && "message" in value && (typeof value.code === "number" || typeof value.code === "bigint") && typeof value.message === "string";
	}

	// src/parse-json-with-bigints.ts

	// src/rpc-message.ts
	var _nextMessageId = 0n;
	function getNextMessageId() {
	  const id = _nextMessageId;
	  _nextMessageId++;
	  return id.toString();
	}
	function createRpcMessage(request) {
	  return {
	    id: getNextMessageId(),
	    jsonrpc: "2.0",
	    method: request.methodName,
	    params: request.params
	  };
	}

	// src/rpc.ts
	function createRpc(rpcConfig) {
	  return makeProxy(rpcConfig);
	}
	function makeProxy(rpcConfig) {
	  return new Proxy(rpcConfig.api, {
	    defineProperty() {
	      return false;
	    },
	    deleteProperty() {
	      return false;
	    },
	    get(target, p, receiver) {
	      if (p === "then") {
	        return void 0;
	      }
	      return function(...rawParams) {
	        const methodName = p.toString();
	        const getApiPlan = Reflect.get(target, methodName, receiver);
	        if (!getApiPlan) {
	          throw new SolanaError(SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD, {
	            method: methodName,
	            params: rawParams
	          });
	        }
	        const apiPlan = getApiPlan(...rawParams);
	        return createPendingRpcRequest(rpcConfig, apiPlan);
	      };
	    }
	  });
	}
	function createPendingRpcRequest({ transport }, plan) {
	  return {
	    async send(options) {
	      return await plan.execute({ signal: options?.abortSignal, transport });
	    }
	  };
	}
	function createJsonRpcApi(config) {
	  return new Proxy({}, {
	    defineProperty() {
	      return false;
	    },
	    deleteProperty() {
	      return false;
	    },
	    get(...args) {
	      const [_, p] = args;
	      const methodName = p.toString();
	      return function(...rawParams) {
	        const rawRequest = Object.freeze({ methodName, params: rawParams });
	        const request = config?.requestTransformer ? config?.requestTransformer(rawRequest) : rawRequest;
	        return Object.freeze({
	          execute: async ({ signal, transport }) => {
	            const payload = createRpcMessage(request);
	            const response = await transport({ payload, signal });
	            if (!config?.responseTransformer) {
	              return response;
	            }
	            return config.responseTransformer(response, request);
	          }
	        });
	      };
	    }
	  });
	}

	// src/pipe.ts
	function pipe(init, ...fns) {
	  return fns.reduce((acc, fn) => fn(acc), init);
	}

	// src/request-transformer.ts

	// src/request-transformer-bigint-downcast-internal.ts
	function downcastNodeToNumberIfBigint(value) {
	  return typeof value === "bigint" ? (
	    // FIXME(solana-labs/solana/issues/30341) Create a data type to represent u64 in the Solana
	    // JSON RPC implementation so that we can throw away this entire patcher instead of unsafely
	    // downcasting `bigints` to `numbers`.
	    Number(value)
	  ) : value;
	}

	// src/tree-traversal.ts
	var KEYPATH_WILDCARD = {};
	function getTreeWalker(visitors) {
	  return function traverse(node, state) {
	    if (Array.isArray(node)) {
	      return node.map((element, ii) => {
	        const nextState = {
	          ...state,
	          keyPath: [...state.keyPath, ii]
	        };
	        return traverse(element, nextState);
	      });
	    } else if (typeof node === "object" && node !== null) {
	      const out = {};
	      for (const propName in node) {
	        if (!Object.prototype.hasOwnProperty.call(node, propName)) {
	          continue;
	        }
	        const nextState = {
	          ...state,
	          keyPath: [...state.keyPath, propName]
	        };
	        out[propName] = traverse(node[propName], nextState);
	      }
	      return out;
	    } else {
	      return visitors.reduce((acc, visitNode) => visitNode(acc, state), node);
	    }
	  };
	}
	function getTreeWalkerRequestTransformer(visitors, initialState) {
	  return (request) => {
	    const traverse = getTreeWalker(visitors);
	    return Object.freeze({
	      ...request,
	      params: traverse(request.params, initialState)
	    });
	  };
	}
	function getTreeWalkerResponseTransformer(visitors, initialState) {
	  return (json) => getTreeWalker(visitors)(json, initialState);
	}

	// src/request-transformer-bigint-downcast.ts
	function getBigIntDowncastRequestTransformer() {
	  return getTreeWalkerRequestTransformer([downcastNodeToNumberIfBigint], { keyPath: [] });
	}

	// src/request-transformer-default-commitment-internal.ts
	function applyDefaultCommitment({
	  commitmentPropertyName,
	  params,
	  optionsObjectPositionInParams,
	  overrideCommitment
	}) {
	  const paramInTargetPosition = params[optionsObjectPositionInParams];
	  if (
	    // There's no config.
	    paramInTargetPosition === void 0 || // There is a config object.
	    paramInTargetPosition && typeof paramInTargetPosition === "object" && !Array.isArray(paramInTargetPosition)
	  ) {
	    if (
	      // The config object already has a commitment set.
	      paramInTargetPosition && commitmentPropertyName in paramInTargetPosition
	    ) {
	      if (!paramInTargetPosition[commitmentPropertyName] || paramInTargetPosition[commitmentPropertyName] === "finalized") {
	        const nextParams = [...params];
	        const {
	          [commitmentPropertyName]: _,
	          // eslint-disable-line @typescript-eslint/no-unused-vars
	          ...rest
	        } = paramInTargetPosition;
	        if (Object.keys(rest).length > 0) {
	          nextParams[optionsObjectPositionInParams] = rest;
	        } else {
	          if (optionsObjectPositionInParams === nextParams.length - 1) {
	            nextParams.length--;
	          } else {
	            nextParams[optionsObjectPositionInParams] = void 0;
	          }
	        }
	        return nextParams;
	      }
	    } else if (overrideCommitment !== "finalized") {
	      const nextParams = [...params];
	      nextParams[optionsObjectPositionInParams] = {
	        ...paramInTargetPosition,
	        [commitmentPropertyName]: overrideCommitment
	      };
	      return nextParams;
	    }
	  }
	  return params;
	}

	// src/request-transformer-default-commitment.ts
	function getDefaultCommitmentRequestTransformer({
	  defaultCommitment,
	  optionsObjectPositionByMethod
	}) {
	  return (request) => {
	    const { params, methodName } = request;
	    if (!Array.isArray(params)) {
	      return request;
	    }
	    const optionsObjectPositionInParams = optionsObjectPositionByMethod[methodName];
	    if (optionsObjectPositionInParams == null) {
	      return request;
	    }
	    return Object.freeze({
	      methodName,
	      params: applyDefaultCommitment({
	        commitmentPropertyName: methodName === "sendTransaction" ? "preflightCommitment" : "commitment",
	        optionsObjectPositionInParams,
	        overrideCommitment: defaultCommitment,
	        params
	      })
	    });
	  };
	}

	// src/request-transformer-integer-overflow-internal.ts
	function getIntegerOverflowNodeVisitor(onIntegerOverflow) {
	  return (value, { keyPath }) => {
	    if (typeof value === "bigint") {
	      if (onIntegerOverflow && (value > Number.MAX_SAFE_INTEGER || value < -Number.MAX_SAFE_INTEGER)) {
	        onIntegerOverflow(keyPath, value);
	      }
	    }
	    return value;
	  };
	}

	// src/request-transformer-integer-overflow.ts
	function getIntegerOverflowRequestTransformer(onIntegerOverflow) {
	  return (request) => {
	    const transformer = getTreeWalkerRequestTransformer(
	      [getIntegerOverflowNodeVisitor((...args) => onIntegerOverflow(request, ...args))],
	      { keyPath: [] }
	    );
	    return transformer(request);
	  };
	}

	// src/request-transformer-options-object-position-config.ts
	var OPTIONS_OBJECT_POSITION_BY_METHOD = {
	  accountNotifications: 1,
	  blockNotifications: 1,
	  getAccountInfo: 1,
	  getBalance: 1,
	  getBlock: 1,
	  getBlockHeight: 0,
	  getBlockProduction: 0,
	  getBlocks: 2,
	  getBlocksWithLimit: 2,
	  getEpochInfo: 0,
	  getFeeForMessage: 1,
	  getInflationGovernor: 0,
	  getInflationReward: 1,
	  getLargestAccounts: 0,
	  getLatestBlockhash: 0,
	  getLeaderSchedule: 1,
	  getMinimumBalanceForRentExemption: 1,
	  getMultipleAccounts: 1,
	  getProgramAccounts: 1,
	  getSignaturesForAddress: 1,
	  getSlot: 0,
	  getSlotLeader: 0,
	  getStakeMinimumDelegation: 0,
	  getSupply: 0,
	  getTokenAccountBalance: 1,
	  getTokenAccountsByDelegate: 2,
	  getTokenAccountsByOwner: 2,
	  getTokenLargestAccounts: 1,
	  getTokenSupply: 1,
	  getTransaction: 1,
	  getTransactionCount: 0,
	  getVoteAccounts: 0,
	  isBlockhashValid: 1,
	  logsNotifications: 1,
	  programNotifications: 1,
	  requestAirdrop: 2,
	  sendTransaction: 1,
	  signatureNotifications: 1,
	  simulateTransaction: 1
	};

	// src/request-transformer.ts
	function getDefaultRequestTransformerForSolanaRpc(config) {
	  const handleIntegerOverflow = config?.onIntegerOverflow;
	  return (request) => {
	    return pipe(
	      request,
	      handleIntegerOverflow ? getIntegerOverflowRequestTransformer(handleIntegerOverflow) : (r) => r,
	      getBigIntDowncastRequestTransformer(),
	      getDefaultCommitmentRequestTransformer({
	        defaultCommitment: config?.defaultCommitment,
	        optionsObjectPositionByMethod: OPTIONS_OBJECT_POSITION_BY_METHOD
	      })
	    );
	  };
	}

	// src/response-transformer-bigint-upcast-internal.ts
	function getBigIntUpcastVisitor(allowedNumericKeyPaths) {
	  return function upcastNodeToBigIntIfNumber(value, { keyPath }) {
	    const isInteger = typeof value === "number" && Number.isInteger(value) || typeof value === "bigint";
	    if (!isInteger) return value;
	    if (keyPathIsAllowedToBeNumeric(keyPath, allowedNumericKeyPaths)) {
	      return Number(value);
	    } else {
	      return BigInt(value);
	    }
	  };
	}
	function keyPathIsAllowedToBeNumeric(keyPath, allowedNumericKeyPaths) {
	  return allowedNumericKeyPaths.some((prohibitedKeyPath) => {
	    if (prohibitedKeyPath.length !== keyPath.length) {
	      return false;
	    }
	    for (let ii = keyPath.length - 1; ii >= 0; ii--) {
	      const keyPathPart = keyPath[ii];
	      const prohibitedKeyPathPart = prohibitedKeyPath[ii];
	      if (prohibitedKeyPathPart !== keyPathPart && (prohibitedKeyPathPart !== KEYPATH_WILDCARD || typeof keyPathPart !== "number")) {
	        return false;
	      }
	    }
	    return true;
	  });
	}

	// src/response-transformer-bigint-upcast.ts
	function getBigIntUpcastResponseTransformer(allowedNumericKeyPaths) {
	  return getTreeWalkerResponseTransformer([getBigIntUpcastVisitor(allowedNumericKeyPaths)], { keyPath: [] });
	}

	// src/response-transformer-result.ts
	function getResultResponseTransformer() {
	  return (json) => json.result;
	}

	// src/response-transformer-allowed-numeric-values.ts
	var jsonParsedTokenAccountsConfigs = [
	  // parsed Token/Token22 token account
	  ["data", "parsed", "info", "tokenAmount", "decimals"],
	  ["data", "parsed", "info", "tokenAmount", "uiAmount"],
	  ["data", "parsed", "info", "rentExemptReserve", "decimals"],
	  ["data", "parsed", "info", "rentExemptReserve", "uiAmount"],
	  ["data", "parsed", "info", "delegatedAmount", "decimals"],
	  ["data", "parsed", "info", "delegatedAmount", "uiAmount"],
	  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "olderTransferFee", "transferFeeBasisPoints"],
	  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "newerTransferFee", "transferFeeBasisPoints"],
	  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "preUpdateAverageRate"],
	  ["data", "parsed", "info", "extensions", KEYPATH_WILDCARD, "state", "currentRate"]
	];
	var jsonParsedAccountsConfigs = [
	  ...jsonParsedTokenAccountsConfigs,
	  // parsed AddressTableLookup account
	  ["data", "parsed", "info", "lastExtendedSlotStartIndex"],
	  // parsed Config account
	  ["data", "parsed", "info", "slashPenalty"],
	  ["data", "parsed", "info", "warmupCooldownRate"],
	  // parsed Token/Token22 mint account
	  ["data", "parsed", "info", "decimals"],
	  // parsed Token/Token22 multisig account
	  ["data", "parsed", "info", "numRequiredSigners"],
	  ["data", "parsed", "info", "numValidSigners"],
	  // parsed Stake account
	  ["data", "parsed", "info", "stake", "delegation", "warmupCooldownRate"],
	  // parsed Sysvar rent account
	  ["data", "parsed", "info", "exemptionThreshold"],
	  ["data", "parsed", "info", "burnPercent"],
	  // parsed Vote account
	  ["data", "parsed", "info", "commission"],
	  ["data", "parsed", "info", "votes", KEYPATH_WILDCARD, "confirmationCount"]
	];
	var innerInstructionsConfigs = [
	  ["index"],
	  ["instructions", KEYPATH_WILDCARD, "accounts", KEYPATH_WILDCARD],
	  ["instructions", KEYPATH_WILDCARD, "programIdIndex"],
	  ["instructions", KEYPATH_WILDCARD, "stackHeight"]
	];
	var messageConfig = [
	  ["addressTableLookups", KEYPATH_WILDCARD, "writableIndexes", KEYPATH_WILDCARD],
	  ["addressTableLookups", KEYPATH_WILDCARD, "readonlyIndexes", KEYPATH_WILDCARD],
	  ["header", "numReadonlySignedAccounts"],
	  ["header", "numReadonlyUnsignedAccounts"],
	  ["header", "numRequiredSignatures"],
	  ["instructions", KEYPATH_WILDCARD, "accounts", KEYPATH_WILDCARD],
	  ["instructions", KEYPATH_WILDCARD, "programIdIndex"],
	  ["instructions", KEYPATH_WILDCARD, "stackHeight"]
	];

	// src/response-transformer-throw-solana-error.ts
	function getSimulateTransactionAllowedNumericKeypaths() {
	  return [
	    ["loadedAccountsDataSize"],
	    ...jsonParsedAccountsConfigs.map((c) => ["accounts", KEYPATH_WILDCARD, ...c]),
	    ...innerInstructionsConfigs.map((c) => ["innerInstructions", KEYPATH_WILDCARD, ...c])
	  ];
	}
	function getThrowSolanaErrorResponseTransformer() {
	  return (json, request) => {
	    const jsonRpcResponse = json;
	    if ("error" in jsonRpcResponse) {
	      const { error } = jsonRpcResponse;
	      const isSendTransactionPreflightFailure = error && typeof error === "object" && "code" in error && (error.code === -32002 || error.code === -32002n);
	      if (isSendTransactionPreflightFailure && "data" in error && error.data) {
	        const treeWalker = getTreeWalkerResponseTransformer(
	          [getBigIntUpcastVisitor(getSimulateTransactionAllowedNumericKeypaths())],
	          { keyPath: [] }
	        );
	        const transformedData = treeWalker(error.data, request);
	        const transformedError = { ...error, data: transformedData };
	        throw getSolanaErrorFromJsonRpcError(transformedError);
	      }
	      throw getSolanaErrorFromJsonRpcError(jsonRpcResponse.error);
	    }
	    return jsonRpcResponse;
	  };
	}

	// src/response-transformer.ts
	function getDefaultResponseTransformerForSolanaRpc(config) {
	  return (response, request) => {
	    const methodName = request.methodName;
	    const keyPaths = config?.allowedNumericKeyPaths && methodName ? config.allowedNumericKeyPaths[methodName] : void 0;
	    return pipe(
	      response,
	      (r) => getThrowSolanaErrorResponseTransformer()(r, request),
	      (r) => getResultResponseTransformer()(r, request),
	      (r) => getBigIntUpcastResponseTransformer(keyPaths ?? [])(r, request)
	    );
	  };
	}

	// src/index.ts
	function createSolanaRpcApi(config) {
	  return createJsonRpcApi({
	    requestTransformer: getDefaultRequestTransformerForSolanaRpc(config),
	    responseTransformer: getDefaultResponseTransformerForSolanaRpc({
	      allowedNumericKeyPaths: getAllowedNumericKeypaths()
	    })
	  });
	}
	var memoizedKeypaths;
	function getAllowedNumericKeypaths() {
	  if (!memoizedKeypaths) {
	    memoizedKeypaths = {
	      getAccountInfo: jsonParsedAccountsConfigs.map((c) => ["value", ...c]),
	      getBlock: [
	        ["transactions", KEYPATH_WILDCARD, "meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
	        [
	          "transactions",
	          KEYPATH_WILDCARD,
	          "meta",
	          "preTokenBalances",
	          KEYPATH_WILDCARD,
	          "uiTokenAmount",
	          "decimals"
	        ],
	        ["transactions", KEYPATH_WILDCARD, "meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
	        [
	          "transactions",
	          KEYPATH_WILDCARD,
	          "meta",
	          "postTokenBalances",
	          KEYPATH_WILDCARD,
	          "uiTokenAmount",
	          "decimals"
	        ],
	        ["transactions", KEYPATH_WILDCARD, "meta", "rewards", KEYPATH_WILDCARD, "commission"],
	        ...innerInstructionsConfigs.map((c) => [
	          "transactions",
	          KEYPATH_WILDCARD,
	          "meta",
	          "innerInstructions",
	          KEYPATH_WILDCARD,
	          ...c
	        ]),
	        ...messageConfig.map((c) => ["transactions", KEYPATH_WILDCARD, "transaction", "message", ...c]),
	        ["rewards", KEYPATH_WILDCARD, "commission"]
	      ],
	      getClusterNodes: [
	        [KEYPATH_WILDCARD, "featureSet"],
	        [KEYPATH_WILDCARD, "shredVersion"]
	      ],
	      getInflationGovernor: [["initial"], ["foundation"], ["foundationTerm"], ["taper"], ["terminal"]],
	      getInflationRate: [["foundation"], ["total"], ["validator"]],
	      getInflationReward: [[KEYPATH_WILDCARD, "commission"]],
	      getMultipleAccounts: jsonParsedAccountsConfigs.map((c) => ["value", KEYPATH_WILDCARD, ...c]),
	      getProgramAccounts: jsonParsedAccountsConfigs.flatMap((c) => [
	        ["value", KEYPATH_WILDCARD, "account", ...c],
	        [KEYPATH_WILDCARD, "account", ...c]
	      ]),
	      getRecentPerformanceSamples: [[KEYPATH_WILDCARD, "samplePeriodSecs"]],
	      getTokenAccountBalance: [
	        ["value", "decimals"],
	        ["value", "uiAmount"]
	      ],
	      getTokenAccountsByDelegate: jsonParsedTokenAccountsConfigs.map((c) => [
	        "value",
	        KEYPATH_WILDCARD,
	        "account",
	        ...c
	      ]),
	      getTokenAccountsByOwner: jsonParsedTokenAccountsConfigs.map((c) => [
	        "value",
	        KEYPATH_WILDCARD,
	        "account",
	        ...c
	      ]),
	      getTokenLargestAccounts: [
	        ["value", KEYPATH_WILDCARD, "decimals"],
	        ["value", KEYPATH_WILDCARD, "uiAmount"]
	      ],
	      getTokenSupply: [
	        ["value", "decimals"],
	        ["value", "uiAmount"]
	      ],
	      getTransaction: [
	        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
	        ["meta", "preTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
	        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "accountIndex"],
	        ["meta", "postTokenBalances", KEYPATH_WILDCARD, "uiTokenAmount", "decimals"],
	        ["meta", "rewards", KEYPATH_WILDCARD, "commission"],
	        ...innerInstructionsConfigs.map((c) => ["meta", "innerInstructions", KEYPATH_WILDCARD, ...c]),
	        ...messageConfig.map((c) => ["transaction", "message", ...c])
	      ],
	      getVersion: [["feature-set"]],
	      getVoteAccounts: [
	        ["current", KEYPATH_WILDCARD, "commission"],
	        ["delinquent", KEYPATH_WILDCARD, "commission"]
	      ],
	      simulateTransaction: [
	        ["value", "loadedAccountsDataSize"],
	        ...jsonParsedAccountsConfigs.map((c) => ["value", "accounts", KEYPATH_WILDCARD, ...c]),
	        ...innerInstructionsConfigs.map((c) => ["value", "innerInstructions", KEYPATH_WILDCARD, ...c])
	      ]
	    };
	  }
	  return memoizedKeypaths;
	}

	var maxU64Value = 18446744073709551615n;
	function assertIsLamports(putativeLamports) {
	  if (putativeLamports < 0 || putativeLamports > maxU64Value) {
	    throw new SolanaError(SOLANA_ERROR__LAMPORTS_OUT_OF_RANGE);
	  }
	}
	function lamports(putativeLamports) {
	  assertIsLamports(putativeLamports);
	  return putativeLamports;
	}

	var fastStableStringify$1;
	var hasRequiredFastStableStringify;

	function requireFastStableStringify () {
		if (hasRequiredFastStableStringify) return fastStableStringify$1;
		hasRequiredFastStableStringify = 1;
		var objToString = Object.prototype.toString;
		var objKeys = Object.keys || function(obj) {
				var keys = [];
				for (var name in obj) {
					keys.push(name);
				}
				return keys;
			};

		function stringify(val, isArrayProp) {
			var i, max, str, keys, key, propVal, toStr;
			if (val === true) {
				return "true";
			}
			if (val === false) {
				return "false";
			}
			switch (typeof val) {
				case "object":
					if (val === null) {
						return null;
					} else if (val.toJSON && typeof val.toJSON === "function") {
						return stringify(val.toJSON(), isArrayProp);
					} else {
						toStr = objToString.call(val);
						if (toStr === "[object Array]") {
							str = '[';
							max = val.length - 1;
							for(i = 0; i < max; i++) {
								str += stringify(val[i], true) + ',';
							}
							if (max > -1) {
								str += stringify(val[i], true);
							}
							return str + ']';
						} else if (toStr === "[object Object]") {
							// only object is left
							keys = objKeys(val).sort();
							max = keys.length;
							str = "";
							i = 0;
							while (i < max) {
								key = keys[i];
								propVal = stringify(val[key], false);
								if (propVal !== undefined) {
									if (str) {
										str += ',';
									}
									str += JSON.stringify(key) + ':' + propVal;
								}
								i++;
							}
							return '{' + str + '}';
						} else {
							return JSON.stringify(val);
						}
					}
				case "function":
				case "undefined":
					return isArrayProp ? null : undefined;
				case "string":
					return JSON.stringify(val);
				default:
					return isFinite(val) ? val : null;
			}
		}

		fastStableStringify$1 = function(val) {
			var returnVal = stringify(val, false);
			if (returnVal !== undefined) {
				return ''+ returnVal;
			}
		};
		return fastStableStringify$1;
	}

	var fastStableStringifyExports = /*@__PURE__*/ requireFastStableStringify();
	var fastStableStringify = /*@__PURE__*/getDefaultExportFromCjs(fastStableStringifyExports);

	/**
	 * A `StructFailure` represents a single specific failure in validation.
	 */
	/**
	 * `StructError` objects are thrown (or returned) when validation fails.
	 *
	 * Validation logic is design to exit early for maximum performance. The error
	 * represents the first error encountered during validation. For more detail,
	 * the `error.failures` property is a generator function that can be run to
	 * continue validation and receive all the failures in the data.
	 */
	class StructError extends TypeError {
	    constructor(failure, failures) {
	        let cached;
	        const { message, explanation, ...rest } = failure;
	        const { path } = failure;
	        const msg = path.length === 0 ? message : `At path: ${path.join('.')} -- ${message}`;
	        super(explanation ?? msg);
	        if (explanation != null)
	            this.cause = msg;
	        Object.assign(this, rest);
	        this.name = this.constructor.name;
	        this.failures = () => {
	            return (cached ?? (cached = [failure, ...failures()]));
	        };
	    }
	}

	/**
	 * Check if a value is an iterator.
	 */
	function isIterable(x) {
	    return isObject(x) && typeof x[Symbol.iterator] === 'function';
	}
	/**
	 * Check if a value is a plain object.
	 */
	function isObject(x) {
	    return typeof x === 'object' && x != null;
	}
	/**
	 * Check if a value is a non-array object.
	 */
	function isNonArrayObject(x) {
	    return isObject(x) && !Array.isArray(x);
	}
	/**
	 * Return a value as a printable string.
	 */
	function print(value) {
	    if (typeof value === 'symbol') {
	        return value.toString();
	    }
	    return typeof value === 'string' ? JSON.stringify(value) : `${value}`;
	}
	/**
	 * Shifts (removes and returns) the first value from the `input` iterator.
	 * Like `Array.prototype.shift()` but for an `Iterator`.
	 */
	function shiftIterator(input) {
	    const { done, value } = input.next();
	    return done ? undefined : value;
	}
	/**
	 * Convert a single validation result to a failure.
	 */
	function toFailure(result, context, struct, value) {
	    if (result === true) {
	        return;
	    }
	    else if (result === false) {
	        result = {};
	    }
	    else if (typeof result === 'string') {
	        result = { message: result };
	    }
	    const { path, branch } = context;
	    const { type } = struct;
	    const { refinement, message = `Expected a value of type \`${type}\`${refinement ? ` with refinement \`${refinement}\`` : ''}, but received: \`${print(value)}\``, } = result;
	    return {
	        value,
	        type,
	        refinement,
	        key: path[path.length - 1],
	        path,
	        branch,
	        ...result,
	        message,
	    };
	}
	/**
	 * Convert a validation result to an iterable of failures.
	 */
	function* toFailures(result, context, struct, value) {
	    if (!isIterable(result)) {
	        result = [result];
	    }
	    for (const r of result) {
	        const failure = toFailure(r, context, struct, value);
	        if (failure) {
	            yield failure;
	        }
	    }
	}
	/**
	 * Check a value against a struct, traversing deeply into nested values, and
	 * returning an iterator of failures or success.
	 */
	function* run(value, struct, options = {}) {
	    const { path = [], branch = [value], coerce = false, mask = false } = options;
	    const ctx = { path, branch, mask };
	    if (coerce) {
	        value = struct.coercer(value, ctx);
	    }
	    let status = 'valid';
	    for (const failure of struct.validator(value, ctx)) {
	        failure.explanation = options.message;
	        status = 'not_valid';
	        yield [failure, undefined];
	    }
	    for (let [k, v, s] of struct.entries(value, ctx)) {
	        const ts = run(v, s, {
	            path: k === undefined ? path : [...path, k],
	            branch: k === undefined ? branch : [...branch, v],
	            coerce,
	            mask,
	            message: options.message,
	        });
	        for (const t of ts) {
	            if (t[0]) {
	                status = t[0].refinement != null ? 'not_refined' : 'not_valid';
	                yield [t[0], undefined];
	            }
	            else if (coerce) {
	                v = t[1];
	                if (k === undefined) {
	                    value = v;
	                }
	                else if (value instanceof Map) {
	                    value.set(k, v);
	                }
	                else if (value instanceof Set) {
	                    value.add(v);
	                }
	                else if (isObject(value)) {
	                    if (v !== undefined || k in value)
	                        value[k] = v;
	                }
	            }
	        }
	    }
	    if (status !== 'not_valid') {
	        for (const failure of struct.refiner(value, ctx)) {
	            failure.explanation = options.message;
	            status = 'not_refined';
	            yield [failure, undefined];
	        }
	    }
	    if (status === 'valid') {
	        yield [undefined, value];
	    }
	}

	/**
	 * `Struct` objects encapsulate the validation logic for a specific type of
	 * values. Once constructed, you use the `assert`, `is` or `validate` helpers to
	 * validate unknown input data against the struct.
	 */
	class Struct {
	    constructor(props) {
	        const { type, schema, validator, refiner, coercer = (value) => value, entries = function* () { }, } = props;
	        this.type = type;
	        this.schema = schema;
	        this.entries = entries;
	        this.coercer = coercer;
	        if (validator) {
	            this.validator = (value, context) => {
	                const result = validator(value, context);
	                return toFailures(result, context, this, value);
	            };
	        }
	        else {
	            this.validator = () => [];
	        }
	        if (refiner) {
	            this.refiner = (value, context) => {
	                const result = refiner(value, context);
	                return toFailures(result, context, this, value);
	            };
	        }
	        else {
	            this.refiner = () => [];
	        }
	    }
	    /**
	     * Assert that a value passes the struct's validation, throwing if it doesn't.
	     */
	    assert(value, message) {
	        return assert(value, this, message);
	    }
	    /**
	     * Create a value with the struct's coercion logic, then validate it.
	     */
	    create(value, message) {
	        return create(value, this, message);
	    }
	    /**
	     * Check if a value passes the struct's validation.
	     */
	    is(value) {
	        return is(value, this);
	    }
	    /**
	     * Mask a value, coercing and validating it, but returning only the subset of
	     * properties defined by the struct's schema. Masking applies recursively to
	     * props of `object` structs only.
	     */
	    mask(value, message) {
	        return mask(value, this, message);
	    }
	    /**
	     * Validate a value with the struct's validation logic, returning a tuple
	     * representing the result.
	     *
	     * You may optionally pass `true` for the `coerce` argument to coerce
	     * the value before attempting to validate it. If you do, the result will
	     * contain the coerced result when successful. Also, `mask` will turn on
	     * masking of the unknown `object` props recursively if passed.
	     */
	    validate(value, options = {}) {
	        return validate(value, this, options);
	    }
	}
	/**
	 * Assert that a value passes a struct, throwing if it doesn't.
	 */
	function assert(value, struct, message) {
	    const result = validate(value, struct, { message });
	    if (result[0]) {
	        throw result[0];
	    }
	}
	/**
	 * Create a value with the coercion logic of struct and validate it.
	 */
	function create(value, struct, message) {
	    const result = validate(value, struct, { coerce: true, message });
	    if (result[0]) {
	        throw result[0];
	    }
	    else {
	        return result[1];
	    }
	}
	/**
	 * Mask a value, returning only the subset of properties defined by a struct.
	 */
	function mask(value, struct, message) {
	    const result = validate(value, struct, { coerce: true, mask: true, message });
	    if (result[0]) {
	        throw result[0];
	    }
	    else {
	        return result[1];
	    }
	}
	/**
	 * Check if a value passes a struct.
	 */
	function is(value, struct) {
	    const result = validate(value, struct);
	    return !result[0];
	}
	/**
	 * Validate a value against a struct, returning an error if invalid, or the
	 * value (with potential coercion) if valid.
	 */
	function validate(value, struct, options = {}) {
	    const tuples = run(value, struct, options);
	    const tuple = shiftIterator(tuples);
	    if (tuple[0]) {
	        const error = new StructError(tuple[0], function* () {
	            for (const t of tuples) {
	                if (t[0]) {
	                    yield t[0];
	                }
	            }
	        });
	        return [error, undefined];
	    }
	    else {
	        const v = tuple[1];
	        return [undefined, v];
	    }
	}
	/**
	 * Define a new struct type with a custom validation function.
	 */
	function define(name, validator) {
	    return new Struct({ type: name, schema: null, validator });
	}

	/**
	 * Ensure that any value passes validation.
	 */
	function any() {
	    return define('any', () => true);
	}
	function array(Element) {
	    return new Struct({
	        type: 'array',
	        schema: Element,
	        *entries(value) {
	            if (Element && Array.isArray(value)) {
	                for (const [i, v] of value.entries()) {
	                    yield [i, v, Element];
	                }
	            }
	        },
	        coercer(value) {
	            return Array.isArray(value) ? value.slice() : value;
	        },
	        validator(value) {
	            return (Array.isArray(value) ||
	                `Expected an array value, but received: ${print(value)}`);
	        },
	    });
	}
	/**
	 * Ensure that a value is a boolean.
	 */
	function boolean() {
	    return define('boolean', (value) => {
	        return typeof value === 'boolean';
	    });
	}
	/**
	 * Ensure that a value is an instance of a specific class.
	 */
	function instance(Class) {
	    return define('instance', (value) => {
	        return (value instanceof Class ||
	            `Expected a \`${Class.name}\` instance, but received: ${print(value)}`);
	    });
	}
	function literal(constant) {
	    const description = print(constant);
	    const t = typeof constant;
	    return new Struct({
	        type: 'literal',
	        schema: t === 'string' || t === 'number' || t === 'boolean' ? constant : null,
	        validator(value) {
	            return (value === constant ||
	                `Expected the literal \`${description}\`, but received: ${print(value)}`);
	        },
	    });
	}
	/**
	 * Ensure that no value ever passes validation.
	 */
	function never() {
	    return define('never', () => false);
	}
	/**
	 * Augment an existing struct to allow `null` values.
	 */
	function nullable(struct) {
	    return new Struct({
	        ...struct,
	        validator: (value, ctx) => value === null || struct.validator(value, ctx),
	        refiner: (value, ctx) => value === null || struct.refiner(value, ctx),
	    });
	}
	/**
	 * Ensure that a value is a number.
	 */
	function number() {
	    return define('number', (value) => {
	        return ((typeof value === 'number' && !isNaN(value)) ||
	            `Expected a number, but received: ${print(value)}`);
	    });
	}
	/**
	 * Augment a struct to allow `undefined` values.
	 */
	function optional(struct) {
	    return new Struct({
	        ...struct,
	        validator: (value, ctx) => value === undefined || struct.validator(value, ctx),
	        refiner: (value, ctx) => value === undefined || struct.refiner(value, ctx),
	    });
	}
	/**
	 * Ensure that a value is a string.
	 */
	function string() {
	    return define('string', (value) => {
	        return (typeof value === 'string' ||
	            `Expected a string, but received: ${print(value)}`);
	    });
	}
	/**
	 * Ensure that a value is a tuple of a specific length, and that each of its
	 * elements is of a specific type.
	 */
	function tuple(Structs) {
	    const Never = never();
	    return new Struct({
	        type: 'tuple',
	        schema: null,
	        *entries(value) {
	            if (Array.isArray(value)) {
	                const length = Math.max(Structs.length, value.length);
	                for (let i = 0; i < length; i++) {
	                    yield [i, value[i], Structs[i] || Never];
	                }
	            }
	        },
	        validator(value) {
	            return (Array.isArray(value) ||
	                `Expected an array, but received: ${print(value)}`);
	        },
	        coercer(value) {
	            return Array.isArray(value) ? value.slice() : value;
	        },
	    });
	}
	/**
	 * Ensure that a value has a set of known properties of specific types.
	 *
	 * Note: Unrecognized properties are allowed and untouched. This is similar to
	 * how TypeScript's structural typing works.
	 */
	function type(schema) {
	    const keys = Object.keys(schema);
	    return new Struct({
	        type: 'type',
	        schema,
	        *entries(value) {
	            if (isObject(value)) {
	                for (const k of keys) {
	                    yield [k, value[k], schema[k]];
	                }
	            }
	        },
	        validator(value) {
	            return (isNonArrayObject(value) ||
	                `Expected an object, but received: ${print(value)}`);
	        },
	        coercer(value) {
	            return isNonArrayObject(value) ? { ...value } : value;
	        },
	    });
	}
	/**
	 * Ensure that a value matches one of a set of types.
	 */
	function union(Structs) {
	    const description = Structs.map((s) => s.type).join(' | ');
	    return new Struct({
	        type: 'union',
	        schema: null,
	        coercer(value, ctx) {
	            for (const S of Structs) {
	                const [error, coerced] = S.validate(value, {
	                    coerce: true,
	                    mask: ctx.mask,
	                });
	                if (!error) {
	                    return coerced;
	                }
	            }
	            return value;
	        },
	        validator(value, ctx) {
	            const failures = [];
	            for (const S of Structs) {
	                const [...tuples] = run(value, S, ctx);
	                const [first] = tuples;
	                if (!first[0]) {
	                    return [];
	                }
	                else {
	                    for (const [failure] of tuples) {
	                        if (failure) {
	                            failures.push(failure);
	                        }
	                    }
	                }
	            }
	            return [
	                `Expected the value to satisfy a union of \`${description}\`, but received: ${print(value)}`,
	                ...failures,
	            ];
	        },
	    });
	}
	/**
	 * Ensure that any value passes validation, without widening its type to `any`.
	 */
	function unknown() {
	    return define('unknown', () => true);
	}

	/**
	 * Augment a `Struct` to add an additional coercion step to its input.
	 *
	 * This allows you to transform input data before validating it, to increase the
	 * likelihood that it passes validation—for example for default values, parsing
	 * different formats, etc.
	 *
	 * Note: You must use `create(value, Struct)` on the value to have the coercion
	 * take effect! Using simply `assert()` or `is()` will not use coercion.
	 */
	function coerce(struct, condition, coercer) {
	    return new Struct({
	        ...struct,
	        coercer: (value, ctx) => {
	            return is(value, condition)
	                ? struct.coercer(coercer(value, ctx), ctx)
	                : struct.coercer(value, ctx);
	        },
	    });
	}

	// src/index.ts
	function createSolanaJsonRpcIntegerOverflowError(methodName, keyPath, value) {
	  let argumentLabel = "";
	  if (typeof keyPath[0] === "number") {
	    const argPosition = keyPath[0] + 1;
	    const lastDigit = argPosition % 10;
	    const lastTwoDigits = argPosition % 100;
	    if (lastDigit == 1 && lastTwoDigits != 11) {
	      argumentLabel = argPosition + "st";
	    } else if (lastDigit == 2 && lastTwoDigits != 12) {
	      argumentLabel = argPosition + "nd";
	    } else if (lastDigit == 3 && lastTwoDigits != 13) {
	      argumentLabel = argPosition + "rd";
	    } else {
	      argumentLabel = argPosition + "th";
	    }
	  } else {
	    argumentLabel = `\`${keyPath[0].toString()}\``;
	  }
	  const path = keyPath.length > 1 ? keyPath.slice(1).map((pathPart) => typeof pathPart === "number" ? `[${pathPart}]` : pathPart).join(".") : void 0;
	  const error = new SolanaError(SOLANA_ERROR__RPC__INTEGER_OVERFLOW, {
	    argumentLabel,
	    keyPath,
	    methodName,
	    optionalPathLabel: path ? ` at path \`${path}\`` : "",
	    value,
	    ...path !== void 0 ? { path } : void 0
	  });
	  safeCaptureStackTrace(error, createSolanaJsonRpcIntegerOverflowError);
	  return error;
	}

	// src/rpc-default-config.ts
	var DEFAULT_RPC_CONFIG = {
	  defaultCommitment: "confirmed",
	  onIntegerOverflow(request, keyPath, value) {
	    throw createSolanaJsonRpcIntegerOverflowError(request.methodName, keyPath, value);
	  }
	};

	const MINIMUM_SLOT_PER_EPOCH = 32n;

	// Returns the number of trailing zeros in the binary representation of self.
	function trailingZeros(n) {
	  let trailingZeros = 0n;
	  while (n > 1n) {
	    n /= 2n;
	    trailingZeros++;
	  }
	  return trailingZeros;
	}

	// Returns the smallest power of two greater than or equal to n.
	function nextPowerOfTwo(n) {
	  if (n === 0n) return 1n;
	  n--;
	  n |= n >> 1n;
	  n |= n >> 2n;
	  n |= n >> 4n;
	  n |= n >> 8n;
	  n |= n >> 16n;
	  n |= n >> 32n;
	  return n + 1n;
	}

	/**
	 * Epoch schedule
	 * (see https://docs.solana.com/terminology#epoch)
	 * Can be retrieved with the {@link Connection.getEpochSchedule} method
	 */
	class EpochSchedule {
	  constructor(slotsPerEpoch, leaderScheduleSlotOffset, warmup, firstNormalEpoch, firstNormalSlot) {
	    /** The maximum number of slots in each epoch */
	    this.slotsPerEpoch = void 0;
	    /** The number of slots before beginning of an epoch to calculate a leader schedule for that epoch */
	    this.leaderScheduleSlotOffset = void 0;
	    /** Indicates whether epochs start short and grow */
	    this.warmup = void 0;
	    /** The first epoch with `slotsPerEpoch` slots */
	    this.firstNormalEpoch = void 0;
	    /** The first slot of `firstNormalEpoch` */
	    this.firstNormalSlot = void 0;
	    this.slotsPerEpoch = slotsPerEpoch;
	    this.leaderScheduleSlotOffset = leaderScheduleSlotOffset;
	    this.warmup = warmup;
	    this.firstNormalEpoch = firstNormalEpoch;
	    this.firstNormalSlot = firstNormalSlot;
	  }
	  getEpoch(slot) {
	    return this.getEpochAndSlotIndex(slot)[0];
	  }
	  getEpochAndSlotIndex(slot) {
	    if (slot < this.firstNormalSlot) {
	      const epoch = trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOT_PER_EPOCH + 1n)) - trailingZeros(MINIMUM_SLOT_PER_EPOCH) - 1n;
	      const epochLen = this.getSlotsInEpoch(epoch);
	      const slotIndex = slot - (epochLen - MINIMUM_SLOT_PER_EPOCH);
	      return [epoch, slotIndex];
	    } else {
	      const normalSlotIndex = slot - this.firstNormalSlot;
	      const normalEpochIndex = normalSlotIndex / this.slotsPerEpoch;
	      const epoch = this.firstNormalEpoch + normalEpochIndex;
	      const slotIndex = normalSlotIndex % this.slotsPerEpoch;
	      return [epoch, slotIndex];
	    }
	  }
	  getFirstSlotInEpoch(epoch) {
	    if (epoch <= this.firstNormalEpoch) {
	      return (2n ** epoch - 1n) * MINIMUM_SLOT_PER_EPOCH;
	    } else {
	      return (epoch - this.firstNormalEpoch) * this.slotsPerEpoch + this.firstNormalSlot;
	    }
	  }
	  getLastSlotInEpoch(epoch) {
	    return this.getFirstSlotInEpoch(epoch) + this.getSlotsInEpoch(epoch) - 1n;
	  }
	  getSlotsInEpoch(epoch) {
	    if (epoch < this.firstNormalEpoch) {
	      return 2n ** (epoch + trailingZeros(MINIMUM_SLOT_PER_EPOCH));
	    } else {
	      return this.slotsPerEpoch;
	    }
	  }
	}

	var eventemitter3 = {exports: {}};

	var hasRequiredEventemitter3;

	function requireEventemitter3 () {
		if (hasRequiredEventemitter3) return eventemitter3.exports;
		hasRequiredEventemitter3 = 1;
		(function (module) {

			var has = Object.prototype.hasOwnProperty
			  , prefix = '~';

			/**
			 * Constructor to create a storage for our `EE` objects.
			 * An `Events` instance is a plain object whose properties are event names.
			 *
			 * @constructor
			 * @private
			 */
			function Events() {}

			//
			// We try to not inherit from `Object.prototype`. In some engines creating an
			// instance in this way is faster than calling `Object.create(null)` directly.
			// If `Object.create(null)` is not supported we prefix the event names with a
			// character to make sure that the built-in object properties are not
			// overridden or used as an attack vector.
			//
			if (Object.create) {
			  Events.prototype = Object.create(null);

			  //
			  // This hack is needed because the `__proto__` property is still inherited in
			  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
			  //
			  if (!new Events().__proto__) prefix = false;
			}

			/**
			 * Representation of a single event listener.
			 *
			 * @param {Function} fn The listener function.
			 * @param {*} context The context to invoke the listener with.
			 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
			 * @constructor
			 * @private
			 */
			function EE(fn, context, once) {
			  this.fn = fn;
			  this.context = context;
			  this.once = once || false;
			}

			/**
			 * Add a listener for a given event.
			 *
			 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
			 * @param {(String|Symbol)} event The event name.
			 * @param {Function} fn The listener function.
			 * @param {*} context The context to invoke the listener with.
			 * @param {Boolean} once Specify if the listener is a one-time listener.
			 * @returns {EventEmitter}
			 * @private
			 */
			function addListener(emitter, event, fn, context, once) {
			  if (typeof fn !== 'function') {
			    throw new TypeError('The listener must be a function');
			  }

			  var listener = new EE(fn, context || emitter, once)
			    , evt = prefix ? prefix + event : event;

			  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
			  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
			  else emitter._events[evt] = [emitter._events[evt], listener];

			  return emitter;
			}

			/**
			 * Clear event by name.
			 *
			 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
			 * @param {(String|Symbol)} evt The Event name.
			 * @private
			 */
			function clearEvent(emitter, evt) {
			  if (--emitter._eventsCount === 0) emitter._events = new Events();
			  else delete emitter._events[evt];
			}

			/**
			 * Minimal `EventEmitter` interface that is molded against the Node.js
			 * `EventEmitter` interface.
			 *
			 * @constructor
			 * @public
			 */
			function EventEmitter() {
			  this._events = new Events();
			  this._eventsCount = 0;
			}

			/**
			 * Return an array listing the events for which the emitter has registered
			 * listeners.
			 *
			 * @returns {Array}
			 * @public
			 */
			EventEmitter.prototype.eventNames = function eventNames() {
			  var names = []
			    , events
			    , name;

			  if (this._eventsCount === 0) return names;

			  for (name in (events = this._events)) {
			    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
			  }

			  if (Object.getOwnPropertySymbols) {
			    return names.concat(Object.getOwnPropertySymbols(events));
			  }

			  return names;
			};

			/**
			 * Return the listeners registered for a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @returns {Array} The registered listeners.
			 * @public
			 */
			EventEmitter.prototype.listeners = function listeners(event) {
			  var evt = prefix ? prefix + event : event
			    , handlers = this._events[evt];

			  if (!handlers) return [];
			  if (handlers.fn) return [handlers.fn];

			  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
			    ee[i] = handlers[i].fn;
			  }

			  return ee;
			};

			/**
			 * Return the number of listeners listening to a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @returns {Number} The number of listeners.
			 * @public
			 */
			EventEmitter.prototype.listenerCount = function listenerCount(event) {
			  var evt = prefix ? prefix + event : event
			    , listeners = this._events[evt];

			  if (!listeners) return 0;
			  if (listeners.fn) return 1;
			  return listeners.length;
			};

			/**
			 * Calls each of the listeners registered for a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @returns {Boolean} `true` if the event had listeners, else `false`.
			 * @public
			 */
			EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
			  var evt = prefix ? prefix + event : event;

			  if (!this._events[evt]) return false;

			  var listeners = this._events[evt]
			    , len = arguments.length
			    , args
			    , i;

			  if (listeners.fn) {
			    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

			    switch (len) {
			      case 1: return listeners.fn.call(listeners.context), true;
			      case 2: return listeners.fn.call(listeners.context, a1), true;
			      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
			      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
			      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
			      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
			    }

			    for (i = 1, args = new Array(len -1); i < len; i++) {
			      args[i - 1] = arguments[i];
			    }

			    listeners.fn.apply(listeners.context, args);
			  } else {
			    var length = listeners.length
			      , j;

			    for (i = 0; i < length; i++) {
			      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

			      switch (len) {
			        case 1: listeners[i].fn.call(listeners[i].context); break;
			        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
			        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
			        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
			        default:
			          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
			            args[j - 1] = arguments[j];
			          }

			          listeners[i].fn.apply(listeners[i].context, args);
			      }
			    }
			  }

			  return true;
			};

			/**
			 * Add a listener for a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @param {Function} fn The listener function.
			 * @param {*} [context=this] The context to invoke the listener with.
			 * @returns {EventEmitter} `this`.
			 * @public
			 */
			EventEmitter.prototype.on = function on(event, fn, context) {
			  return addListener(this, event, fn, context, false);
			};

			/**
			 * Add a one-time listener for a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @param {Function} fn The listener function.
			 * @param {*} [context=this] The context to invoke the listener with.
			 * @returns {EventEmitter} `this`.
			 * @public
			 */
			EventEmitter.prototype.once = function once(event, fn, context) {
			  return addListener(this, event, fn, context, true);
			};

			/**
			 * Remove the listeners of a given event.
			 *
			 * @param {(String|Symbol)} event The event name.
			 * @param {Function} fn Only remove the listeners that match this function.
			 * @param {*} context Only remove the listeners that have this context.
			 * @param {Boolean} once Only remove one-time listeners.
			 * @returns {EventEmitter} `this`.
			 * @public
			 */
			EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
			  var evt = prefix ? prefix + event : event;

			  if (!this._events[evt]) return this;
			  if (!fn) {
			    clearEvent(this, evt);
			    return this;
			  }

			  var listeners = this._events[evt];

			  if (listeners.fn) {
			    if (
			      listeners.fn === fn &&
			      (!once || listeners.once) &&
			      (!context || listeners.context === context)
			    ) {
			      clearEvent(this, evt);
			    }
			  } else {
			    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
			      if (
			        listeners[i].fn !== fn ||
			        (once && !listeners[i].once) ||
			        (context && listeners[i].context !== context)
			      ) {
			        events.push(listeners[i]);
			      }
			    }

			    //
			    // Reset the array, or remove it completely if we have no more listeners.
			    //
			    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
			    else clearEvent(this, evt);
			  }

			  return this;
			};

			/**
			 * Remove all listeners, or those of the specified event.
			 *
			 * @param {(String|Symbol)} [event] The event name.
			 * @returns {EventEmitter} `this`.
			 * @public
			 */
			EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
			  var evt;

			  if (event) {
			    evt = prefix ? prefix + event : event;
			    if (this._events[evt]) clearEvent(this, evt);
			  } else {
			    this._events = new Events();
			    this._eventsCount = 0;
			  }

			  return this;
			};

			//
			// Alias methods names because people roll like that.
			//
			EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
			EventEmitter.prototype.addListener = EventEmitter.prototype.on;

			//
			// Expose the prefix.
			//
			EventEmitter.prefixed = prefix;

			//
			// Allow `EventEmitter` to be imported as module namespace.
			//
			EventEmitter.EventEmitter = EventEmitter;

			//
			// Expose the module.
			//
			{
			  module.exports = EventEmitter;
			} 
		} (eventemitter3));
		return eventemitter3.exports;
	}

	var eventemitter3Exports = /*@__PURE__*/ requireEventemitter3();
	var EventEmitter = /*@__PURE__*/getDefaultExportFromCjs(eventemitter3Exports);

	// node_modules/esbuild-plugin-polyfill-node/polyfills/buffer.js
	var WebSocketBrowserImpl = class extends EventEmitter {
	  socket;
	  /** Instantiate a WebSocket class
	  * @constructor
	  * @param {String} address - url to a websocket server
	  * @param {(Object)} options - websocket options
	  * @param {(String|Array)} protocols - a list of protocols
	  * @return {WebSocketBrowserImpl} - returns a WebSocket instance
	  */
	  constructor(address, options, protocols) {
	    super();
	    this.socket = new window.WebSocket(address, protocols);
	    this.socket.onopen = () => this.emit("open");
	    this.socket.onmessage = (event) => this.emit("message", event.data);
	    this.socket.onerror = (error) => this.emit("error", error);
	    this.socket.onclose = (event) => {
	      this.emit("close", event.code, event.reason);
	    };
	  }
	  /**
	  * Sends data through a websocket connection
	  * @method
	  * @param {(String|Object)} data - data to be sent via websocket
	  * @param {Object} optionsOrCallback - ws options
	  * @param {Function} callback - a callback called once the data is sent
	  * @return {Undefined}
	  */
	  send(data, optionsOrCallback, callback) {
	    const cb = callback || optionsOrCallback;
	    try {
	      this.socket.send(data);
	      cb();
	    } catch (error) {
	      cb(error);
	    }
	  }
	  /**
	  * Closes an underlying socket
	  * @method
	  * @param {Number} code - status code explaining why the connection is being closed
	  * @param {String} reason - a description why the connection is closing
	  * @return {Undefined}
	  * @throws {Error}
	  */
	  close(code, reason) {
	    this.socket.close(code, reason);
	  }
	  addEventListener(type, listener, options) {
	    this.socket.addEventListener(type, listener, options);
	  }
	};
	function WebSocket(address, options) {
	  return new WebSocketBrowserImpl(address, options);
	}

	// src/lib/utils.ts
	var DefaultDataPack = class {
	  encode(value) {
	    return JSON.stringify(value);
	  }
	  decode(value) {
	    return JSON.parse(value);
	  }
	};

	// src/lib/client.ts
	var CommonClient = class extends EventEmitter {
	  address;
	  rpc_id;
	  queue;
	  options;
	  autoconnect;
	  ready;
	  reconnect;
	  reconnect_timer_id;
	  reconnect_interval;
	  max_reconnects;
	  rest_options;
	  current_reconnects;
	  generate_request_id;
	  socket;
	  webSocketFactory;
	  dataPack;
	  /**
	  * Instantiate a Client class.
	  * @constructor
	  * @param {webSocketFactory} webSocketFactory - factory method for WebSocket
	  * @param {String} address - url to a websocket server
	  * @param {Object} options - ws options object with reconnect parameters
	  * @param {Function} generate_request_id - custom generation request Id
	  * @param {DataPack} dataPack - data pack contains encoder and decoder
	  * @return {CommonClient}
	  */
	  constructor(webSocketFactory, address = "ws://localhost:8080", {
	    autoconnect = true,
	    reconnect = true,
	    reconnect_interval = 1e3,
	    max_reconnects = 5,
	    ...rest_options
	  } = {}, generate_request_id, dataPack) {
	    super();
	    this.webSocketFactory = webSocketFactory;
	    this.queue = {};
	    this.rpc_id = 0;
	    this.address = address;
	    this.autoconnect = autoconnect;
	    this.ready = false;
	    this.reconnect = reconnect;
	    this.reconnect_timer_id = void 0;
	    this.reconnect_interval = reconnect_interval;
	    this.max_reconnects = max_reconnects;
	    this.rest_options = rest_options;
	    this.current_reconnects = 0;
	    this.generate_request_id = generate_request_id || (() => ++this.rpc_id);
	    if (!dataPack) this.dataPack = new DefaultDataPack();
	    else this.dataPack = dataPack;
	    if (this.autoconnect)
	      this._connect(this.address, {
	        autoconnect: this.autoconnect,
	        reconnect: this.reconnect,
	        reconnect_interval: this.reconnect_interval,
	        max_reconnects: this.max_reconnects,
	        ...this.rest_options
	      });
	  }
	  /**
	  * Connects to a defined server if not connected already.
	  * @method
	  * @return {Undefined}
	  */
	  connect() {
	    if (this.socket) return;
	    this._connect(this.address, {
	      autoconnect: this.autoconnect,
	      reconnect: this.reconnect,
	      reconnect_interval: this.reconnect_interval,
	      max_reconnects: this.max_reconnects,
	      ...this.rest_options
	    });
	  }
	  /**
	  * Calls a registered RPC method on server.
	  * @method
	  * @param {String} method - RPC method name
	  * @param {Object|Array} params - optional method parameters
	  * @param {Number} timeout - RPC reply timeout value
	  * @param {Object} ws_opts - options passed to ws
	  * @return {Promise}
	  */
	  call(method, params, timeout, ws_opts) {
	    if (!ws_opts && "object" === typeof timeout) {
	      ws_opts = timeout;
	      timeout = null;
	    }
	    return new Promise((resolve, reject) => {
	      if (!this.ready) return reject(new Error("socket not ready"));
	      const rpc_id = this.generate_request_id(method, params);
	      const message = {
	        jsonrpc: "2.0",
	        method,
	        params: params || void 0,
	        id: rpc_id
	      };
	      this.socket.send(this.dataPack.encode(message), ws_opts, (error) => {
	        if (error) return reject(error);
	        this.queue[rpc_id] = { promise: [resolve, reject] };
	        if (timeout) {
	          this.queue[rpc_id].timeout = setTimeout(() => {
	            delete this.queue[rpc_id];
	            reject(new Error("reply timeout"));
	          }, timeout);
	        }
	      });
	    });
	  }
	  /**
	  * Logins with the other side of the connection.
	  * @method
	  * @param {Object} params - Login credentials object
	  * @return {Promise}
	  */
	  async login(params) {
	    const resp = await this.call("rpc.login", params);
	    if (!resp) throw new Error("authentication failed");
	    return resp;
	  }
	  /**
	  * Fetches a list of client's methods registered on server.
	  * @method
	  * @return {Array}
	  */
	  async listMethods() {
	    return await this.call("__listMethods");
	  }
	  /**
	  * Sends a JSON-RPC 2.0 notification to server.
	  * @method
	  * @param {String} method - RPC method name
	  * @param {Object} params - optional method parameters
	  * @return {Promise}
	  */
	  notify(method, params) {
	    return new Promise((resolve, reject) => {
	      if (!this.ready) return reject(new Error("socket not ready"));
	      const message = {
	        jsonrpc: "2.0",
	        method,
	        params
	      };
	      this.socket.send(this.dataPack.encode(message), (error) => {
	        if (error) return reject(error);
	        resolve();
	      });
	    });
	  }
	  /**
	  * Subscribes for a defined event.
	  * @method
	  * @param {String|Array} event - event name
	  * @return {Undefined}
	  * @throws {Error}
	  */
	  async subscribe(event) {
	    if (typeof event === "string") event = [event];
	    const result = await this.call("rpc.on", event);
	    if (typeof event === "string" && result[event] !== "ok")
	      throw new Error(
	        "Failed subscribing to an event '" + event + "' with: " + result[event]
	      );
	    return result;
	  }
	  /**
	  * Unsubscribes from a defined event.
	  * @method
	  * @param {String|Array} event - event name
	  * @return {Undefined}
	  * @throws {Error}
	  */
	  async unsubscribe(event) {
	    if (typeof event === "string") event = [event];
	    const result = await this.call("rpc.off", event);
	    if (typeof event === "string" && result[event] !== "ok")
	      throw new Error("Failed unsubscribing from an event with: " + result);
	    return result;
	  }
	  /**
	  * Closes a WebSocket connection gracefully.
	  * @method
	  * @param {Number} code - socket close code
	  * @param {String} data - optional data to be sent before closing
	  * @return {Undefined}
	  */
	  close(code, data) {
	    this.socket.close(code || 1e3, data);
	  }
	  /**
	  * Enable / disable automatic reconnection.
	  * @method
	  * @param {Boolean} reconnect - enable / disable reconnection
	  * @return {Undefined}
	  */
	  setAutoReconnect(reconnect) {
	    this.reconnect = reconnect;
	  }
	  /**
	  * Set the interval between reconnection attempts.
	  * @method
	  * @param {Number} interval - reconnection interval in milliseconds
	  * @return {Undefined}
	  */
	  setReconnectInterval(interval) {
	    this.reconnect_interval = interval;
	  }
	  /**
	  * Set the maximum number of reconnection attempts.
	  * @method
	  * @param {Number} max_reconnects - maximum reconnection attempts
	  * @return {Undefined}
	  */
	  setMaxReconnects(max_reconnects) {
	    this.max_reconnects = max_reconnects;
	  }
	  /**
	  * Connection/Message handler.
	  * @method
	  * @private
	  * @param {String} address - WebSocket API address
	  * @param {Object} options - ws options object
	  * @return {Undefined}
	  */
	  _connect(address, options) {
	    clearTimeout(this.reconnect_timer_id);
	    this.socket = this.webSocketFactory(address, options);
	    this.socket.addEventListener("open", () => {
	      this.ready = true;
	      this.emit("open");
	      this.current_reconnects = 0;
	    });
	    this.socket.addEventListener("message", ({ data: message }) => {
	      if (message instanceof ArrayBuffer)
	        message = bufferExports.Buffer.from(message).toString();
	      try {
	        message = this.dataPack.decode(message);
	      } catch (error) {
	        return;
	      }
	      if (message.notification && this.listeners(message.notification).length) {
	        if (!Object.keys(message.params).length)
	          return this.emit(message.notification);
	        const args = [message.notification];
	        if (message.params.constructor === Object) args.push(message.params);
	        else
	          for (let i = 0; i < message.params.length; i++)
	            args.push(message.params[i]);
	        return Promise.resolve().then(() => {
	          this.emit.apply(this, args);
	        });
	      }
	      if (!this.queue[message.id]) {
	        if (message.method) {
	          return Promise.resolve().then(() => {
	            this.emit(message.method, message?.params);
	          });
	        }
	        return;
	      }
	      if ("error" in message === "result" in message)
	        this.queue[message.id].promise[1](
	          new Error(
	            'Server response malformed. Response must include either "result" or "error", but not both.'
	          )
	        );
	      if (this.queue[message.id].timeout)
	        clearTimeout(this.queue[message.id].timeout);
	      if (message.error) this.queue[message.id].promise[1](message.error);
	      else this.queue[message.id].promise[0](message.result);
	      delete this.queue[message.id];
	    });
	    this.socket.addEventListener("error", (error) => this.emit("error", error));
	    this.socket.addEventListener("close", ({ code, reason }) => {
	      if (this.ready)
	        setTimeout(() => this.emit("close", code, reason), 0);
	      this.ready = false;
	      this.socket = void 0;
	      if (code === 1e3) return;
	      this.current_reconnects++;
	      if (this.reconnect && (this.max_reconnects > this.current_reconnects || this.max_reconnects === 0))
	        this.reconnect_timer_id = setTimeout(
	          () => this._connect(address, options),
	          this.reconnect_interval
	        );
	    });
	  }
	};

	class RpcWebSocketClient extends CommonClient {
	  constructor(address, options, generate_request_id) {
	    const webSocketFactory = url => {
	      const rpc = WebSocket(url, {
	        autoconnect: true,
	        max_reconnects: 5,
	        reconnect: true,
	        reconnect_interval: 1000,
	        ...options
	      });
	      if ('socket' in rpc) {
	        this.underlyingSocket = rpc.socket;
	      } else {
	        this.underlyingSocket = rpc;
	      }
	      return rpc;
	    };
	    super(webSocketFactory, address, options, generate_request_id);
	    this.underlyingSocket = void 0;
	  }
	  call(...args) {
	    const readyState = this.underlyingSocket?.readyState;
	    if (readyState === 1 /* WebSocket.OPEN */) {
	      return super.call(...args);
	    }
	    return Promise.reject(new Error('Tried to call a JSON-RPC method `' + args[0] + '` but the socket was not `CONNECTING` or `OPEN` (`readyState` was ' + readyState + ')'));
	  }
	  notify(...args) {
	    const readyState = this.underlyingSocket?.readyState;
	    if (readyState === 1 /* WebSocket.OPEN */) {
	      return super.notify(...args);
	    }
	    return Promise.reject(new Error('Tried to send a JSON-RPC notification `' + args[0] + '` but the socket was not `CONNECTING` or `OPEN` (`readyState` was ' + readyState + ')'));
	  }
	}

	/// The serialized size of lookup table metadata
	const LOOKUP_TABLE_META_SIZE = 56;
	const U32_DECODER = getU32Decoder();
	const U64_DECODER = getU64Decoder();
	const U8_DECODER$1 = getU8Decoder();
	const PUBLIC_KEY_CODEC$2 = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
	const decodeLookupTableMeta = bytes => {
	  let offset = 0;
	  const [typeIndex, typeOffset] = U32_DECODER.read(bytes, offset);
	  offset = typeOffset;
	  const [deactivationSlot, deactivationOffset] = U64_DECODER.read(bytes, offset);
	  offset = deactivationOffset;
	  const [lastExtendedSlotRaw, lastExtendedOffset] = U64_DECODER.read(bytes, offset);
	  offset = lastExtendedOffset;
	  const [lastExtendedStartIndex, startOffset] = U8_DECODER$1.read(bytes, offset);
	  offset = startOffset;
	  const [authorityOption, optionOffset] = U8_DECODER$1.read(bytes, offset);
	  offset = optionOffset;
	  const authority = [];
	  if (authorityOption !== 0) {
	    const [authorityBytes] = PUBLIC_KEY_CODEC$2.read(bytes, offset);
	    authority.push(authorityBytes);
	  }
	  return {
	    typeIndex,
	    deactivationSlot,
	    lastExtendedSlot: Number(lastExtendedSlotRaw),
	    lastExtendedStartIndex,
	    authority
	  };
	};
	class AddressLookupTableAccount {
	  constructor(args) {
	    this.key = void 0;
	    this.state = void 0;
	    this.key = args.key;
	    this.state = args.state;
	  }
	  isActive() {
	    const U64_MAX = BigInt('0xffffffffffffffff');
	    return this.state.deactivationSlot === U64_MAX;
	  }
	  static deserialize(accountData) {
	    const meta = decodeLookupTableMeta(accountData);
	    const serializedAddressesLen = accountData.length - LOOKUP_TABLE_META_SIZE;
	    assert$1(serializedAddressesLen >= 0, 'lookup table is invalid');
	    assert$1(serializedAddressesLen % 32 === 0, 'lookup table is invalid');
	    const numSerializedAddresses = serializedAddressesLen / 32;
	    const addressesBytes = accountData.slice(LOOKUP_TABLE_META_SIZE);
	    const addresses = [];
	    for (let index = 0; index < numSerializedAddresses; index += 1) {
	      const offset = index * 32;
	      const [addressBytes] = PUBLIC_KEY_CODEC$2.read(addressesBytes, offset);
	      addresses.push(addressBytes);
	    }
	    return {
	      deactivationSlot: meta.deactivationSlot,
	      lastExtendedSlot: meta.lastExtendedSlot,
	      lastExtendedSlotStartIndex: meta.lastExtendedStartIndex,
	      authority: meta.authority.length !== 0 ? new Address(meta.authority[0]) : undefined,
	      addresses: addresses.map(address => new Address(address))
	    };
	  }
	}

	const URL_RE = /^[^:]+:\/\/([^:[]+|\[[^\]]+\])(:\d+)?(.*)/i;
	function makeWebsocketUrl(endpoint) {
	  const matches = endpoint.match(URL_RE);
	  if (matches == null) {
	    throw TypeError(`Failed to validate endpoint URL \`${endpoint}\``);
	  }
	  const [_,
	  // eslint-disable-line @typescript-eslint/no-unused-vars
	  hostish, portWithColon, rest] = matches;
	  const protocol = endpoint.startsWith('https:') ? 'wss:' : 'ws:';
	  const startPort = portWithColon == null ? null : parseInt(portWithColon.slice(1), 10);
	  const websocketPort =
	  // Only shift the port by +1 as a convention for ws(s) only if given endpoint
	  // is explicitly specifying the endpoint port (HTTP-based RPC), assuming
	  // we're directly trying to connect to agave-validator's ws listening port.
	  // When the endpoint omits the port, we're connecting to the protocol
	  // default ports: http(80) or https(443) and it's assumed we're behind a reverse
	  // proxy which manages WebSocket upgrade and backend port redirection.
	  startPort == null ? '' : `:${startPort + 1}`;
	  return `${protocol}//${hostish}${websocketPort}${rest}`;
	}

	const PublicKeyFromString = coerce(instance(Address), string(), value => new Address(value));
	function toKitAddress(address) {
	  return address.toBase58();
	}
	const BigIntFromNumber = coerce(define('bigint', value => typeof value === 'bigint'), union([number(), string()]), value => {
	  if (typeof value === 'number') {
	    assert$1(Number.isInteger(value), 'Expected bigint-compatible integer number');
	    // Preserve compatibility with nodes that emit JSON numbers for u64 fields.
	    value = `${value}`;
	  }
	  assert$1(/^\d+$/.test(value), 'Expected bigint-compatible unsigned integer string');
	  return BigInt(value);
	});
	const RawAccountDataResult = tuple([string(), literal('base64')]);
	function decodeBase64WireData(value) {
	  return toUint8ArrayView(BASE64_CODEC.encode(value));
	}
	function encodeBase64WireData(value) {
	  return BASE64_CODEC.decode(value);
	}
	const Uint8ArrayFromRawAccountData = coerce(instance(Uint8Array), RawAccountDataResult, value => decodeBase64WireData(value[0]));
	const BASE58_ENCODER = getBase58Encoder();
	const BASE64_CODEC = getBase64Codec();

	/**
	 * Attempt to use a recent blockhash for up to 30 seconds
	 * @internal
	 */
	const BLOCKHASH_CACHE_TIMEOUT_MS = 30 * 1000;

	/**
	 * HACK.
	 * Copied from rpc-websockets/dist/lib/client.
	 * Otherwise, `yarn build` fails with:
	 * https://gist.github.com/steveluscher/c057eca81d479ef705cdb53162f9971d
	 */

	/** @internal */
	/** @internal */
	/** @internal */
	/** @internal */

	/** @internal */
	/**
	 * @internal
	 * Every subscription contains the args used to open the subscription with
	 * the server, and a list of callers interested in notifications.
	 */

	/**
	 * @internal
	 * A subscription may be in various states of connectedness. Only when it is
	 * fully connected will it have a server subscription id associated with it.
	 * This id can be returned to the server to unsubscribe the client entirely.
	 */

	/**
	 * A type that encapsulates a subscription's RPC method
	 * names and notification (callback) signature.
	 */

	/**
	 * @internal
	 * Utility type that keeps tagged unions intact while omitting properties.
	 */

	/**
	 * @internal
	 * This type represents a single subscribable 'topic.' It's made up of:
	 *
	 * - The args used to open the subscription with the server,
	 * - The state of the subscription, in terms of its connectedness, and
	 * - The set of callbacks to call when the server publishes notifications
	 *
	 * This record gets indexed by `SubscriptionConfigHash` and is used to
	 * set up subscriptions, fan out notifications, and track subscription state.
	 */

	/**
	 * @internal
	 */

	/**
	 * Extra contextual information for RPC responses
	 */

	/**
	 * Options for sending transactions
	 */

	/**
	 * Options for confirming transactions
	 */

	/**
	 * Options for getSignaturesForAddress
	 */

	/**
	 * RPC Response with extra contextual information
	 */

	/**
	 * A strategy for confirming transactions that uses the last valid
	 * block height for a given blockhash to check for transaction expiration.
	 */

	/**
	 * A strategy for confirming durable nonce transactions.
	 */

	/**
	 * Properties shared by all transaction confirmation strategies
	 */

	/**
	 * This type represents all transaction confirmation strategies
	 */

	/* @internal */
	function assertEndpointUrl(putativeUrl) {
	  if (/^https?:/.test(putativeUrl) === false) {
	    throw new TypeError('Endpoint URL must start with `http:` or `https:`.');
	  }
	  return putativeUrl;
	}

	/** @internal */
	function extractCommitmentFromConfig(commitmentOrConfig) {
	  let commitment;
	  let config;
	  if (typeof commitmentOrConfig === 'string') {
	    commitment = commitmentOrConfig;
	  } else if (commitmentOrConfig) {
	    const {
	      commitment: specifiedCommitment,
	      ...specifiedConfig
	    } = commitmentOrConfig;
	    commitment = specifiedCommitment;
	    config = specifiedConfig;
	  }
	  return {
	    commitment,
	    config
	  };
	}

	/** @internal */
	function coerceNumericToBigInt(value, valueName) {
	  if (typeof value === 'bigint') {
	    return value;
	  }
	  assert$1(Number.isSafeInteger(value), `${valueName ?? 'Value'} must be a safe integer or bigint`);
	  return BigInt(value);
	}

	/**
	 * @internal
	 */
	function applyDefaultMemcmpEncodingToFilters(filters) {
	  return filters.map(filter => 'memcmp' in filter ? {
	    ...filter,
	    memcmp: {
	      ...filter.memcmp,
	      encoding: filter.memcmp.encoding ?? 'base58'
	    }
	  } : filter);
	}

	/**
	 * @internal
	 */
	function createRpcResult(result) {
	  return union([type({
	    jsonrpc: literal('2.0'),
	    id: string(),
	    result
	  }), type({
	    jsonrpc: literal('2.0'),
	    id: string(),
	    error: type({
	      code: unknown(),
	      message: string(),
	      data: optional(any())
	    })
	  })]);
	}
	const UnknownRpcResult = createRpcResult(unknown());

	/**
	 * @internal
	 */
	function jsonRpcResult(schema) {
	  return coerce(createRpcResult(schema), UnknownRpcResult, value => {
	    if ('error' in value) {
	      return value;
	    } else {
	      return {
	        ...value,
	        result: create(value.result, schema)
	      };
	    }
	  });
	}

	/**
	 * @internal
	 */
	function jsonRpcResultAndContext(value) {
	  return jsonRpcResult(type({
	    context: type({
	      slot: number()
	    }),
	    value
	  }));
	}

	/**
	 * @internal
	 */
	function notificationResultAndContext(value) {
	  return type({
	    context: type({
	      slot: number()
	    }),
	    value
	  });
	}

	/**
	 * @internal
	 */
	function versionedMessageFromResponse(version, response) {
	  if (version === 0) {
	    return new MessageV0({
	      header: response.header,
	      staticAccountKeys: response.accountKeys.map(accountKey => new Address(accountKey)),
	      recentBlockhash: response.recentBlockhash,
	      compiledInstructions: response.instructions.map(ix => ({
	        programIdIndex: ix.programIdIndex,
	        accountKeyIndexes: ix.accounts,
	        data: toUint8ArrayView(BASE58_ENCODER.encode(ix.data))
	      })),
	      addressTableLookups: response.addressTableLookups
	    });
	  } else {
	    return new Message(response);
	  }
	}

	/**
	 * The level of commitment desired when querying state
	 * <pre>
	 *   'processed': Query the most recent block which has reached 1 confirmation by the connected node
	 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
	 *   'finalized': Query the most recent block which has been finalized by the cluster
	 * </pre>
	 */

	/**
	 * A subset of Commitment levels, which are at least optimistically confirmed
	 * <pre>
	 *   'confirmed': Query the most recent block which has reached 1 confirmation by the cluster
	 *   'finalized': Query the most recent block which has been finalized by the cluster
	 * </pre>
	 */

	/**
	 * Filter for largest accounts query
	 * <pre>
	 *   'circulating':    Return the largest accounts that are part of the circulating supply
	 *   'nonCirculating': Return the largest accounts that are not part of the circulating supply
	 * </pre>
	 */

	/**
	 * Configuration object for changing `getAccountInfo` query behavior
	 */

	/**
	 * Configuration object for changing `getBalance` query behavior
	 */

	/**
	 * Configuration object for changing `getBlock` query behavior
	 */

	/**
	 * Configuration object for changing `getBlock` query behavior
	 */

	/**
	 * Configuration object for changing `getStakeMinimumDelegation` query behavior
	 */

	/**
	 * Configuration object for changing `getBlockHeight` query behavior
	 */

	/**
	 * Configuration object for changing `getEpochInfo` query behavior
	 */

	/**
	 * Configuration object for changing `getLeaderSchedule` query behavior
	 */

	/**
	 * Configuration object for changing `getInflationReward` query behavior
	 */

	/**
	 * Configuration object for changing `getLatestBlockhash` query behavior
	 */

	/**
	 * Configuration object for changing `getFeeForMessage` query behavior
	 */

	/**
	 * Configuration object for changing `requestAirdrop` query behavior
	 */

	/**
	 * Configuration object for changing `isBlockhashValid` query behavior
	 */

	/**
	 * Configuration object for changing `getSlot` query behavior
	 */

	/**
	 * Configuration object for changing `getSlotLeader` query behavior
	 */

	/**
	 * Configuration object for changing `getTransaction` query behavior
	 */

	/**
	 * Configuration object for changing `getTransaction` query behavior
	 */

	/**
	 * Configuration object for changing `getLargestAccounts` query behavior
	 */

	/**
	 * Configuration object for changing `getSupply` request behavior
	 */

	/**
	 * Configuration object for changing query behavior
	 */

	/**
	 * Information describing a cluster node
	 */

	/**
	 * Information describing a vote account
	 */

	/**
	 * A collection of cluster vote accounts
	 */

	/**
	 * Network Inflation
	 * (see https://docs.solana.com/implemented-proposals/ed_overview)
	 */

	/**
	 * The inflation reward for an epoch
	 */

	/**
	 * Expected JSON RPC response for the "getInflationReward" message
	 */
	const GetInflationRewardResult = jsonRpcResult(array(nullable(type({
	  epoch: number(),
	  effectiveSlot: number(),
	  amount: number(),
	  postBalance: number(),
	  commission: optional(nullable(number()))
	}))));

	/**
	 * Configuration object for changing `getRecentPrioritizationFees` query behavior
	 */

	/**
	 * Information about the current epoch
	 */

	/**
	 * Leader schedule
	 * (see https://docs.solana.com/terminology#leader-schedule)
	 */

	/**
	 * Transaction error or null
	 */
	const TransactionErrorResult = nullable(union([type({}), string()]));

	/**
	 * Signature status for a transaction
	 */
	const SignatureStatusResult = type({
	  err: TransactionErrorResult
	});

	/**
	 * Transaction signature received notification
	 */
	const SignatureReceivedResult = literal('receivedSignature');

	/**
	 * Identity for an RPC node.
	 */

	const ParsedInstructionStruct = type({
	  program: string(),
	  programId: PublicKeyFromString,
	  parsed: unknown()
	});
	const PartiallyDecodedInstructionStruct = type({
	  programId: PublicKeyFromString,
	  accounts: array(PublicKeyFromString),
	  data: string()
	});
	const SimulatedTransactionResponseStruct = jsonRpcResultAndContext(type({
	  err: nullable(union([type({}), string()])),
	  logs: nullable(array(string())),
	  accounts: optional(nullable(array(nullable(type({
	    executable: boolean(),
	    owner: string(),
	    lamports: BigIntFromNumber,
	    data: array(string()),
	    rentEpoch: optional(BigIntFromNumber)
	  }))))),
	  unitsConsumed: optional(number()),
	  returnData: optional(nullable(type({
	    programId: string(),
	    data: tuple([string(), literal('base64')])
	  }))),
	  innerInstructions: optional(nullable(array(type({
	    index: number(),
	    instructions: array(union([ParsedInstructionStruct, PartiallyDecodedInstructionStruct]))
	  }))))
	}));

	/**
	 * Metadata for a parsed confirmed transaction on the ledger
	 *
	 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionMeta} instead.
	 */

	/**
	 * Collection of addresses loaded by a transaction using address table lookups
	 */

	/**
	 * Metadata for a parsed transaction on the ledger
	 */

	/**
	 * Metadata for a confirmed transaction on the ledger
	 */

	/**
	 * A processed transaction from the RPC API
	 */

	/**
	 * A processed transaction from the RPC API
	 */

	/**
	 * A processed transaction message from the RPC API
	 */

	/**
	 * A confirmed transaction on the ledger
	 *
	 * @deprecated Deprecated since RPC v1.8.0.
	 */

	/**
	 * A partially decoded transaction instruction
	 */

	/**
	 * A parsed transaction message account
	 */

	/**
	 * A parsed transaction instruction
	 */

	/**
	 * A parsed address table lookup
	 */

	/**
	 * A parsed transaction message
	 */

	/**
	 * A parsed transaction
	 */

	/**
	 * A parsed and confirmed transaction on the ledger
	 *
	 * @deprecated Deprecated since RPC v1.8.0. Please use {@link ParsedTransactionWithMeta} instead.
	 */

	/**
	 * A parsed transaction on the ledger with meta
	 */

	/**
	 * A processed block fetched from the RPC API
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
	 */

	/**
	 * A block with parsed transactions
	 */

	/**
	 * A block with parsed transactions where the `transactionDetails` mode is `accounts`
	 */

	/**
	 * A block with parsed transactions where the `transactionDetails` mode is `none`
	 */

	/**
	 * A block with parsed transactions where the `transactionDetails` mode is `signatures`
	 */

	/**
	 * A processed block fetched from the RPC API
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `accounts`
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `none`
	 */

	/**
	 * A processed block fetched from the RPC API where the `transactionDetails` mode is `signatures`
	 */

	/**
	 * A confirmed block on the ledger
	 *
	 * @deprecated Deprecated since RPC v1.8.0.
	 */

	/**
	 * A Block on the ledger with signatures only
	 */

	/**
	 * Amount of stake committed to a block at each depth.
	 */

	/**
	 * recent block production information
	 */

	/**
	 * A performance sample
	 */

	const defaultFetch = (input, init) => {
	  if (typeof globalThis.fetch !== 'function') {
	    throw new Error('globalThis.fetch is not available in this environment');
	  }
	  const processedInput = typeof input === 'string' && input.slice(0, 2) === '//' ? 'https:' + input : input;
	  return globalThis.fetch(processedInput, init);
	};
	function createRpcTransport(url, config = {}) {
	  const {
	    disableRetryOnRateLimit,
	    httpHeaders
	  } = config;
	  const fetch = defaultFetch;
	  let agent;
	  return async ({
	    payload,
	    signal
	  }) => {
	    const options = {
	      method: 'POST',
	      body: JSON.stringify(payload),
	      agent,
	      signal,
	      headers: Object.assign({
	        'Content-Type': 'application/json'
	      }, httpHeaders || {}, COMMON_HTTP_HEADERS)
	    };
	    let too_many_requests_retries = 5;
	    let res;
	    let waitTime = 500;
	    for (;;) {
	      res = await fetch(url, options);
	      if (res.status !== 429 /* Too many requests */) {
	        break;
	      }
	      if (disableRetryOnRateLimit === true) {
	        break;
	      }
	      too_many_requests_retries -= 1;
	      if (too_many_requests_retries === 0) {
	        break;
	      }
	      console.error(`Server responded with ${res.status} ${res.statusText}.  Retrying after ${waitTime}ms delay...`);
	      await sleep(waitTime);
	      waitTime *= 2;
	    }
	    const text = await res.text();
	    if (!res.ok) {
	      throw new Error(`${res.status} ${res.statusText}: ${text}`);
	    }
	    return text ? JSON.parse(text) : null;
	  };
	}
	function createKitRpcClient(url, config) {
	  const transport = createRpcTransport(url, config);
	  return {
	    rpc: createRpc({
	      api: createJsonRpcApi(),
	      transport
	    }),
	    typedRpc: createRpc({
	      api: createSolanaRpcApi({
	        ...DEFAULT_RPC_CONFIG,
	        // Legacy Connection omitted commitment when unspecified, which leaves
	        // commitment selection to the server-side default (`finalized`).
	        defaultCommitment: 'finalized'
	      }),
	      transport
	    }),
	    transport
	  };
	}
	function isJsonRpcErrorLike(value) {
	  return !!value && typeof value === 'object' && 'code' in value && typeof value.message === 'string';
	}
	function throwSolanaRpcErrorIfNeeded(error, context) {
	  if (isJsonRpcErrorLike(error)) {
	    throw new SolanaJSONRPCError(error, context);
	  }
	  throw error;
	}
	function createKitRpcRequest(client) {
	  return async (methodName, args) => {
	    const method = client[methodName];
	    assert$1(typeof method === 'function', `Kit RPC method not found: ${methodName}`);
	    const pendingRequest = method(...args);
	    assert$1(!!pendingRequest && typeof pendingRequest.send === 'function', `Kit RPC method did not return a sendable request: ${methodName}`);
	    const response = await pendingRequest.send();
	    const id = response.id;
	    return {
	      ...response,
	      id: id ?? '1'
	    };
	  };
	}
	function createKitRpcBatchRequest(transport) {
	  return async requests => {
	    if (requests.length === 0) {
	      return [];
	    }
	    const payload = requests.map((request, index) => ({
	      id: String(index + 1),
	      jsonrpc: '2.0',
	      method: request.methodName,
	      params: request.args
	    }));
	    const response = await transport({
	      payload
	    });
	    assert$1(Array.isArray(response), 'Kit RPC batch transport did not return an array');
	    return response;
	  };
	}

	/**
	 * Expected JSON RPC response for the "getEpochInfo" message
	 */
	jsonRpcResult(number());

	/**
	 * Expected JSON RPC response for the "getBlockCommitment" message
	 */
	jsonRpcResult(type({
	  commitment: nullable(array(number())),
	  totalStake: number()
	}));

	/**
	 * Supply
	 */

	/**
	 * Expected JSON RPC response for the "getSupply" message
	 */
	const GetSupplyRpcResult = jsonRpcResultAndContext(type({
	  total: number(),
	  circulating: number(),
	  nonCirculating: number(),
	  nonCirculatingAccounts: array(PublicKeyFromString)
	}));

	/**
	 * Token amount object which returns a token amount in different formats
	 * for various client use cases.
	 */

	/**
	 * Expected JSON RPC structure for token amounts
	 */
	const TokenAmountResult = type({
	  amount: string(),
	  uiAmount: nullable(number()),
	  decimals: number(),
	  uiAmountString: optional(string())
	});

	/**
	 * Token address and balance.
	 */

	/**
	 * Expected JSON RPC response for the "getTokenAccountsByOwner" message
	 */
	const GetTokenAccountsByOwnerBytes = jsonRpcResultAndContext(array(type({
	  pubkey: PublicKeyFromString,
	  account: type({
	    executable: boolean(),
	    owner: PublicKeyFromString,
	    lamports: BigIntFromNumber,
	    data: Uint8ArrayFromRawAccountData,
	    rentEpoch: BigIntFromNumber
	  })
	})));
	const ParsedAccountDataResult = type({
	  program: string(),
	  parsed: unknown(),
	  space: number()
	});

	/**
	 * Expected JSON RPC response for the "getTokenAccountsByOwner" message with parsed data
	 */
	const GetParsedTokenAccountsByOwner = jsonRpcResultAndContext(array(type({
	  pubkey: PublicKeyFromString,
	  account: type({
	    executable: boolean(),
	    owner: PublicKeyFromString,
	    lamports: BigIntFromNumber,
	    data: ParsedAccountDataResult,
	    rentEpoch: BigIntFromNumber
	  })
	})));

	/**
	 * Pair of an account address and its balance
	 */

	/**
	 * @internal
	 */
	const AccountInfoBytesResult = type({
	  executable: boolean(),
	  owner: PublicKeyFromString,
	  lamports: BigIntFromNumber,
	  data: Uint8ArrayFromRawAccountData,
	  rentEpoch: BigIntFromNumber
	});

	/**
	 * @internal
	 */
	const KeyedAccountInfoBytesResult = type({
	  pubkey: PublicKeyFromString,
	  account: AccountInfoBytesResult
	});
	const ParsedOrRawAccountDataBytes = coerce(union([instance(Uint8Array), ParsedAccountDataResult]), union([RawAccountDataResult, ParsedAccountDataResult]), value => {
	  if (Array.isArray(value)) {
	    return create(value, Uint8ArrayFromRawAccountData);
	  } else {
	    return value;
	  }
	});

	/**
	 * @internal
	 */
	const ParsedAccountInfoBytesResult = type({
	  executable: boolean(),
	  owner: PublicKeyFromString,
	  lamports: BigIntFromNumber,
	  data: ParsedOrRawAccountDataBytes,
	  rentEpoch: BigIntFromNumber
	});
	const KeyedParsedAccountInfoBytesResult = type({
	  pubkey: PublicKeyFromString,
	  account: ParsedAccountInfoBytesResult
	});

	/**
	 * Expected JSON RPC response for the "getSignaturesForAddress" message
	 */
	const GetSignaturesForAddressRpcResult = jsonRpcResult(array(type({
	  signature: string(),
	  slot: number(),
	  err: TransactionErrorResult,
	  memo: nullable(string()),
	  blockTime: optional(nullable(number()))
	})));

	/***
	 * Expected JSON RPC response for the "accountNotification" message
	 */
	const AccountNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(AccountInfoBytesResult)
	});

	/**
	 * @internal
	 */
	const ProgramAccountInfoResult = type({
	  pubkey: PublicKeyFromString,
	  account: AccountInfoBytesResult
	});

	/***
	 * Expected JSON RPC response for the "programNotification" message
	 */
	const ProgramAccountNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(ProgramAccountInfoResult)
	});

	/**
	 * @internal
	 */
	const SlotInfoResult = type({
	  parent: number(),
	  slot: number(),
	  root: number()
	});

	/**
	 * Expected JSON RPC response for the "slotNotification" message
	 */
	const SlotNotificationResult = type({
	  subscription: number(),
	  result: SlotInfoResult
	});

	/**
	 * Slot updates which can be used for tracking the live progress of a cluster.
	 * - `"firstShredReceived"`: connected node received the first shred of a block.
	 * Indicates that a new block that is being produced.
	 * - `"completed"`: connected node has received all shreds of a block. Indicates
	 * a block was recently produced.
	 * - `"optimisticConfirmation"`: block was optimistically confirmed by the
	 * cluster. It is not guaranteed that an optimistic confirmation notification
	 * will be sent for every finalized blocks.
	 * - `"root"`: the connected node rooted this block.
	 * - `"createdBank"`: the connected node has started validating this block.
	 * - `"frozen"`: the connected node has validated this block.
	 * - `"dead"`: the connected node failed to validate this block.
	 */

	/**
	 * @internal
	 */
	const SlotUpdateResult = union([type({
	  type: union([literal('firstShredReceived'), literal('completed'), literal('optimisticConfirmation'), literal('root')]),
	  slot: number(),
	  timestamp: number()
	}), type({
	  type: literal('createdBank'),
	  parent: number(),
	  slot: number(),
	  timestamp: number()
	}), type({
	  type: literal('frozen'),
	  slot: number(),
	  timestamp: number(),
	  stats: type({
	    numTransactionEntries: number(),
	    numSuccessfulTransactions: number(),
	    numFailedTransactions: number(),
	    maxTransactionsPerEntry: number()
	  })
	}), type({
	  type: literal('dead'),
	  slot: number(),
	  timestamp: number(),
	  err: string()
	})]);

	/**
	 * Expected JSON RPC response for the "slotsUpdatesNotification" message
	 */
	const SlotUpdateNotificationResult = type({
	  subscription: number(),
	  result: SlotUpdateResult
	});

	/**
	 * Expected JSON RPC response for the "signatureNotification" message
	 */
	const SignatureNotificationResult = type({
	  subscription: number(),
	  result: notificationResultAndContext(union([SignatureStatusResult, SignatureReceivedResult]))
	});

	/**
	 * Expected JSON RPC response for the "rootNotification" message
	 */
	const RootNotificationResult = type({
	  subscription: number(),
	  result: number()
	});
	type({
	  pubkey: string(),
	  gossip: nullable(string()),
	  tpu: nullable(string()),
	  rpc: nullable(string()),
	  version: nullable(string())
	});
	const VoteAccountInfoResult = type({
	  votePubkey: string(),
	  nodePubkey: string(),
	  activatedStake: number(),
	  epochVoteAccount: boolean(),
	  epochCredits: array(tuple([number(), number(), number()])),
	  commission: number(),
	  lastVote: number(),
	  rootSlot: nullable(number())
	});

	/**
	 * Expected JSON RPC response for the "getVoteAccounts" message
	 */
	const GetVoteAccounts = jsonRpcResult(type({
	  current: array(VoteAccountInfoResult),
	  delinquent: array(VoteAccountInfoResult)
	}));
	const ConfirmationStatus = union([literal('processed'), literal('confirmed'), literal('finalized')]);
	const SignatureStatusResponse = type({
	  slot: number(),
	  confirmations: nullable(number()),
	  err: TransactionErrorResult,
	  confirmationStatus: optional(ConfirmationStatus)
	});

	/**
	 * Expected JSON RPC response for the "getSignatureStatuses" message
	 */
	const GetSignatureStatusesRpcResult = jsonRpcResultAndContext(array(nullable(SignatureStatusResponse)));

	/**
	 * Expected JSON RPC response for the "getMinimumBalanceForRentExemption" message
	 */
	const GetMinimumBalanceForRentExemptionRpcResult = jsonRpcResult(number());
	const AddressTableLookupStruct = type({
	  accountKey: PublicKeyFromString,
	  writableIndexes: array(number()),
	  readonlyIndexes: array(number())
	});
	const ConfirmedTransactionResult = type({
	  signatures: array(string()),
	  message: type({
	    accountKeys: array(string()),
	    header: type({
	      numRequiredSignatures: number(),
	      numReadonlySignedAccounts: number(),
	      numReadonlyUnsignedAccounts: number()
	    }),
	    instructions: array(type({
	      accounts: array(number()),
	      data: string(),
	      programIdIndex: number()
	    })),
	    recentBlockhash: string(),
	    addressTableLookups: optional(array(AddressTableLookupStruct))
	  })
	});
	const AnnotatedAccountKey = type({
	  pubkey: PublicKeyFromString,
	  signer: boolean(),
	  writable: boolean(),
	  source: optional(union([literal('transaction'), literal('lookupTable')]))
	});
	const ConfirmedTransactionAccountsModeResult = type({
	  accountKeys: array(AnnotatedAccountKey),
	  signatures: array(string())
	});
	const ParsedInstructionResult = type({
	  parsed: unknown(),
	  program: string(),
	  programId: PublicKeyFromString
	});
	const RawInstructionResult = type({
	  accounts: array(PublicKeyFromString),
	  data: string(),
	  programId: PublicKeyFromString
	});
	const InstructionResult = union([RawInstructionResult, ParsedInstructionResult]);
	const UnknownInstructionResult = union([type({
	  parsed: unknown(),
	  program: string(),
	  programId: string()
	}), type({
	  accounts: array(string()),
	  data: string(),
	  programId: string()
	})]);
	const ParsedOrRawInstruction = coerce(InstructionResult, UnknownInstructionResult, value => {
	  if ('accounts' in value) {
	    return create(value, RawInstructionResult);
	  } else {
	    return create(value, ParsedInstructionResult);
	  }
	});

	/**
	 * @internal
	 */
	const ParsedConfirmedTransactionResult = type({
	  signatures: array(string()),
	  message: type({
	    accountKeys: array(AnnotatedAccountKey),
	    instructions: array(ParsedOrRawInstruction),
	    recentBlockhash: string(),
	    addressTableLookups: optional(nullable(array(AddressTableLookupStruct)))
	  })
	});
	const TokenBalanceResult = type({
	  accountIndex: number(),
	  mint: string(),
	  owner: optional(string()),
	  programId: optional(string()),
	  uiTokenAmount: TokenAmountResult
	});
	const LoadedAddressesResult = type({
	  writable: array(PublicKeyFromString),
	  readonly: array(PublicKeyFromString)
	});

	/**
	 * @internal
	 */
	const ConfirmedTransactionMetaResult = type({
	  err: TransactionErrorResult,
	  fee: number(),
	  innerInstructions: optional(nullable(array(type({
	    index: number(),
	    instructions: array(type({
	      accounts: array(number()),
	      data: string(),
	      programIdIndex: number()
	    }))
	  })))),
	  preBalances: array(number()),
	  postBalances: array(number()),
	  logMessages: optional(nullable(array(string()))),
	  preTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  postTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  loadedAddresses: optional(LoadedAddressesResult),
	  computeUnitsConsumed: optional(number()),
	  costUnits: optional(number())
	});

	/**
	 * @internal
	 */
	const ParsedConfirmedTransactionMetaResult = type({
	  err: TransactionErrorResult,
	  fee: number(),
	  innerInstructions: optional(nullable(array(type({
	    index: number(),
	    instructions: array(ParsedOrRawInstruction)
	  })))),
	  preBalances: array(number()),
	  postBalances: array(number()),
	  logMessages: optional(nullable(array(string()))),
	  preTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  postTokenBalances: optional(nullable(array(TokenBalanceResult))),
	  loadedAddresses: optional(LoadedAddressesResult),
	  computeUnitsConsumed: optional(number()),
	  costUnits: optional(number())
	});
	const TransactionVersionStruct = union([literal(0), literal('legacy')]);

	/** @internal */
	const RewardsResult = type({
	  pubkey: string(),
	  lamports: number(),
	  postBalance: nullable(number()),
	  rewardType: nullable(string()),
	  commission: optional(nullable(number()))
	});

	/**
	 * Expected JSON RPC response for the "getBlock" message
	 */
	const GetBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionResult,
	    meta: nullable(ConfirmedTransactionMetaResult),
	    version: optional(TransactionVersionStruct)
	  })),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `none`
	 */
	const GetNoneModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `accounts`
	 */
	const GetAccountsModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionAccountsModeResult,
	    meta: nullable(ConfirmedTransactionMetaResult),
	    version: optional(TransactionVersionStruct)
	  })),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getBlock" message when `transactionDetails` is `signatures`
	 */
	const GetSignaturesModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  signatures: array(string()),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected parsed JSON RPC response for the "getBlock" message
	 */
	const GetParsedBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ParsedConfirmedTransactionResult,
	    meta: nullable(ParsedConfirmedTransactionMetaResult),
	    version: optional(TransactionVersionStruct)
	  })),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `accounts`
	 */
	const GetParsedAccountsModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionAccountsModeResult,
	    meta: nullable(ParsedConfirmedTransactionMetaResult),
	    version: optional(TransactionVersionStruct)
	  })),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected parsed JSON RPC response for the "getBlock" message  when `transactionDetails` is `none`
	 */
	const GetParsedNoneModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected parsed JSON RPC response for the "getBlock" message when `transactionDetails` is `signatures`
	 */
	const GetParsedSignaturesModeBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  signatures: array(string()),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getConfirmedBlock" message
	 *
	 * @deprecated Deprecated since RPC v1.8.0. Please use {@link GetBlockRpcResult} instead.
	 */
	const GetConfirmedBlockRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  transactions: array(type({
	    transaction: ConfirmedTransactionResult,
	    meta: nullable(ConfirmedTransactionMetaResult)
	  })),
	  rewards: optional(array(RewardsResult)),
	  blockTime: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getBlock" message
	 */
	const GetBlockSignaturesRpcResult = jsonRpcResult(nullable(type({
	  blockhash: string(),
	  previousBlockhash: string(),
	  parentSlot: number(),
	  signatures: array(string()),
	  blockTime: nullable(number()),
	  blockHeight: nullable(number())
	})));

	/**
	 * Expected JSON RPC response for the "getTransaction" message
	 */
	const GetTransactionRpcResult = jsonRpcResult(nullable(type({
	  slot: number(),
	  meta: nullable(ConfirmedTransactionMetaResult),
	  blockTime: optional(nullable(number())),
	  transaction: ConfirmedTransactionResult,
	  version: optional(TransactionVersionStruct)
	})));

	/**
	 * Expected parsed JSON RPC response for the "getTransaction" message
	 */
	const GetParsedTransactionRpcResult = jsonRpcResult(nullable(type({
	  slot: number(),
	  transaction: ParsedConfirmedTransactionResult,
	  meta: nullable(ParsedConfirmedTransactionMetaResult),
	  blockTime: optional(nullable(number())),
	  version: optional(TransactionVersionStruct)
	})));

	/**
	 * Expected JSON RPC response for the "getLatestBlockhash" message
	 */
	const GetLatestBlockhashRpcResult = jsonRpcResultAndContext(type({
	  blockhash: string(),
	  lastValidBlockHeight: number()
	}));

	/**
	 * Expected JSON RPC response for the "isBlockhashValid" message
	 */
	jsonRpcResultAndContext(boolean());

	/**
	 * Expected JSON RPC response for the "requestAirdrop" message
	 */
	jsonRpcResult(string());

	/**
	 * Expected JSON RPC response for the "sendTransaction" message
	 */
	const SendTransactionRpcResult = jsonRpcResult(string());

	/**
	 * Information about the latest slot being processed by a node
	 */

	/**
	 * Parsed account data
	 */

	/**
	 * Data slice argument for getProgramAccounts
	 */

	/**
	 * Memory comparison filter for getProgramAccounts
	 */

	/**
	 * Data size comparison filter for getProgramAccounts
	 */

	/**
	 * A filter object for getProgramAccounts
	 */

	/**
	 * Configuration object for getProgramAccounts requests
	 */

	/**
	 * Configuration object for getParsedProgramAccounts
	 */

	/**
	 * Configuration object for getMultipleAccounts
	 */

	/**
	 * Configuration object for `getTokenAccountsByOwner`
	 */

	/**
	 * Configuration object for `getTokenAccountsByDelegate`
	 */

	/**
	 * Configuration object for `getTransactionCount`
	 */

	/**
	 * Configuration object for `getBlocks` and `getBlocksWithLimit`
	 */

	/**
	 * Configuration object for `getTokenSupply`
	 */

	/**
	 * Configuration object for `getTokenAccountBalance`
	 */

	/**
	 * Configuration object for `getTokenLargestAccounts`
	 */

	/**
	 * Configuration object for `getInflationGovernor`
	 */

	/**
	 * Configuration object for `getVoteAccounts`
	 */

	/**
	 * Configuration object for `getMinimumBalanceForRentExemption`
	 */

	/**
	 * Configuration object for `getNonce`
	 */

	/**
	 * Configuration object for `getNonceAndContext`
	 */

	/**
	 * Information describing an account
	 */

	/**
	 * Account information identified by pubkey
	 */

	/**
	 * Callback function for account change notifications
	 */

	/**
	 * Callback function for program account change notifications
	 */

	/**
	 * Callback function for slot change notifications
	 */

	/**
	 * Callback function for slot update notifications
	 */

	/**
	 * Callback function for signature status notifications
	 */

	/**
	 * Signature status notification with transaction result
	 */

	/**
	 * Signature received notification
	 */

	/**
	 * Callback function for signature notifications
	 */

	/**
	 * Signature subscription options
	 */

	/**
	 * Callback function for root change notifications
	 */

	/**
	 * @internal
	 */
	const LogsResult = type({
	  err: TransactionErrorResult,
	  logs: array(string()),
	  signature: string()
	});

	/**
	 * Logs result.
	 */

	/**
	 * Expected JSON RPC response for the "logsNotification" message.
	 */
	const LogsNotificationResult = type({
	  result: notificationResultAndContext(LogsResult),
	  subscription: number()
	});

	/**
	 * Filter for log subscriptions.
	 */

	/**
	 * Callback function for log notifications.
	 */

	/**
	 * Signature result
	 */

	/**
	 * Transaction error
	 */

	/**
	 * Transaction confirmation status
	 * <pre>
	 *   'processed': Transaction landed in a block which has reached 1 confirmation by the connected node
	 *   'confirmed': Transaction landed in a block which has reached 1 confirmation by the cluster
	 *   'finalized': Transaction landed in a block which has been finalized by the cluster
	 * </pre>
	 */

	/**
	 * Signature status
	 */

	/**
	 * A confirmed signature with its status
	 */

	/**
	 * An object defining headers to be passed to the RPC server
	 */

	/**
	 * Configuration for instantiating a Connection
	 */

	/**
	 * Configuration used to construct an HTTP JSON-RPC transport.
	 */

	/** @internal */
	const COMMON_HTTP_HEADERS = {
	  'solana-client': `js/${"2.0.0"}`
	};

	/**
	 * A connection to a fullnode JSON RPC endpoint
	 */
	class Connection {
	  /**
	   * Establish a JSON RPC connection
	   *
	   * @param endpoint URL to the fullnode JSON RPC endpoint
	   * @param commitmentOrConfig optional default commitment level or optional ConnectionConfig configuration object
	   */
	  constructor(endpoint, _commitmentOrConfig) {
	    /** @internal */
	    this._commitment = void 0;
	    /** @internal */
	    this._confirmTransactionInitialTimeout = void 0;
	    /** @internal */
	    this._rpc = void 0;
	    /** @internal */
	    this._rpcEndpoint = void 0;
	    /** @internal */
	    this._rpcHttpHeaders = void 0;
	    /** @internal */
	    this._rpcWsEndpoint = void 0;
	    /** @internal */
	    this._rpcTransport = void 0;
	    /** @internal */
	    this._typedRpc = void 0;
	    /** @internal */
	    this._rpcRequest = void 0;
	    /** @internal */
	    this._rpcBatchRequest = void 0;
	    /** @internal */
	    this._rpcWebSocket = void 0;
	    /** @internal */
	    this._rpcWebSocketConnected = false;
	    /** @internal */
	    this._rpcWebSocketHeartbeat = null;
	    /** @internal */
	    this._rpcWebSocketIdleTimeout = null;
	    /** @internal
	     * A number that we increment every time an active connection closes.
	     * Used to determine whether the same socket connection that was open
	     * when an async operation started is the same one that's active when
	     * its continuation fires.
	     *
	     */
	    this._rpcWebSocketGeneration = 0;
	    /** @internal */
	    this._disableBlockhashCaching = false;
	    /** @internal */
	    this._pollingBlockhash = false;
	    /** @internal */
	    this._blockhashInfo = {
	      latestBlockhash: null,
	      lastFetch: 0,
	      transactionSignatures: [],
	      simulatedSignatures: []
	    };
	    /** @internal */
	    this._nextClientSubscriptionId = 0;
	    /** @internal */
	    this._subscriptionDisposeFunctionsByClientSubscriptionId = {};
	    /** @internal */
	    this._subscriptionHashByClientSubscriptionId = {};
	    /** @internal */
	    this._subscriptionStateChangeCallbacksByHash = {};
	    /** @internal */
	    this._subscriptionCallbacksByServerSubscriptionId = {};
	    /** @internal */
	    this._subscriptionsByHash = {};
	    /**
	     * Special case.
	     * After a signature is processed, RPCs automatically dispose of the
	     * subscription on the server side. We need to track which of these
	     * subscriptions have been disposed in such a way, so that we know
	     * whether the client is dealing with a not-yet-processed signature
	     * (in which case we must tear down the server subscription) or an
	     * already-processed signature (in which case the client can simply
	     * clear out the subscription locally without telling the server).
	     *
	     * NOTE: There is a proposal to eliminate this special case, here:
	     * https://github.com/solana-labs/solana/issues/18892
	     */
	    /** @internal */
	    this._subscriptionsAutoDisposedByRpc = new Set();
	    /*
	     * Returns the current block height of the node
	     */
	    this.getBlockHeight = (() => {
	      const requestPromises = {};
	      return async commitmentOrConfig => {
	        const {
	          commitment,
	          config
	        } = extractCommitmentFromConfig(commitmentOrConfig);
	        const args = this._buildArgs([], commitment, undefined /* encoding */, config);
	        const requestHash = fastStableStringify(args);
	        requestPromises[requestHash] = requestPromises[requestHash] ?? (async () => {
	          try {
	            const unsafeRes = await this._rpcRequest('getBlockHeight', args);
	            const res = create(unsafeRes, jsonRpcResult(number()));
	            if ('error' in res) {
	              throw new SolanaJSONRPCError(res.error, 'failed to get block height information');
	            }
	            return res.result;
	          } finally {
	            delete requestPromises[requestHash];
	          }
	        })();
	        return await requestPromises[requestHash];
	      };
	    })();
	    let wsEndpoint;
	    let httpHeaders;
	    let disableRetryOnRateLimit;
	    if (_commitmentOrConfig && typeof _commitmentOrConfig === 'string') {
	      this._commitment = _commitmentOrConfig;
	    } else if (_commitmentOrConfig) {
	      this._commitment = _commitmentOrConfig.commitment;
	      this._confirmTransactionInitialTimeout = _commitmentOrConfig.confirmTransactionInitialTimeout;
	      wsEndpoint = _commitmentOrConfig.wsEndpoint;
	      httpHeaders = _commitmentOrConfig.httpHeaders;
	      disableRetryOnRateLimit = _commitmentOrConfig.disableRetryOnRateLimit;
	    }
	    this._rpcEndpoint = assertEndpointUrl(endpoint);
	    this._rpcHttpHeaders = httpHeaders;
	    this._rpcWsEndpoint = wsEndpoint || makeWebsocketUrl(endpoint);
	    const rpcTransportConfig = Object.freeze({
	      disableRetryOnRateLimit,
	      httpHeaders
	    });
	    const {
	      rpc,
	      typedRpc,
	      transport
	    } = createKitRpcClient(endpoint, rpcTransportConfig);
	    this._rpc = rpc;
	    this._rpcTransport = transport;
	    this._typedRpc = typedRpc;
	    this._rpcRequest = createKitRpcRequest(rpc);
	    this._rpcBatchRequest = createKitRpcBatchRequest(transport);
	    this._rpcWebSocket = new RpcWebSocketClient(this._rpcWsEndpoint, {
	      autoconnect: false,
	      max_reconnects: Infinity
	    });
	    this._rpcWebSocket.on('open', this._wsOnOpen.bind(this));
	    this._rpcWebSocket.on('error', this._wsOnError.bind(this));
	    this._rpcWebSocket.on('close', this._wsOnClose.bind(this));
	    this._rpcWebSocket.on('accountNotification', this._wsOnAccountNotification.bind(this));
	    this._rpcWebSocket.on('programNotification', this._wsOnProgramAccountNotification.bind(this));
	    this._rpcWebSocket.on('slotNotification', this._wsOnSlotNotification.bind(this));
	    this._rpcWebSocket.on('slotsUpdatesNotification', this._wsOnSlotUpdatesNotification.bind(this));
	    this._rpcWebSocket.on('signatureNotification', this._wsOnSignatureNotification.bind(this));
	    this._rpcWebSocket.on('rootNotification', this._wsOnRootNotification.bind(this));
	    this._rpcWebSocket.on('logsNotification', this._wsOnLogsNotification.bind(this));
	  }

	  /**
	   * The default commitment used for requests
	   */
	  get commitment() {
	    return this._commitment;
	  }

	  /**
	   * The RPC endpoint
	   */
	  get rpcEndpoint() {
	    return this._rpcEndpoint;
	  }

	  /**
	   * The HTTP headers used by this connection for JSON-RPC requests.
	   */
	  get rpcHttpHeaders() {
	    return this._rpcHttpHeaders;
	  }

	  /**
	   * Fetch the balance for the specified public key, return with context
	   */
	  async getBalanceAndContext(publicKey, commitmentOrConfig) {
	    /** @internal */
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([publicKey.toBase58()], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getBalance', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(number()));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get balance for ${publicKey.toBase58()}`);
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the balance for the specified public key
	   */
	  async getBalance(publicKey, commitmentOrConfig) {
	    return await this.getBalanceAndContext(publicKey, commitmentOrConfig).then(x => x.value).catch(e => {
	      throw new Error('failed to get balance of account ' + publicKey.toBase58() + ': ' + e);
	    });
	  }

	  /**
	   * Fetch the estimated production time of a block
	   */
	  async getBlockTime(slot) {
	    try {
	      return await this._typedRpc.getBlockTime(coerceNumericToBigInt(slot, 'slot')).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, `failed to get block time for slot ${slot}`);
	    }
	  }

	  /**
	   * Fetch the lowest slot that the node has information about in its ledger.
	   * This value may increase over time if the node is configured to purge older ledger data
	   */
	  async getMinimumLedgerSlot() {
	    try {
	      return await this._typedRpc.minimumLedgerSlot().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get minimum ledger slot');
	    }
	  }

	  /**
	   * Fetch the slot of the lowest confirmed block that has not been purged from the ledger
	   */
	  async getFirstAvailableBlock() {
	    try {
	      return await this._typedRpc.getFirstAvailableBlock().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get first available block');
	    }
	  }

	  /**
	   * Fetch information about the current supply
	   */
	  async getSupply(config) {
	    let configArg = {};
	    if (typeof config === 'string') {
	      configArg = {
	        commitment: config
	      };
	    } else if (config) {
	      configArg = {
	        ...config,
	        commitment: config && config.commitment || this.commitment
	      };
	    } else {
	      configArg = {
	        commitment: this.commitment
	      };
	    }
	    const unsafeRes = await this._rpcRequest('getSupply', [configArg]);
	    const res = create(unsafeRes, GetSupplyRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get supply');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the current supply of a token mint
	   */
	  async getTokenSupply(tokenMintAddress, commitmentOrConfig) {
	    const {
	      commitment
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const typedMintAddress = toKitAddress(tokenMintAddress);
	    const rpcCommitment = commitment ?? this._commitment;
	    try {
	      return await (rpcCommitment == null ? this._typedRpc.getTokenSupply(typedMintAddress) : this._typedRpc.getTokenSupply(typedMintAddress, {
	        commitment: rpcCommitment
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get token supply');
	    }
	  }

	  /**
	   * Fetch the current balance of a token account
	   */
	  async getTokenAccountBalance(tokenAddress, commitmentOrConfig) {
	    const {
	      commitment
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const typedTokenAddress = toKitAddress(tokenAddress);
	    const rpcCommitment = commitment ?? this._commitment;
	    try {
	      return await (rpcCommitment == null ? this._typedRpc.getTokenAccountBalance(typedTokenAddress) : this._typedRpc.getTokenAccountBalance(typedTokenAddress, {
	        commitment: rpcCommitment
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get token account balance');
	    }
	  }

	  /**
	   * Fetch all the token accounts owned by the specified account
	   *
	   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
	   */
	  async getTokenAccountsByOwner(ownerAddress, filter, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    let _args = [ownerAddress.toBase58()];
	    if ('mint' in filter) {
	      _args.push({
	        mint: filter.mint.toBase58()
	      });
	    } else {
	      _args.push({
	        programId: filter.programId.toBase58()
	      });
	    }
	    const args = this._buildArgs(_args, commitment, 'base64', config);
	    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
	    const res = create(unsafeRes, GetTokenAccountsByOwnerBytes);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get token accounts owned by account ${ownerAddress.toBase58()}`);
	    }
	    return res.result;
	  }

	  /**
	   * Fetch all the token accounts delegated to the specified account
	   *
	   * @return {Promise<RpcResponseAndContext<GetProgramAccountsResponse>}
	   */
	  async getTokenAccountsByDelegate(delegateAddress, filter, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    let _args = [delegateAddress.toBase58()];
	    if ('mint' in filter) {
	      _args.push({
	        mint: filter.mint.toBase58()
	      });
	    } else {
	      _args.push({
	        programId: filter.programId.toBase58()
	      });
	    }
	    const args = this._buildArgs(_args, commitment, 'base64', config);
	    const unsafeRes = await this._rpcRequest('getTokenAccountsByDelegate', args);
	    const res = create(unsafeRes, GetTokenAccountsByOwnerBytes);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get token accounts delegated to account ${delegateAddress.toBase58()}`);
	    }
	    return res.result;
	  }

	  /**
	   * Fetch parsed token accounts owned by the specified account
	   *
	   * @return {Promise<RpcResponseAndContext<Array<{pubkey: Address, account: AccountInfo<ParsedAccountData>}>>>}
	   */
	  async getParsedTokenAccountsByOwner(ownerAddress, filter, commitment) {
	    let _args = [ownerAddress.toBase58()];
	    if ('mint' in filter) {
	      _args.push({
	        mint: filter.mint.toBase58()
	      });
	    } else {
	      _args.push({
	        programId: filter.programId.toBase58()
	      });
	    }
	    const args = this._buildArgs(_args, commitment, 'jsonParsed');
	    const unsafeRes = await this._rpcRequest('getTokenAccountsByOwner', args);
	    const res = create(unsafeRes, GetParsedTokenAccountsByOwner);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get token accounts owned by account ${ownerAddress.toBase58()}`);
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the 20 largest accounts with their current balances
	   */
	  async getLargestAccounts(config) {
	    const rpcCommitment = config?.commitment ?? this._commitment;
	    const rpcConfig = {
	      ...(config?.filter != null ? {
	        filter: config.filter
	      } : null),
	      ...(rpcCommitment != null ? {
	        commitment: rpcCommitment
	      } : null)
	    };
	    try {
	      const result = await (config?.filter != null || rpcCommitment != null ? this._typedRpc.getLargestAccounts(rpcConfig) : this._typedRpc.getLargestAccounts()).send();
	      return {
	        ...result,
	        context: result.context,
	        value: result.value.map(account => ({
	          ...account,
	          address: new Address(account.address)
	        }))
	      };
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get largest accounts');
	    }
	  }

	  /**
	   * Fetch the 20 largest token accounts with their current balances
	   * for a given mint.
	   */
	  async getTokenLargestAccounts(mintAddress, commitmentOrConfig) {
	    const {
	      commitment
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const typedMintAddress = toKitAddress(mintAddress);
	    const rpcCommitment = commitment ?? this._commitment;
	    try {
	      const result = await (rpcCommitment == null ? this._typedRpc.getTokenLargestAccounts(typedMintAddress) : this._typedRpc.getTokenLargestAccounts(typedMintAddress, {
	        commitment: rpcCommitment
	      })).send();
	      return {
	        ...result,
	        context: result.context,
	        value: result.value.map(account => ({
	          ...account,
	          address: new Address(account.address)
	        }))
	      };
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get token largest accounts');
	    }
	  }

	  /**
	   * Fetch all the account info for the specified public key, return with context
	   */
	  async getAccountInfoAndContext(publicKey, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([publicKey.toBase58()], commitment, 'base64', config);
	    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(nullable(AccountInfoBytesResult)));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get info about account ${publicKey.toBase58()}`);
	    }
	    return {
	      ...res.result,
	      value: res.result.value
	    };
	  }

	  /**
	   * Fetch parsed account info for the specified public key
	   */
	  async getParsedAccountInfo(publicKey, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([publicKey.toBase58()], commitment, 'jsonParsed', config);
	    const unsafeRes = await this._rpcRequest('getAccountInfo', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(nullable(ParsedAccountInfoBytesResult)));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get info about account ${publicKey.toBase58()}`);
	    }
	    return {
	      ...res.result,
	      value: res.result.value
	    };
	  }

	  /**
	   * Fetch all the account info for the specified public key
	   */
	  async getAccountInfo(publicKey, commitmentOrConfig) {
	    try {
	      const {
	        commitment,
	        config
	      } = extractCommitmentFromConfig(commitmentOrConfig);
	      const typedPublicKey = toKitAddress(publicKey);
	      const rpcCommitment = commitment ?? this._commitment;
	      const minContextSlot = config?.minContextSlot;
	      const response = await this._typedRpc.getAccountInfo(typedPublicKey, {
	        commitment: rpcCommitment,
	        dataSlice: config?.dataSlice,
	        encoding: 'base64',
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      }).send();
	      if (response.value == null) {
	        return null;
	      }
	      const rentEpoch = response.value.rentEpoch;
	      const accountInfo = {
	        data: create(response.value.data, Uint8ArrayFromRawAccountData),
	        executable: response.value.executable,
	        lamports: response.value.lamports,
	        owner: new Address(response.value.owner),
	        rentEpoch
	      };
	      return accountInfo;
	    } catch (e) {
	      throw new Error('failed to get info about account ' + publicKey.toBase58() + ': ' + e);
	    }
	  }

	  /**
	   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
	   */
	  async getMultipleParsedAccounts(publicKeys, rawConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawConfig);
	    const keys = publicKeys.map(key => key.toBase58());
	    const args = this._buildArgs([keys], commitment, 'jsonParsed', config);
	    const unsafeRes = await this._rpcRequest('getMultipleAccounts', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(array(nullable(ParsedAccountInfoBytesResult))));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get info for accounts ${keys}`);
	    }
	    return {
	      ...res.result,
	      value: res.result.value
	    };
	  }

	  /**
	   * Fetch all the account info for multiple accounts specified by an array of public keys, return with context
	   */
	  async getMultipleAccountsInfoAndContext(publicKeys, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const keys = publicKeys.map(key => key.toBase58());
	    const args = this._buildArgs([keys], commitment, 'base64', config);
	    const unsafeRes = await this._rpcRequest('getMultipleAccounts', args);
	    const res = create(unsafeRes, jsonRpcResultAndContext(array(nullable(AccountInfoBytesResult))));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get info for accounts ${keys}`);
	    }
	    return {
	      ...res.result,
	      value: res.result.value
	    };
	  }

	  /**
	   * Fetch all the account info for multiple accounts specified by an array of public keys
	   */
	  async getMultipleAccountsInfo(publicKeys, commitmentOrConfig) {
	    const res = await this.getMultipleAccountsInfoAndContext(publicKeys, commitmentOrConfig);
	    return res.value;
	  }

	  /**
	   * Fetch all the accounts owned by the specified program id
	   *
	  * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array>}>>}
	   */

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  async getProgramAccounts(programId, configOrCommitment) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(configOrCommitment);
	    const {
	      encoding,
	      ...configWithoutEncoding
	    } = config || {};
	    const args = this._buildArgs([programId.toBase58()], commitment, encoding || 'base64', {
	      ...configWithoutEncoding,
	      ...(configWithoutEncoding.filters ? {
	        filters: applyDefaultMemcmpEncodingToFilters(configWithoutEncoding.filters)
	      } : null)
	    });
	    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
	    const baseSchema = array(KeyedAccountInfoBytesResult);
	    if (configWithoutEncoding.withContext === true) {
	      const res = create(unsafeRes, jsonRpcResultAndContext(baseSchema));
	      if ('error' in res) {
	        throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
	      }
	      return res.result;
	    }
	    const res = create(unsafeRes, jsonRpcResult(baseSchema));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
	    }
	    return res.result;
	  }

	  /**
	   * Fetch and parse all the accounts owned by the specified program id
	   *
	  * @return {Promise<Array<{pubkey: Address, account: AccountInfo<Uint8Array | ParsedAccountData>}>>}
	   */
	  async getParsedProgramAccounts(programId, configOrCommitment) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(configOrCommitment);
	    const args = this._buildArgs([programId.toBase58()], commitment, 'jsonParsed', config);
	    const unsafeRes = await this._rpcRequest('getProgramAccounts', args);
	    const res = create(unsafeRes, jsonRpcResult(array(KeyedParsedAccountInfoBytesResult)));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, `failed to get accounts owned by program ${programId.toBase58()}`);
	    }
	    return res.result;
	  }

	  /** @deprecated Instead, call `confirmTransaction` and pass in {@link TransactionConfirmationStrategy} */
	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  async confirmTransaction(strategy, commitment) {
	    let rawSignature;
	    if (typeof strategy == 'string') {
	      rawSignature = strategy;
	    } else {
	      const config = strategy;
	      if (config.abortSignal?.aborted) {
	        return Promise.reject(config.abortSignal.reason);
	      }
	      rawSignature = config.signature;
	    }
	    let decodedSignature;
	    try {
	      decodedSignature = BASE58_ENCODER.encode(rawSignature);
	    } catch (err) {
	      throw new Error('signature must be base58 encoded: ' + rawSignature);
	    }
	    assert$1(decodedSignature.length === 64, 'signature has invalid length');
	    if (typeof strategy === 'string') {
	      return await this.confirmTransactionUsingLegacyTimeoutStrategy({
	        commitment: commitment || this.commitment,
	        signature: rawSignature
	      });
	    } else if ('lastValidBlockHeight' in strategy) {
	      return await this.confirmTransactionUsingBlockHeightExceedanceStrategy({
	        commitment: commitment || this.commitment,
	        strategy
	      });
	    } else {
	      return await this.confirmTransactionUsingDurableNonceStrategy({
	        commitment: commitment || this.commitment,
	        strategy
	      });
	    }
	  }
	  getCancellationPromise(signal) {
	    return new Promise((_, reject) => {
	      if (signal == null) {
	        return;
	      }
	      if (signal.aborted) {
	        reject(signal.reason);
	      } else {
	        signal.addEventListener('abort', () => {
	          reject(signal.reason);
	        });
	      }
	    });
	  }
	  getTransactionConfirmationPromise({
	    commitment,
	    signature
	  }) {
	    let signatureSubscriptionId;
	    let disposeSignatureSubscriptionStateChangeObserver;
	    let done = false;
	    const confirmationPromise = new Promise((resolve, reject) => {
	      try {
	        signatureSubscriptionId = this.onSignature(signature, (result, context) => {
	          signatureSubscriptionId = undefined;
	          const response = {
	            context,
	            value: result
	          };
	          resolve({
	            __type: TransactionStatus.PROCESSED,
	            response
	          });
	        }, commitment);
	        const subscriptionSetupPromise = new Promise(resolveSubscriptionSetup => {
	          if (signatureSubscriptionId == null) {
	            resolveSubscriptionSetup();
	          } else {
	            disposeSignatureSubscriptionStateChangeObserver = this._onSubscriptionStateChange(signatureSubscriptionId, nextState => {
	              if (nextState === 'subscribed') {
	                resolveSubscriptionSetup();
	              }
	            });
	          }
	        });
	        (async () => {
	          await subscriptionSetupPromise;
	          if (done) return;
	          const response = await this.getSignatureStatus(signature);
	          if (done) return;
	          if (response == null) {
	            return;
	          }
	          const {
	            context,
	            value
	          } = response;
	          if (value == null) {
	            return;
	          }
	          if (value?.err) {
	            reject(value.err);
	          } else {
	            switch (commitment) {
	              case 'confirmed':
	                if (value.confirmationStatus === 'processed') {
	                  return;
	                }
	                break;
	              case 'finalized':
	                if (value.confirmationStatus === 'processed' || value.confirmationStatus === 'confirmed') {
	                  return;
	                }
	                break;
	              // exhaust enums to ensure full coverage
	              case 'processed':
	            }
	            done = true;
	            resolve({
	              __type: TransactionStatus.PROCESSED,
	              response: {
	                context,
	                value
	              }
	            });
	          }
	        })();
	      } catch (err) {
	        reject(err);
	      }
	    });
	    const abortConfirmation = () => {
	      if (disposeSignatureSubscriptionStateChangeObserver) {
	        disposeSignatureSubscriptionStateChangeObserver();
	        disposeSignatureSubscriptionStateChangeObserver = undefined;
	      }
	      if (signatureSubscriptionId != null) {
	        this.removeSignatureListener(signatureSubscriptionId);
	        signatureSubscriptionId = undefined;
	      }
	    };
	    return {
	      abortConfirmation,
	      confirmationPromise
	    };
	  }
	  async confirmTransactionUsingBlockHeightExceedanceStrategy({
	    commitment,
	    strategy: {
	      abortSignal,
	      lastValidBlockHeight,
	      signature
	    }
	  }) {
	    let done = false;
	    const expiryPromise = new Promise(resolve => {
	      const checkBlockHeight = async () => {
	        try {
	          const blockHeight = await this.getBlockHeight(commitment);
	          return blockHeight;
	        } catch (_e) {
	          return -1;
	        }
	      };
	      (async () => {
	        let currentBlockHeight = await checkBlockHeight();
	        if (done) return;
	        while (currentBlockHeight <= lastValidBlockHeight) {
	          await sleep(1000);
	          if (done) return;
	          currentBlockHeight = await checkBlockHeight();
	          if (done) return;
	        }
	        resolve({
	          __type: TransactionStatus.BLOCKHEIGHT_EXCEEDED
	        });
	      })();
	    });
	    const {
	      abortConfirmation,
	      confirmationPromise
	    } = this.getTransactionConfirmationPromise({
	      commitment,
	      signature
	    });
	    const cancellationPromise = this.getCancellationPromise(abortSignal);
	    let result;
	    try {
	      const outcome = await Promise.race([cancellationPromise, confirmationPromise, expiryPromise]);
	      if (outcome.__type === TransactionStatus.PROCESSED) {
	        result = outcome.response;
	      } else {
	        throw new TransactionExpiredBlockheightExceededError(signature);
	      }
	    } finally {
	      done = true;
	      abortConfirmation();
	    }
	    return result;
	  }
	  async confirmTransactionUsingDurableNonceStrategy({
	    commitment,
	    strategy: {
	      abortSignal,
	      minContextSlot,
	      nonceAccountPubkey,
	      nonceValue,
	      signature
	    }
	  }) {
	    let done = false;
	    const expiryPromise = new Promise(resolve => {
	      let currentNonceValue = nonceValue;
	      let lastCheckedSlot = null;
	      const getCurrentNonceValue = async () => {
	        try {
	          const {
	            context,
	            value: nonceAccount
	          } = await this.getNonceAndContext(nonceAccountPubkey, {
	            commitment,
	            minContextSlot
	          });
	          lastCheckedSlot = context.slot;
	          return nonceAccount?.nonce;
	        } catch (e) {
	          // If for whatever reason we can't reach/read the nonce
	          // account, just keep using the last-known value.
	          return currentNonceValue;
	        }
	      };
	      (async () => {
	        currentNonceValue = await getCurrentNonceValue();
	        if (done) return;
	        while (true // eslint-disable-line no-constant-condition
	        ) {
	          if (nonceValue !== currentNonceValue) {
	            resolve({
	              __type: TransactionStatus.NONCE_INVALID,
	              slotInWhichNonceDidAdvance: lastCheckedSlot
	            });
	            return;
	          }
	          await sleep(2000);
	          if (done) return;
	          currentNonceValue = await getCurrentNonceValue();
	          if (done) return;
	        }
	      })();
	    });
	    const {
	      abortConfirmation,
	      confirmationPromise
	    } = this.getTransactionConfirmationPromise({
	      commitment,
	      signature
	    });
	    const cancellationPromise = this.getCancellationPromise(abortSignal);
	    let result;
	    try {
	      const outcome = await Promise.race([cancellationPromise, confirmationPromise, expiryPromise]);
	      if (outcome.__type === TransactionStatus.PROCESSED) {
	        result = outcome.response;
	      } else {
	        // Double check that the transaction is indeed unconfirmed.
	        let signatureStatus;
	        while (true // eslint-disable-line no-constant-condition
	        ) {
	          const status = await this.getSignatureStatus(signature);
	          if (status == null) {
	            break;
	          }
	          if (status.context.slot < (outcome.slotInWhichNonceDidAdvance ?? minContextSlot)) {
	            await sleep(400);
	            continue;
	          }
	          signatureStatus = status;
	          break;
	        }
	        if (signatureStatus?.value) {
	          const commitmentForStatus = commitment || 'finalized';
	          const {
	            confirmationStatus
	          } = signatureStatus.value;
	          switch (commitmentForStatus) {
	            case 'processed':
	              if (confirmationStatus !== 'processed' && confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
	                throw new TransactionExpiredNonceInvalidError(signature);
	              }
	              break;
	            case 'confirmed':
	              if (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
	                throw new TransactionExpiredNonceInvalidError(signature);
	              }
	              break;
	            case 'finalized':
	              if (confirmationStatus !== 'finalized') {
	                throw new TransactionExpiredNonceInvalidError(signature);
	              }
	              break;
	            default:
	              // Exhaustive switch.
	              // eslint-disable-next-line @typescript-eslint/no-unused-vars
	              (_ => {})(commitmentForStatus);
	          }
	          result = {
	            context: signatureStatus.context,
	            value: {
	              err: signatureStatus.value.err
	            }
	          };
	        } else {
	          throw new TransactionExpiredNonceInvalidError(signature);
	        }
	      }
	    } finally {
	      done = true;
	      abortConfirmation();
	    }
	    return result;
	  }
	  async confirmTransactionUsingLegacyTimeoutStrategy({
	    commitment,
	    signature
	  }) {
	    let timeoutId;
	    const expiryPromise = new Promise(resolve => {
	      let timeoutMs = this._confirmTransactionInitialTimeout || 60 * 1000;
	      switch (commitment) {
	        case 'processed':
	        case 'confirmed':
	          timeoutMs = this._confirmTransactionInitialTimeout || 30 * 1000;
	          break;
	      }
	      timeoutId = setTimeout(() => resolve({
	        __type: TransactionStatus.TIMED_OUT,
	        timeoutMs
	      }), timeoutMs);
	    });
	    const {
	      abortConfirmation,
	      confirmationPromise
	    } = this.getTransactionConfirmationPromise({
	      commitment,
	      signature
	    });
	    let result;
	    try {
	      const outcome = await Promise.race([confirmationPromise, expiryPromise]);
	      if (outcome.__type === TransactionStatus.PROCESSED) {
	        result = outcome.response;
	      } else {
	        throw new TransactionExpiredTimeoutError(signature, outcome.timeoutMs / 1000);
	      }
	    } finally {
	      clearTimeout(timeoutId);
	      abortConfirmation();
	    }
	    return result;
	  }

	  /**
	   * Return the list of nodes that are currently participating in the cluster
	   */
	  async getClusterNodes() {
	    try {
	      return await this._typedRpc.getClusterNodes().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get cluster nodes');
	    }
	  }

	  /**
	   * Fetch the RPC node health status.
	   */
	  async getHealth() {
	    try {
	      return await this._typedRpc.getHealth().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get health');
	    }
	  }

	  /**
	   * Fetch the RPC node identity.
	   */
	  async getIdentity() {
	    try {
	      const response = await this._typedRpc.getIdentity().send();
	      return {
	        identity: new Address(response.identity)
	      };
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get identity');
	    }
	  }

	  /**
	   * Fetch the highest full and incremental snapshot slots available on the RPC node.
	   */
	  async getHighestSnapshotSlot() {
	    try {
	      return await this._typedRpc.getHighestSnapshotSlot().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get highest snapshot slot');
	    }
	  }

	  /**
	   * Fetch the highest slot seen by retransmit stage.
	   */
	  async getMaxRetransmitSlot() {
	    try {
	      return await this._typedRpc.getMaxRetransmitSlot().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get max retransmit slot');
	    }
	  }

	  /**
	   * Fetch the highest slot seen by blockstore.
	   */
	  async getMaxShredInsertSlot() {
	    try {
	      return await this._typedRpc.getMaxShredInsertSlot().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get max shred insert slot');
	    }
	  }

	  /**
	   * Return the list of nodes that are currently participating in the cluster
	   */
	  async getVoteAccounts(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getVoteAccounts', args);
	    const res = create(unsafeRes, GetVoteAccounts);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get vote accounts');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the current slot that the node is processing
	   */
	  async getSlot(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    try {
	      if (rpcCommitment == null && minContextSlot == null) {
	        return await this._typedRpc.getSlot().send();
	      }
	      return await this._typedRpc.getSlot({
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      }).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot');
	    }
	  }

	  /**
	   * Fetch the current slot leader of the cluster
	   */
	  async getSlotLeader(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    try {
	      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getSlotLeader() : this._typedRpc.getSlotLeader({
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leader');
	    }
	  }

	  /**
	   * Fetch `limit` number of slot leaders starting from `startSlot`
	   *
	   * @param startSlot fetch slot leaders starting from this slot
	   * @param limit number of slot leaders to return
	   */
	  async getSlotLeaders(startSlot, limit) {
	    try {
	      const response = await this._typedRpc.getSlotLeaders(coerceNumericToBigInt(startSlot, 'startSlot'), limit).send();
	      return response.map(address => new Address(address));
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get slot leaders');
	    }
	  }

	  /**
	   * Fetch the current status of a signature
	   */
	  async getSignatureStatus(signature, config) {
	    const {
	      context,
	      value: values
	    } = await this.getSignatureStatuses([signature], config);
	    assert$1(values.length === 1);
	    const value = values[0];
	    return {
	      context,
	      value
	    };
	  }

	  /**
	   * Fetch the current statuses of a batch of signatures
	   */
	  async getSignatureStatuses(signatures, config) {
	    const params = [signatures];
	    if (config) {
	      params.push(config);
	    }
	    const unsafeRes = await this._rpcRequest('getSignatureStatuses', params);
	    const res = create(unsafeRes, GetSignatureStatusesRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get signature status');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the current transaction count of the cluster
	   */
	  async getTransactionCount(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    try {
	      if (rpcCommitment == null && minContextSlot == null) {
	        return await this._typedRpc.getTransactionCount().send();
	      }
	      return await this._typedRpc.getTransactionCount({
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      }).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get transaction count');
	    }
	  }

	  /**
	   * Fetch the current total currency supply of the cluster in lamports
	   *
	   * @deprecated Deprecated since RPC v1.2.8. Please use {@link getSupply} instead.
	   */
	  async getTotalSupply(commitment) {
	    const result = await this.getSupply({
	      commitment,
	      excludeNonCirculatingAccountsList: true
	    });
	    return result.value.total;
	  }

	  /**
	   * Fetch the cluster InflationGovernor parameters
	   */
	  async getInflationGovernor(commitmentOrConfig) {
	    const {
	      commitment
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    try {
	      return await (rpcCommitment == null ? this._typedRpc.getInflationGovernor() : this._typedRpc.getInflationGovernor({
	        commitment: rpcCommitment
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation');
	    }
	  }

	  /**
	   * Fetch the inflation reward for a list of addresses for an epoch
	   */
	  async getInflationReward(addresses, epoch, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([addresses.map(pubkey => pubkey.toBase58())], commitment, undefined /* encoding */, {
	      ...config,
	      epoch: epoch != null ? epoch : config?.epoch
	    });
	    const unsafeRes = await this._rpcRequest('getInflationReward', args);
	    const res = create(unsafeRes, GetInflationRewardResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get inflation reward');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the specific inflation values for the current epoch
	   */
	  async getInflationRate() {
	    try {
	      return await this._typedRpc.getInflationRate().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get inflation rate');
	    }
	  }

	  /**
	   * Fetch the Epoch Info parameters
	   */
	  async getEpochInfo(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    try {
	      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getEpochInfo() : this._typedRpc.getEpochInfo({
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch info');
	    }
	  }

	  /**
	   * Fetch the Epoch Schedule parameters
	   */
	  async getEpochSchedule() {
	    try {
	      const epochSchedule = await this._typedRpc.getEpochSchedule().send();
	      return new EpochSchedule(epochSchedule.slotsPerEpoch, epochSchedule.leaderScheduleSlotOffset, epochSchedule.warmup, epochSchedule.firstNormalEpoch, epochSchedule.firstNormalSlot);
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get epoch schedule');
	    }
	  }

	  /**
	   * Fetch the leader schedule for the current epoch
	   * @return {Promise<RpcResponseAndContext<LeaderSchedule>>}
	   */
	  async getLeaderSchedule(slotOrCommitmentOrConfig, commitmentOrConfig) {
	    let slot;
	    let rawCommitmentOrConfig;
	    if (typeof slotOrCommitmentOrConfig === 'number' || typeof slotOrCommitmentOrConfig === 'bigint' || slotOrCommitmentOrConfig === null) {
	      slot = slotOrCommitmentOrConfig;
	      rawCommitmentOrConfig = commitmentOrConfig;
	    } else {
	      rawCommitmentOrConfig = slotOrCommitmentOrConfig;
	    }
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawCommitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const rpcIdentity = config?.identity;
	    const rpcConfig = {
	      ...(rpcCommitment != null ? {
	        commitment: rpcCommitment
	      } : null),
	      ...(rpcIdentity != null ? {
	        identity: rpcIdentity
	      } : null)
	    };
	    try {
	      if (slot === undefined) {
	        if (Object.keys(rpcConfig).length === 0) {
	          return await this._typedRpc.getLeaderSchedule().send();
	        }
	        return await this._typedRpc.getLeaderSchedule(null, rpcConfig).send();
	      }
	      if (slot === null) {
	        if (Object.keys(rpcConfig).length === 0) {
	          return await this._typedRpc.getLeaderSchedule(null).send();
	        }
	        return await this._typedRpc.getLeaderSchedule(null, rpcConfig).send();
	      }
	      if (Object.keys(rpcConfig).length === 0) {
	        return await this._typedRpc.getLeaderSchedule(coerceNumericToBigInt(slot, 'slot')).send();
	      }
	      return await this._typedRpc.getLeaderSchedule(coerceNumericToBigInt(slot, 'slot'), rpcConfig).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get leader schedule');
	    }
	  }

	  /**
	   * Fetch the minimum balance needed to exempt an account of `dataLength`
	   * size from rent
	   */
	  async getMinimumBalanceForRentExemption(dataLength, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([dataLength], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getMinimumBalanceForRentExemption', args);
	    const res = create(unsafeRes, GetMinimumBalanceForRentExemptionRpcResult);
	    if ('error' in res) {
	      console.warn('Unable to fetch minimum balance for rent exemption');
	      return 0;
	    }
	    return res.result;
	  }

	  /**
	   * Fetch recent performance samples
	    * @return {Promise<readonly PerfSample[]>}
	   */
	  async getRecentPerformanceSamples(limit) {
	    try {
	      return await (limit ? this._typedRpc.getRecentPerformanceSamples(limit) : this._typedRpc.getRecentPerformanceSamples()).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get recent performance samples');
	    }
	  }

	  /**
	   * Fetch the fee for a message from the cluster, return with context
	   */
	  async getFeeForMessage(message, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    const wireMessage = encodeBase64WireData(message.serialize());
	    try {
	      const response = await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.getFeeForMessage(wireMessage) : this._typedRpc.getFeeForMessage(wireMessage, {
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      })).send();
	      if (response.value === null) {
	        throw new Error('invalid blockhash');
	      }
	      return response;
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get fee for message');
	    }
	  }

	  /**
	   * Fetch a list of prioritization fees from recent blocks.
	   */
	  async getRecentPrioritizationFees(config) {
	    const accounts = config?.lockedWritableAccounts?.map(key => toKitAddress(key));
	    try {
	      return await (accounts == null ? this._typedRpc.getRecentPrioritizationFees() : this._typedRpc.getRecentPrioritizationFees(accounts)).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get recent prioritization fees');
	    }
	  }
	  /**
	   * Fetch the latest blockhash from the cluster
	   * @return {Promise<BlockhashWithExpiryBlockHeight>}
	   */
	  async getLatestBlockhash(commitmentOrConfig) {
	    try {
	      const res = await this.getLatestBlockhashAndContext(commitmentOrConfig);
	      return res.value;
	    } catch (e) {
	      throw new Error('failed to get recent blockhash: ' + e);
	    }
	  }

	  /**
	   * Fetch the latest blockhash from the cluster
	   * @return {Promise<BlockhashWithExpiryBlockHeight>}
	   */
	  async getLatestBlockhashAndContext(commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getLatestBlockhash', args);
	    const res = create(unsafeRes, GetLatestBlockhashRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get latest blockhash');
	    }
	    return res.result;
	  }

	  /**
	   * Returns whether a blockhash is still valid or not
	   */
	  async isBlockhashValid(blockhash, rawConfig) {
	    const rpcBlockhash = blockhash;
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    const minContextSlot = config?.minContextSlot;
	    try {
	      return await (rpcCommitment == null && minContextSlot == null ? this._typedRpc.isBlockhashValid(rpcBlockhash) : this._typedRpc.isBlockhashValid(rpcBlockhash, {
	        commitment: rpcCommitment,
	        minContextSlot: minContextSlot == null ? undefined : coerceNumericToBigInt(minContextSlot, 'minContextSlot')
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to determine if the blockhash `' + blockhash + '`is valid');
	    }
	  }

	  /**
	   * Fetch the node version
	   */
	  async getVersion() {
	    try {
	      return await this._typedRpc.getVersion().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get version');
	    }
	  }

	  /**
	   * Fetch the genesis hash
	   */
	  async getGenesisHash() {
	    try {
	      return await this._typedRpc.getGenesisHash().send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get genesis hash');
	    }
	  }

	  /**
	   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
	   * setting the `maxSupportedTransactionVersion` property.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
	   * setting the `maxSupportedTransactionVersion` property.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
	   * setting the `maxSupportedTransactionVersion` property.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Fetch a processed block from the cluster.
	   *
	   * @deprecated Instead, call `getBlock` using a `GetVersionedBlockConfig` by
	   * setting the `maxSupportedTransactionVersion` property.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Fetch a processed block from the cluster.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Fetch a processed block from the cluster.
	   */
	  // eslint-disable-next-line no-dupe-class-members
	  async getBlock(slot, rawConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawConfig);
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    try {
	      switch (config?.transactionDetails) {
	        case 'accounts':
	          {
	            const res = create(unsafeRes, GetAccountsModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        case 'none':
	          {
	            const res = create(unsafeRes, GetNoneModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        case 'signatures':
	          {
	            const res = create(unsafeRes, GetSignaturesModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        default:
	          {
	            const res = create(unsafeRes, GetBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            const {
	              result
	            } = res;
	            return result ? {
	              ...result,
	              transactions: result.transactions.map(({
	                transaction,
	                meta,
	                version
	              }) => ({
	                meta,
	                transaction: {
	                  ...transaction,
	                  message: versionedMessageFromResponse(version, transaction.message)
	                },
	                version
	              }))
	            } : null;
	          }
	      }
	    } catch (e) {
	      throw new SolanaJSONRPCError(e, 'failed to get confirmed block');
	    }
	  }

	  /**
	   * Fetch parsed transaction details for a confirmed or finalized block
	   */

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  async getParsedBlock(slot, rawConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawConfig);
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, 'jsonParsed', config);
	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    try {
	      switch (config?.transactionDetails) {
	        case 'accounts':
	          {
	            const res = create(unsafeRes, GetParsedAccountsModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        case 'none':
	          {
	            const res = create(unsafeRes, GetParsedNoneModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        case 'signatures':
	          {
	            const res = create(unsafeRes, GetParsedSignaturesModeBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	        default:
	          {
	            const res = create(unsafeRes, GetParsedBlockRpcResult);
	            if ('error' in res) {
	              throw res.error;
	            }
	            return res.result;
	          }
	      }
	    } catch (e) {
	      throw new SolanaJSONRPCError(e, 'failed to get block');
	    }
	  }
	  /*
	   * Returns recent block production information from the current or previous epoch
	   */
	  async getBlockProduction(configOrCommitment) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(configOrCommitment);
	    const rpcCommitment = commitment ?? this._commitment;
	    const rpcIdentity = config?.identity;
	    const rpcRange = config?.range == null ? undefined : {
	      firstSlot: coerceNumericToBigInt(config.range.firstSlot, 'firstSlot'),
	      ...(config.range.lastSlot == null ? null : {
	        lastSlot: coerceNumericToBigInt(config.range.lastSlot, 'lastSlot')
	      })
	    };
	    const rpcConfig = rpcCommitment == null && rpcIdentity == null && rpcRange == null ? undefined : {
	      ...(rpcCommitment != null ? {
	        commitment: rpcCommitment
	      } : null),
	      ...(rpcIdentity != null ? {
	        identity: rpcIdentity
	      } : null),
	      ...(rpcRange != null ? {
	        range: rpcRange
	      } : null)
	    };
	    try {
	      return await (rpcConfig == null ? this._typedRpc.getBlockProduction() : this._typedRpc.getBlockProduction(rpcConfig)).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get block production information');
	    }
	  }

	  /**
	   * Fetch a confirmed or finalized transaction from the cluster.
	   *
	   * @deprecated Instead, call `getTransaction` using a
	   * `GetVersionedTransactionConfig` by setting the
	   * `maxSupportedTransactionVersion` property.
	   */

	  /**
	   * Fetch a confirmed or finalized transaction from the cluster.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Fetch a confirmed or finalized transaction from the cluster.
	   */
	  // eslint-disable-next-line no-dupe-class-members
	  async getTransaction(signature, rawConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawConfig);
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetTransactionRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
	    }
	    const result = res.result;
	    if (!result) return result;
	    return {
	      ...result,
	      transaction: {
	        ...result.transaction,
	        message: versionedMessageFromResponse(result.version, result.transaction.message)
	      }
	    };
	  }

	  /**
	   * Fetch parsed transaction details for a confirmed or finalized transaction
	   */
	  async getParsedTransaction(signature, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed', config);
	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetParsedTransactionRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch parsed transaction details for a batch of confirmed transactions
	   */
	  async getParsedTransactions(signatures, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const batch = signatures.map(signature => {
	      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed', config);
	      return {
	        methodName: 'getTransaction',
	        args
	      };
	    });
	    const unsafeRes = await this._rpcBatchRequest(batch);
	    const res = unsafeRes.map(unsafeRes => {
	      const res = create(unsafeRes, GetParsedTransactionRpcResult);
	      if ('error' in res) {
	        throw new SolanaJSONRPCError(res.error, 'failed to get transactions');
	      }
	      return res.result;
	    });
	    return res;
	  }

	  /**
	   * Fetch transaction details for a batch of confirmed transactions.
	   * Similar to {@link getParsedTransactions} but returns a {@link TransactionResponse}.
	   *
	   * @deprecated Instead, call `getTransactions` using a
	   * `GetVersionedTransactionConfig` by setting the
	   * `maxSupportedTransactionVersion` property.
	   */

	  /**
	   * Fetch transaction details for a batch of confirmed transactions.
	   * Similar to {@link getParsedTransactions} but returns a {@link
	   * VersionedTransactionResponse}.
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Fetch transaction details for a batch of confirmed transactions.
	   * Similar to {@link getParsedTransactions} but returns a {@link
	   * VersionedTransactionResponse}.
	   */
	  // eslint-disable-next-line no-dupe-class-members
	  async getTransactions(signatures, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const batch = signatures.map(signature => {
	      const args = this._buildArgsAtLeastConfirmed([signature], commitment, undefined /* encoding */, config);
	      return {
	        methodName: 'getTransaction',
	        args
	      };
	    });
	    const unsafeRes = await this._rpcBatchRequest(batch);
	    const res = unsafeRes.map(unsafeRes => {
	      const res = create(unsafeRes, GetTransactionRpcResult);
	      if ('error' in res) {
	        throw new SolanaJSONRPCError(res.error, 'failed to get transactions');
	      }
	      const result = res.result;
	      if (!result) return result;
	      return {
	        ...result,
	        transaction: {
	          ...result.transaction,
	          message: versionedMessageFromResponse(result.version, result.transaction.message)
	        }
	      };
	    });
	    return res;
	  }

	  /**
	   * Fetch a list of Transactions and transaction statuses from the cluster
	   * for a confirmed block.
	   *
	   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlock} instead.
	   */
	  async getConfirmedBlock(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment);
	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    const res = create(unsafeRes, GetConfirmedBlockRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed block');
	    }
	    const result = res.result;
	    if (!result) {
	      throw new Error('Confirmed block ' + slot + ' not found');
	    }
	    const block = {
	      ...result,
	      transactions: result.transactions.map(({
	        transaction,
	        meta
	      }) => {
	        const message = new Message(transaction.message);
	        return {
	          meta,
	          transaction: {
	            ...transaction,
	            message
	          }
	        };
	      })
	    };
	    return {
	      ...block,
	      transactions: block.transactions.map(({
	        transaction,
	        meta
	      }) => {
	        return {
	          meta,
	          transaction: Transaction.populate(transaction.message, transaction.signatures)
	        };
	      })
	    };
	  }

	  /**
	   * Fetch confirmed blocks between two slots
	   */

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  async getBlocks(startSlot, endSlotOrCommitmentOrConfig, commitmentOrConfig) {
	    const slots = [startSlot];
	    let rawCommitmentOrConfig;
	    if (typeof endSlotOrCommitmentOrConfig === 'number') {
	      slots.push(endSlotOrCommitmentOrConfig);
	      rawCommitmentOrConfig = commitmentOrConfig;
	    } else {
	      rawCommitmentOrConfig = endSlotOrCommitmentOrConfig;
	    }
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(rawCommitmentOrConfig);
	    const args = this._buildArgsAtLeastConfirmed(slots, commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getBlocks', args);
	    const res = create(unsafeRes, jsonRpcResult(array(number())));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get blocks');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch confirmed blocks starting at the provided slot, limited to the requested length.
	   */

	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  async getBlocksWithLimit(startSlot, limit, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgsAtLeastConfirmed([startSlot, limit], commitment, undefined /* encoding */, config);
	    const unsafeRes = await this._rpcRequest('getBlocksWithLimit', args);
	    const res = create(unsafeRes, jsonRpcResult(array(number())));
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get blocks with limit');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch the amount of cluster stake that has voted on a block.
	   */
	  async getBlockCommitment(slot) {
	    try {
	      return await this._typedRpc.getBlockCommitment(coerceNumericToBigInt(slot, 'slot')).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get block commitment');
	    }
	  }

	  /**
	   * Fetch a list of Signatures from the cluster for a block, excluding rewards
	   */
	  async getBlockSignatures(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
	      transactionDetails: 'signatures',
	      rewards: false
	    });
	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    const res = create(unsafeRes, GetBlockSignaturesRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get block');
	    }
	    const result = res.result;
	    if (!result) {
	      throw new Error('Block ' + slot + ' not found');
	    }
	    return result;
	  }

	  /**
	   * Fetch a list of Signatures from the cluster for a confirmed block, excluding rewards
	   *
	   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getBlockSignatures} instead.
	   */
	  async getConfirmedBlockSignatures(slot, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([slot], commitment, undefined, {
	      transactionDetails: 'signatures',
	      rewards: false
	    });
	    const unsafeRes = await this._rpcRequest('getBlock', args);
	    const res = create(unsafeRes, GetBlockSignaturesRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed block');
	    }
	    const result = res.result;
	    if (!result) {
	      throw new Error('Confirmed block ' + slot + ' not found');
	    }
	    return result;
	  }

	  /**
	   * Fetch a transaction details for a confirmed transaction
	   *
	   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getTransaction} instead.
	   */
	  async getConfirmedTransaction(signature, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment);
	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetTransactionRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get transaction');
	    }
	    const result = res.result;
	    if (!result) return result;
	    const message = new Message(result.transaction.message);
	    const signatures = result.transaction.signatures;
	    return {
	      ...result,
	      transaction: Transaction.populate(message, signatures)
	    };
	  }

	  /**
	   * Fetch parsed transaction details for a confirmed transaction
	   *
	   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransaction} instead.
	   */
	  async getParsedConfirmedTransaction(signature, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');
	    const unsafeRes = await this._rpcRequest('getTransaction', args);
	    const res = create(unsafeRes, GetParsedTransactionRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get confirmed transaction');
	    }
	    return res.result;
	  }

	  /**
	   * Fetch parsed transaction details for a batch of confirmed transactions
	   *
	   * @deprecated Deprecated since RPC v1.7.0. Please use {@link getParsedTransactions} instead.
	   */
	  async getParsedConfirmedTransactions(signatures, commitment) {
	    const batch = signatures.map(signature => {
	      const args = this._buildArgsAtLeastConfirmed([signature], commitment, 'jsonParsed');
	      return {
	        methodName: 'getTransaction',
	        args
	      };
	    });
	    const unsafeRes = await this._rpcBatchRequest(batch);
	    const res = unsafeRes.map(unsafeRes => {
	      const res = create(unsafeRes, GetParsedTransactionRpcResult);
	      if ('error' in res) {
	        throw new SolanaJSONRPCError(res.error, 'failed to get confirmed transactions');
	      }
	      return res.result;
	    });
	    return res;
	  }

	  /**
	   * Returns confirmed signatures for transactions involving an
	   * address backwards in time from the provided signature or most recent confirmed block
	   *
	   *
	   * @param address queried address
	   * @param options
	   */
	  async getSignaturesForAddress(address, options, commitment) {
	    const args = this._buildArgsAtLeastConfirmed([address.toBase58()], commitment, undefined, options);
	    const unsafeRes = await this._rpcRequest('getSignaturesForAddress', args);
	    const res = create(unsafeRes, GetSignaturesForAddressRpcResult);
	    if ('error' in res) {
	      throw new SolanaJSONRPCError(res.error, 'failed to get signatures for address');
	    }
	    return res.result;
	  }
	  async getAddressLookupTable(accountKey, config) {
	    const {
	      context,
	      value: accountInfo
	    } = await this.getAccountInfoAndContext(accountKey, config);
	    let value = null;
	    if (accountInfo !== null) {
	      value = new AddressLookupTableAccount({
	        key: accountKey,
	        state: AddressLookupTableAccount.deserialize(accountInfo.data)
	      });
	    }
	    return {
	      context,
	      value
	    };
	  }

	  /**
	   * Fetch the contents of a Nonce account from the cluster, return with context
	   */
	  async getNonceAndContext(nonceAccount, commitmentOrConfig) {
	    const {
	      context,
	      value: accountInfo
	    } = await this.getAccountInfoAndContext(nonceAccount, commitmentOrConfig);
	    let value = null;
	    if (accountInfo !== null) {
	      value = NonceAccount.fromAccountData(accountInfo.data);
	    }
	    return {
	      context,
	      value
	    };
	  }

	  /**
	   * Fetch the contents of a Nonce account from the cluster
	   */
	  async getNonce(nonceAccount, commitmentOrConfig) {
	    return await this.getNonceAndContext(nonceAccount, commitmentOrConfig).then(x => x.value).catch(e => {
	      throw new Error('failed to get nonce for account ' + nonceAccount.toBase58() + ': ' + e);
	    });
	  }

	  /**
	   * Request an allocation of lamports to the specified address
	   *
	   * ```typescript
	   * import { Connection, Address, LAMPORTS_PER_SOL } from "@solana/web3.js";
	   *
	   * (async () => {
	   *   const connection = new Connection("https://api.testnet.solana.com", "confirmed");
	   *   const myAddress = new Address("2nr1bHFT86W9tGnyvmYW4vcHKsQB3sVQfnddasz4kExM");
	   *   const signature = await connection.requestAirdrop(myAddress, LAMPORTS_PER_SOL);
	   *   await connection.confirmTransaction(signature);
	   * })();
	   * ```
	   */
	  async requestAirdrop(to, lamports$1, commitmentOrConfig) {
	    const {
	      commitment
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const rpcCommitment = commitment ?? this._commitment;
	    try {
	      return await (rpcCommitment == null ? this._typedRpc.requestAirdrop(toKitAddress(to), lamports(coerceNumericToBigInt(lamports$1, 'lamports'))) : this._typedRpc.requestAirdrop(toKitAddress(to), lamports(coerceNumericToBigInt(lamports$1, 'lamports')), {
	        commitment: rpcCommitment
	      })).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, `airdrop to ${to.toBase58()} failed`);
	    }
	  }

	  /**
	   * @internal
	   */
	  async _blockhashWithExpiryBlockHeight(disableCache) {
	    if (!disableCache) {
	      // Wait for polling to finish
	      while (this._pollingBlockhash) {
	        await sleep(100);
	      }
	      const timeSinceFetch = Date.now() - this._blockhashInfo.lastFetch;
	      const expired = timeSinceFetch >= BLOCKHASH_CACHE_TIMEOUT_MS;
	      if (this._blockhashInfo.latestBlockhash !== null && !expired) {
	        return this._blockhashInfo.latestBlockhash;
	      }
	    }
	    return await this._pollNewBlockhash();
	  }

	  /**
	   * @internal
	   */
	  async _pollNewBlockhash() {
	    this._pollingBlockhash = true;
	    try {
	      const startTime = Date.now();
	      const cachedLatestBlockhash = this._blockhashInfo.latestBlockhash;
	      const cachedBlockhash = cachedLatestBlockhash ? cachedLatestBlockhash.blockhash : null;
	      for (let i = 0; i < 50; i++) {
	        const latestBlockhash = await this.getLatestBlockhash('finalized');
	        if (cachedBlockhash !== latestBlockhash.blockhash) {
	          this._blockhashInfo = {
	            latestBlockhash,
	            lastFetch: Date.now(),
	            transactionSignatures: [],
	            simulatedSignatures: []
	          };
	          return latestBlockhash;
	        }

	        // Sleep for approximately half a slot
	        await sleep(MS_PER_SLOT / 2);
	      }
	      throw new Error(`Unable to obtain a new blockhash after ${Date.now() - startTime}ms`);
	    } finally {
	      this._pollingBlockhash = false;
	    }
	  }

	  /**
	   * get the stake minimum delegation
	   */
	  async getStakeMinimumDelegation(config) {
	    try {
	      return await this._typedRpc.getStakeMinimumDelegation(config).send();
	    } catch (error) {
	      throwSolanaRpcErrorIfNeeded(error, 'failed to get stake minimum delegation');
	    }
	  }

	  /**
	   * Simulate a transaction
	   *
	   * @deprecated Instead, call {@link simulateTransaction} with {@link
	   * VersionedTransaction} and {@link SimulateTransactionConfig} parameters
	   */

	  /**
	   * Simulate a transaction
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Simulate a transaction
	   */
	  // eslint-disable-next-line no-dupe-class-members
	  async simulateTransaction(transactionOrMessage, configOrSigners, includeAccounts) {
	    if ('message' in transactionOrMessage) {
	      const versionedTx = transactionOrMessage;
	      const wireTransaction = versionedTx.serialize();
	      const encodedTransaction = encodeBase64WireData(wireTransaction);
	      if (Array.isArray(configOrSigners) || includeAccounts !== undefined) {
	        throw new Error('Invalid arguments');
	      }
	      const config = configOrSigners || {};
	      config.encoding = 'base64';
	      if (!('commitment' in config)) {
	        config.commitment = this.commitment;
	      }
	      if (configOrSigners && typeof configOrSigners === 'object' && 'innerInstructions' in configOrSigners) {
	        config.innerInstructions = configOrSigners.innerInstructions;
	      }
	      const args = [encodedTransaction, config];
	      const unsafeRes = await this._rpcRequest('simulateTransaction', args);
	      const res = create(unsafeRes, SimulatedTransactionResponseStruct);
	      if ('error' in res) {
	        throw new Error('failed to simulate transaction: ' + res.error.message);
	      }
	      return res.result;
	    }
	    let transaction;
	    if (transactionOrMessage instanceof Transaction) {
	      let originalTx = transactionOrMessage;
	      transaction = new Transaction();
	      transaction.feePayer = originalTx.feePayer;
	      transaction.instructions = transactionOrMessage.instructions;
	      transaction.nonceInfo = originalTx.nonceInfo;
	      transaction.signatures = originalTx.signatures;
	    } else {
	      transaction = Transaction.populate(transactionOrMessage);
	      // HACK: this function relies on mutating the populated transaction
	      transaction._message = transaction._json = undefined;
	    }
	    if (configOrSigners !== undefined && !Array.isArray(configOrSigners)) {
	      throw new Error('Invalid arguments');
	    }
	    const signers = configOrSigners;
	    if (transaction.nonceInfo && signers) {
	      await transaction.sign(...signers);
	    } else {
	      let disableCache = this._disableBlockhashCaching;
	      for (;;) {
	        const latestBlockhash = await this._blockhashWithExpiryBlockHeight(disableCache);
	        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
	        transaction.recentBlockhash = latestBlockhash.blockhash;
	        if (!signers) break;
	        await transaction.sign(...signers);
	        if (!transaction.signature) {
	          throw new Error('!signature'); // should never happen
	        }
	        const signature = encodeBase64WireData(transaction.signature);
	        if (!this._blockhashInfo.simulatedSignatures.includes(signature) && !this._blockhashInfo.transactionSignatures.includes(signature)) {
	          // The signature of this transaction has not been seen before with the
	          // current recentBlockhash, all done. Let's break
	          this._blockhashInfo.simulatedSignatures.push(signature);
	          break;
	        } else {
	          // This transaction would be treated as duplicate (its derived signature
	          // matched to one of already recorded signatures).
	          // So, we must fetch a new blockhash for a different signature by disabling
	          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
	          disableCache = true;
	        }
	      }
	    }
	    const message = transaction._compile();
	    const signData = message.serialize();
	    const wireTransaction = transaction._serialize(signData);
	    const encodedTransaction = encodeBase64WireData(wireTransaction);
	    const config = {
	      encoding: 'base64',
	      commitment: this.commitment
	    };
	    if (includeAccounts) {
	      const addresses = (Array.isArray(includeAccounts) ? includeAccounts : message.nonProgramIds()).map(key => key.toBase58());
	      config['accounts'] = {
	        encoding: 'base64',
	        addresses
	      };
	    }
	    if (signers) {
	      config.sigVerify = true;
	    }
	    if (configOrSigners && typeof configOrSigners === 'object' && 'innerInstructions' in configOrSigners) {
	      config.innerInstructions = configOrSigners.innerInstructions;
	    }
	    const args = [encodedTransaction, config];
	    const unsafeRes = await this._rpcRequest('simulateTransaction', args);
	    const res = create(unsafeRes, SimulatedTransactionResponseStruct);
	    if ('error' in res) {
	      let logs;
	      if ('data' in res.error) {
	        logs = res.error.data.logs;
	        if (logs && Array.isArray(logs)) {
	          const traceIndent = '\n    ';
	          const logTrace = traceIndent + logs.join(traceIndent);
	          console.error(res.error.message, logTrace);
	        }
	      }
	      throw new SendTransactionError({
	        action: 'simulate',
	        signature: '',
	        transactionMessage: res.error.message,
	        logs: logs
	      });
	    }
	    return res.result;
	  }

	  /**
	   * Sign and send a transaction
	   *
	   * @deprecated Instead, call {@link sendTransaction} with a {@link
	   * VersionedTransaction}
	   */

	  /**
	   * Send a signed transaction
	   */
	  // eslint-disable-next-line no-dupe-class-members

	  /**
	   * Sign and send a transaction
	   */
	  // eslint-disable-next-line no-dupe-class-members
	  async sendTransaction(transaction, signersOrOptions, options) {
	    if ('version' in transaction) {
	      if (signersOrOptions && Array.isArray(signersOrOptions)) {
	        throw new Error('Invalid arguments');
	      }
	      const wireTransaction = transaction.serialize();
	      return await this.sendRawTransaction(wireTransaction, signersOrOptions);
	    }
	    if (signersOrOptions === undefined || !Array.isArray(signersOrOptions)) {
	      throw new Error('Invalid arguments');
	    }
	    const signers = signersOrOptions;
	    if (transaction.nonceInfo) {
	      await transaction.sign(...signers);
	    } else {
	      let disableCache = this._disableBlockhashCaching;
	      for (;;) {
	        const latestBlockhash = await this._blockhashWithExpiryBlockHeight(disableCache);
	        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
	        transaction.recentBlockhash = latestBlockhash.blockhash;
	        await transaction.sign(...signers);
	        if (!transaction.signature) {
	          throw new Error('!signature'); // should never happen
	        }
	        const signature = encodeBase64WireData(transaction.signature);
	        if (!this._blockhashInfo.transactionSignatures.includes(signature)) {
	          // The signature of this transaction has not been seen before with the
	          // current recentBlockhash, all done. Let's break
	          this._blockhashInfo.transactionSignatures.push(signature);
	          break;
	        } else {
	          // This transaction would be treated as duplicate (its derived signature
	          // matched to one of already recorded signatures).
	          // So, we must fetch a new blockhash for a different signature by disabling
	          // our cache not to wait for the cache expiration (BLOCKHASH_CACHE_TIMEOUT_MS).
	          disableCache = true;
	        }
	      }
	    }
	    const wireTransaction = transaction.serialize();
	    return await this.sendRawTransaction(wireTransaction, options);
	  }

	  /**
	   * Send a transaction that has already been signed and serialized into the
	   * wire format
	   */
	  async sendRawTransaction(rawTransaction, options) {
	    const encodedTransaction = encodeBase64WireData(toUint8ArrayView(rawTransaction));
	    const result = await this.sendEncodedTransaction(encodedTransaction, options);
	    return result;
	  }

	  /**
	   * Send a transaction that has already been signed, serialized into the
	   * wire format, and encoded as a base64 string
	   */
	  async sendEncodedTransaction(encodedTransaction, options) {
	    const config = {
	      encoding: 'base64'
	    };
	    const skipPreflight = options && options.skipPreflight;
	    const preflightCommitment = skipPreflight === true ? 'processed' // FIXME Remove when https://github.com/anza-xyz/agave/pull/483 is deployed.
	    : options && options.preflightCommitment || this.commitment;
	    if (options && options.maxRetries != null) {
	      config.maxRetries = options.maxRetries;
	    }
	    if (options && options.minContextSlot != null) {
	      config.minContextSlot = options.minContextSlot;
	    }
	    if (skipPreflight) {
	      config.skipPreflight = skipPreflight;
	    }
	    if (preflightCommitment) {
	      config.preflightCommitment = preflightCommitment;
	    }
	    const args = [encodedTransaction, config];
	    const unsafeRes = await this._rpcRequest('sendTransaction', args);
	    const res = create(unsafeRes, SendTransactionRpcResult);
	    if ('error' in res) {
	      let logs = undefined;
	      if ('data' in res.error) {
	        logs = res.error.data.logs;
	      }
	      throw new SendTransactionError({
	        action: skipPreflight ? 'send' : 'simulate',
	        signature: '',
	        transactionMessage: res.error.message,
	        logs: logs
	      });
	    }
	    return res.result;
	  }

	  /**
	   * @internal
	   */
	  _wsOnOpen() {
	    this._rpcWebSocketConnected = true;
	    this._rpcWebSocketHeartbeat = setInterval(() => {
	      // Ping server every 5s to prevent idle timeouts
	      (async () => {
	        try {
	          await this._rpcWebSocket.notify('ping');
	          // eslint-disable-next-line no-empty
	        } catch {}
	      })();
	    }, 5000);
	    this._updateSubscriptions();
	  }

	  /**
	   * @internal
	   */
	  _wsOnError(err) {
	    this._rpcWebSocketConnected = false;
	    console.error('ws error:', err.message);
	  }

	  /**
	   * @internal
	   */
	  _wsOnClose(code) {
	    this._rpcWebSocketConnected = false;
	    this._rpcWebSocketGeneration = (this._rpcWebSocketGeneration + 1) % Number.MAX_SAFE_INTEGER;
	    if (this._rpcWebSocketIdleTimeout) {
	      clearTimeout(this._rpcWebSocketIdleTimeout);
	      this._rpcWebSocketIdleTimeout = null;
	    }
	    if (this._rpcWebSocketHeartbeat) {
	      clearInterval(this._rpcWebSocketHeartbeat);
	      this._rpcWebSocketHeartbeat = null;
	    }
	    if (code === 1000) {
	      // explicit close, check if any subscriptions have been made since close
	      this._updateSubscriptions();
	      return;
	    }

	    // implicit close, prepare subscriptions for auto-reconnect
	    this._subscriptionCallbacksByServerSubscriptionId = {};
	    Object.entries(this._subscriptionsByHash).forEach(([hash, subscription]) => {
	      this._setSubscription(hash, {
	        ...subscription,
	        state: 'pending'
	      });
	    });
	  }

	  /**
	   * @internal
	   */
	  _setSubscription(hash, nextSubscription) {
	    const prevState = this._subscriptionsByHash[hash]?.state;
	    this._subscriptionsByHash[hash] = nextSubscription;
	    if (prevState !== nextSubscription.state) {
	      const stateChangeCallbacks = this._subscriptionStateChangeCallbacksByHash[hash];
	      if (stateChangeCallbacks) {
	        stateChangeCallbacks.forEach(cb => {
	          try {
	            cb(nextSubscription.state);
	            // eslint-disable-next-line no-empty
	          } catch {}
	        });
	      }
	    }
	  }

	  /**
	   * @internal
	   */
	  _onSubscriptionStateChange(clientSubscriptionId, callback) {
	    const hash = this._subscriptionHashByClientSubscriptionId[clientSubscriptionId];
	    if (hash == null) {
	      return () => {};
	    }
	    const stateChangeCallbacks = this._subscriptionStateChangeCallbacksByHash[hash] ||= new Set();
	    stateChangeCallbacks.add(callback);
	    return () => {
	      stateChangeCallbacks.delete(callback);
	      if (stateChangeCallbacks.size === 0) {
	        delete this._subscriptionStateChangeCallbacksByHash[hash];
	      }
	    };
	  }

	  /**
	   * @internal
	   */
	  async _updateSubscriptions() {
	    if (Object.keys(this._subscriptionsByHash).length === 0) {
	      if (this._rpcWebSocketConnected) {
	        this._rpcWebSocketConnected = false;
	        this._rpcWebSocketIdleTimeout = setTimeout(() => {
	          this._rpcWebSocketIdleTimeout = null;
	          try {
	            this._rpcWebSocket.close();
	          } catch (err) {
	            // swallow error if socket has already been closed.
	            if (err instanceof Error) {
	              console.log(`Error when closing socket connection: ${err.message}`);
	            }
	          }
	        }, 500);
	      }
	      return;
	    }
	    if (this._rpcWebSocketIdleTimeout !== null) {
	      clearTimeout(this._rpcWebSocketIdleTimeout);
	      this._rpcWebSocketIdleTimeout = null;
	      this._rpcWebSocketConnected = true;
	    }
	    if (!this._rpcWebSocketConnected) {
	      this._rpcWebSocket.connect();
	      return;
	    }
	    const activeWebSocketGeneration = this._rpcWebSocketGeneration;
	    const isCurrentConnectionStillActive = () => {
	      return activeWebSocketGeneration === this._rpcWebSocketGeneration;
	    };
	    await Promise.all(
	    // Don't be tempted to change this to `Object.entries`. We call
	    // `_updateSubscriptions` recursively when processing the state,
	    // so it's important that we look up the *current* version of
	    // each subscription, every time we process a hash.
	    Object.keys(this._subscriptionsByHash).map(async hash => {
	      const subscription = this._subscriptionsByHash[hash];
	      if (subscription === undefined) {
	        // This entry has since been deleted. Skip.
	        return;
	      }
	      switch (subscription.state) {
	        case 'pending':
	        case 'unsubscribed':
	          if (subscription.callbacks.size === 0) {
	            /**
	             * You can end up here when:
	             *
	             * - a subscription has recently unsubscribed
	             *   without having new callbacks added to it
	             *   while the unsubscribe was in flight, or
	             * - when a pending subscription has its
	             *   listeners removed before a request was
	             *   sent to the server.
	             *
	             * Being that nobody is interested in this
	             * subscription any longer, delete it.
	             */
	            delete this._subscriptionsByHash[hash];
	            if (subscription.state === 'unsubscribed') {
	              delete this._subscriptionCallbacksByServerSubscriptionId[subscription.serverSubscriptionId];
	            }
	            await this._updateSubscriptions();
	            return;
	          }
	          await (async () => {
	            const {
	              args,
	              method
	            } = subscription;
	            try {
	              this._setSubscription(hash, {
	                ...subscription,
	                state: 'subscribing'
	              });
	              const serverSubscriptionId = await this._rpcWebSocket.call(method, args);
	              this._setSubscription(hash, {
	                ...subscription,
	                serverSubscriptionId,
	                state: 'subscribed'
	              });
	              this._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId] = subscription.callbacks;
	              await this._updateSubscriptions();
	            } catch (e) {
	              console.error(`Received ${e instanceof Error ? '' : 'JSON-RPC '}error calling \`${method}\``, {
	                args,
	                error: e
	              });
	              if (!isCurrentConnectionStillActive()) {
	                return;
	              }
	              // TODO: Maybe add an 'errored' state or a retry limit?
	              this._setSubscription(hash, {
	                ...subscription,
	                state: 'pending'
	              });
	              await this._updateSubscriptions();
	            }
	          })();
	          break;
	        case 'subscribed':
	          if (subscription.callbacks.size === 0) {
	            // By the time we successfully set up a subscription
	            // with the server, the client stopped caring about it.
	            // Tear it down now.
	            await (async () => {
	              const {
	                serverSubscriptionId,
	                unsubscribeMethod
	              } = subscription;
	              if (this._subscriptionsAutoDisposedByRpc.has(serverSubscriptionId)) {
	                /**
	                 * Special case.
	                 * If we're dealing with a subscription that has been auto-
	                 * disposed by the RPC, then we can skip the RPC call to
	                 * tear down the subscription here.
	                 *
	                 * NOTE: There is a proposal to eliminate this special case, here:
	                 * https://github.com/solana-labs/solana/issues/18892
	                 */
	                this._subscriptionsAutoDisposedByRpc.delete(serverSubscriptionId);
	              } else {
	                this._setSubscription(hash, {
	                  ...subscription,
	                  state: 'unsubscribing'
	                });
	                this._setSubscription(hash, {
	                  ...subscription,
	                  state: 'unsubscribing'
	                });
	                try {
	                  await this._rpcWebSocket.call(unsubscribeMethod, [serverSubscriptionId]);
	                } catch (e) {
	                  if (e instanceof Error) {
	                    console.error(`${unsubscribeMethod} error:`, e.message);
	                  }
	                  if (!isCurrentConnectionStillActive()) {
	                    return;
	                  }
	                  // TODO: Maybe add an 'errored' state or a retry limit?
	                  this._setSubscription(hash, {
	                    ...subscription,
	                    state: 'subscribed'
	                  });
	                  await this._updateSubscriptions();
	                  return;
	                }
	              }
	              this._setSubscription(hash, {
	                ...subscription,
	                state: 'unsubscribed'
	              });
	              await this._updateSubscriptions();
	            })();
	          }
	          break;
	      }
	    }));
	  }

	  /**
	   * @internal
	   */
	  _handleServerNotification(serverSubscriptionId, callbackArgs) {
	    const callbacks = this._subscriptionCallbacksByServerSubscriptionId[serverSubscriptionId];
	    if (callbacks === undefined) {
	      return;
	    }
	    callbacks.forEach(cb => {
	      try {
	        cb(
	        // I failed to find a way to convince TypeScript that `cb` is of type
	        // `TCallback` which is certainly compatible with `Parameters<TCallback>`.
	        // See https://github.com/microsoft/TypeScript/issues/47615
	        // @ts-ignore
	        ...callbackArgs);
	      } catch (e) {
	        console.error(e);
	      }
	    });
	  }

	  /**
	   * @internal
	   */
	  _wsOnAccountNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, AccountNotificationResult);
	    this._handleServerNotification(subscription, [result.value, result.context]);
	  }

	  /**
	   * @internal
	   */
	  _makeSubscription(subscriptionConfig,
	  /**
	   * When preparing `args` for a call to `_makeSubscription`, be sure
	   * to carefully apply a default `commitment` property, if necessary.
	   *
	   * - If the user supplied a `commitment` use that.
	   * - Otherwise, if the `Connection::commitment` is set, use that.
	   * - Otherwise, set it to the RPC server default: `finalized`.
	   *
	   * This is extremely important to ensure that these two fundamentally
	   * identical subscriptions produce the same identifying hash:
	   *
	   * - A subscription made without specifying a commitment.
	   * - A subscription made where the commitment specified is the same
	   *   as the default applied to the subscription above.
	   *
	   * Example; these two subscriptions must produce the same hash:
	   *
	   * - An `accountSubscribe` subscription for `'PUBKEY'`
	   * - An `accountSubscribe` subscription for `'PUBKEY'` with commitment
	   *   `'finalized'`.
	   *
	   * See the 'making a subscription with defaulted params omitted' test
	   * in `connection-subscriptions.ts` for more.
	   */
	  args) {
	    const clientSubscriptionId = this._nextClientSubscriptionId++;
	    const hash = fastStableStringify([subscriptionConfig.method, args]);
	    const existingSubscription = this._subscriptionsByHash[hash];
	    if (existingSubscription === undefined) {
	      this._subscriptionsByHash[hash] = {
	        ...subscriptionConfig,
	        args,
	        callbacks: new Set([subscriptionConfig.callback]),
	        state: 'pending'
	      };
	    } else {
	      existingSubscription.callbacks.add(subscriptionConfig.callback);
	    }
	    this._subscriptionHashByClientSubscriptionId[clientSubscriptionId] = hash;
	    this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId] = async () => {
	      delete this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];
	      delete this._subscriptionHashByClientSubscriptionId[clientSubscriptionId];
	      const subscription = this._subscriptionsByHash[hash];
	      assert$1(subscription !== undefined, `Could not find a \`Subscription\` when tearing down client subscription #${clientSubscriptionId}`);
	      subscription.callbacks.delete(subscriptionConfig.callback);
	      await this._updateSubscriptions();
	    };
	    this._updateSubscriptions();
	    return clientSubscriptionId;
	  }

	  /**
	   * Register a callback to be invoked whenever the specified account changes
	   *
	   * @param publicKey Public key of the account to monitor
	   * @param callback Function to invoke whenever the account is changed
	   * @param config
	   * @return subscription id
	   */

	  /** @deprecated Instead, pass in an {@link AccountSubscriptionConfig} */
	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  onAccountChange(publicKey, callback, commitmentOrConfig) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([publicKey.toBase58()], commitment || this._commitment || 'finalized',
	    // Apply connection/server default.
	    'base64', config);
	    return this._makeSubscription({
	      callback,
	      method: 'accountSubscribe',
	      unsubscribeMethod: 'accountUnsubscribe'
	    }, args);
	  }

	  /**
	   * Deregister an account notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeAccountChangeListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'account change');
	  }

	  /**
	   * @internal
	   */
	  _wsOnProgramAccountNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, ProgramAccountNotificationResult);
	    this._handleServerNotification(subscription, [{
	      accountId: result.value.pubkey,
	      accountInfo: result.value.account
	    }, result.context]);
	  }

	  /**
	   * Register a callback to be invoked whenever accounts owned by the
	   * specified program change
	   *
	   * @param programId Public key of the program to monitor
	   * @param callback Function to invoke whenever the account is changed
	   * @param config
	   * @return subscription id
	   */

	  /** @deprecated Instead, pass in a {@link ProgramAccountSubscriptionConfig} */
	  // eslint-disable-next-line no-dupe-class-members

	  // eslint-disable-next-line no-dupe-class-members
	  onProgramAccountChange(programId, callback, commitmentOrConfig, maybeFilters) {
	    const {
	      commitment,
	      config
	    } = extractCommitmentFromConfig(commitmentOrConfig);
	    const args = this._buildArgs([programId.toBase58()], commitment || this._commitment || 'finalized',
	    // Apply connection/server default.
	    'base64' /* encoding */, config ? config : maybeFilters ? {
	      filters: applyDefaultMemcmpEncodingToFilters(maybeFilters)
	    } : undefined /* extra */);
	    return this._makeSubscription({
	      callback,
	      method: 'programSubscribe',
	      unsubscribeMethod: 'programUnsubscribe'
	    }, args);
	  }

	  /**
	   * Deregister an account notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeProgramAccountChangeListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'program account change');
	  }

	  /**
	   * Registers a callback to be invoked whenever logs are emitted.
	   */
	  onLogs(filter, callback, commitment) {
	    const args = this._buildArgs([typeof filter === 'object' ? {
	      mentions: [filter.toString()]
	    } : filter], commitment || this._commitment || 'finalized' // Apply connection/server default.
	    );
	    return this._makeSubscription({
	      callback,
	      method: 'logsSubscribe',
	      unsubscribeMethod: 'logsUnsubscribe'
	    }, args);
	  }

	  /**
	   * Deregister a logs callback.
	   *
	   * @param clientSubscriptionId client subscription id to deregister.
	   */
	  async removeOnLogsListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'logs');
	  }

	  /**
	   * @internal
	   */
	  _wsOnLogsNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, LogsNotificationResult);
	    this._handleServerNotification(subscription, [result.value, result.context]);
	  }

	  /**
	   * @internal
	   */
	  _wsOnSlotNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, SlotNotificationResult);
	    this._handleServerNotification(subscription, [result]);
	  }

	  /**
	   * Register a callback to be invoked upon slot changes
	   *
	   * @param callback Function to invoke whenever the slot changes
	   * @return subscription id
	   */
	  onSlotChange(callback) {
	    return this._makeSubscription({
	      callback,
	      method: 'slotSubscribe',
	      unsubscribeMethod: 'slotUnsubscribe'
	    }, [] /* args */);
	  }

	  /**
	   * Deregister a slot notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeSlotChangeListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'slot change');
	  }

	  /**
	   * @internal
	   */
	  _wsOnSlotUpdatesNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, SlotUpdateNotificationResult);
	    this._handleServerNotification(subscription, [result]);
	  }

	  /**
	   * Register a callback to be invoked upon slot updates. {@link SlotUpdate}'s
	   * may be useful to track live progress of a cluster.
	   *
	   * @param callback Function to invoke whenever the slot updates
	   * @return subscription id
	   */
	  onSlotUpdate(callback) {
	    return this._makeSubscription({
	      callback,
	      method: 'slotsUpdatesSubscribe',
	      unsubscribeMethod: 'slotsUpdatesUnsubscribe'
	    }, [] /* args */);
	  }

	  /**
	   * Deregister a slot update notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeSlotUpdateListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'slot update');
	  }

	  /**
	   * @internal
	   */

	  async _unsubscribeClientSubscription(clientSubscriptionId, subscriptionName) {
	    const dispose = this._subscriptionDisposeFunctionsByClientSubscriptionId[clientSubscriptionId];
	    if (dispose) {
	      await dispose();
	    } else {
	      console.warn('Ignored unsubscribe request because an active subscription with id ' + `\`${clientSubscriptionId}\` for '${subscriptionName}' events ` + 'could not be found.');
	    }
	  }
	  _buildArgs(args, override, encoding, extra) {
	    const commitment = override || this._commitment;
	    if (commitment || encoding || extra) {
	      let options = {};
	      if (encoding) {
	        options.encoding = encoding;
	      }
	      if (commitment) {
	        options.commitment = commitment;
	      }
	      if (extra) {
	        options = Object.assign(options, extra);
	      }
	      args.push(options);
	    }
	    return args;
	  }

	  /**
	   * @internal
	   */
	  _buildArgsAtLeastConfirmed(args, override, encoding, extra) {
	    const commitment = override || this._commitment;
	    if (commitment && !['confirmed', 'finalized'].includes(commitment)) {
	      throw new Error('Using Connection with default commitment: `' + this._commitment + '`, but method requires at least `confirmed`');
	    }
	    return this._buildArgs(args, override, encoding, extra);
	  }

	  /**
	   * @internal
	   */
	  _wsOnSignatureNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, SignatureNotificationResult);
	    if (result.value !== 'receivedSignature') {
	      /**
	       * Special case.
	       * After a signature is processed, RPCs automatically dispose of the
	       * subscription on the server side. We need to track which of these
	       * subscriptions have been disposed in such a way, so that we know
	       * whether the client is dealing with a not-yet-processed signature
	       * (in which case we must tear down the server subscription) or an
	       * already-processed signature (in which case the client can simply
	       * clear out the subscription locally without telling the server).
	       *
	       * NOTE: There is a proposal to eliminate this special case, here:
	       * https://github.com/solana-labs/solana/issues/18892
	       */
	      this._subscriptionsAutoDisposedByRpc.add(subscription);
	    }
	    this._handleServerNotification(subscription, result.value === 'receivedSignature' ? [{
	      type: 'received'
	    }, result.context] : [{
	      type: 'status',
	      result: result.value
	    }, result.context]);
	  }

	  /**
	   * Register a callback to be invoked upon signature updates
	   *
	   * @param signature Transaction signature string in base 58
	   * @param callback Function to invoke on signature notifications
	   * @param commitment Specify the commitment level signature must reach before notification
	   * @return subscription id
	   */
	  onSignature(signature, callback, commitment) {
	    const args = this._buildArgs([signature], commitment || this._commitment || 'finalized' // Apply connection/server default.
	    );
	    const clientSubscriptionId = this._makeSubscription({
	      callback: (notification, context) => {
	        if (notification.type === 'status') {
	          callback(notification.result, context);
	          // Signatures subscriptions are auto-removed by the RPC service
	          // so no need to explicitly send an unsubscribe message.
	          try {
	            this.removeSignatureListener(clientSubscriptionId);
	            // eslint-disable-next-line no-empty
	          } catch (_err) {
	            // Already removed.
	          }
	        }
	      },
	      method: 'signatureSubscribe',
	      unsubscribeMethod: 'signatureUnsubscribe'
	    }, args);
	    return clientSubscriptionId;
	  }

	  /**
	   * Register a callback to be invoked when a transaction is
	   * received and/or processed.
	   *
	   * @param signature Transaction signature string in base 58
	   * @param callback Function to invoke on signature notifications
	   * @param options Enable received notifications and set the commitment
	   *   level that signature must reach before notification
	   * @return subscription id
	   */
	  onSignatureWithOptions(signature, callback, options) {
	    const {
	      commitment,
	      ...extra
	    } = {
	      ...options,
	      commitment: options && options.commitment || this._commitment || 'finalized' // Apply connection/server default.
	    };
	    const args = this._buildArgs([signature], commitment, undefined /* encoding */, extra);
	    const clientSubscriptionId = this._makeSubscription({
	      callback: (notification, context) => {
	        callback(notification, context);
	        // Signatures subscriptions are auto-removed by the RPC service
	        // so no need to explicitly send an unsubscribe message.
	        try {
	          this.removeSignatureListener(clientSubscriptionId);
	          // eslint-disable-next-line no-empty
	        } catch (_err) {
	          // Already removed.
	        }
	      },
	      method: 'signatureSubscribe',
	      unsubscribeMethod: 'signatureUnsubscribe'
	    }, args);
	    return clientSubscriptionId;
	  }

	  /**
	   * Deregister a signature notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeSignatureListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'signature result');
	  }

	  /**
	   * @internal
	   */
	  _wsOnRootNotification(notification) {
	    const {
	      result,
	      subscription
	    } = create(notification, RootNotificationResult);
	    this._handleServerNotification(subscription, [result]);
	  }

	  /**
	   * Register a callback to be invoked upon root changes
	   *
	   * @param callback Function to invoke whenever the root changes
	   * @return subscription id
	   */
	  onRootChange(callback) {
	    return this._makeSubscription({
	      callback,
	      method: 'rootSubscribe',
	      unsubscribeMethod: 'rootUnsubscribe'
	    }, [] /* args */);
	  }

	  /**
	   * Deregister a root notification callback
	   *
	   * @param clientSubscriptionId client subscription id to deregister
	   */
	  async removeRootChangeListener(clientSubscriptionId) {
	    await this._unsubscribeClientSubscription(clientSubscriptionId, 'root change');
	  }
	}

	function _classPrivateFieldLooseBase(e, t) {
	  if (!{}.hasOwnProperty.call(e, t)) throw new TypeError("attempted to use private field on non-instance");
	  return e;
	}
	var id = 0;
	function _classPrivateFieldLooseKey(e) {
	  return "__private_" + id++ + "_" + e;
	}

	/**
	 * Keypair signer interface
	 */
	var _keypair = /*#__PURE__*/_classPrivateFieldLooseKey("keypair");
	var _privateKeyBytes = /*#__PURE__*/_classPrivateFieldLooseKey("privateKeyBytes");
	var _publicKeyBytes = /*#__PURE__*/_classPrivateFieldLooseKey("publicKeyBytes");
	/**
	 * An account keypair backed by WebCrypto.
	 */
	class Keypair {
	  constructor(keypair, privateKeyBytes, publicKeyBytes) {
	    Object.defineProperty(this, _keypair, {
	      writable: true,
	      value: void 0
	    });
	    Object.defineProperty(this, _privateKeyBytes, {
	      writable: true,
	      value: void 0
	    });
	    Object.defineProperty(this, _publicKeyBytes, {
	      writable: true,
	      value: void 0
	    });
	    _classPrivateFieldLooseBase(this, _keypair)[_keypair] = keypair;
	    _classPrivateFieldLooseBase(this, _privateKeyBytes)[_privateKeyBytes] = privateKeyBytes;
	    _classPrivateFieldLooseBase(this, _publicKeyBytes)[_publicKeyBytes] = publicKeyBytes;
	  }

	  /**
	   * Generate a new random keypair
	   *
	   * @returns {Promise<Keypair>} Keypair
	   */
	  static async generate() {
	    const privateKeyBytes = new Uint8Array(32);
	    globalThis.crypto.getRandomValues(privateKeyBytes);
	    return this.fromSeed(privateKeyBytes);
	  }

	  /**
	   * Create a keypair from a raw 64-byte secret key byte array.
	   */
	  static async fromSecretKey(secretKey) {
	    const packedSecretKey = Uint8Array.from(secretKey);
	    const keypair = await createKeyPairFromBytes(packedSecretKey);
	    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
	    return new Keypair(keypair, packedSecretKey.slice(0, 32), publicKeyBytes);
	  }

	  /**
	   * Create a keypair from a 32-byte seed.
	   */
	  static async fromSeed(seed) {
	    const packedSeed = Uint8Array.from(seed);
	    const keypair = await createKeyPairFromPrivateKeyBytes(packedSeed);
	    const publicKeyBytes = await exportCryptoKeyBytes(keypair.publicKey);
	    return new Keypair(keypair, packedSeed, publicKeyBytes);
	  }

	  /**
	   * The public key for this keypair
	   *
	   * @returns {Address} Address
	   */
	  get publicKey() {
	    return new Address(_classPrivateFieldLooseBase(this, _publicKeyBytes)[_publicKeyBytes]);
	  }

	  /**
	   * Returns this keypair's secret key bytes.
	   */
	  get secretKey() {
	    const secretKey = new Uint8Array(64);
	    secretKey.set(_classPrivateFieldLooseBase(this, _privateKeyBytes)[_privateKeyBytes]);
	    secretKey.set(_classPrivateFieldLooseBase(this, _publicKeyBytes)[_publicKeyBytes], 32);
	    return secretKey;
	  }

	  /**
	   * Sign a message using this keypair.
	   */
	  async signBytes(message) {
	    const privateKey = _classPrivateFieldLooseBase(this, _keypair)[_keypair].privateKey;
	    const signMessage = toPackedUint8Array(message);
	    return signBytes(privateKey, signMessage);
	  }

	  /**
	   * Verify a signature using this keypair's public key.
	   */
	  async verifySignature(signature, message) {
	    const publicKey = _classPrivateFieldLooseBase(this, _keypair)[_keypair].publicKey;
	    const verifySignatureBytes = signatureBytes(toPackedUint8Array(signature));
	    const verifyMessage = toPackedUint8Array(message);
	    return verifySignature(publicKey, verifySignatureBytes, verifyMessage);
	  }
	}
	async function exportCryptoKeyBytes(key) {
	  assertKeyExporterIsAvailable();
	  const rawKey = await globalThis.crypto.subtle.exportKey('raw', key);
	  return new Uint8Array(rawKey);
	}

	/**
	 * An enumeration of valid LookupTableInstructionType's
	 */

	const ADDRESS_LOOKUP_TABLE_PROGRAM_ID = new Address('AddressLookupTab1e1111111111111111111111111');
	const U8_CODEC$3 = getU8Codec();
	const U32_CODEC$4 = getU32Codec();
	const U64_CODEC$4 = getU64Codec();
	const PUBLIC_KEY_BYTES_CODEC$2 = fixCodecSize(getBytesCodec(), 32);
	const PUBLIC_KEY_CODEC$1 = transformCodec(PUBLIC_KEY_BYTES_CODEC$2, value => value.toBytes(), bytes => new Address(bytes));
	const PUBLIC_KEY_ARRAY_CODEC = getArrayCodec(PUBLIC_KEY_CODEC$1, {
	  size: U64_CODEC$4
	});
	const INSTRUCTION_DEFS$2 = {
	  CreateLookupTable: {
	    index: 0,
	    codec: getStructCodec([['instruction', U32_CODEC$4], ['recentSlot', U64_CODEC$4], ['bumpSeed', U8_CODEC$3]])
	  },
	  FreezeLookupTable: {
	    index: 1,
	    codec: getStructCodec([['instruction', U32_CODEC$4]])
	  },
	  ExtendLookupTable: {
	    index: 2,
	    codec: getStructCodec([['instruction', U32_CODEC$4], ['addresses', PUBLIC_KEY_ARRAY_CODEC]])
	  },
	  DeactivateLookupTable: {
	    index: 3,
	    codec: getStructCodec([['instruction', U32_CODEC$4]])
	  },
	  CloseLookupTable: {
	    index: 4,
	    codec: getStructCodec([['instruction', U32_CODEC$4]])
	  }
	};

	/**
	 * @internal
	 */
	const LOOKUP_TABLE_INSTRUCTIONS = ProgramInstructions.create({
	  programId: ADDRESS_LOOKUP_TABLE_PROGRAM_ID,
	  instructionIndexCodec: U32_CODEC$4,
	  instructions: INSTRUCTION_DEFS$2
	});
	const INSTRUCTIONS$3 = LOOKUP_TABLE_INSTRUCTIONS;

	/**
	 * An enumeration of valid address lookup table InstructionType's
	 * @internal
	 * @deprecated use LOOKUP_TABLE_INSTRUCTIONS instead. To be removed in v3
	 */
	const LOOKUP_TABLE_INSTRUCTION_LAYOUTS = Object.freeze({
	  CreateLookupTable: {
	    index: 0,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), u64('recentSlot'), LayoutExports.u8('bumpSeed')])
	  },
	  FreezeLookupTable: {
	    index: 1,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  ExtendLookupTable: {
	    index: 2,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), u64(), LayoutExports.seq(publicKey(), LayoutExports.offset(LayoutExports.u32(), -8), 'addresses')])
	  },
	  DeactivateLookupTable: {
	    index: 3,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  CloseLookupTable: {
	    index: 4,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  }
	});
	class AddressLookupTableInstruction {
	  /**
	   * @internal
	   */
	  constructor() {}
	  static decodeInstructionType(instruction) {
	    this.checkProgramId(instruction.programId);
	    return INSTRUCTIONS$3.getInstructionType(instruction);
	  }
	  static decodeCreateLookupTable(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeysLength(instruction.keys, 4);
	    const {
	      recentSlot
	    } = INSTRUCTIONS$3.CreateLookupTable.decode(instruction);
	    return {
	      authority: instruction.keys[1].pubkey,
	      payer: instruction.keys[2].pubkey,
	      recentSlot: Number(recentSlot)
	    };
	  }
	  static decodeExtendLookupTable(instruction) {
	    this.checkProgramId(instruction.programId);
	    if (instruction.keys.length < 2) {
	      throw new Error(`invalid instruction; found ${instruction.keys.length} keys, expected at least 2`);
	    }
	    const {
	      addresses
	    } = INSTRUCTIONS$3.ExtendLookupTable.decode(instruction);
	    return {
	      lookupTable: instruction.keys[0].pubkey,
	      authority: instruction.keys[1].pubkey,
	      payer: instruction.keys.length > 2 ? instruction.keys[2].pubkey : undefined,
	      addresses
	    };
	  }
	  static decodeCloseLookupTable(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeysLength(instruction.keys, 3);
	    return {
	      lookupTable: instruction.keys[0].pubkey,
	      authority: instruction.keys[1].pubkey,
	      recipient: instruction.keys[2].pubkey
	    };
	  }
	  static decodeFreezeLookupTable(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeysLength(instruction.keys, 2);
	    return {
	      lookupTable: instruction.keys[0].pubkey,
	      authority: instruction.keys[1].pubkey
	    };
	  }
	  static decodeDeactivateLookupTable(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeysLength(instruction.keys, 2);
	    return {
	      lookupTable: instruction.keys[0].pubkey,
	      authority: instruction.keys[1].pubkey
	    };
	  }

	  /**
	   * @internal
	   */
	  static checkProgramId(programId) {
	    if (!programId.equals(AddressLookupTableProgram.programId)) {
	      throw new Error('invalid instruction; programId is not AddressLookupTable Program');
	    }
	  }
	  /**
	   * @internal
	   */
	  static checkKeysLength(keys, expectedLength) {
	    if (keys.length < expectedLength) {
	      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
	    }
	  }
	}
	class AddressLookupTableProgram {
	  /**
	   * @internal
	   */
	  constructor() {}
	  static createLookupTable(params) {
	    const [lookupTableAddress, bumpSeed] = Address.findProgramAddressSync([params.authority.toBytes(), getU64Encoder().encode(params.recentSlot)], this.programId);
	    const keys = [{
	      pubkey: lookupTableAddress,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: params.authority,
	      isSigner: true,
	      isWritable: false
	    }, {
	      pubkey: params.payer,
	      isSigner: true,
	      isWritable: true
	    }, {
	      pubkey: SystemProgram.programId,
	      isSigner: false,
	      isWritable: false
	    }];
	    const instruction = INSTRUCTIONS$3.CreateLookupTable.build({
	      recentSlot: BigInt(params.recentSlot),
	      bumpSeed: bumpSeed
	    }, {
	      keys
	    });
	    return [instruction, lookupTableAddress];
	  }
	  static freezeLookupTable(params) {
	    const keys = [{
	      pubkey: params.lookupTable,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: params.authority,
	      isSigner: true,
	      isWritable: false
	    }];
	    return INSTRUCTIONS$3.FreezeLookupTable.build(params, {
	      keys
	    });
	  }
	  static extendLookupTable(params) {
	    const keys = [{
	      pubkey: params.lookupTable,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: params.authority,
	      isSigner: true,
	      isWritable: false
	    }];
	    if (params.payer) {
	      keys.push({
	        pubkey: params.payer,
	        isSigner: true,
	        isWritable: true
	      }, {
	        pubkey: SystemProgram.programId,
	        isSigner: false,
	        isWritable: false
	      });
	    }
	    return INSTRUCTIONS$3.ExtendLookupTable.build(params, {
	      keys
	    });
	  }
	  static deactivateLookupTable(params) {
	    const keys = [{
	      pubkey: params.lookupTable,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: params.authority,
	      isSigner: true,
	      isWritable: false
	    }];
	    return INSTRUCTIONS$3.DeactivateLookupTable.build(params, {
	      keys
	    });
	  }
	  static closeLookupTable(params) {
	    const keys = [{
	      pubkey: params.lookupTable,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: params.authority,
	      isSigner: true,
	      isWritable: false
	    }, {
	      pubkey: params.recipient,
	      isSigner: false,
	      isWritable: true
	    }];
	    return INSTRUCTIONS$3.CloseLookupTable.build(params, {
	      keys
	    });
	  }
	}
	AddressLookupTableProgram.programId = ADDRESS_LOOKUP_TABLE_PROGRAM_ID;

	const COMPUTE_BUDGET_PROGRAM_ID = new Address('ComputeBudget111111111111111111111111111111');
	const U8_CODEC$2 = getU8Codec();
	const U32_CODEC$3 = getU32Codec();
	const U64_CODEC$3 = getU64Codec();

	/**
	 * An enumeration of valid ComputeBudgetInstructionType's
	 */

	/**
	 * Request units instruction params
	 */

	/**
	 * Request heap frame instruction params
	 */

	/**
	 * Set compute unit limit instruction params
	 */

	/**
	 * Set compute unit price instruction params
	 */

	const INSTRUCTION_DEFS$1 = {
	  RequestUnits: {
	    index: 0,
	    codec: getStructCodec([['instruction', U8_CODEC$2], ['units', U32_CODEC$3], ['additionalFee', U32_CODEC$3]])
	  },
	  RequestHeapFrame: {
	    index: 1,
	    codec: getStructCodec([['instruction', U8_CODEC$2], ['bytes', U32_CODEC$3]])
	  },
	  SetComputeUnitLimit: {
	    index: 2,
	    codec: getStructCodec([['instruction', U8_CODEC$2], ['units', U32_CODEC$3]])
	  },
	  SetComputeUnitPrice: {
	    index: 3,
	    codec: getStructCodec([['instruction', U8_CODEC$2], ['microLamports', U64_CODEC$3]])
	  }
	};

	/**
	 * @internal
	 */
	const COMPUTE_BUDGET_INSTRUCTIONS = ProgramInstructions.create({
	  programId: COMPUTE_BUDGET_PROGRAM_ID,
	  instructionIndexCodec: U8_CODEC$2,
	  instructions: INSTRUCTION_DEFS$1
	});
	const INSTRUCTIONS$2 = COMPUTE_BUDGET_INSTRUCTIONS;

	/**
	 * An enumeration of valid ComputeBudget InstructionType's
	 * @deprecated Use compute budget instruction codecs instead. To be removed in v3
	 * @internal
	 */
	const COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = Object.freeze({
	  RequestUnits: {
	    index: 0,
	    layout: LayoutExports.struct([LayoutExports.u8('instruction'), LayoutExports.u32('units'), LayoutExports.u32('additionalFee')])
	  },
	  RequestHeapFrame: {
	    index: 1,
	    layout: LayoutExports.struct([LayoutExports.u8('instruction'), LayoutExports.u32('bytes')])
	  },
	  SetComputeUnitLimit: {
	    index: 2,
	    layout: LayoutExports.struct([LayoutExports.u8('instruction'), LayoutExports.u32('units')])
	  },
	  SetComputeUnitPrice: {
	    index: 3,
	    layout: LayoutExports.struct([LayoutExports.u8('instruction'), u64('microLamports')])
	  }
	});

	/**
	 * Factory class for transaction instructions to interact with the Compute Budget program
	 */
	class ComputeBudgetProgram {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the Compute Budget program
	   */

	  /**
	   * @deprecated Instead, call {@link setComputeUnitLimit} and/or {@link setComputeUnitPrice}
	   */
	  static requestUnits(params) {
	    return INSTRUCTIONS$2.RequestUnits.build(params);
	  }
	  static requestHeapFrame(params) {
	    return INSTRUCTIONS$2.RequestHeapFrame.build(params);
	  }
	  static setComputeUnitLimit(params) {
	    return INSTRUCTIONS$2.SetComputeUnitLimit.build(params);
	  }
	  static setComputeUnitPrice(params) {
	    return INSTRUCTIONS$2.SetComputeUnitPrice.build(params);
	  }
	}
	ComputeBudgetProgram.programId = COMPUTE_BUDGET_PROGRAM_ID;

	const PRIVATE_KEY_BYTES$1 = 64;
	const PUBLIC_KEY_BYTES$1 = 32;
	const SIGNATURE_BYTES$1 = 64;

	/**
	 * Params for creating an ed25519 instruction using a public key
	 */

	/**
	 * Params for creating an ed25519 instruction using a private key
	 */

	const ED25519_INSTRUCTION_HEADER_ENCODER = getStructEncoder([['numSignatures', getU8Encoder()], ['padding', getU8Encoder()], ['signatureOffset', getU16Encoder()], ['signatureInstructionIndex', getU16Encoder()], ['publicKeyOffset', getU16Encoder()], ['publicKeyInstructionIndex', getU16Encoder()], ['messageDataOffset', getU16Encoder()], ['messageDataSize', getU16Encoder()], ['messageInstructionIndex', getU16Encoder()]]);
	class Ed25519Program {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the ed25519 program
	   */

	  /**
	   * Create an ed25519 instruction with a public key and signature. The
	   * public key must be 32 bytes long, and the signature must be 64 bytes
	   * long.
	   */
	  static createInstructionWithPublicKey(params) {
	    const {
	      publicKey,
	      message,
	      signature,
	      instructionIndex
	    } = params;
	    assert$1(publicKey.length === PUBLIC_KEY_BYTES$1, `Public Key must be ${PUBLIC_KEY_BYTES$1} bytes but received ${publicKey.length} bytes`);
	    assert$1(signature.length === SIGNATURE_BYTES$1, `Signature must be ${SIGNATURE_BYTES$1} bytes but received ${signature.length} bytes`);
	    const publicKeyOffset = ED25519_INSTRUCTION_HEADER_ENCODER.fixedSize;
	    const signatureOffset = publicKeyOffset + publicKey.length;
	    const messageDataOffset = signatureOffset + signature.length;
	    const numSignatures = 1;
	    const index = instructionIndex == null ? 0xffff // An index of `u16::MAX` makes it default to the current instruction.
	    : instructionIndex;
	    const instructionData = new Uint8Array(messageDataOffset + message.length);
	    ED25519_INSTRUCTION_HEADER_ENCODER.write({
	      numSignatures,
	      padding: 0,
	      signatureOffset,
	      signatureInstructionIndex: index,
	      publicKeyOffset,
	      publicKeyInstructionIndex: index,
	      messageDataOffset,
	      messageDataSize: message.length,
	      messageInstructionIndex: index
	    }, instructionData, 0);
	    instructionData.set(publicKey, publicKeyOffset);
	    instructionData.set(signature, signatureOffset);
	    instructionData.set(message, messageDataOffset);
	    return new TransactionInstruction({
	      keys: [],
	      programId: Ed25519Program.programId,
	      data: instructionData
	    });
	  }

	  /**
	   * Create an ed25519 instruction with a private key. The private key
	   * must be 64 bytes long.
	   */
	  static async createInstructionWithPrivateKey(params) {
	    const {
	      privateKey,
	      message,
	      instructionIndex
	    } = params;
	    assert$1(privateKey.length === PRIVATE_KEY_BYTES$1, `Private key must be ${PRIVATE_KEY_BYTES$1} bytes but received ${privateKey.length} bytes`);
	    try {
	      const keypair = await Keypair.fromSecretKey(privateKey);
	      const publicKey = await keypair.publicKey.toBytes();
	      const signature = sign(message, privateKey);
	      return this.createInstructionWithPublicKey({
	        publicKey,
	        message,
	        signature,
	        instructionIndex
	      });
	    } catch (error) {
	      throw new Error(`Error creating instruction; ${error}`);
	    }
	  }
	}
	Ed25519Program.programId = new Address('Ed25519SigVerify111111111111111111111111111');

	const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
	const _32n = /* @__PURE__ */ BigInt(32);
	// BigUint64Array is too slow as per 2024, so we implement it using Uint32Array.
	// TODO: re-check https://issues.chromium.org/issues/42212588
	function fromBig(n, le = false) {
	    if (le)
	        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
	    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
	}
	function split(lst, le = false) {
	    let Ah = new Uint32Array(lst.length);
	    let Al = new Uint32Array(lst.length);
	    for (let i = 0; i < lst.length; i++) {
	        const { h, l } = fromBig(lst[i], le);
	        [Ah[i], Al[i]] = [h, l];
	    }
	    return [Ah, Al];
	}
	// Left rotate for Shift in [1, 32)
	const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
	const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
	// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
	const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

	// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
	// It's called a sponge function.
	// Various per round constants calculations
	const SHA3_PI = [];
	const SHA3_ROTL = [];
	const _SHA3_IOTA = [];
	const _0n$1 = /* @__PURE__ */ BigInt(0);
	const _1n$2 = /* @__PURE__ */ BigInt(1);
	const _2n$1 = /* @__PURE__ */ BigInt(2);
	const _7n = /* @__PURE__ */ BigInt(7);
	const _256n = /* @__PURE__ */ BigInt(256);
	const _0x71n = /* @__PURE__ */ BigInt(0x71);
	for (let round = 0, R = _1n$2, x = 1, y = 0; round < 24; round++) {
	    // Pi
	    [x, y] = [y, (2 * x + 3 * y) % 5];
	    SHA3_PI.push(2 * (5 * y + x));
	    // Rotational
	    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
	    // Iota
	    let t = _0n$1;
	    for (let j = 0; j < 7; j++) {
	        R = ((R << _1n$2) ^ ((R >> _7n) * _0x71n)) % _256n;
	        if (R & _2n$1)
	            t ^= _1n$2 << ((_1n$2 << /* @__PURE__ */ BigInt(j)) - _1n$2);
	    }
	    _SHA3_IOTA.push(t);
	}
	const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
	// Left rotation (without 0, 32, 64)
	const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
	const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
	// Same as keccakf1600, but allows to skip some rounds
	function keccakP(s, rounds = 24) {
	    const B = new Uint32Array(5 * 2);
	    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
	    for (let round = 24 - rounds; round < 24; round++) {
	        // Theta θ
	        for (let x = 0; x < 10; x++)
	            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
	        for (let x = 0; x < 10; x += 2) {
	            const idx1 = (x + 8) % 10;
	            const idx0 = (x + 2) % 10;
	            const B0 = B[idx0];
	            const B1 = B[idx0 + 1];
	            const Th = rotlH(B0, B1, 1) ^ B[idx1];
	            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
	            for (let y = 0; y < 50; y += 10) {
	                s[x + y] ^= Th;
	                s[x + y + 1] ^= Tl;
	            }
	        }
	        // Rho (ρ) and Pi (π)
	        let curH = s[2];
	        let curL = s[3];
	        for (let t = 0; t < 24; t++) {
	            const shift = SHA3_ROTL[t];
	            const Th = rotlH(curH, curL, shift);
	            const Tl = rotlL(curH, curL, shift);
	            const PI = SHA3_PI[t];
	            curH = s[PI];
	            curL = s[PI + 1];
	            s[PI] = Th;
	            s[PI + 1] = Tl;
	        }
	        // Chi (χ)
	        for (let y = 0; y < 50; y += 10) {
	            for (let x = 0; x < 10; x++)
	                B[x] = s[y + x];
	            for (let x = 0; x < 10; x++)
	                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
	        }
	        // Iota (ι)
	        s[0] ^= SHA3_IOTA_H[round];
	        s[1] ^= SHA3_IOTA_L[round];
	    }
	    B.fill(0);
	}
	class Keccak extends Hash$1 {
	    // NOTE: we accept arguments in bytes instead of bits here.
	    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
	        super();
	        this.blockLen = blockLen;
	        this.suffix = suffix;
	        this.outputLen = outputLen;
	        this.enableXOF = enableXOF;
	        this.rounds = rounds;
	        this.pos = 0;
	        this.posOut = 0;
	        this.finished = false;
	        this.destroyed = false;
	        // Can be passed from user as dkLen
	        anumber$1(outputLen);
	        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
	        if (0 >= this.blockLen || this.blockLen >= 200)
	            throw new Error('Sha3 supports only keccak-f1600 function');
	        this.state = new Uint8Array(200);
	        this.state32 = u32(this.state);
	    }
	    keccak() {
	        if (!isLE)
	            byteSwap32(this.state32);
	        keccakP(this.state32, this.rounds);
	        if (!isLE)
	            byteSwap32(this.state32);
	        this.posOut = 0;
	        this.pos = 0;
	    }
	    update(data) {
	        aexists$1(this);
	        const { blockLen, state } = this;
	        data = toBytes$1(data);
	        const len = data.length;
	        for (let pos = 0; pos < len;) {
	            const take = Math.min(blockLen - this.pos, len - pos);
	            for (let i = 0; i < take; i++)
	                state[this.pos++] ^= data[pos++];
	            if (this.pos === blockLen)
	                this.keccak();
	        }
	        return this;
	    }
	    finish() {
	        if (this.finished)
	            return;
	        this.finished = true;
	        const { state, suffix, pos, blockLen } = this;
	        // Do the padding
	        state[pos] ^= suffix;
	        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
	            this.keccak();
	        state[blockLen - 1] ^= 0x80;
	        this.keccak();
	    }
	    writeInto(out) {
	        aexists$1(this, false);
	        abytes$2(out);
	        this.finish();
	        const bufferOut = this.state;
	        const { blockLen } = this;
	        for (let pos = 0, len = out.length; pos < len;) {
	            if (this.posOut >= blockLen)
	                this.keccak();
	            const take = Math.min(blockLen - this.posOut, len - pos);
	            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
	            this.posOut += take;
	            pos += take;
	        }
	        return out;
	    }
	    xofInto(out) {
	        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
	        if (!this.enableXOF)
	            throw new Error('XOF is not possible for this instance');
	        return this.writeInto(out);
	    }
	    xof(bytes) {
	        anumber$1(bytes);
	        return this.xofInto(new Uint8Array(bytes));
	    }
	    digestInto(out) {
	        aoutput$1(out, this);
	        if (this.finished)
	            throw new Error('digest() was already called');
	        this.writeInto(out);
	        this.destroy();
	        return out;
	    }
	    digest() {
	        return this.digestInto(new Uint8Array(this.outputLen));
	    }
	    destroy() {
	        this.destroyed = true;
	        this.state.fill(0);
	    }
	    _cloneInto(to) {
	        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
	        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
	        to.state32.set(this.state32);
	        to.pos = this.pos;
	        to.posOut = this.posOut;
	        to.finished = this.finished;
	        to.rounds = rounds;
	        // Suffix can change in cSHAKE
	        to.suffix = suffix;
	        to.outputLen = outputLen;
	        to.enableXOF = enableXOF;
	        to.destroyed = this.destroyed;
	        return to;
	    }
	}
	const gen = (suffix, blockLen, outputLen) => wrapConstructor$1(() => new Keccak(blockLen, suffix, outputLen));
	/**
	 * keccak-256 hash function. Different from SHA3-256.
	 * @param message - that would be hashed
	 */
	const keccak_256 = /* @__PURE__ */ gen(0x01, 136, 256 / 8);

	// SHA2-256 need to try 2^128 hashes to execute birthday attack.
	// BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per late 2024.
	// Round constants:
	// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
	// prettier-ignore
	const SHA256_K = /* @__PURE__ */ new Uint32Array([
	    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	]);
	// Initial state:
	// first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
	// prettier-ignore
	const SHA256_IV = /* @__PURE__ */ new Uint32Array([
	    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
	]);
	// Temporary buffer, not used to store anything between runs
	// Named this way because it matches specification.
	const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
	class SHA256 extends HashMD {
	    constructor() {
	        super(64, 32, 8, false);
	        // We cannot use array here since array allows indexing by variable
	        // which means optimizer/compiler cannot use registers.
	        this.A = SHA256_IV[0] | 0;
	        this.B = SHA256_IV[1] | 0;
	        this.C = SHA256_IV[2] | 0;
	        this.D = SHA256_IV[3] | 0;
	        this.E = SHA256_IV[4] | 0;
	        this.F = SHA256_IV[5] | 0;
	        this.G = SHA256_IV[6] | 0;
	        this.H = SHA256_IV[7] | 0;
	    }
	    get() {
	        const { A, B, C, D, E, F, G, H } = this;
	        return [A, B, C, D, E, F, G, H];
	    }
	    // prettier-ignore
	    set(A, B, C, D, E, F, G, H) {
	        this.A = A | 0;
	        this.B = B | 0;
	        this.C = C | 0;
	        this.D = D | 0;
	        this.E = E | 0;
	        this.F = F | 0;
	        this.G = G | 0;
	        this.H = H | 0;
	    }
	    process(view, offset) {
	        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
	        for (let i = 0; i < 16; i++, offset += 4)
	            SHA256_W[i] = view.getUint32(offset, false);
	        for (let i = 16; i < 64; i++) {
	            const W15 = SHA256_W[i - 15];
	            const W2 = SHA256_W[i - 2];
	            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
	            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
	            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
	        }
	        // Compression function main loop, 64 rounds
	        let { A, B, C, D, E, F, G, H } = this;
	        for (let i = 0; i < 64; i++) {
	            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
	            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
	            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
	            const T2 = (sigma0 + Maj(A, B, C)) | 0;
	            H = G;
	            G = F;
	            F = E;
	            E = (D + T1) | 0;
	            D = C;
	            C = B;
	            B = A;
	            A = (T1 + T2) | 0;
	        }
	        // Add the compressed chunk to the current hash value
	        A = (A + this.A) | 0;
	        B = (B + this.B) | 0;
	        C = (C + this.C) | 0;
	        D = (D + this.D) | 0;
	        E = (E + this.E) | 0;
	        F = (F + this.F) | 0;
	        G = (G + this.G) | 0;
	        H = (H + this.H) | 0;
	        this.set(A, B, C, D, E, F, G, H);
	    }
	    roundClean() {
	        SHA256_W.fill(0);
	    }
	    destroy() {
	        this.set(0, 0, 0, 0, 0, 0, 0, 0);
	        this.buffer.fill(0);
	    }
	}
	/**
	 * SHA2-256 hash function
	 * @param message - data that would be hashed
	 */
	const sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

	// HMAC (RFC 2104)
	class HMAC extends Hash {
	    constructor(hash, _key) {
	        super();
	        this.finished = false;
	        this.destroyed = false;
	        ahash(hash);
	        const key = toBytes(_key);
	        this.iHash = hash.create();
	        if (typeof this.iHash.update !== 'function')
	            throw new Error('Expected instance of class which extends utils.Hash');
	        this.blockLen = this.iHash.blockLen;
	        this.outputLen = this.iHash.outputLen;
	        const blockLen = this.blockLen;
	        const pad = new Uint8Array(blockLen);
	        // blockLen can be bigger than outputLen
	        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
	        for (let i = 0; i < pad.length; i++)
	            pad[i] ^= 0x36;
	        this.iHash.update(pad);
	        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
	        this.oHash = hash.create();
	        // Undo internal XOR && apply outer XOR
	        for (let i = 0; i < pad.length; i++)
	            pad[i] ^= 0x36 ^ 0x5c;
	        this.oHash.update(pad);
	        pad.fill(0);
	    }
	    update(buf) {
	        aexists(this);
	        this.iHash.update(buf);
	        return this;
	    }
	    digestInto(out) {
	        aexists(this);
	        abytes$1(out, this.outputLen);
	        this.finished = true;
	        this.iHash.digestInto(out);
	        this.oHash.update(out);
	        this.oHash.digestInto(out);
	        this.destroy();
	    }
	    digest() {
	        const out = new Uint8Array(this.oHash.outputLen);
	        this.digestInto(out);
	        return out;
	    }
	    _cloneInto(to) {
	        // Create new instance without calling constructor since key already in state and we don't know it.
	        to || (to = Object.create(Object.getPrototypeOf(this), {}));
	        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
	        to = to;
	        to.finished = finished;
	        to.destroyed = destroyed;
	        to.blockLen = blockLen;
	        to.outputLen = outputLen;
	        to.oHash = oHash._cloneInto(to.oHash);
	        to.iHash = iHash._cloneInto(to.iHash);
	        return to;
	    }
	    destroy() {
	        this.destroyed = true;
	        this.oHash.destroy();
	        this.iHash.destroy();
	    }
	}
	/**
	 * HMAC: RFC2104 message authentication code.
	 * @param hash - function that would be used e.g. sha256
	 * @param key - message key
	 * @param message - message data
	 * @example
	 * import { hmac } from '@noble/hashes/hmac';
	 * import { sha256 } from '@noble/hashes/sha2';
	 * const mac1 = hmac(sha256, 'key', 'message');
	 */
	const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
	hmac.create = (hash, key) => new HMAC(hash, key);

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// Short Weierstrass curve. The formula is: y² = x³ + ax + b
	function validateSigVerOpts(opts) {
	    if (opts.lowS !== undefined)
	        abool('lowS', opts.lowS);
	    if (opts.prehash !== undefined)
	        abool('prehash', opts.prehash);
	}
	function validatePointOpts(curve) {
	    const opts = validateBasic(curve);
	    validateObject(opts, {
	        a: 'field',
	        b: 'field',
	    }, {
	        allowedPrivateKeyLengths: 'array',
	        wrapPrivateKey: 'boolean',
	        isTorsionFree: 'function',
	        clearCofactor: 'function',
	        allowInfinityPoint: 'boolean',
	        fromBytes: 'function',
	        toBytes: 'function',
	    });
	    const { endo, Fp, a } = opts;
	    if (endo) {
	        if (!Fp.eql(a, Fp.ZERO)) {
	            throw new Error('invalid endomorphism, can only be defined for Koblitz curves that have a=0');
	        }
	        if (typeof endo !== 'object' ||
	            typeof endo.beta !== 'bigint' ||
	            typeof endo.splitScalar !== 'function') {
	            throw new Error('invalid endomorphism, expected beta: bigint and splitScalar: function');
	        }
	    }
	    return Object.freeze({ ...opts });
	}
	const { bytesToNumberBE: b2n, hexToBytes: h2b } = ut;
	/**
	 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
	 *
	 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
	 *
	 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
	 */
	const DER = {
	    // asn.1 DER encoding utils
	    Err: class DERErr extends Error {
	        constructor(m = '') {
	            super(m);
	        }
	    },
	    // Basic building block is TLV (Tag-Length-Value)
	    _tlv: {
	        encode: (tag, data) => {
	            const { Err: E } = DER;
	            if (tag < 0 || tag > 256)
	                throw new E('tlv.encode: wrong tag');
	            if (data.length & 1)
	                throw new E('tlv.encode: unpadded data');
	            const dataLen = data.length / 2;
	            const len = numberToHexUnpadded(dataLen);
	            if ((len.length / 2) & 128)
	                throw new E('tlv.encode: long form length too big');
	            // length of length with long form flag
	            const lenLen = dataLen > 127 ? numberToHexUnpadded((len.length / 2) | 128) : '';
	            const t = numberToHexUnpadded(tag);
	            return t + lenLen + len + data;
	        },
	        // v - value, l - left bytes (unparsed)
	        decode(tag, data) {
	            const { Err: E } = DER;
	            let pos = 0;
	            if (tag < 0 || tag > 256)
	                throw new E('tlv.encode: wrong tag');
	            if (data.length < 2 || data[pos++] !== tag)
	                throw new E('tlv.decode: wrong tlv');
	            const first = data[pos++];
	            const isLong = !!(first & 128); // First bit of first length byte is flag for short/long form
	            let length = 0;
	            if (!isLong)
	                length = first;
	            else {
	                // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
	                const lenLen = first & 127;
	                if (!lenLen)
	                    throw new E('tlv.decode(long): indefinite length not supported');
	                if (lenLen > 4)
	                    throw new E('tlv.decode(long): byte length is too big'); // this will overflow u32 in js
	                const lengthBytes = data.subarray(pos, pos + lenLen);
	                if (lengthBytes.length !== lenLen)
	                    throw new E('tlv.decode: length bytes not complete');
	                if (lengthBytes[0] === 0)
	                    throw new E('tlv.decode(long): zero leftmost byte');
	                for (const b of lengthBytes)
	                    length = (length << 8) | b;
	                pos += lenLen;
	                if (length < 128)
	                    throw new E('tlv.decode(long): not minimal encoding');
	            }
	            const v = data.subarray(pos, pos + length);
	            if (v.length !== length)
	                throw new E('tlv.decode: wrong value length');
	            return { v, l: data.subarray(pos + length) };
	        },
	    },
	    // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
	    // since we always use positive integers here. It must always be empty:
	    // - add zero byte if exists
	    // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
	    _int: {
	        encode(num) {
	            const { Err: E } = DER;
	            if (num < _0n)
	                throw new E('integer: negative integers are not allowed');
	            let hex = numberToHexUnpadded(num);
	            // Pad with zero byte if negative flag is present
	            if (Number.parseInt(hex[0], 16) & 0b1000)
	                hex = '00' + hex;
	            if (hex.length & 1)
	                throw new E('unexpected DER parsing assertion: unpadded hex');
	            return hex;
	        },
	        decode(data) {
	            const { Err: E } = DER;
	            if (data[0] & 128)
	                throw new E('invalid signature integer: negative');
	            if (data[0] === 0x00 && !(data[1] & 128))
	                throw new E('invalid signature integer: unnecessary leading zero');
	            return b2n(data);
	        },
	    },
	    toSig(hex) {
	        // parse DER signature
	        const { Err: E, _int: int, _tlv: tlv } = DER;
	        const data = typeof hex === 'string' ? h2b(hex) : hex;
	        abytes(data);
	        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(0x30, data);
	        if (seqLeftBytes.length)
	            throw new E('invalid signature: left bytes after parsing');
	        const { v: rBytes, l: rLeftBytes } = tlv.decode(0x02, seqBytes);
	        const { v: sBytes, l: sLeftBytes } = tlv.decode(0x02, rLeftBytes);
	        if (sLeftBytes.length)
	            throw new E('invalid signature: left bytes after parsing');
	        return { r: int.decode(rBytes), s: int.decode(sBytes) };
	    },
	    hexFromSig(sig) {
	        const { _tlv: tlv, _int: int } = DER;
	        const rs = tlv.encode(0x02, int.encode(sig.r));
	        const ss = tlv.encode(0x02, int.encode(sig.s));
	        const seq = rs + ss;
	        return tlv.encode(0x30, seq);
	    },
	};
	// Be friendly to bad ECMAScript parsers by not using bigint literals
	// prettier-ignore
	const _0n = BigInt(0), _1n$1 = BigInt(1); BigInt(2); const _3n = BigInt(3); BigInt(4);
	function weierstrassPoints(opts) {
	    const CURVE = validatePointOpts(opts);
	    const { Fp } = CURVE; // All curves has same field / group length as for now, but they can differ
	    const Fn = Field(CURVE.n, CURVE.nBitLength);
	    const toBytes = CURVE.toBytes ||
	        ((_c, point, _isCompressed) => {
	            const a = point.toAffine();
	            return concatBytes(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
	        });
	    const fromBytes = CURVE.fromBytes ||
	        ((bytes) => {
	            // const head = bytes[0];
	            const tail = bytes.subarray(1);
	            // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
	            const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
	            const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
	            return { x, y };
	        });
	    /**
	     * y² = x³ + ax + b: Short weierstrass curve formula
	     * @returns y²
	     */
	    function weierstrassEquation(x) {
	        const { a, b } = CURVE;
	        const x2 = Fp.sqr(x); // x * x
	        const x3 = Fp.mul(x2, x); // x2 * x
	        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x3 + a * x + b
	    }
	    // Validate whether the passed curve params are valid.
	    // We check if curve equation works for generator point.
	    // `assertValidity()` won't work: `isTorsionFree()` is not available at this point in bls12-381.
	    // ProjectivePoint class has not been initialized yet.
	    if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
	        throw new Error('bad generator point: equation left != right');
	    // Valid group elements reside in range 1..n-1
	    function isWithinCurveOrder(num) {
	        return inRange(num, _1n$1, CURVE.n);
	    }
	    // Validates if priv key is valid and converts it to bigint.
	    // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
	    function normPrivateKeyToScalar(key) {
	        const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n: N } = CURVE;
	        if (lengths && typeof key !== 'bigint') {
	            if (isBytes(key))
	                key = bytesToHex(key);
	            // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
	            if (typeof key !== 'string' || !lengths.includes(key.length))
	                throw new Error('invalid private key');
	            key = key.padStart(nByteLength * 2, '0');
	        }
	        let num;
	        try {
	            num =
	                typeof key === 'bigint'
	                    ? key
	                    : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
	        }
	        catch (error) {
	            throw new Error('invalid private key, expected hex or ' + nByteLength + ' bytes, got ' + typeof key);
	        }
	        if (wrapPrivateKey)
	            num = mod(num, N); // disabled by default, enabled for BLS
	        aInRange('private key', num, _1n$1, N); // num in range [1..N-1]
	        return num;
	    }
	    function assertPrjPoint(other) {
	        if (!(other instanceof Point))
	            throw new Error('ProjectivePoint expected');
	    }
	    // Memoized toAffine / validity check. They are heavy. Points are immutable.
	    // Converts Projective point to affine (x, y) coordinates.
	    // Can accept precomputed Z^-1 - for example, from invertBatch.
	    // (x, y, z) ∋ (x=x/z, y=y/z)
	    const toAffineMemo = memoized((p, iz) => {
	        const { px: x, py: y, pz: z } = p;
	        // Fast-path for normalized points
	        if (Fp.eql(z, Fp.ONE))
	            return { x, y };
	        const is0 = p.is0();
	        // If invZ was 0, we return zero point. However we still want to execute
	        // all operations, so we replace invZ with a random number, 1.
	        if (iz == null)
	            iz = is0 ? Fp.ONE : Fp.inv(z);
	        const ax = Fp.mul(x, iz);
	        const ay = Fp.mul(y, iz);
	        const zz = Fp.mul(z, iz);
	        if (is0)
	            return { x: Fp.ZERO, y: Fp.ZERO };
	        if (!Fp.eql(zz, Fp.ONE))
	            throw new Error('invZ was invalid');
	        return { x: ax, y: ay };
	    });
	    // NOTE: on exception this will crash 'cached' and no value will be set.
	    // Otherwise true will be return
	    const assertValidMemo = memoized((p) => {
	        if (p.is0()) {
	            // (0, 1, 0) aka ZERO is invalid in most contexts.
	            // In BLS, ZERO can be serialized, so we allow it.
	            // (0, 0, 0) is invalid representation of ZERO.
	            if (CURVE.allowInfinityPoint && !Fp.is0(p.py))
	                return;
	            throw new Error('bad point: ZERO');
	        }
	        // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
	        const { x, y } = p.toAffine();
	        // Check if x, y are valid field elements
	        if (!Fp.isValid(x) || !Fp.isValid(y))
	            throw new Error('bad point: x or y not FE');
	        const left = Fp.sqr(y); // y²
	        const right = weierstrassEquation(x); // x³ + ax + b
	        if (!Fp.eql(left, right))
	            throw new Error('bad point: equation left != right');
	        if (!p.isTorsionFree())
	            throw new Error('bad point: not in prime-order subgroup');
	        return true;
	    });
	    /**
	     * Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
	     * Default Point works in 2d / affine coordinates: (x, y)
	     * We're doing calculations in projective, because its operations don't require costly inversion.
	     */
	    class Point {
	        constructor(px, py, pz) {
	            this.px = px;
	            this.py = py;
	            this.pz = pz;
	            if (px == null || !Fp.isValid(px))
	                throw new Error('x required');
	            if (py == null || !Fp.isValid(py))
	                throw new Error('y required');
	            if (pz == null || !Fp.isValid(pz))
	                throw new Error('z required');
	            Object.freeze(this);
	        }
	        // Does not validate if the point is on-curve.
	        // Use fromHex instead, or call assertValidity() later.
	        static fromAffine(p) {
	            const { x, y } = p || {};
	            if (!p || !Fp.isValid(x) || !Fp.isValid(y))
	                throw new Error('invalid affine point');
	            if (p instanceof Point)
	                throw new Error('projective point not allowed');
	            const is0 = (i) => Fp.eql(i, Fp.ZERO);
	            // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
	            if (is0(x) && is0(y))
	                return Point.ZERO;
	            return new Point(x, y, Fp.ONE);
	        }
	        get x() {
	            return this.toAffine().x;
	        }
	        get y() {
	            return this.toAffine().y;
	        }
	        /**
	         * Takes a bunch of Projective Points but executes only one
	         * inversion on all of them. Inversion is very slow operation,
	         * so this improves performance massively.
	         * Optimization: converts a list of projective points to a list of identical points with Z=1.
	         */
	        static normalizeZ(points) {
	            const toInv = Fp.invertBatch(points.map((p) => p.pz));
	            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
	        }
	        /**
	         * Converts hash string or Uint8Array to Point.
	         * @param hex short/long ECDSA hex
	         */
	        static fromHex(hex) {
	            const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
	            P.assertValidity();
	            return P;
	        }
	        // Multiplies generator point by privateKey.
	        static fromPrivateKey(privateKey) {
	            return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
	        }
	        // Multiscalar Multiplication
	        static msm(points, scalars) {
	            return pippenger(Point, Fn, points, scalars);
	        }
	        // "Private method", don't use it directly
	        _setWindowSize(windowSize) {
	            wnaf.setWindowSize(this, windowSize);
	        }
	        // A point on curve is valid if it conforms to equation.
	        assertValidity() {
	            assertValidMemo(this);
	        }
	        hasEvenY() {
	            const { y } = this.toAffine();
	            if (Fp.isOdd)
	                return !Fp.isOdd(y);
	            throw new Error("Field doesn't support isOdd");
	        }
	        /**
	         * Compare one point to another.
	         */
	        equals(other) {
	            assertPrjPoint(other);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            const { px: X2, py: Y2, pz: Z2 } = other;
	            const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
	            const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
	            return U1 && U2;
	        }
	        /**
	         * Flips point to one corresponding to (x, -y) in Affine coordinates.
	         */
	        negate() {
	            return new Point(this.px, Fp.neg(this.py), this.pz);
	        }
	        // Renes-Costello-Batina exception-free doubling formula.
	        // There is 30% faster Jacobian formula, but it is not complete.
	        // https://eprint.iacr.org/2015/1060, algorithm 3
	        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
	        double() {
	            const { a, b } = CURVE;
	            const b3 = Fp.mul(b, _3n);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
	            let t0 = Fp.mul(X1, X1); // step 1
	            let t1 = Fp.mul(Y1, Y1);
	            let t2 = Fp.mul(Z1, Z1);
	            let t3 = Fp.mul(X1, Y1);
	            t3 = Fp.add(t3, t3); // step 5
	            Z3 = Fp.mul(X1, Z1);
	            Z3 = Fp.add(Z3, Z3);
	            X3 = Fp.mul(a, Z3);
	            Y3 = Fp.mul(b3, t2);
	            Y3 = Fp.add(X3, Y3); // step 10
	            X3 = Fp.sub(t1, Y3);
	            Y3 = Fp.add(t1, Y3);
	            Y3 = Fp.mul(X3, Y3);
	            X3 = Fp.mul(t3, X3);
	            Z3 = Fp.mul(b3, Z3); // step 15
	            t2 = Fp.mul(a, t2);
	            t3 = Fp.sub(t0, t2);
	            t3 = Fp.mul(a, t3);
	            t3 = Fp.add(t3, Z3);
	            Z3 = Fp.add(t0, t0); // step 20
	            t0 = Fp.add(Z3, t0);
	            t0 = Fp.add(t0, t2);
	            t0 = Fp.mul(t0, t3);
	            Y3 = Fp.add(Y3, t0);
	            t2 = Fp.mul(Y1, Z1); // step 25
	            t2 = Fp.add(t2, t2);
	            t0 = Fp.mul(t2, t3);
	            X3 = Fp.sub(X3, t0);
	            Z3 = Fp.mul(t2, t1);
	            Z3 = Fp.add(Z3, Z3); // step 30
	            Z3 = Fp.add(Z3, Z3);
	            return new Point(X3, Y3, Z3);
	        }
	        // Renes-Costello-Batina exception-free addition formula.
	        // There is 30% faster Jacobian formula, but it is not complete.
	        // https://eprint.iacr.org/2015/1060, algorithm 1
	        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
	        add(other) {
	            assertPrjPoint(other);
	            const { px: X1, py: Y1, pz: Z1 } = this;
	            const { px: X2, py: Y2, pz: Z2 } = other;
	            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
	            const a = CURVE.a;
	            const b3 = Fp.mul(CURVE.b, _3n);
	            let t0 = Fp.mul(X1, X2); // step 1
	            let t1 = Fp.mul(Y1, Y2);
	            let t2 = Fp.mul(Z1, Z2);
	            let t3 = Fp.add(X1, Y1);
	            let t4 = Fp.add(X2, Y2); // step 5
	            t3 = Fp.mul(t3, t4);
	            t4 = Fp.add(t0, t1);
	            t3 = Fp.sub(t3, t4);
	            t4 = Fp.add(X1, Z1);
	            let t5 = Fp.add(X2, Z2); // step 10
	            t4 = Fp.mul(t4, t5);
	            t5 = Fp.add(t0, t2);
	            t4 = Fp.sub(t4, t5);
	            t5 = Fp.add(Y1, Z1);
	            X3 = Fp.add(Y2, Z2); // step 15
	            t5 = Fp.mul(t5, X3);
	            X3 = Fp.add(t1, t2);
	            t5 = Fp.sub(t5, X3);
	            Z3 = Fp.mul(a, t4);
	            X3 = Fp.mul(b3, t2); // step 20
	            Z3 = Fp.add(X3, Z3);
	            X3 = Fp.sub(t1, Z3);
	            Z3 = Fp.add(t1, Z3);
	            Y3 = Fp.mul(X3, Z3);
	            t1 = Fp.add(t0, t0); // step 25
	            t1 = Fp.add(t1, t0);
	            t2 = Fp.mul(a, t2);
	            t4 = Fp.mul(b3, t4);
	            t1 = Fp.add(t1, t2);
	            t2 = Fp.sub(t0, t2); // step 30
	            t2 = Fp.mul(a, t2);
	            t4 = Fp.add(t4, t2);
	            t0 = Fp.mul(t1, t4);
	            Y3 = Fp.add(Y3, t0);
	            t0 = Fp.mul(t5, t4); // step 35
	            X3 = Fp.mul(t3, X3);
	            X3 = Fp.sub(X3, t0);
	            t0 = Fp.mul(t3, t1);
	            Z3 = Fp.mul(t5, Z3);
	            Z3 = Fp.add(Z3, t0); // step 40
	            return new Point(X3, Y3, Z3);
	        }
	        subtract(other) {
	            return this.add(other.negate());
	        }
	        is0() {
	            return this.equals(Point.ZERO);
	        }
	        wNAF(n) {
	            return wnaf.wNAFCached(this, n, Point.normalizeZ);
	        }
	        /**
	         * Non-constant-time multiplication. Uses double-and-add algorithm.
	         * It's faster, but should only be used when you don't care about
	         * an exposed private key e.g. sig verification, which works over *public* keys.
	         */
	        multiplyUnsafe(sc) {
	            const { endo, n: N } = CURVE;
	            aInRange('scalar', sc, _0n, N);
	            const I = Point.ZERO;
	            if (sc === _0n)
	                return I;
	            if (this.is0() || sc === _1n$1)
	                return this;
	            // Case a: no endomorphism. Case b: has precomputes.
	            if (!endo || wnaf.hasPrecomputes(this))
	                return wnaf.wNAFCachedUnsafe(this, sc, Point.normalizeZ);
	            // Case c: endomorphism
	            let { k1neg, k1, k2neg, k2 } = endo.splitScalar(sc);
	            let k1p = I;
	            let k2p = I;
	            let d = this;
	            while (k1 > _0n || k2 > _0n) {
	                if (k1 & _1n$1)
	                    k1p = k1p.add(d);
	                if (k2 & _1n$1)
	                    k2p = k2p.add(d);
	                d = d.double();
	                k1 >>= _1n$1;
	                k2 >>= _1n$1;
	            }
	            if (k1neg)
	                k1p = k1p.negate();
	            if (k2neg)
	                k2p = k2p.negate();
	            k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
	            return k1p.add(k2p);
	        }
	        /**
	         * Constant time multiplication.
	         * Uses wNAF method. Windowed method may be 10% faster,
	         * but takes 2x longer to generate and consumes 2x memory.
	         * Uses precomputes when available.
	         * Uses endomorphism for Koblitz curves.
	         * @param scalar by which the point would be multiplied
	         * @returns New point
	         */
	        multiply(scalar) {
	            const { endo, n: N } = CURVE;
	            aInRange('scalar', scalar, _1n$1, N);
	            let point, fake; // Fake point is used to const-time mult
	            if (endo) {
	                const { k1neg, k1, k2neg, k2 } = endo.splitScalar(scalar);
	                let { p: k1p, f: f1p } = this.wNAF(k1);
	                let { p: k2p, f: f2p } = this.wNAF(k2);
	                k1p = wnaf.constTimeNegate(k1neg, k1p);
	                k2p = wnaf.constTimeNegate(k2neg, k2p);
	                k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
	                point = k1p.add(k2p);
	                fake = f1p.add(f2p);
	            }
	            else {
	                const { p, f } = this.wNAF(scalar);
	                point = p;
	                fake = f;
	            }
	            // Normalize `z` for both points, but return only real one
	            return Point.normalizeZ([point, fake])[0];
	        }
	        /**
	         * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
	         * Not using Strauss-Shamir trick: precomputation tables are faster.
	         * The trick could be useful if both P and Q are not G (not in our case).
	         * @returns non-zero affine point
	         */
	        multiplyAndAddUnsafe(Q, a, b) {
	            const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
	            const mul = (P, a // Select faster multiply() method
	            ) => (a === _0n || a === _1n$1 || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a));
	            const sum = mul(this, a).add(mul(Q, b));
	            return sum.is0() ? undefined : sum;
	        }
	        // Converts Projective point to affine (x, y) coordinates.
	        // Can accept precomputed Z^-1 - for example, from invertBatch.
	        // (x, y, z) ∋ (x=x/z, y=y/z)
	        toAffine(iz) {
	            return toAffineMemo(this, iz);
	        }
	        isTorsionFree() {
	            const { h: cofactor, isTorsionFree } = CURVE;
	            if (cofactor === _1n$1)
	                return true; // No subgroups, always torsion-free
	            if (isTorsionFree)
	                return isTorsionFree(Point, this);
	            throw new Error('isTorsionFree() has not been declared for the elliptic curve');
	        }
	        clearCofactor() {
	            const { h: cofactor, clearCofactor } = CURVE;
	            if (cofactor === _1n$1)
	                return this; // Fast-path
	            if (clearCofactor)
	                return clearCofactor(Point, this);
	            return this.multiplyUnsafe(CURVE.h);
	        }
	        toRawBytes(isCompressed = true) {
	            abool('isCompressed', isCompressed);
	            this.assertValidity();
	            return toBytes(Point, this, isCompressed);
	        }
	        toHex(isCompressed = true) {
	            abool('isCompressed', isCompressed);
	            return bytesToHex(this.toRawBytes(isCompressed));
	        }
	    }
	    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
	    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
	    const _bits = CURVE.nBitLength;
	    const wnaf = wNAF(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
	    // Validate if generator point is on curve
	    return {
	        CURVE,
	        ProjectivePoint: Point,
	        normPrivateKeyToScalar,
	        weierstrassEquation,
	        isWithinCurveOrder,
	    };
	}
	function validateOpts(curve) {
	    const opts = validateBasic(curve);
	    validateObject(opts, {
	        hash: 'hash',
	        hmac: 'function',
	        randomBytes: 'function',
	    }, {
	        bits2int: 'function',
	        bits2int_modN: 'function',
	        lowS: 'boolean',
	    });
	    return Object.freeze({ lowS: true, ...opts });
	}
	/**
	 * Creates short weierstrass curve and ECDSA signature methods for it.
	 * @example
	 * import { Field } from '@noble/curves/abstract/modular';
	 * // Before that, define BigInt-s: a, b, p, n, Gx, Gy
	 * const curve = weierstrass({ a, b, Fp: Field(p), n, Gx, Gy, h: 1n })
	 */
	function weierstrass(curveDef) {
	    const CURVE = validateOpts(curveDef);
	    const { Fp, n: CURVE_ORDER } = CURVE;
	    const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
	    const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
	    function modN(a) {
	        return mod(a, CURVE_ORDER);
	    }
	    function invN(a) {
	        return invert(a, CURVE_ORDER);
	    }
	    const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder, } = weierstrassPoints({
	        ...CURVE,
	        toBytes(_c, point, isCompressed) {
	            const a = point.toAffine();
	            const x = Fp.toBytes(a.x);
	            const cat = concatBytes;
	            abool('isCompressed', isCompressed);
	            if (isCompressed) {
	                return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
	            }
	            else {
	                return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
	            }
	        },
	        fromBytes(bytes) {
	            const len = bytes.length;
	            const head = bytes[0];
	            const tail = bytes.subarray(1);
	            // this.assertValidity() is done inside of fromHex
	            if (len === compressedLen && (head === 0x02 || head === 0x03)) {
	                const x = bytesToNumberBE(tail);
	                if (!inRange(x, _1n$1, Fp.ORDER))
	                    throw new Error('Point is not on curve');
	                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
	                let y;
	                try {
	                    y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
	                }
	                catch (sqrtError) {
	                    const suffix = sqrtError instanceof Error ? ': ' + sqrtError.message : '';
	                    throw new Error('Point is not on curve' + suffix);
	                }
	                const isYOdd = (y & _1n$1) === _1n$1;
	                // ECDSA
	                const isHeadOdd = (head & 1) === 1;
	                if (isHeadOdd !== isYOdd)
	                    y = Fp.neg(y);
	                return { x, y };
	            }
	            else if (len === uncompressedLen && head === 0x04) {
	                const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
	                const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
	                return { x, y };
	            }
	            else {
	                const cl = compressedLen;
	                const ul = uncompressedLen;
	                throw new Error('invalid Point, expected length of ' + cl + ', or uncompressed ' + ul + ', got ' + len);
	            }
	        },
	    });
	    const numToNByteStr = (num) => bytesToHex(numberToBytesBE(num, CURVE.nByteLength));
	    function isBiggerThanHalfOrder(number) {
	        const HALF = CURVE_ORDER >> _1n$1;
	        return number > HALF;
	    }
	    function normalizeS(s) {
	        return isBiggerThanHalfOrder(s) ? modN(-s) : s;
	    }
	    // slice bytes num
	    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
	    /**
	     * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
	     */
	    class Signature {
	        constructor(r, s, recovery) {
	            this.r = r;
	            this.s = s;
	            this.recovery = recovery;
	            this.assertValidity();
	        }
	        // pair (bytes of r, bytes of s)
	        static fromCompact(hex) {
	            const l = CURVE.nByteLength;
	            hex = ensureBytes('compactSignature', hex, l * 2);
	            return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
	        }
	        // DER encoded ECDSA signature
	        // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
	        static fromDER(hex) {
	            const { r, s } = DER.toSig(ensureBytes('DER', hex));
	            return new Signature(r, s);
	        }
	        assertValidity() {
	            aInRange('r', this.r, _1n$1, CURVE_ORDER); // r in [1..N]
	            aInRange('s', this.s, _1n$1, CURVE_ORDER); // s in [1..N]
	        }
	        addRecoveryBit(recovery) {
	            return new Signature(this.r, this.s, recovery);
	        }
	        recoverPublicKey(msgHash) {
	            const { r, s, recovery: rec } = this;
	            const h = bits2int_modN(ensureBytes('msgHash', msgHash)); // Truncate hash
	            if (rec == null || ![0, 1, 2, 3].includes(rec))
	                throw new Error('recovery id invalid');
	            const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
	            if (radj >= Fp.ORDER)
	                throw new Error('recovery id 2 or 3 invalid');
	            const prefix = (rec & 1) === 0 ? '02' : '03';
	            const R = Point.fromHex(prefix + numToNByteStr(radj));
	            const ir = invN(radj); // r^-1
	            const u1 = modN(-h * ir); // -hr^-1
	            const u2 = modN(s * ir); // sr^-1
	            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
	            if (!Q)
	                throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
	            Q.assertValidity();
	            return Q;
	        }
	        // Signatures should be low-s, to prevent malleability.
	        hasHighS() {
	            return isBiggerThanHalfOrder(this.s);
	        }
	        normalizeS() {
	            return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
	        }
	        // DER-encoded
	        toDERRawBytes() {
	            return hexToBytes(this.toDERHex());
	        }
	        toDERHex() {
	            return DER.hexFromSig({ r: this.r, s: this.s });
	        }
	        // padded bytes of r, then padded bytes of s
	        toCompactRawBytes() {
	            return hexToBytes(this.toCompactHex());
	        }
	        toCompactHex() {
	            return numToNByteStr(this.r) + numToNByteStr(this.s);
	        }
	    }
	    const utils = {
	        isValidPrivateKey(privateKey) {
	            try {
	                normPrivateKeyToScalar(privateKey);
	                return true;
	            }
	            catch (error) {
	                return false;
	            }
	        },
	        normPrivateKeyToScalar: normPrivateKeyToScalar,
	        /**
	         * Produces cryptographically secure private key from random of size
	         * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
	         */
	        randomPrivateKey: () => {
	            const length = getMinHashLength(CURVE.n);
	            return mapHashToField(CURVE.randomBytes(length), CURVE.n);
	        },
	        /**
	         * Creates precompute table for an arbitrary EC point. Makes point "cached".
	         * Allows to massively speed-up `point.multiply(scalar)`.
	         * @returns cached point
	         * @example
	         * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
	         * fast.multiply(privKey); // much faster ECDH now
	         */
	        precompute(windowSize = 8, point = Point.BASE) {
	            point._setWindowSize(windowSize);
	            point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
	            return point;
	        },
	    };
	    /**
	     * Computes public key for a private key. Checks for validity of the private key.
	     * @param privateKey private key
	     * @param isCompressed whether to return compact (default), or full key
	     * @returns Public key, full when isCompressed=false; short when isCompressed=true
	     */
	    function getPublicKey(privateKey, isCompressed = true) {
	        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
	    }
	    /**
	     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
	     */
	    function isProbPub(item) {
	        const arr = isBytes(item);
	        const str = typeof item === 'string';
	        const len = (arr || str) && item.length;
	        if (arr)
	            return len === compressedLen || len === uncompressedLen;
	        if (str)
	            return len === 2 * compressedLen || len === 2 * uncompressedLen;
	        if (item instanceof Point)
	            return true;
	        return false;
	    }
	    /**
	     * ECDH (Elliptic Curve Diffie Hellman).
	     * Computes shared public key from private key and public key.
	     * Checks: 1) private key validity 2) shared key is on-curve.
	     * Does NOT hash the result.
	     * @param privateA private key
	     * @param publicB different public key
	     * @param isCompressed whether to return compact (default), or full key
	     * @returns shared public key
	     */
	    function getSharedSecret(privateA, publicB, isCompressed = true) {
	        if (isProbPub(privateA))
	            throw new Error('first arg must be private key');
	        if (!isProbPub(publicB))
	            throw new Error('second arg must be public key');
	        const b = Point.fromHex(publicB); // check for being on-curve
	        return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
	    }
	    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
	    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
	    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
	    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
	    const bits2int = CURVE.bits2int ||
	        function (bytes) {
	            // Our custom check "just in case"
	            if (bytes.length > 8192)
	                throw new Error('input is too large');
	            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
	            // for some cases, since bytes.length * 8 is not actual bitLength.
	            const num = bytesToNumberBE(bytes); // check for == u8 done here
	            const delta = bytes.length * 8 - CURVE.nBitLength; // truncate to nBitLength leftmost bits
	            return delta > 0 ? num >> BigInt(delta) : num;
	        };
	    const bits2int_modN = CURVE.bits2int_modN ||
	        function (bytes) {
	            return modN(bits2int(bytes)); // can't use bytesToNumberBE here
	        };
	    // NOTE: pads output with zero as per spec
	    const ORDER_MASK = bitMask(CURVE.nBitLength);
	    /**
	     * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
	     */
	    function int2octets(num) {
	        aInRange('num < 2^' + CURVE.nBitLength, num, _0n, ORDER_MASK);
	        // works with order, can have different size than numToField!
	        return numberToBytesBE(num, CURVE.nByteLength);
	    }
	    // Steps A, D of RFC6979 3.2
	    // Creates RFC6979 seed; converts msg/privKey to numbers.
	    // Used only in sign, not in verify.
	    // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order,
	    // this will be invalid at least for P521. Also it can be bigger for P224 + SHA256
	    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
	        if (['recovered', 'canonical'].some((k) => k in opts))
	            throw new Error('sign() legacy options not supported');
	        const { hash, randomBytes } = CURVE;
	        let { lowS, prehash, extraEntropy: ent } = opts; // generates low-s sigs by default
	        if (lowS == null)
	            lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
	        msgHash = ensureBytes('msgHash', msgHash);
	        validateSigVerOpts(opts);
	        if (prehash)
	            msgHash = ensureBytes('prehashed msgHash', hash(msgHash));
	        // We can't later call bits2octets, since nested bits2int is broken for curves
	        // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
	        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
	        const h1int = bits2int_modN(msgHash);
	        const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
	        const seedArgs = [int2octets(d), int2octets(h1int)];
	        // extraEntropy. RFC6979 3.6: additional k' (optional).
	        if (ent != null && ent !== false) {
	            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
	            const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
	            seedArgs.push(ensureBytes('extraEntropy', e)); // check for being bytes
	        }
	        const seed = concatBytes(...seedArgs); // Step D of RFC6979 3.2
	        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
	        // Converts signature params into point w r/s, checks result for validity.
	        function k2sig(kBytes) {
	            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
	            const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
	            if (!isWithinCurveOrder(k))
	                return; // Important: all mod() calls here must be done over N
	            const ik = invN(k); // k^-1 mod n
	            const q = Point.BASE.multiply(k).toAffine(); // q = Gk
	            const r = modN(q.x); // r = q.x mod n
	            if (r === _0n)
	                return;
	            // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
	            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
	            // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
	            const s = modN(ik * modN(m + r * d)); // Not using blinding here
	            if (s === _0n)
	                return;
	            let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n$1); // recovery bit (2 or 3, when q.x > n)
	            let normS = s;
	            if (lowS && isBiggerThanHalfOrder(s)) {
	                normS = normalizeS(s); // if lowS was passed, ensure s is always
	                recovery ^= 1; // // in the bottom half of N
	            }
	            return new Signature(r, normS, recovery); // use normS, not s
	        }
	        return { seed, k2sig };
	    }
	    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
	    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
	    /**
	     * Signs message hash with a private key.
	     * ```
	     * sign(m, d, k) where
	     *   (x, y) = G × k
	     *   r = x mod n
	     *   s = (m + dr)/k mod n
	     * ```
	     * @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
	     * @param privKey private key
	     * @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
	     * @returns signature with recovery param
	     */
	    function sign(msgHash, privKey, opts = defaultSigOpts) {
	        const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
	        const C = CURVE;
	        const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
	        return drbg(seed, k2sig); // Steps B, C, D, E, F, G
	    }
	    // Enable precomputes. Slows down first publicKey computation by 20ms.
	    Point.BASE._setWindowSize(8);
	    // utils.precompute(8, ProjectivePoint.BASE)
	    /**
	     * Verifies a signature against message hash and public key.
	     * Rejects lowS signatures by default: to override,
	     * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
	     *
	     * ```
	     * verify(r, s, h, P) where
	     *   U1 = hs^-1 mod n
	     *   U2 = rs^-1 mod n
	     *   R = U1⋅G - U2⋅P
	     *   mod(R.x, n) == r
	     * ```
	     */
	    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
	        const sg = signature;
	        msgHash = ensureBytes('msgHash', msgHash);
	        publicKey = ensureBytes('publicKey', publicKey);
	        const { lowS, prehash, format } = opts;
	        // Verify opts, deduce signature format
	        validateSigVerOpts(opts);
	        if ('strict' in opts)
	            throw new Error('options.strict was renamed to lowS');
	        if (format !== undefined && format !== 'compact' && format !== 'der')
	            throw new Error('format must be compact or der');
	        const isHex = typeof sg === 'string' || isBytes(sg);
	        const isObj = !isHex &&
	            !format &&
	            typeof sg === 'object' &&
	            sg !== null &&
	            typeof sg.r === 'bigint' &&
	            typeof sg.s === 'bigint';
	        if (!isHex && !isObj)
	            throw new Error('invalid signature, expected Uint8Array, hex string or Signature instance');
	        let _sig = undefined;
	        let P;
	        try {
	            if (isObj)
	                _sig = new Signature(sg.r, sg.s);
	            if (isHex) {
	                // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
	                // Since DER can also be 2*nByteLength bytes, we check for it first.
	                try {
	                    if (format !== 'compact')
	                        _sig = Signature.fromDER(sg);
	                }
	                catch (derError) {
	                    if (!(derError instanceof DER.Err))
	                        throw derError;
	                }
	                if (!_sig && format !== 'der')
	                    _sig = Signature.fromCompact(sg);
	            }
	            P = Point.fromHex(publicKey);
	        }
	        catch (error) {
	            return false;
	        }
	        if (!_sig)
	            return false;
	        if (lowS && _sig.hasHighS())
	            return false;
	        if (prehash)
	            msgHash = CURVE.hash(msgHash);
	        const { r, s } = _sig;
	        const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
	        const is = invN(s); // s^-1
	        const u1 = modN(h * is); // u1 = hs^-1 mod n
	        const u2 = modN(r * is); // u2 = rs^-1 mod n
	        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
	        if (!R)
	            return false;
	        const v = modN(R.x);
	        return v === r;
	    }
	    return {
	        CURVE,
	        getPublicKey,
	        getSharedSecret,
	        sign,
	        verify,
	        ProjectivePoint: Point,
	        Signature,
	        utils,
	    };
	}

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// connects noble-curves to noble-hashes
	function getHash(hash) {
	    return {
	        hash,
	        hmac: (key, ...msgs) => hmac(hash, key, concatBytes$1(...msgs)),
	        randomBytes,
	    };
	}
	function createCurve(curveDef, defHash) {
	    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
	    return Object.freeze({ ...create(defHash), create });
	}

	/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
	const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
	const _1n = BigInt(1);
	const _2n = BigInt(2);
	const divNearest = (a, b) => (a + b / _2n) / b;
	/**
	 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
	 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
	 */
	function sqrtMod(y) {
	    const P = secp256k1P;
	    // prettier-ignore
	    const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
	    // prettier-ignore
	    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
	    const b2 = (y * y * y) % P; // x^3, 11
	    const b3 = (b2 * b2 * y) % P; // x^7
	    const b6 = (pow2(b3, _3n, P) * b3) % P;
	    const b9 = (pow2(b6, _3n, P) * b3) % P;
	    const b11 = (pow2(b9, _2n, P) * b2) % P;
	    const b22 = (pow2(b11, _11n, P) * b11) % P;
	    const b44 = (pow2(b22, _22n, P) * b22) % P;
	    const b88 = (pow2(b44, _44n, P) * b44) % P;
	    const b176 = (pow2(b88, _88n, P) * b88) % P;
	    const b220 = (pow2(b176, _44n, P) * b44) % P;
	    const b223 = (pow2(b220, _3n, P) * b3) % P;
	    const t1 = (pow2(b223, _23n, P) * b22) % P;
	    const t2 = (pow2(t1, _6n, P) * b2) % P;
	    const root = pow2(t2, _2n, P);
	    if (!Fpk1.eql(Fpk1.sqr(root), y))
	        throw new Error('Cannot find square root');
	    return root;
	}
	const Fpk1 = Field(secp256k1P, undefined, undefined, { sqrt: sqrtMod });
	/**
	 * secp256k1 short weierstrass curve and ECDSA signatures over it.
	 */
	const secp256k1 = createCurve({
	    a: BigInt(0), // equation params: a, b
	    b: BigInt(7), // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
	    Fp: Fpk1, // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
	    n: secp256k1N, // Curve order, total count of valid points in the field
	    // Base point (x, y) aka generator point
	    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
	    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
	    h: BigInt(1), // Cofactor
	    lowS: true, // Allow only low-S signatures by default in sign() and verify()
	    /**
	     * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
	     * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
	     * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
	     * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
	     */
	    endo: {
	        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
	        splitScalar: (k) => {
	            const n = secp256k1N;
	            const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
	            const b1 = -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
	            const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
	            const b2 = a1;
	            const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
	            const c1 = divNearest(b2 * k, n);
	            const c2 = divNearest(-b1 * k, n);
	            let k1 = mod(k - c1 * a1 - c2 * a2, n);
	            let k2 = mod(-c1 * b1 - c2 * b2, n);
	            const k1neg = k1 > POW_2_128;
	            const k2neg = k2 > POW_2_128;
	            if (k1neg)
	                k1 = n - k1;
	            if (k2neg)
	                k2 = n - k2;
	            if (k1 > POW_2_128 || k2 > POW_2_128) {
	                throw new Error('splitScalar: Endomorphism failed, k=' + k);
	            }
	            return { k1neg, k1, k2neg, k2 };
	        },
	    },
	}, sha256);
	// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
	// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
	BigInt(0);
	secp256k1.ProjectivePoint;

	const ecdsaSign = (msgHash, privKey) => {
	  const signature = secp256k1.sign(msgHash, privKey);
	  return [signature.toCompactRawBytes(), signature.recovery];
	};
	secp256k1.utils.isValidPrivateKey;
	const publicKeyCreate = secp256k1.getPublicKey;

	const PRIVATE_KEY_BYTES = 32;
	const ETHEREUM_ADDRESS_BYTES = 20;
	const PUBLIC_KEY_BYTES = 64;
	const SIGNATURE_BYTES = 64;
	const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 11;
	const BASE16_ENCODER = getBase16Encoder();
	const ETHEREUM_ADDRESS_STRING_PATTERN = /^(?:0x)?([0-9a-fA-F]{40})$/;

	/**
	 * Params for creating an secp256k1 instruction using a public key
	 */

	/**
	 * Params for creating an secp256k1 instruction using an Ethereum address
	 */

	/**
	 * Params for creating an secp256k1 instruction using a private key
	 */

	const SECP256K1_INSTRUCTION_DATA_ENCODER = getStructEncoder([['numSignatures', getU8Encoder()], ['signatureOffset', getU16Encoder()], ['signatureInstructionIndex', getU8Encoder()], ['ethAddressOffset', getU16Encoder()], ['ethAddressInstructionIndex', getU8Encoder()], ['messageDataOffset', getU16Encoder()], ['messageDataSize', getU16Encoder()], ['messageInstructionIndex', getU8Encoder()], ['ethAddress', fixEncoderSize(getBytesEncoder(), ETHEREUM_ADDRESS_BYTES)], ['signature', fixEncoderSize(getBytesEncoder(), SIGNATURE_BYTES)], ['recoveryId', getU8Encoder()]]);
	class Secp256k1Program {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the secp256k1 program
	   */

	  /**
	   * Construct an Ethereum address from a secp256k1 public key.
	   * @param {Uint8Array | Array<number>} publicKey a 64 byte
	   * secp256k1 public key
	   */
	  static publicKeyToEthAddress(publicKey) {
	    const publicKeyBytes = toPackedUint8Array(publicKey);
	    assert$1(publicKeyBytes.length === PUBLIC_KEY_BYTES, `Public key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKeyBytes.length} bytes`);
	    try {
	      return keccak_256(publicKeyBytes).slice(-ETHEREUM_ADDRESS_BYTES);
	    } catch (error) {
	      throw new Error(`Error constructing Ethereum address: ${error}`);
	    }
	  }

	  /**
	   * Create an secp256k1 instruction with a public key. The public key
	   * must be 64 bytes long.
	   */
	  static createInstructionWithPublicKey(params) {
	    const {
	      publicKey,
	      message,
	      signature,
	      recoveryId,
	      instructionIndex
	    } = params;
	    return Secp256k1Program.createInstructionWithEthAddress({
	      ethAddress: Secp256k1Program.publicKeyToEthAddress(publicKey),
	      message,
	      signature,
	      recoveryId,
	      instructionIndex
	    });
	  }

	  /**
	   * Create an secp256k1 instruction with an Ethereum address. The address
	   * must be a hex string or 20 raw bytes.
	   */
	  static createInstructionWithEthAddress(params) {
	    const {
	      ethAddress: rawAddress,
	      message,
	      signature,
	      recoveryId,
	      instructionIndex = 0
	    } = params;
	    const messageBytes = toUint8ArrayView(message);
	    const signatureBytes = toUint8ArrayView(signature);
	    let ethAddressBytes;
	    if (typeof rawAddress === 'string') {
	      const addressMatch = ETHEREUM_ADDRESS_STRING_PATTERN.exec(rawAddress);
	      assert$1(addressMatch, `Address must be a ${ETHEREUM_ADDRESS_BYTES * 2}-character hex string with an optional 0x prefix`);
	      ethAddressBytes = new Uint8Array(BASE16_ENCODER.encode(addressMatch[1]));
	    } else {
	      ethAddressBytes = toUint8ArrayView(rawAddress);
	    }
	    assert$1(ethAddressBytes.length === ETHEREUM_ADDRESS_BYTES, `Address must be ${ETHEREUM_ADDRESS_BYTES} bytes but received ${ethAddressBytes.length} bytes`);
	    assert$1(signatureBytes.length === SIGNATURE_BYTES, `Signature must be ${SIGNATURE_BYTES} bytes but received ${signatureBytes.length} bytes`);
	    const dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;
	    const ethAddressOffset = dataStart;
	    const signatureOffset = dataStart + ethAddressBytes.length;
	    const messageDataOffset = signatureOffset + SIGNATURE_BYTES + 1;
	    const numSignatures = 1;
	    const instructionData = new Uint8Array(SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize + messageBytes.length);
	    SECP256K1_INSTRUCTION_DATA_ENCODER.write({
	      numSignatures,
	      signatureOffset,
	      signatureInstructionIndex: instructionIndex,
	      ethAddressOffset,
	      ethAddressInstructionIndex: instructionIndex,
	      messageDataOffset,
	      messageDataSize: messageBytes.length,
	      messageInstructionIndex: instructionIndex,
	      signature: signatureBytes,
	      ethAddress: ethAddressBytes,
	      recoveryId
	    }, instructionData, 0);
	    instructionData.set(messageBytes, SECP256K1_INSTRUCTION_DATA_ENCODER.fixedSize);
	    return new TransactionInstruction({
	      keys: [],
	      programId: Secp256k1Program.programId,
	      data: instructionData
	    });
	  }

	  /**
	   * Create an secp256k1 instruction with a private key. The private key
	   * must be 32 bytes long.
	   */
	  static createInstructionWithPrivateKey(params) {
	    const {
	      privateKey: pkey,
	      message,
	      instructionIndex
	    } = params;
	    const privateKey = toPackedUint8Array(pkey);
	    const messageBytes = toPackedUint8Array(message);
	    assert$1(privateKey.length === PRIVATE_KEY_BYTES, `Private key must be ${PRIVATE_KEY_BYTES} bytes but received ${privateKey.length} bytes`);
	    try {
	      const publicKey = publicKeyCreate(privateKey, false /* isCompressed */).slice(1); // throw away leading byte
	      const messageHash = keccak_256(messageBytes);
	      const [signature, recoveryId] = ecdsaSign(messageHash, privateKey);
	      return this.createInstructionWithPublicKey({
	        publicKey,
	        message: messageBytes,
	        signature,
	        recoveryId,
	        instructionIndex
	      });
	    } catch (error) {
	      throw new Error(`Error creating instruction; ${error}`);
	    }
	  }
	}
	Secp256k1Program.programId = new Address('KeccakSecp256k11111111111111111111111111111');

	var _Lockup;

	/**
	 * Address of the stake config account which configures the rate
	 * of stake warmup and cooldown as well as the slashing penalty.
	 */
	const STAKE_CONFIG_ID = new Address('StakeConfig11111111111111111111111111111111');
	const STAKE_PROGRAM_ID = new Address('Stake11111111111111111111111111111111111111');
	const U32_CODEC$2 = getU32Codec();
	const U64_CODEC$2 = getU64Codec();
	const I64_NUMBER_CODEC$1 = transformCodec(getI64Codec(), value => BigInt(value), value => Number(value));
	const PUBLIC_KEY_BYTES_CODEC$1 = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
	const getRustStringCodec$1 = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$2);
	const RUST_STRING_CODEC$1 = getRustStringCodec$1();
	const AUTHORIZED_CODEC = getStructCodec([['staker', PUBLIC_KEY_BYTES_CODEC$1], ['withdrawer', PUBLIC_KEY_BYTES_CODEC$1]]);
	const LOCKUP_CODEC = getStructCodec([['unixTimestamp', I64_NUMBER_CODEC$1], ['epoch', I64_NUMBER_CODEC$1], ['custodian', PUBLIC_KEY_BYTES_CODEC$1]]);

	/**
	 * Stake account authority info
	 */
	class Authorized {
	  /**
	   * Create a new Authorized object
	   * @param staker the stake authority
	   * @param withdrawer the withdraw authority
	   */
	  constructor(staker, withdrawer) {
	    /** stake authority */
	    this.staker = void 0;
	    /** withdraw authority */
	    this.withdrawer = void 0;
	    this.staker = staker;
	    this.withdrawer = withdrawer;
	  }
	}
	/**
	 * Stake account lockup info
	 */
	class Lockup {
	  /**
	   * Create a new Lockup object
	   */
	  constructor(unixTimestamp, epoch, custodian) {
	    /** Unix timestamp of lockup expiration */
	    this.unixTimestamp = void 0;
	    /** Epoch of lockup expiration */
	    this.epoch = void 0;
	    /** Lockup custodian authority */
	    this.custodian = void 0;
	    this.unixTimestamp = unixTimestamp;
	    this.epoch = epoch;
	    this.custodian = custodian;
	  }

	  /**
	   * Default, inactive Lockup value
	   */
	}
	_Lockup = Lockup;
	Lockup.default = new _Lockup(0, 0, Address.default);
	/**
	 * Create stake account transaction params
	 */
	/**
	 * Create stake account with seed transaction params
	 */
	/**
	 * Initialize stake instruction params
	 */
	/**
	 * Delegate stake instruction params
	 */
	/**
	 * Authorize stake instruction params
	 */
	/**
	 * Authorize stake instruction params using a derived key
	 */
	/**
	 * Split stake instruction params
	 */
	/**
	 * Split with seed transaction params
	 */
	/**
	 * Withdraw stake instruction params
	 */
	/**
	 * Deactivate stake instruction params
	 */
	/**
	 * Merge stake instruction params
	 */
	/**
	 * Stake Instruction class
	 */
	class StakeInstruction {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Decode a stake instruction and retrieve the instruction type.
	   */
	  static decodeInstructionType(instruction) {
	    this.checkProgramId(instruction.programId);
	    return INSTRUCTIONS$1.getInstructionType(instruction);
	  }

	  /**
	   * Decode a initialize stake instruction and retrieve the instruction params.
	   */
	  static decodeInitialize(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      authorized,
	      lockup
	    } = INSTRUCTIONS$1.Initialize.decode(instruction);
	    return {
	      stakePubkey: instruction.keys[0].pubkey,
	      authorized: new Authorized(new Address(authorized.staker), new Address(authorized.withdrawer)),
	      lockup: new Lockup(lockup.unixTimestamp, lockup.epoch, new Address(lockup.custodian))
	    };
	  }

	  /**
	   * Decode a delegate stake instruction and retrieve the instruction params.
	   */
	  static decodeDelegate(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 6);
	    INSTRUCTIONS$1.Delegate.decode(instruction);
	    return {
	      stakePubkey: instruction.keys[0].pubkey,
	      votePubkey: instruction.keys[1].pubkey,
	      authorizedPubkey: instruction.keys[5].pubkey
	    };
	  }

	  /**
	   * Decode an authorize stake instruction and retrieve the instruction params.
	   */
	  static decodeAuthorize(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      newAuthorized,
	      stakeAuthorizationType
	    } = INSTRUCTIONS$1.Authorize.decode(instruction);
	    const o = {
	      stakePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: instruction.keys[2].pubkey,
	      newAuthorizedPubkey: new Address(newAuthorized),
	      stakeAuthorizationType: {
	        index: stakeAuthorizationType
	      }
	    };
	    if (instruction.keys.length > 3) {
	      o.custodianPubkey = instruction.keys[3].pubkey;
	    }
	    return o;
	  }

	  /**
	   * Decode an authorize-with-seed stake instruction and retrieve the instruction params.
	   */
	  static decodeAuthorizeWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 2);
	    const {
	      newAuthorized,
	      stakeAuthorizationType,
	      authoritySeed,
	      authorityOwner
	    } = INSTRUCTIONS$1.AuthorizeWithSeed.decode(instruction);
	    const o = {
	      stakePubkey: instruction.keys[0].pubkey,
	      authorityBase: instruction.keys[1].pubkey,
	      authoritySeed: authoritySeed,
	      authorityOwner: new Address(authorityOwner),
	      newAuthorizedPubkey: new Address(newAuthorized),
	      stakeAuthorizationType: {
	        index: stakeAuthorizationType
	      }
	    };
	    if (instruction.keys.length > 3) {
	      o.custodianPubkey = instruction.keys[3].pubkey;
	    }
	    return o;
	  }

	  /**
	   * Decode a split stake instruction and retrieve the instruction params.
	   */
	  static decodeSplit(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      lamports
	    } = INSTRUCTIONS$1.Split.decode(instruction);
	    return {
	      stakePubkey: instruction.keys[0].pubkey,
	      splitStakePubkey: instruction.keys[1].pubkey,
	      authorizedPubkey: instruction.keys[2].pubkey,
	      lamports
	    };
	  }

	  /**
	   * Decode a merge stake instruction and retrieve the instruction params.
	   */
	  static decodeMerge(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    INSTRUCTIONS$1.Merge.decode(instruction);
	    return {
	      stakePubkey: instruction.keys[0].pubkey,
	      sourceStakePubKey: instruction.keys[1].pubkey,
	      authorizedPubkey: instruction.keys[4].pubkey
	    };
	  }

	  /**
	   * Decode a withdraw stake instruction and retrieve the instruction params.
	   */
	  static decodeWithdraw(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 5);
	    const {
	      lamports
	    } = INSTRUCTIONS$1.Withdraw.decode(instruction);
	    const o = {
	      stakePubkey: instruction.keys[0].pubkey,
	      toPubkey: instruction.keys[1].pubkey,
	      authorizedPubkey: instruction.keys[4].pubkey,
	      lamports
	    };
	    if (instruction.keys.length > 5) {
	      o.custodianPubkey = instruction.keys[5].pubkey;
	    }
	    return o;
	  }

	  /**
	   * Decode a deactivate stake instruction and retrieve the instruction params.
	   */
	  static decodeDeactivate(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    INSTRUCTIONS$1.Deactivate.decode(instruction);
	    return {
	      stakePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: instruction.keys[2].pubkey
	    };
	  }

	  /**
	   * @internal
	   */
	  static checkProgramId(programId) {
	    if (!programId.equals(StakeProgram.programId)) {
	      throw new Error('invalid instruction; programId is not StakeProgram');
	    }
	  }

	  /**
	   * @internal
	   */
	  static checkKeyLength(keys, expectedLength) {
	    if (keys.length < expectedLength) {
	      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
	    }
	  }
	}

	/**
	 * An enumeration of valid StakeInstructionType's
	 */

	/**
	 * @internal
	 */
	const STAKE_INSTRUCTIONS = ProgramInstructions.create({
	  programId: STAKE_PROGRAM_ID,
	  instructionIndexCodec: U32_CODEC$2,
	  instructions: {
	    Initialize: {
	      index: 0,
	      codec: getStructCodec([['instruction', U32_CODEC$2], ['authorized', AUTHORIZED_CODEC], ['lockup', LOCKUP_CODEC]])
	    },
	    Authorize: {
	      index: 1,
	      codec: getStructCodec([['instruction', U32_CODEC$2], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC$1], ['stakeAuthorizationType', U32_CODEC$2]])
	    },
	    Delegate: {
	      index: 2,
	      codec: getStructCodec([['instruction', U32_CODEC$2]])
	    },
	    Split: {
	      index: 3,
	      codec: getStructCodec([['instruction', U32_CODEC$2], ['lamports', I64_NUMBER_CODEC$1]])
	    },
	    Withdraw: {
	      index: 4,
	      codec: getStructCodec([['instruction', U32_CODEC$2], ['lamports', I64_NUMBER_CODEC$1]])
	    },
	    Deactivate: {
	      index: 5,
	      codec: getStructCodec([['instruction', U32_CODEC$2]])
	    },
	    Merge: {
	      index: 7,
	      codec: getStructCodec([['instruction', U32_CODEC$2]])
	    },
	    AuthorizeWithSeed: {
	      index: 8,
	      codec: getStructCodec([['instruction', U32_CODEC$2], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC$1], ['stakeAuthorizationType', U32_CODEC$2], ['authoritySeed', RUST_STRING_CODEC$1], ['authorityOwner', PUBLIC_KEY_BYTES_CODEC$1]])
	    }
	  }
	});
	const INSTRUCTIONS$1 = STAKE_INSTRUCTIONS;

	/**
	 * An enumeration of valid stake InstructionType's
	 * @internal
	 * @deprecated To be removed in v3. Use StakeProgram helpers or ProgramInstructions instead.
	 */
	const STAKE_INSTRUCTION_LAYOUTS = Object.freeze({
	  Initialize: {
	    index: 0,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), authorized(), lockup()])
	  },
	  Authorize: {
	    index: 1,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('newAuthorized'), LayoutExports.u32('stakeAuthorizationType')])
	  },
	  Delegate: {
	    index: 2,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  Split: {
	    index: 3,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('lamports')])
	  },
	  Withdraw: {
	    index: 4,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('lamports')])
	  },
	  Deactivate: {
	    index: 5,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  Merge: {
	    index: 7,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  AuthorizeWithSeed: {
	    index: 8,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('newAuthorized'), LayoutExports.u32('stakeAuthorizationType'), rustString('authoritySeed'), publicKey('authorityOwner')])
	  }
	});

	/**
	 * Stake authorization type
	 */

	/**
	 * An enumeration of valid StakeAuthorizationLayout's
	 */
	const StakeAuthorizationLayout = Object.freeze({
	  Staker: {
	    index: 0
	  },
	  Withdrawer: {
	    index: 1
	  }
	});

	/**
	 * Factory class for transactions to interact with the Stake program
	 */
	class StakeProgram {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the Stake program
	   */

	  /**
	   * Generate an Initialize instruction to add to a Stake Create transaction
	   */
	  static initialize(params) {
	    const {
	      stakePubkey,
	      authorized,
	      lockup: maybeLockup
	    } = params;
	    const lockup = maybeLockup || Lockup.default;
	    return INSTRUCTIONS$1.Initialize.build({
	      authorized: {
	        staker: authorized.staker.toBytes(),
	        withdrawer: authorized.withdrawer.toBytes()
	      },
	      lockup: {
	        unixTimestamp: lockup.unixTimestamp,
	        epoch: lockup.epoch,
	        custodian: lockup.custodian.toBytes()
	      }
	    }, {
	      keys: [{
	        pubkey: stakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a Transaction that creates a new Stake account at
	   *   an address generated with `from`, a seed, and the Stake programId
	   */
	  static createAccountWithSeed(params) {
	    const transaction = new Transaction();
	    transaction.add(SystemProgram.createAccountWithSeed({
	      fromPubkey: params.fromPubkey,
	      newAccountPubkey: params.stakePubkey,
	      basePubkey: params.basePubkey,
	      seed: params.seed,
	      lamports: params.lamports,
	      space: this.space,
	      programId: this.programId
	    }));
	    const {
	      stakePubkey,
	      authorized,
	      lockup
	    } = params;
	    return transaction.add(this.initialize({
	      stakePubkey,
	      authorized,
	      lockup
	    }));
	  }

	  /**
	   * Generate a Transaction that creates a new Stake account
	   */
	  static createAccount(params) {
	    const transaction = new Transaction();
	    transaction.add(SystemProgram.createAccount({
	      fromPubkey: params.fromPubkey,
	      newAccountPubkey: params.stakePubkey,
	      lamports: params.lamports,
	      space: this.space,
	      programId: this.programId
	    }));
	    const {
	      stakePubkey,
	      authorized,
	      lockup
	    } = params;
	    return transaction.add(this.initialize({
	      stakePubkey,
	      authorized,
	      lockup
	    }));
	  }

	  /**
	   * Generate a Transaction that delegates Stake tokens to a validator
	   * Vote Address. This transaction can also be used to redelegate Stake
	   * to a new validator Vote Address.
	   */
	  static delegate(params) {
	    const {
	      stakePubkey,
	      authorizedPubkey,
	      votePubkey
	    } = params;
	    return new Transaction().add(INSTRUCTIONS$1.Delegate.build(undefined, {
	      keys: [{
	        pubkey: stakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: votePubkey,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_CLOCK_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: STAKE_CONFIG_ID,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a Transaction that authorizes a new Address as Staker
	   * or Withdrawer on the Stake account.
	   */
	  static authorize(params) {
	    const {
	      stakePubkey,
	      authorizedPubkey,
	      newAuthorizedPubkey,
	      stakeAuthorizationType,
	      custodianPubkey
	    } = params;
	    const keys = [{
	      pubkey: stakePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: SYSVAR_CLOCK_PUBKEY,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: authorizedPubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    if (custodianPubkey) {
	      keys.push({
	        pubkey: custodianPubkey,
	        isSigner: true,
	        isWritable: false
	      });
	    }
	    return new Transaction().add(INSTRUCTIONS$1.Authorize.build({
	      newAuthorized: newAuthorizedPubkey.toBytes(),
	      stakeAuthorizationType: stakeAuthorizationType.index
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a Transaction that authorizes a new Address as Staker
	   * or Withdrawer on the Stake account.
	   */
	  static authorizeWithSeed(params) {
	    const {
	      stakePubkey,
	      authorityBase,
	      authoritySeed,
	      authorityOwner,
	      newAuthorizedPubkey,
	      stakeAuthorizationType,
	      custodianPubkey
	    } = params;
	    const keys = [{
	      pubkey: stakePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: authorityBase,
	      isSigner: true,
	      isWritable: false
	    }, {
	      pubkey: SYSVAR_CLOCK_PUBKEY,
	      isSigner: false,
	      isWritable: false
	    }];
	    if (custodianPubkey) {
	      keys.push({
	        pubkey: custodianPubkey,
	        isSigner: true,
	        isWritable: false
	      });
	    }
	    return new Transaction().add(INSTRUCTIONS$1.AuthorizeWithSeed.build({
	      newAuthorized: newAuthorizedPubkey.toBytes(),
	      stakeAuthorizationType: stakeAuthorizationType.index,
	      authoritySeed: authoritySeed,
	      authorityOwner: authorityOwner.toBytes()
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * @internal
	   */
	  static splitInstruction(params) {
	    const {
	      stakePubkey,
	      authorizedPubkey,
	      splitStakePubkey,
	      lamports
	    } = params;
	    return INSTRUCTIONS$1.Split.build({
	      lamports
	    }, {
	      keys: [{
	        pubkey: stakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: splitStakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a Transaction that splits Stake tokens into another stake account
	   */
	  static split(params,
	  // Compute the cost of allocating the new stake account in lamports
	  rentExemptReserve) {
	    const transaction = new Transaction();
	    transaction.add(SystemProgram.createAccount({
	      fromPubkey: params.authorizedPubkey,
	      newAccountPubkey: params.splitStakePubkey,
	      lamports: rentExemptReserve,
	      space: this.space,
	      programId: this.programId
	    }));
	    return transaction.add(this.splitInstruction(params));
	  }

	  /**
	   * Generate a Transaction that splits Stake tokens into another account
	   * derived from a base public key and seed
	   */
	  static splitWithSeed(params,
	  // If this stake account is new, compute the cost of allocating it in lamports
	  rentExemptReserve) {
	    const {
	      stakePubkey,
	      authorizedPubkey,
	      splitStakePubkey,
	      basePubkey,
	      seed,
	      lamports
	    } = params;
	    const transaction = new Transaction();
	    transaction.add(SystemProgram.allocate({
	      accountPubkey: splitStakePubkey,
	      basePubkey,
	      seed,
	      space: this.space,
	      programId: this.programId
	    }));
	    if (rentExemptReserve && rentExemptReserve > 0) {
	      transaction.add(SystemProgram.transfer({
	        fromPubkey: params.authorizedPubkey,
	        toPubkey: splitStakePubkey,
	        lamports: rentExemptReserve
	      }));
	    }
	    return transaction.add(this.splitInstruction({
	      stakePubkey,
	      authorizedPubkey,
	      splitStakePubkey,
	      lamports
	    }));
	  }

	  /**
	   * Generate a Transaction that merges Stake accounts.
	   */
	  static merge(params) {
	    const {
	      stakePubkey,
	      sourceStakePubKey,
	      authorizedPubkey
	    } = params;
	    return new Transaction().add(INSTRUCTIONS$1.Merge.build(undefined, {
	      keys: [{
	        pubkey: stakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: sourceStakePubKey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_CLOCK_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a Transaction that withdraws deactivated Stake tokens.
	   */
	  static withdraw(params) {
	    const {
	      stakePubkey,
	      authorizedPubkey,
	      toPubkey,
	      lamports,
	      custodianPubkey
	    } = params;
	    const keys = [{
	      pubkey: stakePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: toPubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: SYSVAR_CLOCK_PUBKEY,
	      isSigner: false,
	      isWritable: false
	    }, {
	      pubkey: SYSVAR_STAKE_HISTORY_PUBKEY,
	      isSigner: false,
	      isWritable: false
	    }, {
	      pubkey: authorizedPubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    if (custodianPubkey) {
	      keys.push({
	        pubkey: custodianPubkey,
	        isSigner: true,
	        isWritable: false
	      });
	    }
	    return new Transaction().add(INSTRUCTIONS$1.Withdraw.build({
	      lamports
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a Transaction that deactivates Stake tokens.
	   */
	  static deactivate(params) {
	    const {
	      stakePubkey,
	      authorizedPubkey
	    } = params;
	    return new Transaction().add(INSTRUCTIONS$1.Deactivate.build(undefined, {
	      keys: [{
	        pubkey: stakePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_CLOCK_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: authorizedPubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    }));
	  }
	}
	StakeProgram.programId = STAKE_PROGRAM_ID;
	/**
	 * Max space of a Stake account
	 *
	 * This is generated from the solana-stake-program StakeState struct as
	 * `StakeStateV2::size_of()`:
	 * https://docs.rs/solana-stake-program/latest/solana_stake_program/stake_state/enum.StakeStateV2.html
	 */
	StakeProgram.space = 200;

	/**
	 * Vote account info
	 */
	class VoteInit {
	  /** [0, 100] */

	  constructor(nodePubkey, authorizedVoter, authorizedWithdrawer, commission) {
	    this.nodePubkey = void 0;
	    this.authorizedVoter = void 0;
	    this.authorizedWithdrawer = void 0;
	    this.commission = void 0;
	    this.nodePubkey = nodePubkey;
	    this.authorizedVoter = authorizedVoter;
	    this.authorizedWithdrawer = authorizedWithdrawer;
	    this.commission = commission;
	  }
	}

	/**
	 * Create vote account transaction params
	 */

	/**
	 * InitializeAccount instruction params
	 */

	/**
	 * Authorize instruction params
	 */

	/**
	 * AuthorizeWithSeed instruction params
	 */

	/**
	 * Withdraw from vote account transaction params
	 */

	/**
	 * Update validator identity (node pubkey) vote account instruction params.
	 */

	/**
	 * Vote Instruction class
	 */
	class VoteInstruction {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Decode a vote instruction and retrieve the instruction type.
	   */
	  static decodeInstructionType(instruction) {
	    this.checkProgramId(instruction.programId);
	    return INSTRUCTIONS.getInstructionType(instruction);
	  }

	  /**
	   * Decode an initialize vote instruction and retrieve the instruction params.
	   */
	  static decodeInitializeAccount(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 4);
	    const {
	      voteInit
	    } = INSTRUCTIONS.InitializeAccount.decode(instruction);
	    return {
	      votePubkey: instruction.keys[0].pubkey,
	      nodePubkey: instruction.keys[3].pubkey,
	      voteInit: new VoteInit(new Address(voteInit.nodePubkey), new Address(voteInit.authorizedVoter), new Address(voteInit.authorizedWithdrawer), voteInit.commission)
	    };
	  }

	  /**
	   * Decode an authorize instruction and retrieve the instruction params.
	   */
	  static decodeAuthorize(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      newAuthorized,
	      voteAuthorizationType
	    } = INSTRUCTIONS.Authorize.decode(instruction);
	    return {
	      votePubkey: instruction.keys[0].pubkey,
	      authorizedPubkey: instruction.keys[2].pubkey,
	      newAuthorizedPubkey: new Address(newAuthorized),
	      voteAuthorizationType: {
	        index: voteAuthorizationType
	      }
	    };
	  }

	  /**
	   * Decode an authorize instruction and retrieve the instruction params.
	   */
	  static decodeAuthorizeWithSeed(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      voteAuthorizeWithSeedArgs: {
	        currentAuthorityDerivedKeyOwnerPubkey,
	        currentAuthorityDerivedKeySeed,
	        newAuthorized,
	        voteAuthorizationType
	      }
	    } = INSTRUCTIONS.AuthorizeWithSeed.decode(instruction);
	    return {
	      currentAuthorityDerivedKeyBasePubkey: instruction.keys[2].pubkey,
	      currentAuthorityDerivedKeyOwnerPubkey: new Address(currentAuthorityDerivedKeyOwnerPubkey),
	      currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
	      newAuthorizedPubkey: new Address(newAuthorized),
	      voteAuthorizationType: {
	        index: voteAuthorizationType
	      },
	      votePubkey: instruction.keys[0].pubkey
	    };
	  }

	  /**
	   * Decode a withdraw instruction and retrieve the instruction params.
	   */
	  static decodeWithdraw(instruction) {
	    this.checkProgramId(instruction.programId);
	    this.checkKeyLength(instruction.keys, 3);
	    const {
	      lamports
	    } = INSTRUCTIONS.Withdraw.decode(instruction);
	    return {
	      votePubkey: instruction.keys[0].pubkey,
	      authorizedWithdrawerPubkey: instruction.keys[2].pubkey,
	      lamports,
	      toPubkey: instruction.keys[1].pubkey
	    };
	  }

	  /**
	   * @internal
	   */
	  static checkProgramId(programId) {
	    if (!programId.equals(VoteProgram.programId)) {
	      throw new Error('invalid instruction; programId is not VoteProgram');
	    }
	  }

	  /**
	   * @internal
	   */
	  static checkKeyLength(keys, expectedLength) {
	    if (keys.length < expectedLength) {
	      throw new Error(`invalid instruction; found ${keys.length} keys, expected at least ${expectedLength}`);
	    }
	  }
	}

	/**
	 * An enumeration of valid VoteInstructionType's
	 */

	/** @internal */

	const VOTE_PROGRAM_ID$1 = new Address('Vote111111111111111111111111111111111111111');
	const U32_CODEC$1 = getU32Codec();
	const U8_CODEC$1 = getU8Codec();
	const U64_CODEC$1 = getU64Codec();
	const I64_NUMBER_CODEC = transformCodec(getI64Codec(), value => BigInt(value), value => Number(value));
	const PUBLIC_KEY_BYTES_CODEC = fixCodecSize(getBytesCodec(), 32);
	const getRustStringCodec = () => addCodecSizePrefix(getUtf8Codec(), U64_CODEC$1);
	const RUST_STRING_CODEC = getRustStringCodec();
	const VOTE_INIT_CODEC = getStructCodec([['nodePubkey', PUBLIC_KEY_BYTES_CODEC], ['authorizedVoter', PUBLIC_KEY_BYTES_CODEC], ['authorizedWithdrawer', PUBLIC_KEY_BYTES_CODEC], ['commission', U8_CODEC$1]]);
	const VOTE_AUTHORIZE_WITH_SEED_CODEC = getStructCodec([['voteAuthorizationType', U32_CODEC$1], ['currentAuthorityDerivedKeyOwnerPubkey', PUBLIC_KEY_BYTES_CODEC], ['currentAuthorityDerivedKeySeed', RUST_STRING_CODEC], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC]]);
	const INSTRUCTION_DEFS = {
	  InitializeAccount: {
	    index: 0,
	    codec: getStructCodec([['instruction', U32_CODEC$1], ['voteInit', VOTE_INIT_CODEC]])
	  },
	  Authorize: {
	    index: 1,
	    codec: getStructCodec([['instruction', U32_CODEC$1], ['newAuthorized', PUBLIC_KEY_BYTES_CODEC], ['voteAuthorizationType', U32_CODEC$1]])
	  },
	  Withdraw: {
	    index: 3,
	    codec: getStructCodec([['instruction', U32_CODEC$1], ['lamports', I64_NUMBER_CODEC]])
	  },
	  UpdateValidatorIdentity: {
	    index: 4,
	    codec: getStructCodec([['instruction', U32_CODEC$1]])
	  },
	  AuthorizeWithSeed: {
	    index: 10,
	    codec: getStructCodec([['instruction', U32_CODEC$1], ['voteAuthorizeWithSeedArgs', VOTE_AUTHORIZE_WITH_SEED_CODEC]])
	  }
	};

	/**
	 * @internal
	 */
	const VOTE_INSTRUCTIONS = ProgramInstructions.create({
	  programId: VOTE_PROGRAM_ID$1,
	  instructionIndexCodec: U32_CODEC$1,
	  instructions: INSTRUCTION_DEFS
	});
	const INSTRUCTIONS = VOTE_INSTRUCTIONS;
	Object.freeze({
	  InitializeAccount: {
	    index: 0,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), voteInit()])
	  },
	  Authorize: {
	    index: 1,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), publicKey('newAuthorized'), LayoutExports.u32('voteAuthorizationType')])
	  },
	  Withdraw: {
	    index: 3,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), LayoutExports.ns64('lamports')])
	  },
	  UpdateValidatorIdentity: {
	    index: 4,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction')])
	  },
	  AuthorizeWithSeed: {
	    index: 10,
	    layout: LayoutExports.struct([LayoutExports.u32('instruction'), voteAuthorizeWithSeedArgs()])
	  }
	});

	/**
	 * VoteAuthorize type
	 */

	/**
	 * An enumeration of valid VoteAuthorization layouts.
	 */
	const VoteAuthorizationLayout = Object.freeze({
	  Voter: {
	    index: 0
	  },
	  Withdrawer: {
	    index: 1
	  }
	});

	/**
	 * Factory class for transactions to interact with the Vote program
	 */
	class VoteProgram {
	  /**
	   * @internal
	   */
	  constructor() {}

	  /**
	   * Public key that identifies the Vote program
	   */

	  /**
	   * Generate an Initialize instruction.
	   */
	  static initializeAccount(params) {
	    const {
	      votePubkey,
	      nodePubkey,
	      voteInit
	    } = params;
	    return INSTRUCTIONS.InitializeAccount.build({
	      voteInit: {
	        nodePubkey: voteInit.nodePubkey.toBytes(),
	        authorizedVoter: voteInit.authorizedVoter.toBytes(),
	        authorizedWithdrawer: voteInit.authorizedWithdrawer.toBytes(),
	        commission: voteInit.commission
	      }
	    }, {
	      keys: [{
	        pubkey: votePubkey,
	        isSigner: false,
	        isWritable: true
	      }, {
	        pubkey: SYSVAR_RENT_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: SYSVAR_CLOCK_PUBKEY,
	        isSigner: false,
	        isWritable: false
	      }, {
	        pubkey: nodePubkey,
	        isSigner: true,
	        isWritable: false
	      }],
	      programId: this.programId
	    });
	  }

	  /**
	   * Generate a transaction that creates a new Vote account.
	   */
	  static createAccount(params) {
	    const transaction = new Transaction();
	    transaction.add(SystemProgram.createAccount({
	      fromPubkey: params.fromPubkey,
	      newAccountPubkey: params.votePubkey,
	      lamports: params.lamports,
	      space: this.space,
	      programId: this.programId
	    }));
	    return transaction.add(this.initializeAccount({
	      votePubkey: params.votePubkey,
	      nodePubkey: params.voteInit.nodePubkey,
	      voteInit: params.voteInit
	    }));
	  }

	  /**
	   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account.
	   */
	  static authorize(params) {
	    const {
	      votePubkey,
	      authorizedPubkey,
	      newAuthorizedPubkey,
	      voteAuthorizationType
	    } = params;
	    const keys = [{
	      pubkey: votePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: SYSVAR_CLOCK_PUBKEY,
	      isSigner: false,
	      isWritable: false
	    }, {
	      pubkey: authorizedPubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    return new Transaction().add(INSTRUCTIONS.Authorize.build({
	      newAuthorized: newAuthorizedPubkey.toBytes(),
	      voteAuthorizationType: voteAuthorizationType.index
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a transaction that authorizes a new Voter or Withdrawer on the Vote account
	   * where the current Voter or Withdrawer authority is a derived key.
	   */
	  static authorizeWithSeed(params) {
	    const {
	      currentAuthorityDerivedKeyBasePubkey,
	      currentAuthorityDerivedKeyOwnerPubkey,
	      currentAuthorityDerivedKeySeed,
	      newAuthorizedPubkey,
	      voteAuthorizationType,
	      votePubkey
	    } = params;
	    const keys = [{
	      pubkey: votePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: SYSVAR_CLOCK_PUBKEY,
	      isSigner: false,
	      isWritable: false
	    }, {
	      pubkey: currentAuthorityDerivedKeyBasePubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    return new Transaction().add(INSTRUCTIONS.AuthorizeWithSeed.build({
	      voteAuthorizeWithSeedArgs: {
	        currentAuthorityDerivedKeyOwnerPubkey: currentAuthorityDerivedKeyOwnerPubkey.toBytes(),
	        currentAuthorityDerivedKeySeed: currentAuthorityDerivedKeySeed,
	        newAuthorized: newAuthorizedPubkey.toBytes(),
	        voteAuthorizationType: voteAuthorizationType.index
	      }
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a transaction to withdraw from a Vote account.
	   */
	  static withdraw(params) {
	    const {
	      votePubkey,
	      authorizedWithdrawerPubkey,
	      lamports,
	      toPubkey
	    } = params;
	    const keys = [{
	      pubkey: votePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: toPubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: authorizedWithdrawerPubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    return new Transaction().add(INSTRUCTIONS.Withdraw.build({
	      lamports
	    }, {
	      keys,
	      programId: this.programId
	    }));
	  }

	  /**
	   * Generate a transaction to withdraw safely from a Vote account.
	   *
	   * This function was created as a safeguard for vote accounts running validators, `safeWithdraw`
	   * checks that the withdraw amount will not exceed the specified balance while leaving enough left
	   * to cover rent. If you wish to close the vote account by withdrawing the full amount, call the
	   * `withdraw` method directly.
	   */
	  static safeWithdraw(params, currentVoteAccountBalance, rentExemptMinimum) {
	    if (params.lamports > currentVoteAccountBalance - rentExemptMinimum) {
	      throw new Error('Withdraw will leave vote account with insufficient funds.');
	    }
	    return VoteProgram.withdraw(params);
	  }

	  /**
	   * Generate a transaction to update the validator identity (node pubkey) of a Vote account.
	   */
	  static updateValidatorIdentity(params) {
	    const {
	      votePubkey,
	      authorizedWithdrawerPubkey,
	      nodePubkey
	    } = params;
	    const keys = [{
	      pubkey: votePubkey,
	      isSigner: false,
	      isWritable: true
	    }, {
	      pubkey: nodePubkey,
	      isSigner: true,
	      isWritable: false
	    }, {
	      pubkey: authorizedWithdrawerPubkey,
	      isSigner: true,
	      isWritable: false
	    }];
	    return new Transaction().add(INSTRUCTIONS.UpdateValidatorIdentity.build(undefined, {
	      keys,
	      programId: this.programId
	    }));
	  }
	}
	VoteProgram.programId = VOTE_PROGRAM_ID$1;
	/**
	 * Max space of a Vote account
	 *
	 * This is generated from the solana-vote-program VoteState struct as
	 * `VoteState::size_of()`:
	 * https://docs.rs/solana-vote-program/1.9.5/solana_vote_program/vote_state/struct.VoteState.html#method.size_of
	 *
	 * KEEP IN SYNC WITH `VoteState::size_of()` in https://github.com/solana-labs/solana/blob/a474cb24b9238f5edcc982f65c0b37d4a1046f7e/sdk/program/src/vote/state/mod.rs#L340-L342
	 */
	VoteProgram.space = 3762;

	/**
	 * Backwards-compatible exports for the renamed Address module.
	 * @deprecated Use Address instead. Target for removal in v3.
	 */
	/**
	 * Backwards-compatible alias for {@link Address}.
	 * @deprecated Use {@link Address} instead. Target for removal in v3.
	 */
	const PublicKey = Address;

	const SHORT_U16_DECODER = getShortU16Decoder();
	const U8_DECODER = getU8Decoder();
	const CONFIG_KEY_DECODER = getStructDecoder([['publicKey', fixDecoderSize(getBytesDecoder(), PUBLIC_KEY_LENGTH)], ['isSigner', U8_DECODER]]);
	const VALIDATOR_INFO_CONFIG_DECODER = getStructDecoder([['configKeys', getArrayDecoder(CONFIG_KEY_DECODER, {
	  size: SHORT_U16_DECODER
	})], ['infoData', getBytesDecoder()]]);
	const VALIDATOR_INFO_KEY = new Address('Va1idator1nfo111111111111111111111111111111');

	/**
	 * @internal
	 */

	/**
	 * Info used to identity validators.
	 */

	const InfoString = type({
	  name: string(),
	  website: optional(string()),
	  details: optional(string()),
	  iconUrl: optional(string()),
	  keybaseUsername: optional(string())
	});

	/**
	 * ValidatorInfo class
	 */
	class ValidatorInfo {
	  /**
	   * Construct a valid ValidatorInfo
	   *
	   * @param key validator public key
	   * @param info validator information
	   */
	  constructor(key, info) {
	    /**
	     * validator public key
	     */
	    this.key = void 0;
	    /**
	     * validator information
	     */
	    this.info = void 0;
	    this.key = key;
	    this.info = info;
	  }

	  /**
	   * Deserialize ValidatorInfo from the config account data. Exactly two config
	   * keys are required in the data.
	   *
	   * @param buffer config account data
	   * @return null if info was not found
	   */
	  static fromConfigData(buffer) {
	    const {
	      configKeys: decodedConfigKeys,
	      infoData
	    } = VALIDATOR_INFO_CONFIG_DECODER.decode(toUint8ArrayView(buffer));
	    if (decodedConfigKeys.length !== 2) return null;
	    const configKeys = decodedConfigKeys.map(configKey => ({
	      publicKey: new Address(configKey.publicKey),
	      isSigner: configKey.isSigner === 1
	    }));
	    if (configKeys[0].publicKey.equals(VALIDATOR_INFO_KEY)) {
	      if (configKeys[1].isSigner) {
	        const rawInfo = rustString().decode(toUint8ArrayView(infoData));
	        const info = JSON.parse(rawInfo);
	        assert(info, InfoString);
	        return new ValidatorInfo(configKeys[1].publicKey, info);
	      }
	    }
	    return null;
	  }
	}

	const VOTE_PROGRAM_ID = new Address('Vote111111111111111111111111111111111111111');

	/**
	 * Vote account state versions
	 */
	let VoteStateVersion = /*#__PURE__*/function (VoteStateVersion) {
	  VoteStateVersion[VoteStateVersion["Uninitialized"] = 0] = "Uninitialized";
	  VoteStateVersion[VoteStateVersion["V1_14_11"] = 1] = "V1_14_11";
	  return VoteStateVersion;
	}({});

	/**
	 * History of how many credits earned by the end of each epoch
	 */

	const U8_CODEC = getU8Codec();
	const U32_CODEC = getU32Codec();
	const U64_CODEC = getU64Codec();
	const U64_NUMBER_CODEC = transformCodec(U64_CODEC, value => BigInt(value), value => Number(value));
	const PUBLIC_KEY_CODEC = transformCodec(fixCodecSize(getBytesCodec(), 32), value => value, value => new Uint8Array(value));
	const ACCOUNT_VERSION_CODEC = getEnumCodec(VoteStateVersion, {
	  size: U32_CODEC
	});
	const LOCKOUT_CODEC = getStructCodec([['slot', U64_NUMBER_CODEC], ['confirmationCount', U32_CODEC]]);
	const AUTHORIZED_VOTER_CODEC = getStructCodec([['epoch', U64_NUMBER_CODEC], ['authorizedVoter', PUBLIC_KEY_CODEC]]);
	const PRIOR_VOTER_CODEC = getStructCodec([['authorizedPubkey', PUBLIC_KEY_CODEC], ['epochOfLastAuthorizedSwitch', U64_NUMBER_CODEC], ['targetEpoch', U64_NUMBER_CODEC]]);
	const PRIOR_VOTERS_CODEC = getStructCodec([['buf', getArrayCodec(PRIOR_VOTER_CODEC, {
	  size: 32
	})], ['idx', U64_NUMBER_CODEC], ['isEmpty', U8_CODEC]]);
	const EPOCH_CREDITS_CODEC = getStructCodec([['epoch', U64_NUMBER_CODEC], ['credits', U64_NUMBER_CODEC], ['prevCredits', U64_NUMBER_CODEC]]);
	const BLOCK_TIMESTAMP_CODEC = getStructCodec([['slot', U64_NUMBER_CODEC], ['timestamp', U64_NUMBER_CODEC]]);
	const VOTE_ACCOUNT_V1_14_11_CODEC = getStructCodec([['nodePubkey', PUBLIC_KEY_CODEC], ['authorizedWithdrawer', PUBLIC_KEY_CODEC], ['commission', U8_CODEC], ['votes', getArrayCodec(LOCKOUT_CODEC, {
	  size: U64_NUMBER_CODEC
	})], ['rootSlotValid', U8_CODEC], ['rootSlot', U64_NUMBER_CODEC], ['authorizedVoters', getArrayCodec(AUTHORIZED_VOTER_CODEC, {
	  size: U64_NUMBER_CODEC
	})], ['priorVoters', PRIOR_VOTERS_CODEC], ['epochCredits', getArrayCodec(EPOCH_CREDITS_CODEC, {
	  size: U64_NUMBER_CODEC
	})], ['lastTimestamp', BLOCK_TIMESTAMP_CODEC]]);

	/**
	 * @internal
	 */
	const __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC = VOTE_ACCOUNT_V1_14_11_CODEC;
	const ACCOUNT_STATE_CODECS = {
	  [VoteStateVersion.V1_14_11]: VOTE_ACCOUNT_V1_14_11_CODEC
	};

	/**
	 * See https://github.com/solana-labs/solana/blob/8a12ed029cfa38d4a45400916c2463fb82bbec8c/programs/vote_api/src/vote_state.rs#L68-L88
	 *
	 * @internal
	 */
	const decodeVoteAccountData = bytes => {
	  try {
	    const version = ACCOUNT_VERSION_CODEC.decode(bytes);
	    if (version == VoteStateVersion.Uninitialized) {
	      throw new Error('Vote account is uninitialized');
	    }
	    return ACCOUNT_STATE_CODECS[version].decode(bytes, ACCOUNT_VERSION_CODEC.fixedSize);
	  } catch (error) {
	    if (error instanceof SolanaError$1 && error.context.__code == SOLANA_ERROR__CODECS__ENUM_DISCRIMINATOR_OUT_OF_RANGE) {
	      throw new Error(`Unsupported vote account version: ${error.context.discriminator}. Supported versions: ${Array.from(error.context.validDiscriminators).join(', ')}.`);
	    }
	    throw error;
	  }
	};
	/**
	 * VoteAccount class
	 */
	class VoteAccount {
	  /**
	   * @internal
	   */
	  constructor(args) {
	    this.nodePubkey = void 0;
	    this.authorizedWithdrawer = void 0;
	    this.commission = void 0;
	    this.rootSlot = void 0;
	    this.votes = void 0;
	    this.authorizedVoters = void 0;
	    this.priorVoters = void 0;
	    this.epochCredits = void 0;
	    this.lastTimestamp = void 0;
	    this.nodePubkey = args.nodePubkey;
	    this.authorizedWithdrawer = args.authorizedWithdrawer;
	    this.commission = args.commission;
	    this.rootSlot = args.rootSlot;
	    this.votes = args.votes;
	    this.authorizedVoters = args.authorizedVoters;
	    this.priorVoters = args.priorVoters;
	    this.epochCredits = args.epochCredits;
	    this.lastTimestamp = args.lastTimestamp;
	  }

	  /**
	   * Deserialize VoteAccount from the account data.
	   *
	   * @param bufferLike account data
	   * @return VoteAccount
	   */
	  static fromAccountData(bufferLike) {
	    const va = decodeVoteAccountData(toUint8ArrayView(bufferLike));
	    let rootSlot = va.rootSlot;
	    if (!va.rootSlotValid) {
	      rootSlot = null;
	    }
	    return new VoteAccount({
	      nodePubkey: new Address(va.nodePubkey),
	      authorizedWithdrawer: new Address(va.authorizedWithdrawer),
	      commission: va.commission,
	      votes: va.votes,
	      rootSlot,
	      authorizedVoters: va.authorizedVoters.map(parseAuthorizedVoter),
	      priorVoters: getPriorVoters(va.priorVoters),
	      epochCredits: va.epochCredits,
	      lastTimestamp: va.lastTimestamp
	    });
	  }
	}
	function parseAuthorizedVoter({
	  authorizedVoter,
	  epoch
	}) {
	  return {
	    epoch,
	    authorizedVoter: new Address(authorizedVoter)
	  };
	}
	function parsePriorVoters({
	  authorizedPubkey,
	  epochOfLastAuthorizedSwitch,
	  targetEpoch
	}) {
	  return {
	    authorizedPubkey: new Address(authorizedPubkey),
	    epochOfLastAuthorizedSwitch,
	    targetEpoch
	  };
	}
	function getPriorVoters({
	  buf,
	  idx,
	  isEmpty
	}) {
	  if (isEmpty) {
	    return [];
	  }
	  return [...buf.slice(idx + 1).map(parsePriorVoters), ...buf.slice(0, idx).map(parsePriorVoters)];
	}

	const endpoint = {
	  http: {
	    devnet: 'http://api.devnet.solana.com',
	    testnet: 'http://api.testnet.solana.com',
	    'mainnet-beta': 'http://api.mainnet-beta.solana.com/'
	  },
	  https: {
	    devnet: 'https://api.devnet.solana.com',
	    testnet: 'https://api.testnet.solana.com',
	    'mainnet-beta': 'https://api.mainnet-beta.solana.com/'
	  }
	};
	/**
	 * Retrieves the RPC API URL for the specified cluster
	 * @param {Cluster} [cluster="devnet"] - The cluster name of the RPC API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet-beta'
	 * @param {boolean} [tls="http"] - Use TLS when connecting to cluster.
	 *
	 * @returns {string} URL string of the RPC endpoint
	 */
	function clusterApiUrl(cluster, tls) {
	  const key = tls === false ? 'http' : 'https';
	  if (!cluster) {
	    return endpoint[key]['devnet'];
	  }
	  const url = endpoint[key][cluster];
	  if (!url) {
	    throw new Error(`Unknown ${key} cluster: ${cluster}`);
	  }
	  return url;
	}

	/**
	 * Send and confirm a raw transaction
	 *
	 * If `commitment` option is not specified, defaults to 'finalized' commitment.
	 *
	 * @param {Connection} connection
	 * @param {Uint8Array | Array<number>} rawTransaction
	 * @param {TransactionConfirmationStrategy} confirmationStrategy
	 * @param {ConfirmOptions} [options]
	 * @returns {Promise<TransactionSignature>}
	 */

	/**
	 * @deprecated Calling `sendAndConfirmRawTransaction()` without a `confirmationStrategy`
	 * is no longer supported and will be removed in a future version.
	 */
	// eslint-disable-next-line no-redeclare

	// eslint-disable-next-line no-redeclare
	async function sendAndConfirmRawTransaction(connection, rawTransaction, confirmationStrategyOrConfirmOptions, maybeConfirmOptions) {
	  let confirmationStrategy;
	  let options;
	  if (confirmationStrategyOrConfirmOptions && Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'lastValidBlockHeight')) {
	    confirmationStrategy = confirmationStrategyOrConfirmOptions;
	    options = maybeConfirmOptions;
	  } else if (confirmationStrategyOrConfirmOptions && Object.prototype.hasOwnProperty.call(confirmationStrategyOrConfirmOptions, 'nonceValue')) {
	    confirmationStrategy = confirmationStrategyOrConfirmOptions;
	    options = maybeConfirmOptions;
	  } else {
	    options = confirmationStrategyOrConfirmOptions;
	  }
	  const sendOptions = options && {
	    skipPreflight: options.skipPreflight,
	    preflightCommitment: options.preflightCommitment || options.commitment,
	    minContextSlot: options.minContextSlot
	  };
	  const signature = await connection.sendRawTransaction(rawTransaction, sendOptions);
	  const commitment = options && options.commitment;
	  const confirmationPromise = confirmationStrategy ? connection.confirmTransaction(confirmationStrategy, commitment) : connection.confirmTransaction(signature, commitment);
	  const status = (await confirmationPromise).value;
	  if (status.err) {
	    if (signature != null) {
	      throw new SendTransactionError({
	        action: sendOptions?.skipPreflight ? 'send' : 'simulate',
	        signature: signature,
	        transactionMessage: `Status: (${JSON.stringify(status)})`
	      });
	    }
	    throw new Error(`Raw transaction ${signature} failed (${JSON.stringify(status)})`);
	  }
	  return signature;
	}

	/**
	 * There are 1-billion lamports in one SOL
	 */
	const LAMPORTS_PER_SOL = 1000000000;

	exports.Address = Address;
	exports.AddressLookupTableAccount = AddressLookupTableAccount;
	exports.AddressLookupTableInstruction = AddressLookupTableInstruction;
	exports.AddressLookupTableProgram = AddressLookupTableProgram;
	exports.Authorized = Authorized;
	exports.BLOCKHASH_CACHE_TIMEOUT_MS = BLOCKHASH_CACHE_TIMEOUT_MS;
	exports.BPF_LOADER_DEPRECATED_PROGRAM_ID = BPF_LOADER_DEPRECATED_PROGRAM_ID;
	exports.BPF_LOADER_PROGRAM_ID = BPF_LOADER_PROGRAM_ID;
	exports.BpfLoader = BpfLoader;
	exports.COMPUTE_BUDGET_INSTRUCTIONS = COMPUTE_BUDGET_INSTRUCTIONS;
	exports.COMPUTE_BUDGET_INSTRUCTION_LAYOUTS = COMPUTE_BUDGET_INSTRUCTION_LAYOUTS;
	exports.ComputeBudgetProgram = ComputeBudgetProgram;
	exports.Connection = Connection;
	exports.Ed25519Program = Ed25519Program;
	exports.EpochSchedule = EpochSchedule;
	exports.Keypair = Keypair;
	exports.LAMPORTS_PER_SOL = LAMPORTS_PER_SOL;
	exports.LOOKUP_TABLE_INSTRUCTIONS = LOOKUP_TABLE_INSTRUCTIONS;
	exports.LOOKUP_TABLE_INSTRUCTION_LAYOUTS = LOOKUP_TABLE_INSTRUCTION_LAYOUTS;
	exports.Loader = Loader;
	exports.Lockup = Lockup;
	exports.MAX_SEED_LENGTH = MAX_SEED_LENGTH;
	exports.Message = Message;
	exports.MessageAccountKeys = MessageAccountKeys;
	exports.MessageV0 = MessageV0;
	exports.NONCE_ACCOUNT_LENGTH = NONCE_ACCOUNT_LENGTH;
	exports.NonceAccount = NonceAccount;
	exports.PACKET_DATA_SIZE = PACKET_DATA_SIZE;
	exports.PUBLIC_KEY_LENGTH = PUBLIC_KEY_LENGTH;
	exports.PublicKey = PublicKey;
	exports.SIGNATURE_LENGTH_IN_BYTES = SIGNATURE_LENGTH_IN_BYTES;
	exports.STAKE_CONFIG_ID = STAKE_CONFIG_ID;
	exports.STAKE_INSTRUCTIONS = STAKE_INSTRUCTIONS;
	exports.STAKE_INSTRUCTION_LAYOUTS = STAKE_INSTRUCTION_LAYOUTS;
	exports.SYSTEM_INSTRUCTIONS = SYSTEM_INSTRUCTIONS;
	exports.SYSTEM_INSTRUCTION_LAYOUTS = SYSTEM_INSTRUCTION_LAYOUTS;
	exports.SYSVAR_CLOCK_PUBKEY = SYSVAR_CLOCK_PUBKEY;
	exports.SYSVAR_EPOCH_SCHEDULE_PUBKEY = SYSVAR_EPOCH_SCHEDULE_PUBKEY;
	exports.SYSVAR_INSTRUCTIONS_PUBKEY = SYSVAR_INSTRUCTIONS_PUBKEY;
	exports.SYSVAR_RECENT_BLOCKHASHES_PUBKEY = SYSVAR_RECENT_BLOCKHASHES_PUBKEY;
	exports.SYSVAR_RENT_PUBKEY = SYSVAR_RENT_PUBKEY;
	exports.SYSVAR_REWARDS_PUBKEY = SYSVAR_REWARDS_PUBKEY;
	exports.SYSVAR_SLOT_HASHES_PUBKEY = SYSVAR_SLOT_HASHES_PUBKEY;
	exports.SYSVAR_SLOT_HISTORY_PUBKEY = SYSVAR_SLOT_HISTORY_PUBKEY;
	exports.SYSVAR_STAKE_HISTORY_PUBKEY = SYSVAR_STAKE_HISTORY_PUBKEY;
	exports.Secp256k1Program = Secp256k1Program;
	exports.SendTransactionError = SendTransactionError;
	exports.SolanaJSONRPCError = SolanaJSONRPCError;
	exports.SolanaJSONRPCErrorCode = SolanaJSONRPCErrorCode;
	exports.StakeAuthorizationLayout = StakeAuthorizationLayout;
	exports.StakeInstruction = StakeInstruction;
	exports.StakeProgram = StakeProgram;
	exports.SystemInstruction = SystemInstruction;
	exports.SystemProgram = SystemProgram;
	exports.Transaction = Transaction;
	exports.TransactionExpiredBlockheightExceededError = TransactionExpiredBlockheightExceededError;
	exports.TransactionExpiredNonceInvalidError = TransactionExpiredNonceInvalidError;
	exports.TransactionExpiredTimeoutError = TransactionExpiredTimeoutError;
	exports.TransactionInstruction = TransactionInstruction;
	exports.TransactionMessage = TransactionMessage;
	exports.TransactionStatus = TransactionStatus;
	exports.VALIDATOR_INFO_KEY = VALIDATOR_INFO_KEY;
	exports.VERSION_PREFIX_MASK = VERSION_PREFIX_MASK;
	exports.VOTE_INSTRUCTIONS = VOTE_INSTRUCTIONS;
	exports.VOTE_PROGRAM_ID = VOTE_PROGRAM_ID;
	exports.ValidatorInfo = ValidatorInfo;
	exports.VersionedMessage = VersionedMessage;
	exports.VersionedTransaction = VersionedTransaction;
	exports.VoteAccount = VoteAccount;
	exports.VoteAuthorizationLayout = VoteAuthorizationLayout;
	exports.VoteInit = VoteInit;
	exports.VoteInstruction = VoteInstruction;
	exports.VoteProgram = VoteProgram;
	exports.VoteStateVersion = VoteStateVersion;
	exports.__TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC = __TEST_ONLY__VOTE_ACCOUNT_V1_14_11_CODEC;
	exports.clusterApiUrl = clusterApiUrl;
	exports.sendAndConfirmRawTransaction = sendAndConfirmRawTransaction;
	exports.sendAndConfirmTransaction = sendAndConfirmTransaction;

	return exports;

})({});
//# sourceMappingURL=index.iife.js.map
