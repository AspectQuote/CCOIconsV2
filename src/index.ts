import express from 'express';
import { config } from './config';
import cors from 'cors';
import { cubePartDefinition, loadStaticCubeParts, turnPrefixRenderInputsIntoHashableString } from './cubeparts';
import * as fs from 'fs-extra';
import { patternedCubeSchema } from './schematics/patterneditems';
import { JimpImage } from './utils';
import { allCubeIDs, CubeID, cubeSchema } from './schematics/importedschematics/cubes';
import { allPrefixes, PrefixID, sortPrefixesByApplicationOrder } from './schematics/importedschematics/prefixes';
import { turnCubePartsIntoShorthandData, turnPrefixRendererIntoShorthandData } from './shorthandicondata';
import { constructPrefixRenderer, prefixRenderers, renderPrefixSteps } from './schematics/prefixrenderers';
import { filterOtherFlagsForNeeded, prefixRenderSteps, prefixRenderStepSchema, shorthandIconDataSchema } from './schematics/importedschematics/ccoiconsschema';
import path from 'path';
import { Jimp } from 'jimp';
import { applyImageEffect, createBSideV2Image } from './imageeffects';
import { cubeIconRouteParams, customBackgroundImageRouteParams, flagIconRouteParams, parseCubeIconRouteParams, parseCustomBackgroundRouteParams, parseFlagIconRouteParams, parsePrefixIconRouteParams, prefixIconRouteParams } from './cubeiconroutehelpers';
import { hash } from 'crypto';
import { saveAnimatedCubeIcon } from './imageutils';
import { renderFlag } from './schematics/flagrenderers';
import { turnFlagsFieldIntoFlagsArray } from './schematics/importedschematics/cubeflagsshared';

const app = express();

app.use(cors());

app.listen(config.serverPort, async () => {
    console.log(`Starting....`);
    const cachedCubeParts: {[key in CubeID]?: cubePartDefinition} = {};
    const cubeIconDataSchema: shorthandIconDataSchema = {
        cubes: {},
        prefixes: {}
    }
    const allBackgroundImages = fs.readdirSync(`${config.sourceImagesDirectory}/images`).filter(file => file.endsWith('.jpg')).map(file => file.split('.')[0]);
    // console.log(allBackgroundImages);

    for (let cubeIDIndex = 0; cubeIDIndex < allCubeIDs.length; cubeIDIndex++) {
        const currentCubeID = allCubeIDs[cubeIDIndex];
        const staticParts = await loadStaticCubeParts(currentCubeID, 0);
        if ((staticParts.icon[0].bitmap.width % 4) !== 0) console.log(`Cube ${currentCubeID} does not have a resolution divisible by 4!`);
        cachedCubeParts[currentCubeID] = staticParts
        cubeIconDataSchema.cubes[currentCubeID] = turnCubePartsIntoShorthandData(staticParts);
    }

    for (let prefixIDIndex = 0; prefixIDIndex < allPrefixes.length; prefixIDIndex++) {
        const currentPrefixID = allPrefixes[prefixIDIndex];
        cubeIconDataSchema.prefixes[currentPrefixID] = turnPrefixRendererIntoShorthandData((currentPrefixID in prefixRenderers && prefixRenderers[currentPrefixID]) ? prefixRenderers[currentPrefixID] : constructPrefixRenderer({}))
    }

    async function tryToHitCubePartCache(cubeID: CubeID, seed: number) {
        if (cubeID in cachedCubeParts && cachedCubeParts[cubeID]) {
            if (cubeID in patternedCubeSchema && seed !== 0) {
                return await loadStaticCubeParts(cubeID, seed);
            } else {
                return cachedCubeParts[cubeID];
            }
        } else {
            return await loadStaticCubeParts(cubeID, seed);
        }
    }

    console.log(`Listening on port ${config.serverPort}`);

    app.use('/static', express.static(path.resolve(`${config.sourceImagesDirectory}/static`)));
    app.use('/boxes', express.static(path.resolve(`${config.sourceImagesDirectory}/boxes`)));

    app.get(`/shorthandicondata.json`, async (req, res) => {
        return res.json(cubeIconDataSchema);
    })

    app.get(`/cubeicon/${cubeIconRouteParams}`, async (req, res) => {
        const givenParams = parseCubeIconRouteParams(req.params);
        const givenOutputDirectory = `${config.outputDirectory}/cubeicons/`;
        const cubeParts = await tryToHitCubePartCache(givenParams.cubeID, givenParams.cubeSeed);
        const hashableStringData = turnPrefixRenderInputsIntoHashableString('sacred', prefixRenderStepSchema.cube.mainPrefix, givenParams.prefixList, prefixRenderStepSchema.cube.otherPrefixes, givenParams.prefixSeed, cubeParts, givenParams.cubeID, givenParams.flags, cubeIconDataSchema, true);
        if (config.devmode) console.log(`Cube Icon Hashable: `, hashableStringData.string);
        const givenOutputFileName = `${givenParams.cubeID in patternedCubeSchema ? `${givenParams.cubeSeed}` : ``}${givenParams.cubeID}${hash('md5', hashableStringData.string)}`;
        const givenOutputFile = `${givenOutputDirectory}/${givenOutputFileName}.png` as const;

        if (!fs.existsSync(givenOutputFile) || config.devmode) {
            const renderedCube = await renderPrefixSteps('sacred', givenParams.prefixList, prefixRenderStepSchema.cube.mainPrefix, prefixRenderStepSchema.cube.otherPrefixes, givenParams.cubeID, cubeParts, givenParams.prefixSeed, cubeIconDataSchema, cubeSchema[givenParams.cubeID], givenParams.flags, cubeParts.icon);
            await saveAnimatedCubeIcon(renderedCube, givenOutputFileName, givenOutputDirectory);
        }
        return res.sendFile(givenOutputFile);
    });

    async function renderPrefix(givenParams: ReturnType<typeof parsePrefixIconRouteParams>, pathAddition: string, mainStep: prefixRenderSteps, otherSteps: prefixRenderSteps[], applicationSortDirection: 1 | -1): Promise<string> {
        const rendererDefinition = prefixRenderers[givenParams.prefixID] ?? constructPrefixRenderer({});

        if (!rendererDefinition.renderSteps[mainStep]) {
            return `${config.sourceImagesDirectory}/cubes/invisible/cube.png`;
        }

        sortPrefixesByApplicationOrder(givenParams.otherPrefixes, applicationSortDirection);
        const cubeParts = await tryToHitCubePartCache(givenParams.cubeID, givenParams.cubeSeed);
        const hashableStringData = turnPrefixRenderInputsIntoHashableString(givenParams.prefixID, mainStep, givenParams.otherPrefixes, otherSteps, givenParams.prefixSeed, cubeParts, givenParams.cubeID, givenParams.flags, cubeIconDataSchema);
        if (config.devmode) console.log(`Prefix Icon Hashable String: `, hashableStringData.string);
        const givenOutputFileName = `${givenParams.prefixID}${hash('md5', hashableStringData.string)}`;
        const givenOutputDirectory = `${config.outputDirectory}/prefixicons/${pathAddition}/`;
        const givenOutputFile = `${givenOutputDirectory}${givenOutputFileName}.png` as const;

        if (!fs.existsSync(givenOutputFile) || config.devmode) {
            const renderedLayer = await renderPrefixSteps(givenParams.prefixID, givenParams.otherPrefixes, mainStep, otherSteps, givenParams.cubeID, cubeParts, givenParams.prefixSeed, cubeIconDataSchema, cubeSchema[givenParams.cubeID], givenParams.flags);
            
            await saveAnimatedCubeIcon(renderedLayer, givenOutputFileName, givenOutputDirectory);
        }
        if (config.devmode) console.log(givenParams);

        return givenOutputFile;
    }

    app.get(`/custombackgroundimage/${customBackgroundImageRouteParams}`, async (req, res) => {
        const givenParams = parseCustomBackgroundRouteParams(req.params, allBackgroundImages);
        const outputDirectory = path.resolve(`${config.outputDirectory}/custombackgrounds/${givenParams.filter}/`);
        fs.mkdirSync(`${outputDirectory}`, { recursive: true });
        const outputFile = `${givenParams.image}.jpg`;
        const outputPath = `${outputDirectory}/${outputFile}`;
        if (!fs.existsSync(outputPath)) {
            const inputImage = await Jimp.read(`${config.sourceImagesDirectory}/images/${givenParams.image}.jpg`);
            const outputImage = await applyImageEffect(inputImage, givenParams.filter, {});
            // @ts-ignore
            await outputImage.write(outputPath, { quality: 60 });
        }
        return res.sendFile(outputPath);
    })

    app.get(`/prefixforeground/${prefixIconRouteParams}`, async (req, res) => {
        const givenParams = parsePrefixIconRouteParams(req.params);
        const outputFile = await renderPrefix(givenParams, "foregrounds", prefixRenderStepSchema.foreground.mainPrefix, prefixRenderStepSchema.foreground.otherPrefixes, 1);
        return res.sendFile(outputFile);
    });

    app.get(`/prefixbackground/${prefixIconRouteParams}`, async (req, res) => {
        const givenParams = parsePrefixIconRouteParams(req.params);
        const outputFile = await renderPrefix(givenParams, "backgrounds", prefixRenderStepSchema.background.mainPrefix, prefixRenderStepSchema.background.otherPrefixes, -1);
        return res.sendFile(outputFile);
    });

    app.get(`/flagbackground/${flagIconRouteParams}`, async (req, res) => {
        const givenParams = parseFlagIconRouteParams(req.params);
        const givenOutputDirectory = `${config.outputDirectory}/flagicons/`;
        const usingFlags = filterOtherFlagsForNeeded(turnFlagsFieldIntoFlagsArray(givenParams.allFlags), prefixRenderStepSchema.background.otherPrefixes);
        const cubeParts = await tryToHitCubePartCache(givenParams.cubeID, 0);
        const hashableString = `MainFlag:${givenParams.mainFlag},Dimensions:${cubeParts.icon[0].bitmap.width}x${cubeParts.icon[0].bitmap.height},OtherFlags:${usingFlags.join('|')}`;
        console.log(hashableString);
        const outputFileName = `${hash('md5', hashableString)}`;
        const givenOutputFile = `${givenOutputDirectory}/${outputFileName}.png`;

        if (!fs.existsSync(givenOutputFile) || config.devmode) {
            const renderedFlag = await renderFlag(givenParams.mainFlag, prefixRenderStepSchema.background.mainPrefix, cubeParts, turnFlagsFieldIntoFlagsArray(givenParams.allFlags), prefixRenderStepSchema.background.otherPrefixes, cubeSchema[givenParams.cubeID], cubeIconDataSchema);
            await saveAnimatedCubeIcon(renderedFlag, outputFileName, givenOutputDirectory);
        }
        
        return res.sendFile(givenOutputFile);
    })
});