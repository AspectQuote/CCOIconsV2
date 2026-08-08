import express from 'express';
import { config } from './config';
import cors from 'cors';
import { cubeIconRouteParams, customBackgroundImageRouteParams, parseBackgroundImageRouteParams, parseCubeIconRouteParams, parsePrefixIconRouteParams, prefixIconRouteParams } from './cubeiconroutehelpers';
import { cubePartDefinition, loadStaticCubeParts, turnCubePartsIntoHash, turnPrefixesIntoHashWithFlags } from './cubeparts';
import * as fs from 'fs-extra';
import { patternedCubeSchema } from './schematics/patterneditems';
import { JimpImage, saveAnimatedCubeIcon } from './utils';
import { allCubeIDs, CubeID } from './schematics/importedschematics/cubes';
import { allPrefixes, PrefixID } from './schematics/importedschematics/prefixes';
import { turnCubePartsIntoShorthandData, turnPrefixRendererIntoShorthandData } from './shorthandicondata';
import { applyPrefixOutlines, constructPrefixRenderer, executeSeededLayerRenderer, prefixIconTag, prefixRenderers } from './schematics/prefixrenderers';
import { shorthandIconDataSchema } from './schematics/importedschematics/ccoiconsschema';
import path from 'path';
import { Jimp } from 'jimp';
import { applyImageEffect } from './imageeffects';

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

    if (!config.devmode) {
        for (let cubeIDIndex = 0; cubeIDIndex < allCubeIDs.length; cubeIDIndex++) {
            const currentCubeID = allCubeIDs[cubeIDIndex];
            const staticParts = await loadStaticCubeParts(currentCubeID, 0);
            cachedCubeParts[currentCubeID] = staticParts
            cubeIconDataSchema.cubes[currentCubeID] = turnCubePartsIntoShorthandData(staticParts);
        }
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

    app.get(`/shorthandicondata.json`, async (req, res) => {
        return res.json(cubeIconDataSchema);
    })

    app.get(`/cubeicon/${cubeIconRouteParams}`, async (req, res) => {
        const givenParams = parseCubeIconRouteParams(req.params);
        const givenOutputFileName = `${givenParams.cubeID}${turnPrefixesIntoHashWithFlags("cube", givenParams.prefixes, givenParams.prefixSeed).hash}`;
        const givenOutputDirectory = `${config.outputDirectory}/cubeicons/${givenParams.cubeID in patternedCubeSchema ? `${givenParams.cubeSeed}` : ``}${givenParams.bSide ? 'bside/' : ''}`;
        const givenOutputFile = `${givenOutputDirectory}/${givenOutputFileName}.png` as const;

        if (!fs.existsSync(givenOutputFile)) {
            const cubeParts = await tryToHitCubePartCache(givenParams.cubeID, givenParams.cubeSeed);
            applyPrefixOutlines(givenParams.prefixes, "cube", givenParams.prefixSeed, cubeParts.icon);
            await saveAnimatedCubeIcon(cubeParts.icon, givenOutputFileName, givenOutputDirectory);
        }

        if (config.devmode) console.log(givenParams);
        return res.sendFile(givenOutputFile);
    });

    async function renderPrefixLayer(givenParams: ReturnType<typeof parsePrefixIconRouteParams>, layer: "foreground" | "background"): Promise<string> {
        const rendererDefinition = prefixRenderers[givenParams.prefixID] ?? constructPrefixRenderer({});

        if (rendererDefinition[layer] === false) {
            return `${config.sourceImagesDirectory}/cubes/invisible/cube.png`;
        }

        const cubeParts = await tryToHitCubePartCache(givenParams.cubeID, givenParams.cubeSeed);
        const givenOutputFileName = `${givenParams.prefixID}${turnCubePartsIntoHash(cubeParts, givenParams.cubeID, layer, [...givenParams.otherPrefixes, givenParams.prefixID], givenParams.prefixSeed, givenParams.cubeSeed)}`;
        const givenOutputDirectory = `${config.outputDirectory}/prefixicons/${layer}/${givenParams.bSide ? 'bside/' : ''}`;
        const givenOutputFile = `${givenOutputDirectory}/${givenOutputFileName}.png` as const;

        console.log(givenOutputFile);

        if (!fs.existsSync(givenOutputFile) || config.devmode) {
            const renderedLayer = await executeSeededLayerRenderer(rendererDefinition, layer, cubeParts, givenParams.prefixSeed);
            applyPrefixOutlines(givenParams.otherPrefixes, layer, givenParams.prefixSeed, renderedLayer);
            await saveAnimatedCubeIcon(renderedLayer, givenOutputFileName, givenOutputDirectory);
        }
        if (config.devmode) console.log(givenParams);

        return givenOutputFile;
    }

    app.get(`/custombackgroundimage/${customBackgroundImageRouteParams}`, async (req, res) => {
        const givenParams = parseBackgroundImageRouteParams(req.params, allBackgroundImages);
        const outputDirectory = path.resolve(`${config.outputDirectory}/custombackgrounds/${givenParams.filter}/`);
        fs.mkdirSync(`${outputDirectory}`, { recursive: true });
        const outputFile = `${givenParams.image}.jpg`;
        const outputPath = `${outputDirectory}/${outputFile}`;
        if (!fs.existsSync(outputPath) || config.devmode) {
            const inputImage = await Jimp.read(`${config.sourceImagesDirectory}/images/${givenParams.image}.jpg`);
            const outputImage = await applyImageEffect(inputImage, givenParams.filter, {});
            // @ts-ignore
            await outputImage.write(outputPath, { quality: 60 });
        }
        return res.sendFile(outputPath);
    })

    app.get(`/prefixforeground/${prefixIconRouteParams}`, async (req, res) => {
        const givenParams = parsePrefixIconRouteParams(req.params);
        const outputFile = await renderPrefixLayer(givenParams, "foreground");
        return res.sendFile(outputFile);
    });

    app.get(`/prefixbackground/${prefixIconRouteParams}`, async (req, res) => {
        const givenParams = parsePrefixIconRouteParams(req.params);
        const outputFile = await renderPrefixLayer(givenParams, "background");
        return res.sendFile(outputFile);
    });


});