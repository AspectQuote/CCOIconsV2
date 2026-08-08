import { config } from "./config"
import { cubePartDefinition } from "./cubeparts"
import { constructShorthandIconCubeData, constructShorthandIconPrefixData, shorthandIconCubeData, shorthandIconPrefixData } from "./schematics/importedschematics/ccoiconsschema"
import { prefixIconTag, prefixRendererDefinition } from "./schematics/prefixrenderers"


export function turnCubePartsIntoShorthandData(parts: cubePartDefinition): shorthandIconCubeData {
    return constructShorthandIconCubeData({
        frames: parts.icon.length,
        scalar: config.baseCubeResolution / parts.icon[0].bitmap.width
    })
}

export function turnPrefixRendererIntoShorthandData(renderer: prefixRendererDefinition): shorthandIconPrefixData {
    return constructShorthandIconPrefixData({
        canvasScalar: renderer.canvasScale,
        frames: renderer.frames,
        addsOutlines: {
            background: renderer.outlines.background !== false,
            cube: renderer.outlines.cube !== false,
            foreground: renderer.outlines.foreground !== false
        },
        rendersForeground: renderer.foreground !== false,
        rendersBackground: renderer.background !== false,
        isSeeded: renderer.tags.includes(prefixIconTag.seeded)
    })
}