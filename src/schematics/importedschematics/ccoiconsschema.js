import { cubeSchema } from "./cubes";
import { prefixSchema } from "./prefixes";
import { raritySchema } from "./rarities";
const sharedSchema = {
    cubeSchema, prefixSchema, raritySchema
};
export var prefixRenderSteps;
(function (prefixRenderSteps) {
    // Where a prefix will render its foreground/background
    prefixRenderSteps[prefixRenderSteps["background"] = 0] = "background";
    prefixRenderSteps[prefixRenderSteps["foreground"] = 1] = "foreground";
    // Modifiers that affect already-generated frames
    prefixRenderSteps[prefixRenderSteps["applyToBackground"] = 2] = "applyToBackground";
    prefixRenderSteps[prefixRenderSteps["applyToCube"] = 3] = "applyToCube";
    prefixRenderSteps[prefixRenderSteps["applyToForeground"] = 4] = "applyToForeground";
})(prefixRenderSteps || (prefixRenderSteps = {}));
export var prefixRendererTags;
(function (prefixRendererTags) {
    prefixRendererTags[prefixRendererTags["isSeeded"] = 0] = "isSeeded";
    prefixRendererTags[prefixRendererTags["needsHeads"] = 1] = "needsHeads";
    prefixRendererTags[prefixRendererTags["needsEyes"] = 2] = "needsEyes";
    prefixRendererTags[prefixRendererTags["needsMouths"] = 3] = "needsMouths";
    prefixRendererTags[prefixRendererTags["needsAccents"] = 4] = "needsAccents";
})(prefixRendererTags || (prefixRendererTags = {}));
export const prefixRenderStepSchema = {
    foreground: {
        mainPrefix: prefixRenderSteps.foreground,
        otherPrefixes: [prefixRenderSteps.applyToForeground]
    },
    background: {
        mainPrefix: prefixRenderSteps.background,
        otherPrefixes: [prefixRenderSteps.applyToBackground]
    },
    cube: {
        mainPrefix: prefixRenderSteps.foreground,
        otherPrefixes: [prefixRenderSteps.applyToCube]
    },
};
export function frameCountFromPrefixesInList(prefixList, steps, shorthandSchema) {
    return prefixList.map(otherPrefix => {
        const otherRenderer = shorthandSchema.prefixes[otherPrefix];
        if (!otherRenderer)
            return [1];
        return steps.map(renderStep => {
            return otherRenderer.renderSteps[renderStep] ? otherRenderer.renderSteps[renderStep].frames : 1;
        });
    }).flat(1);
}
export function getNeededFramesForPrefix(prefixID, mainPrefixStep, otherPrefixes, otherSteps, cubeID, shorthandSchema) {
    const prefixTags = aggregatePrefixTags(prefixID, otherPrefixes, mainPrefixStep, otherSteps, shorthandSchema);
    const cubeFrames = [prefixRendererTags.needsHeads, prefixRendererTags.needsEyes, prefixRendererTags.needsMouths, prefixRendererTags.needsAccents].some(tag => prefixTags.includes(tag)) ? (shorthandSchema.cubes[cubeID]?.frames ?? 1) : 1;
    const mainPrefixDefinition = shorthandSchema.prefixes[prefixID];
    if (!mainPrefixDefinition?.renderSteps?.[mainPrefixStep])
        return 1;
    return [
        cubeFrames,
        mainPrefixDefinition.renderSteps[mainPrefixStep].frames,
        ...frameCountFromPrefixesInList(otherPrefixes, otherSteps, shorthandSchema)
    ].reduce((prev, curr) => {
        return leastCommonMultiple(prev, curr);
    }, 1);
}
export function aggregatePrefixTags(mainPrefix, otherPrefixes, mainStep, otherSteps, shorthandSchema, ignoreMain = false) {
    const mainRenderer = shorthandSchema.prefixes[mainPrefix];
    if (!mainRenderer)
        return [];
    if (!mainRenderer.renderSteps[mainStep])
        return [];
    const allTags = [];
    if (!ignoreMain)
        allTags.push(...mainRenderer.renderSteps[mainStep].tags);
    for (let otherPrefixIndex = 0; otherPrefixIndex < otherPrefixes.length; otherPrefixIndex++) {
        const otherPrefix = otherPrefixes[otherPrefixIndex];
        const otherPrefixRenderer = shorthandSchema.prefixes[otherPrefix];
        if (otherPrefixRenderer) {
            for (let otherStepIndex = 0; otherStepIndex < otherSteps.length; otherStepIndex++) {
                const otherStep = otherSteps[otherStepIndex];
                if (otherPrefixRenderer.renderSteps[otherStep]) {
                    for (let tagIndex = 0; tagIndex < otherPrefixRenderer.renderSteps[otherStep].tags.length; tagIndex++) {
                        const tag = otherPrefixRenderer.renderSteps[otherStep].tags[tagIndex];
                        if (!allTags.includes(tag))
                            allTags.push(tag);
                    }
                }
            }
        }
    }
    return allTags.sort();
}
export function constructShorthandIconCubeData(data = {}) {
    return {
        frames: data.frames ?? 1,
        scalar: data.scalar ?? 1
    };
}
export function constructShorthandIconPrefixData(data = {}) {
    return {
        canvasScalar: data.canvasScalar ?? 1,
        renderSteps: data.renderSteps ?? {}
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
