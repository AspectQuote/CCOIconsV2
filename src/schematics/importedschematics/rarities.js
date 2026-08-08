const rarityConfig = {
    collectorsPrefixAccentuation: 25
};
const raritySchema = {
    "common": {
        "unboxingWeight": 40000000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1,
        "baseTallyCap": 500,
        "collectorsRequirement": 200,
        "tourValueMultiplier": 0.5,
        "color": "#4d950f",
        "baseSigilSlots": 4,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Completely Catalogued"
        ],
        "name": "Common",
        "borderImage": "/tooltipbgs/common.png",
        "slatedValueReduction": 0.3
    },
    "uncommon": {
        "unboxingWeight": 35000000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1.4,
        "baseTallyCap": 1000,
        "collectorsRequirement": 180,
        "tourValueMultiplier": 0.5,
        "color": "#293f14",
        "baseSigilSlots": 4,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Melancholically Marked"
        ],
        "name": "Uncommon",
        "borderImage": "/tooltipbgs/uncommon.png",
        "slatedValueReduction": 0.4
    },
    "rare": {
        "unboxingWeight": 20000000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1.8,
        "baseTallyCap": 1000,
        "collectorsRequirement": 160,
        "tourValueMultiplier": 0.6,
        "color": "#468586",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Indubitably Itemized"
        ],
        "name": "Rare",
        "borderImage": "/tooltipbgs/rare.png",
        "slatedValueReduction": 0.5
    },
    "epic": {
        "unboxingWeight": 10000000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 2.2,
        "baseTallyCap": 1000,
        "collectorsRequirement": 120,
        "tourValueMultiplier": 0.7,
        "color": "#741a62",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1.1,
        "tallyMaxFlavors": [
            "Reasonably Registered"
        ],
        "name": "Epic",
        "borderImage": "/tooltipbgs/epic.png",
        "slatedValueReduction": 0.6
    },
    "legendary": {
        "unboxingWeight": 5000000,
        "rarityUpgradeTier": 1,
        "smashDropMultiplier": 2.5,
        "baseTallyCap": 5000,
        "collectorsRequirement": 80,
        "tourValueMultiplier": 0.8,
        "color": "#ee39bb",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1.2,
        "tallyMaxFlavors": [
            "Decidedly Doomed"
        ],
        "name": "Legendary",
        "borderImage": "/tooltipbgs/legendary.png",
        "slatedValueReduction": 0.7
    },
    "relic": {
        "unboxingWeight": 3000000,
        "rarityUpgradeTier": 2,
        "smashDropMultiplier": 2.7,
        "baseTallyCap": 15000,
        "collectorsRequirement": 75,
        "tourValueMultiplier": 0.7,
        "color": "#cc0000",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1.3,
        "tallyMaxFlavors": [
            "Eldenly Estimated"
        ],
        "name": "Relic",
        "borderImage": "/tooltipbgs/relic.png",
        "slatedValueReduction": 0.8
    },
    "cubic": {
        "unboxingWeight": 400000,
        "rarityUpgradeTier": 3,
        "smashDropMultiplier": 4.3,
        "baseTallyCap": 50000,
        "collectorsRequirement": 50,
        "tourValueMultiplier": 0.7,
        "color": "#2e2e2e",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1.6,
        "tallyMaxFlavors": [
            "Admittedly Arduous"
        ],
        "name": "Cubic",
        "borderImage": "/tooltipbgs/cubic.png",
        "slatedValueReduction": 0.9
    },
    "special": {
        "unboxingWeight": 350000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1,
        "baseTallyCap": 1,
        "collectorsRequirement": 140,
        "tourValueMultiplier": 0.5,
        "color": "#70aeff",
        "baseSigilSlots": 7,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Resplendently Reckoned"
        ],
        "name": "Special",
        "borderImage": "/tooltipbgs/special.png",
        "slatedValueReduction": 0.8
    },
    "gold": {
        "unboxingWeight": 10000,
        "rarityUpgradeTier": 4,
        "smashDropMultiplier": 6,
        "baseTallyCap": 250000,
        "collectorsRequirement": 10,
        "tourValueMultiplier": 0.6,
        "color": "#ebc634",
        "baseSigilSlots": 5,
        "prefixAccentuation": 2.2,
        "tallyMaxFlavors": [
            "Expensively Encompassed"
        ],
        "name": "Gold",
        "borderImage": "/tooltipbgs/gold.png",
        "slatedValueReduction": 0.9
    },
    "unreal": {
        "unboxingWeight": 100,
        "rarityUpgradeTier": 5,
        "smashDropMultiplier": 100,
        "baseTallyCap": 1250000,
        "collectorsRequirement": 3,
        "tourValueMultiplier": 0.1,
        "color": "#240e0e",
        "baseSigilSlots": 5,
        "prefixAccentuation": 3.2,
        "tallyMaxFlavors": [
            "Mythically Marked"
        ],
        "name": "Unreal",
        "borderImage": "/tooltipbgs/unreal.png",
        "slatedValueReduction": 0.1
    },
    "divine": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 25,
        "baseTallyCap": 150000,
        "collectorsRequirement": 999,
        "tourValueMultiplier": 0.1,
        "color": "#ffffff",
        "baseSigilSlots": 5,
        "prefixAccentuation": 6.3,
        "tallyMaxFlavors": [
            "Purely Parted"
        ],
        "name": "Divine",
        "borderImage": "/tooltipbgs/divine.png",
        "slatedValueReduction": 1
    },
    "slated": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 25,
        "baseTallyCap": 150000,
        "collectorsRequirement": 999,
        "tourValueMultiplier": 0.1,
        "color": "#213047",
        "baseSigilSlots": 5,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Disgustingly Designated"
        ],
        "name": "Slated",
        "borderImage": "/tooltipbgs/slated.png",
        "slatedValueReduction": 1
    },
    "coldiv": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 40,
        "baseTallyCap": 750000,
        "collectorsRequirement": 999,
        "tourValueMultiplier": 0.3,
        "color": "#660808",
        "baseSigilSlots": 5,
        "prefixAccentuation": rarityConfig.collectorsPrefixAccentuation,
        "tallyMaxFlavors": [
            "Gleefully Gapped"
        ],
        "cannotDropSpecialMaterials": true,
        "name": "Collector's Divine",
        "borderImage": "/tooltipbgs/coldiv.png",
        "slatedValueReduction": 1
    },
    "colslat": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 40,
        "baseTallyCap": 750000,
        "collectorsRequirement": 999,
        "tourValueMultiplier": 0.3,
        "color": "#660808",
        "baseSigilSlots": 5,
        "prefixAccentuation": rarityConfig.collectorsPrefixAccentuation,
        "tallyMaxFlavors": [
            "Nastily Noticeable"
        ],
        "cannotDropSpecialMaterials": true,
        "name": "Collector's Slated",
        "borderImage": "/tooltipbgs/colslat.png",
        "slatedValueReduction": 0.9
    },
    "collectors": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 12,
        "baseTallyCap": 500000,
        "collectorsRequirement": 999,
        "tourValueMultiplier": 0.3,
        "color": "#660808",
        "baseSigilSlots": 3,
        "prefixAccentuation": rarityConfig.collectorsPrefixAccentuation,
        "tallyMaxFlavors": [
            "Completely Comprised"
        ],
        "cannotDropSpecialMaterials": true,
        "name": "Collector's",
        "borderImage": "/tooltipbgs/collectors.png",
        "slatedValueReduction": 1
    },
    "exotic": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 4000,
        "smashDropMultiplier": 1,
        "baseTallyCap": 500000,
        "collectorsRequirement": 10,
        "tourValueMultiplier": 0.5,
        "color": "#84b512",
        "baseSigilSlots": 5,
        "prefixAccentuation": 2.6,
        "tallyMaxFlavors": [
            "Foreignly Figured"
        ],
        "name": "Exotic",
        "borderImage": "/tooltipbgs/exotic.png",
        "slatedValueReduction": 0.5
    },
    "crafted": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 20,
        "baseTallyCap": 999999999,
        "collectorsRequirement": 15,
        "tourValueMultiplier": 0.5,
        "color": "#4a2c1c",
        "baseSigilSlots": 3,
        "prefixAccentuation": 1.5,
        "tallyMaxFlavors": [
            "Deliberately Determined"
        ],
        "cannotDropSpecialMaterials": true,
        "name": "Shop Item",
        "borderImage": "/tooltipbgs/crafted.png",
        "slatedValueReduction": 0.8
    },
    "materialcube": {
        "unboxingWeight": 3000000,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 2,
        "baseTallyCap": 1,
        "collectorsRequirement": 100,
        "tourValueMultiplier": 1,
        "color": "#787878",
        "baseSigilSlots": 3,
        "prefixAccentuation": 0,
        "tallyMaxFlavors": [
            "Partly Premeditated"
        ],
        "name": "Material",
        "borderImage": "/tooltipbgs/materialcube.png",
        "slatedValueReduction": 0.9
    },
    "contraband": {
        "unboxingWeight": 0,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1,
        "baseTallyCap": 500000,
        "collectorsRequirement": 1000,
        "tourValueMultiplier": 1,
        "color": "#574000",
        "baseSigilSlots": 1,
        "prefixAccentuation": 1,
        "tallyMaxFlavors": [
            "Remarkably Marked"
        ],
        "name": "Contraband",
        "borderImage": "/tooltipbgs/contraband.png",
        "slatedValueReduction": 0.1
    },
    "mythic": {
        "unboxingWeight": 50,
        "rarityUpgradeTier": 0,
        "smashDropMultiplier": 1,
        "baseTallyCap": 1000000,
        "collectorsRequirement": 101,
        "tourValueMultiplier": 1,
        "color": "#f2b3f2",
        "baseSigilSlots": 0,
        "prefixAccentuation": 7,
        "tallyMaxFlavors": [
            "Splendidly Specified"
        ],
        "name": "Mythical",
        "borderImage": "/tooltipbgs/mythical.png",
        "slatedValueReduction": 0.5
    }
};
const allRarities = Object.keys(raritySchema);
export { raritySchema, allRarities };
