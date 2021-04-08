
/**
clamp(min, max, n)
**/

import curry from '../curry.js';

console.warn('fn/maths/clamp.js is now at fn/clamp.js');

export function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n;
}

export default curry(clamp);
