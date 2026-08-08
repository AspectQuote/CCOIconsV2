import { CubeID } from "./importedschematics/cubes";

export function constructCubePatternDefinition(data: Partial<cubePatternDefinition>): cubePatternDefinition {
    return {
        baseimage: data.baseimage ?? "base",
        overlayimage: data.overlayimage ?? "finaloverlay",
        masks: data.masks ?? [],
        patternimages: data.patternimages ?? []
    }
}

export const patternedCubeSchema = {
    "polkacapsule": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "polkadots",
                "seedrotate": true,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "elixir": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "bubbles",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "chalkboard": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "chalkboard",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "heartratemonitor": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "pulse",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "striped": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "stripes",
                "seedrotate": true,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "houndstooth": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "houndstooth",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "barcode": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "barcode",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "static": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "pollock",
                "seedrotate": true,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "infested": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "lurkers",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": true,
                "seedscalerange": [
                    1,
                    2
                ]
            }
        ]
    },
    "topographical": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "topography",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "confetti": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "gayfetti",
                "seedrotate": true,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "perceiving": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "verygreen",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "hydrodipped": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            },
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 1
            }
        ],
        "patternimages": [
            {
                "path": "gradientbrightgreen",
                "seedhuerotate": true
            },
            {
                "path": "hydrodipped"
            }
        ]
    },
    "general": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask1"
                ],
                "patternimage": 0
            },
            {
                "images": [
                    "patternmask2"
                ],
                "patternimage": 1
            },
            {
                "images": [
                    "patternmask3"
                ],
                "patternimage": 2
            }
        ],
        "patternimages": [
            {
                "path": "bubbles",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            },
            {
                "path": "bubbles",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            },
            {
                "path": "bubbles",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "eclipse": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "eclipse",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "twilight": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "sunset",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "emo": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "bubbles",
                "seedrotate": true,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "crowded": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "crowded",
                "seedrotate": false,
                "seedhuerotate": false,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ]
            }
        ]
    },
    "sweeper": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "sweeper"
            }
        ]
    },
    "racerhelmet": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "helmetcolormask"
                ],
                "patternimage": 0
            },
            {
                "images": [
                    "helmetpatternmask1",
                    "helmetpatternmask2",
                    "helmetpatternmask3"
                ],
                "patternimage": 1
            },
            {
                "images": [
                    "helmetvisoroutline"
                ],
                "patternimage": 1
            },
            {
                "images": [
                    "leftnumbermask0",
                    "leftnumbermask1",
                    "leftnumbermask2",
                    "leftnumbermask3",
                    "leftnumbermask4",
                    "leftnumbermask5",
                    "leftnumbermask6",
                    "leftnumbermask7",
                    "leftnumbermask8",
                    "leftnumbermask9"
                ],
                "patternimage": 2
            },
            {
                "images": [
                    "rightnumbermask0",
                    "rightnumbermask1",
                    "rightnumbermask2",
                    "rightnumbermask3",
                    "rightnumbermask4",
                    "rightnumbermask5",
                    "rightnumbermask6",
                    "rightnumbermask7",
                    "rightnumbermask8",
                    "rightnumbermask9"
                ],
                "patternimage": 2
            }
        ],
        "patternimages": [
            {
                "path": "basegreen",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ],
                "seedbrightness": true,
                "seedbrightnessrange": [
                    -10,
                    50
                ],
                "seedsaturate": true,
                "seedsaturaterange": [
                    0,
                    0
                ]
            },
            {
                "path": "pollock",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ],
                "seedbrightness": false,
                "seedbrightnessrange": [
                    0.5,
                    2
                ],
                "seedsaturate": false,
                "seedsaturaterange": [
                    0.5,
                    2
                ]
            },
            {
                "path": "basegreen",
                "seedrotate": false,
                "seedhuerotate": true,
                "seedscale": false,
                "seedscalerange": [
                    0.1,
                    2
                ],
                "seedbrightness": true,
                "seedbrightnessrange": [
                    0.5,
                    2
                ],
                "seedsaturate": true,
                "seedsaturaterange": [
                    0.5,
                    2
                ]
            }
        ]
    },
    "circumscribed": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "circumscribed",
                "seedhuerotate": true
            }
        ]
    },
    "complexion": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "complexion",
                "seedhuerotate": true
            }
        ]
    },
    "dragoncurve": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "dragoncurve",
                "seedhuerotate": true
            }
        ]
    },
    "hemholtz": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "hemholtz",
                "seedhuerotate": true
            }
        ]
    },
    "hilbertcurve": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "hilbertcurve",
                "seedhuerotate": true
            }
        ]
    },
    "imperialpattern": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "imperial",
                "seedhuerotate": true
            }
        ]
    },
    "mandelbrot": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "mandelbrot",
                "seedhuerotate": true
            }
        ]
    },
    "menger": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "menger",
                "seedhuerotate": true
            }
        ]
    },
    "negativespace": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "negativespace",
                "seedhuerotate": true
            }
        ]
    },
    "sierpinski": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "sierpinski",
                "seedhuerotate": true
            }
        ]
    },
    "spearmint": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "spearmint"
            }
        ]
    },
    "tilated": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "tilated",
                "seedhuerotate": true
            }
        ]
    },
    "transitional": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "transitional",
                "seedhuerotate": true
            }
        ]
    },
    "translational": {
        "baseimage": "base",
        "overlayimage": "finaloverlay",
        "masks": [
            {
                "images": [
                    "patternmask"
                ],
                "patternimage": 0
            }
        ],
        "patternimages": [
            {
                "path": "translational",
                "seedhuerotate": true
            }
        ]
    },
    "conway": {
        "baseimage": "base",
        "overlayimage": "the code for this is handled separately.",
        "masks": [],
        "patternimages": []
    },
    "badass": {
        "baseimage": "base",
        "overlayimage": "the code for this is handled separately.",
        "masks": [],
        "patternimages": []
    }
} as const satisfies { [key in CubeID]?: cubePatternDefinition }

export type patternedCubeID = keyof typeof patternedCubeSchema;

export type cubePatternImage = {
    /**
     * Pattern Image Path
     * - Path an image file in the directory './sourceicons/textures/' (don't include '.png' in the path name)
     */
    path: string,

    /**
     * Pattern Seed Rotation
     * - Whether or not to rotate the pattern image. If the image is rotated, then the server will shrink the image to cut out the whitespace in the corners.
     */
    seedrotate?: boolean,

    /**
     * Pattern Seed Hue Rotation
     * - Whether or not to rotate the hue of the pattern (basically shifting all the colors of the pattern image, this is the reason that pattern images are usually monochromatic/green)
     */
    seedhuerotate?: boolean,

    /**
     * Pattern Seed Scale
     * - Whether or not to scale the pattern, the 'seedscalerange' property determines how large or small it can be scaled to. (Scaling is changing the size of the patterned image before it is masked.)
     */
    seedscale?: boolean,

    /**
     * Pattern Seed Scale Range
     * - How large/small to scale the pattern image, each element is the range of multipliers to scale with (0.2 is 20% size, 2 is 200% size)
     */
    seedscalerange?: [number, number],

    /**
     * Pattern Seed Brightness
     * - Whether or brighten/darken the image
     */
    seedbrightness?: boolean,

    /**
     * Pattern Brightness Range
     * - How much to brighten/darken image, each element is the range of multipliers to brightness with (-20 is 20% darker, 200 is 200% brighter)
     */
    seedbrightnessrange?: [number, number],

    /**
     * Pattern Seed Saturation
     * - Whether or not to saturate/desaturate the image
     */
    seedsaturate?: boolean,

    /**
     * Pattern Saturation Range
     * - How much to saturate the image, each element is the range of multipliers to saturate with (-20 is 20% desaturated, 200 is 200% more saturated)
     */
    seedsaturaterange?: [number, number]
}

export type cubePatternDefinition = {
    /**
     * Base Image
     * - The name of the base image file in the directory './sourceicons/seededcubetextures/{@link cubeID|cubeID}/'
     */
    baseimage: string,

    /**
     * Final Overlay
     * - The name of the overlay image file in the directory './sourceicons/seededcubetextures/{@link cubeID|cubeID}/' (this is usually the lighting of the cube)
     */
    overlayimage: string,

    /**
     * Mask Images
     * - The patterns to apply to the icon, each is applied in order.
     */
    masks: {
        /**
         * Possible Mask Images
         * - Paths to image files in the directory './sourceicons/seededcubetextures/{@link cubeID|cubeID}/' (the image is chosen at random, based on the seed.)
         */
        images: string[],

        /**
         * Pattern Image Index
         * - Index of the {@link cubePatternDefinition.patternimages|PatternImage} image to mask using the randomized mask image
         */
        patternimage: number
    }[],

    /**
     * Pattern Image Definitions
     * - An array of pattern images and the transformations to apply to them, referenced by the 'patternimage' property in the elements of {@link cubePatternDefinition.masks|masks}
     */
    patternimages: cubePatternImage[]
}