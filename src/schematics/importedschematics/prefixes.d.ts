import type { CubeElementID } from "./elements";
export type PrefixDefinition = {
    name: string;
    multiplier: number;
    desc: string;
    universal: boolean;
    dropParties: boolean;
    dropPartyDateRange: string[];
    elements: CubeElementID[];
    validSlatedPrefix: boolean;
};
export declare const prefixSchema: {
    readonly bugged: {
        readonly name: "Bugged";
        readonly multiplier: 200;
        readonly desc: "DOES NOT COMPUTE. Can only be seen by obtaining a cube with a broken prefix.";
        readonly universal: false;
        readonly dropParties: false;
        readonly dropPartyDateRange: ["December 32", "December 33"];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly leafy: {
        readonly name: "Leafy";
        readonly multiplier: 128;
        readonly desc: "Not to be confused with leafy.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly cruel: {
        readonly name: "Cruel";
        readonly multiplier: 127;
        readonly desc: "I feel as if these cubes would do a good job fighting market manipulation.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Glass"];
        readonly validSlatedPrefix: true;
    };
    readonly based: {
        readonly name: "Based";
        readonly multiplier: 126;
        readonly desc: "*Earrape Sfx*";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly orbital: {
        readonly name: "Orbital";
        readonly multiplier: 125;
        readonly desc: "These cubes are so friggin annoying. They think they're the center of the universe! (Prefix Idea by Gary)";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy"];
        readonly validSlatedPrefix: true;
    };
    readonly sacred: {
        readonly name: "Sacred";
        readonly multiplier: 124;
        readonly desc: "The sacrificial cube";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Pure"];
        readonly validSlatedPrefix: true;
    };
    readonly flaming: {
        readonly name: "Flaming";
        readonly multiplier: 123;
        readonly desc: "I. AM. ON. FIRE!!!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly cursed: {
        readonly name: "Cursed";
        readonly multiplier: 123;
        readonly desc: "Purble fire... 2spooky...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly emburdening: {
        readonly name: "Emburdening";
        readonly multiplier: 122;
        readonly desc: "'Man this cube is super heavy' - the guy holding this cube up";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy", "Stony"];
        readonly validSlatedPrefix: true;
    };
    readonly cuffed: {
        readonly name: "Cuffed";
        readonly multiplier: 121;
        readonly desc: "You can almost see the town inside it!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Magnetic"];
        readonly validSlatedPrefix: true;
    };
    readonly endangered: {
        readonly name: "Endangered";
        readonly multiplier: 120;
        readonly desc: "This cube has damocles syndrome... whatever that is.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly marvelous: {
        readonly name: "Marvelous";
        readonly multiplier: 119;
        readonly desc: "Quieres?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["May 15", "May 30"];
        readonly elements: ["Heavy"];
        readonly validSlatedPrefix: true;
    };
    readonly phasing: {
        readonly name: "Phasing";
        readonly multiplier: 118;
        readonly desc: "It's... it's not shutting down...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light"];
        readonly validSlatedPrefix: true;
    };
    readonly tentacular: {
        readonly name: "Tentacular";
        readonly multiplier: 117;
        readonly desc: "cube34.xxx";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Slimy"];
        readonly validSlatedPrefix: true;
    };
    readonly dotted: {
        readonly name: "Dotted";
        readonly multiplier: 117;
        readonly desc: "Circles in your cubes? It's more likely than you think.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Pure"];
        readonly validSlatedPrefix: true;
    };
    readonly evanescent: {
        readonly name: "Evanescent";
        readonly multiplier: 116;
        readonly desc: "A hole?! In reality?!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light"];
        readonly validSlatedPrefix: true;
    };
    readonly royal: {
        readonly name: "Royal";
        readonly multiplier: 115;
        readonly desc: "Only the finest. Cubes of a pureblooded lineage may bear this prefix.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Shiny"];
        readonly validSlatedPrefix: true;
    };
    readonly captain: {
        readonly name: "Captain";
        readonly multiplier: 114;
        readonly desc: "Too bad it's not on fire, then it would be worth a lot more.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly oriental: {
        readonly name: "Oriental";
        readonly multiplier: 114;
        readonly desc: "It's raising the roof!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy"];
        readonly validSlatedPrefix: false;
    };
    readonly insignificant: {
        readonly name: "Insignificant";
        readonly multiplier: 113;
        readonly desc: "THIS IS NOT OVER!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly "95in": {
        readonly name: "95in'";
        readonly multiplier: 112;
        readonly desc: "[Error Sound]";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Painted"];
        readonly validSlatedPrefix: true;
    };
    readonly snowy: {
        readonly name: "Snowy";
        readonly multiplier: 111;
        readonly desc: "A cold wind blows away... (Prefix Idea by Sdoma)";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Cold"];
        readonly validSlatedPrefix: true;
    };
    readonly summoning: {
        readonly name: "Summoning";
        readonly multiplier: 110;
        readonly desc: "Lots of spinny cubes spinning around your cube (which might even be spinning itself!)";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly swarming: {
        readonly name: "Swarming";
        readonly multiplier: 109;
        readonly desc: "It's very rare to have cubes gather in packs around one larger, alpha cube.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Haunted"];
        readonly validSlatedPrefix: true;
    };
    readonly kramped: {
        readonly name: "Kramped";
        readonly multiplier: 108;
        readonly desc: "Coal. For every holiday.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["December 1", "December 30"];
        readonly elements: ["Ancient"];
        readonly validSlatedPrefix: true;
    };
    readonly dandy: {
        readonly name: "Dandy";
        readonly multiplier: 107;
        readonly desc: "I need money for boobies.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Pure"];
        readonly validSlatedPrefix: true;
    };
    readonly incarcerated: {
        readonly name: "Incarcerated";
        readonly multiplier: 106;
        readonly desc: "Imprisoned for being too collectable";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy", "Magnetic"];
        readonly validSlatedPrefix: true;
    };
    readonly runic: {
        readonly name: "Runic";
        readonly multiplier: 105;
        readonly desc: "A bunch of viking runes, honestly, I couldn't tell you what they mean.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Pure"];
        readonly validSlatedPrefix: true;
    };
    readonly rippling: {
        readonly name: "Rippling";
        readonly multiplier: 104;
        readonly desc: "A disturbance in time, mind you.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Electronic"];
        readonly validSlatedPrefix: true;
    };
    readonly emphasized: {
        readonly name: "Emphasized";
        readonly multiplier: 103;
        readonly desc: "Way to put the spotlight on it!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly chained: {
        readonly name: "Chained";
        readonly multiplier: 102;
        readonly desc: "It has some strings to hold it down! (Heavy and Metal strings)";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Magnetic", "Heavy"];
        readonly validSlatedPrefix: true;
    };
    readonly tumbling: {
        readonly name: "Tumbling";
        readonly multiplier: 102;
        readonly desc: "It all comes tumbling down, tumbling down...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly angelic: {
        readonly name: "Angelic";
        readonly multiplier: 101;
        readonly desc: "A halo of LIES! (Nobody knows if the halo is fake or not.)";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Pure", "Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly menacing: {
        readonly name: "Menacing";
        readonly multiplier: 100;
        readonly desc: "AYAYAYA!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly serving: {
        readonly name: "Serving";
        readonly multiplier: 99;
        readonly desc: "What can I do for you, collector-sama?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly holy: {
        readonly name: "Holy";
        readonly multiplier: 98;
        readonly desc: "*angelic voices*";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly unholy: {
        readonly name: "Unholy";
        readonly multiplier: 97;
        readonly desc: "*not so angelic voices*";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly contaminated: {
        readonly name: "Contaminated";
        readonly multiplier: 96;
        readonly desc: "*irradiated voices*";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly phosphorescent: {
        readonly name: "Phosphorescent";
        readonly multiplier: 95;
        readonly desc: "*glowing voices*";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly neko: {
        readonly name: "Neko";
        readonly multiplier: 94;
        readonly desc: "meow meow.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly mathematical: {
        readonly name: "Mathematical";
        readonly multiplier: 93;
        readonly desc: "All the numbers for this prefix are unique to this cube, isn't that cool?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Electronic"];
        readonly validSlatedPrefix: true;
    };
    readonly wanted: {
        readonly name: "Wanted";
        readonly multiplier: 92;
        readonly desc: "DEAD OR ALIVE.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly onomatopoeiacal: {
        readonly name: "Onomatopoeiacal";
        readonly multiplier: 91;
        readonly desc: "Try saying and SPELLING that 3 times fast!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly foolish: {
        readonly name: "Foolish";
        readonly multiplier: 91;
        readonly desc: "Thank you, Dangly Bells.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["April 1", "April 7"];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly smoked: {
        readonly name: "Smoked";
        readonly multiplier: 90;
        readonly desc: "Get Smoked, kid.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly basking: {
        readonly name: "Basking";
        readonly multiplier: 89;
        readonly desc: "Sunbather hexahedronal extraordinaire";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["June 1", "September 30"];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly omniscient: {
        readonly name: "Omniscient";
        readonly multiplier: 88;
        readonly desc: "The all-knowing prefix";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Haunted"];
        readonly validSlatedPrefix: true;
    };
    readonly sniping: {
        readonly name: "Sniping";
        readonly multiplier: 87;
        readonly desc: "360 ooga booga booga!!!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly beboppin: {
        readonly name: "Beboppin'";
        readonly multiplier: 86;
        readonly desc: "In the rain...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly hardboiled: {
        readonly name: "Hard-Boiled";
        readonly multiplier: 85;
        readonly desc: "Elementary, my dear hexahedron!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly angry: {
        readonly name: "Angry";
        readonly multiplier: 84;
        readonly desc: "Very angery cubes can have this prefix!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly gruesome: {
        readonly name: "Gruesome";
        readonly multiplier: 83;
        readonly desc: "Man who thought pink blood was a good idea!?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Wet"];
        readonly validSlatedPrefix: true;
    };
    readonly outlawed: {
        readonly name: "Outlawed";
        readonly multiplier: 82;
        readonly desc: "The fastest cube in the west!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly wranglin: {
        readonly name: "Wranglin'";
        readonly multiplier: 81;
        readonly desc: "18 naked cubes";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly canoodled: {
        readonly name: "Canoodled";
        readonly multiplier: 80;
        readonly desc: "mwah";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Painted"];
        readonly validSlatedPrefix: true;
    };
    readonly saiyan: {
        readonly name: "Saiyan";
        readonly multiplier: 80;
        readonly desc: "[Joke about the number 9000 here]";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly amorous: {
        readonly name: "Amorous";
        readonly multiplier: 79;
        readonly desc: "Trying to get all lovey-dovey with your cubes? Weirdo.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly collectible: {
        readonly name: "Collectible";
        readonly multiplier: 79;
        readonly desc: "Cube Collectors search for Collectible Cubes to fill out their Cube Collection.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly dazed: {
        readonly name: "Dazed";
        readonly multiplier: 78;
        readonly desc: "Got punched in the face? You might be dazed! Try it! It increases your value!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly adduced: {
        readonly name: "Adduced";
        readonly multiplier: 77;
        readonly desc: "Move along people, nothing to see here.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Plastic"];
        readonly validSlatedPrefix: true;
    };
    readonly meleagris: {
        readonly name: "Meleagris";
        readonly multiplier: 77;
        readonly desc: "You can faintly hear 'Gobble Gobble'.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic", "Makes-Noise"];
        readonly validSlatedPrefix: false;
    };
    readonly glitchy: {
        readonly name: "Glitchy";
        readonly multiplier: 76;
        readonly desc: "Beep Bop Boop Bop Babop --- A Dooh Dat Da Dah!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Electronic"];
        readonly validSlatedPrefix: true;
    };
    readonly frosty: {
        readonly name: "Frosty";
        readonly multiplier: 75;
        readonly desc: "Stay frosty. Well, I mean technically it's rime...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Cold", "Cold"];
        readonly validSlatedPrefix: true;
    };
    readonly electrified: {
        readonly name: "Electrified";
        readonly multiplier: 74;
        readonly desc: "Static charge, I think?";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly overcast: {
        readonly name: "Overcast";
        readonly multiplier: 73;
        readonly desc: "Days like this are great...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Wet"];
        readonly validSlatedPrefix: true;
    };
    readonly bladed: {
        readonly name: "Bladed";
        readonly multiplier: 72;
        readonly desc: "Riddled and plagued by dreams of a terrible past and even worse future.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy"];
        readonly validSlatedPrefix: true;
    };
    readonly jolly: {
        readonly name: "Jolly";
        readonly multiplier: 71;
        readonly desc: "Ho Ho Ho! Merry Cubesmas!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["December 1", "December 30"];
        readonly elements: ["Fabric", "Cold"];
        readonly validSlatedPrefix: true;
    };
    readonly partying: {
        readonly name: "Partying";
        readonly multiplier: 70;
        readonly desc: "Party time, let's GO!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["May 15", "May 30"];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly sophisticated: {
        readonly name: "Sophisticated";
        readonly multiplier: 69;
        readonly desc: "Hmm yes my good sir. A glass of your finest.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly culinary: {
        readonly name: "Culinary";
        readonly multiplier: 68;
        readonly desc: "This Cube! IT'S RAW!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Edible"];
        readonly validSlatedPrefix: true;
    };
    readonly eudaemonic: {
        readonly name: "Eudaemonic";
        readonly multiplier: 67;
        readonly desc: "The cube is giving you the impression of it being friendly. DON'T BE FOOLED. CUBES ARE NOT TO BE TRUSTED.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly magical: {
        readonly name: "Magical";
        readonly multiplier: 66;
        readonly desc: "Evil Cube Wizard Gang. We love casting spells.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly blushing: {
        readonly name: "Blushing";
        readonly multiplier: 65;
        readonly desc: ">~< I'm so vewwy sowwy I don't add that much vawyou ;-; h-how can I make it up to you, baka?";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly sweetened: {
        readonly name: "Sweetened";
        readonly multiplier: 64;
        readonly desc: "Pretty please with a cube on top?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Poisonous"];
        readonly validSlatedPrefix: true;
    };
    readonly dovey: {
        readonly name: "Dovey";
        readonly multiplier: 63;
        readonly desc: "They're in love!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["February 1", "February 28"];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly batty: {
        readonly name: "Batty";
        readonly multiplier: 62;
        readonly desc: "They're a little spooky.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["October 1", "November 5"];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly streaming: {
        readonly name: "Streaming";
        readonly multiplier: 62;
        readonly desc: "A-Set, you bet!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Electronic"];
        readonly validSlatedPrefix: true;
    };
    readonly clapping: {
        readonly name: "Clapping";
        readonly multiplier: 61;
        readonly desc: "WOW! Good job buddy!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly musical: {
        readonly name: "Musical";
        readonly multiplier: 60;
        readonly desc: "I imagine this cube is listening to... something that's pretty groovy.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly bushy: {
        readonly name: "Bushy";
        readonly multiplier: 59;
        readonly desc: "A man's stubble is a defining feature!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly stunned: {
        readonly name: "Stunned";
        readonly multiplier: 58;
        readonly desc: "Tazed the cube. Stunned it. More Expensive? YES.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly lovey: {
        readonly name: "Lovey";
        readonly multiplier: 57;
        readonly desc: "For the romantic cube";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["February 1", "February 28"];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly trouvaille: {
        readonly name: "Trouvaille";
        readonly multiplier: 56;
        readonly desc: "Cubes that are exceptionally lucky get this prefix. Think of them as good luck charms, and the placebo effect will do the rest.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly googly: {
        readonly name: "Googly";
        readonly multiplier: 55;
        readonly desc: "It's eyes cannot agree... most of the time.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Plastic"];
        readonly validSlatedPrefix: true;
    };
    readonly expressive: {
        readonly name: "Expressive";
        readonly multiplier: 54;
        readonly desc: "I don't use the internet often, but when I do...";
        readonly universal: true;
        readonly dropParties: false;
        readonly dropPartyDateRange: [];
        readonly elements: ["Haunted"];
        readonly validSlatedPrefix: true;
    };
    readonly talkative: {
        readonly name: "Talkative";
        readonly multiplier: 54;
        readonly desc: "If only we could understand the cube language. Wouldn't that be somethin!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly muscular: {
        readonly name: "Muscular";
        readonly multiplier: 53;
        readonly desc: "💪";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["June 1", "September 30"];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly leggendary: {
        readonly name: "Leggendary";
        readonly multiplier: 52;
        readonly desc: "🦵";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["June 1", "September 30"];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly thinking: {
        readonly name: "Thinking";
        readonly multiplier: 51;
        readonly desc: "You know I was thinking... why are there so many prefixes? There's so many lol";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly boiled: {
        readonly name: "Boiled";
        readonly multiplier: 50;
        readonly desc: "Out of the frying pan, into the fire! Or, however you relate that to being boiled...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot", "Wet"];
        readonly validSlatedPrefix: true;
    };
    readonly typing: {
        readonly name: "Typing";
        readonly multiplier: 49;
        readonly desc: "It's probably typing Shakespeare's Hamlet by hitting random keys. Kinda like a monkey.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly blind: {
        readonly name: "Blind";
        readonly multiplier: 48;
        readonly desc: "I can't see! I can't see!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly cucurbitaphilic: {
        readonly name: "Cucurbitaphilic";
        readonly multiplier: 47;
        readonly desc: "Funny word for liking melons don't you think?";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["October 1", "November 5"];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly radioactive: {
        readonly name: "Radioactive";
        readonly multiplier: 46;
        readonly desc: "Funny elephant's foot cube. (Original Prefix by Axleon)";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly read: {
        readonly name: "Read";
        readonly multiplier: 45;
        readonly desc: "A message from the stars!";
        readonly universal: false;
        readonly dropParties: false;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly foggy: {
        readonly name: "Foggy";
        readonly multiplier: 44;
        readonly desc: "*suspensful music plays* (Original Prefix by Axleon)";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Wet", "Cold"];
        readonly validSlatedPrefix: true;
    };
    readonly fatherly: {
        readonly name: "Fatherly";
        readonly multiplier: 43;
        readonly desc: "This cube has children! That's nuts! How do they reproduce... 0.0";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Haunted"];
        readonly validSlatedPrefix: true;
    };
    readonly pugilistic: {
        readonly name: "Pugilistic";
        readonly multiplier: 42;
        readonly desc: "Cubey Balboa, the greatest BOXer ever!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly censored: {
        readonly name: "Censored";
        readonly multiplier: 41;
        readonly desc: "[CENSORED]";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly sick: {
        readonly name: "Sick";
        readonly multiplier: 40;
        readonly desc: "Protection from the blight that shall not be named.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly fearful: {
        readonly name: "Fearful";
        readonly multiplier: 39;
        readonly desc: "woah! hey now! wait just one second!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Wet"];
        readonly validSlatedPrefix: true;
    };
    readonly drunken: {
        readonly name: "Drunken";
        readonly multiplier: 38;
        readonly desc: "Misato Cube. Bottom Text";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Poisonous"];
        readonly validSlatedPrefix: true;
    };
    readonly comfortable: {
        readonly name: "Comfortable";
        readonly multiplier: 37;
        readonly desc: "That pillow does look mighty comfortable!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly swag: {
        readonly name: "Swag";
        readonly multiplier: 36;
        readonly desc: "Mad? Watch this swag.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Ancient"];
        readonly validSlatedPrefix: true;
    };
    readonly stereoscopic: {
        readonly name: "Stereoscopic";
        readonly multiplier: 36;
        readonly desc: "A whole new meaning of 'double vision'.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Ancient"];
        readonly validSlatedPrefix: true;
    };
    readonly scientific: {
        readonly name: "Scientific";
        readonly multiplier: 35;
        readonly desc: "According to my research...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Glass"];
        readonly validSlatedPrefix: true;
    };
    readonly brainy: {
        readonly name: "Brainy";
        readonly multiplier: 34;
        readonly desc: "Smarter than you!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly roped: {
        readonly name: "Roped";
        readonly multiplier: 33;
        readonly desc: "Oh.. ok buddy.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly brilliant: {
        readonly name: "Brilliant";
        readonly multiplier: 32;
        readonly desc: "This cube is smarter than you! You know how I can tell? Because it doesn't play this game!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly sparkly: {
        readonly name: "Sparkly";
        readonly multiplier: 31;
        readonly desc: "It's like being shiny, but like... not?";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly adorable: {
        readonly name: "Adorable";
        readonly multiplier: 30;
        readonly desc: "It's too cute!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly hurt: {
        readonly name: "Hurt";
        readonly multiplier: 29;
        readonly desc: "A bandaid for your booboo!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Slimy"];
        readonly validSlatedPrefix: true;
    };
    readonly ailurophilic: {
        readonly name: "Ailurophilic";
        readonly multiplier: 28;
        readonly desc: "This cube likes cats so much, it brings one with it wherever it goes!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Organic"];
        readonly validSlatedPrefix: true;
    };
    readonly fake: {
        readonly name: "Fake";
        readonly multiplier: 27;
        readonly desc: "If you create fake PNGs there is a special place in hell for you.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly glinting: {
        readonly name: "Glinting";
        readonly multiplier: 26;
        readonly desc: "Ro ro! Fight da powah!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Shiny"];
        readonly validSlatedPrefix: true;
    };
    readonly conspicuous: {
        readonly name: "Conspicuous";
        readonly multiplier: 25;
        readonly desc: "You can tell from this piece of evidence that the suspect was... collecting cubes.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Plastic"];
        readonly validSlatedPrefix: true;
    };
    readonly voodoo: {
        readonly name: "Voodoo";
        readonly multiplier: 24;
        readonly desc: "All I feel is pins and needles!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Haunted"];
        readonly validSlatedPrefix: true;
    };
    readonly annoyed: {
        readonly name: "Annoyed";
        readonly multiplier: 23;
        readonly desc: "I think cubes that have this prefix are tired of dealing with your bullshit, and to be honest, I am too.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly zammin: {
        readonly name: "Zammin'";
        readonly multiplier: 22;
        readonly desc: "ZAMN!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Makes-Noise"];
        readonly validSlatedPrefix: true;
    };
    readonly rdming: {
        readonly name: "RDMing";
        readonly multiplier: 21;
        readonly desc: "ADMIN ADNIM! RDMRDMRDMRDMRDM";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly acquiescing: {
        readonly name: "Acquiescing";
        readonly multiplier: 20;
        readonly desc: "Fine... I'll do it...";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly fuming: {
        readonly name: "Fuming";
        readonly multiplier: 19;
        readonly desc: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Hot"];
        readonly validSlatedPrefix: true;
    };
    readonly dlc: {
        readonly name: "DLC";
        readonly multiplier: 18;
        readonly desc: "That will be $4.99";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly feminine: {
        readonly name: "Feminine";
        readonly multiplier: 17;
        readonly desc: "The most feminine cubes available!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly masculine: {
        readonly name: "Masculine";
        readonly multiplier: 16;
        readonly desc: "The manliest cubes available! (Warning: Facial hair and huge muscles not included.)";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly ornamentalized: {
        readonly name: "Ornamentalized";
        readonly multiplier: 15;
        readonly desc: "Let's hope you don't drop any of these...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: ["December 1", "December 30"];
        readonly elements: ["Glass", "Shiny"];
        readonly validSlatedPrefix: true;
    };
    readonly raving: {
        readonly name: "Raving";
        readonly multiplier: 14;
        readonly desc: "It's a party up in here! Now we just need shitty EDM music and we're set!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Shiny", "Light-Emitting"];
        readonly validSlatedPrefix: true;
    };
    readonly expensive: {
        readonly name: "Expensive";
        readonly multiplier: 13;
        readonly desc: "Muh-muh-muh-moneyshot!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly hyaline: {
        readonly name: "Hyaline";
        readonly multiplier: 12;
        readonly desc: "It's like a shiny cube, but far superior to the 'Sparkly' prefix";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Shiny"];
        readonly validSlatedPrefix: true;
    };
    readonly sussy: {
        readonly name: "Sussy";
        readonly multiplier: 11;
        readonly desc: "This server is CAC secured. Collecting will result in a permanent ban.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly sleepy: {
        readonly name: "Sleepy";
        readonly multiplier: 10;
        readonly desc: "I would finish this description but I fell asl";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly disgusted: {
        readonly name: "Disgusted";
        readonly multiplier: 9;
        readonly desc: "ugh.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly hypnotic: {
        readonly name: "Hypnotic";
        readonly multiplier: 8;
        readonly desc: "Look into my cubes...";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: true;
    };
    readonly idiotic: {
        readonly name: "Idiotic";
        readonly multiplier: 7;
        readonly desc: "To the corner with you! Dunce!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Fabric"];
        readonly validSlatedPrefix: true;
    };
    readonly nailed: {
        readonly name: "Nailed";
        readonly multiplier: 6;
        readonly desc: "Nailed it!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Magnetic"];
        readonly validSlatedPrefix: true;
    };
    readonly farmboy: {
        readonly name: "Farmboy";
        readonly multiplier: 0.9;
        readonly desc: "Country boys make do.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly blurry: {
        readonly name: "Blurry";
        readonly multiplier: 0.8;
        readonly desc: "Everything is fuzzy.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly obfuscating: {
        readonly name: "Obfuscating";
        readonly multiplier: 0.7;
        readonly desc: "Have fun telling what cube this is by shape alone!";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly inverted: {
        readonly name: "Inverted";
        readonly multiplier: 0.6;
        readonly desc: "Your cube has been... Inverted!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly broken: {
        readonly name: "Broken";
        readonly multiplier: 0.5;
        readonly desc: "ERROR 404: PREFIX NOT FOUND.";
        readonly universal: true;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly angery: {
        readonly name: "Angery";
        readonly multiplier: 0.4;
        readonly desc: "Not that finger! No!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly despairing: {
        readonly name: "Despairing";
        readonly multiplier: 0.3;
        readonly desc: "True despair is in the eye of the beholder!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Heavy"];
        readonly validSlatedPrefix: false;
    };
    readonly Dookied: {
        readonly name: "dookied";
        readonly multiplier: 0.2;
        readonly desc: "heheheh poopie";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: ["Poisonous"];
        readonly validSlatedPrefix: false;
    };
    readonly grinning: {
        readonly name: "Grinning";
        readonly multiplier: 0.1;
        readonly desc: "What an interesting set of teeth!";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
    readonly worthless: {
        readonly name: "Worthless";
        readonly multiplier: 0;
        readonly desc: "It really does just make the cube worth 1 qubit.";
        readonly universal: false;
        readonly dropParties: true;
        readonly dropPartyDateRange: [];
        readonly elements: [];
        readonly validSlatedPrefix: false;
    };
};
export type PrefixID = keyof typeof prefixSchema;
export declare const allPrefixes: PrefixID[];
//# sourceMappingURL=prefixes.d.ts.map