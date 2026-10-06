interface RarityDefinition {
    rarityUpgradeTier: number;
    unboxingWeight: number;
    smashDropMultiplier: number;
    baseTallyCap: number;
    collectorsRequirement: number;
    color: string;
    prefixAccentuation: number;
    tallyMaxFlavors: string[];
    name: string;
    baseEnchantChance: number;
    countsTowardsSeriesCubepediaCompletion: boolean;
    minimumEnchantmentsAppliedWhenEnchanting: number;
}
declare const raritySchema: {
    readonly common: RarityDefinition;
    readonly uncommon: RarityDefinition;
    readonly rare: RarityDefinition;
    readonly epic: RarityDefinition;
    readonly legendary: RarityDefinition;
    readonly relic: RarityDefinition;
    readonly cubic: RarityDefinition;
    readonly special: RarityDefinition;
    readonly gold: RarityDefinition;
    readonly unreal: RarityDefinition;
    readonly divine: RarityDefinition;
    readonly slated: RarityDefinition;
    readonly coldiv: RarityDefinition;
    readonly colslat: RarityDefinition;
    readonly collectors: RarityDefinition;
    readonly exotic: RarityDefinition;
    readonly crafted: RarityDefinition;
    readonly materialcube: RarityDefinition;
    readonly contraband: RarityDefinition;
    readonly mythic: RarityDefinition;
};
type RarityID = keyof typeof raritySchema;
declare const allRarities: RarityID[];
export { raritySchema, allRarities, type RarityID };
