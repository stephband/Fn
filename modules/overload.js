/**
overload(fn, map)

Returns a function that calls a function at the property of `object` that
matches the result of calling `fn` with all arguments.</p>

```
var fn = overload(toType, {
    string: function a(name, n) {...},
    number: function b(n, m) {...}
});

fn('pie', 4); // Returns a('pie', 4)
fn(1, 2);     // Returns b(1, 2)
```
*/


export default function overload(fn, map) {
    return function overload() {
        const key     = fn.apply(this, arguments);
        const handler = (map[key] || map.default);

        if (!handler) {
            throw new Error('overload() no handler for "' + key + '"');
        }

        return handler.apply(this, arguments);
    };
}
