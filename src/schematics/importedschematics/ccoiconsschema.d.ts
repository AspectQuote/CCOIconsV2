import { type CubeID } from "./cubes";
import { type PrefixID } from "./prefixes";
export declare enum prefixRenderSteps {
    background = 0,
    foreground = 1,
    applyToBackground = 2,
    applyToCube = 3,
    applyToForeground = 4
}
export declare enum prefixRendererTags {
    isSeeded = 0,
    needsHeads = 1,
    needsEyes = 2,
    needsMouths = 3,
    needsAccents = 4
}
export declare const prefixRenderStepSchema: {
    readonly foreground: {
        readonly mainPrefix: prefixRenderSteps.foreground;
        readonly otherPrefixes: [prefixRenderSteps.applyToForeground];
    };
    readonly background: {
        readonly mainPrefix: prefixRenderSteps.background;
        readonly otherPrefixes: [prefixRenderSteps.applyToBackground];
    };
    readonly cube: {
        readonly mainPrefix: prefixRenderSteps.foreground;
        readonly otherPrefixes: [prefixRenderSteps.applyToCube];
    };
};
export type prefixRenderStepSchemaID = keyof typeof prefixRenderStepSchema;
export declare function frameCountFromPrefixesInList(prefixList: PrefixID[], steps: prefixRenderSteps[], shorthandSchema: shorthandIconDataSchema): number[];
export declare function getNeededFramesForPrefix(prefixID: PrefixID, mainPrefixStep: prefixRenderSteps, otherPrefixes: PrefixID[], otherSteps: prefixRenderSteps[], cubeID: CubeID, shorthandSchema: shorthandIconDataSchema): number;
export declare function aggregatePrefixTags(mainPrefix: PrefixID, otherPrefixes: PrefixID[], mainStep: prefixRenderSteps, otherSteps: prefixRenderSteps[], shorthandSchema: shorthandIconDataSchema, ignoreMain?: boolean): prefixRendererTags[];
export type shorthandIconCubeData = {
    frames: number;
    scalar: number;
};
export declare function constructShorthandIconCubeData(data?: Partial<shorthandIconCubeData>): shorthandIconCubeData;
export type shorthandIconPrefixData = {
    canvasScalar: number;
    renderSteps: {
        [key in prefixRenderSteps]?: {
            frames: number;
            tags: prefixRendererTags[];
        };
    };
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