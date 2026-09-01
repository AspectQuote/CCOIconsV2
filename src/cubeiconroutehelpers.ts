import { config } from "./config";
import { allFilterIDs, filterID } from "./imageeffects";
import { cubeFlagInBitfield, cubeFlags, maxFlag, maxFlagFieldValue } from "./schematics/importedschematics/cubeflagsshared";
import { CubeID, cubeSchema } from "./schematics/importedschematics/cubes";
import { PrefixID, prefixSchema } from "./schematics/importedschematics/prefixes";

export const customBackgroundImageRouteParams = `:image/:filter`;

export function parseCustomBackgroundRouteParams(givenParams: Record<string, string>, validImages: string[]) {
    let image = `${givenParams?.image}`;
    if (!validImages.includes(image)) {
        image = validImages[0];
    }

    let filter = `${givenParams?.filter}` as filterID;
    if (!allFilterIDs.includes(filter)) {
        filter = allFilterIDs[0];
    }

    return {
        image,
        filter
    }
}

function parseGivenParamAsNumber(param: string, max: number, min: number, absolute: boolean) {
    let num = +param;
    if (isNaN(num)) return min;
    if (absolute) num = Math.abs(num);
    return Math.min(max, Math.max(min, num));
}

function parseGivenParamAsPrefix(param: string) {
    let prefixID = `${param}` as PrefixID;
    if (!(prefixID in prefixSchema)) {
        prefixID = 'sacred';
    }

    return prefixID;
}

function parseGivenParamAsPrefixList(param: string) {
    return param.split(',').filter(string => string.length > 0).map(string => {
        return parseGivenParamAsPrefix(string);
    })
}

function parseGivenParamAsCubeID(param: string) {
    let cubeID = `${param}` as CubeID;
    if (!(cubeID in cubeSchema)) {
        cubeID = 'green';
    }
    return cubeID;
}

function parseGivenParamAsPrefixSeed(param: string) {
    return parseGivenParamAsNumber(param, config.cubePatternIndexLimit, 0, true);
}

function parseGivenParamAsCubeSeed(param: string) {
    return parseGivenParamAsNumber(param, config.prefixPatternIndexLimit, 0, true);
}

function parseGivenParamAsBoolean(param: string) {
    return `${param}` === '1';
}

export const cubeIconRouteParams = `:prefixes/:flags/:iconseed/:prefixseed/:cubeid`;

export function parseCubeIconRouteParams(givenParams: Record<string, string>) {
    const cubeID = parseGivenParamAsCubeID(givenParams?.cubeid);
    const flagsField = parseGivenParamAsNumber(givenParams?.flags, maxFlagFieldValue, 0, true);
    const bSide = cubeFlagInBitfield(flagsField, cubeFlags.bSide);
    const slated = cubeFlagInBitfield(flagsField, cubeFlags.slated);
    const divine = cubeFlagInBitfield(flagsField, cubeFlags.divine);
    const collectors = cubeFlagInBitfield(flagsField, cubeFlags.collectors);
    const cubeSeed = parseGivenParamAsCubeSeed(givenParams?.iconseed);
    const prefixSeed = parseGivenParamAsPrefixSeed(givenParams?.prefixseed);
    const prefixList = parseGivenParamAsPrefixList(givenParams?.prefixes);

    return {
        cubeID,
        bSide,
        slated,
        divine,
        collectors,
        cubeSeed,
        prefixSeed,
        prefixList,
        flags: flagsField
    }
}

export const prefixIconRouteParams = `:otherprefixes/:prefixseed/:cubeseed/:cubeid/:flags/:prefixid`;

export function parsePrefixIconRouteParams(givenParams: Record<string, string>) {
    return {
        otherPrefixes: parseGivenParamAsPrefixList(givenParams?.otherprefixes),
        prefixSeed: parseGivenParamAsPrefixSeed(givenParams?.prefixseed),
        cubeSeed: parseGivenParamAsCubeSeed(givenParams?.cubeseed),
        cubeID: parseGivenParamAsCubeID(givenParams?.cubeid),
        prefixID: parseGivenParamAsPrefix(givenParams?.prefixid),
        flags: parseGivenParamAsNumber(givenParams?.flags, maxFlagFieldValue, 0, true),
    }
}

export const flagIconRouteParams = `:otherflags/:cubeid/:mainflag`;

export function parseFlagIconRouteParams(givenParams: Record<string, string>) {
    return {
        allFlags: parseGivenParamAsNumber(givenParams?.otherflags, maxFlagFieldValue, 0, true),
        cubeID: parseGivenParamAsCubeID(givenParams?.cubeid),
        mainFlag: parseGivenParamAsNumber(givenParams?.mainflag, maxFlag, 0, true)
    }
}