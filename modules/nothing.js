import noop from './noop.js';

export default Object.freeze(Object.defineProperties([], {
   shift: { value: noop }
}));