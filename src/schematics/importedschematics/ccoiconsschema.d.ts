import { type CubeID } from "./cubes";
import { type PrefixID } from "./prefixes";
export type shorthandIconCubeData = {
    frames: number;
    scalar: number;
};
export declare function constructShorthandIconCubeData(data?: Partial<shorthandIconCubeData>): shorthandIconCubeData;
export type shorthandIconPrefixData = {
    canvasScalar: number;
    frames: number;
    addsOutlines: {
        background: boolean;
        cube: boolean;
        foreground: boolean;
    };
    rendersForeground: boolean;
    rendersBackground: boolean;
    isSeeded: boolean;
};
export declare function constructShorthandIconPrefixData(data?: Partial<shorthandIconPrefixData>): shorthandIconPrefixData;
export type shorthandIconDataSchema = {
    cubes: {
        [key in CubeID]?: shorthandIconCubeData;
    };
    prefixes: {
        [key in PrefixID]?: shorthandIconPrefixData;
    };
};
export declare function retrieveShorthandCubeData(cubeID: CubeID, schema: shorthandIconDataSchema): shorthandIconCubeData;
export declare function retrieveShorthandPrefixData(prefixID: PrefixID, schema: shorthandIconDataSchema): shorthandIconPrefixData;
export declare function greatestCommonDenominator(a: number, b: number): number;
export declare function leastCommonMultiple(a: number, b: number): number;
//# sourceMappingURL=ccoiconsschema.d.ts.map