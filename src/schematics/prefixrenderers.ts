import { Jimp, ResizeStrategy } from "jimp";
import { config } from "../config";
import { cubeEye, cubeHead, cubeMouth, cubePartDefinition } from "../cubeparts"
import { JimpImage, JimpImgMod, loadAnimatedCubeIcon, saveAnimatedCubeIcon } from "../utils"
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

function compositeEyesToAllFrames(targetFrames: JimpImage[], eyes: cubeEye[][], animation: JimpImage[]) {
    for (let targetFrameIndex = 0; targetFrameIndex < targetFrames.length; targetFrameIndex++) {
        const targetFrame = targetFrames[targetFrameIndex];
        const animationFrame = animation[targetFrameIndex % animation.length];
        const eyesThisFrame = eyes[targetFrameIndex % eyes.length];
        for (let eyeIndex = 0; eyeIndex < eyesThisFrame.length; eyeIndex++) {
            const eye = eyesThisFrame[eyeIndex];
            targetFrame.composite(animationFrame, eye.x - Math.floor(animationFrame.bitmap.width / 2), eye.y - Math.floor(animationFrame.bitmap.height / 2))
        }
    }
}

export type seededLayerRenderer = {
    render: (parts: cubePartDefinition, frames: JimpImage[], seed: number) => Promise<JimpImage[]>
}

function constructSeededLayerRenderer(data: Partial<seededLayerRenderer>): seededLayerRenderer {
    return {
        render: data.render ?? (async (p, f, s) => f)
    }
}

export type renderablePrefixOutline = {
    thickness: number,
    color: number,
    strokeMatrix: strokeMatrix
}

export function constructRenderablePrefixOutline(data: Partial<renderablePrefixOutline>): renderablePrefixOutline {
    return {
        thickness: data.thickness ?? 1,
        color: data.color ?? 0xffffffff,
        strokeMatrix: data.strokeMatrix ?? [
            [0, 1, 0],
            [1, 0, 1],
            [0, 1, 0]
        ]
    }
}

export type seededOutlineRenderer = ((seed: number) => renderablePrefixOutline) | false;

export type seededLayerModifier = ((frame: JimpImage) => JimpImage) | false;

export type prefixRendererDefinition = {
    canvasScale: number,
    renderSteps: { [key in prefixRenderSteps]?: prefixRendererStepDefinition }
}

export function neededWidthHeightForCanvasScale(scale: number) {
    return 32 * scale;
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
    if (!inputFrames) {
        if (!mainRenderer.renderSteps[mainStep]) return [];
        const requiredFrames = getNeededFramesForPrefix(mainPrefix, mainStep, otherPrefixes, otherSteps, cubeID, shorthandSchema);
        prefixFrames = generateBlankFrames(config.baseCubeResolution * mainRenderer.canvasScale, requiredFrames);
        await mainRenderer.renderSteps[mainStep].render(cubeParts, prefixFrames, prefixSeed);
    } else {
        prefixFrames = inputFrames.map(frame => frame.clone());
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
                render: async function (parts, frames, seed) {
                    let seedGen = seedrandom(`flaming${seed}`);
                    let flamingFrames = await loadAnimatedCubeIcon(`${prefixSourceDirectory}/flaming/fire.png`);

                    const fireColorIndex = Math.floor(prefixRendererConsts.flaming.fireColors.length * seedGen());

                    flamingFrames.forEach(frame => {
                        frame.color(prefixRendererConsts.flaming.fireColors[fireColorIndex]);
                    })

                    compositeHeadsToAllFrames(frames, parts.icon[0], parts.heads, flamingFrames, { x: 16, y: 38, width: 32 });

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