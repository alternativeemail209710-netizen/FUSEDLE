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
 * There are NO difficulty levels. Every round is one fixed build: 8 groups (BOARD near the bottom of this file).
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
// ---------------------------------------------------------------------------
const POOL = {};
PACKS.forEach((p) => {
  const pool = { d2: [], d3: [] };
  const seen = new Set();
  const add = (node, bucket) => {
    const m = measure(node);
    const sig = JSON.stringify(node);
    if (seen.has(sig)) return;
    seen.add(sig);
    pool[bucket].push(Object.assign({ pack: p.title, root: node }, m));
  };
  p.three.forEach((t) => { add(t, 'd3'); add(t.kids.find((k) => typeof k !== 'string'), 'd2'); });
  p.two.forEach((t) => add(t, 'd2'));
  POOL[p.title] = pool;
});

// ---------------------------------------------------------------------------
// The one fixed build: every round has exactly 8 independent groups.
//   2-level group = 7 tiles, 3-level group = 10 tiles   ->   tiles = 7 x two + 10 x three
// Only 24 tiles (4 columns x 6 rows) are on screen at a time; the rest drop in as space frees up (see server.js).
// ---------------------------------------------------------------------------
const GROUPS_PER_BOARD = 8;
const BOARD = { two: 4, three: 4 };
BOARD.tiles = BOARD.two * 7 + BOARD.three * 10;   // 68

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
function compose(pack, recent, seen) {
  recent = recent || new Set();
  seen = seen || new Set();
  const attempt = (packs, avoidRecent) => {
    for (let i = 0; i < 60; i++) {
      const used = new Set(), picked = new Set();
      const threes = pickPieces(packs, 'd3', BOARD.three, used, picked, recent, avoidRecent);
      if (!threes) continue;
      const twos = pickPieces(packs, 'd2', BOARD.two, used, picked, recent, avoidRecent);
      if (!twos) continue;
      const picks = threes.concat(twos);
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
  if (BOARD.two + BOARD.three !== GROUPS_PER_BOARD) problems.push('BOARD must add up to exactly ' + GROUPS_PER_BOARD + ' groups');
  if (!problems.length) {
    ['mixed'].concat(PACKS.map((p) => p.title)).forEach((pk) => {
      for (let i = 0; i < 5; i++) {
        try {
          const b = compose(pk, new Set());
          const tiles = b.roots.reduce((n, r) => n + measure(r).leaves, 0);
          if (b.roots.length !== GROUPS_PER_BOARD || tiles !== BOARD.tiles) throw new Error('wrong group or tile count');
        } catch (e) { problems.push(pk + ': ' + e.message); break; }
      }
    });
  }
  return problems;
}

module.exports = { PACKS, POOL, measure, validate, compose, boardSig, keysOf, BOARD, GROUPS_PER_BOARD };
