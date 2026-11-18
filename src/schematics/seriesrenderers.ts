import { Jimp } from "jimp";
import { seriesID, seriesSchema } from "./importedschematics/seriespools";
import { JimpImage } from "../utils";
import { shorthandIconCubeData } from "./importedschematics/ccoiconsschema";
import { CubeID, cubeSchema } from "./importedschematics/cubes";
import { cubePartDefinition, loadStaticCubeParts } from "../cubeparts";
import seedrandom from "seedrandom";
import { config } from "../config";

const iconWidth = 32;
const spriteDimensions = {
    w: 4,
    h: 6
}
const iterationsRequired = spriteDimensions.w * spriteDimensions.h;
export async function generateSeriesCollage(series: seriesID): Promise<JimpImage> {
    const collageImage: JimpImage = new Jimp({
        width: iconWidth * spriteDimensions.w,
        height: iconWidth * spriteDimensions.h * 0.75,
        color: 0x00000000
    });
    const RNG = seedrandom(`${series}-${seriesSchema[series].contents.length}-collage`);

    let totalIterations = 0;
    let iterationsCompleted = 0;
    while (iterationsCompleted < iterationsRequired && totalIterations < (10 * iterationsRequired)) {
        totalIterations++;
        const usingIcon = seriesSchema[series].contents[Math.floor(RNG() * seriesSchema[series].contents.length)];
        if (['gold','unreal','special'].includes(cubeSchema[usingIcon].rarity)) continue;
        const schemaContent = await loadStaticCubeParts(usingIcon, Math.floor(config.cubePatternIndexLimit * RNG()));
        if (!schemaContent) continue;
        if (schemaContent.icon.length === 0) continue;
        if (schemaContent.icon[0].bitmap.width !== iconWidth) continue;

        const collageX = iterationsCompleted % spriteDimensions.w;
        const collageY = Math.floor(iterationsCompleted / spriteDimensions.w);
        let pixelXOffset = 0;
        const onOffRow = collageY % 2 === 1;
        if (onOffRow) pixelXOffset = -iconWidth/2;
        const pixelYPosition = iconWidth * 0.75 * collageY;
        const pixelXPosition = (iconWidth * collageX) + pixelXOffset;
        const cubeIcon = schemaContent.icon[Math.floor(RNG() * schemaContent.icon.length)];

        collageImage.composite(cubeIcon, pixelXPosition, pixelYPosition);
        if (collageX === 0 && onOffRow) collageImage.composite(cubeIcon, collageImage.bitmap.width + pixelXOffset, pixelYPosition);
        if (collageY === (spriteDimensions.h - 1)) collageImage.composite(cubeIcon, pixelXPosition, - (iconWidth * 0.75));
        if (collageX === 0 && onOffRow && collageY === (spriteDimensions.h - 1)) collageImage.composite(cubeIcon, collageImage.bitmap.width + pixelXOffset, - (iconWidth * 0.75));
        iterationsCompleted++;
    }

    return collageImage;
}