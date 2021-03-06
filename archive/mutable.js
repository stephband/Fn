
const assign         = Object.assign;
const define         = Object.defineProperty;
const isFrozen       = Object.isFrozen;
const getPrototypeOf = Object.getPrototypeOf;

const A              = Array.prototype;

const $observable    = Symbol('observable');
const $observers     = Symbol('observers');
const $update        = Symbol('update');

const DOMPrototype   = (window.EventTarget || window.Node).prototype;
const nothing        = Object.freeze([]);

// Matches
//
// name
// [name]
// [name=value]
// [name='value']
// [name1=value1,name2=value2]
//
// Todo: replace with a proper parser. This currently supports only
// 2 prop/value pairs at most
var rname = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2\s*(?:,\s*([-\w]+)=(['"])?([-\w]+)\5)?)?\]?\.?/g;


// Utils

function noop() {}

function isArrayLike(object) {
	return object
	&& typeof object !== 'function'
	&& object.hasOwnProperty('length')
	&& typeof object.length === 'number' ;
}

function isMutable(object) {
	// Many built-in objects and DOM objects bork when calling their
	// methods via a proxy. They should be considered not observable.
	// I wish there were a way of whitelisting rather than
	// blacklisting, but it would seem not.

	return object
		// Reject primitives, null and other frozen objects
		&& !isFrozen(object)
		// Reject DOM nodes, Web Audio context and nodes, MIDI inputs,
		// XMLHttpRequests, which all inherit from EventTarget
		&& !DOMPrototype.isPrototypeOf(object)
		// Reject dates
		&& !(object instanceof Date)
		// Reject regex
		&& !(object instanceof RegExp)
		// Reject maps
		&& !(object instanceof Map)
		&& !(object instanceof WeakMap)
		// Reject sets
		&& !(object instanceof Set)
		&& !(window.WeakSet && object instanceof WeakSet)
		// Reject TypedArrays and DataViews
		&& !ArrayBuffer.isView(object) ;
}

function getObservers(object, name) {
	return object[$observers][name]
		|| (object[$observers][name] = []);
}

function removeObserver(observers, fn) {
	var i = observers.indexOf(fn);
	observers.splice(i, 1);
}

function fire(observers, value, record) {
	if (!observers) { return; }

	// Todo: What happens if observers are removed during this operation?
	// Bad things, I'll wager.
	var n = -1;
	while (observers[++n]) {
		observers[n](value, record);
	}
}


// Proxy

function trapGet(target, name, self) {
	var value = target[name];
//console.log('TRAP GET', value);
	// Ignore symbols
	return typeof name === 'symbol' ? value :
//				typeof value === 'function' ? MethodProxy(value) :
//console.log('this', this);
//console.log('target', target);
//console.log('arguments', arguments);
//					value.apply(this, arguments);
//				} :
		Mutable(value) || value ;
}

var arrayHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// We are setting a symbol
		if (typeof name === 'symbol') {
			target[name] = value;
			return true;
		}

		var old = target[name];
		var length = target.length;

		// If we are setting the same value, we're not really setting at all
		if (old === value) { return true; }

		var observers = target[$observers];
		var change;

		// We are setting length
		if (name === 'length') {
			if (value >= target.length) {
				// Don't allow array length to grow like this
				//target.length = value;
				return true;
			}

			change = {
				index:   value,
				removed: A.splice.call(target, value),
				added:   nothing,
			};

			while (--old >= value) {
				fire(observers[old], undefined);
			}
		}

		// We are setting an integer string or number
		else if (+name % 1 === 0) {
			name = +name;

			if (value === undefined) {
				if (name < target.length) {
					change = {
						index:   name,
						removed: A.splice.call(target, name, 1),
						added:   nothing
					};

					value = target[name];
				}
				else {
					return true;
				}
			}
			else {
				change = {
					index:   name,
					removed: A.splice.call(target, name, 1, value),
					added:   [value]
				};
			}
		}

		// We are setting some other key
		else {
			target[name] = value;
		}

		if (target.length !== length) {
			fire(observers.length, target.length);
		}

		fire(observers[name], Mutable(value) || value);
		fire(observers[$update], receiver, change);

		// Return true to indicate success
		return true;
	}
};

var objectHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		var old = target[name];

		// If we are setting the same value, we're not really setting at all
		if (old === value) { return true; }

		var observers = target[$observers];
		var change = {
			name:    name,
			removed: target[name],
			added:   value
		};

		target[name] = value;

		fire(observers[name], Mutable(value) || value);
		fire(observers[$update], receiver, change);

		// Return true to indicate success
		return true;
	}

//			apply: function(target, context, args) {
//console.log('MethodProxy', target, context, args);
//debugger;
//				return Reflect.apply(target, context, args);
//			}
};

function createProxy(object) {
	var proxy = new Proxy(object, isArrayLike(object) ?
		arrayHandlers :
		objectHandlers
	);

	define(object, $observers, { value: {} });
	define(object, $observable, { value: proxy });

	return proxy;
}


// observe

function observePrimitive(primitive, data, fn) {
	if (primitive !== data.value) {
		data.old   = data.value;
		data.value = primitive;
		fn(primitive);
	}

	return noop;
}

function observeObject(object, data, fn) {
	var observers = getObservers(object, $update);
	observers.push(fn);

	if (object !== data.value) {
		data.old   = data.value;
		data.value = object;
		fn(object, {
			index:   0,
			removed: data.old ? data.old : nothing,
			added:   data.value
		});
	}

	return function unobserveObject() {
		removeObserver(observers, fn);
	};
}

function observeSelector(object, key, isMatch, path, data, fn) {
	var unobserve = noop;

	function update(array) {
		var value = array && A.find.call(array, isMatch);
		unobserve();
		unobserve = observeUnknown(value, path, data, fn);
	}

	// We create an intermediate data object to go with the new update
	// function. The original data object is passed on inside update.
	var unobserveObject = observeObject(object, {}, update);

	return function unobserveSelector() {
		unobserve();
		unobserveObject();
	};
}

function observeProperty(object, name, path, data, fn) {
	var observers = getObservers(object, name);
	var unobserve = noop;

	function update(value) {
		unobserve();
		unobserve = observeUnknown(value, path, data, fn);
	}

	observers.push(update);
	update(object[name]);

	return function unobserveProperty() {
		unobserve();
		removeObserver(observers, update);
	};
}

function callbackItem(object, key, isMatch, path, data, fn) {
	var value = object && A.find.call(object, isMatch);
	return observeUnknown(Mutable(value) || value, path, data, fn);
}

function callbackProperty(object, name, path, data, fn) {
	return observeUnknown(Mutable(object[name]) || object[name], path, data, fn);
}

function isFloatString(string) {
	// Convert to float and back to string to check if it retains
	// the same value.
	const float = parseFloat(string);
	return float + '' === float;
}

function observeUnknown(object, path, data, fn) {
	if (!path.length) {
		// We assume the full isMutable() check has been done –
		// this function is internal
		return object && object[$observable] ?
			observeObject(object, data, fn) :
			observePrimitive(object, data, fn) ;
	}

	if (!(object && typeof object === 'object')) {
		return observePrimitive(undefined, data, fn);
	}

	rname.lastIndex = 0;
	var tokens = rname.exec(path);

	if (!tokens) {
		throw new Error('Mutable: invalid path "' + path + '"');
	}

	let name  = tokens[1];
	path = path.slice(rname.lastIndex);

	// Path is a property name
	if (!tokens[3]) {
		return object[$observable] ?
			observeProperty(object, name, path, data, fn) :
			callbackProperty(object, name, path, data, fn) ;
	}

	// Path is a selector. Build a match object with property/value pairs
	// extracted with the rname regex.
	let match = {};

	// Todo: a proper parsing way of doing this. This is just hacked
	// together to support up to '[name=value,name=value]' but no more
	match[tokens[1]] = tokens[2] ?
		tokens[3] :
		tokens[3] === 'true' ? true :
		tokens[3] === 'false' ? false :
		isFloatString(tokens[3]) ? parseFloat(tokens[3]) :
		tokens[3] ;

	if (tokens[4]) {
		match[tokens[4]] = tokens[5] ?
			tokens[6] :
			tokens[6] === 'true' ? true :
			tokens[6] === 'false' ? false :
			isFloatString(tokens[6]) ? parseFloat(tokens[6]) :
			tokens[6] ;
	}

	const isMatch = function isMatch(item) {
		let key;

		for (key in match) {
			if (item[key] !== match[key]) {
				return false;
			}
		}

		return true;
	};

	return object[$observable] ?
		observeSelector(object, name, isMatch, path, data, fn) :
		callbackItem(object, name, isMatch, path, data, fn) ;

}


// Mutable

export function Mutable(object) {
	return !object ? undefined :
		object[$observable] ? object[$observable] :
		!isMutable(object) ? undefined :
	createProxy(object) ;
}

export function notify(object, path) {
	var observers = object[$observers];
	fire(observers[path], object[$observable]);
	fire(observers[$update], object);
}

export function observe(object, path, fn) {
	const data = {};
	// Coerce path to string
	return observeUnknown(Mutable(object) || object, path + '', data, fn);
}
