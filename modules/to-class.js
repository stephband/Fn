export default function toClass(object) {
    return O.toString.apply(object).slice(8, -1);
};
