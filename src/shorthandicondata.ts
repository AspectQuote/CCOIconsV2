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
        canvasScalar: renderer.canvasScale,
        renderSteps: (Object.keys(renderer.renderSteps) as unknown as prefixRenderSteps[]).reduce((prev, step) => {
            prev[step] = {
                frames: renderer.renderSteps[step]?.frames ?? 1,
                tags: renderer.renderSteps[step]?.tags ?? []
            }
            return prev;
        }, {} as {[key in prefixRenderSteps]?: {frames: number, tags: prefixRendererTags[]}})
    })
}