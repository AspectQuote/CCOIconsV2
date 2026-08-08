import { Jimp, ResizeStrategy } from "jimp"
import * as fs from 'fs-extra';
import { config } from "./config";
import { allCubeIDs, CubeID, cubeSchema } from "./schematics/importedschematics/cubes";
import path from "path";
import { ensureFolderExists, JimpImage, JimpImgMod, loadAnimatedCubeIcon, randomNumberBetween, saveAnimatedCubeIcon } from "./utils";
import { customSeededCubeDefinition, customSeededCubeID, customSeededCubes } from "./schematics/customseededicons";
import { constructCubePatternDefinition, cubePatternDefinition, cubePatternImage, patternedCubeID, patternedCubeSchema } from "./schematics/patterneditems";
import seedrandom from 'seedrandom';
import { hash } from "crypto";
import { constructPrefixRenderer, filterOtherPrefixesForNeeded, prefixRendererDefinition, prefixRenderers } from "./schematics/prefixrenderers";
import { PrefixID } from "./schematics/importedschematics/prefixes";
import { aggregatePrefixTags, prefixRendererTags, prefixRenderSteps, shorthandIconDataSchema } from "./schematics/importedschematics/ccoiconsschema";

export type cubeHead = {
    x: number,
    y: number,
    width: number
}

export type cubeMouth = {
    x: number,
    y: number,
    width: number
}

export type cubeEye = {
    x: number,
    y: number
}

export type cubeAccent = {
    pixels: {
        x: number,
        y: number
    }[]
}

export type cubePartDefinition = {
    icon: JimpImage[],
    heads: cubeHead[][],
    mouths: cubeMouth[][],
    eyes: cubeEye[][],
    accents: JimpImage[],
    seeded: boolean
}

export async function parseCubePartImagesIntoCubeParts(icon: JimpImage[], headFrames: JimpImage[], mouthFrames: JimpImage[], eyeFrames: JimpImage[], accents: JimpImage[], seeded: boolean = false): Promise<cubePartDefinition> {
    const heads: cubeHead[][] = [];
    const mouths: cubeMouth[][] = [];
    const eyes: cubeEye[][] = [];

    for (let headFrameIndex = 0; headFrameIndex < headFrames.length; headFrameIndex++) {
        const currentFrame = headFrames[headFrameIndex];
        let onHead = false;
        let currentHeadSize = 0;
        let currentHeadStartPosition = { x: 0, y: 0 };
        let headsThisFrame: cubeHead[] = [];
        currentFrame.scan(function (x, y, idx) {
            if (currentFrame.bitmap.data[idx + 3] > 0 && y == currentHeadStartPosition.y) {
                if (onHead == true) {
                    currentHeadSize++;
                } else {
                    onHead = true;
                    currentHeadStartPosition = { x, y };
                    currentHeadSize = 1;
                }
            } else {
                if (onHead == true) {
                    headsThisFrame.push(structuredClone({
                        x: currentHeadStartPosition.x,
                        y: currentHeadStartPosition.y,
                        width: currentHeadSize
                    }))
                    onHead = false;
                }
                currentHeadStartPosition.y = y;
                if (currentFrame.bitmap.data[idx + 3] > 0) {
                    onHead = true;
                    currentHeadStartPosition = { x, y };
                    currentHeadSize = 1;
                }
            }
        });
        heads.push([...headsThisFrame.splice(0)]);
    }

    for (let eyeFrameIndex = 0; eyeFrameIndex < eyeFrames.length; eyeFrameIndex++) {
        const currentFrame = eyeFrames[eyeFrameIndex];
        const currentFrameEyes: cubeEye[] = [];
        currentFrame.scan(0, 0, currentFrame.bitmap.width, currentFrame.bitmap.height, function (x, y, idx) {
            if (currentFrame.bitmap.data[idx + 3] > 0) {
                currentFrameEyes.push({ x, y });
            }
        });
        eyes.push(currentFrameEyes);
    }

    for (let mouthFrameIndex = 0; mouthFrameIndex < mouthFrames.length; mouthFrameIndex++) {
        const currentFrame = mouthFrames[mouthFrameIndex];
        let currentFrameMouths: cubeMouth[] = [];
        let onMouth = false;
        let currentMouthSize = 0;
        let currentMouthStartPosition = { x: 0, y: 0 };
        currentFrame.scan(0, 0, currentFrame.bitmap.width, currentFrame.bitmap.height, function (x, y, idx) {
            if (currentFrame.bitmap.data[idx + 3] > 0 && y == currentMouthStartPosition.y) {
                if (onMouth == true) {
                    currentMouthSize++;
                } else {
                    onMouth = true;
                    currentMouthStartPosition = { x, y };
                    currentMouthSize = 1;
                }
            } else {
                if (onMouth == true) {
                    currentFrameMouths.push(structuredClone({
                        x: currentMouthStartPosition.x,
                        y: currentMouthStartPosition.y,
                        width: currentMouthSize
                    }))
                    onMouth = false;
                }
                currentMouthStartPosition.y = y;
                if (currentFrame.bitmap.data[idx + 3] > 0) {
                    onMouth = true;
                    currentMouthStartPosition = { x, y };
                    currentMouthSize = 1;
                }
            }
        });
        mouths.push(currentFrameMouths);
    }

    return {
        icon,
        heads,
        mouths,
        eyes,
        accents,
        seeded
    }
}

async function populateCustomSeededIconPart(info: string | ((seed: number) => Promise<string>), seed: number, outputDirectory: string, outputFileName: string) {
    const sourcePath = (typeof info === "string") ? info : await info(seed);
    const customSeededIcon = await loadAnimatedCubeIcon(sourcePath);
    await saveAnimatedCubeIcon(customSeededIcon, outputFileName, outputDirectory);
    return true;
}

export async function checkForImageAndLoadIt(path: string): Promise<JimpImage | false> {
    if (!fs.existsSync(path)) return false;
    return await Jimp.read(path);
}

export function getDirectoryForPatternedCube(cube: CubeID, patternIndex: number) {
    return `${config.outputDirectory}/patternatlases/${cube}/${patternIndex}/`;
}

export async function generatePatternedCubeParts(cubeID: CubeID, patternIndex: number): Promise<string> {
    const patternAtlasDirectory = ensureFolderExists(getDirectoryForPatternedCube(cubeID, patternIndex));
    if (!fs.existsSync(`${patternAtlasDirectory}/cube.png`)) {
        if (config.devmode) console.log("Regenerating Pattern: " + patternIndex);
        fs.mkdirSync(patternAtlasDirectory, { recursive: true });
        if (cubeID in customSeededCubes) {
            const customSeededCubeID: customSeededCubeID = cubeID as customSeededCubeID;
            await populateCustomSeededIconPart(customSeededCubes[customSeededCubeID].accents, patternIndex, patternAtlasDirectory, "accents");
            await populateCustomSeededIconPart(customSeededCubes[customSeededCubeID].mouths, patternIndex, patternAtlasDirectory, "mouths");
            await populateCustomSeededIconPart(customSeededCubes[customSeededCubeID].eyes, patternIndex, patternAtlasDirectory, "eyes");
            await populateCustomSeededIconPart(customSeededCubes[customSeededCubeID].heads, patternIndex, patternAtlasDirectory, "heads");
            await populateCustomSeededIconPart(customSeededCubes[customSeededCubeID].cube, patternIndex, patternAtlasDirectory, "cube");
        } else {
            const patternInfo: cubePatternDefinition = (cubeID in patternedCubeSchema) ? patternedCubeSchema[cubeID as patternedCubeID] : constructCubePatternDefinition({});

            // Image Directory
            const imageDirectory = path.resolve(`${config.sourceImagesDirectory}/seededcubetextures/${cubeID}`);
            // Load the base cube image from the seeded cube directory.
            const baseImage: JimpImage = await Jimp.read(`${imageDirectory}/${patternInfo.baseimage}.png`)
            // Read overlay image and put that over the composite later
            const overlayImage: JimpImage = await Jimp.read(`${imageDirectory}/${patternInfo.overlayimage}.png`);

            let staticAccentsPath = `${imageDirectory}/accents.png`;
            let staticEyesPath = `${imageDirectory}/eyes.png`;
            let staticMouthsPath = `${imageDirectory}/mouths.png`;
            let staticHeadsPath = `${imageDirectory}/heads.png`;

            let accentFrame = await checkForImageAndLoadIt(staticAccentsPath);
            let eyeFrame = await checkForImageAndLoadIt(staticEyesPath);
            let mouthFrame = await checkForImageAndLoadIt(staticMouthsPath);
            let headFrame = await checkForImageAndLoadIt(staticHeadsPath);

            const staticPatternImages: {
                accents: Awaited<ReturnType<typeof checkForImageAndLoadIt>>,
                eyes: Awaited<ReturnType<typeof checkForImageAndLoadIt>>,
                mouths: Awaited<ReturnType<typeof checkForImageAndLoadIt>>,
                heads: Awaited<ReturnType<typeof checkForImageAndLoadIt>>,
                cube: Awaited<ReturnType<typeof checkForImageAndLoadIt>>,
            } = {
                accents: accentFrame,
                eyes: eyeFrame,
                mouths: mouthFrame,
                heads: headFrame,
                cube: false
            }

            let patternImages: typeof staticPatternImages[] = []
            const overallPatternSeedRNG = seedrandom(`${cubeID}[${patternIndex}[`);
            for (let patternImageIndex = 0; patternImageIndex < patternInfo.patternimages.length; patternImageIndex++) {
                const colorRNG = seedrandom(`${cubeID}]${patternIndex}]${patternImageIndex}`);
                const transformRNG = seedrandom(`${cubeID}_${patternIndex}_${patternImageIndex}`)
                const patternImageData = patternInfo.patternimages[patternImageIndex];

                let patternImageLayers: typeof staticPatternImages = {
                    cube: false,
                    accents: (staticPatternImages.accents) ? staticPatternImages.accents.clone() : false,
                    eyes: (staticPatternImages.eyes) ? staticPatternImages.eyes.clone() : false,
                    mouths: (staticPatternImages.mouths) ? staticPatternImages.mouths.clone() : false,
                    heads: (staticPatternImages.heads) ? staticPatternImages.heads.clone() : false
                };
                for (let patternImageLayerIndex = 0; patternImageLayerIndex < Object.keys(patternImageLayers).length; patternImageLayerIndex++) {
                    const key: keyof typeof patternImageLayers = Object.keys(patternImageLayers)[patternImageLayerIndex] as keyof typeof patternImageLayers;
                    const imageFileName = (key === "cube") ? 'base' : key;
                    const imageFilePath = path.resolve(`./sourceicons/textures/${patternImageData.path}/${imageFileName}.png`);
                    if (!patternImageLayers[key] && fs.existsSync(imageFilePath)) {
                        let newSeededImage = await Jimp.read(imageFilePath);
                        if (patternImageLayers[key] !== undefined) {
                            // I love typedefs!!!
                            let imageManipulations: JimpImgMod[] = [];
                            if (key === "cube") {
                                // Brighten the pattern image
                                if (patternImageData.seedbrightness && patternImageData.seedbrightnessrange) {
                                    const brightness = randomNumberBetween(patternImageData.seedbrightnessrange[0], patternImageData.seedbrightnessrange[1], colorRNG);
                                    const manipulationMethod = brightness > 0 ? "lighten" : "darken";
                                    imageManipulations.push({ apply: manipulationMethod, params: [Math.abs(brightness)] });
                                }
                                // Saturate the pattern image
                                if (patternImageData.seedsaturate && patternImageData.seedsaturaterange) {
                                    const saturation = randomNumberBetween(patternImageData.seedsaturaterange[0], patternImageData.seedsaturaterange[1], colorRNG);
                                    const manipulationMethod = saturation > 0 ? "saturate" : "desaturate";
                                    imageManipulations.push({ apply: manipulationMethod, params: [saturation] });
                                }

                                // Hue-Rotate the pattern image
                                if (patternImageData.seedhuerotate) {
                                    imageManipulations.push({ apply: "hue", params: [Math.round(colorRNG() * 360)] });
                                }
                            }
                            // Scale the pattern image
                            if (patternImageData.seedscale && patternImageData.seedscalerange) {
                                const scale = randomNumberBetween(patternImageData.seedscalerange[0], patternImageData.seedscalerange[1], transformRNG);
                                newSeededImage.resize({
                                    w: newSeededImage.bitmap.width * scale,
                                    h: newSeededImage.bitmap.height * scale, 
                                    mode: ResizeStrategy.NEAREST_NEIGHBOR
                                });
                            }

                            // Rotate pattern image
                            if (patternImageData.seedrotate) {
                                let degrees = Math.floor(transformRNG() * 360);
                                const imageSizeTarget = Math.sqrt(Math.pow((newSeededImage.bitmap.width / 2), 2) + Math.pow((newSeededImage.bitmap.height / 2), 2));
                                newSeededImage.rotate({
                                    deg: degrees,
                                    mode: false
                                });
                                newSeededImage.crop({
                                    x: (newSeededImage.bitmap.width - imageSizeTarget) / 2,
                                    y: (newSeededImage.bitmap.height - imageSizeTarget) / 2,
                                    w: imageSizeTarget,
                                    h: imageSizeTarget
                                });
                            }

                            // Create cropped pattern image to the size of the pattern mask, at a random(seeded) position
                            const cropXPos = Math.floor(transformRNG() * (newSeededImage.bitmap.width - baseImage.bitmap.width));
                            const cropYPos = Math.floor(transformRNG() * (newSeededImage.bitmap.height - baseImage.bitmap.height));
                            newSeededImage.crop({
                                x: cropXPos,
                                y: cropYPos,
                                w: baseImage.bitmap.height,
                                h: baseImage.bitmap.width
                            });

                            // Apply color manimpulatons, if they exist.
                            if (imageManipulations.length > 0) newSeededImage.color(imageManipulations);

                            patternImageLayers[key] = newSeededImage;
                        }
                    }
                }

                patternImages.push(patternImageLayers);
            }
            const newBaseImage = baseImage.clone();
            for (let maskImageIndex = 0; maskImageIndex < patternInfo.masks.length; maskImageIndex++) {
                const maskInfo = patternInfo.masks[maskImageIndex];
                // Read random(seeded) mask image
                let maskImage = await Jimp.read(`${imageDirectory}/${maskInfo.images[Math.floor(maskInfo.images.length * overallPatternSeedRNG())]}.png`);

                for (let patternImageLayerIndex = 0; patternImageLayerIndex < Object.keys(patternImages[maskInfo.patternimage]).length; patternImageLayerIndex++) {
                    const key: keyof typeof patternImages[number] = Object.keys(patternImages[maskInfo.patternimage])[patternImageLayerIndex] as keyof typeof patternImages[number];
                    // Mask the pattern image with the mask image and composite the modified masked image
                    if (patternImages[maskInfo.patternimage][key]) {
                        const maskedImage = (patternImages[maskInfo.patternimage][key] as JimpImage).clone()
                        if (staticPatternImages[key] === false) {
                            maskedImage.mask(maskImage);
                        }
                        if (key === "cube") {
                            newBaseImage.composite(maskedImage, 0, 0);
                        } else {
                            await saveAnimatedCubeIcon([maskedImage], key, patternAtlasDirectory);
                        }
                    }
                }
            }
            // console.log(`Generated atlas image for pattern index ${patternIndex} and cube ID ${cubeID}.`)
            newBaseImage.composite(overlayImage, 0, 0);
            await newBaseImage.write(`${patternAtlasDirectory}/cube.png`);
        }
    }
    return patternAtlasDirectory;
}

const baseCubeIconDirPath = `${config.sourceImagesDirectory}/cubes/`;

export async function getRawCubePartPaths(cubeID: CubeID, cubeSeed: number) {
    let iconDirPath: string;
    if ('seededIcon' in cubeSchema[cubeID] || cubeID in customSeededCubes) {
        iconDirPath = await generatePatternedCubeParts(cubeID, cubeSeed);
    } else {
        iconDirPath = path.resolve(`${baseCubeIconDirPath}/${cubeID}`);
    }

    return {
        cube: `${iconDirPath}/cube.png`,
        heads: `${iconDirPath}/heads.png`,
        eyes: `${iconDirPath}/eyes.png`,
        mouths: `${iconDirPath}/mouths.png`,
        accents: `${iconDirPath}/accents.png`
    }
}

export async function loadStaticCubeParts(cubeID: CubeID, cubeSeed: number): Promise<cubePartDefinition> {
    const nothingImage = [new Jimp({ width: 1, height: 1, color: 0x00000000 })];
   
    const partPaths = await getRawCubePartPaths(cubeID, cubeSeed);

    let iconFrames: JimpImage[] = (fs.existsSync(partPaths.cube) ? (await loadAnimatedCubeIcon(partPaths.cube)) : nothingImage);
    let headFrames: JimpImage[] = (fs.existsSync(partPaths.heads) ? (await loadAnimatedCubeIcon(partPaths.heads)) : nothingImage);
    let eyesFrames: JimpImage[] = (fs.existsSync(partPaths.eyes) ? (await loadAnimatedCubeIcon(partPaths.eyes)) : nothingImage);
    let mouthFrames: JimpImage[] = (fs.existsSync(partPaths.mouths) ? (await loadAnimatedCubeIcon(partPaths.mouths)) : nothingImage);
    let accentFrames: JimpImage[] = (fs.existsSync(partPaths.accents) ? (await loadAnimatedCubeIcon(partPaths.accents)) : nothingImage);

    return await parseCubePartImagesIntoCubeParts(iconFrames, headFrames, mouthFrames, eyesFrames, accentFrames, 'seededIcon' in cubeSchema[cubeID]);
}

export function turnPrefixRenderInputsIntoHashableString(mainPrefix: PrefixID, mainPrefixStep: prefixRenderSteps, otherPrefixes: PrefixID[], otherPrefixSteps: prefixRenderSteps[], prefixSeed: number, cubeParts: cubePartDefinition, shorthandSchema: shorthandIconDataSchema, ignoreMain: boolean = false) {
    const usingOtherPrefixes = filterOtherPrefixesForNeeded(mainPrefix, mainPrefixStep, otherPrefixes, otherPrefixSteps, ignoreMain);
    const allPrefixTags = aggregatePrefixTags(mainPrefix, usingOtherPrefixes, mainPrefixStep, otherPrefixSteps, shorthandSchema, ignoreMain);
    let partString = ``;

    if (allPrefixTags.includes(prefixRendererTags.needsHeads)) partString = `${partString},Heads:${JSON.stringify(cubeParts.heads)}`;
    if (allPrefixTags.includes(prefixRendererTags.needsEyes)) partString = `${partString},Eyes:${JSON.stringify(cubeParts.eyes)}`;
    if (allPrefixTags.includes(prefixRendererTags.needsMouths)) partString = `${partString},Mouths:${JSON.stringify(cubeParts.mouths)}`;
    if (allPrefixTags.includes(prefixRendererTags.needsAccents)) {
        const accentValue = cubeParts.accents.reduce((prev, curr, frameIndex) => {
            let scannedValue = 0;
            const valueOffset = frameIndex * curr.bitmap.width * curr.bitmap.height;
            curr.scan(function (x, y, idx) {
                if (curr.bitmap.data[idx + 3] > 0) {
                    scannedValue += (x + (x * y)) + (valueOffset);
                }
            })
            return prev + scannedValue;
        }, 0);
        partString = `${partString},Accents:${accentValue}`;
    }

    return {
        tags: allPrefixTags,
        string: `${ignoreMain ? `` : `Main:${mainPrefix},`}Other:${otherPrefixes.join('|')},Tags:${allPrefixTags.join('|')},Seed:${allPrefixTags.includes(prefixRendererTags.isSeeded) ? prefixSeed : 0},Parts:${partString}`
    }
}