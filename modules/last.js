export default function last(array) {
    if (typeof array.length === 'number') {
        return array[array.length - 1];
    }

    // Todo: handle Fns and Streams
};
