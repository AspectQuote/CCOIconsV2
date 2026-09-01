import { cubeFlagInBitfield, cubeFlags, turnFlagsFieldIntoFlagsArray } from "./cubeflagsshared";
import { cubeSchema } from "./cubes";
import { prefixSchema } from "./prefixes";
import { raritySchema } from "./rarities";
const sharedSchema = {
    cubeSchema, prefixSchema, raritySchema, cubeFlags
};
const sharedFunctionality = {
    cubeFlagInBitfield, turnFlagsFieldIntoFlagsArray
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
    prefixRendererTags[prefixRendererTags["granularSeed"] = 1] = "granularSeed";
    prefixRendererTags[prefixRendererTags["needsHeads"] = 2] = "needsHeads";
    prefixRendererTags[prefixRendererTags["needsEyes"] = 3] = "needsEyes";
    prefixRendererTags[prefixRendererTags["needsMouths"] = 4] = "needsMouths";
    prefixRendererTags[prefixRendererTags["needsAccents"] = 5] = "needsAccents";
    prefixRendererTags[prefixRendererTags["needsIconDimensions"] = 6] = "needsIconDimensions";
    prefixRendererTags[prefixRendererTags["needsIcon"] = 7] = "needsIcon";
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
const tagsThatMeanCubeFramesAreNeeded = [prefixRendererTags.needsHeads, prefixRendererTags.needsEyes, prefixRendererTags.needsMouths, prefixRendererTags.needsAccents, prefixRendererTags.needsIcon];
export function getNeededFramesForPrefix(prefixID, mainPrefixStep, otherPrefixes, otherSteps, cubeID, shorthandSchema, all = false) {
    const usingOtherPrefixes = filterOtherPrefixesForNeeded(prefixID, mainPrefixStep, otherPrefixes, otherSteps, shorthandSchema, all);
    const prefixTags = aggregatePrefixTags(prefixID, usingOtherPrefixes, mainPrefixStep, otherSteps, shorthandSchema);
    const cubeFrames = tagsThatMeanCubeFramesAreNeeded.some(tag => prefixTags.includes(tag)) ? (shorthandSchema.cubes[cubeID]?.frames ?? 1) : 1;
    const mainPrefixDefinition = shorthandSchema.prefixes[prefixID];
    return [
        cubeFrames,
        mainPrefixDefinition?.renderSteps?.[mainPrefixStep]?.frames ?? 1,
        ...frameCountFromPrefixesInList(usingOtherPrefixes, otherSteps, shorthandSchema)
    ].reduce((prev, curr) => {
        return leastCommonMultiple(prev, curr);
    }, 1);
}
export function filterOtherPrefixesForNeeded(mainPrefix, mainPrefixStep, otherPrefixes, otherSteps, shorthandSchema, all = false) {
    if (!all) {
        const mainRenderer = shorthandSchema.prefixes[mainPrefix];
        if (!mainRenderer)
            return [];
        if (!mainRenderer.renderSteps[mainPrefixStep])
            return [];
    }
    const mainRendererStep = shorthandSchema.prefixes[mainPrefix]?.renderSteps[mainPrefixStep] ?? constructShorthandIconPrefixDataRenderStep({});
    return otherPrefixes.filter(prefixID => {
        if (mainRendererStep.affectedByOtherPrefixes.includes(prefixID))
            return true;
        if (otherSteps.length === 0)
            return false;
        const otherRenderer = shorthandSchema.prefixes[prefixID];
        return otherRenderer && prefixID !== mainPrefix && otherSteps.some(otherStep => {
            return otherRenderer.renderSteps[otherStep];
        });
    });
}
export function filterOtherFlagsForNeeded(flags, otherSteps) {
    return flags.filter(flag => {
        return otherSteps.some(renderStep => {
            return renderStep in flagIconRendererConstSchema[flag];
        });
    });
}
export function getTotalFlatCanvasPaddingForAppliedSteps(otherPrefixes, flags, otherSteps, shorthandSchema) {
    const usingOtherPrefixes = filterOtherPrefixesForNeeded("sacred", prefixRenderSteps.background, otherPrefixes, otherSteps, shorthandSchema, true);
    const usingOtherFlags = filterOtherFlagsForNeeded(flags, otherSteps);
    return usingOtherPrefixes.reduce((prev, otherPrefixID) => {
        const otherPrefixRenderer = shorthandSchema.prefixes[otherPrefixID];
        if (otherPrefixRenderer) {
            return prev + otherSteps.reduce((prev, otherStepID) => {
                if (otherPrefixRenderer.renderSteps[otherStepID]) {
                    return prev + otherPrefixRenderer.renderSteps[otherStepID].flatCanvasPadding;
                }
                return prev;
            }, 0);
        }
        return prev;
    }, 0) + usingOtherFlags.reduce((prev, flag) => {
        return prev + otherSteps.reduce((prev, otherStepID) => {
            // @ts-ignore
            if (otherStepID in flagIconRendererConstSchema[flag])
                return prev + (flagIconRendererConstSchema[flag][otherStepID].flatCanvasPadding ?? 0);
            return prev;
        }, 0);
    }, 0);
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
function constructShorthandIconPrefixDataRenderStep(data) {
    return {
        canvasScalar: data.canvasScalar ?? 1,
        flatCanvasPadding: data.flatCanvasPadding ?? 0,
        frames: data.frames ?? 1,
        tags: data.tags ?? [],
        dontRenderWithPrefixesPresent: data.dontRenderWithPrefixesPresent ?? [],
        affectedByOtherPrefixes: data.affectedByOtherPrefixes ?? []
    };
}
export function constructShorthandIconPrefixData(data = {}) {
    return {
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
export function constructFlagIconLayerConsts(data) {
    return {
        render: data.render ?? false,
        frames: data.frames ?? 1,
        flatPadding: data.flatPadding ?? 0,
        canvasScale: data.canvasScale ?? 1
    };
}
const bSideFlagRendererConsts = {
    render: true
};
export const flagIconRendererConstSchema = {
    [cubeFlags.bSide]: {
        [prefixRenderSteps.applyToBackground]: constructFlagIconLayerConsts(bSideFlagRendererConsts),
        [prefixRenderSteps.applyToCube]: constructFlagIconLayerConsts(bSideFlagRendererConsts),
        [prefixRenderSteps.applyToForeground]: constructFlagIconLayerConsts(bSideFlagRendererConsts),
    },
    [cubeFlags.collectors]: {
        [prefixRenderSteps.background]: constructFlagIconLayerConsts({
            render: true,
            flatPadding: 8
        })
    },
    [cubeFlags.contraband]: {},
    [cubeFlags.divine]: {
        [prefixRenderSteps.background]: constructFlagIconLayerConsts({
            render: true,
            canvasScale: 2,
            frames: 15
        })
    },
    [cubeFlags.slated]: {
        [prefixRenderSteps.background]: constructFlagIconLayerConsts({
            render: true,
            flatPadding: 16,
            frames: 15
        })
    }
};
