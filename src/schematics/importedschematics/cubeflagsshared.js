// I know this sucks, but I have to make sure CCOIcons resources aren't compiled with CCO client resources.
export var cubeFlags;
(function (cubeFlags) {
    cubeFlags[cubeFlags["bSide"] = 0] = "bSide";
    cubeFlags[cubeFlags["collectors"] = 1] = "collectors";
    cubeFlags[cubeFlags["divine"] = 2] = "divine";
    cubeFlags[cubeFlags["slated"] = 3] = "slated";
    cubeFlags[cubeFlags["contraband"] = 4] = "contraband";
})(cubeFlags || (cubeFlags = {}));
export const maxFlag = (Object.keys(cubeFlags).length / 2) - 1;
export const maxFlagFieldValue = (2 ** (maxFlag + 1));
export function cubeFlagInBitfield(flagsField, flag) {
    return ((flagsField >>> flag) & 1) === 1;
}
export function turnFlagsFieldIntoFlagsArray(flags) {
    let binary = Math.abs(flags) % maxFlagFieldValue;
    let iteration = 0;
    const outputFlags = [];
    while (binary > 0) {
        if ((binary % 2) === 1) {
            outputFlags.push(iteration);
        }
        binary = binary >> 1;
        iteration++;
    }
    return outputFlags;
}
