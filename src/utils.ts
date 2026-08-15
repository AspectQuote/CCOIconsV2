import { Jimp, JimpInstance } from "jimp";
import * as fs from 'fs-extra';
import path from "path";
import { mkdirSync } from "fs";

export type JimpImage = Awaited<ReturnType<typeof Jimp["read"]>> | JimpInstance;
export type JimpImgMod = Parameters<JimpImage["color"]>[number][number]
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
        newImage.crop({x: frameWidth * frameIndex, y: 0, w: frameWidth, h: image.bitmap.height});
        parsedFrames.push(newImage);
    }

    return parsedFrames;
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

export function ensureFolderExists(filePath: string) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(filePath)) mkdirSync(fullPath, { recursive: true });
    return fullPath;
}

export function randomNumberBetween(low: number, high: number, RNG: () => number = Math.random) {
    return ((high - low) * RNG()) + low;
}