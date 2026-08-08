import { cubeSchema } from "./cubes";
import { prefixSchema } from "./prefixes";
import { raritySchema } from "./rarities";
const sharedSchema = {
    cubeSchema, prefixSchema, raritySchema
};
export function constructShorthandIconCubeData(data = {}) {
    return {
        frames: data.frames ?? 1,
        scalar: data.scalar ?? 1
    };
}
export function constructShorthandIconPrefixData(data = {}) {
    return {
        canvasScalar: data.canvasScalar ?? 1,
        frames: data.frames ?? 1,
        addsOutlines: data.addsOutlines ?? {
            background: false,
            cube: false,
            foreground: false
        },
        rendersForeground: data.rendersForeground ?? false,
        rendersBackground: data.rendersBackground ?? false,
        isSeeded: data.isSeeded ?? false
    };
}
export function retrieveShorthandCubeData(cubeID, schema) {
    return schema.cubes[cubeID] ?? constructShorthandIconCubeData();
}
export function retrieveShorthandPrefixData(prefixID, schema) {
    return schema.prefixes[prefixID] ?? constructShorthandIconPrefixData();
}
export function greatestCommonDenominator(a, b) {
    return a ? greatestCommonDenominator(b % a, a) : b;
}
export function leastCommonMultiple(a, b) {
    return a * b / greatestCommonDenominator(a, b);
}
