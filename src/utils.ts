import { Jimp, JimpInstance } from "jimp";
import * as fs from 'fs-extra';
import path from "path";
import { mkdirSync } from "fs";

export type JimpImage = Awaited<ReturnType<typeof Jimp["read"]>> | JimpInstance;
export type JimpImgMod = Parameters<JimpImage["color"]>[number][number]

export function ensureFolderExists(filePath: string) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(filePath)) mkdirSync(fullPath, { recursive: true });
    return fullPath;
}

export function randomNumberBetween(low: number, high: number, RNG: () => number = Math.random) {
    return ((high - low) * RNG()) + low;
}