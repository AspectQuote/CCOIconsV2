import { Jimp, ResizeStrategy } from "jimp";
import { clampForRGB, deltaE, dumbBlend, hsv2rgb, lerpColors, luminanceFromColor, numberLiteralFromRGBA, rgb2hsv, rgbaFromNumberLiteral, twoColorsAreSimilar } from "./imageutils";
import { JimpImage } from "./utils";
import { config } from "./config";

export const allFilterIDs = [
    "dotmatrix",
    "bside",
    "rotatedscreentone",
    "twotone",
    "chromaticabberate",
    "pixelsort",
    "dither",
    "errordiffusiondither",
    "mosaic",
    "reversesharpness",
    "screentone",
    "median"
] as const;

const blacklistedRandomFilters = [] as filterID[];

export type filterID = typeof allFilterIDs[number];

export enum pixelSortDirections {
    rightToLeft,
    leftToRight,
    topToBottom,
    bottomToTop
}

export async function generateContrastMask(image: JimpImage, lowThereshold: number = 0.2, highThereshold: number = 0.6): Promise<JimpImage> {
    const newImage = new Jimp({width: image.bitmap.width, height: image.bitmap.height, color: 0x000000ff});

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const luminance = luminanceFromColor(image.getPixelColor(x, y));
        if (luminance > lowThereshold && luminance < highThereshold) newImage.setPixelColor(0xffffffff, x, y);
        // const val = Math.floor(luminance * 255);
        // newImage.bitmap.data[idx] = val;
        // newImage.bitmap.data[idx + 1] = val;
        // newImage.bitmap.data[idx + 2] = val;
    });

    return newImage;
}

export async function pixelSortFilter(image: JimpImage, direction: pixelSortDirections = pixelSortDirections.rightToLeft, contrastMaskLow: number = 0.55, contrastMaskHigh: number = 0.9): Promise<JimpImage> {
    const maskImage = await generateContrastMask(image, contrastMaskLow, contrastMaskHigh);
    const newImage = new Jimp({ width: image.bitmap.width, height: image.bitmap.height, color: 0x00000000});
    const maskColor = 0xffffffff;

    const sortingMethod = ([pixelSortDirections.rightToLeft, pixelSortDirections.bottomToTop].includes(direction)) ? ((a: number, b: number) => {
        if (luminanceFromColor(a) < luminanceFromColor(b)) return -1;
        return 1;
    }) : ((a: number, b: number) => {
        if (luminanceFromColor(a) > luminanceFromColor(b)) return -1;
        return 1;
    })

    if (direction === pixelSortDirections.leftToRight || direction === pixelSortDirections.rightToLeft) {
        for (let yPosition = 0; yPosition < image.bitmap.height; yPosition++) {
            for (let xPosition = 0; xPosition < image.bitmap.width; xPosition++) {
                if (maskImage.getPixelColor(xPosition, yPosition) === maskColor) {
                    let rowEnded = false;
                    let indexOffsetAccumulator = 0;
                    let foundColors: number[] = [];
                    while (!rowEnded) {
                        if (maskImage.getPixelColor(xPosition + indexOffsetAccumulator, yPosition) === maskColor && xPosition + indexOffsetAccumulator < image.bitmap.width) {
                            foundColors.push(image.getPixelColor(xPosition + indexOffsetAccumulator, yPosition));
                            indexOffsetAccumulator++;
                        } else {
                            rowEnded = true;
                        }
                    }
                    foundColors.sort(sortingMethod);
                    for (let foundColorIndex = 0; foundColorIndex < foundColors.length; foundColorIndex++) {
                        const foundColor = foundColors[foundColorIndex];
                        newImage.setPixelColor(foundColor, xPosition + foundColorIndex, yPosition);
                    }
                    xPosition += indexOffsetAccumulator - 1;
                } else {
                    newImage.setPixelColor(image.getPixelColor(xPosition, yPosition), xPosition, yPosition);
                }
            }
        }
    } else {
        for (let xPosition = 0; xPosition < image.bitmap.width; xPosition++) {
            for (let yPosition = 0; yPosition < image.bitmap.height; yPosition++) {
                if (maskImage.getPixelColor(xPosition, yPosition) === maskColor) {
                    let columnEnded = false;
                    let indexOffsetAccumulator = 0;
                    let foundColors: number[] = [];
                    while (!columnEnded) {
                        if (maskImage.getPixelColor(xPosition, yPosition + indexOffsetAccumulator) === maskColor && yPosition + indexOffsetAccumulator < image.bitmap.height) {
                            foundColors.push(image.getPixelColor(xPosition, yPosition + indexOffsetAccumulator));
                            indexOffsetAccumulator++;
                        } else {
                            columnEnded = true;
                        }
                    }
                    foundColors.sort(sortingMethod);
                    for (let foundColorIndex = 0; foundColorIndex < foundColors.length; foundColorIndex++) {
                        const foundColor = foundColors[foundColorIndex];
                        newImage.setPixelColor(foundColor, xPosition, yPosition + foundColorIndex);
                    }
                    yPosition += indexOffsetAccumulator - 1;
                } else {
                    newImage.setPixelColor(image.getPixelColor(xPosition, yPosition), xPosition, yPosition);
                }
            }
        }
    }

    return newImage;
}

function twoDimensionalGaussianFunction(x: number, y: number, stdDev: number) {
    const eulerTerm = Math.E ** (((x ** 2) + (y ** 2)) / (2 * (stdDev ** 2)));
    return 1 / (2 * Math.PI * (stdDev ** 2) * eulerTerm);
}

function generateGaussianMatrix(radius: number, deviationOverride: number | false = false) {
    const outputArray: number[][] = [];
    const deviation = (typeof deviationOverride === "number") ? deviationOverride : radius / (2 * Math.sqrt(Math.PI));

    for (let yIndex = -radius; yIndex < radius + 1; yIndex++) {
        const row: number[] = [];
        for (let xIndex = -radius; xIndex < radius + 1; xIndex++) {
            const trueX = xIndex;
            const trueY = yIndex;
            row.push(twoDimensionalGaussianFunction(trueX, trueY, deviation));
        }
        outputArray.push(row);
    }

    return outputArray;
}

export async function gaussianBlur(sourceImage: JimpImage, radius: number, deviationOverride: number | false = false) {
    const outputImage = sourceImage.clone();
    const matrix = generateGaussianMatrix(radius, deviationOverride);

    outputImage.scan(0, 0, outputImage.bitmap.width, outputImage.bitmap.height, function (x, y, idx) {
        let accumulatedRGB: [number, number, number] = [0, 0, 0];
        for (let yIndex = -radius; yIndex < radius + 1; yIndex++) {
            for (let xIndex = -radius; xIndex < radius + 1; xIndex++) {
                const sourceIndex = sourceImage.getPixelIndex(x + xIndex, y + yIndex);
                const matrixValue = matrix[yIndex + radius][xIndex + radius];

                accumulatedRGB[0] += sourceImage.bitmap.data[sourceIndex + 0] * matrixValue;
                accumulatedRGB[1] += sourceImage.bitmap.data[sourceIndex + 1] * matrixValue;
                accumulatedRGB[2] += sourceImage.bitmap.data[sourceIndex + 2] * matrixValue;
            }
        }

        outputImage.bitmap.data[idx + 0] = clampForRGB(Math.floor(accumulatedRGB[0]));
        outputImage.bitmap.data[idx + 1] = clampForRGB(Math.floor(accumulatedRGB[1]));
        outputImage.bitmap.data[idx + 2] = clampForRGB(Math.floor(accumulatedRGB[2]));
    })

    return outputImage;
}

export async function gaussianEdgeDetection(image: JimpImage, radius: number) {
    const edgeImage = await gaussianBlur(image, radius, 3);

    edgeImage.scan(0, 0, edgeImage.bitmap.width, edgeImage.bitmap.height, function (x, y, idx) {
        const sourceIndex = image.getPixelIndex(x, y);

        // console.log(centerRGB);
        edgeImage.bitmap.data[idx + 0] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 0] - edgeImage.bitmap.data[idx + 0]));
        edgeImage.bitmap.data[idx + 1] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 1] - edgeImage.bitmap.data[idx + 1]));
        edgeImage.bitmap.data[idx + 2] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 2] - edgeImage.bitmap.data[idx + 2]));
        // usingImage.bitmap.data[idx + 3] = Math.floor((centerRGB[0] + centerRGB[1] + centerRGB[2])/3);
    });

    return edgeImage;
}

async function separatedGaussianBlur(sourceImage: JimpImage, radius: number = 3): Promise<JimpImage> {
    let halfMatrix = generateGaussianMatrix(radius)[radius];
    // WARNING: EXTREMELY STUPID WAY TO "SCALE" THE GENERATED GAUSSIAN TO NORMALIZE IT.
    // console.log("Matrix Weight (Before): " + halfMatrix.reduce((a, b) => { return a + b }, 0));
    // let iterationCount = 1;
    const iterationPower = 1.005;
    while (halfMatrix.reduce((a, b) => { return a + b }, 0) < 1) {
        // iterationCount++;
        halfMatrix = halfMatrix.map(item => item * iterationPower);
    }
    // console.log(`Matrix Weight (After): ${halfMatrix.reduce((a, b) => { return a + b; }, 0)} (${iterationPower}^${iterationCount})`);
    const separatedClone = new Jimp({width: sourceImage.bitmap.width, height: sourceImage.bitmap.height, color: 0x000000ff});

    separatedClone.scan(0, 0, sourceImage.bitmap.width, sourceImage.bitmap.height, function (x, y, idx) {
        let accumulatedRGB: [number, number, number] = [0, 0, 0];
        for (let matrixIndex = -radius; matrixIndex < radius + 1; matrixIndex++) {
            const sourceIndex = sourceImage.getPixelIndex(x + matrixIndex, y);
            const matrixValue = halfMatrix[matrixIndex + radius];

            accumulatedRGB[0] += sourceImage.bitmap.data[sourceIndex + 0] * matrixValue;
            accumulatedRGB[1] += sourceImage.bitmap.data[sourceIndex + 1] * matrixValue;
            accumulatedRGB[2] += sourceImage.bitmap.data[sourceIndex + 2] * matrixValue;
        }

        separatedClone.bitmap.data[idx + 0] = clampForRGB(accumulatedRGB[0]);
        separatedClone.bitmap.data[idx + 1] = clampForRGB(accumulatedRGB[1]);
        separatedClone.bitmap.data[idx + 2] = clampForRGB(accumulatedRGB[2]);
    })

    separatedClone.scan(0, 0, separatedClone.bitmap.width, separatedClone.bitmap.height, function (x, y, idx) {
        let accumulatedRGB: [number, number, number] = [0, 0, 0];
        for (let matrixIndex = -radius; matrixIndex < radius + 1; matrixIndex++) {
            const sourceIndex = separatedClone.getPixelIndex(x, y + matrixIndex);
            const matrixValue = halfMatrix[matrixIndex + radius];

            accumulatedRGB[0] += separatedClone.bitmap.data[sourceIndex + 0] * matrixValue;
            accumulatedRGB[1] += separatedClone.bitmap.data[sourceIndex + 1] * matrixValue;
            accumulatedRGB[2] += separatedClone.bitmap.data[sourceIndex + 2] * matrixValue;
        }

        separatedClone.bitmap.data[idx + 0] = clampForRGB(accumulatedRGB[0]);
        separatedClone.bitmap.data[idx + 1] = clampForRGB(accumulatedRGB[1]);
        separatedClone.bitmap.data[idx + 2] = clampForRGB(accumulatedRGB[2]);
    })

    return separatedClone;
}

export async function separatedGaussianEdgeDetection(image: JimpImage, radius: number) {
    const edgeImage = await separatedGaussianBlur(image, radius);

    edgeImage.scan(0, 0, edgeImage.bitmap.width, edgeImage.bitmap.height, function (x, y, idx) {
        const sourceIndex = image.getPixelIndex(x, y);

        // console.log(centerRGB);
        edgeImage.bitmap.data[idx + 0] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 0] - edgeImage.bitmap.data[idx + 0]));
        edgeImage.bitmap.data[idx + 1] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 1] - edgeImage.bitmap.data[idx + 1]));
        edgeImage.bitmap.data[idx + 2] = clampForRGB(Math.floor(image.bitmap.data[sourceIndex + 2] - edgeImage.bitmap.data[idx + 2]));
        // usingImage.bitmap.data[idx + 3] = Math.floor((centerRGB[0] + centerRGB[1] + centerRGB[2])/3);
    });

    return edgeImage;
}

export type gaussianMethodType = "fast" | "quality";

export async function sharpenImage(image: JimpImage, magnitude: number, edgeRadius: number, gaussianMethod: gaussianMethodType = "fast") {
    let detailImage: JimpImage;

    if (gaussianMethod == "fast") {
        detailImage = await separatedGaussianEdgeDetection(image, edgeRadius);
    } else {
        detailImage = await gaussianEdgeDetection(image, edgeRadius);
    }

    // return detailImage;

    const trueSharpnessMagnitude = (magnitude)

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const detailIndex = detailImage.getPixelIndex(x, y);
        image.bitmap.data[idx + 0] = clampForRGB(Math.floor(image.bitmap.data[idx + 0] + (detailImage.bitmap.data[detailIndex + 0] * trueSharpnessMagnitude)));
        image.bitmap.data[idx + 1] = clampForRGB(Math.floor(image.bitmap.data[idx + 1] + (detailImage.bitmap.data[detailIndex + 1] * trueSharpnessMagnitude)));
        image.bitmap.data[idx + 2] = clampForRGB(Math.floor(image.bitmap.data[idx + 2] + (detailImage.bitmap.data[detailIndex + 2] * trueSharpnessMagnitude)));
    })
    return image;
}

export type bSideBlendType = "random" | "gradient" | "dithered" | "streaked";

export async function createBSideV2Image(originalImage: JimpImage, similarThereshold: number = 5, maxIteration: number = 3, blendType: bSideBlendType = "dithered", iteration: number = 1, resizeMode: ResizeStrategy = ResizeStrategy.BILINEAR): Promise<JimpImage> {
    const before = performance.now();

    if (iteration === 1) {
        if (originalImage.bitmap.width * originalImage.bitmap.height > config.bSideMaxPixels) {
            const scaleChange = Math.sqrt(config.bSideMaxPixels / (originalImage.bitmap.width * originalImage.bitmap.height));
            console.log(`\nScale Change Applied. Original Pixel Count: ${originalImage.bitmap.width * originalImage.bitmap.height}\nNew Pixel Count: ${originalImage.bitmap.width * scaleChange * originalImage.bitmap.height * scaleChange}`);
            originalImage.resize({
                w: Math.ceil(originalImage.bitmap.width * scaleChange),
                h: Math.ceil(originalImage.bitmap.height * scaleChange),
                mode: resizeMode
            });
        }
    }

    const newImage: JimpImage = new Jimp({width: originalImage.bitmap.width * 2, height: originalImage.bitmap.height * 2});
    newImage.scan(0, 0, newImage.bitmap.width, newImage.bitmap.height, function (x, y, idx) {
        const originalImageX = Math.floor(x / 2);
        const originalImageY = Math.floor(y / 2);

        const adj1X = originalImageX + (((x % 2) === 1) ? 1 : -1);
        const adj2Y = originalImageY + (((y % 2) === 1) ? 1 : -1);
        const adjacentPixelColor1 = (adj1X >= originalImage.bitmap.width || adj1X < 0) ? 0 : originalImage.getPixelColor(adj1X, originalImageY);
        const adjacentPixelColor2 = (adj2Y >= originalImage.bitmap.height || adj2Y < 0) ? 0 : originalImage.getPixelColor(originalImageX, adj2Y);

        // console.log(`\nPosition: (${x}, ${y}) (${oddY ? 'B' : 'T'}${oddX ? 'R' : 'L'}) | (${originalImagePosition.x}, ${originalImagePosition.y}) checks:\n(${originalImagePosition.x + checkingXNum}, ${originalImagePosition.y}) and (${originalImagePosition.x}, ${originalImagePosition.y + checkingYNum})`)
        if ( /*(adjacentPixelColor1 >> 0 & 0xff) === 0 || (adjacentPixelColor2 >> 0 & 0xff) === 0 || */(adjacentPixelColor1 !== adjacentPixelColor2 && !twoColorsAreSimilar(adjacentPixelColor1, adjacentPixelColor2, similarThereshold))) {
            newImage.setPixelColor(originalImage.getPixelColor(originalImageX, originalImageY), x, y);
        } else {
            switch (blendType) {
                case "random":
                    newImage.setPixelColor((Math.random() > 0.5) ? adjacentPixelColor1 : adjacentPixelColor2, x, y);
                    break;
                case 'gradient':
                    const newColor = dumbBlend(adjacentPixelColor1, adjacentPixelColor2) % (0xffffffff + 1);
                    newImage.setPixelColor(newColor, x, y);
                    break;
                case 'dithered':
                    newImage.setPixelColor(((((x + y)) % 2) == 0) ? adjacentPixelColor2 : adjacentPixelColor1, x, y);
                    break;
                case 'streaked':
                    newImage.setPixelColor((((((originalImageX + originalImageY) / 3) >> 0) % 2) == 0) ? adjacentPixelColor2 : adjacentPixelColor1, x, y);
                    break;
                default:
                    break;
            }
        }
    })


    console.log(`B-Side V2: Finished Iteration #${iteration} in ${performance.now() - before}ms.`);
    if (iteration === maxIteration) {
        return newImage;
        // return newImage.resize(newImage.bitmap.width * 6, newImage.bitmap.height * 6, Jimp.RESIZE_NEAREST_NEIGHBOR);
    } else {
        return createBSideV2Image(newImage, similarThereshold, maxIteration, blendType, iteration + 1);
    }
}

let bayer2x2 = [
    [0, 2],
    [3, 1],
]

bayer2x2 = bayer2x2.map(item => {
    return item.map(item => {
        return item / 4;
    })
})

let bayer4x4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
]

bayer4x4 = bayer4x4.map(item => {
    return item.map(item => {
        return item / 16;
    })
})

let bayer8x8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
]

bayer8x8 = bayer8x8.map(item => {
    return item.map(item => {
        return item / 64;
    })
})

let screenToneMatrix = (() => {
    let outputMatrix: number[][] = [];
    const matrixRadius = 4;
    const maxDistance = ((matrixRadius * 2) * Math.SQRT2);

    for (let yIndex = -matrixRadius; yIndex < matrixRadius + 1; yIndex++) {
        const newRow: number[] = [];
        for (let xIndex = -matrixRadius; xIndex < matrixRadius + 1; xIndex++) {
            const distance = Math.sqrt((yIndex ** 2) + (xIndex ** 2));
            newRow.push(Math.min(1, Math.max(0, (1 - (distance / maxDistance)) ** 1.5)));
        }
        outputMatrix.push(newRow);
    }

    // outputMatrix.push(...structuredClone(outputMatrix));

    // const shiftOperations = matrixRadius + 1;
    // for (let rowIndex = 0; rowIndex < matrixRadius * 2 + 1; rowIndex++) {
    //     for (let shiftIndex = 0; shiftIndex < shiftOperations; shiftIndex++) {
    //         outputMatrix[rowIndex].push(outputMatrix[rowIndex].shift() ?? 0);
    //     }
    // }

    return outputMatrix;
})()

export type ditherMatrixID = 2 | 4 | 8 | "stripes" | "screentone" | "45";

export async function getDitheringMatrix(matrix: ditherMatrixID) {
    let usingMatrix: number[][];
    switch (matrix) {
        case 2:
            usingMatrix = structuredClone(bayer2x2);
            break;
        case 4:
            usingMatrix = structuredClone(bayer4x4);
            break;
        case 8:
            usingMatrix = structuredClone(bayer8x8);
            break;
        case "stripes":
            usingMatrix = (() => {
                const outputMatrix: number[][] = [];
                const width = 128;
                const baseRow: number[] = [];
                while (baseRow.length < width) {
                    baseRow.push(Math.random() * 0.95);
                }

                while (outputMatrix.length < width) {
                    baseRow.unshift(baseRow.pop() ?? 0);
                    const newBaseRow = structuredClone(baseRow).map(thereshold => {
                        return (Math.random() > 0.95) ? thereshold / 2 : thereshold;
                    });

                    outputMatrix.push(newBaseRow);
                }

                // console.log(outputMatrix);
                return outputMatrix;
            })()
            break;
        case "screentone":
            return screenToneMatrix;
        case "45":
            const image = await Jimp.read(`${config.sourceImagesDirectory}/images/45dither.png`);
            const constructedMatrix: number[][] = [];

            for (let yIndex = 0; yIndex < image.bitmap.height; yIndex++) {
                const newRow: number[] = [];
                for (let xIndex = 0; xIndex < image.bitmap.height; xIndex++) {
                    const pixelIndex = image.getPixelIndex(xIndex, yIndex);
                    newRow.push(image.bitmap.data[pixelIndex] / 255);
                }
                constructedMatrix.push(newRow);
            }

            return constructedMatrix;
        default:
            usingMatrix = [[1]];
            break;
    }

    return usingMatrix;
}

export async function generateTwoToneImage(image: JimpImage, matrix: ditherMatrixID = 4, scaleFactor: number = 4, toneLight: number = 0xffffffff, toneDark: number = 0x000000ff) {
    const resizedImage: JimpImage = image.clone()
    resizedImage.resize({ w: image.bitmap.width * (1 / scaleFactor), h: image.bitmap.height * (1 / scaleFactor) });
    // const newImage = methods.quantize(resizedImage, { colors });
    const newImage = resizedImage;
    let usingMatrix: number[][] = await getDitheringMatrix(matrix);
    const toneLightRGBA = rgbaFromNumberLiteral(toneLight);
    const toneDarkRGBA = rgbaFromNumberLiteral(toneDark);

    newImage.scan(0, 0, newImage.bitmap.width, newImage.bitmap.height, function (x, y, idx) {
        const luminance = luminanceFromColor(newImage.getPixelColor(x, y));
        if (matrix === "screentone") {
            const matrixOffsetX = 0;
            const matrixOffsetY = 0;
            const matrixValue = usingMatrix[Math.abs(y + matrixOffsetY) % usingMatrix.length][Math.abs(x + matrixOffsetX) % usingMatrix[Math.abs(y + matrixOffsetY) % usingMatrix.length].length];
            if (luminance > matrixValue) {
                const appliedColor = numberLiteralFromRGBA(...lerpColors(toneDarkRGBA, toneLightRGBA, Math.min(1, (luminance - matrixValue) / 0.33)));
                newImage.setPixelColor(appliedColor, x, y);
            } else {
                // const appliedColor = numberLiteralFromRGBA(...lerpColors(toneLightRGBA, toneDarkRGBA, 1 - Math.min(1, (luminance - matrixValue))));
                newImage.setPixelColor(toneDark, x, y);
            }
        } else {
            const matrixValue = usingMatrix[y % usingMatrix.length][x % usingMatrix[y % usingMatrix.length].length];
            if (luminance > matrixValue) {
                newImage.setPixelColor(toneLight, x, y);
            } else {
                newImage.setPixelColor(toneDark, x, y);
            }
        }
    });

    newImage.resize({ w: newImage.bitmap.width * scaleFactor, h: newImage.bitmap.height * scaleFactor, mode: ResizeStrategy.NEAREST_NEIGHBOR });
    return newImage;
}

function quantizeChannel(val: number, nM1: number) {
    return Math.floor((Math.floor((val * nM1) + 0.5) / nM1) * 255);
}

export function quantizeImage(image: JimpImage, colorsPerChannel: number) {
    const nM1 = Math.floor(colorsPerChannel) - 1;
    image.scan(function (x, y, idx) {
        image.bitmap.data[idx + 0] = quantizeChannel(image.bitmap.data[idx + 0] / 255, nM1);
        image.bitmap.data[idx + 1] = quantizeChannel(image.bitmap.data[idx + 1] / 255, nM1);
        image.bitmap.data[idx + 2] = quantizeChannel(image.bitmap.data[idx + 2] / 255, nM1);
    })
}

export function quantizePixel(pixel: [number, number, number], colorsPerChannel: number): [number, number, number] {
    const nM1 = Math.floor(colorsPerChannel) - 1;
    return [quantizeChannel(pixel[0] / 255, nM1), quantizeChannel(pixel[1] / 255, nM1), quantizeChannel(pixel[2] / 255, nM1)] as [number, number, number];
}

export async function ditherImage(image: JimpImage, matrix: ditherMatrixID = 8, spread: number = 0.1, colorsPerChannel: number = 4, scaleFactor: number = 3) {
    let usingMatrix: number[][] = await getDitheringMatrix(matrix);

    image.resize({w: Math.floor(image.bitmap.width / scaleFactor), h: Math.floor(image.bitmap.height / scaleFactor), mode: ResizeStrategy.BILINEAR});
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const matrixValue = Math.max(0, Math.min(1, (usingMatrix[y % usingMatrix.length][x % usingMatrix[y % usingMatrix.length].length] - 0.5) * spread));
        image.bitmap.data[idx + 0] = clampForRGB(Math.floor(((image.bitmap.data[idx + 0] / 255) + matrixValue) * 255));
        image.bitmap.data[idx + 1] = clampForRGB(Math.floor(((image.bitmap.data[idx + 1] / 255) + matrixValue) * 255));
        image.bitmap.data[idx + 2] = clampForRGB(Math.floor(((image.bitmap.data[idx + 2] / 255) + matrixValue) * 255));
    });

    // return image
    quantizeImage(image, colorsPerChannel);
    image.resize({ w: Math.floor(image.bitmap.width * scaleFactor), h: Math.floor(image.bitmap.height * scaleFactor), mode: ResizeStrategy.NEAREST_NEIGHBOR });
    return image;
}

function generateTwoDimensionalArray(width: number, height: number): number[][] {
    console.log(`Creating array of width: ${width} and height: ${height}`);
    const columns: number[] = [];
    while (columns.length < height) {
        columns.push(0);
    }
    const rows: number[][] = [];
    while (rows.length < width) {
        rows.push(structuredClone(columns));
    }
    return rows;
}

const errorDiffusionMatrices = {
    "Floyd-Steinberg": [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 7 / 16, 0],
        [0, 3 / 16, 5 / 16, 1 / 16, 0],
        [0, 0, 0, 0, 0],
    ],
    "Atkinson": [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1 / 8, 1 / 8],
        [0, 1 / 8, 1 / 8, 1 / 8, 0],
        [0, 0, 1 / 8, 0, 0],
    ],
    "Custom": [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 3 / 8, 3 / 8],
        [0, 0, 2 / 8, 0, 0],
        [0, 0, 0, 0, 0],
    ]
} as const satisfies {
    [key: string]: [
        [number, number, number, number, number],
        [number, number, number, number, number],
        [number, number, number, number, number],
        [number, number, number, number, number],
        [number, number, number, number, number],
    ]
};

type errorDiffusionMatrixID = keyof typeof errorDiffusionMatrices;

export async function errorDiffusionDither(image: JimpImage, algorithm: errorDiffusionMatrixID, colorsPerChannel: number = 4, scaleFactor: number = 1) {
    image.resize({ w: Math.floor(image.bitmap.width / scaleFactor), h: Math.floor(image.bitmap.height / scaleFactor), mode: ResizeStrategy.BILINEAR });

    const errorRed = generateTwoDimensionalArray(image.bitmap.width, image.bitmap.height);
    const errorGreen = generateTwoDimensionalArray(image.bitmap.width, image.bitmap.height);
    const errorBlue = generateTwoDimensionalArray(image.bitmap.width, image.bitmap.height);
    const diffusionMatrix = errorDiffusionMatrices[algorithm];

    image.scan(function (x, y, idx) {
        const pixelIndex = image.getPixelIndex(x, y);
        const oldColor = [
            clampForRGB(image.bitmap.data[pixelIndex] + ((0.5 + errorRed[x][y]) * 255)),
            clampForRGB(image.bitmap.data[pixelIndex + 1] + ((0.5 + errorGreen[x][y]) * 255)),
            clampForRGB(image.bitmap.data[pixelIndex + 2] + ((0.5 + errorBlue[x][y]) * 255))
        ];
        const newColor = quantizePixel(structuredClone(oldColor) as [number, number, number], colorsPerChannel);
        image.bitmap.data[idx + 0] = newColor[0];
        image.bitmap.data[idx + 1] = newColor[1];
        image.bitmap.data[idx + 2] = newColor[2];

        for (let distributedY = 0; distributedY < 5; distributedY++) {
            for (let distributedX = 0; distributedX < 5; distributedX++) {
                const diffusionFactor = diffusionMatrix[distributedX][distributedY];
                if (diffusionFactor > 0) {
                    const xOffset = distributedX - 2;
                    const yOffset = distributedY - 2;
                    if (errorRed[x + xOffset] !== undefined && errorRed[x + xOffset][y + yOffset] !== undefined) {
                        const distributedChannel = ((((oldColor[0] - newColor[0]) / 255) - 2) * diffusionFactor);
                        errorRed[x + xOffset][y + yOffset] += (distributedChannel * diffusionFactor);
                    }
                    if (errorBlue[x + xOffset] !== undefined && errorBlue[x + xOffset][y + yOffset] !== undefined) {
                        const distributedChannel = ((((oldColor[1] - newColor[1]) / 255) - 2) * diffusionFactor);
                        errorBlue[x + xOffset][y + yOffset] += (distributedChannel * diffusionFactor);
                    }
                    if (errorGreen[x + xOffset] !== undefined && errorGreen[x + xOffset][y + yOffset] !== undefined) {
                        const distributedChannel = ((((oldColor[2] - newColor[2]) / 255) - 2) * diffusionFactor);
                        errorGreen[x + xOffset][y + yOffset] += (distributedChannel * diffusionFactor);
                    }
                }
            }
        }
    });

    image.resize({ w: Math.floor(image.bitmap.width * scaleFactor), h: Math.floor(image.bitmap.height * scaleFactor), mode: ResizeStrategy.NEAREST_NEIGHBOR });
    return image;
}

export function chromaticAbberation(image: JimpImage, xOffset: number, yOffset: number, channelOffset: 0 | 1 | 2) {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const channelIndex = image.getPixelIndex(x + xOffset, y + yOffset);
        image.bitmap.data[idx + channelOffset] = image.bitmap.data[channelIndex + channelOffset];
    })
    return image;
}

export function mosaicEffect(image: JimpImage, tileWidth: number = 10, doX: boolean = true, doY: boolean = true, deltaMax: number = 4): JimpImage {
    const newImage: JimpImage = new Jimp({width: image.bitmap.width, height: image.bitmap.height, color: 0x000000ff});

    for (let xIndex = 0; xIndex < image.bitmap.width; xIndex++) {
        for (let yIndex = 0; yIndex < image.bitmap.height; yIndex++) {
            if (xIndex % tileWidth !== 0 && yIndex % tileWidth !== 0) {
                const usingPixelIndex = image.getPixelIndex(xIndex - (xIndex % tileWidth), yIndex - (yIndex % tileWidth));
                const newPixelIndex = newImage.getPixelIndex(xIndex, yIndex);
                newImage.bitmap.data[newPixelIndex + 0] = image.bitmap.data[usingPixelIndex + 0];
                newImage.bitmap.data[newPixelIndex + 1] = image.bitmap.data[usingPixelIndex + 1];
                newImage.bitmap.data[newPixelIndex + 2] = image.bitmap.data[usingPixelIndex + 2];
            }
        }
    }

    newImage.scan(function (x, y, idx) {
        if (doY && y % tileWidth === 0) {
            const aboveColor = rgbaFromNumberLiteral(newImage.getPixelColor(x, y - 1));
            const belowColor = rgbaFromNumberLiteral(newImage.getPixelColor(x, y + 1));
            const verticalDelta = deltaE([aboveColor.red, aboveColor.green, aboveColor.blue], [belowColor.red, belowColor.green, belowColor.blue]);

            // console.log(verticalDelta);
            if (verticalDelta < deltaMax) {
                newImage.bitmap.data[idx + 0] = aboveColor.red;
                newImage.bitmap.data[idx + 1] = aboveColor.green;
                newImage.bitmap.data[idx + 2] = aboveColor.blue;
            }
        }

        if (doX && x % tileWidth === 0) {
            const leftColor = rgbaFromNumberLiteral(newImage.getPixelColor(x - 1, y));
            const rightColor = rgbaFromNumberLiteral(newImage.getPixelColor(x + 1, y));
            const verticalDelta = deltaE([leftColor.red, leftColor.green, leftColor.blue], [rightColor.red, rightColor.green, rightColor.blue]);

            // console.log(verticalDelta);
            if (verticalDelta < deltaMax) {
                newImage.bitmap.data[idx + 0] = leftColor.red;
                newImage.bitmap.data[idx + 1] = leftColor.green;
                newImage.bitmap.data[idx + 2] = leftColor.blue;
            }
        }

        if (doX && doY && x % tileWidth === 0 && y % tileWidth === 0) {
            const topRightColor = rgbaFromNumberLiteral(newImage.getPixelColor(x + 1, y + 1));
            const topLeftColor = rgbaFromNumberLiteral(newImage.getPixelColor(x - 1, y + 1));
            const bottomRightColor = rgbaFromNumberLiteral(newImage.getPixelColor(x + 1, y - 1));
            const bottomLeftColor = rgbaFromNumberLiteral(newImage.getPixelColor(x - 1, y - 1));

            if (
                deltaE([topRightColor.red, topRightColor.green, topRightColor.blue], [topLeftColor.red, topLeftColor.green, topLeftColor.blue]) < deltaMax &&

                deltaE([bottomRightColor.red, bottomRightColor.green, bottomRightColor.blue], [bottomLeftColor.red, bottomLeftColor.green, bottomLeftColor.blue]) < deltaMax &&

                deltaE([topLeftColor.red, topLeftColor.green, topLeftColor.blue], [bottomLeftColor.red, bottomLeftColor.green, bottomLeftColor.blue]) < deltaMax &&

                deltaE([topRightColor.red, topRightColor.green, topRightColor.blue], [bottomRightColor.red, bottomRightColor.green, bottomRightColor.blue]) < deltaMax
            ) {
                newImage.bitmap.data[idx + 0] = bottomLeftColor.red;
                newImage.bitmap.data[idx + 1] = bottomLeftColor.green;
                newImage.bitmap.data[idx + 2] = bottomLeftColor.blue;
            }
        }
    })

    return newImage;
}

export type LinearMatrix = [
    [number, number],
    [number, number]
];

export async function rotateImage(image: JimpImage, radians: number) {
    return applyLinearMatrix(image, [
        [Math.cos(radians), -Math.sin(radians)],
        [Math.sin(radians), Math.cos(radians)]
    ]);
}

export function applyLinearMatrix(image: JimpImage, matrix: LinearMatrix): JimpImage {
    const newImage: JimpImage = new Jimp({width: image.bitmap.width, height: image.bitmap.height, color: 0x00000000});

    const inverseMatrix: LinearMatrix = generateInverseLinearMatrix(matrix);

    const halfMeasures = {
        width: (image.bitmap.width / 2),
        height: (image.bitmap.height / 2)
    };

    newImage.scan(0, 0, newImage.bitmap.width, newImage.bitmap.height, function (x, y, idx) {
        const pixelX = x - halfMeasures.width;
        const pixelY = y - halfMeasures.height;

        const sourcePixelX = (pixelX * inverseMatrix[0][0]) + (pixelY * inverseMatrix[0][1]) + halfMeasures.width;
        const sourcePixelY = (pixelX * inverseMatrix[1][0]) + (pixelY * inverseMatrix[1][1]) + halfMeasures.height;

        if (sourcePixelX < 0 || sourcePixelX >= image.bitmap.width || sourcePixelY < 0 || sourcePixelY >= image.bitmap.height) {
        } else {
            newImage.setPixelColor(image.getPixelColor(sourcePixelX, sourcePixelY), x, y);
        }
    });

    return newImage;
}

export function generateInverseLinearMatrix(matrix: LinearMatrix) {
    const inversionConstant = 1 / ((matrix[0][0] * matrix[1][1]) - (matrix[0][1] * matrix[1][0]))
    return [
        [matrix[1][1] * inversionConstant, -matrix[0][1] * inversionConstant],
        [-matrix[1][0] * inversionConstant, matrix[0][0] * inversionConstant]
    ] satisfies LinearMatrix;
}

export function resizeRotate(image: JimpImage, radians: number) {
    const RightBottomLength = Math.abs(image.bitmap.width * Math.sin(radians));
    const BottomRightLength = Math.abs(image.bitmap.width * Math.cos(radians));
    const BottomLeftLength = Math.abs(image.bitmap.height * Math.sin(radians));
    const LeftBottomLength = Math.abs(image.bitmap.height * Math.cos(radians));

    const newImage = new Jimp({ width: BottomRightLength + BottomLeftLength, height: RightBottomLength + LeftBottomLength, color: 0x00000000 });
    newImage.composite(image, 0.5 * (newImage.bitmap.width - image.bitmap.width), 0.5 * (newImage.bitmap.height - image.bitmap.height));

    return rotateImage(newImage, radians);
}

export async function rotatedScreentone(image: JimpImage, rotation: number, matrix: Parameters<typeof getDitheringMatrix>[0] = 4, scaleFactor: number = 4, toneLight: number = 0xffffffff, toneDark: number = 0x000000ff): Promise<JimpImage> {
    const originalDimensions = {
        width: image.bitmap.width,
        height: image.bitmap.height
    }
    let rotatedImage = await resizeRotate(image, rotation);
    rotatedImage = await generateTwoToneImage(rotatedImage, matrix, scaleFactor, toneLight, toneDark);
    rotatedImage = await rotateImage(rotatedImage, -rotation);
    const newImage: JimpImage = new Jimp({ width: originalDimensions.width, height: originalDimensions.height, color: 0x00000000 });
    newImage.composite(rotatedImage, (newImage.bitmap.width - rotatedImage.bitmap.width) / 2, (newImage.bitmap.height - rotatedImage.bitmap.height) / 2);
    return newImage;
}

export function fillRect(image: JimpImage, rectX: number, rectY: number, width: number, height: number, color: number) {
    image.scan(rectX, rectY, width, height, function (x, y, index) {
        image.setPixelColor(color, x, y);
    })
}

export function fillCircle(image: JimpImage, centerX: number, centerY: number, radius: number, color: number) {
    image.scan(centerX - radius, centerY - radius, radius * 2, radius * 2, (x, y, idx) => {
        const lhs = (y - centerY) ** 2;
        const rhs = ((radius ** 2) - ((x - centerX) ** 2));
        const pixelMeetsCondition = lhs <= rhs;
        // console.log(`${lhs} <= ${rhs} : ${pixelMeetsCondition}`);
        if (pixelMeetsCondition) {
            image.setPixelColor(color, x, y);
        }
    });
}

export function fillHollowRect(image: JimpImage, rectX: number, rectY: number, width: number, height: number, color: number) {
    for (let topLineXIndex = 0; topLineXIndex < width; topLineXIndex++) {
        image.setPixelColor(color, rectX + topLineXIndex, rectY);
    }

    for (let bottomLineXIndex = 0; bottomLineXIndex < width; bottomLineXIndex++) {
        image.setPixelColor(color, rectX + bottomLineXIndex, rectY + height - 1);
    }

    for (let leftLineYIndex = 1; leftLineYIndex < height; leftLineYIndex++) {
        image.setPixelColor(color, rectX, rectY + leftLineYIndex - 1);
    }

    for (let rightLineYIndex = 1; rightLineYIndex < (height - 1); rightLineYIndex++) {
        image.setPixelColor(color, rectX + width - 1, rectY + rightLineYIndex);
    }
}

function brightenImage(image: JimpImage, brightnessFactor: number) {
    image.scan(function (x, y, idx) {
        const brightnessChange = 255 * brightnessFactor;
        image.bitmap.data[idx + 0] = clampForRGB(image.bitmap.data[idx + 0] + (brightnessChange));
        image.bitmap.data[idx + 1] = clampForRGB(image.bitmap.data[idx + 1] + (brightnessChange));
        image.bitmap.data[idx + 2] = clampForRGB(image.bitmap.data[idx + 2] + (brightnessChange));
    })

    return image;
}

export function dotMatrix(image: JimpImage, kernelSize: number = 16, alphaThereshold: number = 0.5, dumbAverage: boolean = true): JimpImage {
    const newImageWidth = Math.round(image.bitmap.width / kernelSize) * kernelSize;
    const newImageHeight = Math.round(image.bitmap.height / kernelSize) * kernelSize;
    const newImage = new Jimp({ width: newImageWidth, height: newImageHeight, color: 0x00000000 });

    const xScalar = newImage.bitmap.width / image.bitmap.width;
    const yScalar = newImage.bitmap.height / image.bitmap.height;
    const xIterations = newImage.bitmap.width / kernelSize;
    const yIterations = newImage.bitmap.height / kernelSize;
    // console.log(`X iterations: ${xIterations}, Y iterations: ${yIterations}`);
    const kernelDivisor = dumbAverage ? 4 : kernelSize ** 2;

    for (let xIndex = 0; xIndex < xIterations + 2; xIndex++) {
        for (let yIndex = 0; yIndex < yIterations + 2; yIndex++) {
            let secondaryColorAccumulation = {
                red: 0,
                green: 0,
                blue: 0,
                alpha: 0
            }
            let transparentPixels = 0;

            if (dumbAverage) {
                const baseX = Math.round((((xIndex - 1) * kernelSize) - (kernelSize / 2)) * xScalar);
                const baseY = Math.round((((yIndex - 1) * kernelSize) - (kernelSize / 2)) * yScalar);
                const farX = Math.round((((xIndex) * kernelSize) - (kernelSize / 2)) * xScalar) - 1;
                const farY = Math.round((((yIndex) * kernelSize) - (kernelSize / 2)) * yScalar) - 1;

                let imageIndex = image.getPixelIndex(baseX, baseY);
                secondaryColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                secondaryColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                secondaryColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                secondaryColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(baseX, farY);
                secondaryColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                secondaryColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                secondaryColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                secondaryColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(farX, baseY);
                secondaryColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                secondaryColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                secondaryColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                secondaryColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(farX, farY);
                secondaryColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                secondaryColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                secondaryColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                secondaryColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

            } else {
                newImage.scan((xIndex - 1) * kernelSize, (yIndex - 1) * kernelSize, kernelSize, kernelSize, (x, y, idx) => {
                    const imageIndex = image.getPixelIndex(Math.round((x - (kernelSize / 2)) * xScalar), Math.round((y - (kernelSize / 2)) * yScalar));
                    secondaryColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                    secondaryColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                    secondaryColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                    const addedAlpha = image.bitmap.data[imageIndex + 3];
                    if (addedAlpha === 0) transparentPixels++;
                    secondaryColorAccumulation.alpha += addedAlpha;
                });
            }

            const newColor = numberLiteralFromRGBA(Math.floor(secondaryColorAccumulation.red / kernelDivisor), Math.floor(secondaryColorAccumulation.green / kernelDivisor), Math.floor(secondaryColorAccumulation.blue / kernelDivisor), ((transparentPixels / kernelDivisor) < alphaThereshold) ? Math.floor(secondaryColorAccumulation.alpha / kernelDivisor) : 0);
            fillCircle(newImage, ((xIndex - 1) * kernelSize), ((yIndex - 1) * kernelSize), kernelSize / 2, newColor);
        }
    }

    brightenImage(newImage, -0.3);

    for (let xIndex = 0; xIndex < xIterations; xIndex++) {
        for (let yIndex = 0; yIndex < yIterations; yIndex++) {
            let mainColorAccumulation = {
                red: 0,
                green: 0,
                blue: 0,
                alpha: 0
            }
            let transparentPixels = 0;
            if (dumbAverage) {
                const baseX = Math.round(((xIndex) * kernelSize) * xScalar);
                const baseY = Math.round(((yIndex) * kernelSize) * yScalar);
                const farX = Math.round(((xIndex + 1) * kernelSize) * xScalar) - 1;
                const farY = Math.round(((yIndex + 1) * kernelSize) * yScalar) - 1;

                let imageIndex = image.getPixelIndex(baseX, baseY);
                mainColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                mainColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                mainColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                mainColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(baseX, farY);
                mainColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                mainColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                mainColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                mainColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(farX, baseY);
                mainColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                mainColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                mainColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                mainColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];

                imageIndex = image.getPixelIndex(farX, farY);
                mainColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                mainColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                mainColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                if (image.bitmap.data[imageIndex + 3] === 0) transparentPixels++;
                mainColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];
            } else {
                newImage.scan(xIndex * kernelSize, yIndex * kernelSize, kernelSize, kernelSize, (x, y, idx) => {
                    const imageIndex = image.getPixelIndex(Math.round(x * xScalar), Math.round(y * yScalar));
                    mainColorAccumulation.red += image.bitmap.data[imageIndex + 0];
                    mainColorAccumulation.green += image.bitmap.data[imageIndex + 1];
                    mainColorAccumulation.blue += image.bitmap.data[imageIndex + 2];
                    mainColorAccumulation.alpha += image.bitmap.data[imageIndex + 3];
                });
            }

            mainColorAccumulation.alpha = Math.floor(mainColorAccumulation.alpha / kernelDivisor);

            const newColor = numberLiteralFromRGBA(Math.floor(mainColorAccumulation.red / kernelDivisor), Math.floor(mainColorAccumulation.green / kernelDivisor), Math.floor(mainColorAccumulation.blue / kernelDivisor), (mainColorAccumulation.alpha >= alphaThereshold) ? mainColorAccumulation.alpha : 0);
            fillCircle(newImage, (xIndex * kernelSize) + (kernelSize / 2), (yIndex * kernelSize) + (kernelSize / 2), kernelSize / 2, newColor);
        }
    }

    return newImage;
}

function aSort(a: { l: number }, b: { l: number }) {
    return (a.l > b.l) ? 1 : -1;
}

export async function medianFilter(image: JimpImage, kernelRadius: number) {
    const unmoddedImage = image.clone();
    const luminanceCache: { x: number, y: number, l: number }[][] = [];
    for (let imageYIndex = 0; imageYIndex < image.bitmap.height; imageYIndex++) {
        const luminanceRow: { x: number, y: number, l: number }[] = [];
        for (let imageXIndex = 0; imageXIndex < image.bitmap.width; imageXIndex++) {
            luminanceRow.push({
                x: imageXIndex,
                y: imageYIndex,
                l: luminanceFromColor(image.getPixelColor(imageXIndex, imageYIndex))
            });
        }
        luminanceCache.push(luminanceRow);
    }
    const luminanceMaxX = luminanceCache[0].length - 1;
    const luminanceMaxY = luminanceCache.length - 1;

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        let windowValues: { x: number, y: number, l: number }[] = [];
        const xOffset = x - (kernelRadius - 1);
        const yOffset = y - (kernelRadius - 1);
        unmoddedImage.scan(xOffset, yOffset, ((kernelRadius - 1) * 2) + 1, ((kernelRadius - 1) * 2) + 1, function (windowX, windowY, windowIDX) {
            const cacheXIndex = Math.min(luminanceMaxX, Math.max(0, windowX));
            const cacheYIndex = Math.min(luminanceMaxY, Math.max(0, windowY));
            windowValues.push(luminanceCache[cacheYIndex][cacheXIndex]);
        });
        windowValues = windowValues.sort(aSort);
        // if (y > 150 && x > 150) console.log(windowValues);
        const median = windowValues[Math.floor(windowValues.length / 2)];
        image.setPixelColor(unmoddedImage.getPixelColor(median.x, median.y), x, y);
    });
    return image;
}

export type customImageEffectParameters = {
    pixelSortDirection: pixelSortDirections,
    sharpnessIntensity: number,
    gaussianEdgeRadius: number,
    gaussianBlurRadius: number,
    similarColorThereshold: number,
    bSideIterations: number,
    bSideBlendStrategy: bSideBlendType,
    gaussianType: gaussianMethodType,
    ditherMatrix: ditherMatrixID,
    ditherSpread: number,
    quantizeColorsPerChannel: number,
    ditherScale: number,
    errorDiffusionMatrix: errorDiffusionMatrixID,
    twoToneHigh: number,
    twoToneLow: number,
    chromaticAbberateX: number,
    chromaticAbberateY: number,
    chromaticAbberateChannel: 0 | 1 | 2,
    mosaicTileSize: number,
    mosaicX: boolean,
    mosaicY: boolean,
    imageRotation: number,
    dotMatrixDiameter: number,
    medianKernelRadius: number,
    contrastMaskLow: number,
    contrastMaskHigh: number

}

export async function applyImageEffect(inputImage: JimpImage, filterName: filterID | "random", customParameters: Partial<customImageEffectParameters>) {
    let usingFilter: filterID;
    if (filterName == "random") {
        const validFilterIDs = allFilterIDs.filter(filter => !blacklistedRandomFilters.includes(filter));
        usingFilter = validFilterIDs[Math.floor(Math.random() * validFilterIDs.length)];
    } else {
        usingFilter = filterName;
    }

    const maxPixels = 1100 ** 2;
    if ((inputImage.bitmap.width * inputImage.bitmap.height) > maxPixels) {
        const scaleChange = Math.sqrt(maxPixels / (inputImage.bitmap.width * inputImage.bitmap.height));
        console.log(`\n[Filters] Scale Change Applied. Original Pixel Count: ${inputImage.bitmap.width * inputImage.bitmap.height}\nNew Pixel Count: ${inputImage.bitmap.width * scaleChange * inputImage.bitmap.height * scaleChange}`);
        inputImage.resize({
            w: Math.ceil(inputImage.bitmap.width * scaleChange),
            h: Math.ceil(inputImage.bitmap.height * scaleChange),
            mode: ResizeStrategy.BICUBIC
        });
    }

    let outputImage: JimpImage;

    switch (usingFilter) {
        case "pixelsort":
            outputImage = await pixelSortFilter(inputImage, customParameters.pixelSortDirection ?? pixelSortDirections.bottomToTop, customParameters.contrastMaskLow ?? 0.8, customParameters.contrastMaskHigh);
            break;
        case "bside":
            outputImage = await separatedGaussianBlur(inputImage, customParameters.gaussianBlurRadius ?? 6);
            outputImage = await sharpenImage(outputImage, customParameters.sharpnessIntensity ?? 2, customParameters.gaussianEdgeRadius ?? 8, customParameters.gaussianType ?? "fast");
            outputImage = await createBSideV2Image(outputImage, customParameters.similarColorThereshold ?? 8, customParameters.bSideIterations ?? 3, customParameters.bSideBlendStrategy ?? "dithered");
            break;
        case "dither":
            outputImage = await ditherImage(inputImage, customParameters.ditherMatrix ?? 8, customParameters.ditherSpread ?? 0.1, customParameters.quantizeColorsPerChannel ?? 12, customParameters.ditherScale ?? 3);
            break;
        case "errordiffusiondither":
            outputImage = await errorDiffusionDither(inputImage, customParameters.errorDiffusionMatrix ?? "Floyd-Steinberg", customParameters.quantizeColorsPerChannel ?? 5, customParameters.ditherScale ?? 1);
            break;
        case "twotone":
            outputImage = await generateTwoToneImage(inputImage, customParameters.ditherMatrix ?? 8, customParameters.ditherScale ?? 4, customParameters.twoToneHigh ?? 0xffffffff, customParameters.twoToneLow ?? 0xaaaaaaff);
            break;
        case "reversesharpness":
            outputImage = await sharpenImage(inputImage, customParameters.sharpnessIntensity ?? -2, customParameters.gaussianBlurRadius ?? 12, customParameters.gaussianType ?? "fast");
            break;
        case "chromaticabberate":
            outputImage = chromaticAbberation(inputImage, customParameters.chromaticAbberateX ?? 5, customParameters.chromaticAbberateY ?? 5, customParameters.chromaticAbberateChannel ?? 0);
            break;
        case "mosaic":
            outputImage = mosaicEffect(inputImage, customParameters.mosaicTileSize ?? 15, customParameters.mosaicX ?? true, customParameters.mosaicY ?? true, customParameters.similarColorThereshold);
            break;
        case "screentone":
            outputImage = await generateTwoToneImage(inputImage, customParameters.ditherMatrix ?? "screentone", customParameters.ditherScale ?? 1, customParameters.twoToneHigh, customParameters.twoToneLow);
            break;
        case "rotatedscreentone":
            // const originalImage = inputImage.clone();
            outputImage = await rotatedScreentone(inputImage, customParameters.imageRotation ?? (Math.PI / 4), customParameters.ditherMatrix ?? "screentone", customParameters.ditherScale ?? 1, customParameters.twoToneHigh, customParameters.twoToneLow);
            // outputImage = await generateImageComparison(originalImage, outputImage);
            break;
        case "dotmatrix":
            outputImage = dotMatrix(inputImage, customParameters.dotMatrixDiameter);
            break;
        case "median":
            outputImage = await medianFilter(inputImage, customParameters.medianKernelRadius ?? 3);
            break;
        default:
            outputImage = inputImage.clone();
            break;
    }

    return outputImage;
}
