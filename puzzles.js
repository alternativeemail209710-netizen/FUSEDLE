/**
 * FUSEDLE puzzle library - ONE fixed build: 8 INDEPENDENT GROUPS per round (no chains of groups).
 *
 * Every round has exactly 8 groups. Each group is its own little fusion tree:
 *
 *   2-level fusion group = 7 starting tiles, 2 fusions
 *       D('Top', 'Sub', 'w1,w2,w3,w4', 'w5,w6,w7')
 *       Level 1:  w1+w2+w3+w4        -> new tile "Sub"
 *       Level 2:  "Sub"+w5+w6+w7     -> group "Top" is done
 *
 *   3-level fusion group = 10 starting tiles, 3 fusions
 *       T('Top', 'Mid', 'Sub', 'w1,w2,w3,w4', 'w5,w6,w7', 'w8,w9,w10')
 *       Level 1:  w1..w4             -> new tile "Sub"
 *       Level 2:  "Sub"+w5+w6+w7     -> new tile "Mid"
 *       Level 3:  "Mid"+w8+w9+w10    -> group "Top" is done
 *
 * HOW TO WRITE A GOOD GROUP: every fusion is a plain "is a kind of / is part of" link. All 4 pieces must clearly belong to the
 * new tile's name, using everyday words anyone knows (no obscure terms), and no piece may also fit another group in the same pack.
 * DIFFICULTY (chosen by the host in Settings > Game rules), always 8 groups per round:
 *   Level 1 Easy     = 8 groups, no fusion level (4 words each, one fusion)         32 tiles
 *   Level 2 Moderate = 8 groups, 1 fusion level (a fused tile, then the group)    56 tiles
 *   Level 3 Hard     = 4 groups with 1 + 4 groups with 2 fusion levels (original)  68 tiles (BOARD near the bottom of this file)
 *   Level 4 Very Hard      = 8 groups, 3 fusion levels (4 fusions each, 13 tiles per group)       104 tiles
 *   Level 5 Extreme        = 8 groups, 4 fusion levels (5 fusions each, 16 tiles per group)       128 tiles
 *   Level 6 Extremely Hard = 8 groups, 5 fusion levels (6 fusions each, 19 tiles per group)       152 tiles
 *   Level 7 Insane         = 8 groups, 6 fusion levels (7 fusions each, 22 tiles per group)       176 tiles
 * Easy and Moderate pieces are cut out of the groups written below, so nothing extra has to be written.
 * Levels 4 to 7 use the 7-fusion ladders in the ./packs-deep folder (see 01-deep-chains.js); each level is cut from the bottom of a ladder.
 * Words are separated by commas inside one string, so a word may contain spaces ("Ice Cream").
 * Keep every word and every group name UNIQUE across this whole file (the start-up check tells you if not).
 */
'use strict';

const N = (name, ...kids) => ({ name, kids });
const W = (s) => s.split(',').map((x) => x.trim());
const T = (top, mid, sub, subWords, midWords, topWords) => N(top, N(mid, N(sub, ...W(subWords)), ...W(midWords)), ...W(topWords));
const D = (top, sub, subWords, topWords) => N(top, N(sub, ...W(subWords)), ...W(topWords));

const PACKS = [
  // RULE FOR EVERY FUSION: all 4 pieces are clearly kinds of / parts of / examples of the new tile's name,
  // using everyday words only. The new tile then becomes one of the 4 pieces of the next fusion.
  { title: 'Getting Around',
    three: [
      T('Transport', 'Land Transport', 'Car', 'Ford,Toyota,Honda,BMW', 'Bus,Tram,Bicycle', 'Boat,Plane,Rocket'),
      T('Water Transport', 'Watercraft', 'Ship', 'Ferry,Tanker,Liner,Trawler', 'Canoe,Kayak,Yacht', 'Submarine,Hovercraft,Speedboat'),
      T('Air Travel', 'Aircraft', 'Airliner', 'Boeing,Airbus,Concorde,Jumbo Jet', 'Helicopter,Glider,Airship', 'Airline,Airport,Pilot'),
      T('Rail Travel', 'Railway', 'Train', 'Steam,Bullet,Freight,Express', 'Track,Station,Signal', 'Timetable,Commuter,Ticket Inspector'),
      T('Driving Essentials', 'Car Parts', 'Car Body', 'Bonnet,Boot,Bumper,Windscreen', 'Engine,Gearbox,Radiator', 'Steering Wheel,Seatbelt,Dashboard'),
      T('Bike Parts', 'Moving Parts', 'Wheel', 'Spoke,Rim,Hub,Tyre', 'Pedal,Chain,Gears', 'Handlebars,Saddle,Brakes'),
      T('Road Layout', 'Road Furniture', 'Road Sign', 'Stop,Give Way,Speed Limit,No Entry', 'Traffic Light,Zebra Crossing,Speed Bump', 'Junction,Roundabout,Pavement'),
      T('Heavy Machinery', 'Work Vehicles', 'Truck', 'Pickup,Dump Truck,Fire Engine,Tow Truck', 'Tractor,Bulldozer,Digger', 'Forklift,Steamroller,Cement Mixer'),
    ],
    two: [
      D('Public Transport', 'City Rail', 'Subway,Underground,Metro,Tube', 'Taxi,Cable Car,Gondola'),
      D('Space Travel', 'Spacecraft', 'Shuttle,Capsule,Probe,Satellite', 'Astronaut,Launchpad,Orbit'),
      D('Old-Fashioned Travel', 'Horse-Drawn', 'Stagecoach,Chariot,Carriage,Wagon', 'Rickshaw,Penny-farthing,Steamboat'),
      D('Going on Holiday', 'Luggage', 'Suitcase,Backpack,Holdall,Briefcase', 'Passport,Boarding Pass,Visa'),
    ] },

  { title: 'Animal Kingdom',
    three: [
      T('Living Things', 'Animals', 'Mammals', 'Whale,Bat,Camel,Otter', 'Bird,Fish,Insect', 'Plant,Fungus,Bacteria'),
      T('Pets', 'Pet Mammals', 'Dog', 'Poodle,Beagle,Labrador,Husky', 'Cat,Rabbit,Hamster', 'Goldfish,Parrot,Canary'),
      T('On the Farm', 'Farm Animals', 'Poultry', 'Chicken,Duck,Turkey,Goose', 'Sheep,Goat,Cow', 'Barn,Scarecrow,Haystack'),
      T('Safari', 'Safari Animals', 'Big Cat', 'Lion,Tiger,Leopard,Cheetah', 'Elephant,Giraffe,Hippo', 'Jeep,Binoculars,Tent'),
      T('Feathered Friends', 'Flying Birds', 'Raptor', 'Eagle,Falcon,Hawk,Owl', 'Robin,Sparrow,Swallow', 'Penguin,Ostrich,Kiwi'),
      T('Ocean Life', 'Sea Creatures', 'Shellfish', 'Crab,Lobster,Prawn,Oyster', 'Jellyfish,Starfish,Seahorse', 'Coral,Seaweed,Plankton'),
      T('Reptiles and Amphibians', 'Reptile', 'Lizard', 'Gecko,Iguana,Chameleon,Komodo Dragon', 'Snake,Crocodile,Turtle', 'Frog,Toad,Newt'),
      T('Creepy Crawlies', 'Bugs', 'Beetle', 'Ladybird,Stag Beetle,Dung Beetle,Firefly', 'Ant,Bee,Butterfly', 'Spider,Scorpion,Centipede'),
    ],
    two: [
      D('Prehistoric Life', 'Dinosaur', 'T-Rex,Triceratops,Stegosaurus,Velociraptor', 'Mammoth,Sabre-toothed Cat,Pterodactyl'),
      D('Arctic Life', 'Polar Animals', 'Polar Bear,Walrus,Seal,Arctic Fox', 'Iceberg,Igloo,Glacier'),
      D('Woodland Animals', 'Rodent', 'Mouse,Rat,Squirrel,Beaver', 'Hedgehog,Badger,Deer'),
      D('Australian Wildlife', 'Marsupial', 'Kangaroo,Koala,Wombat,Wallaby', 'Emu,Platypus,Dingo'),
    ] },

  { title: 'Food & Drink',
    three: [
      T('Food Groups', 'Fruit', 'Citrus', 'Orange,Lemon,Lime,Grapefruit', 'Banana,Grape,Strawberry', 'Vegetables,Grains,Protein'),
      T('Drinks', 'Hot Drinks', 'Coffee', 'Latte,Espresso,Mocha,Cappuccino', 'Tea,Hot Chocolate,Mulled Wine', 'Juice,Soda,Lemonade'),
      T('Supermarket Aisles', 'Dairy Foods', 'Cheese', 'Cheddar,Brie,Gouda,Feta', 'Milk,Butter,Yoghurt', 'Frozen Food,Tinned Food,Fresh Produce'),
      T('World Cuisine', 'Italian', 'Pasta', 'Penne,Fusilli,Spaghetti,Ravioli', 'Pizza,Risotto,Gelato', 'Japanese,Mexican,Indian'),
      T('Sweet Treats', 'Baked Goods', 'Cake', 'Sponge,Cheesecake,Cupcake,Brownie', 'Pie,Muffin,Scone', 'Ice Cream,Lollipop,Jelly'),
      T('Pantry', 'Seasonings', 'Spices', 'Cumin,Paprika,Turmeric,Cinnamon', 'Basil,Oregano,Thyme', 'Flour,Sugar,Rice'),
      T('Snack Time', 'Salty Snacks', 'Nuts', 'Almond,Cashew,Walnut,Peanut', 'Crisps,Popcorn,Pretzel', 'Biscuit,Flapjack,Granola Bar'),
      T('Breakfast', 'Cooked Breakfast', 'Egg Dishes', 'Omelette,Scrambled Eggs,Fried Egg,Poached Egg', 'Bacon,Sausage,Beans', 'Cereal,Porridge,Pancakes'),
    ],
    two: [
      D('Sauces and Dips', 'Condiments', 'Ketchup,Mustard,Mayonnaise,Brown Sauce', 'Gravy,Guacamole,Hummus'),
      D('Kitchen Skills', 'Cooking Methods', 'Bake,Grill,Roast,Simmer', 'Chop,Whisk,Knead'),
      D('Tableware', 'Cutlery', 'Knife,Fork,Spoon,Chopsticks', 'Plate,Bowl,Mug'),
      D('Takeaway', 'Fast Food', 'Burger,Hot Dog,Nuggets,Fries', 'Kebab,Noodles,Fish and Chips'),
    ] },

  { title: 'Music Room',
    three: [
      T('Orchestra', 'Wind Instruments', 'Brass', 'Trumpet,Trombone,Tuba,French Horn', 'Flute,Clarinet,Oboe', 'Strings,Percussion,Conductor'),
      T('Music Genres', 'Popular Genres', 'Rock', 'Punk,Grunge,Metal,Indie', 'Pop,Hip-hop,Reggae', 'Jazz,Blues,Country'),
      T('Dance', 'Ballroom', 'Latin Dance', 'Salsa,Rumba,Samba,Cha-cha', 'Waltz,Foxtrot,Quickstep', 'Ballet,Tap,Breakdance'),
      T('Gig Night', 'The Band', 'Band Members', 'Singer,Guitarist,Drummer,Bassist', 'Manager,Roadie,Fans', 'Stage,Encore,Setlist'),
      T('Musical Instruments', 'Keyboard Instruments', 'Piano', 'Grand Piano,Upright Piano,Baby Grand,Digital Piano', 'Organ,Synthesizer,Accordion', 'Guitar,Violin,Drums'),
      T('Music Releases', 'Song', 'Song Parts', 'Verse,Chorus,Hook,Intro', 'Lyrics,Melody,Harmony', 'Album,Single,Playlist'),
      T('Vocal Music', 'Singing', 'Voice Types', 'Soprano,Alto,Tenor,Baritone', 'Choir,Solo,Duet', 'Opera,Lullaby,Anthem'),
      T('Music Tech', 'Ways to Listen', 'Physical Media', 'Vinyl,Cassette,CD,Mixtape', 'Radio,Streaming,Podcast', 'Headphones,Speaker,Amplifier'),
    ],
    two: [
      D('Classical Music', 'Composers', 'Mozart,Beethoven,Bach,Chopin', 'Symphony,Concerto,Sonata'),
      D('Folk Music', 'Folk Instruments', 'Banjo,Fiddle,Harmonica,Ukulele', 'Campfire,Ballad,Barn Dance'),
      D('Music Lesson', 'Classroom Instruments', 'Recorder,Xylophone,Tambourine,Triangle', 'Teacher,Sheet Music,Metronome'),
      D('Reading Music', 'Music Symbols', 'Clef,Stave,Sharp,Flat', 'Note,Rest,Bar'),
    ] },

  { title: 'Game On',
    three: [
      T('Sports', 'Ball Games', 'Racket Sports', 'Tennis,Squash,Badminton,Table Tennis', 'Cricket,Rugby,Basketball', 'Swimming,Cycling,Gymnastics'),
      T('Olympic Games', 'Athletics', 'Track Events', 'Sprint,Hurdles,Marathon,Relay', 'Javelin,Discus,High Jump', 'Rowing,Archery,Diving'),
      T('Water Sports', 'Sea Sports', 'Surf Sports', 'Surfing,Bodyboarding,Windsurfing,Kitesurfing', 'Sailing,Snorkelling,Paddleboarding', 'Water Polo,Canoeing,Waterskiing'),
      T('Indoor Games', 'Tabletop Games', 'Board Games', 'Chess,Monopoly,Scrabble,Draughts', 'Dominoes,Jigsaw,Dice', 'Card Games,Charades,Hide and Seek'),
      T('Golf', 'Golf Gear', 'Golf Clubs', 'Driver,Putter,Wedge,Iron', 'Golf Ball,Tee,Golf Bag', 'Fairway,Bunker,Green'),
      T('Winter Olympics', 'Winter Sports', 'Snow Sports', 'Skiing,Snowboarding,Snowshoeing,Sledging', 'Ice Skating,Ice Hockey,Curling', 'Bobsleigh,Luge,Ski Jump'),
      T('Gaming', 'Video Games', 'Retro Games', 'Tetris,Pac-Man,Pong,Space Invaders', 'Minecraft,Fortnite,Zelda', 'Controller,Console,Headset'),
      T('Football', 'Football Team', 'Football Positions', 'Goalkeeper,Defender,Midfielder,Striker', 'Coach,Captain,Substitute', 'Referee,Trophy,Supporters'),
    ],
    two: [
      D('Extreme Sports', 'Air Sports', 'Skydiving,Paragliding,Hang Gliding,Bungee Jumping', 'Parkour,Rock Climbing,Zip Line'),
      D('Gym', 'Gym Equipment', 'Dumbbell,Treadmill,Barbell,Kettlebell', 'Yoga Mat,Skipping Rope,Towel'),
      D('Stadium', 'Stadium Parts', 'Pitch,Terraces,Dugout,Scoreboard', 'Turnstile,Floodlights,Tunnel'),
      D('Racing', 'Motor Racing', 'Formula One,Rally,Karting,MotoGP', 'Horse Racing,Greyhound Racing,Yacht Racing'),
    ] },

  { title: 'Around Town',
    three: [
      T('Buildings', 'Homes', 'Houses', 'Bungalow,Cottage,Villa,Cabin', 'Apartment,Caravan,Houseboat', 'School,Hospital,Library'),
      T('Shopping', 'Shopping Places', 'Small Shops', 'Bakery,Pharmacy,Florist,Butcher', 'Supermarket,Market,Mall', 'Receipt,Basket,Trolley'),
      T('Local Government', 'Public Services', 'Emergency Services', 'Police,Fire Brigade,Ambulance,Coastguard', 'Post Office,Rubbish Collection,Street Cleaning', 'Mayor,Councillor,Town Hall'),
      T('Day in the Park', 'Park Features', 'Playground', 'Swing,Slide,Seesaw,Climbing Frame', 'Pond,Bench,Fountain', 'Picnic,Kite,Jogging'),
      T('Eating Out', 'Places to Eat', 'Casual Eateries', 'Cafe,Diner,Bistro,Canteen', 'Steakhouse,Buffet,Food Truck', 'Menu,Waiter,Bill'),
      T('Day Out', 'Entertainment Venues', 'Culture Spots', 'Museum,Gallery,Theatre,Cinema', 'Zoo,Aquarium,Funfair', 'Souvenir,Ticket,Map'),
      T('Town Centre', 'Street Scene', 'Street Furniture', 'Lamppost,Postbox,Bollard,Bus Shelter', 'Statue,Monument,Plaque', 'Town Square,Pedestrian Zone,Clock Tower'),
      T('Local Workers', 'Tradespeople', 'Building Trades', 'Plumber,Electrician,Carpenter,Bricklayer', 'Mechanic,Locksmith,Gardener', 'Postman,Barber,Window Cleaner'),
    ],
    two: [
      D('Banking', 'Bank Services', 'Deposit,Loan,Savings,Mortgage', 'Cash Machine,Cashier,Vault'),
      D('Schooldays', 'Classroom', 'Desk,Blackboard,Chalk,Register', 'Assembly,Homework,Uniform'),
      D('Medical Care', 'Medical Staff', 'Doctor,Nurse,Surgeon,Paramedic', 'Stretcher,Stethoscope,Bandage'),
      D('Hotel', 'Hotel Rooms', 'Suite,Penthouse,Single Room,Double Room', 'Reception,Concierge,Minibar'),
    ] },

  { title: 'Planet Earth',
    three: [
      T('Landscape', 'Landforms', 'Mountain Ranges', 'Alps,Andes,Himalayas,Rockies', 'Valley,Canyon,Island', 'Forest,Desert,Coast'),
      T('Water on Earth', 'Fresh Water', 'Famous Rivers', 'Nile,Amazon,Thames,Mississippi', 'Lake,Waterfall,Stream', 'Sea,Tide,Wave'),
      T('Weather Report', 'Weather', 'Wet Weather', 'Drizzle,Downpour,Sleet,Hail', 'Sunshine,Fog,Wind', 'Temperature,Forecast,Thermometer'),
      T('Disaster Relief', 'Natural Disasters', 'Violent Storms', 'Hurricane,Tornado,Blizzard,Thunderstorm', 'Earthquake,Volcano,Tsunami', 'Evacuation,Rescue,Shelter'),
      T('The Universe', 'Solar System', 'Planets', 'Mercury,Venus,Mars,Saturn', 'Sun,Moon,Comet', 'Galaxy,Black Hole,Nebula'),
      T('Navigation', 'Reading a Map', 'Compass Points', 'North,South,East,West', 'Legend,Scale,Grid', 'Compass,GPS,Globe'),
      T('Telling Time', 'Calendar', 'Seasons', 'Spring,Summer,Autumn,Winter', 'Month,Week,Leap Year', 'Clock,Watch,Hourglass'),
      T('The World', 'Countries', 'European Countries', 'France,Spain,Italy,Germany', 'Japan,Brazil,Egypt', 'Continents,Hemispheres,Poles'),
    ],
    two: [
      D('Beach Day', 'Seaside Fun', 'Bucket,Spade,Sandcastle,Seashell', 'Deckchair,Sunscreen,Lifeguard'),
      D('Camping Trip', 'Camping Gear', 'Sleeping Bag,Torch,Lantern,Camp Stove', 'Campsite,Marshmallow,Penknife'),
      D('Rocks and Minerals', 'Gemstone', 'Diamond,Ruby,Emerald,Sapphire', 'Granite,Marble,Limestone'),
      D('Hiking', 'Hiking Gear', 'Rucksack,Walking Poles,Water Bottle,Waterproofs', 'Trail,Summit,Viewpoint'),
    ] },

  { title: 'Home & Body',
    three: [
      T('Inside the Home', 'Kitchen', 'Kitchen Appliances', 'Fridge,Oven,Microwave,Toaster', 'Sink,Cupboard,Kettle', 'Bathroom,Bedroom,Living Room'),
      T('Body', 'Head', 'Face', 'Eyes,Nose,Mouth,Cheeks', 'Hair,Ears,Chin', 'Arms,Legs,Torso'),
      T('Fashion', 'Wardrobe', 'Footwear', 'Sandals,Trainers,Boots,Slippers', 'Jacket,Jeans,Dress', 'Jewellery,Handbag,Sunglasses'),
      T('DIY', 'Toolbox', 'Hand Tools', 'Hammer,Screwdriver,Spanner,Saw', 'Drill,Nails,Screws', 'Paint,Ladder,Wallpaper'),
      T('Study Time', 'Stationery', 'Pencil Case', 'Pencil,Rubber,Ruler,Sharpener', 'Notebook,Stapler,Scissors', 'Textbook,Dictionary,Calculator'),
      T('Washroom', 'Bathroom Items', 'Toiletries', 'Soap,Shampoo,Toothpaste,Deodorant', 'Toothbrush,Mirror,Bath Mat', 'Bath,Shower,Toilet'),
      T('Garden', 'Garden Plants', 'Garden Flowers', 'Rose,Tulip,Daisy,Daffodil', 'Hedge,Tree,Lawn', 'Shed,Patio,Greenhouse'),
      T('Household', 'Family', 'Relatives', 'Aunt,Uncle,Cousin,Nephew', 'Parents,Siblings,Grandparents', 'Neighbours,Friends,Visitors'),
    ],
    two: [
      D('Cleaning', 'Cleaning Tools', 'Mop,Broom,Duster,Vacuum Cleaner', 'Bleach,Rubber Gloves,Dustpan'),
      D('Bedtime', 'Bedding', 'Pillow,Duvet,Mattress,Blanket', 'Pyjamas,Alarm Clock,Teddy Bear'),
      D('Laundry Day', 'Washing Items', 'Detergent,Washing Machine,Tumble Dryer,Clothes Peg', 'Washing Line,Hanger,Ironing Board'),
      D('Birthday Party', 'Party Decorations', 'Balloon,Banner,Streamer,Confetti', 'Candle,Present,Party Hat'),
    ] },
];

// ---------------------------------------------------------------------------
// Helpers + start-up validation
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Extra theme packs: every .js file in the ./packs folder is loaded automatically (alphabetical order).
// Each file exports a function that receives the T and D helpers and returns a list of packs:
//   module.exports = ({ T, D }) => [ { title: 'My Theme', three: [ T(...), ... ], two: [ D(...), ... ] } ];
// Pack titles must be unique. The same start-up check applies to them as to the packs above.
// ---------------------------------------------------------------------------
(function loadExtraPacks() {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, 'packs');
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter((f) => /\.js$/.test(f)).sort().forEach((f) => {
    const list = require(path.join(dir, f))({ T, D, N, W });
    list.forEach((pk) => {
      if (PACKS.some((x) => x.title === pk.title)) throw new Error('Duplicate pack title "' + pk.title + '" in packs/' + f);
      PACKS.push(pk);
    });
  });
})();

// ---------------------------------------------------------------------------
// Deep chains (Levels 4 to 7): every .js file in ./packs-deep returns a list of ladders made with L(...).
//   L('Theme', 'Name1: w1,w2,w3,w4', 'Name2: w5,w6,w7', ... up to 7 lines)   (read from the bottom up, see 01-deep-chains.js)
// ---------------------------------------------------------------------------
const DEEP_MAX = 7;                                  // a ladder has 7 fusions (6 fusion levels + the finished group)
const LADDERS = [];
const L = (theme, ...lines) => ({ theme, lines });
(function loadDeepChains() {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, 'packs-deep');
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).filter((f) => /\.js$/.test(f)).sort().forEach((f) => {
    require(path.join(dir, f))({ L, N, W }).forEach((l) => LADDERS.push(l));
  });
})();
// Cut the bottom `fusions` fusions of a ladder into a normal tree (same format as T / D groups).
function ladderTree(ladder, fusions) {
  let node = null;
  ladder.lines.slice(0, fusions).forEach((line, i) => {
    const at = line.indexOf(':');
    const name = line.slice(0, at).trim(), words = W(line.slice(at + 1));
    node = i === 0 ? N(name, ...words) : N(name, node, ...words);
  });
  return node;
}

const lc = (s) => String(s).trim().toLowerCase();

// Walk a tree: returns { levels, leaves, fusions, words:[...], names:[...] }
function measure(root) {
  const words = [], names = [];
  const walk = (node) => {
    if (!Array.isArray(node.kids) || node.kids.length !== 4) {
      throw new Error('Group "' + node.name + '" must have exactly 4 children (has ' + (node.kids ? node.kids.length : 0) + ')');
    }
    names.push(node.name);
    let deepest = 0;
    node.kids.forEach((k) => {
      if (typeof k === 'string') words.push(k);
      else deepest = Math.max(deepest, walk(k));
    });
    return deepest + 1;
  };
  const levels = walk(root);
  return { levels, leaves: words.length, fusions: names.length, words, names };
}
const keysOf = (p) => p.words.concat(p.names).map(lc);
const shuffled = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ---------------------------------------------------------------------------
// The piece pool per pack
//   d3 = the 3-level groups (10 tiles each)
//   d2 = the 2-level groups (7 tiles each): the ones written with D(...) plus the middle part of every 3-level group
//   d1 = the 1-step groups (4 tiles each): the innermost group of every 2-level and 3-level group
// ---------------------------------------------------------------------------
const POOL = {};
PACKS.forEach((p) => {
  const pool = { d1: [], d2: [], d3: [] };
  const seen = new Set();
  const add = (node, bucket) => {
    const m = measure(node);
    const sig = JSON.stringify(node);
    if (seen.has(sig)) return;
    seen.add(sig);
    pool[bucket].push(Object.assign({ pack: p.title, root: node }, m));
  };
  // d1 = the innermost 4-word group of every tree (no fused tiles at all): used by Level 1 (Easy)
  const innermost = (node) => { const k = node.kids.find((x) => typeof x !== 'string'); return k ? innermost(k) : node; };
  p.three.forEach((t) => { add(t, 'd3'); add(t.kids.find((k) => typeof k !== 'string'), 'd2'); add(innermost(t), 'd1'); });
  p.two.forEach((t) => { add(t, 'd2'); add(innermost(t), 'd1'); });
  POOL[p.title] = pool;
});

// Deep pool: DEEP_POOL[f] = every ladder cut to its bottom f fusions (f = 4..7)
const DEEP_POOL = {};
for (let f = 4; f <= DEEP_MAX; f++) {
  DEEP_POOL[f] = LADDERS.map((l) => {
    const root = ladderTree(l, f);
    return Object.assign({ pack: l.theme, root }, measure(root));
  });
}

// ---------------------------------------------------------------------------
// The one fixed build: every round has exactly 8 independent groups.
//   2-level group = 7 tiles, 3-level group = 10 tiles   ->   tiles = 7 x two + 10 x three
// Only 24 tiles (4 columns x 6 rows) are on screen at a time; the rest drop in as space frees up (see server.js).
// ---------------------------------------------------------------------------
const GROUPS_PER_BOARD = 8;
const BOARD = { two: 4, three: 4 };
BOARD.tiles = BOARD.two * 7 + BOARD.three * 10;   // 68

// The seven difficulty levels (every one has 8 groups unless the host lowers "Groups per round").
// fusionLevels = fused tiles a group passes through on the way (Level 3 Hard: up to 2). Levels 4 to 7 use the deep ladders.
const LEVELS = {
  1: { name: 'Easy', label: 'Level 1 (Easy)', fusionLevels: 0, maxFusionLevel: 1 },
  2: { name: 'Moderate', label: 'Level 2 (Moderate)', fusionLevels: 1, maxFusionLevel: 2 },
  3: { name: 'Hard', label: 'Level 3 (Hard)', fusionLevels: 2, maxFusionLevel: 3 },
  4: { name: 'Very Hard', label: 'Level 4 (Very Hard)', fusionLevels: 3, maxFusionLevel: 4, deep: 4 },
  5: { name: 'Extreme', label: 'Level 5 (Extreme)', fusionLevels: 4, maxFusionLevel: 5, deep: 5 },
  6: { name: 'Extremely Hard', label: 'Level 6 (Extremely Hard)', fusionLevels: 5, maxFusionLevel: 6, deep: 6 },
  7: { name: 'Insane', label: 'Level 7 (Insane)', fusionLevels: 6, maxFusionLevel: 7, deep: 7 },
};
// How many groups of each depth a round has. `twoHard` only matters on Level 3 (how many of the groups are 2-level).
function mixFor(level, groups, twoHard) {
  groups = Math.min(GROUPS_PER_BOARD, Math.max(1, Math.round(groups) || GROUPS_PER_BOARD));
  if (level === 1) return { one: groups, two: 0, three: 0 };
  if (level === 2) return { one: 0, two: groups, three: 0 };
  if (level >= 4 && LEVELS[level]) return { one: 0, two: 0, three: 0, deep: LEVELS[level].deep, deepCount: groups };   // `deep` = fusions per group
  const two = Math.min(groups, Math.max(0, Math.round(twoHard) || 0));
  return { one: 0, two, three: groups - two };
}
const tilesOfMix = (m) => m.one * 4 + m.two * 7 + m.three * 10 + (m.deep ? m.deepCount * (3 * m.deep + 1) : 0);   // a ladder of f fusions has 3f+1 words

// Pick `count` pieces of one depth. No word or group name may repeat anywhere on the board.
function pickPieces(packs, bucket, count, used, picked, recent, avoidRecent) {
  const all = shuffled([].concat(...packs.map((pk) => POOL[pk][bucket])));
  const out = [];
  for (const c of all) {
    if (out.length === count) break;
    if (picked.has(c.root.name)) continue;
    if (avoidRecent && recent.has(c.root.name)) continue;
    if (!keysOf(c).every((x) => !used.has(x))) continue;
    out.push(c);
    picked.add(c.root.name);
    keysOf(c).forEach((x) => used.add(x));
  }
  return out.length === count ? out : null;
}

// Returns { title, roots:[8 trees] }
const boardSig = (roots) => roots.map((r) => r.name).sort().join('|');
// `mix` (optional) = { one, two, three }: how many 1-step, 2-level and 3-level groups this round has. Default = BOARD (Hard).
// The host can change it in Settings > Game rules; every combination from 1 to 8 groups is allowed.
function compose(pack, recent, seen, mix) {
  recent = recent || new Set();
  seen = seen || new Set();
  if (mix && mix.deep) return composeDeep(pack, recent, seen, mix);
  const nThree = mix && Number.isInteger(mix.three) && mix.three >= 0 ? mix.three : BOARD.three;
  const nTwo = mix && Number.isInteger(mix.two) && mix.two >= 0 ? mix.two : BOARD.two;
  const nOne = mix && Number.isInteger(mix.one) && mix.one >= 0 ? mix.one : 0;
  const attempt = (packs, avoidRecent) => {
    for (let i = 0; i < 60; i++) {
      const used = new Set(), picked = new Set();
      const threes = pickPieces(packs, 'd3', nThree, used, picked, recent, avoidRecent);
      if (!threes) continue;
      const twos = pickPieces(packs, 'd2', nTwo, used, picked, recent, avoidRecent);
      if (!twos) continue;
      const ones = pickPieces(packs, 'd1', nOne, used, picked, recent, avoidRecent);
      if (!ones) continue;
      const picks = threes.concat(twos, ones);
      if (seen.has(boardSig(picks.map((p) => p.root)))) continue;   // this exact board was already played
      return picks;
    }
    return null;
  };
  const titles = PACKS.map((p) => p.title);
  const one = pack && pack !== 'mixed' && POOL[pack] ? [pack] : null;
  let picks = null;
  if (one) picks = attempt(one, true) || attempt(one, false);
  if (!picks) picks = attempt(titles, true) || attempt(titles, false);
  if (!picks) { seen = new Set(); if (one) picks = attempt(one, false); if (!picks) picks = attempt(titles, false); }   // everything played once: start over
  if (!picks) throw new Error('Could not build a board');
  const packsUsed = new Set(picks.map((p) => p.pack));
  return { title: packsUsed.size === 1 ? picks[0].pack : 'Mixed Board', roots: shuffled(picks).map((p) => p.root) };
}

// Levels 4 to 7: every group is a ladder cut to `mix.deep` fusions. Words may not repeat anywhere on the board.
function composeDeep(pack, recent, seen, mix) {
  const f = mix.deep, count = mix.deepCount;
  const all = DEEP_POOL[f] || [];
  const attempt = (themeOnly, avoidRecent) => {
    const list = themeOnly ? all.filter((c) => c.pack === themeOnly) : all;
    for (let i = 0; i < 80; i++) {
      const used = new Set(), picked = new Set(), out = [];
      for (const c of shuffled(list)) {
        if (out.length === count) break;
        if (picked.has(c.root.name)) continue;
        if (avoidRecent && recent.has(c.root.name)) continue;
        if (!keysOf(c).every((x) => !used.has(x))) continue;
        out.push(c); picked.add(c.root.name); keysOf(c).forEach((x) => used.add(x));
      }
      if (out.length !== count) continue;
      if (seen.has(boardSig(out.map((p) => p.root)))) continue;
      return out;
    }
    return null;
  };
  // A theme is used on its own only when it has enough ladders for a whole round; otherwise the round mixes every theme.
  const themeOnly = pack && pack !== 'mixed' && all.filter((c) => c.pack === pack).length >= count ? pack : null;
  let picks = (themeOnly && (attempt(themeOnly, true) || attempt(themeOnly, false))) || attempt(null, true) || attempt(null, false);
  if (!picks) { picks = attempt(null, false) || (function () { const keep = new Set(); return attempt(null, false); })(); }
  if (!picks) throw new Error('Could not build a deep board for level ' + f);
  const themes = new Set(picks.map((p) => p.pack));
  return { title: themes.size === 1 ? picks[0].pack : 'Mixed Board', roots: shuffled(picks).map((p) => p.root) };
}

function validate() {
  const problems = [];
  const globalSeen = new Map();
  PACKS.forEach((p) => {
    if (!Array.isArray(p.three) || p.three.length < GROUPS_PER_BOARD) problems.push('Pack "' + p.title + '" needs at least ' + GROUPS_PER_BOARD + ' three-level groups so a single-theme round can be built');
    if (!Array.isArray(p.two) || p.two.length < 1) problems.push('Pack "' + p.title + '" needs at least 1 two-level group');
    [['three', 3, 10], ['two', 2, 7]].forEach(([key, lv, tiles]) => (p[key] || []).forEach((t) => {
      try {
        const m = measure(t);
        if (m.levels !== lv) problems.push('"' + t.name + '" should be ' + lv + ' levels deep but is ' + m.levels);
        if (m.leaves !== tiles) problems.push('"' + t.name + '" should have ' + tiles + ' words but has ' + m.leaves);
        m.words.concat(m.names).forEach((x) => {
          const k = lc(x);
          if (globalSeen.has(k) && globalSeen.get(k) !== t.name) problems.push('"' + x + '" is used in both "' + globalSeen.get(k) + '" and "' + t.name + '"');
          globalSeen.set(k, t.name);
        });
      } catch (e) { problems.push(e.message); }
    }));
  });
  // deep ladders: 4 words in the first line, 3 in each later line, 7 lines, every word and name unique across all ladders
  // (A round on Levels 4 to 7 only ever holds deep ladders, so the unique-word rule applies among the ladders, not against the normal packs.)
  const deepKeys = new Map();
  if (LADDERS.length < GROUPS_PER_BOARD) problems.push('At least ' + GROUPS_PER_BOARD + ' deep ladders are needed for Levels 4 to 7 (found ' + LADDERS.length + ')');
  LADDERS.forEach((l, idx) => {
    const label = 'Deep ladder ' + (idx + 1) + ' (' + (l.lines[0] || '?') + ')';
    if (l.lines.length !== DEEP_MAX) { problems.push(label + ' must have ' + DEEP_MAX + ' lines but has ' + l.lines.length); return; }
    l.lines.forEach((line, i) => {
      const at = line.indexOf(':');
      if (at < 1) { problems.push(label + ': line ' + (i + 1) + ' needs the form "Name: word,word,word"'); return; }
      const name = line.slice(0, at).trim(), words = W(line.slice(at + 1));
      if (words.length !== (i === 0 ? 4 : 3) || words.some((w) => !w)) problems.push(label + ': "' + name + '" needs ' + (i === 0 ? 4 : 3) + ' words but has ' + words.length);
      [name].concat(words).forEach((x) => {
        const k = lc(x);
        if (deepKeys.has(k) && deepKeys.get(k) !== l.lines[0]) problems.push('"' + x + '" is used in both "' + deepKeys.get(k) + '" and deep ladder "' + l.lines[0] + '"');
        deepKeys.set(k, l.lines[0]);
      });
    });
  });
  if (BOARD.two + BOARD.three !== GROUPS_PER_BOARD) problems.push('BOARD must add up to exactly ' + GROUPS_PER_BOARD + ' groups');
  if (!problems.length) {
    ['mixed'].concat(PACKS.map((p) => p.title)).forEach((pk) => {
      for (let i = 0; i < 5; i++) {
        try {
          [1, 2, 3, 4, 5, 6, 7].forEach((lv) => {
            const mix = lv === 3 ? { one: 0, two: BOARD.two, three: BOARD.three } : mixFor(lv, GROUPS_PER_BOARD, 0);
            if (lv >= 4 && !LADDERS.length) return;
            const b = compose(pk, new Set(), null, mix);
            const tiles = b.roots.reduce((n, r) => n + measure(r).leaves, 0);
            if (b.roots.length !== GROUPS_PER_BOARD || tiles !== tilesOfMix(mix)) throw new Error('wrong group or tile count on level ' + lv);
          });
        } catch (e) { problems.push(pk + ': ' + e.message); break; }
      }
    });
  }
  return problems;
}

module.exports = { PACKS, POOL, LADDERS, DEEP_POOL, measure, validate, compose, boardSig, keysOf, BOARD, GROUPS_PER_BOARD, LEVELS, mixFor, tilesOfMix };
