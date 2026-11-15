const rarityConfig = {
    collectorsPrefixAccentuation: 25,
    baseEnchantChance: 1 / 6
};
function constructRarityDefinition(data) {
    return {
        baseEnchantChance: data.baseEnchantChance ?? rarityConfig.baseEnchantChance,
        rarityUpgradeTier: data.rarityUpgradeTier ?? 0,
        unboxingWeight: data.unboxingWeight ?? 1,
        smashDropMultiplier: data.smashDropMultiplier ?? 1,
        baseTallyCap: data.baseTallyCap ?? 500,
        collectorsRequirement: data.collectorsRequirement ?? 500_000,
        color: data.color ?? "#ff0000",
        prefixAccentuation: data.prefixAccentuation ?? 1,
        tallyMaxFlavors: data.tallyMaxFlavors ?? ["Extremely Bugged"],
        name: data.name ?? "Rarity Name?",
        countsTowardsSeriesCubepediaCompletion: data.countsTowardsSeriesCubepediaCompletion ?? true,
        minimumEnchantmentsAppliedWhenEnchanting: data.minimumEnchantmentsAppliedWhenEnchanting ?? 1
    };
}
const raritySchema = {
    "common": constructRarityDefinition({
        unboxingWeight: 45_500_000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1,
        baseTallyCap: 500,
        collectorsRequirement: 200,
        color: "#4d950f",
        prefixAccentuation: 1,
        tallyMaxFlavors: [
            "Completely Catalogued"
        ],
        name: "Common",
        baseEnchantChance: 1 / 3,
        minimumEnchantmentsAppliedWhenEnchanting: 3
    }),
    "uncommon": constructRarityDefinition({
        unboxingWeight: 30000000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1.4,
        baseTallyCap: 1000,
        collectorsRequirement: 180,
        color: "#293f14",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Melancholically Marked"],
        name: "Uncommon",
        baseEnchantChance: 1 / 3,
        minimumEnchantmentsAppliedWhenEnchanting: 2
    }),
    "rare": constructRarityDefinition({
        unboxingWeight: 20000000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1.8,
        baseTallyCap: 1000,
        collectorsRequirement: 160,
        color: "#468586",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Indubitably Itemized"],
        name: "Rare",
        baseEnchantChance: 1 / 4,
        minimumEnchantmentsAppliedWhenEnchanting: 2
    }),
    "epic": constructRarityDefinition({
        unboxingWeight: 10000000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 2.2,
        baseTallyCap: 1000,
        collectorsRequirement: 120,
        color: "#741a62",
        prefixAccentuation: 1.1,
        tallyMaxFlavors: ["Reasonably Registered"],
        name: "Epic",
        baseEnchantChance: 1 / 4
    }),
    "legendary": constructRarityDefinition({
        unboxingWeight: 5000000,
        rarityUpgradeTier: 1,
        smashDropMultiplier: 4,
        baseTallyCap: 5000,
        collectorsRequirement: 80,
        color: "#ee39bb",
        prefixAccentuation: 1.2,
        tallyMaxFlavors: ["Decidedly Doomed"],
        name: "Legendary",
        baseEnchantChance: 1 / 5
    }),
    "relic": constructRarityDefinition({
        unboxingWeight: 2500000,
        rarityUpgradeTier: 2,
        smashDropMultiplier: 5,
        baseTallyCap: 15000,
        collectorsRequirement: 75,
        color: "#cc0000",
        prefixAccentuation: 1.3,
        tallyMaxFlavors: ["Eldenly Estimated"],
        name: "Relic",
        baseEnchantChance: 1 / 5
    }),
    "cubic": constructRarityDefinition({
        unboxingWeight: 400000,
        rarityUpgradeTier: 3,
        smashDropMultiplier: 6.5,
        baseTallyCap: 50000,
        collectorsRequirement: 50,
        color: "#2e2e2e",
        prefixAccentuation: 1.6,
        tallyMaxFlavors: ["Admittedly Arduous"],
        name: "Cubic",
        baseEnchantChance: 1 / 6
    }),
    "special": constructRarityDefinition({
        unboxingWeight: 350000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1,
        baseTallyCap: 1,
        collectorsRequirement: 140,
        color: "#70aeff",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Resplendently Reckoned"],
        name: "Special",
        baseEnchantChance: 1 / 6
    }),
    "gold": constructRarityDefinition({
        unboxingWeight: 10000,
        rarityUpgradeTier: 4,
        smashDropMultiplier: 8.5,
        baseTallyCap: 2_000_000,
        collectorsRequirement: 10,
        color: "#ebc634",
        prefixAccentuation: 2.2,
        tallyMaxFlavors: ["Expensively Encompassed"],
        name: "Gold",
        baseEnchantChance: 1 / 7,
        minimumEnchantmentsAppliedWhenEnchanting: 2
    }),
    "unreal": constructRarityDefinition({
        unboxingWeight: 100,
        rarityUpgradeTier: 5,
        smashDropMultiplier: 100,
        baseTallyCap: 5_000_000,
        collectorsRequirement: 3,
        color: "#240e0e",
        prefixAccentuation: 3.2,
        tallyMaxFlavors: ["Mythically Marked"],
        name: "Unreal",
        baseEnchantChance: 1 / 7,
        countsTowardsSeriesCubepediaCompletion: false,
        minimumEnchantmentsAppliedWhenEnchanting: 3
    }),
    "divine": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 25,
        baseTallyCap: 150000,
        collectorsRequirement: 999,
        color: "#ffffff",
        prefixAccentuation: 6.3,
        tallyMaxFlavors: ["Purely Parted"],
        name: "Divine",
        baseEnchantChance: 1 / 8
    }),
    "slated": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 25,
        baseTallyCap: 150000,
        collectorsRequirement: 999,
        color: "#213047",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Disgustingly Designated"],
        name: "Slated",
        baseEnchantChance: 1 / 8
    }),
    "collectors": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 12,
        baseTallyCap: 500000,
        collectorsRequirement: 999,
        color: "#660808",
        prefixAccentuation: rarityConfig.collectorsPrefixAccentuation,
        tallyMaxFlavors: ["Completely Comprised"],
        name: "Collected",
        baseEnchantChance: 1 / 8
    }),
    "exotic": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 4000,
        smashDropMultiplier: 1,
        baseTallyCap: 500000,
        collectorsRequirement: 10,
        color: "#84b512",
        prefixAccentuation: 2.6,
        tallyMaxFlavors: ["Foreignly Figured"],
        name: "Exotic",
        baseEnchantChance: 1 / 9,
        minimumEnchantmentsAppliedWhenEnchanting: 3
    }),
    "crafted": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 5,
        baseTallyCap: 1_500_000,
        collectorsRequirement: 15,
        color: "#4a2c1c",
        prefixAccentuation: 1.5,
        tallyMaxFlavors: ["Deliberately Determined"],
        name: "Shop Item",
        baseEnchantChance: 1 / 9
    }),
    "materialcube": constructRarityDefinition({
        unboxingWeight: 3000000,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 2,
        baseTallyCap: 1,
        collectorsRequirement: 100,
        color: "#787878",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Partly Premeditated"],
        name: "Material",
        baseEnchantChance: 1 / 9
    }),
    "contraband": constructRarityDefinition({
        unboxingWeight: 0,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1,
        baseTallyCap: 500000,
        collectorsRequirement: 1000,
        color: "#574000",
        prefixAccentuation: 1,
        tallyMaxFlavors: ["Remarkably Marked"],
        name: "Contraband",
        baseEnchantChance: 1 / 10
    }),
    "mythic": constructRarityDefinition({
        unboxingWeight: 50,
        rarityUpgradeTier: 0,
        smashDropMultiplier: 1,
        baseTallyCap: 1000000,
        collectorsRequirement: 101,
        color: "#f2b3f2",
        prefixAccentuation: 7,
        tallyMaxFlavors: ["Splendidly Specified"],
        name: "Mythical",
        baseEnchantChance: 1 / 10
    })
};
const allRarities = Object.keys(raritySchema);
export function validateRarityID(str) {
    return str in raritySchema;
}
export { raritySchema, allRarities };
