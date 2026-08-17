import { Jimp, ResizeStrategy } from "jimp";
import { config } from "../config";
import { JimpImage } from "../utils";
import { allCubeIDs, CubeID, cubeSchema } from "./importedschematics/cubes";
import seedrandom from "seedrandom";
import { generatePatternedCubeParts, getRawCubePartPaths, loadStaticCubeParts } from "../cubeparts";
import { loadAnimatedCubeIcon, saveAnimatedCubeIcon } from "../imageutils";


export type customSeededCubeIconPath = ((seed: number) => Promise<string>) | string;

export type customSeededCubeDefinition = {
    heads: customSeededCubeIconPath,
    eyes: customSeededCubeIconPath,
    mouths: customSeededCubeIconPath,
    accents: customSeededCubeIconPath,
    cube: customSeededCubeIconPath
}

const conwayGenerations = 30;
const conwayLivingChance = 0.2;
const customSeededOutputPath = `${config.outputDirectory}/customseeded`
const conwayOuputPath = `${customSeededOutputPath}/conway`;
const badassOutputDirectory = `${customSeededOutputPath}/badass`;
const badassFrames = 60;
async function generateBadassPart(seed: number, part: keyof Awaited<ReturnType<typeof getRawCubePartPaths>>) {
    const outputFrames: JimpImage[] = [];
    const RNG = seedrandom(`${seed}badass`)

    while (outputFrames.length < badassFrames) {
        const usingCubeID = validBadassCubes[Math.floor(RNG() * validBadassCubes.length)];
        const partPaths = await getRawCubePartPaths(usingCubeID, seed);
        const frame = (await loadAnimatedCubeIcon(partPaths[part]))[0];

        if (frame) {
            outputFrames.push(frame.resize({
                w: 32,
                h: 32,
                mode: ResizeStrategy.NEAREST_NEIGHBOR
            }) as JimpImage);
        }
    }

    const outputFileName = `badass${part}${seed}`;
    await saveAnimatedCubeIcon(outputFrames, outputFileName, badassOutputDirectory);

    return `${badassOutputDirectory}/${outputFileName}.png`;
}
export const customSeededCubes = {
    "conway": {
        heads: `${config.sourceImagesDirectory}/seededcubetextures/conway/heads.png`,
        eyes: `${config.sourceImagesDirectory}/seededcubetextures/conway/eyes.png`,
        mouths: `${config.sourceImagesDirectory}/seededcubetextures/conway/mouths.png`,
        accents: async (seed: number) => {
            const outputFrames: JimpImage[] = [];
            const conwayMask = await Jimp.read(`${config.sourceImagesDirectory}/seededcubetextures/conway/mask.png`);
            const GoLRNG = seedrandom(`conway${seed}`);

            const livingColor = 0xffffffff;
            const deadColor = 0x00000000;

            // Run RNG function 2x to simulate generating the hue/brightness change
            GoLRNG();
            GoLRNG();

            const startingFrame = new Jimp({
                width: conwayMask.bitmap.width,
                height: conwayMask.bitmap.height,
                color: deadColor
            });
            startingFrame.scan(0, 0, startingFrame.bitmap.width, startingFrame.bitmap.height, function (x, y, idx) {
                if (GoLRNG() < conwayLivingChance) startingFrame.setPixelColor(livingColor, x, y);
            })

            for (let generationIndex = 0; generationIndex < conwayGenerations; generationIndex++) {
                const previousFrame = outputFrames[generationIndex - 1] ?? startingFrame;
                const product: JimpImage = performConwaySimulation(previousFrame, livingColor, deadColor).mask(conwayMask) as JimpImage;
                outputFrames.splice(generationIndex, 0, ...[product, product]);
            }

            await saveAnimatedCubeIcon(outputFrames, `conwayaccents${seed}`, conwayOuputPath);
            return `${conwayOuputPath}/conwayaccents${seed}.png`;
        },
        cube: async (seed: number) => {
            const outputFrames: JimpImage[] = [];
            const conwayMask = await Jimp.read(`${config.sourceImagesDirectory}/seededcubetextures/conway/mask.png`);
            const conwayOverlay = await Jimp.read(`${config.sourceImagesDirectory}/seededcubetextures/conway/overlay.png`);
            const GoLRNG = seedrandom(`conway${seed}`);

            const livingPixel: JimpImage = new Jimp({width: 1, height: 1, color: 0x000000ff}).color([
                {
                    apply: "green",
                    params: [(100 * GoLRNG()) + 155]
                },
                {
                    apply: "hue",
                    params: [360 * GoLRNG()]
                }
            ]) as JimpImage;
            const livingColor = livingPixel.getPixelColor(0, 0);
            const shadowColor = livingPixel.clone().color([{ apply: "darken", params: [15] }]).getPixelColor(0, 0);
            const deadColor = livingPixel.clone().color([{ apply: "darken", params: [25] }]).getPixelColor(0, 0);

            const startingFrame = new Jimp({
                width: conwayMask.bitmap.width,
                height: conwayMask.bitmap.height,
                color: deadColor
            });
            startingFrame.scan(0, 0, startingFrame.bitmap.width, startingFrame.bitmap.height, function (x, y, idx) {
                if (GoLRNG() < conwayLivingChance) startingFrame.setPixelColor(livingColor, x, y);
            })

            for (let generationIndex = 0; generationIndex < conwayGenerations; generationIndex++) {
                const previousFrame = outputFrames[generationIndex - 1] ?? startingFrame;
                const product: JimpImage = performConwaySimulation(previousFrame, livingColor, deadColor, shadowColor).mask(conwayMask) as JimpImage;
                outputFrames.splice(generationIndex, 0, ...[product, product]);
            }
            outputFrames.forEach(frame => frame.composite(conwayOverlay));

            await saveAnimatedCubeIcon(outputFrames, `conway${seed}`, conwayOuputPath);
            return `${conwayOuputPath}/conway${seed}.png`;
        }
    },
    "badass": {
        cube: async (seed: number) => {
            return await generateBadassPart(seed, "cube");
        },
        heads: async (seed: number) => {
            return await generateBadassPart(seed, "heads");
        },
        mouths: async (seed: number) => {
            return await generateBadassPart(seed, "mouths");
        },
        accents: async (seed: number) => {
            return await generateBadassPart(seed, "accents");
        },
        eyes: async (seed: number) => {
            return await generateBadassPart(seed, "eyes");
        }
    }
} as const satisfies { [key in CubeID]?: customSeededCubeDefinition };
const validBadassCubes = allCubeIDs.filter(cubeID => ![...Object.keys(customSeededCubes)].includes(cubeID));

export type customSeededCubeID = keyof typeof customSeededCubes;

function performConwaySimulation(previousFrame: JimpImage, aliveColor: number, deadColor: number, shadowColor: number | false = false): JimpImage {
    const newFrame = new Jimp({
        width: previousFrame.bitmap.width, 
        height: previousFrame.bitmap.height, 
        color: deadColor
    });
    newFrame.scan(function (x, y, idx) {
        let neighborCount = 0;
        const wasAlive = previousFrame.getPixelColor(x, y) === aliveColor;
        if (previousFrame.getPixelColor(x - 1, y - 1) === aliveColor) neighborCount++;
        if (previousFrame.getPixelColor(x, y - 1) === aliveColor) neighborCount++;
        if (previousFrame.getPixelColor(x + 1, y - 1) === aliveColor) neighborCount++;

        if (previousFrame.getPixelColor(x - 1, y) === aliveColor) neighborCount++;
        if (previousFrame.getPixelColor(x + 1, y) === aliveColor) neighborCount++;

        if (previousFrame.getPixelColor(x - 1, y + 1) === aliveColor) neighborCount++;
        if (previousFrame.getPixelColor(x, y + 1) === aliveColor) neighborCount++;
        if (previousFrame.getPixelColor(x + 1, y + 1) === aliveColor) neighborCount++;

        if (neighborCount < 2) {
            // Cell is dead, underpopulated.
        } else if ((neighborCount === 2 || neighborCount === 3) && wasAlive) {
            newFrame.setPixelColor(aliveColor, x, y);
            if (y !== newFrame.bitmap.height - 1 && shadowColor !== false) newFrame.setPixelColor(shadowColor, x, y + 1);
        } else if (neighborCount < 3) {
            // Cell is dead, overpopulated.
        } else if (neighborCount === 3 && !wasAlive) {
            newFrame.setPixelColor(aliveColor, x, y);
            if (y !== newFrame.bitmap.height - 1 && shadowColor !== false) newFrame.setPixelColor(shadowColor, x, y + 1);
        }
    })
    return newFrame;
}