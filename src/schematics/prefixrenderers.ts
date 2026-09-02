import { cssColorToHex, Jimp, ResizeStrategy } from "jimp";
import { config } from "../config";
import { cubeEye, cubeHead, cubeMouth, cubePartDefinition } from "../cubeparts"
import { JimpImage, JimpImgMod } from "../utils"
import { PrefixID } from "./importedschematics/prefixes"
import * as fs from 'fs-extra'
import { clampForRGB, defaultStrokeMatrix, drawLine, fillRect, generateSmallWordImage, lerpColors, loadAnimatedCubeIcon, luminanceFromColor, parseHorizontalSpriteSheet, strokeImage, strokeImageWithResize, strokeMatrix } from "../imageutils";
import { filterOtherFlagsForNeeded, filterOtherPrefixesForNeeded, getNeededFramesForPrefix, getTotalFlatCanvasPaddingForAppliedSteps, leastCommonMultiple, prefixRendererTags, prefixRenderSteps, shorthandIconDataSchema } from "./importedschematics/ccoiconsschema";
import seedrandom from "seedrandom";
import { CubeDefinition, CubeID } from "./importedschematics/cubes";
import { raritySchema } from "./importedschematics/rarities";
import { dotMatrix, fillHollowRect, gaussianBlur } from "../imageeffects";
import { turnFlagsFieldIntoFlagsArray } from "./importedschematics/cubeflagsshared";
import { flagRendererSchema } from "./flagrenderers";

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

function compositeHeadsToAllFramesWithoutScaling(targetFrames: JimpImage[], cubeIconFrame: JimpImage, heads: cubeHead[][], animation: JimpImage[], coordinateOffset: { x: number, y: number }, coordinateOffsetFromRight: boolean) {
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
            targetFrame.composite(animationFrame, cubeHead.x + (coordinateOffsetFromRight ? cubeHead.width : 0) + coordinateOffset.x, cubeHead.y + coordinateOffset.y);
        }
    }
}

function compositeMouthsToAllFrames(targetFrames: JimpImage[], cubeIconFrame: JimpImage, mouths: cubeMouth[][], animation: JimpImage[], expectedMouthData: cubeMouth) {
    compositeHeadsToAllFrames(targetFrames, cubeIconFrame, mouths, animation, expectedMouthData);
}

function compositeMouthsToAllFramesWithoutScaling(targetFrames: JimpImage[], cubeIconFrame: JimpImage, mouths: cubeHead[][], animation: JimpImage[], coordinateOffset: { x: number, y: number }, coordinateOffsetFromRight: boolean) {
    compositeHeadsToAllFramesWithoutScaling(targetFrames, cubeIconFrame, mouths, animation, coordinateOffset, coordinateOffsetFromRight);
}


function compositeEyesToAllFrames(targetFrames: JimpImage[], cubeIconFrame: JimpImage, eyes: cubeEye[][], animation: JimpImage[], customCriteria: (eye: cubeEye, index: number) => boolean = () => true) {
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
            if (customCriteria(eye, eyeIndex)) {
                targetFrame.composite(animationFrame, eye.x - Math.floor(animationFrame.bitmap.width / 2) + coordinateOffset.x, eye.y - Math.floor(animationFrame.bitmap.height / 2) + coordinateOffset.y)
            }
        }
    }
}

export type prefixRendererDefinition = {
    renderSteps: { [key in prefixRenderSteps]?: prefixRendererStepDefinition<any> }
}

export function constructPrefixRenderer(data: Partial<prefixRendererDefinition>): prefixRendererDefinition {
    return {
        renderSteps: data.renderSteps ?? {}
    }
}

export type prefixRNGPredefinition<T> = {
    RNGString: string,
    get: (RNG: () => number) => T
}

export type prefixRNGDeclaration = { [key: string]: prefixRNGPredefinition<any> };
export type parsedPrefixRNGDeclaration<T extends prefixRNGDeclaration> = { [key in keyof T]: ReturnType<T[key]['get']> };

export function turnPrefixRNGDeclarationIntoValues<T extends prefixRNGDeclaration>(RNGDeclaration: T, seed: number) {
    const iterable = Object.keys(RNGDeclaration) as (keyof T)[];
    return iterable.reduce((prev, curr) => {
        const RNG = seedrandom(`${RNGDeclaration[curr].RNGString}${seed}`);
        prev[curr] = RNGDeclaration[curr].get(RNG);
        return prev;
    }, {} as parsedPrefixRNGDeclaration<T>);
}

export type prefixRendererStepDefinition<T extends prefixRNGDeclaration> = {
    canvasScale: number,
    flatCanvasPadding: number,
    tags: prefixRendererTags[],
    dontRenderWithPrefixesPresent: PrefixID[],
    affectedByOtherPrefixes: PrefixID[],
    predefinedRNG: T,
    render: (parts: cubePartDefinition, input: JimpImage[], seed: number, cubeData: CubeDefinition, otherPrefixes: PrefixID[], parsedRNG: parsedPrefixRNGDeclaration<T>) => Promise<true>,
    frames: number
}

export function constructPrefixRendererStep<T extends prefixRNGDeclaration>(data: Partial<prefixRendererStepDefinition<T>>): prefixRendererStepDefinition<T> {
    return {
        canvasScale: data.canvasScale ?? 1,
        flatCanvasPadding: data.flatCanvasPadding ?? 0,
        dontRenderWithPrefixesPresent: data.dontRenderWithPrefixesPresent ?? [],
        render: data.render ?? (async (parts, input, seed, cubeData, otherPrefixes, parsedRNG) => {
            return true;
        }),
        affectedByOtherPrefixes: data.affectedByOtherPrefixes ?? [],
        predefinedRNG: data.predefinedRNG ?? ({} as T),
        tags: data.tags ?? [],
        frames: data.frames ?? 1
    }
}

const prefixSourceDirectory = `${config.sourceImagesDirectory}/prefixes`;

export function generateBlankFrames(resolution: number, frameCount: number) {
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

export function somePrefixInListHasTag(prefixList: PrefixID[], steps: prefixRenderSteps[], tag: prefixRendererTags) {
    return prefixList.some(otherPrefix => {
        const otherRenderer = prefixRenderers[otherPrefix];
        if (!otherRenderer) return false;
        return steps.some(renderStep => {
            return otherRenderer.renderSteps[renderStep] && otherRenderer.renderSteps[renderStep].tags.includes(tag);
        })
    })
}

export async function renderPrefixSteps(mainPrefix: PrefixID, otherPrefixes: PrefixID[], mainStep: prefixRenderSteps, otherSteps: prefixRenderSteps[], cubeID: CubeID, cubeParts: cubePartDefinition, prefixSeed: number, shorthandSchema: shorthandIconDataSchema, cubeData: CubeDefinition, iconFlags: number, inputFrames?: JimpImage[]): Promise<JimpImage[]> {
    const mainRenderer = prefixRenderers[mainPrefix] ?? constructPrefixRenderer({});
    let prefixFrames: JimpImage[];
    const usingOtherPrefixes = filterOtherPrefixesForNeeded(mainPrefix, mainStep, otherPrefixes, otherSteps, shorthandSchema, !!inputFrames);
    const usingOtherFlags = filterOtherFlagsForNeeded(turnFlagsFieldIntoFlagsArray(iconFlags), otherSteps);
    const requiredFrames = getNeededFramesForPrefix(mainPrefix, mainStep, usingOtherPrefixes, otherSteps, cubeID, shorthandSchema);
    const flatPaddingForInput = getTotalFlatCanvasPaddingForAppliedSteps(usingOtherPrefixes, usingOtherFlags, otherSteps, shorthandSchema);
    if (!inputFrames) {
        if (!mainRenderer.renderSteps[mainStep]) return [];
        const mainStepDefinition = mainRenderer.renderSteps[mainStep];
        prefixFrames = generateBlankFrames((cubeParts.icon[0].bitmap.width * mainStepDefinition.canvasScale) + ((mainStepDefinition.flatCanvasPadding + flatPaddingForInput) * 2), requiredFrames);
        if (!mainStepDefinition.dontRenderWithPrefixesPresent.some(prefix => otherPrefixes.includes(prefix))) await mainStepDefinition.render(cubeParts, prefixFrames, prefixSeed, cubeData, otherPrefixes, turnPrefixRNGDeclarationIntoValues(mainStepDefinition.predefinedRNG, prefixSeed));
    } else {
        prefixFrames = [];  
        for (let generatedFrameIndex = 0; generatedFrameIndex < requiredFrames; generatedFrameIndex++) {
            const inputFrameIndex = generatedFrameIndex % inputFrames.length;
            if (flatPaddingForInput > 0) {
                const constructedFrame = new Jimp({ width: inputFrames[inputFrameIndex].bitmap.width + (flatPaddingForInput * 2), height: inputFrames[inputFrameIndex].bitmap.height + (flatPaddingForInput * 2), color: 0x00000000 });
                constructedFrame.composite(inputFrames[inputFrameIndex], flatPaddingForInput, flatPaddingForInput);
                prefixFrames.push(constructedFrame);
            } else {
                prefixFrames.push(inputFrames[inputFrameIndex].clone());
            }
        }
    }

    for (let otherPrefixIndex = 0; otherPrefixIndex < usingOtherPrefixes.length; otherPrefixIndex++) {
        const otherPrefixID = usingOtherPrefixes[otherPrefixIndex];
        const otherPrefixRenderer = prefixRenderers[otherPrefixID];
        if (otherPrefixRenderer) {
            for (let otherStepIndex = 0; otherStepIndex < otherSteps.length; otherStepIndex++) {
                const otherStep = otherSteps[otherStepIndex];
                if (otherPrefixRenderer.renderSteps[otherStep]) {
                    const otherStepDefinition = otherPrefixRenderer.renderSteps[otherStep];
                    if (!otherStepDefinition.dontRenderWithPrefixesPresent.some(prefix => otherPrefixes.includes(prefix))) await otherStepDefinition.render(cubeParts, prefixFrames, prefixSeed, cubeData, otherPrefixes, turnPrefixRNGDeclarationIntoValues(otherStepDefinition.predefinedRNG, prefixSeed));
                }
            }
        } 
    }

    for (let otherFlagIndex = 0; otherFlagIndex < usingOtherFlags.length; otherFlagIndex++) {
        const otherFlag = usingOtherFlags[otherFlagIndex];
        for (let otherStepIndex = 0; otherStepIndex < otherSteps.length; otherStepIndex++) {
            const otherStep = otherSteps[otherStepIndex];
            const renderStep = flagRendererSchema[otherFlag].renderSteps[otherStep];
            console.log("Rendered Flag", otherFlag);
            if (renderStep) await renderStep.render(cubeParts, prefixFrames, 0, cubeData, [], {});
        }
    }

    return prefixFrames;
}

function constructFrontBackPrefixRenderer<T extends prefixRNGDeclaration>(data: {
    backImagePath: string,
    frontImagePath: string,
    predefinedRNG?: T,
    tags?: prefixRendererTags[],
    frames?: number, 
    canvasModifiers?: { scale?: number, padding?: number },
    renderImage: (seed: number, layerAnimation: JimpImage[], inputFrames: JimpImage[], parts: cubePartDefinition, parsedRNG: parsedPrefixRNGDeclaration<T>) => void
}) {
    const frames = data.frames ?? 1;
    const sharedRendererProperties = {
        canvasScale: data.canvasModifiers?.scale ?? 1,
        flatCanvasPadding: data.canvasModifiers?.padding ?? 0,
        frames,
        tags: data.tags ?? [],
        predefinedRNG: (data.predefinedRNG ?? {}) as T,
    } as const;
    return {
        [prefixRenderSteps.foreground]: constructPrefixRendererStep({
            ...sharedRendererProperties,
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                let layerImage = frames > 1 ? await loadAnimatedCubeIcon(data.frontImagePath) : [await Jimp.read(data.frontImagePath)];
                data.renderImage(seed, layerImage, input, parts, parsedRNG);
                return true;
            },
        }),
        [prefixRenderSteps.background]: constructPrefixRendererStep({
            ...sharedRendererProperties,
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                let layerImage = frames > 1 ? await loadAnimatedCubeIcon(data.backImagePath) : [await Jimp.read(data.backImagePath)];
                data.renderImage(seed, layerImage, input, parts, parsedRNG);
                return true;
            },
        })
    }
}

function constructBasicHatPrefixRendererStep(hatIcon: string, expectedHead: cubeHead, scale: number): {[prefixRenderSteps.foreground]: prefixRendererStepDefinition<prefixRNGDeclaration>} {
    return {
        [prefixRenderSteps.foreground]: constructPrefixRendererStep({
            canvasScale: scale,
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

/**
 * Brute-Force generate distanced positions
 * @param maxPositions The number of positions the function needs to generate
 * @param minDistance The minimum distance between each position
 * @param seedGen A function that returns a random number
 */
function generateSparsePositions(maxPositions: number, minDistance: number, seedGen: () => number, fieldSize: { width: number, height: number }): { x: number, y: number }[] {
    let coordArray: {x: number, y: number}[] = [];

    let failsafe = 0;
    let currentCoordinateIndex = 0;
    const failsafeMax = 9;
    while (coordArray.length < maxPositions && failsafe < failsafeMax) {
        const newPositionRotation = 6.28319 * seedGen(); // Magic Number here is 360 degrees in radians.
        const newPositionDistance = minDistance + (minDistance * seedGen());
        const currentPosition = {
            x: coordArray[currentCoordinateIndex]?.x ?? Math.round(fieldSize.width / 2),
            y: coordArray[currentCoordinateIndex]?.y ?? Math.round(fieldSize.height / 2)
        }
        const newPosition: { x: number, y: number } = {
            x: currentPosition.x + (Math.cos(newPositionRotation) * newPositionDistance),
            y: currentPosition.y + (Math.sin(newPositionRotation) * newPositionDistance)
        }
        failsafe++;
        if (newPosition.x < fieldSize.width && newPosition.y < fieldSize.height && newPosition.x > 0 && newPosition.y > 0 && !coordArray.find(coordinate => Math.sqrt(((coordinate.x - newPosition.x) ** 2) + ((coordinate.y - newPosition.y) ** 2)) < minDistance)) {
            coordArray.splice(currentCoordinateIndex, 0, newPosition);
            currentCoordinateIndex++;
        } else if (failsafe === failsafeMax && currentCoordinateIndex > 0) {
            failsafe = 0;
            currentCoordinateIndex--;
        }
    }

    if (failsafe == failsafeMax) {
        console.log("---- Failsafe hit :(")
    }

    console.log(coordArray)
    return coordArray;
}

function generateProtrudingLines(inputFrames: JimpImage[], iconFrames: JimpImage[], RNG: () => number, lineArgs: Partial<{ minCount: number, maxCount: number, minLength: number, maxLength: number }>) {
    const returnLines: {
        start: { x: number, y: number },
        end: { x: number, y: number }
    }[][] = [];
    if (iconFrames.length === 0) return returnLines;

    const centerPoints: { x: number, y: number }[] = [];
    for (let iconFrameIndex = 0; iconFrameIndex < iconFrames.length; iconFrameIndex++) {
        const iconFrame = iconFrames[iconFrameIndex];
        const frameCenterPoint = {
            x: 0,
            y: 0
        }
        let framePixelDivisor = 0;

        iconFrame.scan((x, y, idx) => {
            if (iconFrame.bitmap.data[idx + 3] > 0) {
                frameCenterPoint.x += x;
                frameCenterPoint.y += y;
                framePixelDivisor++;
            }
        });

        frameCenterPoint.x = Math.floor(frameCenterPoint.x / framePixelDivisor);
        frameCenterPoint.y = Math.floor(frameCenterPoint.y / framePixelDivisor);

        centerPoints.push(frameCenterPoint);
    }

    const maxLineCount = lineArgs.maxCount ?? 1;
    const minLineCount = lineArgs.minCount ?? maxLineCount;
    const lineCount = Math.floor(RNG() * (maxLineCount - minLineCount)) + minLineCount;
    const constructedLines: { angle: number }[] = [];
    while (constructedLines.length < lineCount) {
        constructedLines.push({
            angle: RNG() * 2 * Math.PI
        });
    }

    const minLineLength = lineArgs.minLength ?? 2;
    const maxLineLength = lineArgs.maxLength ?? (minLineLength + 8);
    const referenceFrame = iconFrames[0];
    const referenceLines: { start: { x: number, y: number }, end: { x: number, y: number } }[] = [];
    const referenceCenterPoint = centerPoints[0];
    for (let constructedLineIndex = 0; constructedLineIndex < constructedLines.length; constructedLineIndex++) {
        const constructedLine = constructedLines[constructedLineIndex];
        const currentLinePoint = structuredClone(referenceCenterPoint);
        const additions = {
            x: Math.cos(constructedLine.angle),
            y: Math.sin(constructedLine.angle)
        }
        while ((referenceFrame.getPixelColor(currentLinePoint.x, currentLinePoint.y) & 255) !== 0) {
            currentLinePoint.x += additions.x;
            currentLinePoint.y += additions.y;

            if (currentLinePoint.x >= referenceFrame.bitmap.width) {
                currentLinePoint.x = referenceFrame.bitmap.width - 1;
                break;
            }

            if (currentLinePoint.x < 0) {
                currentLinePoint.x = 0;
                break;
            }

            if (currentLinePoint.y >= referenceFrame.bitmap.height) {
                currentLinePoint.y = referenceFrame.bitmap.height - 1;
                break;
            }

            if (currentLinePoint.y < 0) {
                currentLinePoint.y = 0;
                break;
            }
        }
        const lineLength = Math.floor(RNG() * (maxLineLength - minLineLength)) + minLineLength;

        referenceLines.push({
            start: {
                x: currentLinePoint.x - (referenceCenterPoint.x + additions.x),
                y: currentLinePoint.y - (referenceCenterPoint.y + additions.y)
            },
            end: {
                x: currentLinePoint.x + (additions.x * (lineLength - 1)) - referenceCenterPoint.x,
                y: currentLinePoint.y + (additions.y * (lineLength - 1)) - referenceCenterPoint.y
            }
        })
    }

    const inputIconOffset = {
        x: (inputFrames[0].bitmap.width - iconFrames[0].bitmap.width) / 2,
        y: (inputFrames[0].bitmap.width - iconFrames[0].bitmap.width) / 2
    }

    for (let centerPointIndex = 0; centerPointIndex < centerPoints.length; centerPointIndex++) {
        const centerPointThisFrame = centerPoints[centerPointIndex];
        
        returnLines.push(structuredClone(referenceLines).map(line => {
            return {
                start: {
                    x: Math.floor(line.start.x + centerPointThisFrame.x + inputIconOffset.x),
                    y: Math.floor(line.start.y + centerPointThisFrame.y + inputIconOffset.y)
                },
                end: {
                    x: Math.floor(line.end.x + centerPointThisFrame.x + inputIconOffset.x),
                    y: Math.floor(line.end.y + centerPointThisFrame.y + inputIconOffset.y)
                }
            };
        }));
    }
    
    return returnLines;
}

function getRopePositionYFromX(currentX: number, ropeStartX: number, ropeEndX: number, rope: { start: number, end: number }) {
    const xProgress = (currentX - ropeStartX) / (ropeEndX - ropeStartX);
    return (xProgress * (rope.end - rope.start)) + rope.start;
}

function compositeRopeSlidingAnimation(inputFrames: JimpImage[], cubeIcon: JimpImage[], RNG: () => number, ropeConfig: { image: JimpImage, maxRopeCount?: number, minRopeCount?: number, startEndPadding?: number, maskMatrix?: strokeMatrix }) {
    const ropeStartEndPadding = ropeConfig.startEndPadding ?? 1;
    const ropeStartX = Math.floor((inputFrames[0].bitmap.width - cubeIcon[0].bitmap.width) / 2) - ropeStartEndPadding;
    const ropeEndX = ropeStartX + cubeIcon[0].bitmap.width + ((ropeStartEndPadding * 2) - 1);
    const generatingRopes: {
        start: number,
        end: number,
        animationOffset: number,
        direction: number
    }[] = [];

    const minRopeCount = ropeConfig.minRopeCount ?? 2;
    const maxRopeCount = ropeConfig.maxRopeCount ?? 4;
    const ropeImage = ropeConfig.image;
    const halfRopeImageHeight = Math.floor((ropeImage.bitmap.height - 1) / 2);
    const ropeCount = Math.floor(RNG() * (maxRopeCount - minRopeCount)) + minRopeCount;

    const endPositionVariance = Math.ceil(cubeIcon[0].bitmap.height * 0.2);
    while (generatingRopes.length < ropeCount) {
        const startPos = Math.floor((inputFrames[0].bitmap.width - cubeIcon[0].bitmap.width) / 2) + Math.floor(RNG() * cubeIcon[0].bitmap.height);
        generatingRopes.push({
            start: startPos,
            end: startPos + Math.floor(RNG() * endPositionVariance),
            animationOffset: RNG(),
            direction: RNG() > 0.5 ? 1 : -1
        })
    }

    
    const ropeMaskFrames: JimpImage[] = [];
    const inputIconOffset = {
        x: Math.floor((inputFrames[0].bitmap.width - cubeIcon[0].bitmap.width) / 2),
        y: Math.floor((inputFrames[0].bitmap.height - cubeIcon[0].bitmap.height) / 2),
    }
    for (let iconFrameIndex = 0; iconFrameIndex < inputFrames.length; iconFrameIndex++) {
        const cubeIconFrame = cubeIcon[iconFrameIndex % cubeIcon.length];
        const generatedMaskImage = new Jimp({ width: inputFrames[0].bitmap.width, height: inputFrames[0].bitmap.height, color: 0x00000000 });
        for (let generatedRopeIndex = 0; generatedRopeIndex < generatingRopes.length; generatedRopeIndex++) {
            const generatedRope = generatingRopes[generatedRopeIndex];
            for (let xIndex = ropeStartX; xIndex < ropeEndX; xIndex++) {
                const inputPixelPosition = {
                    x: xIndex,
                    y: getRopePositionYFromX(xIndex, ropeStartX, ropeEndX, generatedRope)
                }
                if ((cubeIconFrame.getPixelColor(inputPixelPosition.x - inputIconOffset.x, inputPixelPosition.y - inputIconOffset.y) & 255) !== 0) {
                    generatedMaskImage.setPixelColor(0xffffffff, inputPixelPosition.x, inputPixelPosition.y);
                }
            }
        }
        strokeImage(generatedMaskImage, 0xffffffff, halfRopeImageHeight, false, ropeConfig.maskMatrix, true);
        ropeMaskFrames.push(generatedMaskImage);
    }

    const desiredFrames = inputFrames.length;

    for (let inputFrameIndex = 0; inputFrameIndex < inputFrames.length; inputFrameIndex++) {
        const inputFrame = inputFrames[inputFrameIndex];
    
        for (let ropeIndex = 0; ropeIndex < generatingRopes.length; ropeIndex++) {
            const currentRope = generatingRopes[ropeIndex];
            const animationProgress = (currentRope.direction * (inputFrameIndex / desiredFrames)) + currentRope.animationOffset;
            for (let xIndex = 0; xIndex < inputFrame.bitmap.width; xIndex++) {
                const inputPixelPosition = {
                    x: xIndex,
                    y: getRopePositionYFromX(xIndex, ropeStartX, ropeEndX, currentRope) - halfRopeImageHeight
                }
                const ropeSourceX = (xIndex + (ropeImage.bitmap.width * 2) + Math.round(ropeImage.bitmap.width * animationProgress)) % ropeImage.bitmap.width;
                for (let yIndex = 0; yIndex < ropeImage.bitmap.height; yIndex++) {
                    if ((inputFrame.getPixelColor(inputPixelPosition.x, inputPixelPosition.y + yIndex) & 255) === 0) inputFrame.setPixelColor(ropeImage.getPixelColor(ropeSourceX, yIndex), inputPixelPosition.x, inputPixelPosition.y + yIndex);
                }
            }
        }

        inputFrame.mask(ropeMaskFrames[inputFrameIndex % ropeMaskFrames.length]);
    }
}

const prefixRendererConsts = {
    flaming: {
        outlineColor: 0xff5722ff,
        fireColors: [
            [], // Normal
            [
                { apply: "hue", params: [150] }, // Frost Blue
                { apply: "lighten", params: [30] }
            ],
            [
                { apply: "hue", params: [-138] }, // Dark Purple
                { apply: "darken", params: [30] }
            ]
        ] as JimpImgMod[][],
        flameTypeRNG: {
            RNGString: "flameType",
            get: function (RNG: () => number) {
                if (RNG() > 0.9) {
                    return RNG() > 0.5 ? 1 : 2;
                } else {
                    return 0;
                }
            }
        }
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
            flatCanvasPadding: 4,
            render: async function (parts, input, seed) {
                let desiredFrames = 30;
                const maxSinMovement = 2;

                function yOffset(x: number, frame: number) {
                    return Math.round(Math.sin((x - ((frame / desiredFrames) * (Math.PI * 2 * maxSinMovement))) / (maxSinMovement / 2)) * maxSinMovement)
                }

                for (let outputFrameIndex = 0; outputFrameIndex < input.length; outputFrameIndex++) {
                    const currentIconFrame = input[outputFrameIndex];
                    const currentIconFrameClone = currentIconFrame.clone();
                    const sinWaveFrameIdx = outputFrameIndex % desiredFrames;

                    for (let iconFrameXPosition = 0; iconFrameXPosition < currentIconFrame.bitmap.width; iconFrameXPosition++) {
                        const iconFrameYOffset = yOffset(iconFrameXPosition, sinWaveFrameIdx);
                        for (let iconFrameYPosition = 0; iconFrameYPosition < currentIconFrame.bitmap.height; iconFrameYPosition++) {
                            // console.log(currentIconFrame.getPixelColor(iconFrameXPosition, iconFrameYPosition), iconFrameXPosition, iconFrameYPosition)
                            currentIconFrame.setPixelColor(currentIconFrameClone.getPixelColor(iconFrameXPosition, iconFrameYPosition), iconFrameXPosition + maxSinMovement, iconFrameYPosition + iconFrameYOffset + maxSinMovement)
                        }
                    }
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
    },
    frosty: {
        outlineWidth: 1,
        possibleOutlines: [
            0x2bc2daff,
            0x8cdeeaff,
            0x197f8fff
        ]
    },
    neko: {
        predefinedRNG: {
            nekoVariation: {
                RNGString: 'catvariation',
                get(RNG: () => number) {
                    return Math.floor(RNG() * 4);
                },
            }
        }
    },
    onomatopoeiacal: {
        possibleOnomatos: [
            "BANG!",
            "POW!",
            "CRASH!",
            "WHAM!",
            "POP!",
            "WHOOSH!",
            "SQUELCH!",
            "BIFF!",
            "BAP!",
            "BOP!",
            "BRAAAP!",
            "!!!",
            "GROAN...",
            "...",
            "!?",
            "SCREECH!",
            "SCREAM!",
            "SCHLUCK?"
        ],
        onomatoColors: 12
    },
    amorous: {
        frames: 15,
        hueShifts: [0, 0, 0, 0, 0, 77, -159, -86],
        offsetGetter(RNG: () => number) {
            return Math.floor(RNG() * prefixRendererConsts.amorous.frames);
        },
        heartHueShiftRNG: {
            RNGString: `hearthueshift`,
            get(RNG: () => number) {
                return Math.floor(RNG() * prefixRendererConsts.amorous.hueShifts.length);
            },
        }
    },
    dazed: {
        frames: 15,
        rotationGetter(RNG: () => number) {
            return RNG() > 0.5 ? 0 : 180;
        },
        offsetGetter(RNG: () => number) {
            return Math.floor(RNG() * prefixRendererConsts.dazed.frames);
        }
    },
    boiled: {
        frames: 10,
        offsetGetter(RNG: () => number) {
            return Math.floor(RNG() * prefixRendererConsts.boiled.frames);
        }
    },
    drunken: {
        frames: 15,
        offsetGetter(RNG: () => number) {
            return Math.floor(RNG() * prefixRendererConsts.drunken.frames);
        }
    },
    partying: {
        embellishmentVariants: 4,
        stripeVariants: 4,
        topperVariants: 4
    },
    expressive: {
        eyebrowCount: 5,
        eyebrowColors: [
            0x6e5942ff,
            0x1f1f1fff,
            0x726b23ff,
            0xab5429ff
        ]
    },
    thinking: {
        thinkingFrames: 5
    },
    radioactive: {
        desiredFrames: 15,
        radioactivePadding: 6,
        radioactiveColor: 0x05f20aff,
        radioactiveStrokeColor: 0x16d71aff,
        animationDensity: 1,
        animationPadding: 1
    },
    sparkly: {
        frames: 30
    },
    rdming: {
        possibleGravGunColors: [
            0xd829ffff,
            0x42cbf5ff,
            0xff2966ff,
            0xffad29ff
        ],
        animationPadding: 2
    },
    fuming: {
        sharedLayerAttributes: {
            frames: 5,
            canvasScale: 2,
        }
    },
    dlc: {
        applicationStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex];
                    inputFrame.scan((x, y, idx) => {
                        if ((inputFrame.bitmap.data[idx + 3] & 255) !== 0) {
                            inputFrame.bitmap.data[idx] = 0;
                            inputFrame.bitmap.data[idx + 1] = 0;
                            inputFrame.bitmap.data[idx + 2] = 0;
                        }
                    })
                }

                return true;
            },
        })
    },
    dotted: {
        applicationStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                const radius = 3;
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex].clone();
                    inputFrame.resize({ w: inputFrame.bitmap.width * 2 * radius, h: inputFrame.bitmap.height * 2 * radius, mode: ResizeStrategy.NEAREST_NEIGHBOR });
                    input[inputFrameIndex] = dotMatrix(inputFrame, radius * 2)
                }

                return true;
            },
        })
    },
    streaming: {
        predefinedRNG: {
            headphoneProps: {
                RNGString: `streamingheadphones`,
                get(RNG: () => number) {
                    const variant = Math.floor(RNG() * 2);
                    const hue = (variant === 1) ? universalPrefixRNGs.hueRotation.get(RNG) : 0;
                    return {
                        variant,
                        hue
                    }
                },
            },
            musicProps: {
                RNGString: `streamingmusic`,
                get(RNG: () => number) {
                    const using = RNG() > 0.9;
                    const hue = (using) ? universalPrefixRNGs.hueRotation.get(RNG) : 0;
                    const notes = using ? [Math.floor(RNG() * 3), Math.floor(RNG() * 3), Math.floor(RNG() * 3)] : [];
                    return {
                        using,
                        hue,
                        notes
                    }
                }
            }
        }
    },
    blurry: {
        renderStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex];
                    input[inputFrameIndex] = await gaussianBlur(inputFrame, 4);
                }

                return true;
            },
        })
    },
    obfuscating: {
        renderStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                const maxVariance = 6;
                const halfVariance = maxVariance / 2;
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex];
                    const inputClone = inputFrame.clone();
                    inputFrame.scan((x, y, idx) => {
                        let begottenX = Math.floor((Math.random() * maxVariance) - halfVariance);
                        let begottenY = Math.floor((Math.random() * maxVariance) - halfVariance);
                        inputFrame.setPixelColor(inputClone.getPixelColor(begottenX + x, begottenY + y), x, y);
                    })
                }

                return true;
            },
        })
    },
    inverted: {
        renderStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex];
                    inputFrame.scan((x, y, idx) => {
                        inputFrame.bitmap.data[idx + 0] = 255 - inputFrame.bitmap.data[idx + 0];
                        inputFrame.bitmap.data[idx + 1] = 255 - inputFrame.bitmap.data[idx + 1];
                        inputFrame.bitmap.data[idx + 2] = 255 - inputFrame.bitmap.data[idx + 2];
                    })
                }

                return true;
            },
        })
    },
    broken: {
        renderStep: constructPrefixRendererStep({
            tags: [
                prefixRendererTags.needsIcon
            ],
            flatCanvasPadding: 4,
            render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                const brokenImage = await Jimp.read(`${prefixSourceDirectory}/broken/broken.png`);
                const brokenRectangleDistanceFromEdges = 4;
                for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                    const inputFrame = input[inputFrameIndex];
                    const inputClone = new Jimp({ width: inputFrame.bitmap.width, height: inputFrame.bitmap.height, color: 0x00000000 });

                    fillHollowRect(inputClone, (brokenRectangleDistanceFromEdges + 1), (brokenRectangleDistanceFromEdges + 1), inputFrame.bitmap.width - (brokenRectangleDistanceFromEdges * 2), inputFrame.bitmap.height - (brokenRectangleDistanceFromEdges * 2), 0x848284ff);
                    fillHollowRect(inputClone, brokenRectangleDistanceFromEdges, brokenRectangleDistanceFromEdges, inputFrame.bitmap.width - (brokenRectangleDistanceFromEdges * 2), inputFrame.bitmap.height - (brokenRectangleDistanceFromEdges * 2), 0xf5f6fdff);
                    inputClone.composite(brokenImage, (brokenRectangleDistanceFromEdges + 3), (brokenRectangleDistanceFromEdges + 3));

                    input[inputFrameIndex] = inputClone;
                }

                return true;
            },
        })
    },
    roaring: {
        floatAmplitude: 4,
        frames: 30,
        floatDistance: 30,
        trailCount: 5
    },
    marbleized: {
        pedestalPalette: {
            topRim: 0xecebe7ff,
            frontFace: 0xa69e9aff,
            frontRim: 0xcbc6c1ff,
            sideFace: 0x827c79ff,
            bottomRim: 0x54504eff
        },
        pedestalSize: 8,
        marbleizedShader: function(marbleImage: JimpImage, inputImage: JimpImage, addedOffset: number = 0) {
            const shadingImage = new Jimp({ width: inputImage.bitmap.width, height: inputImage.bitmap.height, color: 0x00000000 });
            const channelLimit = 0.9 * 255;

            inputImage.scan((x, y, idx) => {
                if (inputImage.bitmap.data[idx + 3] > 0) {
                    shadingImage.bitmap.data[idx + 3] = clampForRGB(Math.floor(channelLimit * (1 - luminanceFromColor(inputImage.getPixelColor(x, y)))));
                    inputImage.setPixelColor(marbleImage.getPixelColor((x + addedOffset) % marbleImage.bitmap.width, (y + addedOffset) % marbleImage.bitmap.height), x, y);
                }
            });

            inputImage.composite(shadingImage);
        }
    },
    addicted: {
        minLength: 2,
        maxLength: 6,
        palettes: [
            {
                ember: 0xd86c3cff,
                shaft: 0xd2d2d2ff,
                butt: 0xe0b353ff
            }
        ]
    }
} as const;

const universalPrefixRNGs = {
    hueRotation: {
        RNGString: "hue",
        get: function (RNG: () => number) {
            const hueSubdivisions = 15;
            return Math.floor((360 / hueSubdivisions) * RNG()) * hueSubdivisions;
        }
    },
    normalizedScalar: {
        RNGString: "scalar",
        get: function (RNG: () => number) {
            const scalarSubdivisions = 25;
            return Math.floor(RNG() * scalarSubdivisions) / scalarSubdivisions;
        }
    }
}

export const prefixRenderers = {
    "sacred": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 3,
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                render: async function (parts, frames, seed) {
                    const sacredHalo = await Jimp.read(`${prefixSourceDirectory}/sacred/halo.png`);

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [sacredHalo], { x: 16, y: 35, width: 32 });

                    return true;
                },
            })
        }
    }),
    "flaming": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 3,
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    flameType: prefixRendererConsts.flaming.flameTypeRNG
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let flamingFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/flaming/fire.png`);

                    flamingFrames.forEach(frame => {
                        frame.color(prefixRendererConsts.flaming.fireColors[parsedRNG.flameType]);
                    })

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, flamingFrames, { x: 16, y: 38, width: 32 });

                    return true;
                },
            }),
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                frames: 1,
                tags: [
                    prefixRendererTags.isSeeded
                ],
                flatCanvasPadding: 2,
                predefinedRNG: {
                    flameType: prefixRendererConsts.flaming.flameTypeRNG
                },
                render: async function (parts, frames, seed, cubeData, otherPrefixes, parsedRNG) {
                    let flamingOutlineImage = new Jimp({
                        width: 1,
                        height: 1,
                        color: prefixRendererConsts.flaming.outlineColor
                    });
                    flamingOutlineImage.color(prefixRendererConsts.flaming.fireColors[parsedRNG.flameType]);

                    const outlineColor = flamingOutlineImage.getPixelColor(0, 0);
                    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                        const frame = frames[frameIndex];
                        strokeImage(frame, outlineColor, 1, false, defaultStrokeMatrix, true);
                    }

                    return true;
                },
            }),
            [prefixRenderSteps.applyToForeground]: constructPrefixRendererStep({
                frames: 1,
                flatCanvasPadding: 2,
                tags: [
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: {
                    flameType: prefixRendererConsts.flaming.flameTypeRNG
                },
                render: async function (parts, frames, seed, cubeData, otherPrefixes, parsedRNG) {
                    let flamingOutlineImage = new Jimp({
                        width: 1,
                        height: 1,
                        color: prefixRendererConsts.flaming.outlineColor
                    });
                    flamingOutlineImage.color(prefixRendererConsts.flaming.fireColors[parsedRNG.flameType]);

                    const outlineColor = flamingOutlineImage.getPixelColor(0, 0);
                    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
                        const frame = frames[frameIndex];
                        strokeImage(frame, outlineColor, 1, false, defaultStrokeMatrix, true);
                    }

                    return true;
                }
            })
        }
    }),
    "bugged": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2,
                frames: 5,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    const buggedAnimation = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/bugged/source.png`);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, buggedAnimation, { x: 8, y: 16, width: 32 });
                    return true;
                }
            })
        }
    }),
    "based": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1,
                flatCanvasPadding: 5,
                frames: 5,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsEyes
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let eyeAnimation = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/based/source.png`);
                    eyeAnimation.forEach(frame => {
                        frame.color([
                            { apply: "hue", params: [parsedRNG.hueRotation] }
                        ]);
                    });

                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, eyeAnimation);

                    return true;
                },
            })
        }
    }),
    "glitchy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 10,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsAccents,
                    prefixRendererTags.granularSeed
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1.5,
                frames: 1,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsMouths
                ],
                predefinedRNG: {
                    beardType: {
                        RNGString: `beard`,
                        get(RNG) {
                            return Math.floor(RNG() * 6);
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let seededBeardImage = await Jimp.read(`${prefixSourceDirectory}/bushy/${parsedRNG.beardType}.png`);
                    compositeMouthsToAllFrames(input, parts.icon[0], parts.mouths, [seededBeardImage], { x: 16, y: 27, width: 4 });
                    
                    return true;
                },
            })
        }
    }),
    "leafy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed,
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
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/cruel/back.png`,
                frontImagePath: `${prefixSourceDirectory}/cruel/front.png`,
                tags: [prefixRendererTags.isSeeded, prefixRendererTags.needsHeads], 
                canvasModifiers: { scale: 1.5 },
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                renderImage: (seed, anim, input, parts, parsedRNG) => {
                    const glassesHueRotation: JimpImgMod[] = [{ apply: "hue", params: [parsedRNG.hueRotation] }];
                    anim[0].color(glassesHueRotation);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 4, y: 8, width: 32 });
                }
            })
        }
    }),
    "orbital": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 2,
                frames: prefixRendererConsts.orbital.frames,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.granularSeed
                ],
                render: async function (parts, input, seed) {
                    await prefixRendererConsts.orbital.layerRenderer(parts, input, seed, "front");
                    return true;
                }
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2,
                frames: prefixRendererConsts.orbital.frames,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.granularSeed
                ],
                render: async function (parts, input, seed) {
                    await prefixRendererConsts.orbital.layerRenderer(parts, input, seed, "back");
                    return true;
                }
            })
        }
    }),
    "foolish": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 2,
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
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2,
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation,
                    rotationDirection: {
                        RNGString: "direction",
                        get: function (RNG) {
                            return RNG() > 0.5 ? -1 : 1;
                        }
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const coordinateOffset = {
                        x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                        y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2)
                    }
                    const baseImage = await Jimp.read(`${prefixSourceDirectory}/cursed/pentagram.png`);
                    baseImage.color([{
                        apply: "hue",
                        params: [parsedRNG.hueRotation]
                    }])
                    const cursedFrames = this.frames ?? 15;
                    const frameRotation = 72 / cursedFrames;

                    for (let cursedFrameIndex = 0; cursedFrameIndex < cursedFrames; cursedFrameIndex++) {
                        const prefixFrame = input[cursedFrameIndex % input.length];
                        const rotationDegrees = (frameRotation * cursedFrameIndex * parsedRNG.rotationDirection);
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
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/emburdening/back.png`,
                frontImagePath: `${prefixSourceDirectory}/emburdening/front.png`,
                tags: [prefixRendererTags.needsHeads],
                canvasModifiers: { scale: 2.5 },
                renderImage: (seed, anim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 0, y: 8, width: 32 });
                }
            })
        }
    }),
    "cuffed": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/cuffed/back.png`,
                frontImagePath: `${prefixSourceDirectory}/cuffed/front.png`,
                tags: [prefixRendererTags.needsHeads],
                canvasModifiers: { scale: 2  },
                renderImage: (seed, anim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 0, y: 21, width: 32 });
                }
            })
        }
    }),
    "endangered": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/endangered/back.png`,
                frontImagePath: `${prefixSourceDirectory}/endangered/front.png`,
                tags: [prefixRendererTags.needsHeads, prefixRendererTags.isSeeded],
                canvasModifiers: { scale: 1.5 },
                renderImage: (seed, layerAnim, input, parts, parsedRNG) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 6, y: 0, width: 32 });
                }
            })
        }
    }),
    "marvelous": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/marvelous/back.png`,
                frontImagePath: `${prefixSourceDirectory}/marvelous/front.png`,
                tags: [prefixRendererTags.needsHeads], 
                canvasModifiers: { scale: 2.5 },
                renderImage: (seed, anim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, anim, { x: 23, y: 3, width: 32 });
                }
            })
        }
    }),
    "phasing": constructPrefixRenderer({
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 2,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    crownType: {
                        RNGString: "crownType",
                        get: function (RNG) {
                            return Math.ceil(2 * RNG());
                        }
                    },
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const crownImage = await Jimp.read(`${prefixSourceDirectory}/royal/crown${parsedRNG.crownType}.png`);
                    const crownGemMask = await Jimp.read(`${prefixSourceDirectory}/royal/crown${parsedRNG.crownType}gemmasks.png`);
                    const crownGems = crownImage.clone().mask(crownGemMask);
                    crownGems.color([{
                        apply: "hue",
                        params: [parsedRNG.hueRotation]
                    }])
                    crownImage.composite(crownGems, 0, 0);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [crownImage], { x: 2, y: 17, width: 32 });

                    return true;
                },
            })
        }
    }),
    "captain": constructPrefixRenderer({
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/captain/hat.png`, { x: 5, y: 13, width: 32 }, 1.5)
        }
    }),
    "insignificant": constructPrefixRenderer({
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/insignificant/halo.png`, { x: 74, y: 54, width: 32 }, 3)
        }
    }),
    "95in": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                flatCanvasPadding: 16,
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
                frames: 30,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.granularSeed
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                canvasScale: 2,
                render: async function(parts, input, seed) {
                    let seedGen = seedrandom(`tentacular${seed}`);
                    let tentacleImage = await Jimp.read(`${prefixSourceDirectory}/tentacular/tentacle.png`);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/tentacular/front.png`)], { x: 8, y: 16, width: 32 })
                    
                    compositeRopeSlidingAnimation(input, parts.icon, seedGen, { image: tentacleImage });

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2,
                render: async function(parts, input, seed) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/tentacular/back.png`)], { x: 8, y: 16, width: 32 })
                    return true;
                },
            })
        }
    }),
    "chained": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                flatCanvasPadding: 4,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const seedGen = seedrandom(`chained${seed}`);
                    compositeRopeSlidingAnimation(input, parts.icon, seedGen, { image: await Jimp.read(`${prefixSourceDirectory}/chained/chain.png`), minRopeCount: 1, maxRopeCount: 3 });

                    return true;
                },
            })
        }
    }),
    "adduced": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                flatCanvasPadding: 4,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const seedGen = seedrandom(`adduced${seed}`);
                    compositeRopeSlidingAnimation(input, parts.icon, seedGen, { image: await Jimp.read(`${prefixSourceDirectory}/adduced/cautiontape.png`), minRopeCount: 1, maxRopeCount: 3, startEndPadding: -4, maskMatrix: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] });

                    return true;
                },
            })
        }
    }),
    "roped": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                flatCanvasPadding: 4,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const seedGen = seedrandom(`adduced${seed}`);
                    compositeRopeSlidingAnimation(input, parts.icon, seedGen, { image: await Jimp.read(`${prefixSourceDirectory}/roped/rope.png`), minRopeCount: 1, maxRopeCount: 3 });

                    return true;
                },
            })
        }
    }),
    "summoning": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 32,
                frames: 60,
                tags: [
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: {
                    summoningCount: {
                        RNGString: 'summoningcount',
                        get(RNG) {
                            return Math.ceil(RNG() * 7) + 1;
                        },
                    },
                    radiusScalar: {
                        RNGString: 'summoningradius',
                        get: universalPrefixRNGs.normalizedScalar.get
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const desiredFrames = this.frames ?? 60;
                    const summoningCount = parsedRNG.summoningCount;
                    const centerPoint = Math.ceil(input[0].bitmap.width / 2);
                    const iconCenter = parts.icon[0].bitmap.width / 2;
                    const radius = (((iconCenter) * parsedRNG.radiusScalar) + (iconCenter * 1.5));
                    const angleIncrementPerFrame = (2 * Math.PI) / desiredFrames;
                    const angleIncrementBetweenCube = (2 * Math.PI) / summoningCount;

                    const summoningFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/summoning/cube.png`)

                    for (let desiredFrameIndex = 0; desiredFrameIndex < input.length; desiredFrameIndex++) {
                        const currentFrame = input[desiredFrameIndex];
                        for (let summoningCountIndex = 0; summoningCountIndex < summoningCount; summoningCountIndex++) {
                            const offset = (summoningCountIndex * Math.ceil(desiredFrames / summoningCount));
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 32,
                frames: 60,
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: {
                    summoningCount: {
                        RNGString: 'swarmingcount',
                        get(RNG) {
                            return Math.ceil(RNG() * 7) + 1;
                        },
                    },
                    radiusScalar: {
                        RNGString: 'swarmingradius',
                        get: universalPrefixRNGs.normalizedScalar.get
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const desiredFrames = this.frames ?? 60;
                    const centerPoint = Math.ceil(input[0].bitmap.width / 2);
                    const iconCenter = parts.icon[0].bitmap.width / 2;
                    const radius = (((iconCenter) * parsedRNG.radiusScalar) + (iconCenter * 1.5));
                    const angleIncrementPerFrame = (2 * Math.PI) / desiredFrames;
                    const angleIncrementBetweenCube = (2 * Math.PI) / parsedRNG.summoningCount;

                    const swarmingScaleChange = 3;
                    const swarmingFrames = parts.icon.map(iconFrame => {
                        return iconFrame.clone().resize({ w: Math.ceil(iconFrame.bitmap.width / swarmingScaleChange), h: Math.ceil(iconFrame.bitmap.height / swarmingScaleChange), mode: ResizeStrategy.NEAREST_NEIGHBOR});
                    });

                    for (let desiredFrameIndex = 0; desiredFrameIndex < input.length; desiredFrameIndex++) {
                        const currentFrame = input[desiredFrameIndex];
                        for (let summoningCountIndex = 0; summoningCountIndex < parsedRNG.summoningCount; summoningCountIndex++) {
                            const offset = (summoningCountIndex * Math.ceil(desiredFrames / parsedRNG.summoningCount));
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
        renderSteps: {
            ...constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/kramped/horns.png`, { x: 16, y: 24, width: 32 }, 2)
        }
    }),
    "dandy": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/dandy/hairback.png`,
                frontImagePath: `${prefixSourceDirectory}/dandy/hair.png`,
                tags: [prefixRendererTags.needsHeads],
                canvasModifiers: { scale: 1.5 },
                renderImage: (seed, layerAnim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 8, y: 16, width: 32 });
                }
            })
        }
    }),
    "incarcerated": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/incarcerated/bottom.png`,
                frontImagePath: `${prefixSourceDirectory}/incarcerated/top.png`,
                tags: [prefixRendererTags.needsHeads], 
                canvasModifiers: { scale: 2 }, 
                renderImage: (seed, layerAnim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 8, y: 16, width: 32 });
                }
            })
        }
    }),
    "rippling": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.rippling.renderStep,
            [prefixRenderSteps.applyToBackground]: prefixRendererConsts.rippling.renderStep,
            [prefixRenderSteps.applyToForeground]: prefixRendererConsts.rippling.renderStep
        }
    }),
    "runic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
                tags: [
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 3,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    usingArrows: {
                        RNGString: "arrows",
                        get: function (RNG: () => number) {
                            const usedArrows: number[] = [];
                            const arrowCount = Math.ceil(8 * (2 ** (5 * (RNG() - 1))));

                            while (usedArrows.length < arrowCount) {
                                const newIndex = Math.floor(RNG() * 8);
                                if (!usedArrows.includes(newIndex)) {
                                    usedArrows.push(newIndex)
                                }
                            }

                            return usedArrows.sort();
                        }
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let arrowImages = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/emphasized/arrows.png`);
                    let constructedArrowFrame = new Jimp({ width: arrowImages[0].bitmap.width, height: arrowImages[0].bitmap.height, color: 0x00000000 });

                    parsedRNG.usingArrows.forEach(arrowIndex => {
                        constructedArrowFrame.composite(arrowImages[arrowIndex], 0, 0);
                    });

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [ constructedArrowFrame ], { x: 32, y: 40, width: 32 });
                    return true;
                },
            })
        }
    }),
    "angelic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1.5,
                frames: 10,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, await loadAnimatedCubeIcon(`${prefixSourceDirectory}/angelic/halo.png`), { x: 3, y: 14, width: 32 });

                    return true;
                },
            })
        }
    }),
    "menacing": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1.5,
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
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 1.5,
                frames: 1,
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                render: async function (parts, frames, seed) {
                    const skirtBack = await Jimp.read(`${prefixSourceDirectory}/serving/skirtback.png`);

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, [skirtBack], { x: 8, y: 16, width: 32 });

                    return true;
                },
            })
        }
    }),
    "holy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2.5,
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
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2.5,
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
                frames: 20,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.granularSeed
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
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 2,
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: prefixRendererConsts.neko.predefinedRNG,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let allCatEars = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/neko/ears.png`);

                    let catEarImage = allCatEars[parsedRNG.nekoVariation];

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [catEarImage], { x: 16, y: 24, width: 32 });

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                canvasScale: 2,
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: prefixRendererConsts.neko.predefinedRNG,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let allCatTails = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/neko/tails.png`);

                    let catTailImage = allCatTails[parsedRNG.nekoVariation];

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [catTailImage], { x: 16, y: 24, width: 32 });

                    return true;
                },
            })
        }
    }),
    "phosphorescent": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 4,
                frames: 5,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.granularSeed
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
            [prefixRenderSteps.background]: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/phosphorescent/glow.png`, { x: 16, y: 24, width: 32 }, 2)[prefixRenderSteps.foreground],
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
    }),
    "mathematical": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 22,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                predefinedRNG: {
                    mathProperties: {
                        RNGString: 'mathematicalprops',
                        get(RNG) {
                            const equationPartOne = Math.ceil(RNG() * 100);
                            const equationPartTwo = Math.ceil(RNG() * 100);
                            let possibleOperators = [2];
                            if ((equationPartOne / equationPartTwo) % 1 == 0) { // Check if divides evenly
                                possibleOperators.push(3);
                            }
                            if (equationPartOne > equationPartTwo) { // Check if subtracts into positive number
                                possibleOperators.push(1);
                            }
                            if (String(equationPartOne ** equationPartTwo).length < 9 && !String(equationPartOne ** equationPartTwo).includes('e')) { // Check if the power operation won't result in REALLY BIG ASS NUMBER
                                possibleOperators.push(4);
                            }
                            if (equationPartOne > 20 || equationPartTwo > 20) { // If either is a big number, add addition
                                possibleOperators.push(0);
                            }
                            const equationOperation = possibleOperators[Math.floor(RNG() * possibleOperators.length)];

                            return {
                                equationPartOne,
                                equationPartTwo,
                                equationOperation
                            }
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const allNumbers = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/mathematical/numbers.png`), 10);
                    const allOperators = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/mathematical/operators.png`), 10);
                    // Plus, Minus, Multiply, Divide, Power, Equals
                    const speechBubbleTail = await Jimp.read(`${prefixSourceDirectory}/mathematical/speechbubbletail.png`);

                    let equationResult = 0;
                    switch (parsedRNG.mathProperties.equationOperation) {
                        case 0: // Add
                            equationResult = parsedRNG.mathProperties.equationPartOne + parsedRNG.mathProperties.equationPartTwo;
                            break;
                        case 1: // Subtract
                            equationResult = parsedRNG.mathProperties.equationPartOne - parsedRNG.mathProperties.equationPartTwo;
                            break;
                        case 2: // Multiply
                            equationResult = parsedRNG.mathProperties.equationPartOne * parsedRNG.mathProperties.equationPartTwo;
                            break;
                        case 3: // Divide
                            equationResult = parsedRNG.mathProperties.equationPartOne / parsedRNG.mathProperties.equationPartTwo;
                            break;
                        case 4: // Power
                            equationResult = parsedRNG.mathProperties.equationPartOne ** parsedRNG.mathProperties.equationPartTwo;
                            break;
                        default:
                            console.log("Unknown Operation?", parsedRNG.mathProperties.equationOperation)
                            break;
                    }

                    const characterSpacing = 1;
                    const firstLineLength = `${parsedRNG.mathProperties.equationPartOne}o${parsedRNG.mathProperties.equationPartTwo}=${equationResult}`.length;

                    const characterWidth = allNumbers[0].bitmap.width;
                    const characterHeight = allNumbers[0].bitmap.height;
                    const imageWidth = (firstLineLength * characterWidth) + ((firstLineLength - 1) * characterSpacing) + (characterSpacing * 2);
                    const imageHeight = (characterHeight) + (characterSpacing * 2) + speechBubbleTail.bitmap.height;

                    let speechBubbleImage: JimpImage = new Jimp({ width: imageWidth, height: imageHeight, color: 0x00000000 });
                    speechBubbleImage.composite(speechBubbleTail, 0, 0);
                    fillRect(speechBubbleImage, 0, speechBubbleTail.bitmap.height, speechBubbleImage.bitmap.width, speechBubbleImage.bitmap.height - speechBubbleTail.bitmap.height, speechBubbleTail.getPixelColor(0, 3));

                    let xPosition = 0;
                    let yPosition = 0;
                    `${parsedRNG.mathProperties.equationPartOne}`.split('').forEach(number => {
                        let num = Number(number);
                        speechBubbleImage.composite(allNumbers[num], (xPosition * characterWidth) + ((xPosition + 1) * characterSpacing), speechBubbleTail.bitmap.height + (yPosition * characterHeight) + ((yPosition + 1) * characterSpacing));
                        xPosition++;
                    })
                    speechBubbleImage.composite(allOperators[parsedRNG.mathProperties.equationOperation], (xPosition * characterWidth) + ((xPosition + 1) * characterSpacing), speechBubbleTail.bitmap.height + (yPosition * characterHeight) + ((yPosition + 1) * characterSpacing))
                    xPosition++;
                    `${parsedRNG.mathProperties.equationPartTwo}`.split('').forEach(number => {
                        let num = Number(number);
                        speechBubbleImage.composite(allNumbers[num], (xPosition * characterWidth) + ((xPosition + 1) * characterSpacing), speechBubbleTail.bitmap.height + (yPosition * characterHeight) + ((yPosition + 1) * characterSpacing));
                        xPosition++;
                    })
                    speechBubbleImage.composite(allOperators[5], (xPosition * characterWidth) + ((xPosition + 1) * characterSpacing), speechBubbleTail.bitmap.height + (yPosition * characterHeight) + ((yPosition + 1) * characterSpacing));
                    xPosition++;
                    `${equationResult}`.split('').forEach(number => {
                        let num = Number(number);
                        speechBubbleImage.composite(allNumbers[num], (xPosition * characterWidth) + ((xPosition + 1) * characterSpacing), speechBubbleTail.bitmap.height + (yPosition * characterHeight) + ((yPosition + 1) * characterSpacing));
                        xPosition++;
                    });

                    let outerStrokeWidth = 1;
                    const outerStrokeColor = 0x515151ff;
                    let innerStrokeWidth = 1;
                    const innerStrokeColor = 0x6b6b6bff;
                    speechBubbleImage = strokeImageWithResize(speechBubbleImage, [ { color: innerStrokeColor, thickness: innerStrokeWidth }, { color: outerStrokeColor, thickness: outerStrokeWidth } ]);
                    const compositePosition = {
                        x: (input[0].bitmap.width - speechBubbleImage.bitmap.width) / 2,
                        y: (input[0].bitmap.height - speechBubbleImage.bitmap.height) - 2
                    }
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        inputFrame.composite(speechBubbleImage, compositePosition.x, compositePosition.y)
                    }

                    return true;
                },
            })
        }
    }),
    "wanted": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                flatCanvasPadding: 26,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.granularSeed
                ],
                render: async function(parts, input, seed, cubeData) {
                    let seedGen = seedrandom(`wanted${seed}`);
                    let neededWords: string[] = [''];
                    const wordLengthCutoff = 6;
                    const posterBackgroundColor = 0xd9bfb6ff;
                    const posterBorderColor = 0x9e8177ff;
                    const posterTextColor = 0x9e8177ff;

                    cubeData.name.toUpperCase().split('').forEach(character => {
                        const modifyingIndex = neededWords.length - 1;
                        if (character === ' ' && neededWords[modifyingIndex].length >= wordLengthCutoff) {
                            neededWords.push('');
                        } else {
                            neededWords[modifyingIndex] = `${neededWords[modifyingIndex]}${character}`
                        }
                    })

                    let wordImages: JimpImage[] = [];

                    for (let wordIndex = 0; wordIndex < neededWords.length; wordIndex++) {
                        const word = neededWords[wordIndex];
                        wordImages.push(await generateSmallWordImage(word, 0x00000000, posterTextColor, 1));
                    }

                    const wantedPosterName = new Jimp({width: Math.max(...wordImages.map(image => image.bitmap.width)), height: wordImages.reduce((prev, curr) => {
                        return prev + curr.bitmap.height;
                    }, 0), color: 0x00000000 });

                    wordImages.forEach((image, index) => {
                        wantedPosterName.composite(image, (wantedPosterName.bitmap.width - image.bitmap.width) / 2, index * image.bitmap.height);
                    })

                    const wantedPosterTitle = await Jimp.read(`${prefixSourceDirectory}/wanted/postertitle.png`);
                    // const titleScale = input[0].bitmap.width / (2.75 * 32);
                    // wantedPosterTitle.resize({ w: wantedPosterTitle.bitmap.width * titleScale, h: wantedPosterTitle.bitmap.height * titleScale, mode: ResizeStrategy.NEAREST_NEIGHBOR });

                    const constructedPoster = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height, color: posterBackgroundColor });

                    constructedPoster.composite(wantedPosterTitle, (constructedPoster.bitmap.width - wantedPosterTitle.bitmap.width) / 2, 6);

                    constructedPoster.composite(wantedPosterName, (constructedPoster.bitmap.width - wantedPosterName.bitmap.width) / 2, constructedPoster.bitmap.height - wantedPosterName.bitmap.height - 12);

                    const completePoster = strokeImage(constructedPoster, posterBorderColor, 1, false,[[1, 1, 1], [1, 0, 1], [1, 1, 1]], true);

                    const ripsOnEachSide = [
                        Math.round(seedGen() * (constructedPoster.bitmap.width / 5)) + 3,  // Top
                        Math.round(seedGen() * (constructedPoster.bitmap.width / 5)) + 3,  // Right
                        Math.round(seedGen() * (constructedPoster.bitmap.width / 5)) + 3,  // Bottom
                        Math.round(seedGen() * (constructedPoster.bitmap.width / 5)) + 3,  // Left
                    ]
                    console.log(ripsOnEachSide);

                    if (seedGen() < 0.99) {
                        const ripImages = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/wanted/rips.png`), 4);
                        const ripSize = ripImages[0].bitmap.width;
                        const ripsInEachFrame = Math.floor(ripImages[0].bitmap.height / ripSize);

                        for (let ripsOnEachSideIndex = 0; ripsOnEachSideIndex < ripsOnEachSide.length; ripsOnEachSideIndex++) {
                            const ripCount = ripsOnEachSide[ripsOnEachSideIndex];
                            for (let ripIndex = 0; ripIndex < ripCount; ripIndex++) {
                                let ripCompositeXPosition = 0;
                                let ripCompositeYPosition = 0;
                                const usingRip = Math.floor(seedGen() * ripsInEachFrame);
                                switch (ripsOnEachSideIndex) {  
                                    case 0:
                                        ripCompositeXPosition = Math.round(seedGen() * (completePoster.bitmap.width));
                                        break;
                                    case 1:
                                        ripCompositeXPosition = completePoster.bitmap.width - ripSize;
                                        ripCompositeYPosition = Math.round(seedGen() * (completePoster.bitmap.height));
                                        break;
                                    case 2:
                                        ripCompositeYPosition = completePoster.bitmap.height - ripSize;
                                        ripCompositeXPosition = Math.round(seedGen() * (completePoster.bitmap.width));
                                        break;
                                    case 3:
                                        ripCompositeYPosition = Math.round(seedGen() * (completePoster.bitmap.height));
                                        break;
                                    default:
                                        break;
                                }
                                const usingRipImage = ripImages[ripsOnEachSideIndex % ripImages.length]; 
                                usingRipImage.scan(0, (ripSize * usingRip), ripSize, ripSize, function (x, y, idx) {
                                    const pixelDestinationX = (x % ripSize) + ripCompositeXPosition;
                                    const pixelDestinationY = (y % ripSize) + ripCompositeYPosition;
                                    if (completePoster.bitmap.data[completePoster.getPixelIndex(pixelDestinationX, pixelDestinationY) + 3] > 0 && (pixelDestinationX === 0 || pixelDestinationY === 0 || pixelDestinationX === (completePoster.bitmap.width - 1) || pixelDestinationY === (completePoster.bitmap.width - 1) || completePoster.getPixelColor(pixelDestinationX, pixelDestinationY) === posterBackgroundColor)) {
                                        completePoster.setPixelColor(usingRipImage.getPixelColor(x, y), pixelDestinationX, pixelDestinationY)
                                    }
                                })
                            }
                        }
                    }

                    const shadowDistance = 2;
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const iconFrame = parts.icon[inputFrameIndex % parts.icon.length];
                        const shadowFrame = new Jimp({ width: iconFrame.bitmap.width, height: iconFrame.bitmap.height, color: 0x00000000});
                        iconFrame.scan(0, 0, iconFrame.bitmap.width, iconFrame.bitmap.height, function (x, y, idx) {
                            if (iconFrame.bitmap.data[idx + 3] > 0) {
                                shadowFrame.setPixelColor(0x000000ff, x, y);
                                shadowFrame.bitmap.data[idx + 3] = iconFrame.bitmap.data[idx + 3];
                                shadowFrame.bitmap.data[idx + 3] = Math.round(shadowFrame.bitmap.data[idx + 3] * 0.4);
                            }
                        });
                        const shadowCompositePosition = {
                            x: Math.round((inputFrame.bitmap.width - shadowFrame.bitmap.width) / 2 + shadowDistance),
                            y: Math.round((inputFrame.bitmap.height - shadowFrame.bitmap.height) / 2 + shadowDistance)
                        }
                        inputFrame.composite(constructedPoster);
                        inputFrame.composite(shadowFrame, shadowCompositePosition.x, shadowCompositePosition.y);
                    }

                    return true;
                },
            })
        }
    }),
    "onomatopoeiacal": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 8,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.granularSeed
                ],
                render: async function(parts, input, seed, cubeData) {
                    const seedGen = seedrandom(`onomatopoeiacal${seed}`);
                    const onomatoColorsImage = await Jimp.read(`${prefixSourceDirectory}/onomatopoeiacal/onomatocolors.png`);
                    const possibleOnomatoColors: {
                        text: number,
                        border: number,
                        shadow: number
                    }[] = parseHorizontalSpriteSheet(onomatoColorsImage, onomatoColorsImage.bitmap.width).map(frame => {
                        return {
                            text: frame.getPixelColor(0, 0),
                            border: frame.getPixelColor(0, 1),
                            shadow: frame.getPixelColor(0, 2)
                        }
                    });

                    const onomatoDistance = 10;
                    const onomatoCount = Math.ceil(seedGen() * Math.ceil(parts.icon[0].bitmap.height / onomatoDistance));
                    const onomatos: {
                        word: number,
                        colors: number,
                        position: {
                            x: number,
                            y: number
                        }
                    }[] = [];
                    let iter = 0;
                    while (onomatos.length < onomatoCount && iter < 100) {
                        iter++;
                        let constructedOnomato = {
                            word: Math.floor(seedGen() * prefixRendererConsts.onomatopoeiacal.possibleOnomatos.length),
                            colors: Math.floor(seedGen() * possibleOnomatoColors.length),
                            position: {
                                x: Math.round(seedGen() * parts.icon[0].bitmap.width),
                                y: Math.round(seedGen() * parts.icon[0].bitmap.height)
                            }
                        }
                        if (onomatos.findIndex(onomato => {
                            return onomato.word === constructedOnomato.word || Math.abs(onomato.position.y - constructedOnomato.position.y) < onomatoDistance
                        }) === -1) {
                            onomatos.push(constructedOnomato);
                        }
                    }

                    const inputIconOffset = {
                        x: (input[0].bitmap.width - parts.icon[0].bitmap.width) / 2,
                        y: (input[0].bitmap.width - parts.icon[0].bitmap.width) / 2
                    }
                    for (let onomatoIndex = 0; onomatoIndex < onomatos.length; onomatoIndex++) {
                        const onomato = onomatos[onomatoIndex];
                        const image = strokeImageWithResize(await generateSmallWordImage(prefixRendererConsts.onomatopoeiacal.possibleOnomatos[onomato.word], 0x00000000, possibleOnomatoColors[onomato.colors].text, 0), [
                            { color: possibleOnomatoColors[onomato.colors].border, thickness: 1, matrix: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] },
                            { color: possibleOnomatoColors[onomato.colors].shadow, thickness: 1, matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 1]] }
                        ])

                        input[0].composite(image, onomato.position.x - (image.bitmap.width / 2) + inputIconOffset.x, onomato.position.y - (image.bitmap.width / 2) + inputIconOffset.y);
                    }

                    return true;
                },
            })
        }
    }),
    "smoked": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    leftOrRight: {
                        RNGString: `smokedleftright`,
                        get(RNG) {
                            return (RNG() > 0.5) ? "left" : "right";
                        },
                    }
                },
                canvasScale: 1.5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/smoked/smoked${parsedRNG.leftOrRight}.png`) ], { x: 6, y: 13, width: 32 });
                    
                    return true;
                },
            })
        }
    }),
    "basking": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/basking/baskingback.png`,
                frontImagePath: `${prefixSourceDirectory}/basking/baskingfront.png`,
                tags: [ prefixRendererTags.needsHeads ], 
                canvasModifiers: { scale: 2 },
                renderImage: (seed, layerAnim, input, parts) => {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 17, y: 24, width: 32 });
                }
            })
        }
    }),
    "omniscient": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 2.25,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                frames: 15,
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const omniscientSpriteSheet = await Jimp.read(`${prefixSourceDirectory}/omniscient/animation.png`);
                    const omniscientMask = await Jimp.read(`${prefixSourceDirectory}/omniscient/mask.png`);
                    omniscientSpriteSheet.composite(omniscientSpriteSheet.clone().mask(omniscientMask).color([{ apply: "hue", params: [parsedRNG.hueRotation] }]), 0, 0);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(omniscientSpriteSheet, 15), { x: -3, y: 29, width: 32 });

                    return true;
                },
            })
        }
    }),
    "sniping": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 3,
                predefinedRNG: {
                    rifleType: {
                        RNGString: 'sniperrifle',
                        get(RNG) {
                            const rifles = ["tf2", "cs2"]
                            return `${((RNG() > 0.98) ? 'rare' : '')}${rifles[Math.floor(RNG() * rifles.length)]}`;
                        },
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/sniping/${parsedRNG.rifleType}rifle.png`)], { x: 29, y: 14, width: 32 });

                    return true;
                },
            })
        }
    }),
    "beboppin": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/beboppin/hair.png`, { x: 12, y: 24, width: 32 }, 2)
    }),
    "hardboiled": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/hardboiled/hat.png`, { x: 6, y: 18, width: 32 }, 1.5)
    }),
    "angry": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                frames: 5,
                render: async function(parts, input, seed, cubeData) {
                    let angryFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/angry/anger.png`);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, angryFrames, { x: -23, y: 10, width: 32 });
                    return true;
                },
            })
        }
    }),
    "gruesome": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/gruesome/backblood.png`,
                frontImagePath: `${prefixSourceDirectory}/gruesome/frontblood.png`,
                tags: [prefixRendererTags.needsHeads, prefixRendererTags.isSeeded],
                canvasModifiers: { scale: 1.5 },
                predefinedRNG: {
                    hueChange: {
                        RNGString: 'bloodhue',
                        get(RNG) {
                            return RNG() > 0.8 ? -61 : 0;
                        },
                    }
                },
                renderImage: (seed, layerAnim, input, parts, parsedRNG) => {
                    if (parsedRNG.hueChange !== 0) {
                        layerAnim[0].color([
                            { apply: "hue", params: [parsedRNG.hueChange] }
                        ]);
                    }

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 4, y: 11, width: 32 });
                }
            })
        }
    }),
    "outlawed": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/outlawed/back.png`,
                frontImagePath: `${prefixSourceDirectory}/outlawed/front.png`,
                tags: [prefixRendererTags.needsHeads, prefixRendererTags.isSeeded], 
                canvasModifiers: { scale: 2 },
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                renderImage: (seed, layerAnim, input, parts, parsedRNG) => {
                layerAnim[0].color([
                    { apply: "hue", params: [parsedRNG.hueRotation] }
                ]);

                compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 5, y: 8, width: 32 });
            }})
        }
    }),
    "wranglin": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/wranglin/hat.png`, { x: 8, y: 21, width: 32 }, 2)
    }),
    "canoodled": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.granularSeed
                ],
                render: async function(parts, input, seed, cubeData) {
                    let baseFrame: JimpImage = new Jimp({ width: parts.icon[0].bitmap.width, height: parts.icon[0].bitmap.height, color: 0x00000000});
                    let seedGen = seedrandom(`canoodled${seed}`);
                    const validHueShifts = [0, 0, 0, 0, 0,
                        77,
                        -159,
                        -86
                    ];

                    let baseKissImage = await Jimp.read(`${prefixSourceDirectory}/canoodled/kissmask.png`);
                    baseKissImage.color([{
                        apply: "hue",
                        params: [validHueShifts[Math.floor(validHueShifts.length * seedGen())]]
                    }])

                    const baseKisses = Math.ceil(((parts.icon[0].bitmap.width * parts.icon[0].bitmap.height) / 1024) * 2);
                    const kissesOnFrame = baseKisses + Math.round(seedGen() * baseKisses);

                    const kissPositionDeadZone = 0.1;
                    const kissPositionOffset = baseFrame.bitmap.width * kissPositionDeadZone;
                    const kissPositionRange = baseFrame.bitmap.width * (1 - (kissPositionDeadZone * 2));
                    const maxRotation = 60;

                    const kissPositions: {x: number, y: number}[] = [];
                    const minKissDistance = 15;
                    let loopTimes = 0;
                    for (let kissIndex = 0; kissIndex < kissesOnFrame && loopTimes < 100; kissIndex++) {
                        loopTimes++;
                        let newKissPosition = {
                            x: Math.round(kissPositionOffset + (seedGen() * kissPositionRange) - (baseKissImage.bitmap.width / 2)),
                            y: Math.round(kissPositionOffset + (seedGen() * kissPositionRange) - (baseKissImage.bitmap.width / 2))
                        };
                        if (kissPositions.find(position => Math.sqrt(((position.x - newKissPosition.x) ** 2) + ((position.y - newKissPosition.y) ** 2)) < minKissDistance)) {
                            kissIndex--;
                        } else {
                            kissPositions.push(newKissPosition);
                            let newKissImage = baseKissImage.clone().rotate(Math.round((maxRotation * seedGen()) - (maxRotation / 2)));
                            baseFrame.composite(newKissImage, newKissPosition.x, newKissPosition.y);
                        }
                    }
                    const shadowSize = 1;
                    baseFrame = strokeImageWithResize(baseFrame, [ { color: 0x00000022, thickness: shadowSize, matrix: [[0, 1, 0], [1, 0, 1], [0, 1, 0]] } ]);
                    baseFrame.crop({
                        x: shadowSize,
                        y: shadowSize,
                        w: baseFrame.bitmap.width - (shadowSize * 2), 
                        h: baseFrame.bitmap.height - (shadowSize * 2)
                    });
                    for (let iconFrameIndex = 0; iconFrameIndex < input.length; iconFrameIndex++) {
                        const inputFrame = input[iconFrameIndex];
                        const iconFrame = parts.icon[iconFrameIndex % parts.icon.length];
                        iconFrame.scan(0, 0, iconFrame.bitmap.width, iconFrame.bitmap.height, function (x, y, idx) {
                            if (iconFrame.bitmap.data[idx + 3] !== 0) {
                                inputFrame.setPixelColor(baseFrame.getPixelColor(x, y), x, y);
                            }
                        });
                    }
                    return true;
                },
            })
        }
    }),
    "saiyan": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2.5,
                frames: 5,
                render: async function (parts, input, seed, cubeData) {
                    const saiyanFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/saiyan/glowsprites.png`), 5);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, saiyanFrames, { x: 16, y: 32, width: 32 });
                    return true;
                },
            })
        }
    }),
    "amorous": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                frames: prefixRendererConsts.amorous.frames,
                predefinedRNG: {
                    hueShift: prefixRendererConsts.amorous.heartHueShiftRNG,
                    leftOffset: {
                        RNGString: `leftOffset`,
                        get: prefixRendererConsts.amorous.offsetGetter
                    },
                    leftCenterOffset: {
                        RNGString: `leftCenterOffset`,
                        get: prefixRendererConsts.amorous.offsetGetter
                    },
                    rightCenterOffset: {
                        RNGString: `rightCenterOffset`,
                        get: prefixRendererConsts.amorous.offsetGetter
                    },
                    rightOffset: {
                        RNGString: `rightOffset`,
                        get: prefixRendererConsts.amorous.offsetGetter
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const heartFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/amorous/heartanim.png`), prefixRendererConsts.amorous.frames);
                    const usingShift = prefixRendererConsts.amorous.hueShifts[parsedRNG.hueShift];
                    heartFrames.forEach(frame => { frame.color([{ apply: "hue", params: [usingShift] }]) });

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.leftOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.leftOffset)], { x: 6 - 32, y: 11, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.leftCenterOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.leftCenterOffset)], { x: 16 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.rightCenterOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.rightCenterOffset)], { x: 27 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.rightOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.rightOffset)], { x: 37 - 32, y: 11, width: 32 });
                    return true;
                },
            })
        }
    }),
    "dazed": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation,
                    leftOffset: {
                        RNGString: `leftOffset`,
                        get: prefixRendererConsts.dazed.offsetGetter
                    },
                    leftRotation: {
                        RNGString: `leftRotation`,
                        get: prefixRendererConsts.dazed.rotationGetter
                    },
                    leftCenterOffset: {
                        RNGString: `leftCenterOffset`,
                        get: prefixRendererConsts.dazed.offsetGetter
                    },
                    leftCenterRotation: {
                        RNGString: `leftCenterRotation`,
                        get: prefixRendererConsts.dazed.rotationGetter
                    },
                    rightCenterOffset: {
                        RNGString: `rightCenterOffset`,
                        get: prefixRendererConsts.dazed.offsetGetter
                    },
                    rightCenterRotation: {
                        RNGString: `rightCenterRotation`,
                        get: prefixRendererConsts.dazed.rotationGetter
                    },
                    rightOffset: {
                        RNGString: `rightOffset`,
                        get: prefixRendererConsts.dazed.offsetGetter
                    },
                    rightRotation: {
                        RNGString: `rightRotation`,
                        get: prefixRendererConsts.dazed.rotationGetter
                    },
                },
                canvasScale: 1.5,
                frames: prefixRendererConsts.dazed.frames,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const heartFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/dazed/dazedanim.png`), prefixRendererConsts.dazed.frames);
                    heartFrames.forEach(frame => { frame.color([{ apply: "hue", params: [parsedRNG.hueRotation] }]) });

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.leftOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.leftOffset)].map(frame => { frame.rotate({ deg: parsedRNG.leftRotation }); return frame; }), { x: 6 - 32, y: 11, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.leftCenterOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.leftCenterOffset)].map(frame => { frame.rotate({ deg: parsedRNG.leftCenterRotation }); return frame; }), { x: 16 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.rightCenterOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.rightCenterOffset)].map(frame => { frame.rotate({ deg: parsedRNG.rightCenterRotation }); return frame; }), { x: 27 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...heartFrames.slice(parsedRNG.rightOffset, heartFrames.length), ...heartFrames.slice(0, parsedRNG.rightOffset)].map(frame => { frame.rotate({ deg: parsedRNG.rightRotation }); return frame; }), { x: 37 - 32, y: 11, width: 32 });
                    return true;
                },
            })
        }
    }),
    "frosty": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: prefixRendererConsts.frosty.outlineWidth,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                predefinedRNG: {
                    xOffset: {
                        RNGString: `frostyXOff`,
                        get(RNG) {
                            return Math.floor(RNG() * 6);
                        },
                    },
                    yOffset: {
                        RNGString: `frostyYOff`,
                        get(RNG) {
                            return Math.floor(RNG() * 6);
                        },
                    },
                    outlineColor: {
                        RNGString: `frostyOutline`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.frosty.possibleOutlines.length);
                        }
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const frostImage = await Jimp.read(`${prefixSourceDirectory}/frosty/frost.png`);

                    for (let frameIndex = 0; frameIndex < input.length; frameIndex++) {
                        const inputFrame = input[frameIndex];
                        const iconFrame = parts.icon[frameIndex % parts.icon.length];
                        iconFrame.scan(function (x, y, idx) {
                            if (iconFrame.bitmap.data[idx + 3] > 0) {
                                const outputPosition = {
                                    x: x + prefixRendererConsts.frosty.outlineWidth,
                                    y: y + prefixRendererConsts.frosty.outlineWidth,
                                }
                                const outputIndex = inputFrame.getPixelIndex(outputPosition.x, outputPosition.y);
                                inputFrame.setPixelColor(frostImage.getPixelColor((x + parsedRNG.xOffset) % frostImage.bitmap.width, (y + parsedRNG.yOffset) % frostImage.bitmap.height), outputPosition.x, outputPosition.y);
                                inputFrame.bitmap.data[outputIndex + 3] = Math.ceil((iconFrame.bitmap.data[idx + 3] + inputFrame.bitmap.data[outputIndex + 3]) / 2);
                            }
                        })
                        strokeImage(inputFrame, prefixRendererConsts.frosty.possibleOutlines[parsedRNG.outlineColor], prefixRendererConsts.frosty.outlineWidth, false, [ [1, 1, 1], [1, 0, 1], [1, 1, 1] ], true);
                    }

                    return true;
                },
            })
        }
    }),
    "electrified": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                flatCanvasPadding: 16,
                render: async function(parts, input, seed, cubeData) {
                    let seedGen = seedrandom(`electrified${seed}`);

                    let electrifiedMultiplier = parts.icon[0].bitmap.width / 32;
                    let electrifiedPositions = generateSparsePositions(Math.ceil((3 * electrifiedMultiplier) + (seedGen() * 4 * (electrifiedMultiplier ** 2))), parts.icon[0].bitmap.width / 3, seedGen, { width: parts.icon[0].bitmap.width, height: parts.icon[0].bitmap.height });

                    electrifiedPositions = electrifiedPositions.filter(position => {
                        return parts.icon[0].bitmap.data[parts.icon[0].getPixelIndex(position.x, position.y) + 3] > 0
                    })

                    let electrifiedOffsets: number[] = [];
                    electrifiedPositions.forEach(() => {
                        electrifiedOffsets.push(Math.floor(seedGen() * 15));
                    });

                    let electrifiedRotations: number[] = [];
                    electrifiedPositions.forEach(() => {
                        electrifiedRotations.push(Math.floor(seedGen() * 4) * 90);
                    });

                    const possibleFilters: JimpImgMod[][] = [
                        [
                            {
                                apply: "hue",
                                params: [180]
                            }
                        ],
                        [
                            {
                                apply: "hue",
                                params: [108]
                            }
                        ],
                        [
                            {
                                apply: "hue",
                                params: [0]
                            }
                        ],
                        [
                            {
                                apply: "hue",
                                params: [-65]
                            }
                        ]
                    ];
                    const electrifiedColor = possibleFilters[Math.floor(seedGen() * possibleFilters.length)]

                    const lightningFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/electrified/lightning.png`), 15);
                    lightningFrames.forEach(frame => frame.color(electrifiedColor));

                    const lightningStrokeColor = new Jimp({width: 1, height: 1, color: lightningFrames[0].getPixelColor(0, 20)}).color([{ apply: "darken", params: [25] }]).getPixelColor(0, 0);
                    const compositeSizeOffset = Math.floor(lightningFrames[0].bitmap.width / 2);
                    const inputIconOffset = {
                        x: (input[0].bitmap.width - parts.icon[0].bitmap.width) / 2,
                        y: (input[0].bitmap.height - parts.icon[0].bitmap.height) / 2,
                    }
                    for (let electrifiedFrameIndex = 0; electrifiedFrameIndex < input.length; electrifiedFrameIndex++) {
                        const inputFrame = input[electrifiedFrameIndex];
                        for (let electrifiedPositionIndex = 0; electrifiedPositionIndex < electrifiedPositions.length; electrifiedPositionIndex++) {
                            const lightningFrame = lightningFrames[(electrifiedFrameIndex + electrifiedOffsets[electrifiedPositionIndex]) % lightningFrames.length];
                            const electrifiedPosition = electrifiedPositions[electrifiedPositionIndex];
                            const electrifiedRotation = electrifiedRotations[electrifiedPositionIndex];
                            
                            inputFrame.composite(lightningFrame.clone().rotate({ deg: electrifiedRotation, mode: false }), electrifiedPosition.x + inputIconOffset.x - compositeSizeOffset, electrifiedPosition.y + inputIconOffset.y - compositeSizeOffset);
                        }
                        strokeImage(inputFrame, lightningStrokeColor, 1, false, [[0, 0, 0], [0, 0, 0], [0, 1, 0]], true);
                    }

                    return true;
                },
            })
        }
    }),
    "overcast": constructPrefixRenderer({
        renderSteps: {
            ...constructFrontBackPrefixRenderer({
                backImagePath: `${prefixSourceDirectory}/overcast/backclouds.png`,
                frontImagePath: `${prefixSourceDirectory}/overcast/frontclouds.png`,
                tags: [ prefixRendererTags.isSeeded, prefixRendererTags.needsHeads ], 
                canvasModifiers: { scale: 1.5 },
                predefinedRNG: {
                    flipHorizontal: {
                        RNGString: 'overcastflip',
                        get(RNG) {
                            return RNG() > 0.5
                        },
                    }
                },
                renderImage: (seed, layerAnim, input, parts, parsedRNG) => {
                    layerAnim[0].flip({ horizontal: parsedRNG.flipHorizontal });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, layerAnim, { x: 8, y: 16, width: 32 });
                }
            })
        }
    }),
    "bladed": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2,
                predefinedRNG: {
                    swordType: {
                        RNGString: `swordtype`,
                        get(RNG) {
                            return Math.floor(RNG() * 6);
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/bladed/sword${parsedRNG.swordType}.png`) ], { x: 14, y: 26, width: 32 });
                    return true;
                },
            })
        }
    }),
    "jolly": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/jolly/phyrgiancap.png`, { x: 8, y: 16, width: 32 }, 1.5)
    }),
    "partying": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                predefinedRNG: {
                    embellishmentVariant: {
                        RNGString: `embellishment`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.partying.embellishmentVariants);
                        },
                    },
                    stripeVariant: {
                        RNGString: `stripevariant`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.partying.stripeVariants);
                        },
                    },
                    topperVariant: {
                        RNGString: `toppervariant`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.partying.topperVariants);
                        },
                    },
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                render: async function (parts, input, seed, cubeData, otherPrefxies, parsedRNG) {
                    const shadowSize = 1;
                    let hatImage: JimpImage = await Jimp.read(`${prefixSourceDirectory}/partying/base.png`);
                    hatImage = strokeImageWithResize(hatImage, [{color: 0x00000022, thickness: shadowSize, matrix: [
                        [0, 0, 0],
                        [0, 0, 0],
                        [0, 1, 0]
                    ]}]);

                    let embellishmentImages = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/partying/embellishments.png`), prefixRendererConsts.partying.embellishmentVariants);
                    hatImage.composite(embellishmentImages[parsedRNG.embellishmentVariant], shadowSize, shadowSize);

                    let stripeImages = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/partying/stripes.png`), prefixRendererConsts.partying.stripeVariants);
                    hatImage.composite(stripeImages[parsedRNG.stripeVariant], shadowSize, shadowSize);

                    let topperImages = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/partying/toppers.png`), prefixRendererConsts.partying.topperVariants);
                    hatImage.composite(topperImages[parsedRNG.topperVariant], shadowSize, shadowSize);

                    hatImage.color([ { apply:"hue", params: [ parsedRNG.hueRotation ] } ]);

                    hatImage.composite(await Jimp.read(`${prefixSourceDirectory}/partying/shading.png`), shadowSize, shadowSize);
                    hatImage.composite(await Jimp.read(`${prefixSourceDirectory}/partying/sparkles.png`), shadowSize, shadowSize);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [hatImage], { x: -6, y: 24, width: 32 });
                    return true;
                },
            })
        }
    }),
    "sophisticated": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/sophisticated/tophat.png`, { x: 8, y: 24, width: 32 }, 2)
    }),
    "culinary": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/culinary/toque.png`, { x: 8, y: 34, width: 32 }, 3)
    }),
    "eudaemonic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                dontRenderWithPrefixesPresent: [ "thinking" ],
                frames: 10,
                flatCanvasPadding: 21,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes) {
                    let animation = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/eudaemonic/speechbubble.png`), 10);

                    const bubbleDistance = 0;
                    compositeHeadsToAllFramesWithoutScaling(input, parts.icon[0], parts.heads, animation, { x: bubbleDistance, y: -bubbleDistance - animation[0].bitmap.height }, true);

                    return true;
                },
            })
        }
    }),
    "magical": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2.25,
                predefinedRNG: {
                    hatVariant: {
                        RNGString: `wizardhat`,
                        get(RNG) {
                            return ((RNG() > 0.98) ? 'rare' : 'common');
                        },
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/magical/${ parsedRNG.hatVariant }.png`)], { x: 12, y: 25, width: 32 });

                    return true;
                },
            })
        }
    }),
    "blushing": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2.25,
                predefinedRNG: {
                    blushingVariant: {
                        RNGString: `blushingvariant`,
                        get(RNG) {
                            return Math.floor(RNG() * 2);
                        },
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/blushing/${parsedRNG.blushingVariant}.png`)], { x: 0, y: 0, width: 32 });

                    return true;
                },
            })
        }
    }),
    "sweetened": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/sweetened/cherry.png`, { x: 0, y: 19, width: 32 }, 2)
    }),
    "dovey": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 3.5,
                predefinedRNG: {
                    doveVariant: {
                        RNGString: `dovevariant`,
                        get(RNG) {
                            return ((RNG() > 0.975) ? 'rare' : 'common');
                        },
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/dovey/${parsedRNG.doveVariant}.png`)], { x: 17, y: 42, width: 32 });

                    return true;
                },
            })
        }
    }),
    "batty": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 5,
                render: async function (parts, input, seed, cubeData) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/batty/bat.png`)], { x: 0, y: 8, width: 32 });

                    return true;
                },
            })
        }
    }),
    "streaming": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                predefinedRNG: prefixRendererConsts.streaming.predefinedRNG,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let headphoneImage = await Jimp.read(`${prefixSourceDirectory}/streaming/h${parsedRNG.headphoneProps.variant}f.png`);

                    if (parsedRNG.headphoneProps.hue !== 0) headphoneImage.color([{ apply: "hue", params: [parsedRNG.headphoneProps.hue] }]);
                    let musicImage: JimpImage = new Jimp({ width: 1, height: 1, color: 0x00000000 })
                    if (parsedRNG.musicProps.using) {
                        musicImage = new Jimp({ width: 42, height: 42, color: 0x00000000 });
                        const notes = parseHorizontalSpriteSheet((await Jimp.read(`${prefixSourceDirectory}/streaming/notes.png`)).color([{ apply: "hue", params: [parsedRNG.musicProps.hue] }]) as JimpImage, 3);
                        const positions = [
                            {
                                x: 29 - 7,
                                y: 26
                            },
                            {
                                x: 38 - 3,
                                y: 20
                            },
                            {
                                x: 39 - 3,
                                y: 35
                            }
                        ];
                        positions.forEach((pos, index) => {
                            musicImage.composite(notes[parsedRNG.musicProps.notes[index % parsedRNG.musicProps.notes.length]], pos.x - Math.ceil(notes[0].bitmap.width / 2), pos.y - Math.ceil(notes[0].bitmap.width / 2))
                        });
                    }

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [headphoneImage], { x: 5, y: 13, width: 32 });

                    const musicInputIconOffset = {
                        x: Math.floor((input[0].bitmap.width - musicImage.bitmap.width) / 2),
                        y: Math.floor((input[0].bitmap.height - musicImage.bitmap.height) / 2),
                    }
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        inputFrame.composite(musicImage, musicInputIconOffset.x, musicInputIconOffset.y);
                    }

                    return true;
                },
            }), 
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1,
                predefinedRNG: prefixRendererConsts.streaming.predefinedRNG,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let headphoneImage = await Jimp.read(`${prefixSourceDirectory}/streaming/h${parsedRNG.headphoneProps.variant}b.png`);
                    if (parsedRNG.headphoneProps.hue !== 0) headphoneImage.color([{ apply: "hue", params: [parsedRNG.headphoneProps.hue] }]);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [headphoneImage], { x: 5, y: 13, width: 32 });
                    return true;
                },
            })
        }
    }),
    "clapping": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2,
                frames: 5,
                render: async function (parts, input, seed, cubeData) {
                    const clappingFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/clapping/clap.png`), 5);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, clappingFrames, { x: 16, y: -7, width: 32 });
                    return true;
                },
            })
        }
    }),
    "musical": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                flatCanvasPadding: 8,
                frames: 60,
                predefinedRNG: {
                    noteHue: universalPrefixRNGs.hueRotation,
                    noteProperties: {
                        RNGString: `musicalnoteproperties`,
                        get(RNG) {
                            const noteSpeed = ((Math.floor(RNG() * 3)) || -1) as (-1 | 1 | 2);
                            const noteCount = Math.ceil(RNG() * 3) + 1;
                            const notes: {
                                noteImage: number,
                                track: 0 | 1 | 2
                            }[] = [];

                            while (notes.length < noteCount) {
                                notes.push({
                                    noteImage: Math.floor(RNG() * 5),
                                    track: Math.floor(RNG() * 3) as (0 | 1 | 2)
                                })
                            }

                            return {
                                noteSpeed,
                                noteCount,
                                notes
                            }
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const prefixFrameLength = this.frames ?? 30;
                    const noteImages = parseHorizontalSpriteSheet((await Jimp.read(`${prefixSourceDirectory}/musical/notes.png`)).color([
                        { apply: "hue", params: [parsedRNG.noteHue] }
                    ]) as JimpImage, 5);

                    const size = (input[0].bitmap.height / 6);
                    function sinPosition(x: number, t: number) {
                        const timeScale = 1;
                        return Math.round(size * Math.sin(((x / size) - (2 * Math.PI * ((t * timeScale) % 1)))) + (parts.icon[0].bitmap.height / 2));
                    }

                    const colorImage = new Jimp({width: 1, height: 2, color: 0x3e3e3eff});
                    colorImage.setPixelColor(0x2c2c2cff, 0, 1);

                    const noteSizeCentering = noteImages[0].bitmap.width / 2;

                    for (let animationFrameIndex = 0; animationFrameIndex < input.length; animationFrameIndex++) {
                        const outputFrame = input[animationFrameIndex];
                        const time = ((animationFrameIndex % prefixFrameLength) / prefixFrameLength);
                        for (let frameXPosition = 0; frameXPosition < outputFrame.bitmap.width; frameXPosition++) {
                            let yOffset = (this.flatCanvasPadding ?? 0) - 1; // -1 for the line size
                            const sinY = sinPosition(frameXPosition, time);
                            // Top line
                            outputFrame.composite(colorImage, frameXPosition, sinY - size + yOffset);

                            // Middle Line
                            outputFrame.composite(colorImage, frameXPosition, sinY + yOffset);

                            // Bottom Line
                            outputFrame.composite(colorImage, frameXPosition, sinY + size + yOffset);
                        }
                        for (let noteIndex = 0; noteIndex < parsedRNG.noteProperties.notes.length; noteIndex++) {
                            const note = parsedRNG.noteProperties.notes[noteIndex];
                            const noteImage = noteImages[note.noteImage];
                            const noteProgress = (((time * parsedRNG.noteProperties.noteSpeed) + (noteIndex / parsedRNG.noteProperties.notes.length)) % 1) * outputFrame.bitmap.width;
                            let yOffset = (this.flatCanvasPadding ?? 0);
                            switch (note.track) {
                                case 0:
                                    yOffset -= size;
                                    break;
                                case 2:
                                    yOffset += size;
                                    break;
                                default:
                                    break;
                            }
                            outputFrame.composite(noteImage, noteProgress - noteSizeCentering, sinPosition(noteProgress, time) - noteSizeCentering + yOffset);
                            outputFrame.composite(noteImage, noteProgress - noteSizeCentering + outputFrame.bitmap.width, sinPosition(noteProgress + outputFrame.bitmap.width, time) - noteSizeCentering + yOffset);
                            outputFrame.composite(noteImage, noteProgress - noteSizeCentering - outputFrame.bitmap.width, sinPosition(noteProgress - outputFrame.bitmap.width, time) - noteSizeCentering + yOffset);
                            outputFrame.composite(noteImage, noteProgress - noteSizeCentering + (outputFrame.bitmap.width * 2), sinPosition(noteProgress + (outputFrame.bitmap.width * 2), time) - noteSizeCentering + yOffset);
                            outputFrame.composite(noteImage, noteProgress - noteSizeCentering - (outputFrame.bitmap.width * 2), sinPosition(noteProgress - (outputFrame.bitmap.width * 2), time) - noteSizeCentering + yOffset);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "stunned": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2,
                frames: 5,
                render: async function (parts, input, seed, cubeData) {
                    const stunnedFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/stunned/stars.png`), 5);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, stunnedFrames, { x: 8, y: 17, width: 32 });
                    return true;
                },
            })
        }
    }),
    "lovey": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsEyes
                ],
                predefinedRNG: {
                    hueShift: prefixRendererConsts.amorous.heartHueShiftRNG // same RNG so that these hearts match the color of the hearts on the amorous prefix
                },
                flatCanvasPadding: 2,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let heartEyeImage = strokeImage(await Jimp.read(`${prefixSourceDirectory}/lovey/heart.png`), 0x00000022, 1, false, [[0, 0, 0], [0, 0, 0], [0, 1, 0]]); 
                    const usingShift = prefixRendererConsts.amorous.hueShifts[parsedRNG.hueShift];
                    heartEyeImage.color([{ apply: "hue", params: [usingShift] }]);
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [ heartEyeImage ]);
                    return true;
                },
            })
        }
    }),
    "trouvaille": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                predefinedRNG: {
                    cloverVariant: {
                        RNGString: `clover`,
                        get(RNG) {
                            return ((RNG() > 0.985) ? 'rare' : 'common');
                        },
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [await Jimp.read(`${prefixSourceDirectory}/trouvaille/${parsedRNG.cloverVariant}.png`)], { x: -10, y: 11, width: 32 });

                    return true;
                },
            })
        }
    }),
    "googly": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsEyes
                ],
                predefinedRNG: {
                    flipX: {
                        RNGString: 'flipx',
                        get(RNG) {
                            return RNG() > 0.5;
                        },
                    },
                    flipY: {
                        RNGString: 'flipy',
                        get(RNG) {
                            return RNG() > 0.5;
                        },
                    },
                    flipXAgain: {
                        RNGString: 'flipxAgain',
                        get(RNG) {
                            return RNG() > 0.25;
                        },
                    },
                    flipYAgain: {
                        RNGString: 'flipyAgain',
                        get(RNG) {
                            return RNG() > 0.25;
                        },
                    }
                },
                flatCanvasPadding: 2,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const googlyEyeImage: JimpImage = await Jimp.read(`${prefixSourceDirectory}/googly/googlyeye.png`);
                    googlyEyeImage.flip({
                        horizontal: parsedRNG.flipX,
                        vertical: parsedRNG.flipY
                    })
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [googlyEyeImage], (eye, index) => {
                        return (index % 2) === 1;
                    });
                    googlyEyeImage.flip({
                        horizontal: parsedRNG.flipXAgain,
                        vertical: parsedRNG.flipYAgain
                    })
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [googlyEyeImage], (eye, index) => {
                        return (index % 2) === 0;
                    });
                    return true;
                },
            })
        }
    }),
    "expressive": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsEyes
                ],
                predefinedRNG: {
                    eyebrowProps: {
                        RNGString: `expressiveeyebrow`,
                        get(RNG) {
                            return {
                                usingMask: Math.floor(RNG() * prefixRendererConsts.expressive.eyebrowCount),
                                color: prefixRendererConsts.expressive.eyebrowColors[Math.floor(RNG() * prefixRendererConsts.expressive.eyebrowColors.length)]
                            }
                        },
                    }
                },
                flatCanvasPadding: 5,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let eyebrowMasks = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/expressive/eyebrows.png`), 5);
                    const eyebrowImage = new Jimp({
                        width: eyebrowMasks[0].bitmap.width,
                        height: eyebrowMasks[0].bitmap.height,
                        color: parsedRNG.eyebrowProps.color
                    });
                    eyebrowMasks[parsedRNG.eyebrowProps.usingMask].scan(0, 0, eyebrowMasks[0].bitmap.width, eyebrowMasks[0].bitmap.height, function (x, y, idx) {
                        if (eyebrowMasks[parsedRNG.eyebrowProps.usingMask].bitmap.data[idx + 3] <= 0) {
                            eyebrowImage.setPixelColor(0x00000000, x, y)
                        }
                    })
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [eyebrowImage], (eye, index) => {
                        return (index % 2) === 0;
                    });
                    eyebrowImage.flip({ horizontal: true });
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [eyebrowImage], (eye, index) => {
                        return (index % 2) === 1;
                    });
                    return true;
                },
            })
        }
    }),
    "talkative": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                frames: 5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/talkative/talkingindicator.png`), 5), { x: 7, y: 9, width: 32 });
                    return true;
                },
            })
        }
    }),
    "muscular": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/muscular/back.png`,
            frontImagePath: `${prefixSourceDirectory}/muscular/front.png`,
            canvasModifiers: { scale: 2 },
            tags: [
                prefixRendererTags.needsHeads
            ],
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 6, y: 15, width: 32 });
            }
        })
    }),
    "leggendary": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 3.5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [ await Jimp.read(`${prefixSourceDirectory}/leggendary/legs.png`) ], { x: 0, y: 8, width: 32 });
                    return true;
                },
            })
        }
    }),
    "thinking": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: prefixRendererConsts.thinking.thinkingFrames,
                canvasScale: 3.5,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                affectedByOtherPrefixes: [
                    "eudaemonic",
                    "feminine",
                    "masculine"
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let usingSpeechSheet = ``;
                    if (otherPrefixes.includes("eudaemonic")) {
                        usingSpeechSheet = `eudaemonicthoughts`;
                    } else if (otherPrefixes.includes("feminine") && otherPrefixes.includes("masculine")) {
                        usingSpeechSheet = `mascfemthoughts`;
                    } else if (otherPrefixes.includes("feminine")) {
                        usingSpeechSheet = `femthoughts`;
                    } else if (otherPrefixes.includes("masculine")) {
                        usingSpeechSheet = `mascthoughts`;
                    } else {
                        usingSpeechSheet = `thoughts`;
                    }

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/thinking/${usingSpeechSheet}.png`), prefixRendererConsts.thinking.thinkingFrames), { x: -33, y: 28, width: 32 });

                    return true;
                },
            })
        }
    }),
    "boiled": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 2,
                frames: prefixRendererConsts.boiled.frames,
                predefinedRNG: {
                    leftOffset: {
                        RNGString: `leftOffset`,
                        get: prefixRendererConsts.boiled.offsetGetter
                    },
                    leftCenterOffset: {
                        RNGString: `leftCenterOffset`,
                        get: prefixRendererConsts.boiled.offsetGetter
                    },
                    rightCenterOffset: {
                        RNGString: `rightCenterOffset`,
                        get: prefixRendererConsts.boiled.offsetGetter
                    },
                    rightOffset: {
                        RNGString: `rightOffset`,
                        get: prefixRendererConsts.boiled.offsetGetter
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const steamFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/boiled/steam.png`), prefixRendererConsts.boiled.frames);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...steamFrames.slice(parsedRNG.leftOffset, steamFrames.length), ...steamFrames.slice(0, parsedRNG.leftOffset)], { x: 2 - 32, y: 17, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...steamFrames.slice(parsedRNG.leftCenterOffset, steamFrames.length), ...steamFrames.slice(0, parsedRNG.leftCenterOffset)], { x: 11 - 32, y: 22, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...steamFrames.slice(parsedRNG.rightCenterOffset, steamFrames.length), ...steamFrames.slice(0, parsedRNG.rightCenterOffset)], { x: 24 - 32, y: 22, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...steamFrames.slice(parsedRNG.rightOffset, steamFrames.length), ...steamFrames.slice(0, parsedRNG.rightOffset)], { x: 33 - 32, y: 17, width: 32 });
                    return true;
                },
            })
        }
    }),
    "typing": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIconDimensions,
                    prefixRendererTags.isSeeded
                ],
                affectedByOtherPrefixes: [
                    "zammin",
                    "acquiescing",
                    "rdming"
                ],
                predefinedRNG: {
                    message: {
                        RNGString: `messagerng`,
                        get(RNG) {
                            const characterPool = `AAAABCDEEEEFGHIIIIJKLMNOOOOPQRSTTTTUUUUVWXYYZ`;
                            let usingString = ``;
                            const length = Math.round(RNG() * 4) + 4;
                            for (let addedCharacterIndex = 0; addedCharacterIndex < length; addedCharacterIndex++) {
                                const addedCharacter = Math.floor(RNG() * characterPool.length);
                                usingString = `${usingString}${characterPool[addedCharacter]}`;
                            }
                            return usingString;
                        },
                    },
                    color: {
                        RNGString: `messagecolor`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.onomatopoeiacal.onomatoColors);
                        }
                    }
                },
                flatCanvasPadding: 64,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let typingString = `${parsedRNG.message}`;
                    if (otherPrefixes.includes("zammin")) {
                        typingString = `ZAMN!`;
                    } else if (otherPrefixes.includes("acquiescing")) {
                        typingString = `SIGH...`;
                    } else if (otherPrefixes.includes("rdming")) {
                        typingString = `RDM!RDM!RDM!RDM!RDM`;
                    }
                    
                    const onomatoColorsImage = await Jimp.read(`${prefixSourceDirectory}/onomatopoeiacal/onomatocolors.png`);
                    const messageColors = {
                        border: onomatoColorsImage.getPixelColor(parsedRNG.color, 0),
                        background: onomatoColorsImage.getPixelColor(parsedRNG.color, 1),
                        text: onomatoColorsImage.getPixelColor(parsedRNG.color, 2)
                    }

                    const speechBubblePadding = 2;
                    const textImage = await generateSmallWordImage(typingString, messageColors.background, messageColors.text, speechBubblePadding);
                    const speechBubbleTail = await Jimp.read(`${prefixSourceDirectory}/typing/speechbubbletail.png`);
                    speechBubbleTail.scan(function(x, y, idx) {
                        if (speechBubbleTail.bitmap.data[idx + 3] > 0) {
                            speechBubbleTail.setPixelColor(messageColors.background, x, y);
                        }
                    })

                    const compositePosition = {
                        x: Math.floor(input[0].bitmap.width / 2) + parts.icon[0].bitmap.width - 18,
                        y: Math.floor(input[0].bitmap.height / 2) - textImage.bitmap.height - 16
                    }

                    input[0].composite(textImage, compositePosition.x, compositePosition.y);
                    input[0].composite(speechBubbleTail, compositePosition.x, compositePosition.y + textImage.bitmap.height);
                    strokeImage(input[0], messageColors.border, 1, false, [[0, 1, 0], [1, 0, 1], [0, 1, 0]], true);

                    return true;
                },
            })
        }
    }),
    "blind": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/blind/back.png`,
            frontImagePath: `${prefixSourceDirectory}/blind/front.png`,
            tags: [
                prefixRendererTags.needsHeads
            ],
            canvasModifiers: {
                scale: 1.5
            },
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 1, y: 8, width: 32 });
            },
        })
    }),
    "cucurbitaphilic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                predefinedRNG: {
                    pumpkinType: {
                        RNGString: `pumpkinrng`,
                        get(RNG) {
                            return Math.ceil(RNG() * 3);
                        }
                    }
                },
                canvasScale: 1.5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const pumpkinImage = await Jimp.read(`${prefixSourceDirectory}/cucurbitaphilic/${parsedRNG.pumpkinType}.png`);
                    const targetSize = parts.icon[0].bitmap.width / 48;
                    pumpkinImage.resize({ w: Math.ceil(pumpkinImage.bitmap.width * targetSize), h: Math.ceil(pumpkinImage.bitmap.width * targetSize), mode: ResizeStrategy.NEAREST_NEIGHBOR });

                    const compositingFrame = input[0];

                    compositingFrame.composite(pumpkinImage, compositingFrame.bitmap.width - (pumpkinImage.bitmap.width + 5), compositingFrame.bitmap.height - (pumpkinImage.bitmap.height + 3));

                    return true;
                },
            })
        }
    }),
    "radioactive": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: prefixRendererConsts.radioactive.desiredFrames,
                tags: [
                    prefixRendererTags.needsIcon
                ],
                flatCanvasPadding: prefixRendererConsts.radioactive.radioactivePadding,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let maskFrames: JimpImage[] = [];
                    parts.icon.forEach((frame) => {
                        maskFrames.push(strokeImageWithResize(frame.clone(), [{
                            color: 0xffffffff,
                            thickness: prefixRendererConsts.radioactive.radioactivePadding,
                            matrix: [
                                [0, 1, 0],
                                [1, 0, 1],
                                [0, 1, 0]
                            ]
                        }]))
                    })
                    maskFrames.forEach(frame => {
                        frame.scan(function(x, y, idx) {
                            if (frame.bitmap.data[idx + 3] > 0) {
                                frame.setPixelColor(0xffffffff, x, y);
                            }
                        })
                    })

                    const radioactiveLines = Math.floor((parts.icon[0].bitmap.height / (prefixRendererConsts.radioactive.radioactivePadding + 2)) * prefixRendererConsts.radioactive.animationDensity);
                    const lineDistance = (parts.icon[0].bitmap.height + (prefixRendererConsts.radioactive.radioactivePadding * 2)) / radioactiveLines;

                    for (let radioactiveIndex = 0; radioactiveIndex < input.length; radioactiveIndex++) {
                        const newFrame = input[radioactiveIndex];
                        const maskFrame = maskFrames[radioactiveIndex % maskFrames.length];
                        const animationProgressOffset = (2 * Math.PI) * (radioactiveIndex / prefixRendererConsts.radioactive.desiredFrames);
                        for (let radioactiveLineIndex = 0; radioactiveLineIndex < radioactiveLines; radioactiveLineIndex++) {
                            const yOffset = prefixRendererConsts.radioactive.radioactivePadding + ((radioactiveLineIndex - 0.25) * lineDistance);
                            for (let newFrameX = 0; newFrameX < newFrame.bitmap.width; newFrameX++) {
                                const yPosition = (Math.cos(animationProgressOffset + ((Math.PI * 2) * (newFrameX / newFrame.bitmap.width))) * prefixRendererConsts.radioactive.radioactivePadding) + yOffset;
                                newFrame.setPixelColor(prefixRendererConsts.radioactive.radioactiveColor, newFrameX, yPosition);
                                newFrame.setPixelColor(prefixRendererConsts.radioactive.radioactiveColor, yPosition, newFrameX);
                            }
                        }
                        strokeImage(newFrame, prefixRendererConsts.radioactive.radioactiveStrokeColor, 1, false, undefined, true);
                        newFrame.mask(maskFrame);
                    }

                    return true;
                },
            })
        }
    }),
    "read": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                predefinedRNG: {
                    readingType: {
                        RNGString: `readrng`,
                        get(RNG) {
                            return Math.ceil(RNG() * 4);
                        }
                    }
                },
                canvasScale: 1.5,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const readImage = await Jimp.read(`${prefixSourceDirectory}/read/${parsedRNG.readingType}.png`);
                    const targetSize = parts.icon[0].bitmap.width / 32;
                    readImage.resize({ w: Math.ceil(readImage.bitmap.width * targetSize), h: Math.ceil(readImage.bitmap.width * targetSize), mode: ResizeStrategy.NEAREST_NEIGHBOR });

                    const compositingFrame = input[0];

                    compositingFrame.composite(readImage, compositingFrame.bitmap.width - (readImage.bitmap.width + 5), compositingFrame.bitmap.height - (readImage.bitmap.height + 3));

                    return true;
                },
            })
        }
    }),
    "foggy": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/foggy/fog.png`, { x: 13, y: 10, width: 32 }, 2)
    }),
    "fatherly": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                canvasScale: 2.25,
                predefinedRNG: {
                    fatherlyProps: {
                        RNGString: `usingsides`,
                        get(RNG) {
                            const usingLeft = RNG() > 0.5;
                            const usingRight = !usingLeft || RNG() > 0.5;
                            const leftScale = (usingLeft ? Math.ceil(RNG() * 2)/10 : 0) + 0.4;
                            const rightScale = (usingRight ? Math.ceil(RNG() * 2)/10 : 0) + 0.4;
                            return {
                                usingLeft,
                                usingRight,
                                leftScale,
                                rightScale
                            }
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const babyStroke = {
                        color: cssColorToHex(raritySchema[cubeData.rarity].color),
                        thickness: 1,
                        matrix: [
                            [0, 1, 0],
                            [1, 0, 1],
                            [0, 1, 0]
                        ] as strokeMatrix
                    }
                    const babyPadding = Math.ceil(parts.icon[0].bitmap.width/4);
                    const leftBabyFrames = parsedRNG.fatherlyProps.usingLeft ? parts.icon.map(part => {
                        return strokeImageWithResize(part.clone().resize({ w: part.bitmap.width * parsedRNG.fatherlyProps.leftScale, h: part.bitmap.height * parsedRNG.fatherlyProps.leftScale, mode: ResizeStrategy.NEAREST_NEIGHBOR }) as JimpImage, [babyStroke]);
                    }) : [];
                    const rightBabyFrames = parsedRNG.fatherlyProps.usingRight ? parts.icon.map(part => {
                        return strokeImageWithResize(part.clone().resize({ w: part.bitmap.width * parsedRNG.fatherlyProps.rightScale, h: part.bitmap.height * parsedRNG.fatherlyProps.rightScale, mode: ResizeStrategy.NEAREST_NEIGHBOR }) as JimpImage, [babyStroke]);
                    }) : [];
                    for (let inputIndex = 0; inputIndex < input.length; inputIndex++) {
                        const inputFrame = input[inputIndex];

                        if (parsedRNG.fatherlyProps.usingRight) {
                            const rightBabyFrame = rightBabyFrames[inputIndex % rightBabyFrames.length];
                            inputFrame.composite(rightBabyFrame, inputFrame.bitmap.width - (rightBabyFrame.bitmap.width + babyPadding), inputFrame.bitmap.height - (rightBabyFrame.bitmap.height + (babyPadding * 2)));
                        }

                        if (parsedRNG.fatherlyProps.usingLeft) {
                            const leftBabyFrame = leftBabyFrames[inputIndex % leftBabyFrames.length];
                            inputFrame.composite(leftBabyFrame, babyPadding, inputFrame.bitmap.height - (leftBabyFrame.bitmap.height + (babyPadding * 2)));
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "meleagris": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/meleagris/tail.png`, { x: 16, y: 24, width: 32 }, 2)[prefixRenderSteps.foreground]
        }
    }),
    "pugilistic": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/pugilistic/back.png`,
            frontImagePath: `${prefixSourceDirectory}/pugilistic/front.png`,
            canvasModifiers: {
                scale: 1.5
            },
            predefinedRNG: {
                hueRotation: universalPrefixRNGs.hueRotation
            },
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                layerAnimation[0].color([{apply: 'hue', params: [parsedRNG.hueRotation]}]);

                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 5, y: 8, width: 32 });
            },
        })
    }),
    "censored": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/censored/text.png`, { x: 8, y: -4, width: 32 }, 1.5)
    }),
    "sick": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/sick/back.png`,
            frontImagePath: `${prefixSourceDirectory}/sick/front.png`,
            canvasModifiers: {
                scale: 1
            },
            predefinedRNG: {
                hueRotation: universalPrefixRNGs.hueRotation
            },
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                layerAnimation[0].color([{ apply: 'hue', params: [parsedRNG.hueRotation] }]);

                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 0, y: 8, width: 32 });
            },
        })
    }),
    "fearful": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 15,
                canvasScale: 2,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/fearful/animation.png`), 15), { x: -21, y: 17, width: 32 });
                    return true;
                },
            })
        }
    }),
    "drunken": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                frames: prefixRendererConsts.drunken.frames,
                predefinedRNG: {
                    leftOffset: {
                        RNGString: `leftOffsetDrunk`,
                        get: prefixRendererConsts.drunken.offsetGetter
                    },
                    leftCenterOffset: {
                        RNGString: `leftCenterOffsetDrunk`,
                        get: prefixRendererConsts.drunken.offsetGetter
                    },
                    rightCenterOffset: {
                        RNGString: `rightCenterOffsetDrunk`,
                        get: prefixRendererConsts.drunken.offsetGetter
                    },
                    rightOffset: {
                        RNGString: `rightOffsetDrunk`,
                        get: prefixRendererConsts.drunken.offsetGetter
                    }
                },
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const sloshedFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/drunken/sloshedanim.png`), prefixRendererConsts.drunken.frames);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...sloshedFrames.slice(parsedRNG.leftOffset, sloshedFrames.length), ...sloshedFrames.slice(0, parsedRNG.leftOffset)], { x: 6 - 32, y: 11, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...sloshedFrames.slice(parsedRNG.leftCenterOffset, sloshedFrames.length), ...sloshedFrames.slice(0, parsedRNG.leftCenterOffset)], { x: 16 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...sloshedFrames.slice(parsedRNG.rightCenterOffset, sloshedFrames.length), ...sloshedFrames.slice(0, parsedRNG.rightCenterOffset)], { x: 27 - 32, y: 16, width: 32 });
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [...sloshedFrames.slice(parsedRNG.rightOffset, sloshedFrames.length), ...sloshedFrames.slice(0, parsedRNG.rightOffset)], { x: 37 - 32, y: 11, width: 32 });
                    return true;
                },
            })
        }
    }),
    "comfortable": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                canvasScale: 2,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const pillowImage = await Jimp.read(`${prefixSourceDirectory}/comfortable/pillow.png`);
                    pillowImage.color([{ apply: "hue", params: [parsedRNG.hueRotation] }]);
                    pillowImage.composite(await Jimp.read(`${prefixSourceDirectory}/comfortable/tassels.png`));
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [pillowImage], { x: 8, y: 0, width: 32 });

                    return true;
                },
            })
        }
    }),
    "swag": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/swag/back.png`,
            frontImagePath: `${prefixSourceDirectory}/swag/front.png`,
            tags: [
                prefixRendererTags.needsHeads
            ],
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 0, y: 8, width: 32 });
            },
        })
    }),
    "stereoscopic": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/stereoscopic/back.png`,
            frontImagePath: `${prefixSourceDirectory}/stereoscopic/front.png`,
            tags: [
                prefixRendererTags.needsHeads
            ],
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 0, y: 8, width: 32 });
            },
        })
    }),
    "scientific": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1.5,
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                frames: 5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const flaskImage = parseHorizontalSpriteSheet((await Jimp.read(`${prefixSourceDirectory}/scientific/flask.png`)).color([{apply: 'hue', params: [parsedRNG.hueRotation]}]) as JimpImage, 5);
                    const targetSize = parts.icon[0].bitmap.width / 32;
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const compositingFrame = input[inputFrameIndex];
                        const flaskFrame = flaskImage[inputFrameIndex % flaskImage.length];
                        flaskFrame.resize({ w: Math.ceil(flaskFrame.bitmap.width * targetSize), h: Math.ceil(flaskFrame.bitmap.width * targetSize), mode: ResizeStrategy.NEAREST_NEIGHBOR });
                        compositingFrame.composite(flaskFrame, compositingFrame.bitmap.width - (flaskFrame.bitmap.width + 1), compositingFrame.bitmap.height - (flaskFrame.bitmap.height + 6));
                    }

                    return true;
                },
            })
        }
    }),
    "brainy": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/brainy/brain.png`, { x: 0, y: 12, width: 32 }, 1)
    }),
    "oriental": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/oriental/roof.png`, { x: 4, y: 18, width: 32 }, 2)
    }),
    "brilliant": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                canvasScale: 2.5,
                frames: 5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, await loadAnimatedCubeIcon(`${prefixSourceDirectory}/brilliant/bulb.png`), { x: 0, y: 31, width: 32 });

                    return true;
                },
            })
        }
    }),
    "collectible": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/collectible/back.png`,
            frontImagePath: `${prefixSourceDirectory}/collectible/front.png`,
            tags: [
                prefixRendererTags.needsHeads
            ],
            canvasModifiers: {
                scale: 1.5
            },
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 5, y: 14, width: 32 });
            },
        })
    }),
    "tumbling": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/tumbling/back.png`,
            frontImagePath: `${prefixSourceDirectory}/tumbling/front.png`,
            tags: [
                prefixRendererTags.needsHeads
            ],
            canvasModifiers: {
                scale: 3
            },
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 16, y: 19, width: 32 });
            },
        })
    }),
    "sparkly": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsAccents,
                    prefixRendererTags.granularSeed
                ],
                frames: prefixRendererConsts.sparkly.frames,
                flatCanvasPadding: 6,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const sparkles = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/sparkly/sparkles.png`);
                    const sparkleImageCompositeOffset = {
                        x: Math.ceil(((input[0].bitmap.width - parts.icon[0].bitmap.width) - sparkles[0].bitmap.width) / 2),
                        y: Math.ceil(((input[0].bitmap.width - parts.icon[0].bitmap.width) - sparkles[0].bitmap.height) / 2)
                    }
                    const seedGen = seedrandom(`sparkly${seed}`);

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const animationFrame = input[inputFrameIndex];
                        const accentFrame = parts.accents[inputFrameIndex % parts.accents.length];
                        accentFrame.scan(0, 0, accentFrame.bitmap.width, accentFrame.bitmap.height, function (x, y, idx) {
                            if (seedGen() > 0.985 && accentFrame.getPixelColor(x, y) === 0xffffffff) {
                                animationFrame.composite(sparkles[Math.floor(sparkles.length * seedGen())], x + sparkleImageCompositeOffset.x, y + sparkleImageCompositeOffset.y);
                            }
                        })
                    }

                    return true;
                },
            })
        }
    }),
    "adorable": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsHeads
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation,
                    bowType: {
                        RNGString: `bowtie-p`,
                        get(RNG) {
                            return Math.floor(RNG() * 7);
                        },
                    }
                },
                canvasScale: 2,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const bow = (await loadAnimatedCubeIcon(`${prefixSourceDirectory}/adorable/bows.png`))[parsedRNG.bowType];
                    bow.color([{apply: 'hue', params: [parsedRNG.hueRotation]}]);
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [bow], { x: -19, y: 7, width: 32 });

                    return true;
                },
            })
        }
    }),
    "hurt": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                canvasScale: 1,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed,
                    prefixRendererTags.needsIcon
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const seedGen = seedrandom(`hurt${seed}`);
                    const baseFrame = new Jimp({width: parts.icon[0].bitmap.width, height: parts.icon[0].bitmap.height, color: 0x00000000});


                    let baseBandaidImage = await Jimp.read(`${prefixSourceDirectory}/hurt/bandaid.png`);

                    const baseBandaids = Math.ceil(((parts.icon[0].bitmap.width * parts.icon[0].bitmap.height) / 1024) * 2);
                    const bandaidsOnFrame = baseBandaids + Math.round(seedGen() * baseBandaids);

                    const bandaidPositionDeadZone = 0.1;
                    const bandaidPositionOffset = baseFrame.bitmap.width * bandaidPositionDeadZone;
                    const bandaidPositionRange = baseFrame.bitmap.width * (1 - (bandaidPositionDeadZone * 2));
                    const maxRotation = 60;

                    const bandaidPositions: { x: number, y: number }[] = [];
                    const minBandaidDistance = 15;
                    let loopTimes = 0;
                    for (let bandaidIndex = 0; bandaidIndex < bandaidsOnFrame && loopTimes < 100; bandaidIndex++) {
                        loopTimes++;
                        let newKissPosition = {
                            x: Math.round(bandaidPositionOffset + (seedGen() * bandaidPositionRange) - (baseBandaidImage.bitmap.width / 2)),
                            y: Math.round(bandaidPositionOffset + (seedGen() * bandaidPositionRange) - (baseBandaidImage.bitmap.width / 2))
                        };
                        if (bandaidPositions.find(position => Math.sqrt(((position.x - newKissPosition.x) ** 2) + ((position.y - newKissPosition.y) ** 2)) < minBandaidDistance)) {
                            bandaidIndex--;
                        } else {
                            bandaidPositions.push(newKissPosition);
                            let newBandaidImage = baseBandaidImage.clone().rotate(Math.round((maxRotation * seedGen()) - (maxRotation / 2)));
                            baseFrame.composite(newBandaidImage, newKissPosition.x, newKissPosition.y);
                        }
                    }
                    const shadowSize = 1;
                    strokeImage(baseFrame, 0x00000022, shadowSize, false, undefined, true);
                    for (let iconFrameIndex = 0; iconFrameIndex < input.length; iconFrameIndex++) {
                        const iconFrame = input[iconFrameIndex];
                        const cubeFrame = parts.icon[iconFrameIndex % parts.icon.length];
                        iconFrame.composite(baseFrame);
                        cubeFrame.scan(function (x, y, idx) {
                            if (cubeFrame.bitmap.data[idx + 3] === 0) {
                                iconFrame.setPixelColor(0x00000000, x, y);
                            }
                        });
                    }
                    return true;
                },
            })
        }
    }),
    "ailurophilic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                flatCanvasPadding: 5,
                predefinedRNG: {
                    catPattern: {
                        RNGString: 'catpattern',
                        get(RNG) {
                            return Math.floor(RNG() * 3);
                        },
                    },
                    flipped: {
                        RNGString: 'flipped',
                        get(RNG) {
                            return RNG() > 0.5;
                        }
                    },
                    catPalette: {
                        RNGString: 'catpalette',
                        get(RNG) {
                            return Math.floor(RNG() * 5);
                        }
                    }
                },
                frames: 10,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const catSpriteSheet = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/ailurophilic/basecat.png`), 10);
                    const catPatternSheet = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/ailurophilic/catpattern${parsedRNG.catPattern}.png`), 10);
                    const catPalette = await Jimp.read(`${prefixSourceDirectory}/ailurophilic/catpallettes.png`);
                    const compositePosition = parsedRNG.flipped ? {
                        x: 0,
                        y: input[0].bitmap.height - catSpriteSheet[0].bitmap.height - 2
                    } : {
                        x: input[0].bitmap.width - catSpriteSheet[0].bitmap.width,
                        y: input[0].bitmap.height - catSpriteSheet[0].bitmap.height - 2
                    }

                    const paletteMap = {
                        0xeeeeeeff: catPalette.getPixelColor(parsedRNG.catPalette, 0),
                        0xbdbdbdff: catPalette.getPixelColor(parsedRNG.catPalette, 1),
                        0x9e9e9eff: catPalette.getPixelColor(parsedRNG.catPalette, 2),
                        0xff0000ff: catPalette.getPixelColor(parsedRNG.catPalette, 3),
                        0xcc0000ff: catPalette.getPixelColor(parsedRNG.catPalette, 4)
                    }

                    for (let catSpriteSheetIndex = 0; catSpriteSheetIndex < catSpriteSheet.length; catSpriteSheetIndex++) {
                        const catSprite = catSpriteSheet[catSpriteSheetIndex];
                        catSprite.composite(catPatternSheet[catSpriteSheetIndex], 0, 0);
                        catSprite.scan(0, 0, catSprite.bitmap.width, catSprite.bitmap.height, function (x, y, idx) {
                            const sourceColor = catSprite.getPixelColor(x, y);
                            // @ts-ignore 
                            const foundColor = paletteMap[sourceColor] ?? 0x00000000;
                            if (foundColor !== 0x00000000) {
                                catSprite.setPixelColor(foundColor, x, y);
                            }
                        });
                        if (!parsedRNG.flipped) catSprite.flip({ horizontal: true });
                    }

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const catFrame = catSpriteSheet[inputFrameIndex % catSpriteSheet.length];
                        inputFrame.composite(catFrame, compositePosition.x, compositePosition.y);
                    }

                    return true;
                },
            })
        }
    }),
    "fake": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIconDimensions
                ],
                flatCanvasPadding: 2,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const colors = [0xf2f2f2ff, 0xc2c2c2ff];

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        inputFrame.scan(function (x, y, idx) {
                            inputFrame.setPixelColor(colors[(x + y) % 2], x, y);
                        })
                    }

                    return true;
                },
            })
        }
    }),
    "glinting": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsAccents
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation,
                    sinAmplitude: {
                        RNGString: `sineprops`,
                        get(RNG) {
                            return Math.ceil(RNG() * 5) + 1;
                        },
                    }
                },
                frames: 30,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const glintOverlay = await Jimp.read(`${prefixSourceDirectory}/glinting/glint.png`);
                    glintOverlay.color([{ apply: "hue", params: [parsedRNG.hueRotation] }]);
                    for (let newFrameIndex = 0; newFrameIndex < input.length; newFrameIndex++) {
                        const inputFrame = input[newFrameIndex];
                        inputFrame.composite(parts.accents[newFrameIndex % parts.accents.length]);
                        const animationProgress = newFrameIndex / input.length;
                        const yOffset = Math.round(Math.sin(animationProgress * 2 * Math.PI) * parsedRNG.sinAmplitude);
                        const xOffset = Math.round(animationProgress * glintOverlay.bitmap.width);
                        inputFrame.scan(function (x, y, idx) {
                            if (inputFrame.bitmap.data[idx + 3] > 0) inputFrame.setPixelColor(glintOverlay.getPixelColor((x + xOffset) % glintOverlay.bitmap.width, (y + yOffset) % glintOverlay.bitmap.height), x, y);
                        })
                    }
                    return true;
                }
            })
        }
    }),
    "conspicuous": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIconDimensions
                ],
                flatCanvasPadding: 12,
                predefinedRNG: {
                    evidence: {
                        RNGString: `evidencenum`,
                        get(RNG) {
                            return Math.floor(RNG() * 9);
                        },
                    },
                    flipped: {
                        RNGString: `evidenceflip`,
                        get(RNG) {
                            return RNG() > 0.5;
                        }
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const evidenceTagSheet = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/conspicuous/crimemarkers.png`), 9);
                    const compositePosition = parsedRNG.flipped ? {
                        x: 0,
                        y: input[0].bitmap.height - (evidenceTagSheet[0].bitmap.height / 2) - 2
                    } : {
                        x: input[0].bitmap.width - evidenceTagSheet[0].bitmap.width,
                        y: input[0].bitmap.height - (evidenceTagSheet[0].bitmap.height / 2) - 2
                    }

                    const usingSprite = evidenceTagSheet[parsedRNG.evidence];
                    const spriteHeight = usingSprite.bitmap.height / 2;
                    const spriteWidth = usingSprite.bitmap.width;

                    if (parsedRNG.flipped) {
                        usingSprite.crop({x: 0, y: spriteHeight, w: spriteWidth, h: spriteHeight});
                    } else {
                        usingSprite.crop({x: 0, y: 0, w: spriteWidth, h: spriteHeight});
                    }

                    input[0].composite(usingSprite, compositePosition.x, compositePosition.y);

                    return true;
                },
            })
        }
    }),
    "voodoo": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed,
                    prefixRendererTags.needsEyes,
                    prefixRendererTags.needsIcon
                ],
                flatCanvasPadding: 16,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let seedGen = seedrandom(`voodoo${seed}`);
                    const pinBobSheet = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/voodoo/pins.png`), 3);
                    const bobCompositeOffset = {
                        x: -Math.floor(pinBobSheet[0].bitmap.width / 2),
                        y: -Math.floor(pinBobSheet[0].bitmap.height / 2)
                    }
                    const crosseyeImage = await Jimp.read(`${prefixSourceDirectory}/voodoo/crosseye.png`);

                    const pins = generateProtrudingLines(input, parts.icon, seedGen, { minCount: 5, maxCount: 10, minLength: 8 });
                    const pinBobs: JimpImage[] = [];
                    for (let pinIndex = 0; pinIndex < pins[0].length; pinIndex++) {
                        const newBob = pinBobSheet[Math.floor(pinBobSheet.length * seedGen())].clone();
                        newBob.color([{ apply: 'hue', params: [360 * seedGen()] }]);
                        pinBobs.push(newBob);
                    }

                    for (let pinFrameIndex = 0; pinFrameIndex < pins.length; pinFrameIndex++) {
                        const pinsThisFrame = pins[pinFrameIndex];
                        const iconFrame = input[pinFrameIndex % input.length];
                        for (let pinIndex = 0; pinIndex < pinsThisFrame.length; pinIndex++) {
                            const pin = pinsThisFrame[pinIndex];
                            const pinBob = pinBobs[pinIndex % pinBobs.length];
                            drawLine(iconFrame, 0x4a4a4aff, pin.start, { x: pin.end.x, y: pin.end.y + 1 });
                            drawLine(iconFrame, 0x696969ff, pin.start, pin.end);
                            iconFrame.composite(pinBob, bobCompositeOffset.x + pin.end.x, bobCompositeOffset.y + pin.end.y);
                            // iconFrame.setPixelColor(0xff0000ff, pin.start.x, pin.start.y);
                            // iconFrame.setPixelColor(0x00ff00ff, pin.end.x, pin.end.y);
                        }
                    }

                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [ crosseyeImage ]);

                    return true;
                },
            })
        }
    }),
    "annoyed": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                ],
                canvasScale: 2,
                frames: 15,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/annoyed/fuzzball.png`), 5), { x: 0, y: 27, width: 32 });

                    return true;
                },
            })
        }
    }),
    "zammin": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                dontRenderWithPrefixesPresent: [
                    "typing"
                ],
                affectedByOtherPrefixes: [
                    "acquiescing"
                ],
                flatCanvasPadding: 45,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let animation: JimpImage;
                    if (otherPrefixes.includes("acquiescing")) {
                        animation = await Jimp.read(`${prefixSourceDirectory}/zamminacquiescing/sighzamn.png`);
                    } else {
                        animation = await Jimp.read(`${prefixSourceDirectory}/zamminacquiescing/zamn.png`);
                    }

                    const bubbleDistance = 2;
                    compositeHeadsToAllFramesWithoutScaling(input, parts.icon[0], parts.heads, [ animation ], { x: bubbleDistance, y: -(bubbleDistance + animation.bitmap.height) }, true);

                    return true;
                },
            })
        }
    }),
    "rdming": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                predefinedRNG: {
                    gravGunColor: {
                        RNGString: `gravgun`,
                        get(RNG) {
                            return prefixRendererConsts.rdming.possibleGravGunColors[Math.floor(prefixRendererConsts.rdming.possibleGravGunColors.length * RNG())];
                        },
                    }
                },
                flatCanvasPadding: prefixRendererConsts.rdming.animationPadding,
                frames: 15,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const animationPadding = prefixRendererConsts.rdming.animationPadding;
                    const divisions = 8;
                    const maxReferenceAngle = (Math.PI * 2) / (divisions * 2);
                    const desiredFrames = input.length;

                    const iconCenterPosition = {
                        x: Math.floor(input[0].bitmap.width / 2),
                        y: Math.floor(input[0].bitmap.height / 2),
                    }
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const iconFrame = parts.icon[inputFrameIndex % parts.icon.length];
                        const angleAddition = (Math.PI * inputFrameIndex) / (desiredFrames * divisions);
                        const newFrame = input[inputFrameIndex];
                        newFrame.scan(0, 0, newFrame.bitmap.width, newFrame.bitmap.height, function (newX, newY, idx) {
                            const x = newX - animationPadding;
                            const y = newY - animationPadding;
                            const originalIndex = iconFrame.getPixelIndex(x, y);
                            const checkingPositions = [
                                { x: x - 2, y: y - 2 },
                                { x: x - 1, y: y - 2 },
                                { x: x, y: y - 2 },
                                { x: x + 1, y: y - 2 },
                                { x: x + 2, y: y - 2 },
                                { x: x + 2, y: y - 1 },
                                { x: x + 2, y: y },
                                { x: x + 2, y: y + 1 },
                                { x: x + 2, y: y + 2 },
                                { x: x + 1, y: y + 2 },
                                { x: x, y: y + 2 },
                                { x: x - 1, y: y + 2 },
                                { x: x - 2, y: y + 2 },
                                { x: x - 2, y: y + 1 },
                                { x: x - 2, y: y },
                                { x: x - 2, y: y - 1 },
                            ]
                            if ((iconFrame.bitmap.data[originalIndex + 3] === 0 || x < 0 || x >= iconFrame.bitmap.width || y < 0 || y >= iconFrame.bitmap.height) && checkingPositions.some(coord => iconFrame.bitmap.data[iconFrame.getPixelIndex(coord.x, coord.y) + 3] > 0)) {
                                let pixelAngle = Math.atan2(-(y - iconCenterPosition.y), x - iconCenterPosition.x);
                                if (pixelAngle < 0) pixelAngle += Math.PI;
                                pixelAngle = (pixelAngle + angleAddition) % maxReferenceAngle;
                                if (0 < pixelAngle && pixelAngle < maxReferenceAngle / 2) {
                                    newFrame.setPixelColor(parsedRNG.gravGunColor, x + animationPadding, y + animationPadding)
                                }
                                if (pixelAngle < 0) console.log(pixelAngle * (180 / Math.PI), x, y);
                            }
                        });
                    }

                    return true;
                },
            }),
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                flatCanvasPadding: 2,
                predefinedRNG: {
                    gravGunColor: {
                        RNGString: `gravgun`,
                        get(RNG) {
                            return prefixRendererConsts.rdming.possibleGravGunColors[Math.floor(prefixRendererConsts.rdming.possibleGravGunColors.length * RNG())];
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        strokeImage(inputFrame, parsedRNG.gravGunColor, 1, false, undefined, true);
                    }

                    return true;
                },
            })
        }
    }),
    "acquiescing": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                dontRenderWithPrefixesPresent: [
                    "zammin",
                    "typing"
                ],
                tags: [
                    prefixRendererTags.needsHeads
                ],
                flatCanvasPadding: 45,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let animation: JimpImage = await Jimp.read(`${prefixSourceDirectory}/zamminacquiescing/sigh.png`);

                    const bubbleDistance = 2;
                    compositeHeadsToAllFramesWithoutScaling(input, parts.icon[0], parts.heads, [animation], { x: bubbleDistance, y: -(bubbleDistance + animation.bitmap.height) }, true);

                    return true;
                },
            })
        }
    }),
    "fuming": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                ...structuredClone(prefixRendererConsts.fuming.sharedLayerAttributes),
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const steamFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/fuming/steam.png`), prefixRendererConsts.fuming.sharedLayerAttributes.frames);
                    for (let steamFrameIndex = 0; steamFrameIndex < steamFrames.length; steamFrameIndex++) {
                        const steamFrame = steamFrames[steamFrameIndex];
                        steamFrame.flip({ horizontal: true });
                    }

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, steamFrames, { x: -24, y: -4, width: 32 });

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                ...structuredClone(prefixRendererConsts.fuming.sharedLayerAttributes),
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const steamFrames = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/fuming/steam.png`), prefixRendererConsts.fuming.sharedLayerAttributes.frames);
                    
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, steamFrames, { x: 9, y: 0, width: 32 });

                    return true;
                },
            }),
        }
    }),
    "dlc": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.dlc.applicationStep,
            [prefixRenderSteps.applyToBackground]: prefixRendererConsts.dlc.applicationStep,
            [prefixRenderSteps.applyToForeground]: prefixRendererConsts.dlc.applicationStep
        }
    }),
    "feminine": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 25,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                affectedByOtherPrefixes: [
                    "masculine"
                ],
                dontRenderWithPrefixesPresent: [
                    "thinking"
                ],
                frames: 5,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let animation: JimpImage[];
                    if (otherPrefixes.includes("masculine")) {
                        animation = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/masculinefeminine/both.png`), 5);
                    } else {
                        animation = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/masculinefeminine/feminine.png`), 5);
                    }

                    const bubbleDistance = 0;
                    compositeHeadsToAllFramesWithoutScaling(input, parts.icon[0], parts.heads, animation, { x: bubbleDistance, y: -bubbleDistance - animation[0].bitmap.height }, true);

                    return true;
                },
            })
        }
    }),
    "masculine": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 25,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                dontRenderWithPrefixesPresent: [
                    "thinking",
                    "feminine"
                ],
                frames: 5,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let animation = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/masculinefeminine/masculine.png`), 5);

                    const bubbleDistance = 0;
                    compositeHeadsToAllFramesWithoutScaling(input, parts.icon[0], parts.heads, animation, { x: bubbleDistance, y: -bubbleDistance - animation[0].bitmap.height }, true);

                    return true;
                },
            })
        }
    }),
    "ornamentalized": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                flatCanvasPadding: 10,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsAccents,
                    prefixRendererTags.granularSeed
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    let seedGen = seedrandom(`ornamentalized${seed}`);
                    let possibleOrnaments = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/ornamentalized/ornaments.png`), 5);
                    let hookOverlay = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/ornamentalized/hook.png`), 5)[0];
                    let shadingOverlay = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/ornamentalized/shading.png`), 5)[0];

                    let generatedOrnaments: { position: { x: number, y: number }, ornament: JimpImage }[] = [];
                    const eligibilityFunction = function (frame: JimpImage, x: number, y: number): boolean {
                        return frame.bitmap.data[frame.getPixelIndex(x, y) + 3] > 0 && frame.bitmap.data[frame.getPixelIndex(x, y + 1) + 3] === 0 && frame.bitmap.data[frame.getPixelIndex(x, y + 2) + 3] === 0
                    }
                    const minOrnamentDistance = possibleOrnaments[0].bitmap.width;

                    let failsafe = 0;
                    while (generatedOrnaments.length == 0 && failsafe < Math.pow(minOrnamentDistance, 2)) {
                        const referenceAccentFrame = parts.accents[0];
                        referenceAccentFrame.scan(0, 0, referenceAccentFrame.bitmap.width, referenceAccentFrame.bitmap.height, function (x, y, idx) {
                            if (y < referenceAccentFrame.bitmap.height - 1) {
                                failsafe++;
                                if (eligibilityFunction(referenceAccentFrame, x, y)) {
                                    if (seedGen() > 0.96 && !generatedOrnaments.some(pixel => Math.sqrt(((pixel.position.x - x) ** 2) + ((pixel.position.y - y) ** 2)) < minOrnamentDistance)) {
                                        const newOrnament = possibleOrnaments[Math.floor(seedGen() * possibleOrnaments.length)].clone();
                                        newOrnament.color([{ apply: "hue", params: [Math.floor(seedGen() * 360)] }]);
                                        newOrnament.composite(hookOverlay, 0, 0);
                                        if (seedGen() > 0.5) newOrnament.flip({ horizontal: true });
                                        newOrnament.composite(shadingOverlay, 0, 0);
                                        generatedOrnaments.push({ position: { x, y }, ornament: newOrnament });
                                        failsafe = 0;
                                    }
                                }
                            }
                        })
                    }

                    parts.accents.forEach((frame, index) => {
                        if (index !== 0) {
                            generatedOrnaments = generatedOrnaments.filter((generatedOrnament) => {
                                return eligibilityFunction(frame, generatedOrnament.position.x, generatedOrnament.position.y);
                            })
                        }
                    })

                    const inputIconOffset = {
                        x: Math.floor( (input[0].bitmap.width - parts.accents[0].bitmap.width) / 2),
                        y: Math.floor( (input[0].bitmap.height - parts.accents[0].bitmap.height) / 2)
                    }
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        for (let ornamentIndex = 0; ornamentIndex < generatedOrnaments.length; ornamentIndex++) {
                            const ornament = generatedOrnaments[ornamentIndex];
                            inputFrame.composite(ornament.ornament, (ornament.position.x + inputIconOffset.x) - Math.floor(ornament.ornament.bitmap.width / 2), (ornament.position.y + inputIconOffset.y) - 1);
                        }
                    }

                    return true;
                },
            })
        }
    }),
    "expensive": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsEyes
                ],
                flatCanvasPadding: 10,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const moneyEye = await Jimp.read(`${prefixSourceDirectory}/expensive/moneyeye.png`);

                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, [moneyEye]);

                    return true;
                },
            })
        }
    }),
    "hyaline": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsAccents,
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed
                ],
                frames: 15,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const desiredFrames = input.length;
                    const seedGen = seedrandom(`hyaline${seed}`);

                    const sheenImageYScale = 3;
                    const sheenImage = new Jimp({ width: 1, height: Math.ceil(input[0].bitmap.height * sheenImageYScale)});
                    let previousWasAdded = false;
                    sheenImage.scan((x, y, idx) => {
                        const seedThereshold = previousWasAdded ? 0.33 : 0.98;
                        if (seedGen() > seedThereshold || y === 0) {
                            sheenImage.setPixelColor(0xffffffff, x, y);
                            previousWasAdded = true;
                        } else {
                            previousWasAdded = false;
                        }
                    })

                    for (let newFrameIndex = 0; newFrameIndex < desiredFrames; newFrameIndex++) {
                        const inputFrame = input[newFrameIndex];
                        const accentFrame = parts.accents[newFrameIndex % parts.accents.length];
                        const iconFrame = parts.icon[newFrameIndex % parts.icon.length];
                        const sheenFrame = newFrameIndex;

                        inputFrame.scan(function (x, y, idx) {
                            const sheenIndex = Math.ceil(x + y + 1 + (sheenFrame * (sheenImageYScale) * (iconFrame.bitmap.height / desiredFrames))) % sheenImage.bitmap.height;
                            if (sheenImage.getPixelColor(0, sheenIndex) !== 0) {
                                if (accentFrame.bitmap.data[accentFrame.getPixelIndex(x, y) + 3] > 0) {
                                    inputFrame.setPixelColor(0xffffff88, x, y);
                                } else if (iconFrame.bitmap.data[iconFrame.getPixelIndex(x, y) + 3] > 0) {
                                    inputFrame.setPixelColor(0xffffff22, x, y);
                                }
                            }
                        })
                    }

                    return true;
                },
            })
        }
    }),
    "sussy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsIcon
                ],
                predefinedRNG: {
                    missingHP: {
                        RNGString: `sussyhp`,
                        get: universalPrefixRNGs.normalizedScalar.get
                    },
                    missingStamina: {
                        RNGString: `sussystamina`,
                        get: universalPrefixRNGs.normalizedScalar.get
                    }
                },
                flatCanvasPadding: 14,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const espPadding = 3;
                    const shadowColor = 0x242424ff;

                    const shadowMatrix: strokeMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 1]];
                    const barOutlineMatrix: strokeMatrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
                    const barHeight = parts.icon[0].bitmap.height + 4;
                    const cubeHPImage = strokeImageWithResize(
                        new Jimp({ width: 1, height: barHeight, color: 0x479639ff }),
                        [
                            { color: 0x345934ff, thickness: 1, matrix: barOutlineMatrix },
                            { color: shadowColor, thickness: 1, matrix: shadowMatrix }
                        ]
                    );
                    const cubeStaminaImage = strokeImageWithResize(
                        new Jimp({ width: 1, height: barHeight, color: 0xbf8e47ff }),
                        [
                            { color: 0x594a34ff, thickness: 1, matrix: barOutlineMatrix },
                            { color: shadowColor, thickness: 1, matrix: shadowMatrix }
                        ]
                    );

                    fillRect(cubeStaminaImage, 2, 2, 1, Math.floor(parsedRNG.missingStamina * barHeight), shadowColor);
                    fillRect(cubeHPImage, 2, 2, 1, Math.floor(parsedRNG.missingHP * barHeight), shadowColor);
                    
                    let usingCubeName = cubeData.name.split(' ')[0].slice(0, 6);
                    if (usingCubeName !== cubeData.name) usingCubeName = `${usingCubeName}_`;
                    const cubeNameImage = strokeImageWithResize(await generateSmallWordImage(usingCubeName.toUpperCase(), 0x00000000, cssColorToHex(raritySchema[cubeData.rarity].color), 0), [ { color: shadowColor, thickness: 1, matrix: [[0,0,0], [0,0,0], [1,0,0]] } ]);
                    cubeNameImage.rotate({ deg: 90 });

                    const iconWidth = parts.icon[0].bitmap.width;
                    const iconHeight = parts.icon[0].bitmap.height;
                    const inputIconOffset = {
                        x: ((input[0].bitmap.width - iconWidth) / 2),
                        y: ((input[0].bitmap.height - iconHeight) / 2)
                    }

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];

                        const headsThisFrame = parts.heads[inputFrameIndex % parts.heads.length];
                        for (let cubeHeadIndex = 0; cubeHeadIndex < headsThisFrame.length; cubeHeadIndex++) {
                            const cubeHead = headsThisFrame[cubeHeadIndex];
                            fillHollowRect(inputFrame, (inputIconOffset.x + 1 + cubeHead.x) - espPadding, (inputIconOffset.y + 1 + cubeHead.y) - (espPadding + Math.floor(cubeHead.width * 0.25)), cubeHead.width + (espPadding * 2), cubeHead.width + (espPadding * 2), shadowColor);
                            fillHollowRect(inputFrame, (inputIconOffset.x + cubeHead.x) - espPadding, (inputIconOffset.y + cubeHead.y) - (espPadding + Math.floor(cubeHead.width * 0.25)), cubeHead.width + (espPadding * 2), cubeHead.width + (espPadding * 2), 0xcf2929ff);
                        }

                        inputFrame.composite(cubeStaminaImage, inputIconOffset.x + iconWidth + 9, inputIconOffset.y - 4);
                        inputFrame.composite(cubeHPImage, inputIconOffset.x + iconWidth + 4, inputIconOffset.y - 4);
                        inputFrame.composite(cubeNameImage, inputIconOffset.x - (cubeNameImage.bitmap.width + 5), (inputIconOffset.y + iconHeight + 2) - (cubeNameImage.bitmap.height));
                    }

                    return true;
                },
            })
        }
    }),
    "dotted": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.dotted.applicationStep,
            [prefixRenderSteps.applyToBackground]: prefixRendererConsts.dotted.applicationStep,
            [prefixRenderSteps.applyToForeground]: prefixRendererConsts.dotted.applicationStep
        }
    }),
    "idiotic": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/idiotic/dunce.png`, { x: 0, y: 22, width: 32 }, 2)
    }),
    "sleepy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation
                },
                canvasScale: 1.5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const capImage = await Jimp.read(`${prefixSourceDirectory}/sleepy/nightcap.png`);
                    capImage.color([{apply: "hue", params: [ parsedRNG.hueRotation ]}]);

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [ capImage ], { x: 8, y: 16, width: 32 });

                    return true;
                },
            })
        }
    }),
    "disgusted": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/disgusted/disgusted.png`, { x: -22, y: 8, width: 32 }, 2) 
    }),
    "hypnotic": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                frames: 10,
                tags: [
                    prefixRendererTags.needsEyes
                ],
                flatCanvasPadding: 3,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const hypnoticEyes = parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/hypnotic/hypnotic.png`), 10);
                    compositeEyesToAllFrames(input, parts.icon[0], parts.eyes, hypnoticEyes);
                    return true;
                },
            })
        }
    }),
    "nailed": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed,
                    prefixRendererTags.needsIcon
                ],
                flatCanvasPadding: 16,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const seedGen = seedrandom(`nailed${seed}`);
                    const lines = generateProtrudingLines(input, parts.icon, seedGen, { maxCount: 16, minCount: 7, minLength: 5, maxLength: 9 });
                    const nailHeadLength = 2;
                    const nailColors: number[] = [];
                    for (let lineIndex = 0; lineIndex < lines[0].length; lineIndex++) {
                        const nailChannelColor = Math.floor(seedGen() * 50) + 50;
                        nailColors.push((nailChannelColor * ( 2 ** 24 )) + (nailChannelColor * ( 2 ** 16 )) + (nailChannelColor * ( 2 ** 8 )) + 255)
                    }

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const linesThisFrame = lines[inputFrameIndex % lines.length];
                        for (let lineIndex = 0; lineIndex < linesThisFrame.length; lineIndex++) {
                            const line = linesThisFrame[lineIndex];
                            const nailColor = nailColors[lineIndex % nailColors.length];
                            drawLine(inputFrame, nailColor, line.start, line.end);
                            const nailHeadAngle = Math.atan2(line.start.y - line.end.y, line.start.x - line.end.x) + (Math.PI / 2);
                            const nailHeadEndPositionModifier = { x: Math.round(Math.cos(nailHeadAngle) * nailHeadLength), y: Math.round(Math.sin(nailHeadAngle) * nailHeadLength) };
                            drawLine(inputFrame, nailColor, { x: line.end.x + nailHeadEndPositionModifier.x, y: line.end.y + nailHeadEndPositionModifier.y }, { x: line.end.x - nailHeadEndPositionModifier.x, y: line.end.y - nailHeadEndPositionModifier.y });
                        }

                        // strokeImage(inputFrame, 0x424242ff, 1, false, [[0,0,0],[0,0,0],[0,1,0]], true);
                    }

                    return true;
                },
            })
        }
    }),
    "farmboy": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsMouths
                ],
                canvasScale: 2,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeMouthsToAllFrames(input, parts.icon[0], parts.mouths, [ await Jimp.read(`${prefixSourceDirectory}/farmboy/farmboy.png`) ], { x: 20, y: 4, width: 4 });
                    return true;
                },
            })
        }
    }),
    "blurry": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.blurry.renderStep,
            // [prefixRenderSteps.applyToBackground]: prefixRendererConsts.blurry.renderStep,
            // [prefixRenderSteps.applyToForeground]: prefixRendererConsts.blurry.renderStep,
        }
    }),
    "obfuscating": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.obfuscating.renderStep,
            // [prefixRenderSteps.applyToBackground]: prefixRendererConsts.obfuscating.renderStep,
            // [prefixRenderSteps.applyToForeground]: prefixRendererConsts.obfuscating.renderStep,
        }
    }),
    "inverted": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.inverted.renderStep,
            // [prefixRenderSteps.applyToBackground]: prefixRendererConsts.inverted.renderStep,
            // [prefixRenderSteps.applyToForeground]: prefixRendererConsts.inverted.renderStep,
        }
    }),
    "broken": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: prefixRendererConsts.broken.renderStep,
            // [prefixRenderSteps.applyToBackground]: prefixRendererConsts.broken.renderStep,
            // [prefixRenderSteps.applyToForeground]: prefixRendererConsts.broken.renderStep,
        }
    }),
    "angery": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIconDimensions
                ],
                canvasScale: 1.5,
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const middleFingerImage = await Jimp.read(`${prefixSourceDirectory}/angery/middlefinger.png`);
                    const targetSize = parts.icon[0].bitmap.width / 48;
                    middleFingerImage.resize({ w: Math.ceil(middleFingerImage.bitmap.width * targetSize), h: Math.ceil(middleFingerImage.bitmap.height * targetSize), mode: ResizeStrategy.NEAREST_NEIGHBOR });

                    const compositingFrame = input[0];
                    compositingFrame.composite(middleFingerImage, compositingFrame.bitmap.width - (middleFingerImage.bitmap.width + 7), compositingFrame.bitmap.height - (middleFingerImage.bitmap.height + 6));

                    return true;
                },
            })
        }
    }),
    "despairing": constructPrefixRenderer({
        renderSteps: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/despairing/despairing.png`, { x: 8, y: 16, width: 32 }, 2)
    }),
    "dookied": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({ 
                frames: 5,
                canvasScale: 2,
                tags: [
                    prefixRendererTags.needsHeads
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/dookied/dookied.png`), 2), { x: -1, y: 25, width: 32 })
                    return true;
                },
            })
        }
    }),
    "grinning": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                predefinedRNG: {
                    mouth: {
                        RNGString: `mouthtype`,
                        get(RNG) {
                            return Math.floor(RNG() * 6);
                        },
                    }
                },
                tags: [
                    prefixRendererTags.needsMouths,
                    prefixRendererTags.isSeeded
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    compositeMouthsToAllFrames(input, parts.icon[0], parts.mouths, [(parseHorizontalSpriteSheet(await Jimp.read(`${prefixSourceDirectory}/grinning/mouths.png`), 6))[parsedRNG.mouth]], { x: 6, y: 5, width: 4 });
                    return true;
                },
            })
        }
    }),
    "scrumptious": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsHeads,
                    prefixRendererTags.isSeeded
                ],
                canvasScale: 2,
                predefinedRNG: {
                    hueRotation: universalPrefixRNGs.hueRotation,
                    detailOffset: universalPrefixRNGs.normalizedScalar
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const frontBowlImage = await Jimp.read(`${prefixSourceDirectory}/scrumptious/front.png`);
                    const detailImage = await Jimp.read(`${prefixSourceDirectory}/scrumptious/detailing.png`);
                    detailImage.color([{apply: 'hue', params: [parsedRNG.hueRotation]}])
                    const maskImage = await Jimp.read(`${prefixSourceDirectory}/scrumptious/detailingmask.png`);
                    const detailSampleOffset = {
                        x: Math.floor(parsedRNG.detailOffset * detailImage.bitmap.width),
                        y: Math.floor(parsedRNG.detailOffset * detailImage.bitmap.height)
                    }
                    maskImage.scan((x, y, idx) => {
                        if (maskImage.bitmap.data[idx + 3] > 0) {
                            maskImage.setPixelColor(detailImage.getPixelColor((x + detailSampleOffset.x) % detailImage.bitmap.width, (y + detailSampleOffset.y) % detailImage.bitmap.height), x, y);
                        }
                    })
                    frontBowlImage.composite(maskImage);
                    frontBowlImage.composite(await Jimp.read(`${prefixSourceDirectory}/scrumptious/shading.png`));

                    compositeHeadsToAllFrames(input, parts.icon[0], parts.heads, [frontBowlImage], { x: 16, y: 27, width: 32 })

                    return true;
                },
            }),
            [prefixRenderSteps.background]: constructBasicHatPrefixRendererStep(`${prefixSourceDirectory}/scrumptious/back.png`, { x: 16, y: 27, width: 32 }, 2)[prefixRenderSteps.foreground]
        }
    }),
    "constructive": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                flatCanvasPadding: 16,
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.granularSeed,
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const blueprintImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height, color: 0x112243ff });

                    const seedGen = seedrandom(`constructive${seed}`);
                    const doodles = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/constructive/doodles.png`);
                    const doodleMin = 3;
                    const doodleCount = Math.floor(seedGen() * (doodleMin / 2)) + doodleMin;
                    const doodlePositions: { x: number, y: number }[] = [];
                    let minDoodleDistance = doodles[0].bitmap.width * 2;

                    let iterationsSinceLastPositionFound = 0;
                    const doodlePositionEdgeDeadzone = Math.ceil(doodles[0].bitmap.width / 2) + 1;
                    const centerPosition = {
                        x: blueprintImage.bitmap.width / 2,
                        y: blueprintImage.bitmap.height / 2
                    }
                    const centerDeadzoneRadius = parts.icon[0].bitmap.width / 2;
                    while (doodlePositions.length < doodleCount) {
                        const newPosition = {
                            x: Math.floor(seedGen() * (blueprintImage.bitmap.width - (doodlePositionEdgeDeadzone * 2))) + doodlePositionEdgeDeadzone,
                            y: Math.floor(seedGen() * (blueprintImage.bitmap.height - (doodlePositionEdgeDeadzone * 2))) + doodlePositionEdgeDeadzone
                        }
                        if ((Math.sqrt(((newPosition.x - centerPosition.x) ** 2) + ((newPosition.y - centerPosition.y) ** 2)) > centerDeadzoneRadius) && !doodlePositions.some(pos => {
                            return Math.sqrt(((newPosition.x - pos.x) ** 2) + ((newPosition.y - pos.y) ** 2)) < minDoodleDistance;
                        })) {
                            doodlePositions.push(newPosition);
                            iterationsSinceLastPositionFound = 0;
                        } else {
                            iterationsSinceLastPositionFound++;
                        }
                        if (iterationsSinceLastPositionFound > 100) {
                            minDoodleDistance--;
                        }
                    }
                    for (let positionIndex = 0; positionIndex < doodlePositions.length; positionIndex++) {
                        const position = doodlePositions[positionIndex];
                        const doodleImage = doodles[Math.floor(seedGen() * doodles.length)];
                        blueprintImage.composite(doodleImage, position.x - Math.floor(doodleImage.bitmap.width / 2), position.y - Math.floor(doodleImage.bitmap.height / 2));
                    }

                    fillHollowRect(blueprintImage, 0, 0, blueprintImage.bitmap.width, blueprintImage.bitmap.height, 0x0b162bff);
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];

                        inputFrame.composite(blueprintImage);
                    }

                    return true;
                },
            }),
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon
                ],
                flatCanvasPadding: 2,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const shadingClone = new Jimp({ width: inputFrame.bitmap.width, height: inputFrame.bitmap.height, color: 0x00000000 });
                        inputFrame.scan((x, y, idx) => {
                            if (inputFrame.bitmap.data[idx + 3] > 0) {
                                shadingClone.bitmap.data[idx + 3] = clampForRGB(Math.floor(255 * (1 - luminanceFromColor(inputFrame.getPixelColor(x, y)))));
                                inputFrame.setPixelColor(0x6792e9ff, x, y);
                            }
                        });
                        inputFrame.composite(shadingClone);
                        strokeImage(inputFrame, 0x00000033, 2, false, [[0,0,0], [0,0,0], [0,0,1]], true);
                    }
                    return true;
                },
            })
        }
    }),
    "conjoined": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.needsHeads
                ],
                canvasScale: 1.5,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const heteropagusImage = await Jimp.read(`${prefixSourceDirectory}/conjoined/heteropagus.png`);
                    const shadingImage = await Jimp.read(`${prefixSourceDirectory}/conjoined/shading.png`);
                    const paletteSampleHeadFraction = (8 / 32);
                    const maxChannelValue = 80;

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const headsThisFrame = parts.heads[inputFrameIndex % parts.heads.length];
                        const iconFrame = parts.icon[inputFrameIndex % parts.icon.length];

                        for (let headIndex = 0; headIndex < headsThisFrame.length; headIndex++) {
                            const head = headsThisFrame[headIndex];
                            const heteropagusPalette: number[] = [];

                            const paletteSampleOffset = head.width * (1 - paletteSampleHeadFraction);
                            const paletteSampleSize = head.width * paletteSampleHeadFraction;
                            for (let headLengthIndex = 0; headLengthIndex < paletteSampleSize; headLengthIndex++) {
                                const x = Math.floor(head.x + paletteSampleOffset + headLengthIndex);
                                const colorOnHead = iconFrame.getPixelColor(x, head.y);
                                if ((colorOnHead & 255) !== 0) heteropagusPalette.push(colorOnHead);
                            }
                            if (heteropagusPalette.length === 0) continue;
                            const heteropagusClone = heteropagusImage.clone();
                            heteropagusClone.scan((x, y, idx) => {
                                if (heteropagusClone.bitmap.data[idx + 3] !== 0) {
                                    const paletteIndex = Math.floor((heteropagusClone.bitmap.data[idx] / maxChannelValue) * (heteropagusPalette.length - 1));
                                    heteropagusClone.setPixelColor(heteropagusPalette[paletteIndex % heteropagusPalette.length], x, y);
                                }
                            });
                            heteropagusClone.composite(shadingImage);
                            compositeHeadsToAllFrames([inputFrame], parts.icon[0], [[head]], [heteropagusClone], { x: -20, y: 12, width: 32 });
                        }
                    }
                    
                    return true;
                },
            })
        }
    }),
    "misprinted": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon,
                    prefixRendererTags.isSeeded
                ],
                predefinedRNG: {
                    yOffset: {
                        RNGString: 'misprinted',
                        get(RNG) {
                            return Math.floor(RNG() * 15) / 100;
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const yOffset = Math.floor((parsedRNG.yOffset) * input[0].bitmap.height);

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const sourceFrame = inputFrame.clone();
                        inputFrame.scan((x, y, idx) => {
                            inputFrame.bitmap.data[idx + 3] = 0;
                        })
                        inputFrame.composite(sourceFrame, 0, yOffset - Math.floor(sourceFrame.bitmap.height / 2));
                        inputFrame.composite(sourceFrame, 0, yOffset + Math.floor(sourceFrame.bitmap.height / 2));
                    }

                    return true;
                },
            })
        }
    }),
    "roaring": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: prefixRendererConsts.roaring.frames,
                flatCanvasPadding: prefixRendererConsts.roaring.floatDistance,
                tags: [
                    prefixRendererTags.needsIcon
                ],
                render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const iconFloatAngleMultiple = ((2 * Math.PI) / (input.length - 1)) * 0;
                    const centerCompositePosition = {
                        x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
                        y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2),
                    }
                    const floatDistancePixelCount = prefixRendererConsts.roaring.floatDistance + (parts.icon[0].bitmap.width);
                    const trailingCubeFrameOffsetMultiple = prefixRendererConsts.roaring.frames / prefixRendererConsts.roaring.trailCount;

                    const workingOpacityFrames: JimpImage[] = [];
                    for (let iconFrameIndex = 0; iconFrameIndex < parts.icon.length; iconFrameIndex++) {
                        workingOpacityFrames.push(parts.icon[iconFrameIndex].clone());
                    }

                    const trailingCubeIndexLayers = [];
                    while (trailingCubeIndexLayers.length < prefixRendererConsts.roaring.trailCount) {
                        trailingCubeIndexLayers.push(trailingCubeIndexLayers.length);
                    }

                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        const animationProgressOffset = inputFrameIndex / input.length;
                        trailingCubeIndexLayers.sort((a, b) => {
                            const AProgress = ((a / trailingCubeIndexLayers.length) + animationProgressOffset) % 1;
                            const BProgress = ((b / trailingCubeIndexLayers.length) + animationProgressOffset) % 1;
                            if (AProgress > BProgress) return -1;
                            return 1;
                        })
                        for (let trailingCubeIndexLayerIndex = 0; trailingCubeIndexLayerIndex < trailingCubeIndexLayers.length; trailingCubeIndexLayerIndex++) {
                            const trailingCubeIndex = trailingCubeIndexLayers[trailingCubeIndexLayerIndex]
                            let originalTrailingFrame = Math.floor((trailingCubeFrameOffsetMultiple * trailingCubeIndex) - ((input.length - 1) / 2));
                            if (originalTrailingFrame < 1) originalTrailingFrame = originalTrailingFrame + input.length;
                            const trailingCubeProgress = ((trailingCubeIndex / trailingCubeIndexLayers.length) + animationProgressOffset) % 1;
                            const trailingAngle = originalTrailingFrame * iconFloatAngleMultiple;

                            const opacityMultiple = (1 - trailingCubeProgress);
                            const trailingDistance = trailingCubeProgress * floatDistancePixelCount;
                            const cubeIconFrameIndex = originalTrailingFrame % parts.icon.length;
                            const cubeIconFrame = workingOpacityFrames[cubeIconFrameIndex];
                            cubeIconFrame.scan((x, y, idx) => {
                                if (cubeIconFrame.bitmap.data[idx + 3] > 0) cubeIconFrame.bitmap.data[idx + 3] = Math.ceil(parts.icon[cubeIconFrameIndex].bitmap.data[idx + 3] * opacityMultiple);
                            })
                            
                            inputFrame.composite(cubeIconFrame, centerCompositePosition.x + trailingDistance, centerCompositePosition.y + Math.round(Math.sin(trailingAngle) * prefixRendererConsts.roaring.floatAmplitude));
                        }
                    }

                    return true;
                },
            }),
            // [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
            //     frames: prefixRendererConsts.roaring.frames,
            //     flatCanvasPadding: prefixRendererConsts.roaring.floatDistance,
            //     tags: [
            //         prefixRendererTags.needsIcon
            //     ],
            //     render: async function (parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
            //         const iconPartIndexScalar = parts.icon.length / (input.length - 1);
            //         const iconFloatAngleMultiple = (2 * Math.PI) / (input.length - 1);
            //         const centerCompositePosition = {
            //             x: Math.floor((input[0].bitmap.width - parts.icon[0].bitmap.width) / 2),
            //             y: Math.floor((input[0].bitmap.height - parts.icon[0].bitmap.height) / 2),
            //         }
            //         for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
            //             const inputFrame = input[inputFrameIndex];
            //             const cubeIconFrameIndex = Math.floor((inputFrameIndex * iconPartIndexScalar)) % parts.icon.length;
            //             const cubeIconFrame = parts.icon[cubeIconFrameIndex];
            //             fillRect(inputFrame, 0, 0, inputFrame.bitmap.width, inputFrame.bitmap.height, 0x00000000);

            //             inputFrame.composite(cubeIconFrame, centerCompositePosition.x, centerCompositePosition.y + Math.round(Math.sin(iconFloatAngleMultiple * inputFrameIndex) * prefixRendererConsts.roaring.floatAmplitude));
            //         }

            //         return true;
            //     },
            // }),
        }
    }),
    "defeatable": constructPrefixRenderer({
        renderSteps: constructFrontBackPrefixRenderer({
            backImagePath: `${prefixSourceDirectory}/defeatable/back.png`,
            frontImagePath: `${prefixSourceDirectory}/defeatable/front.png`,
            renderImage(seed, layerAnimation, inputFrames, parts, parsedRNG) {
                compositeHeadsToAllFrames(inputFrames, parts.icon[0], parts.heads, layerAnimation, { x: 4, y: 13, width: 32 });
            },
            tags: [
                prefixRendererTags.needsHeads
            ],
            canvasModifiers: {
                scale: 1.5
            }
        })
    }),
    "marbleized": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                flatCanvasPadding: prefixRendererConsts.marbleized.pedestalSize,
                tags: [
                    prefixRendererTags.needsIconDimensions
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const usingFrame = input[0];
                    const pedestalHeight = 4;
                    const diagonalDeltaY = Math.floor((usingFrame.bitmap.width - 2) / 4);
                    const bottomCenterLeftPixel = {x: Math.floor(usingFrame.bitmap.width / 2) - 1, y: usingFrame.bitmap.height -1 };
                    const bottomCenterRightPixel = { x: bottomCenterLeftPixel.x + 1, y: bottomCenterLeftPixel.y };
                    const bottomRightPixel = { y: bottomCenterLeftPixel.y - diagonalDeltaY, x: usingFrame.bitmap.width - 2 };
                    const bottomLeftPixel = { y: bottomCenterLeftPixel.y - diagonalDeltaY, x: 1 };

                    const topLeftLowerPixel = { x: bottomLeftPixel.x, y: bottomLeftPixel.y - pedestalHeight };
                    const topLeftUpperPixel = { x: topLeftLowerPixel.x, y: topLeftLowerPixel.y - 1 };

                    const topRightLowerPixel = { x: bottomRightPixel.x, y: bottomRightPixel.y - pedestalHeight };
                    const topRightUpperPixel = { x: topRightLowerPixel.x, y: topRightLowerPixel.y - 1 };

                    const topCenterLeftPixel = { x: bottomCenterLeftPixel.x, y: topLeftUpperPixel.y - diagonalDeltaY };
                    const topCenterRightPixel = { x: bottomCenterRightPixel.x, y: topCenterLeftPixel.y };

                    const centerLeftPixel = { x: bottomCenterLeftPixel.x, y: topLeftUpperPixel.y + diagonalDeltaY };
                    const centerRightPixel = { x: centerLeftPixel.x + 1, y: centerLeftPixel.y };

                    for (let heightIndex = 1; heightIndex <= pedestalHeight; heightIndex++) {
                        drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.frontFace, { x: bottomCenterLeftPixel.x, y: bottomCenterLeftPixel.y - heightIndex }, { x: bottomLeftPixel.x, y: bottomLeftPixel.y - heightIndex });
                        drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.sideFace, { x: bottomCenterRightPixel.x, y: bottomCenterRightPixel.y - heightIndex }, { x: bottomRightPixel.x, y: bottomRightPixel.y - heightIndex });
                    }

                    for (let topFaceHeightIndex = 1; topFaceHeightIndex <= (diagonalDeltaY); topFaceHeightIndex++) {
                        drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.frontRim, { x: topCenterLeftPixel.x - (topFaceHeightIndex * 2), y: topCenterLeftPixel.y + topFaceHeightIndex }, { x: topCenterRightPixel.x + (topFaceHeightIndex * 2), y: topCenterRightPixel.y + topFaceHeightIndex });
                        drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.frontRim, { x: centerLeftPixel.x - (topFaceHeightIndex * 2), y: centerLeftPixel.y - topFaceHeightIndex }, { x: centerRightPixel.x + (topFaceHeightIndex * 2), y: centerRightPixel.y - topFaceHeightIndex });
                    }

                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.frontRim, bottomCenterLeftPixel, bottomLeftPixel);
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.frontRim, bottomLeftPixel, topLeftLowerPixel);
                    
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.bottomRim, bottomCenterRightPixel, bottomRightPixel);
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.bottomRim, bottomRightPixel, topRightLowerPixel);

                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.topRim, topLeftUpperPixel, centerLeftPixel);
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.topRim, topLeftUpperPixel, topCenterLeftPixel);`g`
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.topRim, topRightUpperPixel, centerRightPixel);
                    drawLine(usingFrame, prefixRendererConsts.marbleized.pedestalPalette.topRim, topRightUpperPixel, topCenterRightPixel);

                    prefixRendererConsts.marbleized.marbleizedShader(await Jimp.read(`${prefixSourceDirectory}/marbleized/marble.png`), usingFrame);

                    return true;
                }
            }),
            [prefixRenderSteps.applyToCube]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.needsIcon
                ],
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const marbleImage = await Jimp.read(`${prefixSourceDirectory}/marbleized/marble.png`);
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        prefixRendererConsts.marbleized.marbleizedShader(marbleImage, inputFrame, 12);
                    }

                    return true;
                },
            })
        }
    }),
    "addicted": constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.foreground]: constructPrefixRendererStep({
                tags: [
                    prefixRendererTags.isSeeded,
                    prefixRendererTags.needsMouths
                ],
                flatCanvasPadding: 12,
                frames: 5,
                predefinedRNG: {
                    shaftSize: {
                        RNGString: `cigarettesize`,
                        get(RNG) {
                            return Math.floor((prefixRendererConsts.addicted.maxLength - prefixRendererConsts.addicted.minLength) * RNG()) + prefixRendererConsts.addicted.minLength;
                        },
                    },
                    cigarettePalette: {
                        RNGString: `cigarettesize`,
                        get(RNG) {
                            return Math.floor(RNG() * prefixRendererConsts.addicted.palettes.length);
                        },
                    }
                },
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const smoke = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/addicted/smoke.png`);
                    const buttSize = 3;
                    const cigaretteIcon = new Jimp({ width: parsedRNG.shaftSize + buttSize + 2, height: 3, color: 0x00000000 });
                    const lazyShading = new Jimp({ width: cigaretteIcon.width, height: cigaretteIcon.height, color: 0x00000000 });
                    const shadingColor = 0x00000022;
                    drawLine(lazyShading, shadingColor, { x: 1, y: 0 }, { x: lazyShading.bitmap.width - 2, y: 0 });
                    drawLine(lazyShading, shadingColor, { x: 1, y: 2 }, { x: lazyShading.bitmap.width - 2, y: 2 });
                    lazyShading.setPixelColor(shadingColor, 0, 1);
                    lazyShading.setPixelColor(shadingColor, lazyShading.bitmap.width - 1, 1);

                    const palette = prefixRendererConsts.addicted.palettes[parsedRNG.cigarettePalette];
                    fillRect(cigaretteIcon, 0, 0, cigaretteIcon.bitmap.width - buttSize, 3, palette.shaft);
                    fillRect(cigaretteIcon, cigaretteIcon.bitmap.width - buttSize, 0, buttSize, 3, palette.butt);
                    cigaretteIcon.setPixelColor(palette.ember, 1, 1);
                    cigaretteIcon.setPixelColor(palette.shaft, cigaretteIcon.bitmap.width - buttSize, 1);

                    cigaretteIcon.setPixelColor(0x00000000, cigaretteIcon.bitmap.width - 1, cigaretteIcon.bitmap.height - 1);
                    cigaretteIcon.setPixelColor(0x00000000, 0, cigaretteIcon.bitmap.height - 1);
                    cigaretteIcon.setPixelColor(0x00000000, cigaretteIcon.bitmap.width - 1, 0);
                    cigaretteIcon.setPixelColor(0x00000000, 0, 0);
                    cigaretteIcon.composite(lazyShading);

                    compositeMouthsToAllFramesWithoutScaling(input, parts.icon[0], parts.mouths, [cigaretteIcon], { x: -cigaretteIcon.bitmap.width + 1, y: -1 }, false);
                    compositeMouthsToAllFramesWithoutScaling(input, parts.icon[0], parts.mouths, smoke, { x: -(cigaretteIcon.bitmap.width + smoke[0].bitmap.width - 4), y: -(1 + smoke[0].bitmap.height) }, false);

                    return true;
                },
            })
        }
    })
} as {[key in PrefixID]?: prefixRendererDefinition};