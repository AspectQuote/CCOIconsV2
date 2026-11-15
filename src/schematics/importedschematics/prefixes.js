function constructPrefix(data) {
    return {
        name: data.name ?? "Prefix Name",
        multiplier: data.multiplier ?? 1,
        desc: data.desc ?? "Prefix Description",
        excludedFromCompletion: data.excludedFromCompletion ?? false,
        elements: data.elements ?? [],
        author: data.author ?? "AspectQuote"
    };
}
export const prefixSchema = {
    "bugged": constructPrefix({
        name: "Bugged",
        multiplier: 200,
        desc: "DOES NOT COMPUTE. Can only be seen by obtaining a cube with a broken prefix... or obtaining a cube with two of the same prefix.",
        excludedFromCompletion: true
    }),
    "leafy": constructPrefix({
        "name": "Leafy",
        "multiplier": 128,
        "desc": "Not to be confused with leafy.",
        "elements": [
            "Organic"
        ]
    }),
    "cruel": constructPrefix({
        "name": "Cruel",
        "multiplier": 127,
        "desc": "I feel as if these cubes would do a good job fighting market manipulation.",
        "elements": [
            "Glass"
        ]
    }),
    "based": constructPrefix({
        "name": "Based",
        "multiplier": 126,
        "desc": "*LOUD BASS BOOSTED SFX*",
        "elements": [
            "Makes-Noise"
        ]
    }),
    "orbital": constructPrefix({
        "name": "Orbital",
        "multiplier": 125,
        "desc": "The center of its own little universe!",
        "elements": [
            "Heavy"
        ]
    }),
    "sacred": constructPrefix({
        "name": "Sacred",
        "multiplier": 124,
        "desc": "The sacrificial cube",
        "elements": [
            "Pure"
        ]
    }),
    "flaming": constructPrefix({
        "name": "Flaming",
        "multiplier": 123,
        "desc": "I. AM. ON. FIRE!!!",
        "elements": [
            "Hot"
        ]
    }),
    "cursed": constructPrefix({
        "name": "Cursed",
        "multiplier": 123,
        "desc": "THE PENTACLE REVOLVING",
        "elements": [
            "Hot"
        ]
    }),
    "emburdening": constructPrefix({
        "name": "Emburdening",
        "multiplier": 122,
        "desc": "'Man this cube is super heavy' - the guy holding this cube up",
        "elements": [
            "Heavy",
            "Stony"
        ]
    }),
    "cuffed": constructPrefix({
        "name": "Cuffed",
        "multiplier": 121,
        "desc": "You are under the rest.",
        "elements": [
            "Magnetic"
        ]
    }),
    "endangered": constructPrefix({
        "name": "Endangered",
        "multiplier": 120,
        "desc": "IT'S A TRAP! (...a bear trap!)"
    }),
    "marvelous": constructPrefix({
        "name": "Marvelous",
        "multiplier": 119,
        "desc": "A hand-holding cube! How scandalous!ddd",
        "elements": [
            "Heavy"
        ]
    }),
    "phasing": constructPrefix({
        "name": "Phasing",
        "multiplier": 118,
        "desc": "It's decorporealizing!",
        "elements": [
            "Light"
        ]
    }),
    "tentacular": constructPrefix({
        "name": "Tentacular",
        "multiplier": 117,
        "desc": "It's got extra appendages!",
        "elements": [
            "Slimy"
        ]
    }),
    "dotted": constructPrefix({
        "name": "Dotted",
        "multiplier": 117,
        "desc": "Circles in your cubes? It's more likely than you think.",
        "elements": [
            "Pure"
        ]
    }),
    "evanescent": constructPrefix({
        "name": "Evanescent",
        "multiplier": 116,
        "desc": "It's dematerializing!",
        "elements": [
            "Light"
        ]
    }),
    "royal": constructPrefix({
        "name": "Royal",
        "multiplier": 115,
        "desc": "Only cubes of a pureblooded lineage may bear this prefix.",
        "elements": [
            "Shiny"
        ],
    }),
    "captain": constructPrefix({
        "name": "Captain",
        "multiplier": 114,
        "desc": "YES! PERFECT!",
        "elements": [
            "Fabric"
        ]
    }),
    "oriental": constructPrefix({
        "name": "Oriental",
        "multiplier": 114,
        "desc": "It's raising the roof!",
        "elements": ["Heavy"]
    }),
    "insignificant": constructPrefix({
        "name": "Insignificant",
        "multiplier": 113,
        "desc": "THIS IS NOT OVER!",
        "elements": [
            "Light-Emitting"
        ]
    }),
    "95in": constructPrefix({
        "name": "95in'",
        "multiplier": 112,
        "desc": "[Error Sound]",
        "elements": [
            "Painted"
        ]
    }),
    "marbleized": constructPrefix({
        "name": "Marbleized",
        "multiplier": 112,
        "desc": "Jawline chiseled from stone.",
        "elements": ["Stony", "Heavy"]
    }),
    "snowy": constructPrefix({
        "name": "Snowy",
        "multiplier": 111,
        "desc": "A cold wind blows away...",
        "elements": [
            "Cold"
        ],
    }),
    "roaring": constructPrefix({
        "name": "Roaring",
        "multiplier": 111,
        "desc": "Hopefully it doesn't have a Black Knife!",
        "elements": ["Haunted", "Heavy"]
    }),
    "summoning": constructPrefix({
        "name": "Summoning",
        "multiplier": 110,
        "desc": "Lots of spinny cubes spinning around your cube (which might even be spinning itself!)",
        "elements": [
            "Light-Emitting"
        ]
    }),
    "misprinted": constructPrefix({
        "name": "Misprinted",
        "multiplier": 110,
        "desc": "That's gotta be worth overpay.",
        "elements": []
    }),
    "swarming": constructPrefix({
        "name": "Swarming",
        "multiplier": 109,
        "desc": "They gather for you.",
        "elements": [
            "Haunted"
        ],
    }),
    "conjoined": constructPrefix({
        "name": "Conjoined",
        "multiplier": 109,
        "desc": "Look! He's... smiling?",
        "elements": ["Haunted"]
    }),
    "kramped": constructPrefix({
        "name": "Kramped",
        "multiplier": 108,
        "desc": "Coal. For every holiday.",
        "elements": [
            "Ancient"
        ]
    }),
    "constructive": constructPrefix({
        "name": "Constructive",
        "multiplier": 108,
        "desc": "Now if it copied the cube to the right...",
        "elements": ["Light"]
    }),
    "dandy": constructPrefix({
        "name": "Dandy",
        "multiplier": 107,
        "desc": "You really are... dandy.",
        "elements": [
            "Pure"
        ]
    }),
    "scrumptious": constructPrefix({
        "name": "Scrumptious",
        "multiplier": 107,
        "desc": "Get me a bowl of THAT!",
        "elements": ["Edible"]
    }),
    "incarcerated": constructPrefix({
        "name": "Incarcerated",
        "multiplier": 106,
        "desc": "Imprisoned for being too collectable",
        "elements": ["Heavy", "Magnetic"]
    }),
    "boxed": constructPrefix({
        "name": "Boxed",
        "multiplier": 106,
        "desc": "Matryoshka boxes with a cube center.",
        "elements": ["Plastic"]
    }),
    "runic": constructPrefix({
        "name": "Runic",
        "multiplier": 105,
        "desc": "A bunch of norse runes. Honestly, I couldn't tell you what they mean.",
        "elements": [
            "Pure"
        ]
    }),
    "rippling": constructPrefix({
        "name": "Rippling",
        "multiplier": 104,
        "desc": "I guess you could say it's... making waves.",
        "elements": [
            "Electronic"
        ]
    }),
    "emphasized": constructPrefix({
        "name": "Emphasized",
        "multiplier": 103,
        "desc": "Way to put the spotlight on it!",
        "elements": ["Light-Emitting"]
    }),
    "chained": constructPrefix({
        "name": "Chained",
        "multiplier": 102,
        "desc": "It has some strings to hold it down! (Heavy and Metal strings)",
        "elements": ["Magnetic", "Heavy"]
    }),
    "tumbling": constructPrefix({
        "name": "Tumbling",
        "multiplier": 102,
        "desc": "Congratulations!"
    }),
    "angelic": constructPrefix({
        "name": "Angelic",
        "multiplier": 101,
        "desc": "A halo of LIES! (Nobody knows if the halo is fake or not.)",
        "elements": ["Pure", "Light-Emitting"]
    }),
    "menacing": constructPrefix({
        "name": "Menacing",
        "multiplier": 100,
        "desc": "This thing is as tough as a pillar, man."
    }),
    "serving": constructPrefix({
        "name": "Serving",
        "multiplier": 99,
        "desc": "It cares so much, you wonder if it's being obsequious.",
        "elements": ["Fabric"]
    }),
    "holy": constructPrefix({
        "name": "Holy",
        "multiplier": 98,
        "desc": "*angelic voices*",
        "elements": ["Light-Emitting"]
    }),
    "unholy": constructPrefix({
        "name": "Unholy",
        "multiplier": 97,
        "desc": "*not so angelic voices*",
        "elements": ["Light-Emitting"]
    }),
    "contaminated": constructPrefix({
        "name": "Contaminated",
        "multiplier": 96,
        "desc": "*irradiated voices*",
        "elements": ["Light-Emitting"]
    }),
    "phosphorescent": constructPrefix({
        "name": "Phosphorescent",
        "multiplier": 95,
        "desc": "*glowing voices*",
        "elements": ["Light-Emitting"]
    }),
    "neko": constructPrefix({
        "name": "Neko",
        "multiplier": 94,
        "desc": "meow meow.",
        "elements": ["Organic"]
    }),
    "mathematical": constructPrefix({
        "name": "Mathematical",
        "multiplier": 93,
        "desc": "All the numbers for this prefix are unique to this cube, isn't that cool?",
        "elements": ["Electronic"]
    }),
    "wanted": constructPrefix({
        "name": "Wanted",
        "multiplier": 92,
        "desc": "DEAD OR ALIVE.",
        "elements": ["Fabric"]
    }),
    "onomatopoeiacal": constructPrefix({
        "name": "Onomatopoeiacal",
        "multiplier": 91,
        "desc": "Try saying and SPELLING that 3 times fast!",
        "elements": ["Makes-Noise"]
    }),
    "foolish": constructPrefix({
        "name": "Foolish",
        "multiplier": 91,
        "desc": "Thank you, Dangly Bells.",
        "elements": ["Fabric"]
    }),
    "smoked": constructPrefix({
        "name": "Smoked",
        "multiplier": 90,
        "desc": "You just got smoked boooy!",
        "elements": ["Fabric"]
    }),
    "basking": constructPrefix({
        "name": "Basking",
        "multiplier": 89,
        "desc": "It's getting its tanlines done.",
        "elements": ["Hot"]
    }),
    "omniscient": constructPrefix({
        "name": "Omniscient",
        "multiplier": 88,
        "desc": "The all-knowing prefix",
        "elements": ["Haunted"]
    }),
    "sniping": constructPrefix({
        "name": "Sniping",
        "multiplier": 87,
        "desc": "Taking fire, need assistance!"
    }),
    "beboppin": constructPrefix({
        "name": "Beboppin'",
        "multiplier": 86,
        "desc": "In the rain..."
    }),
    "skewed": constructPrefix({
        "name": "Skewed",
        "multiplier": 86,
        "desc": "...and I'm hopelessly askew."
    }),
    "hardboiled": constructPrefix({
        "name": "Hard-Boiled",
        "multiplier": 85,
        "desc": "Elementary, my dear collector!",
        "elements": ["Fabric"]
    }),
    "angry": constructPrefix({
        "name": "Angry",
        "multiplier": 84,
        "desc": "Very angery cubes can have this prefix!",
        "elements": ["Hot"]
    }),
    "gruesome": constructPrefix({
        "name": "Gruesome",
        "multiplier": 83,
        "desc": "Man who thought pink blood was a good idea!?",
        "elements": ["Wet"]
    }),
    "outlawed": constructPrefix({
        "name": "Outlawed",
        "multiplier": 82,
        "desc": "The fastest cube in the west!"
    }),
    "wranglin": constructPrefix({
        "name": "Wranglin'",
        "multiplier": 81,
        "desc": "18 naked cubes",
        "elements": ["Fabric"],
        excludedFromCompletion: true
    }),
    "canoodled": constructPrefix({
        "name": "Canoodled",
        "multiplier": 80,
        "desc": "*mwah*",
        "elements": ["Painted"]
    }),
    "saiyan": constructPrefix({
        "name": "Saiyan",
        "multiplier": 80,
        "desc": "[Joke about the number 9000 here]",
        "elements": ["Light-Emitting"]
    }),
    "amorous": constructPrefix({
        "name": "Amorous",
        "multiplier": 79,
        "desc": "Trying to get all lovey-dovey with your cubes? Weirdo."
    }),
    "palletized": constructPrefix({
        "name": "Palletized",
        "multiplier": 79,
        "desc": "Ready to be shipped off!",
        "elements": ["Heavy"],
    }),
    "collectible": constructPrefix({
        "name": "Collectible",
        "multiplier": 79,
        "desc": "Cube Collectors search for Collectible Cubes to fill out their Cube Collection.",
        elements: ["Glass"]
    }),
    "dazed": constructPrefix({
        "name": "Dazed",
        "multiplier": 78,
        "desc": "Punch your cube in the face! Try it! That'll increase its value!"
    }),
    "adduced": constructPrefix({
        "name": "Adduced",
        "multiplier": 77,
        "desc": "Move along people, nothing to see here.",
        "elements": ["Plastic"],
    }),
    "meleagris": constructPrefix({
        "name": "Meleagris",
        "multiplier": 77,
        "desc": "You can faintly hear 'Gobble Gobble'.",
        "elements": ["Organic", "Makes-Noise"]
    }),
    "awardwin": constructPrefix({
        "name": "Award-Winning",
        "multiplier": 76,
        "desc": "First place at the faire!"
    }),
    "glitchy": constructPrefix({
        "name": "Glitchy",
        "multiplier": 76,
        "desc": "0b100 === 4 : true",
        "elements": ["Electronic"]
    }),
    "frosty": constructPrefix({
        "name": "Frosty",
        "multiplier": 75,
        "desc": "Oh he's chill.",
        "elements": ["Cold", "Cold"]
    }),
    "freshened": constructPrefix({
        "name": "Freshened",
        "multiplier": 75,
        "desc": "An olfactory experience.",
        "elements": ["Fresh"]
    }),
    "electrified": constructPrefix({
        "name": "Electrified",
        "multiplier": 74,
        "desc": "Static charge, I think?",
        "elements": ["Light-Emitting"]
    }),
    "overcast": constructPrefix({
        "name": "Overcast",
        "multiplier": 73,
        "desc": "Days like this are great...",
        "elements": ["Wet"]
    }),
    "bladed": constructPrefix({
        "name": "Bladed",
        "multiplier": 72,
        "desc": "While you studied the cubepedia, I studied the blade.",
        "elements": ["Heavy"]
    }),
    "jolly": constructPrefix({
        "name": "Jolly",
        "multiplier": 71,
        "desc": "Ho Ho Ho! Merry Cubesmas!",
        "elements": ["Fabric", "Cold"]
    }),
    "partying": constructPrefix({
        "name": "Partying",
        "multiplier": 70,
        "desc": "Party time, let's GO!",
        "elements": ["Makes-Noise"],
    }),
    "leeking": constructPrefix({
        "name": "Leeking",
        "multiplier": 60,
        "desc": "ievan polkka spins me 'round.",
        "elements": ["Edible"]
    }),
    "sophisticated": constructPrefix({
        "name": "Sophisticated",
        "multiplier": 69,
        "desc": "Hmm yes my good sir. A glass of your finest.",
        "elements": ["Fabric"]
    }),
    "culinary": constructPrefix({
        "name": "Culinary",
        "multiplier": 68,
        "desc": "Oh dear gorgeous.",
        "elements": ["Edible", "Fabric"]
    }),
    "eudaemonic": constructPrefix({
        "name": "Eudaemonic",
        "multiplier": 67,
        "desc": "The cube is giving you the impression of it being friendly. DON'T BE FOOLED. CUBES ARE NOT TO BE TRUSTED.",
        "elements": ["Makes-Noise"]
    }),
    "magical": constructPrefix({
        "name": "Magical",
        "multiplier": 66,
        "desc": "Evil Cube Wizard Gang. We love casting spells.",
        "elements": ["Light-Emitting"]
    }),
    "demarcated": constructPrefix({
        "name": "Demarcated",
        "multiplier": 65,
        "desc": "To ensure your safety, stay away from this cube.",
        "elements": ["Painted"]
    }),
    "blushing": constructPrefix({
        "name": "Blushing",
        "multiplier": 65,
        "desc": ">~< I'm so vewwy sowwy I don't add that much vawyou ;-; h-how can I make it up to you, baka?", // I'm sorry.
        "elements": ["Hot"]
    }),
    "defeatable": constructPrefix({
        "name": "Defeatable",
        "multiplier": 65,
        "desc": "If it was unbeatable, why would you fight it?",
        "elements": ["Makes-Noise"]
    }),
    "sweetened": constructPrefix({
        "name": "Sweetened",
        "multiplier": 64,
        "desc": "Pretty please with a cube on top?",
        "elements": ["Poisonous"],
        excludedFromCompletion: true
    }),
    "dovey": constructPrefix({
        "name": "Dovey",
        "multiplier": 63,
        "desc": "The bird is perched."
    }),
    "batty": constructPrefix({
        "name": "Batty",
        "multiplier": 62,
        "desc": "Just hangin' around."
    }),
    "streaming": constructPrefix({
        "name": "Streaming",
        "multiplier": 62,
        "desc": "A-Set, you bet!",
        "elements": ["Electronic", "Makes-Noise"]
    }),
    "clapping": constructPrefix({
        "name": "Clapping",
        "multiplier": 61,
        "desc": "WOW! Good job buddy!",
        "elements": ["Makes-Noise"]
    }),
    "puppeted": constructPrefix({
        "name": "Puppeted",
        "multiplier": 60,
        "desc": "Master of Cubes is pulling your strings!",
        "elements": ["Haunted"]
    }),
    "musical": constructPrefix({
        "name": "Musical",
        "multiplier": 60,
        "desc": "I imagine this cube is listening to... something that's pretty groovy.",
        "elements": ["Makes-Noise"],
    }),
    "bushy": constructPrefix({
        "name": "Bushy",
        "multiplier": 59,
        "desc": "A man's stubble is a defining feature!",
        "elements": ["Organic"]
    }),
    "stunned": constructPrefix({
        "name": "Stunned",
        "multiplier": 58,
        "desc": "The cube is in its damage phase, make sure to make the most of it."
    }),
    "marked": constructPrefix({
        "name": "Marked",
        "multiplier": 57,
        "desc": "STILL HITTIN' HEADSHOTS!."
    }),
    "lovey": constructPrefix({
        "name": "Lovey",
        "multiplier": 57,
        "desc": "For the romantic cube"
    }),
    "trouvaille": constructPrefix({
        "name": "Trouvaille",
        "multiplier": 56,
        "desc": "The cube grows a funny hat.",
        "elements": ["Organic"]
    }),
    "googly": constructPrefix({
        "name": "Googly",
        "multiplier": 55,
        "desc": "It's eyes cannot agree... most of the time.",
        "elements": ["Plastic"],
        excludedFromCompletion: true
    }),
    "stabbed": constructPrefix({
        "name": "Stabbed",
        "multiplier": 54,
        "desc": "It hort so bad.",
        "elements": ["Magnetic"]
    }),
    "expressive": constructPrefix({
        "name": "Expressive",
        "multiplier": 54,
        "desc": "I don't use the internet often, but when I do...",
        "elements": ["Haunted"]
    }),
    "talkative": constructPrefix({
        "name": "Talkative",
        "multiplier": 54,
        "desc": "It better not be talkin' smack.",
        "elements": ["Makes-Noise"]
    }),
    "muscular": constructPrefix({
        "name": "Muscular",
        "multiplier": 53,
        "desc": "💪",
        "elements": ["Organic"]
    }),
    "leggendary": constructPrefix({
        "name": "Leggendary",
        "multiplier": 52,
        "desc": "🦵",
        elements: ["Organic"]
    }),
    "thinking": constructPrefix({
        "name": "Thinking",
        "multiplier": 51,
        "desc": "You know I was thinking... Why are there so many prefixes?",
    }),
    "boiled": constructPrefix({
        "name": "Boiled",
        "multiplier": 50,
        "desc": "Steamed cubes.",
        "elements": ["Hot", "Wet"]
    }),
    "typing": constructPrefix({
        "name": "Typing",
        "multiplier": 49,
        "desc": "It's probably writing Shakespeare like a monkey."
    }),
    "addicted": constructPrefix({
        "name": "Addicted",
        "multiplier": 49,
        "desc": "*sigh* just one more spin...",
        "elements": ["Poisonous"],
    }),
    "blind": constructPrefix({
        "name": "Blind",
        "multiplier": 48,
        "desc": "I can't see! I can't see!",
        "elements": ["Fabric"]
    }),
    "cucurbitaphilic": constructPrefix({
        "name": "Cucurbitaphilic",
        "multiplier": 47,
        "desc": "It means to like or enjoy melons."
    }),
    "radioactive": constructPrefix({
        "name": "Radioactive",
        "multiplier": 46,
        "desc": "I can't get a good picture of it."
    }),
    "read": constructPrefix({
        "name": "Read",
        "multiplier": 45,
        "desc": "A message from the stars!"
    }),
    "foggy": constructPrefix({
        "name": "Foggy",
        "multiplier": 44,
        "desc": "I reach out to the cube!",
        "elements": ["Wet", "Cold"]
    }),
    "fatherly": constructPrefix({
        "name": "Fatherly",
        "multiplier": 43,
        "desc": "Don't speak to me or my cube ever again.",
        "elements": ["Haunted"]
    }),
    "pugilistic": constructPrefix({
        "name": "Pugilistic",
        "multiplier": 42,
        "desc": "The greatest BOXer ever!",
        elements: ["Fabric"]
    }),
    "censored": constructPrefix({
        "name": "Censored",
        "multiplier": 41,
        "desc": "########## #### ## #########"
    }),
    "buttered": constructPrefix({
        "name": "Buttered",
        "multiplier": 40,
        "desc": "Cube wit da butta on em.",
        "elements": ["Edible"]
    }),
    "sick": constructPrefix({
        "name": "Sick",
        "multiplier": 40,
        "desc": "It protects itself from the blight that shall not be named.",
        "elements": ["Fabric"]
    }),
    "fearful": constructPrefix({
        "name": "Fearful",
        "multiplier": 39,
        "desc": "woah! hey now! wait just one second!",
        "elements": ["Wet"]
    }),
    "drunken": constructPrefix({
        "name": "Drunken",
        "multiplier": 38,
        "desc": "10% cube-alcohol content.",
        "elements": ["Poisonous"]
    }),
    "comfortable": constructPrefix({
        "name": "Comfortable",
        "multiplier": 37,
        "desc": "That pillow does look mighty comfortable!",
        "elements": ["Fabric"]
    }),
    "swag": constructPrefix({
        "name": "Swag",
        "multiplier": 36,
        "desc": "Down with the swag.",
        "elements": ["Ancient"]
    }),
    "stereoscopic": constructPrefix({
        "name": "Stereoscopic",
        "multiplier": 36,
        "desc": "Woah dude... I can almost see a 3-D cube!",
        "elements": ["Ancient"]
    }),
    "scientific": constructPrefix({
        "name": "Scientific",
        "multiplier": 35,
        "desc": "According to my research...",
        "elements": ["Glass"]
    }),
    "brainy": constructPrefix({
        "name": "Brainy",
        "multiplier": 34,
        "desc": "Smarter than you!",
        "elements": ["Organic"]
    }),
    "roped": constructPrefix({
        "name": "Roped",
        "multiplier": 33,
        "desc": "It been wrangled! Darn tootin!",
        "elements": ["Fabric"]
    }),
    "brilliant": constructPrefix({
        "name": "Brilliant",
        "multiplier": 32,
        "desc": "This cube is smarter than you! You know how I can tell? Because it doesn't play this game!",
        "elements": ["Light-Emitting"]
    }),
    "sparkly": constructPrefix({
        "name": "Sparkly",
        "multiplier": 31,
        "desc": "It's like being shiny, but only a little bit at a time."
    }),
    "adorable": constructPrefix({
        "name": "Adorable",
        "multiplier": 30,
        "desc": "It's too cute! #adorbs",
        "elements": ["Fabric"]
    }),
    "hurt": constructPrefix({
        "name": "Hurt",
        "multiplier": 29,
        "desc": "A bandaid for your booboo!",
        "elements": ["Slimy"]
    }),
    "ailurophilic": constructPrefix({
        "name": "Ailurophilic",
        "multiplier": 28,
        "desc": "meow :3",
        "elements": ["Organic"]
    }),
    "fake": constructPrefix({
        "name": "Fake",
        "multiplier": 27,
        "desc": "If you upload fake PNGs there is a special place in hell for you."
    }),
    "glinting": constructPrefix({
        "name": "Glinting",
        "multiplier": 26,
        "desc": "Disclaimer: May not actually be enchanted.",
        "elements": ["Shiny"]
    }),
    "conspicuous": constructPrefix({
        "name": "Conspicuous",
        "multiplier": 25,
        "desc": "You can tell from this piece of evidence that the suspect was... collecting cubes.",
        "elements": ["Plastic"]
    }),
    "voodoo": constructPrefix({
        "name": "Voodoo",
        "multiplier": 24,
        "desc": "All I feel is pins and needles!",
        "elements": ["Haunted"]
    }),
    "annoyed": constructPrefix({
        "name": "Annoyed",
        "multiplier": 23,
        "desc": "It's tired of dealing with YOU."
    }),
    "zammin": constructPrefix({
        "name": "Zammin'",
        "multiplier": 22,
        "desc": "SHE'S COLLECTED?!",
        "elements": ["Makes-Noise"]
    }),
    "rdming": constructPrefix({
        "name": "RDMing",
        "multiplier": 21,
        "desc": "ADMIN ADNIM! RDMRDMRDMRDMRDM",
        "elements": ["Light-Emitting"]
    }),
    "acquiescing": constructPrefix({
        "name": "Acquiescing",
        "multiplier": 20,
        "desc": "Fine... I'll do it..."
    }),
    "fuming": constructPrefix({
        "name": "Fuming",
        "multiplier": 19,
        "desc": "Its rage boils over.",
        "elements": ["Hot"],
    }),
    "dlc": constructPrefix({
        "name": "DLC",
        "multiplier": 18,
        "desc": "That will be $4.99"
    }),
    "feminine": constructPrefix({
        "name": "Feminine",
        "multiplier": 17,
        "desc": "The most stereotypically feminine cubes available! (But no makeup or clothes included.)"
    }),
    "masculine": constructPrefix({
        "name": "Masculine",
        "multiplier": 16,
        "desc": "The most stereotypically masculine cubes available! (But no facial hair or huge muscles included.)",
    }),
    "ornamentalized": constructPrefix({
        "name": "Ornamentalized",
        "multiplier": 15,
        "desc": "Let's hope you don't drop any of these...",
        "elements": ["Glass", "Shiny"]
    }),
    "raving": constructPrefix({
        "name": "Raving",
        "multiplier": 14,
        "desc": "It's a party up in here! Now we just need shitty EDM music and we're set!",
        "elements": ["Shiny", "Light-Emitting"]
    }),
    "expensive": constructPrefix({
        "name": "Expensive",
        "multiplier": 13,
        "desc": "Muh-muh-muh-moneyshot!"
    }),
    "hyaline": constructPrefix({
        "name": "Hyaline",
        "multiplier": 12,
        "desc": "It's like a shiny cube, but far superior to the 'Sparkly' prefix",
        "elements": ["Shiny"]
    }),
    "sussy": constructPrefix({
        "name": "Sussy",
        "multiplier": 11,
        "desc": "This server is CAC secured. Collecting will result in a permanent ban."
    }),
    "sleepy": constructPrefix({
        "name": "Sleepy",
        "multiplier": 10,
        "desc": "I would finish this description but I fell asl-"
    }),
    "disgusted": constructPrefix({
        "name": "Disgusted",
        "multiplier": 9,
        "desc": "ugh."
    }),
    "hypnotic": constructPrefix({
        "name": "Hypnotic",
        "multiplier": 8,
        "desc": "Look into my cubes..."
    }),
    "idiotic": constructPrefix({
        "name": "Idiotic",
        "multiplier": 7,
        "desc": "To the corner with you! Dunce!",
        "elements": ["Fabric"]
    }),
    "dirtied": constructPrefix({
        "name": "Dirty",
        "multiplier": 7,
        "desc": "Grody!"
    }),
    "nailed": constructPrefix({
        "name": "Nailed",
        "multiplier": 6,
        "desc": "Nailed it!",
        "elements": ["Magnetic"]
    }),
    "farmboy": constructPrefix({
        "name": "Farmboy",
        "multiplier": 0.9,
        "desc": "Cubes make do."
    }),
    "blurry": constructPrefix({
        "name": "Blurry",
        "multiplier": 0.8,
        "desc": "Everything is fuzzy."
    }),
    "obfuscating": constructPrefix({
        "name": "Obfuscating",
        "multiplier": 0.7,
        "desc": "A bit jumbled up."
    }),
    "inverted": constructPrefix({
        "name": "Inverted",
        "multiplier": 0.6,
        "desc": "Evil cube be like: \"don't collect me\""
    }),
    "broken": constructPrefix({
        "name": "Broken",
        "multiplier": 0.5,
        "desc": "ERROR 404: PREFIX NOT FOUND."
    }),
    "angery": constructPrefix({
        "name": "Angery",
        "multiplier": 0.4,
        "desc": "Not that finger! No! Bad cube!"
    }),
    "despairing": constructPrefix({
        "name": "Despairing",
        "multiplier": 0.3,
        "desc": "True despair is in the eye of the beholder!",
        "elements": ["Heavy"]
    }),
    "dookied": constructPrefix({
        "name": "Dookied",
        "multiplier": 0.2,
        "desc": "heheheh poopie",
        "elements": ["Poisonous"]
    }),
    "grinning": constructPrefix({
        "name": "Grinning",
        "multiplier": 0.1,
        "desc": "Look at that winning smile!"
    }),
    "worthless": constructPrefix({
        "name": "Worthless",
        "multiplier": 0,
        "desc": "It really does just make the cube worth 1 qubit."
    })
};
export const allPrefixes = Object.keys(prefixSchema);
export const prefixApplicationOrderObject = {
    // -------------- "Meta" or filter cases
    "fake": 1, // Turns the icon into a 'fake' PNG
    "dotted": 1, // Gives the cube a "dot matrix" effect
    "rippling": 1, // Adds a sine wave to the cube
    "musical": 1, // Adds an animated music sheet to the cube
    "misprinted": 1, // Gives the cube a "Misprinted" effect, (TCG misprint)
    "blurry": 1, // Blurs the cube
    "obfuscating": 1, // Scrambles the cube icon
    "skewed": 1, // Skews/shears the cube icon
    "inverted": 1, // inverts the cube icon
    "broken": 1, // 'breaks' the cube icon
    // -------------- Special cases
    "censored": 1, // Adds a censor bar to the cube
    "sussy": 1, // Adds an ESP (cheater) overlay to the cube
    // -------------- Prefixes That Add Environmental Stuffs (Or just super large props)
    "orbital": 1, // Adds 3 orbiting planets to the cube
    "endangered": 1, // Adds a sword on a string above the cube
    "radioactive": 1, // Adds a 'stylistic' radioactive effect to the cube
    // -------------- Prefixes That Add Particles That don't depend on the cube
    "leafy": 1, // Adds some raining leaves to the cube
    "snowy": 1, // Adds some raining snow to the cube
    "menacing": 1, // Adds a jjba-style menacing effect to the cube
    "bugged": 1, // Adds a Glitchy 'Missing Texture' Animation to the Cube
    "cursed": 1, // Adds a spinning Pentagram beneath the Cube
    "typing": 1, // Adds a speech bubble with a random sequence of letters to the cube
    // -------------- Prefixes That Add Particles That depend on the cube itself (are bound to parts of the cube)
    "flaming": 1, // Makes the cube on FREAKING FIRE
    "foggy": 1, // Adds fog to the cube
    "angry": 1, // Adds an animated anime-esque anger icon to the cube
    "disgusted": 1, // Adds an anime "disgust" emotion indicator to the cube
    "thinking": 1, // Adds a thought bubble with a question mark to the cube
    "talkative": 1, // Adds an animated yellow speech indicator to the cube
    "eudaemonic": 1, // Adds an animated happy face speech bubble to the cube
    "acquiescing": 1, // Adds a speech bubble with SIGH...
    "zammin": 1, // Adds a speech bubble with ZAMN
    "feminine": 1, // Adds a speech bubble with the "female" symbol inside
    "masculine": 1, // Adds a speech bubble with the "male" symbol inside
    "annoyed": 1, // Adds a fuzzball floating above the cube
    "brilliant": 1, // Adds a floating light bulb to the cube
    "scientific": 1, // Adds a sciency flask to the cube
    "dazed": 1, // Adds 'dazed' particles around the cube (I don't know what I was thinking when I created this prefix in 2020)
    "marked": 1, // Adds a bullseye to the cube's head
    "boiled": 1, // Adds steam coming off the cube
    "amorous": 1, // Adds hearts around the head of the cube
    "drunken": 1, // Adds a drunken stupor effect to the cube
    "stunned": 1, // Adds a cartoony "seeing stars" effect to the cube
    "fearful": 1, // Adds a fear 'sweat' animation to the cube
    "based": 1, // Adds Flashing Eyes to the Cube
    "expensive": 1, // Adds dollar signs to the eyes of the cube
    "lovey": 1, // Adds Heart Eyes to the Cube
    "googly": 1, // Adds Googly Eyes to the Cube
    "hypnotic": 1, // Adds 'hypnotized' eyes to the cube
    "expressive": 1, // Adds sassy eyebrows to the Cube
    "blushing": 1, // Adds blush to the cube
    "clapping": 1, // Adds the twitch clapping emote to the cube
    "insignificant": 1, // Adds ULTRAKILL Gabriel-esque halo and wings to the cube
    "holy": 1, // Adds an embellished animated decoration to the cube
    "unholy": 1, // Adds an embellished animated decoration to the cube
    "contaminated": 1, // Adds a dripping and outline effect to the cube
    "phosphorescent": 1, // Adds a glow and outline effect to the cube
    // -------------- Prefixes That Add Props (Accessories that aren't bound to the cube's parts)
    "summoning": 1, // Adds spinning cubes to the cube
    "swarming": 1, // Adds spinning cubes to the cube
    "runic": 1, // Adds nordic runes and an outline to the cube
    "mathematical": 1, // Adds LCD numbers and an outline to the cube
    "onomatopoeiacal": 1, // Adds Onomatopoeia to the cube
    "fatherly": 1, // Adds one or two smaller versions of the cube to the cube
    "saiyan": 1, // Makes the cube yell super loud whilst charging
    "roaring": 1, // Adds a "trailing" effect to the cube icon
    "electrified": 1, // Adds arcing lightning to the cube
    "ailurophilic": 1, // Adds a cat to the cube
    "cucurbitaphilic": 1, // Adds a random pumpkin to the cube
    "angery": 1, // Adds a middle finger to the cube
    "conspicuous": 1, // Adds crime scene markers to the cube
    "read": 1, // Adds a tarot reading to the cube (swords, wands, etc.)
    "leeking": 1, // Adds a leek to the cube
    "boxed": 1, // Adds a box around the cube
    "marbleized": 1, // Turns the cube to marble, adds a marble pedestal to the cube
    "constructive": 1, // Adds a blueprint and blueprint filter to the cube
    // -------------- Prefixes That Add Accessories (Props that are bound to the cube's parts)
    "puppeted": 1, // Adds a puppet crossbar to the Cube
    "sacred": 1, // Adds a Fancy Halo to the Cube
    "omniscient": 1, // Adds an eye of providence to the Cube
    "cuffed": 1, // Adds a handcuff around the Cube
    "sniping": 1, // Adds a sniper rifle to the Cube
    "marvelous": 1, // Adds a Hand holding the Cube
    "sparkly": 1, // Adds a sparkling effect to the cube
    "muscular": 1, // Adds disgusting muscly arms to the cube
    "leggendary": 1, // Adds disgusting built-ass legs to the cube
    "meleagris": 1, // Adds a turkey tail to the cube
    "collectible": 1, // Adds a display case to the cube
    "tumbling": 1, // Adds the evangelion folding chair to the cube
    "incarcerated": 1, // Adds a Jail around the Cube
    "pugilistic": 1, // Adds boxing gloves to the Cube
    "basking": 1, // Adds sand and an umbrella to the cube
    "demarcated": 1, // Adds demarcation/caution lines around the cube
    "bladed": 1, // Adds a sword to the cube
    "overcast": 1, // Adds clouds around the cube
    "despairing": 1, // Adds a giant metal sheet to the cube
    "emburdening": 1, // Adds a statue of Atlas holding up the cube
    "scrumptious": 1, // Puts the cube into a ramen bowl
    "royal": 1, // Adds a crown to the cube
    "kramped": 1, // Adds a pair of krampus horns to the cube
    "oriental": 1, // Adds an oriental-style roof to the cube
    "wranglin": 1, // Adds a cowboy hat to the cube
    "sophisticated": 1, // Adds a top hat to the cube
    "adorable": 1, // Adds a cute little bow to the cube
    "defeatable": 1, // Adds a pink wig to the cube
    "culinary": 1, // Adds a chef's toque to the cube
    "captain": 1, // Adds a Team Captain hat to the cube
    "dookied": 1, // Adds a turd to the cube
    "idiotic": 1, // Adds a dunce cap to the cube
    "fuming": 1, // Adds a set of steam coming out of the cube's "ears"
    "magical": 1, // Adds a wizard hat to the cube
    "streaming": 1, // Adds headphones to the cube
    "sweetened": 1, // Adds a cherry to the top of the cube
    "trouvaille": 1, // Adds a clover to the top of the cube
    "dovey": 1, // Adds a dove perched on the cube
    "batty": 1, // Adds a bat hanging from the cube NOTE: this is super gross. I don't like bats
    "jolly": 1, // Adds a Santa hat to the cube
    "sleepy": 1, // Adds a nightcap to the cube
    "partying": 1, // Adds a party hat to the cube
    "hardboiled": 1, // Adds a holmes-esque detective hat to the cube
    "smoked": 1, // Adds a GET SMOKED hat to the cube
    "conjoined": 1, // Adds a parasitic twin to the cube
    "blind": 1, // Adds a blindfold to the cube
    "freshened": 1, // Adds a car tree to the cube
    "outlawed": 1, // Adds a bandanna to the cube
    "serving": 1, // Adds a french-maid-style skirt and bonnet to the cube
    "angelic": 1, // Adds a halo to the cube
    "dandy": 1, // Adds dandy space hair to the cube
    "beboppin": 1, // Adds space mercenary hair to the cube
    "foolish": 1, // Adds a jester Hat to the Cube
    "cruel": 1, // Adds Cruelty Squad-Inspired Glasses to the Cube
    "stabbed": 1, // Adds a knife sticking out of the Cube
    "neko": 1, // Adds cat ears and tail to the Cube
    "tentacular": 1, // Adds moving tentacles to the Cube
    "chained": 1, // Adds moving chains to the Cube
    "adduced": 1, // Adds moving caution tape to the Cube
    "roped": 1, // Adds moving ropes to the Cube
    "awardwin": 1, // Adds a medal/ribbon to the Cube
    "buttered": 1, // Adds a small slab of butter to the Cube
    "addicted": 1, // Adds a cigarette to the Cube
    "farmboy": 1, // Adds a wheat stalk to the Cube
    "bushy": 1, // Adds a Random Beard to the Cube
    "grinning": 1, // Adds a mouth to the cube
    "emphasized": 1, // Adds a random amount of red arrows to the cube
    "ornamentalized": 1, // Adds a few christmas ornaments to the cube
    "brainy": 1, // Adds a gross brain to the cube
    "comfortable": 1, // Adds a pillow for the cube to sit on
    "palletized": 1, // Adds a pallet for the cube to sit on
    // -------------- Prefixes That Are Skin-Tight (idk how to phrase this)
    "voodoo": 1, // Adds pins and Xes to the cube
    "nailed": 1, // Puts nails into the edges of the cube
    "swag": 1, // Adds sunglasses to the cube
    "stereoscopic": 1, // Adds stereoscopic shades to the cube
    "sick": 1, // Adds a face mask to the cube
    "gruesome": 1, // Adds blood all over the cube
    "canoodled": 1, // Adds kiss-shaped lipstick to the cube in random spots
    "hurt": 1, // Adds bandaids to the cube in random spots
    "glinting": 1, // Adds a minecraft enchantment-esque glint animation
    "hyaline": 1, // Adds a sheen animation to the cube
    "frosty": 1, // Adds frost all over the cube
    "glitchy": 1, // Adds a Green Mask along with a particle rain inside that mask
    "rdming": 1, // Adds an animated gravity-gun outline to the cube
    "95in": 1, // Adds a Windows 95-esque application window to the cube
    "wanted": 1, // Adds a wanted poster to the cube
    "dirtied": 1, // Adds dirt/grime to the cube
    // -------------- Prefixes That only generate masks
    "phasing": 1, // Makes the cube partially transparent
    "evanescent": 1, // Makes the cube partially transparent
    // -------------- Prefixes that only apply filters
    "raving": 1, // Hue shifts the cube every frame to create a 'rainbow' effect
    "dlc": 1, // Turns the cube completely black
    "worthless": 1,
};
export const prefixApplicationOrder = Object.keys(prefixApplicationOrderObject);
export function sortPrefixesByApplicationOrder(prefixes, direction = 1) {
    return prefixes.sort((prefA, prefB) => {
        if (prefixApplicationOrder.indexOf(prefA) < prefixApplicationOrder.indexOf(prefB))
            return direction * -1;
        return direction;
    });
}
export function validatePrefixID(str) {
    return str in prefixSchema;
}
