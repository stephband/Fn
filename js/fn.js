(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Fn');
	console.log('https://github.com/cruncher/fn');
	console.log('______________________________');
})(this);

(function(window) {
	"use strict";

	var debug = true;


	// Import

	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;


	// Polyfill

	if (!Math.log10) {
		Math.log10 = function log10(n) {
			return Math.log(n) / Math.LN10;
		};
	}


	// Feature test

	var isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function call(fn) {
		return fn();
	}

	function compose(fn1, fn2) {
		return function composed(n) { return fn1(fn2(n)); }
	}

	function pipe() {
		var a = arguments;
		return function pipe(n) { return A.reduce.call(a, call, n); }
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function with parity of the remaining
				// number of required arguments. And curry that.
				curry(function partial() {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		}

		// Make the string representation of this function equivalent to fn
		// for sane debugging
		if (debug) {
			curried.toString = function() { return fn.toString(); };
		}

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		return isFunctionLengthDefineable ?
			Object.defineProperty(curried, 'length', { value: parity }) :
			curried ;
	}


	// Get and set paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?\.|\[/g;

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(object, array) {
		var key   = array.shift();
		var value = object[key];

		return array.length === 0 ? value :
			value !== undefined ? objFrom(value, array) :
			undefined ;
	}

	function objTo(root, array, object) {
		var key = array.shift();

		return array.length === 0 ?
			(root[key] = object) :
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array, object) ;
	}


	// String types

	var regex = {
		url:       /^(?:\/|https?\:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/,
		//url:       /^([a-z][\w\.\-\+]*\:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}/,
		email:     /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(\-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(\-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^(\-?\d+(?:\.\d+)?)$/,
		int:       /^(\-?\d+)$/
	};


	// Throttle

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance.now ? function now() {
			return window.performance.now();
		} : function now() {
			return +new Date();
		} ;

	function createRequestTimerFrame(time) {
		var timer = false;
		var t = 0;
		var fns = [];

		function timed() {
			timer = false;
			t = now();
			fns.forEach(Fn.apply([now()]));
			fns.length = 0;
		}

		return function requestTimerFrame(fn) {
			// Add fn to queue
			if (timer) {
				fns.push(fn);
				return;
			}

			var n = now();

			// Set the timer
			if (t + time > n) {
				fns.push(fn);
				timer = setTimeout(timed, time + t - n);
				return;
			}

			t = n;
			fn(t);
			return;
		};
	}

	function Throttle(fn, time) {
		var request = time ?
			createRequestTimerFrame(time) :
			requestAnimationFrame ;

		var queued, context, a;

		function update() {
			queued = false;
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function queue() {
			// Don't queue update if it's already queued
			if (queued) { return; }
			queued = true;

			// Queue update
			request(update);
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		return throttle;
	}


	// Fn

	function Fn(object) {
			// object is not, create an empty stream
		return object === undefined ? new BufferStream() :
			// object is a function
			typeof object === "function" ? new Functor(object) :
			// object is an Array or Functor
			typeof object.shift === "function" ? new Functor(function shift() {
				return object.shift();
			}) :
			// object is an Iterator
			typeof object.next === "function" ? new Functor(function next() {
				return object.next().value;
			}) :
			// object is a Promise
			typeof object.then === "function" ? PromiseStream(object) :
			// object is a map of some sort, get it's iterator
			typeof object.entries === "function" ? Fn(object.entries()) :
			// object is a plain object
			typeof object === "object" ? Fn(Object.keys(object)).map(function() {
				return [key, object[key]];
			}) :
			// object is a value
			Functor.of(object);
	}

	Object.assign(Fn, {
		noop:     noop,
		id:       id,
		call:     call,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

		is: curry(function is(a, b) {
			return a === b;
		}),

		equals: curry(function equals(a, b) {
			// Fast out if references are for the same object.
			if (a === b) { return true; }

			if (typeof a !== 'object') { return false; }

			var akeys = Object.keys(a);
			var bkeys = Object.keys(b);

			if (akeys.length !== bkeys.length) { return false; }

			var n = akeys.length;

			while (n--) {
				if (!equals(a[akeys[n]], b[akeys[n]])) {
					return false;
				}
			}

			return true;
		}),

		by: curry(function by(property, a, b) {
			return Fn.byGreater(a[property], b[property]);
		}),

		byGreater: curry(function byGreater(a, b) {
			return a === b ? 0 : a > b ? 1 : -1 ;
		}),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),

		assign: curry(function assign(obj2, obj1) {
			return Object.assign(obj1, obj2);
		}),

		get: curry(function get(key, object) {
			return typeof object.get === "function" ?
				object.get(key) :
				object[key] ;
		}),

		set: curry(function set(key, value, object) {
			return typeof object.set === "function" ?
				object.set(key, value) :
				(object[key] = value) ;
		}),

		getPath: curry(function get(path, object) {
			return object.get ? object.get(path) :
				typeof path === 'number' ? object[path] :
				path === '' ? object :
				objFrom(object, splitPath(path)) ;
		}),

		setPath: curry(function set(path, value, object) {
			if (object.set) { object.set(path, value); }
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		invoke: curry(function invoke(name, object) {
			return object[name]();
		}),

		apply: curry(function apply(values, fn) {
			return fn.apply(null, values);
		}),

		map: curry(function map(fn, object) {
			return object.map ? object.map(fn) : A.map.call(object, fn);
		}),

		throttle: function(time, fn) {
			// Overload the call signature to support Fn.throttle(fn)
			if (fn === undefined && time.apply) {
				fn = time;
				time = undefined;
			}

			function throttle(fn) {
				return Throttle(fn, time);
			}

			// Where fn not given return a partially applied throttle
			return fn ? throttle(fn) : throttle ;
		},

		concat:      curry(function concat(array2, array1) { return array1.concat ? array1.concat(array2) : A.concat.call(array1, array2); }),
		each:        curry(function each(fn, object) { return object.each ? object.each(fn) : A.forEach.call(object, fn); }),
		filter:      curry(function filter(fn, object) { return object.filter ? object.filter(fn) : A.filter.call(object, fn); }),
		reduce:      curry(function reduce(fn, n, object) { return object.reduce ? object.reduce(fn, n) : A.reduce.call(object, fn, n); }),
		slice:       curry(function slice(n, m, object) { return object.slice ? object.slice(n, m) : A.slice.call(object, n, m); }),
		sort:        curry(function sort(fn, object) { return object.sort ? object.sort(fn) : A.sort.call(object, fn); }),

		push: curry(function push(value, object) {
			(object.push || A.push).call(object, value);
			return object;
		}),

		add:         curry(function add(a, b) { return b + a; }),
		multiply:    curry(function multiply(a, b) { return b * a; }),
		mod:         curry(function mod(a, b) { return b % a; }),
		pow:         curry(function pow(a, b) { return Math.pow(b, a); }),
		min:         curry(function min(a, b) { return a > b ? b : a ; }),
		max:         curry(function max(a, b) { return a < b ? b : a ; }),
		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),
		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),
		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog: curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(value / min) / Math.log(max / min))
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},

		// Strings
		match:      curry(function match(regex, string) { return regex.test(string); }),
		exec:       curry(function parse(regex, string) { return regex.exec(string) || undefined; }),
		replace:    curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},

		// Booleans
		not: function not(object) { return !object; },

		// Types

		isDefined: function isDefined(value) {
			// !!value is a fast out for non-zero numbers, non-empty strings
			// and other objects, the rest checks for 0, '', etc.
			return !!value || (value !== undefined && value !== null);
		},

		toType: function typeOf(object) {
			return typeof object;
		},

		toClass: function classOf(object) {
			return O.toString.apply(object).slice(8, -1);
		},

		toArray: function(object) {
			return object.toArray ?
				object.toArray() :
				Fn(object).toArray() ;
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its text content.
				var n = -1;

				// Test regexable string types
				while (++n < types.length) {
					if(regex[types[n]].test(string)) {
						return types[n];
					}
				}

				// Test for JSON
				try {
					JSON.parse(string);
					return 'json';
				}
				catch(e) {}

				// Default to 'string'
				return 'string';
			};
		})(regex, ['date', 'url', 'email', 'int', 'float']),

		// JSON
		stringify: function stringify(object) {
			return JSON.stringify(Fn.toClass(object) === "Map" ?
				Fn(object) : object
			);
		},

		log: function(text, object) {
			console.log(text, object);
			return x;
		}
	});


	// Functor

	function Functor(fn) {
		if (!this || !Functor.prototype.isPrototypeOf(this)) {
			return new Functor(fn);
		}

		this.shift = fn;
	}

	Object.assign(Functor, {
		of: function() {
			var a = arguments;
			return new this(function of() {
				var object;
				while (a.length && object === undefined) {
					object = A.shift.apply(a);
				}
				return object;
			});
		}
	});

	Object.assign(Functor.prototype, {
		// Input

		create: function(fn) {
			var functor = Object.create(this);
			functor.shift = fn;
			return functor;
		},

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},

		// Transform

		ap: function ap(object) {
			var fn = this.shift();
			if (value === undefined) { return; }
			return object.map(fn);
		},

		map: function(fn) {
			return this.create(Fn.compose(function map(object) {
				return object !== undefined ? fn(object) : undefined ;
			}, this.shift));
		},

		filter: function(fn) {
			var source = this;

			return this.create(function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
			});
		},

		join: function() {
			var source = this;
			var buffer = empty;

			return this.create(function join(object) {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(); }
				buffer = empty;
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		concat: function(object) {
			var source = this;
			return this.create(function concat() {
				var value = source.shift();

				if (value === undefined) {
					value = object.shift();
				};

				return value;
			});
		},

		sort: function(fn) {
			var source = this;
			var array = empty;

			fn = fn || Fn.byGreater ;

			// Todo: this will fail in a Stream if values are pushed.
			return this.create(function sort() {
				if (array.length === 0) {
					array = source.toArray().sort(fn);
				}

				return array.shift();
			});
		},

		head: function() {
			var source = this;
			var i = 0;

			return this.create(function head() {
				if (i++ === 0) {
					this.status = 'done';
					return source.shift();
				}
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return this.create(function tail() {
				if (i++ === 0) { source.shift(); }
				return source.shift();
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = -1;

			return this.create(function slice() {
				while (++i < n) {
					source.shift();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.shift();
				}
			});
		},

		split: function(fn) {
			var source = this;
			var buffer = [];

			return this.create(function split() {
				var value = source.shift();
				var b;

				if (value === undefined) { return; }

				if (fn(value)) {
					b = buffer;
					buffer = [];
					return b;
				}

				buffer.push(value);

				if (source.status === 'done') {
					b = buffer;
					buffer = [];
					return b;
				}

				return split();
			});
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return this.create(n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
					var value;

					while (buffer.length < n) {
						value = source.shift();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						var _buffer = buffer;
						buffer = [];
						return Functor.of.apply(Functor, _buffer);
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				});
		},

		group: function(fn) {
			var source = this;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function create() {
				var stream = new BufferStream();
				buffer.push(stream);
				return stream.on('pull', function() {
					// Pull until a new value is added to the current stream
					pullUntil(Fn.is(stream));
				});
			}

			function pullUntil(check) {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = create();
					streams.set(key, stream);
				}

				stream.push(value);
				return check(stream) || pullUntil(check);
			}

			function isBuffered() {
				return !!buffer.length;
			}

			return this.create(function group() {
				// Pull until a new stream is available
				pullUntil(isBuffered);
				return buffer.shift();
			});
		},

		groupTo: function(fn, object) {
			var source = this;

			function create() {
				var stream = new BufferStream();
				return stream.on('pull', pullAll);
			}

			function pullAll() {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = Fn.get(key, object);

				if (stream === undefined) {
					stream = create();
					Fn.set(key, stream, object);
				}

				stream.push(value);
				return pullAll();
			}

			return this.create(function group() {
				if (source.status === 'done') { return; }
				source.status = 'done';
				pullAll();
				return object;
			});
		},

		scan: function(fn) {
			var i = 0, total = 0;
			return this.map(function scan(value) {
				return (total = fn(total, value, i++));
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return this.create(function unique() {
				var value = source.shift();
				if (value === undefined) { return; }

				if (values.indexOf(value) === -1) {
					values.push(value);
					return value;
				}

				return unique();
			});
		},

		assign: function(object) { return this.map(Fn.assign(object)); },

		parse: function() { return this.map(JSON.parse); },

		stringify: function() { return this.map(Fn.stringify); },

		// Output

		pipe: function(stream) {
			if (!stream || !stream.on) {
				throw new Error('Fn: Functor.pipe(object) object must be a stream. (' + stream + ')');
			}

			var source = this;

			stream.on('pull', function() {
				stream.push(source.shift());
			});

			return stream;
		},

		tap: function(fn) {
			// Overwrite next to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		each: function pull(fn) {
			var value;

			while ((value = this.shift()) !== undefined) {
				fn(value);
			}
		},

		reduce: function(fn, value) {
			var output = Fn.isDefined(value) ? value : 0 ;

			while ((value = this.shift()) !== undefined) {
				output = fn(output, value);
			}

			return output;
		},

		find: function(fn) {
			return this.filter(fn).head().shift();
		},

		toArray: function() {
			return this.reduce(function(t, v) {
				t.push(v);
				return t;
			}, []);
		},

		toFunction: function() {
			var source = this;
			return function fn() {
				if (arguments.length) {
					this.push.apply(this, arguments);
				}
				return source.shift();
			};
		}
	});

	Functor.prototype.toJSON = Functor.prototype.toArray;

	// Stream

	var empty = [];

	function arrayNext(array) {
		var value;

		// Shift values out ignoring undefined
		while (array.length && value === undefined) {
			value = array.shift();
		}

		return value;
	}

	function Stream(setup) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var observers = {};

		function notify(type) {
			if (!observers[type]) { return; }
			A.slice.apply(observers[type]).forEach(call);
		}

		this.on = function on(type, fn) {
			// Lazily create observers list
			observers[type] = observers[type] || [] ;
			// Add observer
			observers[type].push(fn);
			return this;
		};

		Object.assign(this, setup(notify));

		if (!this.hasOwnProperty('shift')) {
			throw new Error('Fn.Stream: setup() did not provide a .shift() method.');
		}
	}

	Object.assign(Stream, {
		of: function() {
			var a = arguments;
			return new Stream(function setup(notify) {
				var pulling = false;

				return {
					shift: function buffer() {
						var value = A.shift.apply(a);

						if (value === undefined) {
							pulling = true;
							notify('pull');
							pulling = false;
							value = A.shift.apply(a);
						}

						return value;
					},

					push: function push() {
						A.push.apply(a, arguments);
						if (!pulling) { notify('push'); }
					}
				};
			});
		}
	});

	Object.setPrototypeOf(Stream.prototype, Functor.prototype);

	Object.assign(Stream.prototype, {
		ap: function ap(object) {
			var source = this;
			return this.create(function ap() {
				var fn = source.shift();
				if (value === undefined) { return; }
				return object.map(fn);
			});
		},

		push: function error() {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		shift: function error() {
			throw new Error('Fn: Stream has been created without a .next() method.');
		},

		pull: function pull(fn) {
			var source = this;
			var a = arguments;

			function each() {
				Functor.prototype.each.apply(source, a);
			}

			// Flush and observe
			each();
			return this.on('push', each);
		},

		pipe: function(stream) {
			Functor.prototype.pipe.apply(this, arguments);
			// Notify a push without pushing any values -
			// stream only needs to know values are available.
			this.on('push', stream.push);
			return stream;
		},

		concatParallel: function() {
			var source = this;
			var object;
			var order = [];

			function bind(object) {
				object.on('push', function() {
					order.push(object);
				});
				order.push(object);
			}

			function shiftNext() {
				var stream = order.shift();
				if (stream === undefined) { return; }
				var value = stream.shift();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return this.create(function concatParallel() {
				var object = source.shift();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		delay: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				source.on('push', function() {
					setTimeout(notify, time, 'push');
				});

				return {
					shift: function delay() {
						return source.shift();
					},

					stop: function stop() {
						// Probably should clear timers here.
					}
				};
			});
		},

		throttle: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				var t = Fn.Throttle(function() {
					notify('push');
				}, time);

				source.on('push', t);

				return {
					shift: function throttle() {
						var value, v;

						while ((v = source.shift()) !== undefined) {
							value = v;
						}

						if (source.status === "done") { t.cancel(); }

						return value;
					},

					stop: t.cancel
				};
			});
		},

		toPromise: function() {
			var source = this;

			return new Promise(function setup(resolve, reject) {
				var value = source.shift();

				if (value !== undefined) {
					resolve(value);
					return;
				}

				source
				.on('push', function() {
					var value = source.shift();
					if (value !== undefined) { resolve(value); }
				})
				.on('stop', reject);
			});
		}
	});


	// BufferStream

	function BufferStream(object) {
		return Stream(function setup(notify) {
			var source = typeof object === 'string' ? A.slice.apply(object) : object || [] ;
			var pulling = false;

			return {
				shift: function buffer() {
					var value = source.shift();

					if (source.status === 'done') {
						this.status = 'done';
					}
					else if (value === undefined) {
						pulling = true;
						notify('pull');
						pulling = false;
						value = source.shift();
					}

					return value;
				},

				push: function push() {
					source.push.apply(source, arguments);
					if (!pulling) { notify('push'); }
				}
			};
		});
	}

	BufferStream.of = Stream.of;


	// PromiseStream

	function PromiseStream(promise) {
		return new Stream(function setup(notify) {
			var value;

			promise.then(function(v) {
				value = v;
				notify('push');
			});

			return {
				next: function promise() {
					var v = value;
					value = undefined;
					return v;
				}
			};
		});
	}

	PromiseStream.of = Stream.of;


	// Export

	Object.assign(Fn, {
		Throttle:      Throttle,
		Functor:       Functor,
		Stream:        Stream,
		BufferStream:  BufferStream,
		PromiseStream: PromiseStream
	});

	window.Fn = Fn;

})(this);
