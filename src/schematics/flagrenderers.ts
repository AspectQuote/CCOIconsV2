import { Jimp, ResizeStrategy } from "jimp";
import { config } from "../config";
import { createBSideV2Image } from "../imageeffects";
import { JimpImage } from "../utils";
import { filterOtherFlagsForNeeded, flagIconRendererConstSchema, getTotalFlatCanvasPaddingForAppliedSteps, leastCommonMultiple, prefixRenderSteps, shorthandIconDataSchema } from "./importedschematics/ccoiconsschema";
import { cubeFlags } from "./importedschematics/cubeflagsshared";
import { constructPrefixRenderer, constructPrefixRendererStep, generateBlankFrames, prefixRendererDefinition } from "./prefixrenderers";
import { cubePartDefinition } from "../cubeparts";
import { CubeDefinition, CubeID } from "./importedschematics/cubes";
import { drawLine, fillRect, strokeImage } from "../imageutils";
import seedrandom from "seedrandom";

const bSideFlagRendererStep = constructPrefixRendererStep({
    frames: flagIconRendererConstSchema[cubeFlags.bSide][prefixRenderSteps.applyToCube].frames,
    render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
        for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
            const inputFrame = input[inputFrameIndex];
            input[inputFrameIndex] = await createBSideV2Image(inputFrame, undefined, config.cubeIconBSideIterations);
        }

        return true;
    },
});

export const flagRendererSchema = {
    [cubeFlags.bSide]: constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.applyToCube]: bSideFlagRendererStep,
            [prefixRenderSteps.applyToBackground]: bSideFlagRendererStep,
            [prefixRenderSteps.applyToForeground]: bSideFlagRendererStep,
        }
    }),
    [cubeFlags.collectors]: constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: flagIconRendererConstSchema[cubeFlags.collectors][prefixRenderSteps.background].frames,
                canvasScale: flagIconRendererConstSchema[cubeFlags.collectors][prefixRenderSteps.background].canvasScale,
                flatCanvasPadding: flagIconRendererConstSchema[cubeFlags.collectors][prefixRenderSteps.background].flatPadding,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const cornerImage = new Jimp({ width: Math.ceil(input[0].bitmap.width * 0.33), height: Math.ceil(input[0].bitmap.height * 0.33), color: 0x00000000 });
                    drawLine(cornerImage, 0x660808ff, { x: 0, y: 0 }, { x: cornerImage.bitmap.width - 2, y: 0 });
                    drawLine(cornerImage, 0x660808ff, { x: 0, y: 0 }, { x: 0, y: cornerImage.bitmap.height - 2});
                    strokeImage(cornerImage, 0x440808ff, 1, false, [[0,0,0],[0,0,1],[0,1,0]], true);

                    const fullCollectorsImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.height });
                    fullCollectorsImage.composite(cornerImage);
                    cornerImage.flip({ horizontal: true });
                    fullCollectorsImage.composite(cornerImage, fullCollectorsImage.bitmap.width - cornerImage.bitmap.width, 0);
                    cornerImage.flip({ vertical: true });
                    fullCollectorsImage.composite(cornerImage, fullCollectorsImage.bitmap.width - cornerImage.bitmap.width, fullCollectorsImage.bitmap.height - cornerImage.bitmap.height);
                    cornerImage.flip({ horizontal: true });
                    fullCollectorsImage.composite(cornerImage, 0, fullCollectorsImage.bitmap.height - cornerImage.bitmap.height);
                    for (let inputFrameIndex = 0; inputFrameIndex < input.length; inputFrameIndex++) {
                        const inputFrame = input[inputFrameIndex];
                        inputFrame.composite(fullCollectorsImage);
                    }

                    return true;
                },
            })
        }
    }),
    [cubeFlags.divine]: constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: flagIconRendererConstSchema[cubeFlags.divine][prefixRenderSteps.background].frames,
                canvasScale: flagIconRendererConstSchema[cubeFlags.divine][prefixRenderSteps.background].canvasScale,
                flatCanvasPadding: flagIconRendererConstSchema[cubeFlags.divine][prefixRenderSteps.background].flatPadding,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const divineFlashMask = await Jimp.read(`${config.sourceImagesDirectory}/attributeeffects/divine/flash.png`);
                    divineFlashMask.resize({ w: input[0].bitmap.width, h: input[0].bitmap.height, mode: ResizeStrategy.NEAREST_NEIGHBOR });
                    const divinePatternMask = await Jimp.read(`${config.sourceImagesDirectory}/attributeeffects/divine/pattern.png`);
                    divinePatternMask.resize({ w: input[0].bitmap.width, h: input[0].bitmap.height, mode: ResizeStrategy.NEAREST_NEIGHBOR });
                    const divineBaseImage = new Jimp({ width: input[0].bitmap.width, height: input[0].bitmap.width, color: 0xffffffff })
                    divineBaseImage.mask(divineFlashMask);
                    let rotationIncrement = 90 / input.length;
                    for (let frameIndex = 0; frameIndex < input.length; frameIndex++) {
                        const inputFrame = input[frameIndex];
                        const newDivineFrame = divineBaseImage.clone().rotate({deg: (rotationIncrement * frameIndex) + 1, mode: false});
                        newDivineFrame.composite(divineBaseImage.clone().rotate({deg: -(rotationIncrement * frameIndex), mode: false}), 0, 0);
                        inputFrame.composite(newDivineFrame.mask(divinePatternMask));
                    }

                    return true;
                },
            })
        }
    }),
    [cubeFlags.slated]: constructPrefixRenderer({
        renderSteps: {
            [prefixRenderSteps.background]: constructPrefixRendererStep({
                frames: flagIconRendererConstSchema[cubeFlags.slated][prefixRenderSteps.background].frames,
                canvasScale: flagIconRendererConstSchema[cubeFlags.slated][prefixRenderSteps.background].canvasScale,
                flatCanvasPadding: flagIconRendererConstSchema[cubeFlags.slated][prefixRenderSteps.background].flatPadding,
                render: async function(parts, input, seed, cubeData, otherPrefixes, parsedRNG) {
                    const slatedBaseShape = await Jimp.read(`${config.sourceImagesDirectory}/attributeeffects/slated/round.png`);
                    slatedBaseShape.resize({ w: parts.icon[0].bitmap.width, h: parts.icon[0].bitmap.height, mode: ResizeStrategy.NEAREST_NEIGHBOR });
                    const slatedBaseSquareSize = slatedBaseShape.bitmap.width;
                    const slatedPadding = flagIconRendererConstSchema[cubeFlags.slated][prefixRenderSteps.background].flatPadding;
                    const slatedRNG = seedrandom(`slatedseedaaalmaoidk`);
                    const slatedPatternMask = await Jimp.read(`${config.sourceImagesDirectory}/attributeeffects/slated/pattern.png`);
                    slatedPatternMask.resize({ w: input[0].bitmap.width, h: input[0].bitmap.height, mode: ResizeStrategy.NEAREST_NEIGHBOR });

                    function areaCoveredByRectangles(rectArray: typeof topRectangles) {
                        return rectArray.reduce((prev, curr) => {
                            return prev + curr.offset + curr.width;
                        }, 0)
                    }

                    function populateSlatedRectangleArray(): { width: number, size: number, maxSize: number, minSize: number, offset: number, direction: boolean }[] {
                        let rectangleArray: typeof topRectangles = [];
                        while (areaCoveredByRectangles(rectangleArray) < slatedBaseSquareSize - 2) {
                            let size = Math.ceil(slatedRNG() * (slatedPadding / 2));

                            let maxSize = size + Math.round(input.length / 2) - 1;
                            let minSize = size - Math.round(input.length / 2) + 1;

                            rectangleArray.push({
                                width: Math.ceil(slatedRNG() * 2),
                                size,
                                maxSize,
                                minSize,
                                offset: Math.ceil(slatedRNG() * 2),
                                direction: (slatedRNG() > 0.5) ? true : false
                            })
                        }
                        return rectangleArray;
                    }

                    let topRectangles = populateSlatedRectangleArray();
                    let topUniversalRectangleOffset = Math.floor((slatedBaseSquareSize + 2 - areaCoveredByRectangles(topRectangles)) / 2);

                    let leftRectangles = populateSlatedRectangleArray();
                    let leftUniversalRectangleOffset = Math.floor((slatedBaseSquareSize + 2 - areaCoveredByRectangles(leftRectangles)) / 2);

                    let bottomRectangles = populateSlatedRectangleArray();
                    let bottomUniversalRectangleOffset = Math.floor((slatedBaseSquareSize + 2 - areaCoveredByRectangles(bottomRectangles)) / 2);

                    let rightRectangles = populateSlatedRectangleArray();
                    let rightUniversalRectangleOffset = Math.floor((slatedBaseSquareSize + 2 - areaCoveredByRectangles(rightRectangles)) / 2);

                    const slatedColor = 0x213047ff;

                    for (let slatedFrameIndex = 0; slatedFrameIndex < input.length; slatedFrameIndex++) {
                        const slatedFrame = input[slatedFrameIndex];

                        fillRect(slatedFrame, slatedPadding, slatedPadding, slatedBaseSquareSize, slatedBaseSquareSize, slatedColor);
                        slatedFrame.mask({src: slatedBaseShape, x: slatedPadding, y: slatedPadding});

                        let topXPos = slatedPadding;
                        topRectangles.forEach(rectangle => {
                            fillRect(slatedFrame, topXPos + topUniversalRectangleOffset, slatedPadding - rectangle.size, rectangle.width, rectangle.size + (slatedBaseSquareSize / 2), slatedColor);
                            topXPos += rectangle.width + rectangle.offset;
                            rectangle.size += rectangle.direction ? 1 : -1;
                            if (rectangle.size == rectangle.maxSize || rectangle.size == rectangle.minSize) rectangle.direction = !rectangle.direction;
                        })

                        let bottomXPos = slatedPadding;
                        bottomRectangles.forEach(rectangle => {
                            fillRect(slatedFrame, bottomXPos + bottomUniversalRectangleOffset, slatedPadding + slatedBaseSquareSize - (slatedBaseSquareSize / 2), rectangle.width, rectangle.size + (slatedBaseSquareSize / 2), slatedColor);
                            bottomXPos += rectangle.width + rectangle.offset;
                            rectangle.size += rectangle.direction ? 1 : -1;
                            if (rectangle.size == rectangle.maxSize || rectangle.size == rectangle.minSize) rectangle.direction = !rectangle.direction;
                        })

                        let leftYPos = slatedPadding;
                        leftRectangles.forEach(rectangle => {
                            fillRect(slatedFrame, slatedPadding - rectangle.size, leftYPos + leftUniversalRectangleOffset, rectangle.size + (slatedBaseSquareSize / 2), rectangle.width, slatedColor);
                            leftYPos += rectangle.width + rectangle.offset;
                            rectangle.size += rectangle.direction ? 1 : -1;
                            if (rectangle.size == rectangle.maxSize || rectangle.size == rectangle.minSize) rectangle.direction = !rectangle.direction;
                        })

                        let rightYPos = slatedPadding;
                        rightRectangles.forEach(rectangle => {
                            fillRect(slatedFrame, slatedPadding + slatedBaseSquareSize - (slatedBaseSquareSize / 2), rightYPos + rightUniversalRectangleOffset, rectangle.size + (slatedBaseSquareSize / 2), rectangle.width, slatedColor);
                            rightYPos += rectangle.width + rectangle.offset;
                            rectangle.size += rectangle.direction ? 1 : -1;
                            if (rectangle.size == rectangle.maxSize || rectangle.size == rectangle.minSize) rectangle.direction = !rectangle.direction;
                        })
                    }
                    
                    return true;
                },
            })
        }
    }),
    [cubeFlags.contraband]: constructPrefixRenderer({
        renderSteps: {}
    })
} as const satisfies { [key in cubeFlags]: prefixRendererDefinition }

export async function renderFlag(mainFlag: cubeFlags, mainRenderStep: prefixRenderSteps, cubeParts: cubePartDefinition, otherFlags: cubeFlags[], otherSteps: prefixRenderSteps[], cubeData: CubeDefinition, shorthandSchema: shorthandIconDataSchema, inputFrames?: JimpImage[]) {
    let flagFrames: JimpImage[];
    const mainRenderer = flagRendererSchema[mainFlag].renderSteps[mainRenderStep];
    if (!mainRenderer) return [ new Jimp({width: 1, height: 1, color: 0x00000000}) ] as JimpImage[];
    const usingOtherFlags = filterOtherFlagsForNeeded(otherFlags, otherSteps);
    const requiredFrames = leastCommonMultiple(mainRenderer.frames, cubeParts.icon.length);
    const flatPaddingForInput = getTotalFlatCanvasPaddingForAppliedSteps([], usingOtherFlags, otherSteps, shorthandSchema);
    if (!inputFrames) {
        flagFrames = generateBlankFrames((cubeParts.icon[0].bitmap.width * mainRenderer.canvasScale) + ((mainRenderer.flatCanvasPadding + flatPaddingForInput) * 2), requiredFrames);
        await mainRenderer.render(cubeParts, flagFrames, 0, cubeData, [], {});
    } else {
        flagFrames = [];
        for (let generatedFrameIndex = 0; generatedFrameIndex < requiredFrames; generatedFrameIndex++) {
            const inputFrameIndex = generatedFrameIndex % inputFrames.length;
            if (flatPaddingForInput > 0) {
                const constructedFrame = new Jimp({ width: inputFrames[inputFrameIndex].bitmap.width + (flatPaddingForInput * 2), height: inputFrames[inputFrameIndex].bitmap.height + (flatPaddingForInput * 2), color: 0x00000000 });
                constructedFrame.composite(inputFrames[inputFrameIndex], flatPaddingForInput, flatPaddingForInput);
                flagFrames.push(constructedFrame);
            } else {
                flagFrames.push(inputFrames[inputFrameIndex].clone());
            }
        }
    }

    for (let otherFlagIndex = 0; otherFlagIndex < usingOtherFlags.length; otherFlagIndex++) {
        const otherFlag = usingOtherFlags[otherFlagIndex];
        for (let otherStepIndex = 0; otherStepIndex < otherSteps.length; otherStepIndex++) {
            const otherStep = otherSteps[otherStepIndex];
            const renderStep = flagRendererSchema[otherFlag].renderSteps[otherStep];
            if (renderStep) await renderStep.render(cubeParts, flagFrames, 0, cubeData, [], {});
        }
    }

    return flagFrames;
}