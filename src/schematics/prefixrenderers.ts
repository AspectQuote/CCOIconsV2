import { Jimp, ResizeStrategy } from "jimp";
import { config } from "../config";
import { cubeEye, cubeHead, cubeMouth, cubePartDefinition } from "../cubeparts"
import { JimpImage, JimpImgMod, loadAnimatedCubeIcon, parseHorizontalSpriteSheet, saveAnimatedCubeIcon } from "../utils"
import { PrefixID } from "./importedschematics/prefixes"
import * as fs from 'fs-extra'
import { defaultStrokeMatrix, fillRect, strokeImage, strokeMatrix } from "../imageutils";
import { getNeededFramesForPrefix, leastCommonMultiple, prefixRendererTags, prefixRenderSteps, shorthandIconDataSchema } from "./importedschematics/ccoiconsschema";
import seedrandom from "seedrandom";
import { CubeID } from "./importedschematics/cubes";

function compositeHeadsToAllFrames(targetFrames: JimpImage[], cubeIconFrame: JimpImage, heads: cubeHead[][], animation: JimpImage[], expectedHeadData: cubeHead) {
    const usingHeads = heads.map(heads => {
        return heads.map(head => {
            return {
                ...head,
                x: head.x + Math.floor((targetFrames[0].bitmap.width - cubeIconFrame.bitmap.width) / 2),
                y: head.y + Math.floor((targetFrames[0].bitmap.height - cubeIconFrame.bitmap.height) / 2)
            }
        });
    });
    for (let targetFrameIndex = 0; targetFrameIndex < targetFrames.length; targetFrameIndex++) {
        const targetFrame = targetFrames[targetFrameIndex];
        const headsThisFrame = usingHeads[targetFrameIndex % usingHeads.length];
        const animationFrame = animation[targetFrameIndex % animation.length];
        for (let headIndex = 0; headIndex < headsThisFrame.length; headIndex++) {
            const cubeHead = headsThisFrame[headIndex];
            
            const headSizeResizeFactor = cubeHead.width / expectedHeadData.width;

            const targetWidth = Math.ceil(animationFrame.bitmap.width * headSizeResizeFactor);
            const targetHeight = Math.ceil(animationFrame.bitmap.height * headSizeResizeFactor);
            const targetX = cubeHead.x - (expectedHeadData.x * headSizeResizeFactor);
            const targetY = cubeHead.y - (expectedHeadData.y * headSizeResizeFactor);

            // targetFrame.setPixelColor(0xff0000ff, targetX, targetY);
            // fillRect(targetFrame, cubeHead.x, cubeHead.y, cubeHead.width, 1, 0x0000ffff);

            targetFrame.composite(animationFrame.clone().resize({ w: targetWidth, h: targetHeight, mode: ResizeStrategy.NEAREST_NEIGHBOR }), targetX, targetY);
        }
    }
}

function compositeMouthsToAllFrames(targetFrames: JimpImage[], cubeIconFrame: JimpImage, mouths: cubeMouth[][], animation: JimpImage[], expectedMouthData: cubeMouth) {
    compositeHeadsToAllFrames(targetFrames, cubeIconFrame, mouths, animation, expectedMouthData);
}

function compositeEyesToAllFrames(targetFrames: JimpImage[], cubeIconFrame: JimpImage, eyes: cubeEye[][], animation: JimpImage[]) {
    const coordinateOffset = {
        x: Math.floor((targetFrames[0].bitmap.width - cubeIconFrame.bitmap.width) / 2),
        y: Math.floor((targetFrames[0].bitmap.height - cubeIconFrame.bitmap.height) / 2)
    }
    for (let targetFrameIndex = 0; targetFrameIndex < targetFrames.length; targetFrameIndex++) {
        const targetFrame = targetFrames[targetFrameIndex];
        const animationFrame = animation[targetFrameIndex % animation.length];
        const eyesThisFrame = eyes[targetFrameIndex % eyes.length];
        for (let eyeIndex = 0; eyeIndex < eyesThisFrame.length; eyeIndex++) {
            const eye = eyesThisFrame[eyeIndex];
            targetFrame.composite(animationFrame, eye.x - Math.floor(animationFrame.bitmap.width / 2) + coordinateOffset.x, eye.y - Math.floor(animationFrame.bitmap.height / 2) + coordinateOffset.y)
        }
    }
}

export type prefixRendererDefinition = {
    canvasScale: number,
    renderSteps: { [key in prefixRenderSteps]?: prefixRendererStepDefinition }
}

export function constructPrefixRenderer(data: Partial<prefixRendererDefinition>): prefixRendererDefinition {
    return {
        canvasScale: data.canvasScale ?? 1,
        renderSteps: data.renderSteps ?? {}
    }
}

export type prefixRendererStepDefinition = {
    tags: prefixRendererTags[]
    render: (parts: cubePartDefinition, input: JimpImage[], seed: number) => Promise<true>,
    frames: number
}

export function constructPrefixRendererStep(data: Partial<prefixRendererStepDefinition>): prefixRendererStepDefinition {
    return {
        render: data.render ?? (async (parts, input, seed) => {
            return true;
        }),
        tags: data.tags ?? [],
        frames: data.frames ?? 1
    }
}

const prefixSourceDirectory = `${config.sourceImagesDirectory}/prefixes`;

function generateBlankFrames(resolution: number, frameCount: number) {
    const blankFrames: JimpImage[] = [];
    const frameSize = Math.ceil(Math.max(1, resolution));
    while (blankFrames.length < frameCount) {
        blankFrames.push(new Jimp({
            width: frameSize,
            height: frameSize,
            color: 0x00000000
        }));
    }
    return blankFrames;
}

export function filterOtherPrefixesForNeeded(mainPrefix: PrefixID, mainPrefixStep: prefixRenderSteps, otherPrefixes: PrefixID[], otherSteps: prefixRenderSteps[], all: boolean = false): PrefixID[] {
    if (!all) {
        const mainRenderer = prefixRenderers[mainPrefix];
        if (!mainRenderer) return [];
        if (!mainRenderer.renderSteps[mainPrefixStep]) return [];
    }
    return otherPrefixes.filter(prefixID => {
        const otherRenderer = prefixRenderers[prefixID];
        return otherRenderer && prefixID !== mainPrefix && otherSteps.every(otherStep => {
            return otherRenderer.renderSteps[otherStep];
        });
    });
}

export function somePrefixInListHasTag(prefixList: PrefixID[], steps: prefixRenderSteps[], tag: prefixRendererTags) {
    return prefixList.some(otherPrefix => {
        const otherRenderer = prefixRenderers[otherPrefix];
        if (!otherRenderer) return false;
        return steps.some(renderStep => {
            return otherRenderer.renderSteps[renderStep] && otherRenderer.renderSteps[renderStep].tags.includes(tag);
        })
    })
}

export async function renderPrefixSteps(mainPrefix: PrefixID, otherPrefixes: PrefixID[], mainStep: prefixRenderSteps, otherSteps: prefixRenderSteps[], cubeID: CubeID, cubeParts: cubePartDefinition, prefixSeed: number, shorthandSchema: shorthandIconDataSchema, inputFrames?: JimpImage[]): Promise<JimpImage[]> {
    const mainRenderer = prefixRenderers[mainPrefix] ?? constructPrefixRenderer({});
    let prefixFrames: JimpImage[];
    const usingOtherPrefixes = filterOtherPrefixesForNeeded(mainPrefix, mainStep, otherPrefixes, otherSteps, !!inputFrames);
    const requiredFrames = getNeededFramesForPrefix(mainPrefix, mainStep, usingOtherPrefixes, otherSteps, cubeID, shorthandSchema);
    if (!inputFrames) {
        if (!mainRenderer.renderSteps[mainStep]) return [];
        prefixFrames = generateBlankFrames(cubeParts.icon[0].bitmap.width * mainRenderer.canvasScale, requiredFrames);
        await mainRenderer.renderSteps[mainStep].render(cubeParts, prefixFrames, prefixSeed);
    } else {
        prefixFrames = [];
        for (let generatedFrameIndex = 0; generatedFrameIndex < requiredFrames; generatedFrameIndex++) {
            const inputFrameIndex = generatedFrameIndex % inputFrames.length;
            prefixFrames.push(inputFrames[inputFrameIndex].clone());
        }
    }

    for (let otherPrefixIndex = 0; otherPrefixIndex < usingOtherPrefixes.length; otherPrefixIndex++) {
        const otherPrefixID = usingOtherPrefixes[otherPrefixIndex];
        const otherPrefixRenderer = prefixRenderers[otherPrefixID];
        if (otherPrefixRenderer) {
            for (let otherStepIndex = 0; otherStepIndex < otherSteps.length; otherStepIndex++) {
                const otherStep = otherSteps[otherStepIndex];
                if (otherPrefixRenderer.renderSteps[otherStep]) {
                    await otherPrefixRenderer.renderSteps[otherStep].render(cubeParts, prefixFrames, prefixSeed);
                }
            }
        } 
    }

    return prefixFrames;
}

function constructFrontBackPrefixRenderer(backImagePath: string, frontImagePath: string, tags: prefixRendererTags[], frames: number, renderImage: (seed: number, layerAnimation: JimpImage[], inputFrames: JimpImage[], parts: cubePartDefinition) => void) {
    return {
        [prefixRenderSteps.foreground]: constructPrefixRendererStep({
            frames,
            tags,
            render: async function (parts, input, seed) {
                let layerImage = frames > 1 ? await loadAnimatedCubeIcon(frontImagePath) : [await Jimp.read(frontImagePath)];
                renderImage(seed, layerImage, input, parts);
                return true;
            },
        }),
        [prefixRenderSteps.background]: constructPrefixRendererStep({
            frames,
            tags,
            render: async function (parts, input, seed) {
                let layerImage = frames > 1 ? await loadAnimatedCubeIcon(backImagePath) : [await Jimp.read(backImagePath)];
                renderImage(seed, layerImage, input, parts);
                return true;
            },
        })
    }
}

function constructBasicHatPrefixRendererStep(hatIcon: string, expectedHead: cubeHead): {[prefixRenderSteps.foreground]: prefixRendererStepDefinition} {
    return {
        [prefixRenderSteps.foreground]: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsHeads
            ],
            render: async function(parts, input, seed) {
                const hat = await Jimp.read(hatIcon);

                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [hat], expectedHead);

                return true;
            },
        })
    }
}

type animationKeyFrame = {
    x: number,
    y: number,
    layer: "front" | "back"
}

/**
 * Generate interpolated keyframes for an animation
 * @param desiredFrameCount How many frames to get for this animation
 * @param keyFrames The keyframes to interpolate
 * @param speed How fast the animation should be. This should only ever be 1, 2, -1 or -2.
 * @param extraStartingPercent A number from 0-100 determining which part of the animation should be the starting point.
 * @returns An array of the interpolated keyframes, the length is equal to the passed {@link desiredFrameCount}
 */
function generateInterpolatedFramesFromKeyFrames(desiredFrameCount: number, keyFrames: animationKeyFrame[], speed: number, extraStartingPercent: number = 0): animationKeyFrame[] {
    let generatedCoordinates: animationKeyFrame[] = [];
    const keyFrameStepThereshold = 1 / keyFrames.length;
    for (let animationFrameIndex = 0; animationFrameIndex < desiredFrameCount; animationFrameIndex++) {
        // The next 3 lines are to calculate frame progress on-the-fly becasuse I don't know how to do differentials
        let currentKeyFramePercentage = ((animationFrameIndex * speed) / desiredFrameCount) + (extraStartingPercent / 100);
        if (currentKeyFramePercentage < 0) currentKeyFramePercentage = 1 - (Math.abs(currentKeyFramePercentage) % 1);
        currentKeyFramePercentage = currentKeyFramePercentage % 1;

        const keyFrameProgress = (currentKeyFramePercentage % keyFrameStepThereshold) / keyFrameStepThereshold;
        const previousKeyFrameIndex = Math.floor(currentKeyFramePercentage / keyFrameStepThereshold);

        const nextKeyFrameIndex = (previousKeyFrameIndex + 1) % keyFrames.length
        const previousKeyFrame = keyFrames[previousKeyFrameIndex];
        const nextKeyFrame = keyFrames[nextKeyFrameIndex];

        const interpolatedPosition: animationKeyFrame = {
            x: Math.round((nextKeyFrame.x - previousKeyFrame.x) * keyFrameProgress) + previousKeyFrame.x,
            y: Math.round((nextKeyFrame.y - previousKeyFrame.y) * keyFrameProgress) + previousKeyFrame.y,
            layer: ((previousKeyFrame.layer === "back" || nextKeyFrame.layer === "back") ? "back" : "front")
        };
        generatedCoordinates.push(interpolatedPosition);
    }
    return generatedCoordinates;
}

const prefixRendererConsts = {
    flaming: {
        outlineColor: 0xff5722ff,
        fireColors: [
            [
                { apply: "hue", params: [150] }, // Frost Blue
                { apply: "lighten", params: [30] }
            ],
            [], // Normal Color
            [], // Normal Color
            [], // Normal Color
            [], // Normal Color
            [
                { apply: "hue", params: [-138] }, // Dark Purple
                { apply: "darken", params: [30] }
            ]
        ] as JimpImgMod[][]
    },
    glitchy: {
        maskColor: 0x045610b3
    },
    leafy: {
        hueRotations: [162, 326, 326, 326, 326, 34, 34, 34, 34, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    orbital: {
        frames: 60,
        layerRenderer: async function(parts: cubePartDefinition, input: JimpImage[], seed: number, layer: "front" | "back") {
            let seedGen = seedrandom(`orbital${seed}`);
            const coordinateOffset = {
                x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2)
            }
            let allPlanets: {
                name: string,
                color: JimpImage,
                mask: JimpImage,
                shading: JimpImage,
                startingPercent: number,
                speed: number,
                generatedKeyFrames: animationKeyFrame[]
            }[] = [];

            const orbitingKeyFrames: animationKeyFrame[] = [
                {
                    x: 7,
                    y: 31,
                    layer: "front"
                },
                {
                    x: 32,
                    y: 42,
                    layer: "front"
                },
                {
                    x: 56,
                    y: 31,
                    layer: "front"
                },
                {
                    x: 32,
                    y: 21,
                    layer: "back"
                }
            ]
            if (seedGen() < 0.25) {
                allPlanets.push({
                    name: "Jupiter",
                    color: await Jimp.read(`${prefixSourceDirectory}/orbital/jupiter/planet.png`),
                    mask: await Jimp.read(`${prefixSourceDirectory}/orbital/jupiter/mask.png`),
                    shading: await Jimp.read(`${prefixSourceDirectory}/orbital/jupiter/shading.png`),
                    startingPercent: seedGen() * 100,
                    speed: ((seedGen() > 0.5) ? 1 : -1) * (1 + ((seedGen() < 0.33) ? 1 : 0)),
                    generatedKeyFrames: []
                })
            }
            if (seedGen() < 0.33) {
                allPlanets.push({
                    name: "Mars",
                    color: await Jimp.read(`${prefixSourceDirectory}/orbital/mars/planet.png`),
                    mask: await Jimp.read(`${prefixSourceDirectory}/orbital/mars/mask.png`),
                    shading: await Jimp.read(`${prefixSourceDirectory}/orbital/mars/shading.png`),
                    startingPercent: seedGen() * 100,
                    speed: ((seedGen() > 0.5) ? 1 : -1) * (1 + ((seedGen() < 0.33) ? 1 : 0)),
                    generatedKeyFrames: []
                })
            }
            if (seedGen() < 0.20) {
                allPlanets.push({
                    name: "Eris",
                    color: await Jimp.read(`${prefixSourceDirectory}/orbital/eris/planet.png`),
                    mask: await Jimp.read(`${prefixSourceDirectory}/orbital/eris/mask.png`),
                    shading: await Jimp.read(`${prefixSourceDirectory}/orbital/eris/shading.png`),
                    startingPercent: seedGen() * 100,
                    speed: ((seedGen() > 0.5) ? 1 : -1) * (1 + ((seedGen() < 0.33) ? 1 : 0)),
                    generatedKeyFrames: []
                })
            }
            if (seedGen() < 0.25 || allPlanets.length === 0) {
                allPlanets.push({
                    name: "Earth",
                    color: await Jimp.read(`${prefixSourceDirectory}/orbital/earth/planet.png`),
                    mask: await Jimp.read(`${prefixSourceDirectory}/orbital/earth/mask.png`),
                    shading: await Jimp.read(`${prefixSourceDirectory}/orbital/earth/shading.png`),
                    startingPercent: seedGen() * 100,
                    speed: ((seedGen() > 0.5) ? 1 : -1) * (1 + ((seedGen() < 0.33) ? 1 : 0)),
                    generatedKeyFrames: []
                })
            }
            // const neededAnimationFrameCount = maths.leastCommonMultipleOfArray(allPlanets.map(planetData => {
            //     return planetData.color.bitmap.width
            // })) * 2;
            const neededAnimationFrameCount = this.frames;

            allPlanets.forEach((planetData) => {
                planetData.generatedKeyFrames = generateInterpolatedFramesFromKeyFrames(neededAnimationFrameCount, orbitingKeyFrames, planetData.speed, planetData.startingPercent);
            })

            function generatePlanetAnimationFrame(maskImage: JimpImage, colorImage: JimpImage, shadingImage: JimpImage, frameIndex: number): JimpImage {
                const generatedImage = new Jimp({ width: maskImage.bitmap.width, height: maskImage.bitmap.height, color: 0x00000000 });
                const xPosition = (frameIndex % colorImage.bitmap.width);

                if (xPosition > colorImage.bitmap.width - maskImage.bitmap.width) {
                    let neededOffset = colorImage.bitmap.width - xPosition;
                    generatedImage.composite(colorImage.clone(), neededOffset, 0);
                }

                generatedImage.composite(colorImage.clone(), -xPosition, 0);

                generatedImage.mask(maskImage);
                generatedImage.composite(shadingImage, 0, 0);

                return generatedImage;
            }

            const orbitingIntendedDimensions = {
                width: 64,
                height: 64
            }
            const dimensionsConversionRate = {
                x: (parts.icon[0].bitmap.width / orbitingIntendedDimensions.width) * 2,
                y: (parts.icon[0].bitmap.height / orbitingIntendedDimensions.height) * 2
            }

            for (let animationFrameIndex = 0; animationFrameIndex < neededAnimationFrameCount; animationFrameIndex++) {
                const currentFrame = input[animationFrameIndex % input.length];
                for (let planetIndex = 0; planetIndex < allPlanets.length; planetIndex++) {
                    const planetData = allPlanets[planetIndex];
                    const currentAnimationFrame = planetData.generatedKeyFrames[animationFrameIndex];
                    const compositePosition = {
                        x: Math.round(planetData.generatedKeyFrames[animationFrameIndex].x * dimensionsConversionRate.x) - (parts.icon[0].bitmap.width / 2) - (planetData.mask.bitmap.width / 2) + coordinateOffset.x,
                        y: Math.round(planetData.generatedKeyFrames[animationFrameIndex].y * dimensionsConversionRate.y) - (parts.icon[0].bitmap.height / 2) - (planetData.mask.bitmap.height / 2) + coordinateOffset.y
                    };

                    const planetAnimationFrame = generatePlanetAnimationFrame(planetData.mask, planetData.color, planetData.shading, animationFrameIndex);

                    if (currentAnimationFrame.layer === layer) {
                        currentFrame.composite(planetAnimationFrame, compositePosition.x, compositePosition.y);
                    }
                }
            }
        }
    },
    phasing: {
        maskColor: 0xaaaaaaff,
        layerRenderer: function(input: JimpImage[]) {
            const maskImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height, color: prefixRendererConsts.phasing.maskColor });
            for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                const frame = input[inputFrameIndex];
                frame.mask(maskImage);
            }
        }
    },
    evanescent: {
        maskColor: 0x777777ff,
        layerRenderer: function(input: JimpImage[]) {
            const maskImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height, color: prefixRendererConsts.phasing.maskColor });
            maskImage.scan(function(x, y, idx) {
                if ((x + y) % 2 === 1) {
                    maskImage.setPixelColor(prefixRendererConsts.evanescent.maskColor, x, y);
                }
            })
            for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                const frame = input[inputFrameIndex];
                frame.mask(maskImage);
            }
        }
    },
    rippling: {
        renderStep: constructPrefixRendererStep({
            frames: 30,
            tags: [],
            render: async function (parts, input, seed) {
                let desiredFrames = 30;
                const maxSinMovement = 2;

                function yOffset(x: number, frame: number) {
                    return Math.round(Math.sin((x - ((frame / desiredFrames) * (Math.PI * 2 * maxSinMovement))) / (maxSinMovement / 2)) * maxSinMovement)
                }

                for (let outputFrameIndex = 0; outputFrameIndex < input.length; outputFrameIndex++) {
                    const currentIconFrame = input[outputFrameIndex];
                    const sinWaveFrameIdx = outputFrameIndex % desiredFrames;
                    const outputFrame = new Jimp({ width: currentIconFrame.bitmap.width + (maxSinMovement * 2), height: currentIconFrame.bitmap.height + (maxSinMovement * 2), color: 0x00000000 })

                    for (let iconFrameXPosition = 0; iconFrameXPosition < currentIconFrame.bitmap.width; iconFrameXPosition++) {
                        const iconFrameYOffset = yOffset(iconFrameXPosition, sinWaveFrameIdx);
                        for (let iconFrameYPosition = 0; iconFrameYPosition < currentIconFrame.bitmap.height; iconFrameYPosition++) {
                            // console.log(currentIconFrame.getPixelColor(iconFrameXPosition, iconFrameYPosition), iconFrameXPosition, iconFrameYPosition)
                            outputFrame.setPixelColor(currentIconFrame.getPixelColor(iconFrameXPosition, iconFrameYPosition), iconFrameXPosition + maxSinMovement, iconFrameYPosition + iconFrameYOffset + maxSinMovement)
                        }
                    }
                    input[outputFrameIndex] = outputFrame;
                }
                return true;
            }
        })
    },
    runic: {
        hueShifts: [
            [], [], [], [], [],
            [
                { apply: "hue", params: [100] },
                { apply: "desaturate", params: [30] }
            ],
            [
                { apply: "hue", params: [180] },
                { apply: "desaturate", params: [30] }
            ],
            [
                { apply: "hue", params: [-120] },
                { apply: "saturate", params: [60] }
            ]
        ] as JimpImgMod[][],
        baseOutlineColor: 0x16d0c6ff,
        applicationToOtherLayers: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.isSeeded
            ],
            render: async function(parts, input, seed) {
                const outlinePixel = new Jimp({ width: 1, height: 1, color: prefixRendererConsts.runic.baseOutlineColor });
                let seedGen = seedrandom(`runic${seed}`);
                const colorShift = prefixRendererConsts.runic.hueShifts[Math.floor(seedGen() * prefixRendererConsts.runic.hueShifts.length)];
                outlinePixel.color(colorShift);
                const outlineColor = outlinePixel.getPixelColor(0, 0);
                
                for (let inputImageIndex = 0; inputImageIndex < input.length; inputImageIndex++) {
                    const inputFrame = input[inputImageIndex];
                    strokeImage(inputFrame, outlineColor, 1, false, undefined, true);
                }

                return true;
            },
        })
    }
} as const;

export const prefixRenderers = {
    "sacred": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            [prefixRenderSteps.foreground]: {
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                render: async function (parts, frames, seed) {
                    const sacredHalo = await Jimp.read(`${prefixSourceDirectory}/sacred/halo.png`);

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [sacredHalo], { x: 16, y: 35, width: 32 });

                    return true;
                },
            }
        }
    }),
    "flaming": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            [prefixRenderSteps.background]: {
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`flaming${seed}`);
                    let flamingFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/flaming/fire.png`);

                    const fireColorIndex = Math.floor(prefixRendererConsts.flaming.fireColors.length * seedGen());

                    flamingFrames.forEach(frame => {
                        frame.color(prefixRendererConsts.flaming.fireColors[fireColorIndex]);
                    })

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, flamingFrames, { x: 16, y: 38, width: 32 });

                    return true;
                },
            },
            [prefixRenderSteps.applyToCube]: {
                frames: 1,
                tags: [
                    prefixRendererTags.isSeeded
                ],
                render: async function (parts, frames, seed) {
                    let seedGen = seedrandom(`flaming${seed}`);
                    let flamingOutlineImage = new Jimp({
                        width: 1,
                        height: 1,
                        color: prefixRendererConsts.flaming.outlineColor
                    });
                    const fireColorIndex = Math.floor(prefixRendererConsts.flaming.fireColors.length * seedGen());
                    flamingOutlineImage.color(prefixRendererConsts.flaming.fireColors[fireColorIndex]);

                    const outlineColor = flamingOutlineImage.getPixelColor(0, 0);
                    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                        const frame = frames[frameIndex];
                        strokeImage(frame, outlineColor, 1, false, defaultStrokeMatrix, true);
                    }

                    return true;
                },
            },
            [prefixRenderSteps.applyToForeground]: {
                frames: 1,
                tags: [
                    prefixRendererTags.isSeeded
                ],
                render: async function (parts, frames, seed) {
                    let seedGen = seedrandom(`flaming${seed}`);
                    let flamingOutlineImage = new Jimp({
                        width: 1,
                        height: 1,
                        color: prefixRendererConsts.flaming.outlineColor
                    });
                    const fireColorIndex = Math.floor(prefixRendererConsts.flaming.fireColors.length * seedGen());
                    flamingOutlineImage.color(prefixRendererConsts.flaming.fireColors[fireColorIndex]);

                    const outlineColor = flamingOutlineImage.getPixelColor(0, 0);
                    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                        const frame = frames[frameIndex];
                        strokeImage(frame, outlineColor, 1, false, defaultStrokeMatrix, true);
                    }

                    return true;
                }
            }
        }
    }),
    "bugged": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.background]: {
                frames: 5,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    const buggedAnimation = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/bugged/source.png`);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, buggedAnimation, { x: 8, y: 16, width: 32 });
                    return true;
                }
            }
        }
    }),
    "based": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.foreground]: {
                frames: 5,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsEyes
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`based${seed}`);
                    let iconManipulations: JimpImgMod[] = [
                        { apply: "hue", params: [360 * seedGen()] }
                    ];
                    let eyeAnimation = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/based/source.png`);
                    eyeAnimation.forEach(frame => {
                        frame.color(iconManipulations);
                    });

                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, eyeAnimation);

                    return true;
                },
            }
        }
    }),
    "glitchy": constructPrefixRenderer({
        canvasScale: 1,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 10,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsAccents
                ],
                render: async function(parts, inputFrames, seed) {
                    let seedGen = seedrandom(`glitchy${seed}`);
                    const animationFrameCount = this.frames ?? 10;
                    const accentMaskImage = await Jimp.read(`${prefixSourceDirectory}/glitchy/mask.png`);
                    const rainingFlavorImages = [
                        await Jimp.read(`${prefixSourceDirectory}/glitchy/0.png`),
                        await Jimp.read(`${prefixSourceDirectory}/glitchy/1.png`)
                    ];

                    const numberOfBinaryIcons = 4 + Math.round(seedGen() * 4);
                    let binaryIcons: {
                        iconIndex: number,
                        x: number,
                        y: number
                    }[] = [];

                    while (binaryIcons.length < numberOfBinaryIcons) {
                        binaryIcons.push({
                            iconIndex: Math.floor(seedGen() * rainingFlavorImages.length),
                            x: Math.floor(seedGen() * parts.icon[0].bitmap.width),
                            y: Math.floor(seedGen() * parts.icon[0].bitmap.height),
                        })
                    }

                    const iconCoordinateOffset = {
                        x: Math.floor((inputFrames[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                        y: Math.floor((inputFrames[0].bitmap.height - parts.icon[0].bitmap.height) / 2),
                    }

                    for (let neededIconFrameIndex = 0; neededIconFrameIndex < inputFrames.length; neededIconFrameIndex++) {
                        let prefixFrameIndex = neededIconFrameIndex % animationFrameCount;
                        let accentFrameIndex = neededIconFrameIndex % parts.accents.length;
                        let iconFrameIndex = neededIconFrameIndex % parts.icon.length;
                        const iconFrame = parts.icon[iconFrameIndex];
                        const prefixFrame = inputFrames[neededIconFrameIndex];

                        for (let binaryIconIndex = 0; binaryIconIndex < binaryIcons.length; binaryIconIndex++) {
                            const binaryIcon = binaryIcons[binaryIconIndex];
                            const fallOffset = (iconFrame.bitmap.height / animationFrameCount) * prefixFrameIndex;
                            prefixFrame.composite(rainingFlavorImages[binaryIcon.iconIndex], binaryIcon.x, binaryIcon.y + fallOffset);
                            prefixFrame.composite(rainingFlavorImages[binaryIcon.iconIndex], binaryIcon.x, (binaryIcon.y - iconFrame.bitmap.height) + fallOffset);
                        }

                        strokeImage(prefixFrame, 0x000000ff, 1, false, defaultStrokeMatrix, true);

                        parts.accents[accentFrameIndex].scan(0, 0, parts.accents[accentFrameIndex].bitmap.width, parts.accents[accentFrameIndex].bitmap.height, function (x, y, idx) {
                            const outX = x + iconCoordinateOffset.x;
                            const outY = y + iconCoordinateOffset.y;
                            if (parts.accents[accentFrameIndex].bitmap.data[idx + 3] > 0 && prefixFrame.bitmap.data[prefixFrame.getPixelIndex(outX, outY) + 3] === 0) {
                                prefixFrame.setPixelColor(accentMaskImage.getPixelColor(x % accentMaskImage.bitmap.width, y % accentMaskImage.bitmap.height), outX, outY);
                            }
                        });
                    }

                    return true;
                },
            })
        }
    }),
    "bushy": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 1,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsMouths
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`bushy${seed}`);
                    const beardCount = 6;
                    const usedBeard = Math.floor(seedGen() * beardCount);

                    let seededBeardImage = await Jimp.read(`${prefixSourceDirectory}/bushy/${usedBeard}.png`);
                    compositeMouthsToAllFrames(input, parts.icon[0], parts.mouths, [seededBeardImage], { x: 16, y: 27, width: 4 });
                    
                    return true;
                },
            })
        }
    }),
    "leafy": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`leafy${seed}`);
                    const animationFrameCount = this.frames ?? 15; // Yes, there are 16 frames in the animation. However, 16 is not divisible by 5... I'm trying to keep prefix animation frame counts at intervals of 5 to make sure their least common multiple is more manageable.
                    const possibleLeafImages = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/leafy/source.png`);
                    const targetFrameSize = {
                        width: input[0].bitmap.width,
                        height: input[0].bitmap.height
                    }

                    const numberOfLeaves = 7 + Math.round(seedGen() * 2);
                    let fallingLeaves: {
                        iconIndexOffset: number,
                        x: number,
                        y: number
                    }[] = [];

                    const universalHueRotation: JimpImgMod[] = [{ apply: "hue", params: [prefixRendererConsts.leafy.hueRotations[Math.floor(prefixRendererConsts.leafy.hueRotations.length * seedGen())]] }];
                    for (let leafAnimationindex = 0; leafAnimationindex < possibleLeafImages.length; leafAnimationindex++) {
                        const leafFrame = possibleLeafImages[leafAnimationindex];
                        leafFrame.color(universalHueRotation);
                    }

                    while (fallingLeaves.length < numberOfLeaves) {
                        fallingLeaves.push({
                            iconIndexOffset: Math.floor(seedGen() * possibleLeafImages.length),
                            x: Math.floor(seedGen() * (targetFrameSize.width - possibleLeafImages[0].bitmap.width)) + Math.floor(possibleLeafImages[0].bitmap.width / 2),
                            y: Math.floor(seedGen() * targetFrameSize.height)
                        })
                    }

                    for (let animationFrameIndex = 0; animationFrameIndex < input.length; animationFrameIndex++) {
                        const prefixFrame = input[animationFrameIndex];
                        const animationFrame = animationFrameIndex % animationFrameCount;
                        for (let leafIconIndex = 0; leafIconIndex < fallingLeaves.length; leafIconIndex++) {
                            const leafIcon = fallingLeaves[leafIconIndex];
                            const fallOffset = (targetFrameSize.height) * (animationFrame/animationFrameCount);
                            const leafAnimationIndex = (leafIcon.iconIndexOffset + animationFrameIndex) % possibleLeafImages.length;
                            prefixFrame.composite(possibleLeafImages[leafAnimationIndex], leafIcon.x, leafIcon.y + fallOffset);
                            prefixFrame.composite(possibleLeafImages[leafAnimationIndex], leafIcon.x, (leafIcon.y - targetFrameSize.height) + fallOffset);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "cruel": constructPrefixRenderer({
        canvasScale: 1.25,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/cruel/back.png`, `${prefixSourceDirectory}/cruel/front.png`, [ prefixRendererTags.isSeeded, prefixRendererTags.needsHeads ], 1, (seed, anim, input, parts) => {
                let seedGen = seedrandom(`cruel${seed}`);
                const glassesHueRotation: JimpImgMod[] = [{ apply: "hue", params: [360 * seedGen()] }];
                anim[0].color(glassesHueRotation);

                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 4, y: 8, width: 32 });
            })
        }
    }),
    "orbital": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: prefixRendererConsts.orbital.frames,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function (parts, input, seed) {
                    await prefixRendererConsts.orbital.layerRenderer(parts, input, seed, "front");
                    return true;
                }
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: prefixRendererConsts.orbital.frames,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function (parts, input, seed) {
                    await prefixRendererConsts.orbital.layerRenderer(parts, input, seed, "back");
                    return true;
                }
            })
        }
    }),
    "foolish": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/foolish/hat.png`)], { x: 16, y: 24, width: 32 });
                    return true;
                },
            })
        }
    }),
    "cursed": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`cursed${seed}`);
                    const coordinateOffset = {
                        x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                        y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2)
                    }
                    const baseImage = await Jimp.read(`${prefixSourceDirectory}/cursed/pentagram.png`);
                    baseImage.color([{
                        apply: "hue",
                        params: [360 * seedGen()]
                    }])
                    const cursedFrames = this.frames ?? 15;
                    const frameRotation = 72 / cursedFrames;
                    const rotationSpeed = ((seedGen() > 0.5) ? 1 : -1) * 1;

                    for (let cursedFrameIndex = 0; cursedFrameIndex < cursedFrames; cursedFrameIndex++) {
                        const prefixFrame = input[cursedFrameIndex % input.length];
                        const rotationDegrees = (frameRotation * cursedFrameIndex * rotationSpeed)
                        const newFrame = baseImage.clone().rotate({deg: 1 + (rotationDegrees), mode: false});
                        newFrame.resize({ w: prefixFrame.bitmap.width + 1, h: Math.round(prefixFrame.bitmap.height / 2), mode: ResizeStrategy.NEAREST_NEIGHBOR});
                        prefixFrame.composite(newFrame, (parts.icon[0].bitmap.width / 2) + coordinateOffset.x - (newFrame.bitmap.width / 2), Math.floor(parts.icon[0].bitmap.height * 0.4) + (parts.icon[0].bitmap.height / 2) + coordinateOffset.y - (newFrame.bitmap.height / 2));
                    }
                    return true;
                },
            })
        }
    }),
    "emburdening": constructPrefixRenderer({
        canvasScale: 2.5,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/emburdening/back.png`, `${prefixSourceDirectory}/emburdening/front.png`, [prefixRendererTags.needsHeads], 1, (seed, anim, input, parts) => {
                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 0, y: 8, width: 32 });
            })
        }
    }),
    "cuffed": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/cuffed/back.png`, `${prefixSourceDirectory}/cuffed/front.png`, [prefixRendererTags.needsHeads], 1, (seed, anim, input, parts) => {
                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 0, y: 21, width: 32 });
            })
        }
    }),
    // Come back to Endangered, replace with bear trap.
    "marvelous": constructPrefixRenderer({
        canvasScale: 2.5,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/marvelous/back.png`, `${prefixSourceDirectory}/marvelous/front.png`, [prefixRendererTags.needsHeads], 1, (seed, anim, input, parts) => {
                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 23, y: 3, width: 32 });
            })
        }
    }),
    "phasing": constructPrefixRenderer({
        canvasScale: 1,
        renderSteps: {
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                tags: [prefixRendererTags.needsIcon],
                render: async function(parts, input, seed) {
                    prefixRendererConsts.phasing.layerRenderer(input);
                    return true;
                },
            }),
            // [prefixRenderSteps.applyToForeground]: constructPrefixRendererStep({
            //     render: async function (parts, input, seed) {
            //         prefixRendererConsts.phasing.layerRenderer(input);
            //         return true;
            //     },
            // }),
            // [prefixRenderSteps.applyToBackground]: constructPrefixRendererStep({
            //     render: async function (parts, input, seed) {
            //         prefixRendererConsts.phasing.layerRenderer(input);
            //         return true;
            //     },
            // }),
        }
    }),
    "evanescent": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                render: async function(parts, input, seed) {
                    prefixRendererConsts.evanescent.layerRenderer(input);

                    return true;
                },
            })
        }
    }),
    "raving": constructPrefixRenderer({
        canvasScale: 1,
        renderSteps: {
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                frames: 15,
                tags: [
                    prefixRendererTags.needsIcon
                ],
                render: async function(parts, input, seed) {
                    const ravingFrames = this.frames ?? 15;

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const ravingProgress = (inputFrameIndex % ravingFrames) / ravingFrames;
                        input[inputFrameIndex].color([
                            { apply: "hue", params: [(360 * ravingProgress)] },
                            { apply: "darken", params: [10] }
                        ])
                    }

                    return true;
                },
            })
        }
    }),
    "royal": constructPrefixRenderer({
        canvasScale: 1.75,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`royal${seed}`);
                    let crownType = Math.ceil(2 * seedGen());
                    const crownImage = await Jimp.read(`${prefixSourceDirectory}/royal/crown${crownType}.png`);
                    const crownGemMask = await Jimp.read(`${prefixSourceDirectory}/royal/crown${crownType}gemmasks.png`);
                    const crownGems = crownImage.clone().mask(crownGemMask);
                    crownGems.color([{
                        apply: "hue",
                        params: [360 * seedGen()]
                    }, {
                        apply: "brighten",
                        params: [20 * seedGen()]
                    }])
                    crownImage.composite(crownGems, 0, 0);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [crownImage], { x: 2, y: 17, width: 32 });

                    return true;
                },
            })
        }
    }),
    "captain": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/captain/hat.png`, { x: 5, y: 13, width: 32 })
        }
    }),
    "insignificant": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/insignificant/halo.png`, { x: 74, y: 54, width: 32 })
        }
    }),
    "95in": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function(parts, input, seed) {
                    const topLeftBorderColor = 0xc3c3c3ff;
                    const topLeftShineColor = 0xffffffff;
                    const bottomRightBorderColor = 0x828282ff;
                    const baseColor = 0xc3c3c3ff;
                    const topBarColor = 0x000082ff;

                    const toolBarImage = await Jimp.read(`${prefixSourceDirectory}/95in/toolbar.png`);
                    const toolBarNameImage = await Jimp.read(`${prefixSourceDirectory}/95in/toolbarname.png`);

                    // const shadowDistance = 3;
                    // const shadowColor = 0xa1a1a1ff;

                    let basePrefixFrame = new Jimp({width: input[0].bitmap.width, height: input[0].bitmap.width, color: baseColor});

                    fillRect(basePrefixFrame, 0, 0, basePrefixFrame.bitmap.width, 1, topLeftBorderColor);
                    fillRect(basePrefixFrame, 0, 0, 1, basePrefixFrame.bitmap.height, topLeftBorderColor);

                    fillRect(basePrefixFrame, 1, 1, basePrefixFrame.bitmap.width - 2, 1, topLeftShineColor);
                    fillRect(basePrefixFrame, 1, 1, 1, basePrefixFrame.bitmap.height - 2, topLeftShineColor);

                    fillRect(basePrefixFrame, basePrefixFrame.bitmap.width - 1, 1, 1, basePrefixFrame.bitmap.height - 1, bottomRightBorderColor);
                    fillRect(basePrefixFrame, 1, basePrefixFrame.bitmap.height - 1, basePrefixFrame.bitmap.width - 1, 1, bottomRightBorderColor);

                    fillRect(basePrefixFrame, 4, 4, basePrefixFrame.bitmap.width - 8, 10, topBarColor);
                    basePrefixFrame.composite(toolBarNameImage, 4, 4);
                    basePrefixFrame.composite(toolBarImage, basePrefixFrame.bitmap.width - 4 - toolBarImage.bitmap.width, 4);

                    for (let iconFrameIndex = 0; iconFrameIndex < input.length; iconFrameIndex++) {
                        const iconFrame = input[iconFrameIndex];

                        // let newPrefixFrame = basePrefixFrame.clone();
                        // let frameShadow = new Jimp({width: iconFrame.bitmap.width, height: iconFrame.bitmap.height, color: shadowColor});
                        // frameShadow.mask(iconFrame, 0, 0);
                        // frameShadow.scan(0, 0, frameShadow.bitmap.width, frameShadow.bitmap.height, function (x, y, idx) {
                        //     if (frameShadow.bitmap.data[idx + 3] > 0) {
                        //         frameShadow.setPixelColor(shadowColor, x, y);
                        //     }
                        // })

                        iconFrame.composite(basePrefixFrame, 0, 0);
                    }
                    return true;
                },
            })
        }
    }),
    "snowy": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`snowy${seed}`);
                    const animationFrameCount = this.frames ?? 15;
                    const possibleSnowflakeImages = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/snowy/source.png`);
                    const largeSnowflakeImages = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/snowy/large.png`);
                    const targetFrameSize = {
                        width: input[0].bitmap.width,
                        height: input[0].bitmap.height
                    }

                    const numberOfSnowflakes = 7 + Math.round(seedGen() * 2);
                    let fallingSnow: {
                        iconIndexOffset: number,
                        x: number,
                        y: number,
                        large: boolean
                    }[] = [];

                    while (fallingSnow.length < numberOfSnowflakes) {
                        fallingSnow.push({
                            iconIndexOffset: Math.floor(seedGen() * possibleSnowflakeImages.length),
                            x: Math.floor(seedGen() * (targetFrameSize.width - possibleSnowflakeImages[0].bitmap.width)) + Math.floor(possibleSnowflakeImages[0].bitmap.width / 2),
                            y: Math.floor(seedGen() * targetFrameSize.height),
                            large: seedGen() > 0.8
                        })
                    }

                    for (let animationFrameIndex = 0; animationFrameIndex < input.length; animationFrameIndex++) {
                        const prefixFrame = input[animationFrameIndex];
                        const animationFrame = animationFrameIndex % animationFrameCount;
                        for (let leafIconIndex = 0; leafIconIndex < fallingSnow.length; leafIconIndex++) {
                            const snowflakeIcon = fallingSnow[leafIconIndex];
                            const fallOffset = (targetFrameSize.height) * (animationFrame / animationFrameCount);
                            const snowAnimationIndex = (snowflakeIcon.iconIndexOffset + animationFrameIndex) % possibleSnowflakeImages.length;
                            const imageUsed = (snowflakeIcon.large) ? possibleSnowflakeImages[snowAnimationIndex] : largeSnowflakeImages[snowAnimationIndex];
                            prefixFrame.composite(imageUsed, snowflakeIcon.x, snowflakeIcon.y + fallOffset);
                            prefixFrame.composite(imageUsed, snowflakeIcon.x, (snowflakeIcon.y - targetFrameSize.height) + fallOffset);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "tentacular": constructPrefixRenderer({
        canvasScale: 1.5,
        // renderSteps: {
        //     [prefixRenderSteps.foreground]: constructPrefixRendererStep({
        //         tags: [
        //             prefixRendererTags.needsHeads,
        //             prefixRendererTags.needsIcon,
        //             prefixRendererTags.isSeeded
        //         ],
        //         frames: 15,
        //         render: async function(parts, input, seed) {
        //             let seedGen = seedrandom(`tentacular${seed}`);

        //             let iconHeight = parts.icon[0].bitmap.height;
        //             let iconWidth = parts.icon[0].bitmap.width;

        //             const inputIconOffset = {
        //                 x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
        //                 y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2)
        //             }

        //             let tentacleCount = Math.round(seedGen() * 2) + 2;
        //             let tentacleImage = await Jimp.read(`${prefixSourceDirectory}/tentacular/tentacle.png`);
        //             const desiredFrames = this.frames ?? 15;

        //             compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/tentacular/front.png`)], { x: 8, y: 16, width: 32 })

        //             let tentacleSlopeVariance = 0.2;

        //             let tentacleLines: {
        //                 start: {
        //                     x: number,
        //                     y: number
        //                 },
        //                 end: {
        //                     x: number,
        //                     y: number
        //                 },
        //                 offset: number,
        //                 flipX: boolean,
        //                 flipY: boolean,
        //                 direction: number,
        //                 slope: number,
        //                 lineImage: JimpImage,
        //                 lineImagesPerFrame: JimpImage[]
        //             }[] = [];

        //             const maskThickness = Math.ceil(tentacleImage.bitmap.height / 2);
        //             const maskInputOffset = {
        //                 x: Math.floor((input[0].bitmap.width - (parts.icon[0].bitmap.width + (maskThickness * 2))) / 2),
        //                 y: Math.floor((input[0].bitmap.width - (parts.icon[0].bitmap.height + (maskThickness * 2))) / 2)
        //             };

        //             while (tentacleLines.length < tentacleCount) {
        //                 let newTentacle: typeof tentacleLines[number] = {
        //                     start: {
        //                         x: 0,
        //                         y: 0
        //                     },
        //                     end: {
        //                         x: 0,
        //                         y: 0
        //                     },
        //                     offset: Math.round(seedGen() * tentacleImage.bitmap.width),
        //                     flipX: seedGen() > 0.5,
        //                     flipY: seedGen() > 0.5,
        //                     direction: ((seedGen() > 0.5) ? -1 : 1),
        //                     slope: 0,
        //                     lineImage: new Jimp({width: 0, height: 0, color: 0}),
        //                     lineImagesPerFrame: []
        //                 }
        //                 newTentacle.start.y = Math.round((seedGen() * ((iconHeight + (maskThickness * 2)) * (1 - (tentacleSlopeVariance * 2)))) + ((iconHeight + (maskThickness * 2)) * tentacleSlopeVariance));
        //                 newTentacle.end.x = iconWidth + maskThickness - 1;
        //                 newTentacle.end.y = Math.round(newTentacle.start.y + (seedGen() * (iconHeight + (maskThickness * 2)) * tentacleSlopeVariance * ((seedGen() > 0.5) ? -1 : 1)));
        //                 newTentacle.slope = (newTentacle.start.y - newTentacle.end.y) / (newTentacle.start.x - newTentacle.end.x);
        //                 newTentacle.lineImage = new Jimp({ width: parts.icon[0].bitmap.width + (maskThickness * 2), height: parts.icon[0].bitmap.height + (maskThickness * 2), color: 0x00000000});
        //                 for (let lineImageX = 0; lineImageX < newTentacle.lineImage.bitmap.width; lineImageX++) {
        //                     newTentacle.lineImage.setPixelColor(0xffffffff, lineImageX, newTentacle.start.y + Math.round(lineImageX * newTentacle.slope));
        //                 }
        //                 tentacleLines.push(newTentacle);
        //             }

        //             const tentacleMovementPerFrame = tentacleImage.bitmap.width / desiredFrames;
        //             const tentacleImageCenterOffset = Math.round(tentacleImage.bitmap.height / 2);
        //             parts.icon.forEach((frame, index) => {
        //                 tentacleLines.forEach((tentacleLine) => {
        //                     const newLineImage: JimpImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height, color: 0x00000000 });
        //                     newLineImage.composite(tentacleLine.lineImage, maskInputOffset.x, maskInputOffset.y);
        //                     // newLineImage.mask({src: parts.icon[index], x: maskThickness, y: maskThickness});
        //                     newLineImage.scan(function(x, y, idx) {
        //                         if (x < inputIconOffset.x || y < inputIconOffset.y || y > (frame.bitmap.height - inputIconOffset.y) || x > (frame.bitmap.width - inputIconOffset.x)) {
        //                             newLineImage.setPixelColor(x, y, 0xff0000ff);
        //                         }
        //                     })
        //                     // strokeImage(newLineImage, 0xffffffff, maskThickness, false, undefined, true);
        //                     tentacleLine.lineImagesPerFrame.push(newLineImage);
        //                 })
        //             })

        //             for (let neededIconFrameIndex = 0; neededIconFrameIndex < input.length; neededIconFrameIndex++) {
        //                 const newPrefixImage = input[neededIconFrameIndex];
        //                 const iconFrameIndex = neededIconFrameIndex % parts.icon.length;

        //                 for (let tentacleLineIndex = 0; tentacleLineIndex < tentacleLines.length; tentacleLineIndex++) {
        //                     const tentacleLine = tentacleLines[tentacleLineIndex];
        //                     const lineImageThisFrame = tentacleLine.lineImagesPerFrame[iconFrameIndex];

        //                     let newTentacleFrame = new Jimp({ width: newPrefixImage.bitmap.width, height: newPrefixImage.bitmap.height, color: 0x00000000});

        //                     for (let newTentacleFrameX = 0; newTentacleFrameX < newTentacleFrame.bitmap.width; newTentacleFrameX++) {
        //                         const newCenterPoint = {
        //                             x: newTentacleFrameX,
        //                             y: tentacleLine.start.y + Math.round(newTentacleFrameX * tentacleLine.slope)
        //                         }
        //                         for (let newTentacleFrameY = 0; newTentacleFrameY < tentacleImage.bitmap.height; newTentacleFrameY++) {
        //                             let sourceX = (((newCenterPoint.x + (tentacleLine.offset + tentacleImage.bitmap.width - 1)) + Math.round((tentacleLine.direction * neededIconFrameIndex) * tentacleMovementPerFrame)) % tentacleImage.bitmap.width);
        //                             if (tentacleLine.flipX) {
        //                                 sourceX = tentacleImage.bitmap.width - 1 - sourceX;
        //                             }
        //                             let sourceY = newTentacleFrameY;
        //                             if (tentacleLine.flipY) {
        //                                 sourceY = tentacleImage.bitmap.height - 1 - sourceY;
        //                             }
        //                             const sourceCoordinates = {
        //                                 x: sourceX,
        //                                 y: sourceY
        //                             }
        //                             const destinationCoordinates = {
        //                                 x: newTentacleFrameX,
        //                                 y: newCenterPoint.y - tentacleImageCenterOffset + newTentacleFrameY + 1
        //                             }
        //                             newTentacleFrame.setPixelColor(tentacleImage.getPixelColor(sourceCoordinates.x, sourceCoordinates.y), destinationCoordinates.x, destinationCoordinates.y);
        //                         }
        //                     }
        //                     newPrefixImage.composite(lineImageThisFrame, 0, 0);
        //                     // newPrefixImage.composite(newTentacleFrame.mask({ src: lineImageThisFrame }), 0, 0);
        //                 }
        //             }

        //             return true;
        //         },
        //     }),
        //     [prefixRenderSteps.background]: constructPrefixRendererStep({
        //         tags: [
        //             prefixRendererTags.needsHeads
        //         ],
        //         render: async function(parts, input, seed) {
        //             let tentacleHeadBackImage = await Jimp.read(`${prefixSourceDirectory}/tentacular/back.png`);
        //             return true;
        //         },
        //     })
        // }
    }),
    "summoning": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 60,
                tags: [
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.isSeeded
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`summoning${seed}`);

                    const desiredFrames = this.frames ?? 60;
                    const summoningCount = Math.ceil(seedGen() * 7) + 1;
                    const globalOffset = Math.ceil(desiredFrames * seedGen());
                    const centerPoint = Math.ceil(input[0].bitmap.width / 2);
                    const iconCenter = parts.icon[0].bitmap.width / 2;
                    const radius = (((iconCenter) * seedGen()) + (iconCenter * 1.25));
                    const angleIncrementPerFrame = (2 * Math.PI) / desiredFrames;
                    const angleIncrementBetweenCube = (2 * Math.PI) / summoningCount;

                    const summoningFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/summoning/cube.png`)

                    for (let desiredFrameIndex = 0; desiredFrameIndex < input.length; desiredFrameIndex++) {
                        const currentFrame = input[desiredFrameIndex];
                        for (let summoningCountIndex = 0; summoningCountIndex < summoningCount; summoningCountIndex++) {
                            const offset = (summoningCountIndex * Math.ceil(desiredFrames / summoningCount)) + globalOffset;
                            const rainbowMod: JimpImgMod[] = [{ apply: "hue", params: [((desiredFrameIndex + offset) * (360 / desiredFrames)) % 360] }]
                            const summoningFrame = summoningFrames[(desiredFrameIndex + offset) % summoningFrames.length];
                            const cubeAngle = (angleIncrementPerFrame * desiredFrameIndex) + (angleIncrementBetweenCube * summoningCountIndex);
                            currentFrame.composite(summoningFrame.clone().color(rainbowMod), centerPoint + (radius * Math.cos(cubeAngle)) - summoningFrame.bitmap.width / 2, centerPoint + (radius * Math.sin(cubeAngle)) - summoningFrame.bitmap.height / 2)
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "swarming": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 60,
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`swarming${seed}`);

                    const desiredFrames = this.frames ?? 60;
                    const summoningCount = Math.ceil(seedGen() * 7) + 1;
                    const globalOffset = Math.ceil(desiredFrames * seedGen());
                    const centerPoint = Math.ceil(input[0].bitmap.width / 2);
                    const iconCenter = parts.icon[0].bitmap.width / 2;
                    const radius = (((iconCenter) * seedGen()) + (iconCenter * 1.25));
                    const angleIncrementPerFrame = (2 * Math.PI) / desiredFrames;
                    const angleIncrementBetweenCube = (2 * Math.PI) / summoningCount;

                    const swarmingScaleChange = 3;
                    const swarmingFrames = parts.icon.map(iconFrame => {
                        return iconFrame.clone().resize({ w: Math.ceil(iconFrame.bitmap.width / swarmingScaleChange), h: Math.ceil(iconFrame.bitmap.height / swarmingScaleChange), mode: ResizeStrategy.NEAREST_NEIGHBOR});
                    });

                    for (let desiredFrameIndex = 0; desiredFrameIndex < input.length; desiredFrameIndex++) {
                        const currentFrame = input[desiredFrameIndex];
                        for (let summoningCountIndex = 0; summoningCountIndex < summoningCount; summoningCountIndex++) {
                            const offset = (summoningCountIndex * Math.ceil(desiredFrames / summoningCount)) + globalOffset;
                            const summoningFrame = swarmingFrames[(desiredFrameIndex + offset) % swarmingFrames.length];
                            const cubeAngle = (angleIncrementPerFrame * desiredFrameIndex) + (angleIncrementBetweenCube * summoningCountIndex);
                            currentFrame.composite(summoningFrame, centerPoint + (radius * Math.cos(cubeAngle)) - summoningFrame.bitmap.width / 2, centerPoint + (radius * Math.sin(cubeAngle)) - summoningFrame.bitmap.height / 2);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "kramped": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/kramped/horns.png`, { x: 16, y: 24, width: 32 })
        }
    }),
    "dandy": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/dandy/hairback.png`, `${prefixSourceDirectory}/dandy/hair.png`, [prefixRendererTags.needsHeads], 1, (seed, layerAnim, input, parts) => {
                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 8, y: 16, width: 32 });
            })
        }
    }),
    "incarcerated": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            ...constructFrontBackPrefixRenderer(`${prefixSourceDirectory}/incarcerated/bottom.png`, `${prefixSourceDirectory}/incarcerated/top.png`, [prefixRendererTags.needsHeads], 1, (seed, layerAnim, input, parts) => {
                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 8, y: 16, width: 32 });
            })
        }
    }),
    "rippling": constructPrefixRenderer({
        canvasScale: 1,
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.rippling.renderStep,
            [prefixRenderSteps.applyToBackground]: prefixRendererConsts.rippling.renderStep,
            [prefixRenderSteps.applyToForeground]: prefixRendererConsts.rippling.renderStep
        }
    }),
    "runic": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.isSeeded
                ],
                frames: 10,
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`runic${seed}`);
                    const allRunes = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/runic/runes.png`);
                    const desiredFrames = this.frames ?? 10;

                    const colorShift = prefixRendererConsts.runic.hueShifts[Math.floor(seedGen() * prefixRendererConsts.runic.hueShifts.length)];
                    allRunes.forEach(image => image.color(colorShift));

                    const runeCount = Math.round(seedGen() * 2) + 2;
                    let runes: {
                        runeIndex: number,
                        angleOffset: number,
                        position: { x: number, y: number }
                    }[] = [];
                    const floatSize = 2;
                    const runePadding = allRunes[0].bitmap.width + floatSize;
                    while (runes.length < runeCount) {
                        runes.push({
                            runeIndex: Math.floor(allRunes.length * seedGen()),
                            angleOffset: seedGen() * 2 * Math.PI,
                            position: {
                                x: Math.floor((input[0].bitmap.width - runePadding) * seedGen()) + Math.round(runePadding / 2),
                                y: Math.floor((input[0].bitmap.height - runePadding) * seedGen()) + Math.round(runePadding / 2),
                            }
                        })
                    }

                    for (let outputFrameIndex = 0; outputFrameIndex < input.length; outputFrameIndex++) {
                        const outputFrame = input[outputFrameIndex];
                        const baseAngle = (outputFrameIndex / desiredFrames) * 2 * Math.PI;
                        for (let generatedRuneIndex = 0; generatedRuneIndex < runes.length; generatedRuneIndex++) {
                            const rune = runes[generatedRuneIndex];
                            const currentRuneIcon = allRunes[rune.runeIndex];
                            outputFrame.composite(
                                currentRuneIcon,
                                rune.position.x - Math.ceil(currentRuneIcon.bitmap.width / 2),
                                (rune.position.y + (Math.sin(baseAngle + rune.angleOffset) * floatSize)) - Math.ceil(currentRuneIcon.bitmap.height / 2)
                            );
                        }
                    }

                    return true;
                }
            }),
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.runic.applicationToOtherLayers,
            [prefixRenderSteps.applyToForeground]: prefixRendererConsts.runic.applicationToOtherLayers,
            [prefixRenderSteps.applyToBackground]: prefixRendererConsts.runic.applicationToOtherLayers
        }
    }),
    "emphasized": constructPrefixRenderer({
        canvasScale: 3,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`emphasized${seed}`);

                    let arrowImages = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/emphasized/arrows.png`);
                    let constructedArrowFrame = new Jimp({ width: arrowImages[0].bitmap.width, height: arrowImages[0].bitmap.height, color: 0x00000000 });

                    let usedArrows: number[] = [];
                    const arrowCount = Math.ceil(arrowImages.length * (2 ** (5 * (seedGen() - 1)))); // \operatorname{ceil}\left(\left(8\right)2^{5\left(x-1\right)}\right) 
                    while (usedArrows.length < arrowCount) {
                        const newIndex = Math.floor(seedGen() * arrowImages.length);
                        if (!usedArrows.includes(newIndex)) {
                            usedArrows.push(newIndex)
                        }
                    }
                    usedArrows.forEach(arrowIndex => {
                        constructedArrowFrame.composite(arrowImages[arrowIndex], 0, 0);
                    });

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [ constructedArrowFrame ], { x: 32, y: 40, width: 32 });
                    return true;
                },
            })
        }
    }),
    // "chained": constructPrefixRenderer({}) (fix when tentacular is fixed) .. extract & generalize this "wrapping" effect?
    // "adduced": constructPrefixRenderer({}) (fix when tentacular is fixed)
    "angelic": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 10,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    let haloFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/angelic/halo.png`);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, haloFrames, { x: 3, y: 14, width: 32 });

                    return true;
                },
            })
        }
    }),
    "menacing": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 30,
                tags: [
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function(parts, input, seed) {
                    const menacingFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/menacing/menacing.png`);

                    const desiredFrames = this.frames ?? 30;

                    const baseKeyFrames: animationKeyFrame[] = [
                        {
                            x: Math.round(input[0].bitmap.width * 0.7),
                            y: input[0].bitmap.height + Math.round(1.2 * menacingFrames[0].bitmap.height),
                            layer: "front"
                        },
                        {
                            x: Math.round(input[0].bitmap.width * 1.1),
                            y: -Math.round(menacingFrames[0].bitmap.height * 2.2),
                            layer: "front"
                        }
                    ]

                    const menacingCount = Math.max(5, Math.floor(input[0].bitmap.height / 50) * 6);

                    const finalKeyFrames = generateInterpolatedFramesFromKeyFrames(desiredFrames * 2, baseKeyFrames, 1, 0).slice(0, desiredFrames);

                    const menacingFrameOffset = Math.round(menacingFrames[0].bitmap.width / 2);
                    for (let newFrameIndex = 0; newFrameIndex < input.length; newFrameIndex++) {
                        const iconFrame = input[newFrameIndex];
                        for (let menacingIndex = 0; menacingIndex < menacingCount; menacingIndex++) {
                            const keyFrameOffset = menacingIndex * Math.round(finalKeyFrames.length / menacingCount);
                            const keyFrame = finalKeyFrames[(newFrameIndex + keyFrameOffset) % finalKeyFrames.length];
                            const animationOffset = menacingIndex * Math.round(menacingFrames.length / menacingCount);
                            const menacingFrame = menacingFrames[(newFrameIndex + animationOffset) % menacingFrames.length];

                            iconFrame.composite(menacingFrame, keyFrame.x - menacingFrameOffset, keyFrame.y - menacingFrameOffset);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "serving": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: {
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                render: async function (parts, frames, seed) {
                    const servingBonnet = await Jimp.read(`${prefixSourceDirectory}/serving/bonnet.png`);
                    const skirtFront = await Jimp.read(`${prefixSourceDirectory}/serving/skirt.png`);

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [servingBonnet], { x: 8, y: 16, width: 32 });
                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [skirtFront], { x: 8, y: 16, width: 32 });

                    return true;
                },
            },
            [prefixRenderSteps.background]: {
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                render: async function (parts, frames, seed) {
                    const skirtBack = await Jimp.read(`${prefixSourceDirectory}/serving/skirtback.png`);

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [skirtBack], { x: 8, y: 16, width: 32 });

                    return true;
                },
            }
        }
    }),
    "holy": constructPrefixRenderer({
        canvasScale: 2.5,
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: 20,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed) {
                    const allGlowFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/holy/glows.png`);

                    compositeHeadsToAllFrames(input.slice(0, 10), parts.icon[0], parts.heads, allGlowFrames, { x: 24, y: 32, width: 32 });

                    allGlowFrames.reverse();

                    compositeHeadsToAllFrames(input.slice(10), parts.icon[0], parts.heads, allGlowFrames, { x: 24, y: 32, width: 32 });

                    return true;
                },
            })
        }
    }),
    "unholy": constructPrefixRenderer({
        canvasScale: 2.5,
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: 20,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed) {
                    const allGlowFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/unholy/glows.png`);

                    compositeHeadsToAllFrames(input.slice(0, 10), parts.icon[0], parts.heads, allGlowFrames, { x: 24, y: 32, width: 32 });

                    allGlowFrames.reverse();

                    compositeHeadsToAllFrames(input.slice(10), parts.icon[0], parts.heads, allGlowFrames, { x: 24, y: 32, width: 32 });

                    return true;
                },
            })
        }
    }),
    "contaminated": constructPrefixRenderer({
        canvasScale: 1.5,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 20,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`contaminated${seed}`);
                    let dropFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/contaminated/drip.png`), 20);

                    let dripPixels: { position: { x: number, y: number }, animationOffset: number }[] = [];
                    const eligibilityFunction = function (frame: JimpImage, x: number, y: number): boolean {
                        return frame.bitmap.data[frame.getPixelIndex(x, y) + 3] > 0 && frame.bitmap.data[frame.getPixelIndex(x, y + 1) + 3] === 0
                    }
                    parts.icon[0].scan(0, 0, parts.icon[0].bitmap.width, parts.icon[0].bitmap.height, function (x, y, idx) {
                        if (y < parts.icon[0].bitmap.height - 1) {
                            if (eligibilityFunction(parts.icon[0], x, y)) {
                                if (seedGen() > 0.8) {
                                    dripPixels.push({ position: { x, y }, animationOffset: Math.floor(seedGen() * dropFrames.length) });
                                }
                            }
                        }
                    })
                    parts.icon.forEach((frame, index) => {
                        if (index !== 0) {
                            dripPixels = dripPixels.filter((dripPixel) => {
                                return eligibilityFunction(frame, dripPixel.position.x, dripPixel.position.y);
                            })
                        }
                    })
                    const coordinateOffset = {
                        x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                        y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2)
                    }
                    for (let dripPixelIndex = 0; dripPixelIndex < dripPixels.length; dripPixelIndex++) {
                        const dripPixel = dripPixels[dripPixelIndex];
                        dripPixel.position.x += coordinateOffset.x;
                        dripPixel.position.y += coordinateOffset.y;
                    }

                    for (let newAnimationFrameIndex = 0; newAnimationFrameIndex < input.length; newAnimationFrameIndex++) {
                        const newFrame = input[newAnimationFrameIndex];
                        for (let dripIndex = 0; dripIndex < dripPixels.length; dripIndex++) {
                            const dripPixel = dripPixels[dripIndex];
                            const dripPixelAnimationFrame = dropFrames[(newAnimationFrameIndex + dripPixel.animationOffset) % dropFrames.length];
                            newFrame.composite(dripPixelAnimationFrame, dripPixel.position.x, dripPixel.position.y + 2);
                        }
                    }

                    return true;
                },
            }),
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                render: async function(parts, input, seed) {
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        strokeImage(inputFrame, 0x17f215ff, 1, false, undefined, true);
                    }

                    return true;
                },
            })
        }
    }),
    "neko": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`neko${seed}`);

                    let allCatEars = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/neko/ears.png`);

                    const catVariation = Math.floor(seedGen() * allCatEars.length);

                    let catEarImage = allCatEars[catVariation];

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [catEarImage], { x: 16, y: 24, width: 32 });

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                render: async function (parts, input, seed) {
                    let seedGen = seedrandom(`neko${seed}`);

                    let allCatTails = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/neko/tails.png`);

                    const catVariation = Math.floor(seedGen() * allCatTails.length);

                    let catTailImage = allCatTails[catVariation];

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [catTailImage], { x: 16, y: 24, width: 32 });

                    return true;
                },
            })
        }
    }),
    "phosphorescent": constructPrefixRenderer({
        canvasScale: 2,
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 5,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`phosphorescent${seed}`);
                    const smallGlowAnimation = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/phosphorescent/smallglows.png`), 5);
                    const glowAnimationCoordinateOffset = Math.floor(smallGlowAnimation[0].bitmap.width / 2);

                    let sparklePixels: { position: { x: number, y: number }, animationOffset: number }[] = [];
                    const eligibilityFunction = function (frame: JimpImage, x: number, y: number): boolean {
                        return frame.bitmap.data[frame.getPixelIndex(x, y) + 3] > 0 && (
                            frame.bitmap.data[frame.getPixelIndex(x, y + 1) + 3] === 0 ||
                            frame.bitmap.data[frame.getPixelIndex(x, y - 1) + 3] === 0 ||
                            frame.bitmap.data[frame.getPixelIndex(x + 1, y) + 3] === 0 ||
                            frame.bitmap.data[frame.getPixelIndex(x - 1, y) + 3] === 0
                        )
                    }
                    parts.icon[0].scan(0, 0, parts.icon[0].bitmap.width, parts.icon[0].bitmap.height, function (x, y, idx) {
                        if (y < parts.icon[0].bitmap.height - 1) {
                            if (eligibilityFunction(parts.icon[0], x, y)) {
                                if (seedGen() > 0.95) {
                                    sparklePixels.push({ position: { x, y }, animationOffset: Math.floor(seedGen() * smallGlowAnimation.length) });
                                }
                            }
                        }
                    })
                    parts.icon.forEach((frame, index) => {
                        if (index !== 0) {
                            sparklePixels = sparklePixels.filter((dripPixel) => {
                                return eligibilityFunction(frame, dripPixel.position.x, dripPixel.position.y);
                            })
                        }
                    })
                    const coordinateOffset = {
                        x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2) - glowAnimationCoordinateOffset,
                        y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2) - glowAnimationCoordinateOffset
                    }
                    for (let sparklePixelIndex = 0; sparklePixelIndex < sparklePixels.length; sparklePixelIndex++) {
                        const sparklePixel = sparklePixels[sparklePixelIndex];
                        sparklePixel.position.x += coordinateOffset.x;
                        sparklePixel.position.y += coordinateOffset.y;
                    }

                    for (let newAnimationFrameIndex = 0; newAnimationFrameIndex < input.length; newAnimationFrameIndex++) {
                        const newFrame = input[newAnimationFrameIndex];
                        for (let dripIndex = 0; dripIndex < sparklePixels.length; dripIndex++) {
                            const sparklePixel = sparklePixels[dripIndex];
                            const sparklePixelAnimationFrame = smallGlowAnimation[(newAnimationFrameIndex + sparklePixel.animationOffset) % smallGlowAnimation.length];
                            newFrame.composite(sparklePixelAnimationFrame, sparklePixel.position.x, sparklePixel.position.y);
                        }
                    }

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/phosphorescent/glow.png`, { x: 16, y: 24, width: 32 })[prefixRenderSteps.foreground],
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                render: async function(parts, input, seed) {
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        strokeImage(inputFrame, 0x40d2e5ff, 1, false, undefined, true);
                    }
                    return true;
                },
            })
        }
    })
} as {[key in PrefixID]?: prefixRendererDefinition};

export const prefixApplicationOrder = [
    "fake", // Turns the icon into a 'fake' PNG
    "dotted", // Gives the cube a "dot matrix" effect
    "rippling", // Adds a sine wave to the cube
    "musical", // Adds an animated music sheet to the cube
    "dotted", // Gives the cube a "dot matrix" effect

    // -------------- Special cases
    "censored", // Adds a censor bar to the cube
    "sussy", // Adds an ESP (cheater) overlay to the cube

    // -------------- Prefixes That Add Environmental Stuffs (Or just super large props)
    "orbital", // Adds 3 orbiting planets to the cube
    "endangered", // Adds a sword on a string above the cube
    "radioactive", // Adds a 'stylistic' radioactive effect to the cube

    // -------------- Prefixes That Add Particles That don't depend on the cube
    "leafy", // Adds some raining leaves to the cube
    "snowy", // Adds some raining snow to the cube
    "menacing", // Adds a jjba-style menacing effect to the cube
    "bugged", // Adds a Glitchy 'Missing Texture' Animation to the Cube
    "cursed", // Adds a spinning Pentagram beneath the Cube
    "typing", // Adds a speech bubble with a random sequence of letters to the cube

    // -------------- Prefixes That Add Particles That depend on the cube itself (are bound to parts of the cube)
    "flaming", // Makes the cube on FREAKING FIRE
    "foggy", // Adds fog to the cube
    "angry", // Adds an animated anime-esque anger icon to the cube
    "thinking", // Adds a thought bubble with a question mark to the cube
    "talkative", // Adds an animated yellow speech indicator to the cube
    "eudaemonic", // Adds an animated happy face speech bubble to the cube
    "acquiescing", // Adds a speech bubble with SIGH...
    "zammin", // Adds a speech bubble with ZAMN
    "feminine", // Adds a speech bubble with the "female" symbol inside
    "masculine", // Adds a speech bubble with the "male" symbol inside
    "annoyed", // Adds a fuzzball floating above the cube
    "brilliant", // Adds a floating light bulb to the cube
    "scientific", // Adds a sciency flask to the cube
    "dazed", // Adds 'dazed' particles around the cube (I don't know what I was thinking when I created this prefix in 2020)
    "boiled", // Adds steam coming off the cube
    "amorous", // Adds hearts around the head of the cube
    "drunken", // Adds a drunken stupor effect to the cube
    "stunned", // Adds a cartoony "seeing stars" effect to the cube
    "fearful", // Adds a fear 'sweat' animation to the cube
    "based", // Adds Flashing Eyes to the Cube
    "expensive", // Adds dollar signs to the eyes of the cube
    "lovey", // Adds Heart Eyes to the Cube
    "googly", // Adds Googly Eyes to the Cube
    "expressive", // Adds sassy eyebrows to the Cube
    "blushing", // Adds blush to the cube
    "clapping", // Adds the twitch clapping emote to the cube
    "insignificant", // Adds ULTRAKILL Gabriel-esque halo and wings to the cube
    "holy", // Adds an embellished animated decoration to the cube
    "unholy", // Adds an embellished animated decoration to the cube
    "contaminated", // Adds a dripping and outline effect to the cube
    "phosphorescent", // Adds a glow and outline effect to the cube

    // -------------- Prefixes That Add Props (Accessories that aren't bound to the cube's parts)
    "summoning", // Adds spinning cubes to the cube
    "swarming", // Adds spinning cubes to the cube
    "runic", // Adds nordic runes and an outline to the cube
    "mathematical", // Adds LCD numbers and an outline to the cube
    "onomatopoeiacal", // Adds Onomatopoeia to the cube
    "fatherly", // Adds one or two smaller versions of the cube to the cube
    "saiyan", // Makes the cube yell super loud whilst charging
    "electrified", // Adds arcing lightning to the cube
    "cucurbitaphilic", // Adds a random pumpkin to the cube
    "ailurophilic", // Adds a cat to the cube
    "conspicuous", // Adds crime scene markers to the cube
    "read", // Adds a tarot reading to the cube (swords, wands, etc.)

    // -------------- Prefixes That Add Accessories (Props that are bound to the cube's parts)
    "sacred", // Adds a Fancy Halo to the Cube
    "omniscient", // Adds an eye of providence to the Cube
    "cuffed", // Adds a handcuff around the Cube
    "sniping", // Adds a sniper rifle to the Cube
    "marvelous", // Adds a Hand holding the Cube
    "sparkly", // Adds a sparkling effect to the cube
    "muscular", // Adds disgusting muscly arms to the cube
    "leggendary", // Adds disgusting built-ass legs to the cube
    "meleagris", // Adds a turkey tail to the cube
    "collectible", // Adds a display case to the cube
    "tumbling", // Adds the evangelion folding chair to the cube
    "incarcerated", // Adds a Jail around the Cube
    "pugilistic", // Adds boxing gloves to the Cube
    "basking", // Adds sand and an umbrella to the cube
    "bladed", // Adds a sword to the cube
    "overcast", // Adds clouds around the cube
    "emburdening", // Adds a statue of Atlas holding up the cube
    "royal", // Adds a crown to the cube
    "kramped", // Adds a pair of krampus horns to the cube
    "oriental", // Adds an oriental-style roof to the cube
    "wranglin", // Adds a cowboy hat to the cube
    "sophisticated", // Adds a top hat to the cube
    "adorable", // Adds a cute little bow to the cube
    "culinary", // Adds a chef's toque to the cube
    "captain", // Adds a Team Captain hat to the cube
    "idiotic", // Adds a dunce cap to the cube
    "fuming", // Adds a set of steam coming out of the cube's "ears"
    "magical", // Adds a wizard hat to the cube
    "streaming", // Adds headphones to the cube
    "sweetened", // Adds a cherry to the top of the cube
    "trouvaille", // Adds a clover to the top of the cube
    "dovey", // Adds a dove perched on the cube
    "batty", // Adds a bat hanging from the cube NOTE: this is super gross. I don't like bats
    "jolly", // Adds a Santa hat to the cube
    "partying", // Adds a party hat to the cube
    "hardboiled", // Adds a holmes-esque detective hat to the cube
    "smoked", // Adds a GET SMOKED hat to the cube
    "blind", // Adds a blindfold to the cube
    "outlawed", // Adds a bandanna to the cube
    "serving", // Adds a french-maid-style skirt and bonnet to the cube
    "angelic", // Adds a halo to the cube
    "dandy", // Adds dandy space hair to the cube
    "beboppin", // Adds space mercenary hair to the cube
    "foolish", // Adds a jester Hat to the Cube
    "cruel", // Adds Cruelty Squad-Inspired Glasses to the Cube
    "neko", // Adds cat ears and tail to the cube
    "tentacular", // Adds moving tentacles to the cube
    "chained", // Adds moving chains to the cube
    "adduced", // Adds moving caution tape to the cube
    "roped", // Adds moving ropes to the cube
    "bushy", // Adds a Random Beard to the Cube
    "emphasized", // Adds a random amount of red arrows to the cube
    "ornamentalized", // Adds a few christmas ornaments to the cube
    "brainy", // Adds a gross brain to the cube
    "comfortable", // Adds a pillow for the cube to sit on

    // -------------- Prefixes That Are Skin-Tight (idk how to phrase this)
    "voodoo", // Adds pins and Xes to the cube
    "swag", // Adds sunglasses to the cube
    "stereoscopic", // Adds stereoscopic shades to the cube
    "sick", // Adds a face mask to the cube
    "gruesome", // Adds blood all over the cube
    "canoodled", // Adds kiss-shaped lipstick to the cube in random spots
    "hurt", // Adds bandaids to the cube in random spots
    "glinting", // Adds a minecraft enchantment-esque glint animation
    "hyaline", // Adds a sheen animation to the cube
    "frosty", // Adds frost all over the cube
    "glitchy", // Adds a Green Mask along with a particle rain inside that mask
    "rdming", // Adds an animated gravity-gun outline to the cube
    "95in", // Adds a Windows 95-esque application window to the cube
    "wanted", // Adds a wanted poster to the cube

    // -------------- Prefixes That only generate masks
    "phasing", // Adds a mask using an overengineered equation (https://www.desmos.com/calculator/mbxk8blmhp)
    "evanescent", // Adds a mask using an overengineered equation (https://www.desmos.com/calculator/mbxk8blmhp)

    // -------------- Prefixes that only apply filters
    "raving", // Hue shifts the cube every frame to create a 'rainbow' effect
    "dlc", // Turns the cube completely black

    // -------------- Attribute Effects should always be behind everything else
    "Divine", // Divine modifier for the cube
    "Slated", // Slated modifier for the cube
    "Contraband", // Contraband modifier for the cube
    "Collectors", // Collectors modifier for the cube
    "noprefix" // Placeholder prefix for "no prefix" 
] as PrefixID[];