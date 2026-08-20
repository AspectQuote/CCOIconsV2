import { config } from "./config"
import { cubePartDefinition } from "./cubeparts"
import { constructShorthandIconCubeData, constructShorthandIconPrefixData, prefixRendererTags, prefixRenderSteps, shorthandIconCubeData, shorthandIconPrefixData } from "./schematics/importedschematics/ccoiconsschema"
import { prefixRendererDefinition } from "./schematics/prefixrenderers"


export function turnCubePartsIntoShorthandData(parts: cubePartDefinition): shorthandIconCubeData {
    return constructShorthandIconCubeData({
        frames: parts.icon.length,
        scalar: config.baseCubeResolution / parts.icon[0].bitmap.width
    })
}

export function turnPrefixRendererIntoShorthandData(renderer: prefixRendererDefinition): shorthandIconPrefixData {
    return constructShorthandIconPrefixData({
        renderSteps: (Object.keys(renderer.renderSteps) as unknown as prefixRenderSteps[]).reduce((prev, step) => {
            prev[step] = {
                frames: renderer.renderSteps[step]?.frames ?? 1,
                tags: renderer.renderSteps[step]?.tags ?? [],
                canvasScalar: renderer.renderSteps[step]?.canvasScale ?? 1,
                flatCanvasPadding: renderer.renderSteps[step]?.flatCanvasPadding ?? 0,
                dontRenderWithPrefixesPresent: renderer.renderSteps[step]?.dontRenderWithPrefixesPresent ?? [],
                affectedByOtherPrefixes: renderer.renderSteps[step]?.affectedByOtherPrefixes ?? []
            }
            return prev;
        }, {} as shorthandIconPrefixData["renderSteps"])
    })
}