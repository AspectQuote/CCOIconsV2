import { Jimp } from "jimp";
import { JimpImage } from "./utils";
import path from "path";
import * as fs from 'fs-extra';
import { config } from "./config";

export function fillRect(image: JimpImage, rectX: number, rectY: number, width: number, height: number, color: number) {
    image.scan(rectX, rectY, width, height, function (x, y, index) {
        image.setPixelColor(color, x, y);
    })
}

export type strokeMatrix = [
    [number, number, number],
    [number, number, number],
    [number, number, number]
]

export const defaultStrokeMatrix: strokeMatrix = [
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0]
]

export function linearizeChannel(channel: number) {
    if (channel < 0.04045) {
        return channel / 12.92;
    } else {
        return Math.pow((channel + 0.055) / 1.055, 2.4);
    }
}

const luminanceDelta = 6 / 29;
const threeLuminanceDeltaSquared = Math.pow(luminanceDelta, 2) * 3;
const luminanceDeltaCubed = Math.pow(luminanceDelta, 3);
export function luminanceFromColor(color: number) {
    // r = COLOR >> 24 & 0xff
    // g = COLOR >> 16 & 0xff
    // b = COLOR >> 8 & 0xff
    const Y = (linearizeChannel((color >> 24 & 0xff) / 0xff) * 0.2126) + (linearizeChannel((color >> 16 & 0xff) / 0xff) * 0.7152) + (linearizeChannel((color >> 8 & 0xff) / 0xff) * 0.0722);

    let L = 0;
    if (Y > luminanceDeltaCubed) {
        L = Math.cbrt(Y);
    } else {
        L = (Y / threeLuminanceDeltaSquared) + (4 / 29);
    }

    const finalLuminance = ((116 * L) - 16) / 100;
    // console.log(finalLuminance);
    return finalLuminance;
}

export function numberLiteralFromRGBA(r: number, g: number, b: number, a: number) {
    return (Math.floor(clampForRGB(r)) * (2 ** 24)) + (Math.floor(clampForRGB(g)) * (2 ** 16)) + (Math.floor(clampForRGB(b)) * (2 ** 8)) + Math.floor(clampForRGB(a));
}

export function clampForRGB(value: number) {
    return Math.min(255, Math.max(0, value));
}

// Functions below created by Kamil Kiełczewski on StackOverflow
export function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
    let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}
export function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
    let f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5), f(3), f(1)];
}
export function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
    let a = s * Math.min(l, 1 - l);
    let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return [f(0), f(8), f(4)];
}
export function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
    let v = Math.max(r, g, b), c = v - Math.min(r, g, b), f = (1 - Math.abs(v + v - c - 1));
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), f ? c / f : 0, (v + v - c) / 2];
}

export async function hueShiftImage(image: JimpImage, degrees: number) {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const HSV: [number, number, number] = rgb2hsv(image.bitmap.data[idx + 0] / 255, image.bitmap.data[idx + 1] / 255, image.bitmap.data[idx + 2] / 255);
        HSV[0] = (HSV[0] + degrees) % 360;
        if (HSV[0] < 0) HSV[0] = HSV[0] + 360;
        const newRGB = hsv2rgb(...HSV);
        image.bitmap.data[idx + 0] = Math.floor(newRGB[0] * 255);
        image.bitmap.data[idx + 1] = Math.floor(newRGB[1] * 255);
        image.bitmap.data[idx + 2] = Math.floor(newRGB[2] * 255);
    })

    return image;
}

// Thank you user993683 on stackoverflow for this color difference code
// https://stackoverflow.com/questions/13586999/color-difference-similarity-between-two-values-with-js
export function deltaE(rgbA: [number, number, number], rgbB: [number, number, number]) {
    let labA = rgb2lab(rgbA);
    let labB = rgb2lab(rgbB);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}
function rgb2lab(rgb: [number, number, number]) {
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

export function twoColorsAreSimilar(color1: number, color2: number, deltaMax: number) {
    // r = COLOR >> 24 & 0xff
    // g = COLOR >> 16 & 0xff
    // b = COLOR >> 8 & 0xff
    // a = COLOR >> 0 & 0xff
    if (((color1 >> 0) & 0xff) === 0 || ((color2 >> 0) & 0xff) === 0) return false;
    return deltaE(
        [color1 >> 24 & 0xff, color1 >> 16 & 0xff, color1 >> 8 & 0xff],
        [color2 >> 24 & 0xff, color2 >> 16 & 0xff, color2 >> 8 & 0xff]
    ) <= deltaMax;
}
export function dumbBlend(color1: number, color2: number) {
    // Creates erroneous colors. probably needs to be reworked.
    const RGB = [
        Math.min(256, Math.max(0, ((color1 >> 24 & 0xff) + (color2 >> 24 & 0xff)) / 2)) >> 0,
        Math.min(256, Math.max(0, ((color1 >> 16 & 0xff) + (color2 >> 16 & 0xff)) / 2)) >> 0,
        Math.min(256, Math.max(0, ((color1 >> 8 & 0xff) + (color2 >> 8 & 0xff)) / 2)) >> 0,
    ];

    return (RGB[0] * (2 ** 24)) + (RGB[1] * (2 ** 16)) + (RGB[2] * (2 ** 8)) + 0xff;
}

export function rgbaFromNumberLiteral(num: number) {
    return {
        // Just bit shifts. Nothing fancy.
        red: (num >> 24 & 255),
        green: (num >> 16 & 255),
        blue: (num >> 8 & 255),
        alpha: (num & 255),
    }
}

export function lerpColors(color1: { red: number, green: number, blue: number, alpha: number }, color2: { red: number, green: number, blue: number, alpha: number }, alpha: number): [number, number, number, number] {
    return [
        ((color2.red - color1.red) * alpha) + color1.red,
        ((color2.green - color1.green) * alpha) + color1.green,
        ((color2.blue - color1.blue) * alpha) + color1.blue,
        ((color2.alpha - color1.alpha) * alpha) + color1.alpha
    ];
}

export function strokeImage(image: JimpImage, color: number, thickness: number, strokeOnly: boolean = false, matrix: strokeMatrix = defaultStrokeMatrix, modifyOriginal: boolean = false): JimpImage {
    let outlineCoords: { x: number, y: number }[] = [];
    let newImage: JimpImage = modifyOriginal ? image : new Jimp({
        width: image.bitmap.width,
        height: image.bitmap.height,
        color: 0x00000000
    });
    if (matrix.length !== 3 || matrix[0]?.length !== 3) {
        console.log("stroke Image: bad matrix supplied.", matrix)
        return process.exit(1)
    }
    if (!strokeOnly && !modifyOriginal) newImage.composite(image);

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        if (image.bitmap.data[idx + 3] != 0) {
            for (let matrixYIndex = -1; matrixYIndex < matrix.length - 1; matrixYIndex++) {
                const matrixRow = matrix[matrixYIndex + 1];
                for (let matrixXIndex = -1; matrixXIndex < matrixRow.length - 1; matrixXIndex++) {
                    const matrixCheck = matrixRow[matrixXIndex + 1];
                    if (matrixCheck === 1) {
                        const coord = {
                            x: x + matrixXIndex,
                            y: y + matrixYIndex
                        }
                        if (coord.x !== x || coord.y !== y) {
                            if (!(coord.x < 0 || coord.y < 0 || coord.x >= image.bitmap.width || coord.y >= image.bitmap.height) && image.bitmap.data[image.getPixelIndex(coord.x, coord.y) + 3] === 0) {
                                outlineCoords.push({ x: coord.x, y: coord.y });
                            }
                        }
                    }
                }
            }
        }
    })

    outlineCoords.forEach(coordinate => newImage.setPixelColor(color, coordinate.x, coordinate.y));

    for (let strokeIndex = 0; strokeIndex < thickness - 1; strokeIndex++) {
        let newOutlineCoords: typeof outlineCoords = [];
        outlineCoords.forEach(coord => {
            for (let matrixYIndex = -1; matrixYIndex < matrix.length - 1; matrixYIndex++) {
                const matrixRow = matrix[matrixYIndex + 1];
                for (let matrixXIndex = -1; matrixXIndex < matrixRow.length - 1; matrixXIndex++) {
                    const matrixCheck = matrixRow[matrixXIndex + 1];
                    if (matrixCheck === 1) {
                        const newCoord = {
                            x: coord.x + matrixXIndex,
                            y: coord.y + matrixYIndex
                        }
                        if (coord.x !== newCoord.x || coord.y !== newCoord.y) {
                            if (newCoord.x < 0 || newCoord.y < 0 || newCoord.x >= newImage.bitmap.width || newCoord.y >= newImage.bitmap.height || newImage.bitmap.data[newImage.getPixelIndex(newCoord.x, newCoord.y) + 3] === 0) {
                                newOutlineCoords.push({ x: newCoord.x, y: newCoord.y });
                            }
                        }
                    }
                }
            }
        })

        outlineCoords = newOutlineCoords;
        outlineCoords.forEach(coordinate => newImage.setPixelColor(color, coordinate.x, coordinate.y));
    }

    return newImage;
}

export function strokeImageWithResize(image: JimpImage, strokes: { color: number, thickness: number, matrix?: strokeMatrix }[]): JimpImage {
    const totalWidth = strokes.reduce((prev, curr) => {
        return curr.thickness + prev;
    }, 0);
    
    const newImage = new Jimp({ width: image.bitmap.width + (totalWidth * 2), height: image.bitmap.height + (totalWidth * 2), color: 0x00000000 });
    newImage.composite(image, totalWidth, totalWidth);
    image = newImage;
    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex++) {
        const newStroke = strokes[strokeIndex];
        strokeImage(image, newStroke.color, newStroke.thickness, false, newStroke.matrix, true);
    }
    return image;
}

/**
 * Load an icon spritesheet
 * @param iconPath Path to the icon you want to load
 * @returns An array of Jimp images
 */
export async function loadAnimatedCubeIcon(iconPath: string): Promise<JimpImage[]> {
    let cubeFrames: JimpImage[] = [];
    if (!fs.existsSync(iconPath)) {
        console.log(`Cube Icon Path not found!\n${path.resolve(iconPath)}`);
        return cubeFrames;
    }
    let rawImageFile: JimpImage = await Jimp.read(iconPath);
    if (rawImageFile.bitmap.height % rawImageFile.bitmap.width === 0) {
        let framesInAnimation = rawImageFile.bitmap.height / rawImageFile.bitmap.width;
        for (let frameIndex = 0; frameIndex < framesInAnimation; frameIndex++) {
            let newImage = rawImageFile.clone();
            newImage.crop({
                x: 0,
                y: rawImageFile.bitmap.width * frameIndex,
                w: rawImageFile.bitmap.width,
                h: rawImageFile.bitmap.width
            })
            cubeFrames.push(newImage)
        }
    } else {
        cubeFrames.push(rawImageFile);
    }
    return cubeFrames;
}

export function parseHorizontalSpriteSheet(image: JimpImage, frameCount: number): JimpImage[] {
    let parsedFrames: JimpImage[] = [];

    const frameWidth = Math.floor(image.bitmap.width / frameCount);
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const newImage = image.clone();
        newImage.crop({ x: frameWidth * frameIndex, y: 0, w: frameWidth, h: image.bitmap.height });
        parsedFrames.push(newImage);
    }

    return parsedFrames;
}

export async function generateSmallWordImage(word: string, background: number, color: number, padding: number): Promise<JimpImage> {
    const alphabetLetters = parseHorizontalSpriteSheet(await Jimp.read(`${config.sourceImagesDirectory}/misc/smallalphabet.png`), 38);
    return await assembleWordImage(word, alphabetLetters, background, color, padding);
}

const lowerCaseCharCodeOffset = 97;
const upperCaseCharCodeOffset = 65;
const spaceCharCode = 32;
const singleQuoteCharCode = 39;
const doubleQuoteCharCode = 34;
const exclamationCharCode = 33;
const questionMarkCharCode = 63;
const periodCharCode = 46;
const dashCharCode = 45;
const underscoreCharCode = 95;
const equalsCharCode = 61;
const plusCharCode = 43;
const openParenthesisCharCode = 40;
const closedParenthesisCharCode = 41;
export async function assembleWordImage(word: string, alphabetLetters: JimpImage[], background: number, color: number, padding: number): Promise<JimpImage> {
    const imageWidth = alphabetLetters[0].bitmap.width * word.length;
    const imageHeight = alphabetLetters[0].bitmap.height / 2;
    const image = new Jimp({ width: imageWidth, height: imageHeight, color: 0x000000});

    const letterArray = word.split('');

    let writeXPosition = 0;
    for (let letterArrayIndex = 0; letterArrayIndex < letterArray.length; letterArrayIndex++) {
        const character = letterArray[letterArrayIndex];
        let letterImageIndex = character.charCodeAt(0);
        let cropYOffset = 0;
        if (!Number.isNaN(parseInt(character))) { // Character is a number
            letterImageIndex = 26 + parseInt(character);
        } else if (letterImageIndex === spaceCharCode) { // Character is a space
            letterImageIndex = 26;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === singleQuoteCharCode) { // Character is a single quote
            letterImageIndex = 27;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === doubleQuoteCharCode) { // Character is a double quote
            letterImageIndex = 28;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === exclamationCharCode) { // Character is an exclamation point
            letterImageIndex = 29;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === questionMarkCharCode) { // Character is a question mark
            letterImageIndex = 30;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === periodCharCode) { // Character is a period
            letterImageIndex = 31;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === dashCharCode) { // Character is a dash
            letterImageIndex = 32;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === underscoreCharCode) { // Character is an underscore
            letterImageIndex = 33;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === equalsCharCode) { // Character is a equals sign
            letterImageIndex = 34;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === plusCharCode) { // Character is a plus sign
            letterImageIndex = 35;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === openParenthesisCharCode) { // Character is an open parenthesis
            letterImageIndex = 36;
            cropYOffset += imageHeight;
        } else if (letterImageIndex === closedParenthesisCharCode) { // Character is a closed parenthesis
            letterImageIndex = 36;
        } else if (character.toUpperCase() === character) { // Character is uppercase
            letterImageIndex -= upperCaseCharCodeOffset;
        } else { // Character is lowercase
            letterImageIndex -= lowerCaseCharCodeOffset;
            cropYOffset += imageHeight;
        }
        if (letterImageIndex < 0 || letterImageIndex >= alphabetLetters.length) {
            letterImageIndex = alphabetLetters.length - 1;
        }

        const characterImage = alphabetLetters[letterImageIndex].clone().crop({ x: 0, y: cropYOffset, w: alphabetLetters[0].bitmap.width, h: imageHeight + cropYOffset });

        characterImage.scan(function (x, y, idx) {
            if (characterImage.bitmap.data[idx + 3] > 0) {
                image.setPixelColor(color, (x + writeXPosition) % image.bitmap.width, y % image.bitmap.height);
            }
        })

        writeXPosition += characterImage.bitmap.width;
    }

    const outputImage = new Jimp({ width: image.bitmap.width + (padding * 2), height: image.bitmap.height + (padding * 2), color: background });
    outputImage.composite(image, padding, padding);
    return outputImage;
}

export async function saveAnimatedCubeIcon(frames: JimpImage[], iconFileName: string, iconPath: string): Promise<string> {
    if (!fs.existsSync(iconPath)) fs.mkdirSync(iconPath, { recursive: true });
    return new Promise(async (res, rej) => {
        const imagePath = `${iconPath}/${iconFileName}.png` as `${string}.${string}`;
        if (frames.length > 1) {
            let imageSpriteSheet = new Jimp({
                width: frames[0].bitmap.width,
                height: frames[0].bitmap.height * frames.length,
                color: 0x00000000
            });
            frames.forEach((frame, idx) => {
                imageSpriteSheet.composite(frame, 0, idx * frames[0].bitmap.height)
            });
            await imageSpriteSheet.write(imagePath);
        } else {
            // @ts-ignore. Something wrong with Jimp types.
            await frames[0].write(imagePath);
        }
        res(imagePath);
    })
}

export function drawLine(image: JimpImage, color: number, startPoint: { x: number, y: number }, endPoint: { x: number, y: number }) {
    const deltaX = Math.abs(endPoint.x - startPoint.x);
    const scalarX = (startPoint.x < endPoint.x) ? 1 : -1;
    const deltaY = -Math.abs(endPoint.y - startPoint.y);
    const scalarY = (startPoint.y < endPoint.y) ? 1 : -1;
    const currentCoordinate = structuredClone(startPoint);
    let coordinateError = deltaX + deltaY;

    while (true) {
        image.setPixelColor(color, currentCoordinate.x, currentCoordinate.y);
        const doubleError = 2 * coordinateError;
        if (doubleError > deltaY) {
            if (currentCoordinate.x === endPoint.x) break;
            coordinateError += deltaY;
            currentCoordinate.x += scalarX;
        }

        if (doubleError <= deltaX) {
            if (currentCoordinate.y === endPoint.y) break;
            coordinateError += deltaX;
            currentCoordinate.y += scalarY;
        }
    }

    // const overallXChange = endPoint.x - startPoint.x;
    // const overallYChange = endPoint.y - startPoint.y;

    // if (Math.abs(overallYChange) < Math.abs(overallXChange)) {
        
    // } else {
    //     let xChange = endPoint.x - startPoint.x;
    //     let yChange = endPoint.y - startPoint.y;
    //     let currentX = startPoint.x;
    //     let startY = startPoint.y;
    //     let endY = endPoint.y;

    //     if (startPoint.y < endPoint.y) {
    //         xChange = startPoint.x - endPoint.x;
    //         yChange = startPoint.y - endPoint.y;
    //         currentX = endPoint.x;
    //         startY = endPoint.y;
    //         endY = startPoint.y;
    //     }

    //     let xi = 1;
    //     if (xChange < 0) {
    //         xi = -xi;
    //         xChange = -xChange;
    //     }
    //     let distance = (2 * xChange) - yChange;

    //     for (let currentY = startY; currentY < endY; currentY++) {
    //         image.setPixelColor(color, currentX, currentY);
    //         if (distance > 0) {
    //             currentX += xi;
    //             distance += (2 * (xChange - yChange));
    //         } else {
    //             distance += 2 * xChange;
    //         }
    //     }
    // }
}