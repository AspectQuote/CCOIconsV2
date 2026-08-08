import path from "path";

export const config = {
    serverPort: 80,
    devmode: process.argv.findIndex(arg => arg === "--dev") !== -1,
    
    /**
     * Controls how many cube pattern indices there can be, it's pretty arbitrary.
     */
    cubePatternIndexLimit: 500,
    
    /**
     * Controls how many prefix pattern indices there can be, it's pretty arbitrary.
     */
    prefixPatternIndexLimit: 300,
    
    /**
     * Changes where the source image directory for cubes is, you can modify this if you want to separate your own cubes from the other ones.
     */
    sourceImagesDirectory: path.resolve('./sourceicons/'),

    /**
     * Output directory
     */
    outputDirectory: path.resolve('./../ccicons/'),

    /**
     * Base cube resolution, determines scalar related stuff
     */
    baseCubeResolution: 32,

    /**
     * The most amount of pixels the B-Side algorithm will process, higher resolutions than this will be resized to fit this # of pixels.
     */
    bSideMaxPixels: 15000
}