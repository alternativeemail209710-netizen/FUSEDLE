/**
 * FUSEDLE puzzle library - 8 INDEPENDENT GROUPS PER BOARD (no chains of groups).
 *
 * Every difficulty level has exactly 8 groups. Each group is its own little fusion tree:
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
 * How many of each per difficulty level lives in LEVEL_SPECS near the bottom of this file.
 * Words are separated by commas inside one string, so a word may contain spaces ("Ice Cream").
 * Keep every word and every group name UNIQUE across this whole file (the start-up check tells you if not).
 */
'use strict';

const N = (name, ...kids) => ({ name, kids });
const W = (s) => s.split(',').map((x) => x.trim());
const T = (top, mid, sub, subWords, midWords, topWords) => N(top, N(mid, N(sub, ...W(subWords)), ...W(midWords)), ...W(topWords));
const D = (top, sub, subWords, topWords) => N(top, N(sub, ...W(subWords)), ...W(topWords));

const PACKS = [
  { title: 'Getting Around',
    three: [
      T('Transport', 'Land Transport', 'Car', 'Ford,Toyota,Honda,BMW', 'Bus,Tram,Bicycle', 'Boat,Plane,Rocket'),
      T('Travel', 'Sea Travel', 'Ship', 'Ferry,Yacht,Liner,Tanker', 'Canoe,Kayak,Raft', 'Helicopter,Motorbike,Skateboard'),
      T('Aviation', 'Flying Machines', 'Aircraft', 'Glider,Blimp,Biplane,Seaplane', 'Balloon,Drone,Gyrocopter', 'Runway,Hangar,Cockpit'),
      T('Railway', 'Railway Line', 'Train Types', 'Steam,Bullet,Maglev,Freight', 'Platform,Sleeper,Signal', 'Carriage,Level Crossing,Timetable'),
      T('Road Traffic', 'Heavy Vehicles', 'Truck Types', 'Tipper,Flatbed,Pickup,Dumper', 'Tractor,Bulldozer,Crane', 'Zebra Crossing,Speed Bump,Junction'),
      T('Driving', 'Car Parts', 'Car Body', 'Bonnet,Boot,Bumper,Spoiler', 'Gearbox,Clutch,Radiator', 'Speedometer,Seatbelt,Handbrake'),
      T('Two Wheels', 'Bike Parts', 'Wheel Parts', 'Spoke,Rim,Hub,Tyre', 'Pedal,Saddle,Chain', 'Moped,Segway,Unicycle'),
      T('Harbour', 'Ship Life', 'Ship Parts', 'Hull,Mast,Rudder,Anchor', 'Galley,Cabin,Lifeboat', 'Dock,Lighthouse,Pier'),
      T('Journey', 'Trip Types', 'Journey Words', 'Voyage,Trek,Commute,Excursion', 'Pilgrimage,Safari,Cruise', 'Passport,Suitcase,Visa'),
      T('Powering Vehicles', 'Fuels', 'Liquid Fuels', 'Petrol,Diesel,Kerosene,Ethanol', 'Electricity,Hydrogen,Propane', 'Battery,Charger,Fuel Pump'),
    ],
    two: [
      D('Public Transport', 'Metro Systems', 'Subway,Underground,Metro,Tube', 'Taxi,Cable Car,Gondola'),
      D('Space Travel', 'Spacecraft', 'Shuttle,Capsule,Probe,Satellite', 'Astronaut,Launchpad,Orbit'),
      D('Winter Travel', 'Snow Vehicles', 'Sleigh,Snowmobile,Snowplough,Sled', 'Skis,Snowshoes,Crampons'),
      D('Old-Fashioned Travel', 'Horse-Drawn', 'Stagecoach,Chariot,Hansom,Wagon', 'Rickshaw,Tuk-tuk,Sedan Chair'),
    ] },

  { title: 'Animal Kingdom',
    three: [
      T('Living Things', 'Animals', 'Mammals', 'Lion,Whale,Bat,Zebra', 'Bird,Fish,Insect', 'Plant,Fungus,Bacteria'),
      T('Pets', 'Pet Mammals', 'Dog Breeds', 'Poodle,Beagle,Collie,Husky', 'Rabbit,Hamster,Gerbil', 'Goldfish,Parrot,Tortoise'),
      T('Farm Animals', 'Livestock', 'Poultry', 'Chicken,Duck,Turkey,Goose', 'Sheep,Goat,Cattle', 'Pig,Horse,Donkey'),
      T('Wildlife', 'Wild Animals', 'Big Cats', 'Tiger,Leopard,Jaguar,Cheetah', 'Elephant,Giraffe,Hippo', 'Wolf,Bear,Fox'),
      T('Birds', 'Flying Birds', 'Birds of Prey', 'Eagle,Falcon,Hawk,Owl', 'Robin,Sparrow,Swallow', 'Penguin,Ostrich,Kiwi'),
      T('Ocean Life', 'Invertebrates', 'Cephalopods', 'Octopus,Squid,Cuttlefish,Nautilus', 'Starfish,Jellyfish,Sea Urchin', 'Dolphin,Shark,Seal'),
      T('Cold-Blooded', 'Reptiles', 'Lizards', 'Gecko,Iguana,Chameleon,Komodo', 'Cobra,Python,Crocodile', 'Frog,Newt,Toad'),
      T('Creepy Crawlies', 'Insects', 'Beetles', 'Ladybird,Weevil,Scarab,Firefly', 'Ant,Wasp,Dragonfly', 'Spider,Scorpion,Centipede'),
      T('Jungle', 'Primates', 'Apes', 'Gorilla,Chimp,Orangutan,Gibbon', 'Baboon,Lemur,Macaque', 'Toucan,Anaconda,Sloth'),
      T('Animal Homes', 'Nests and Burrows', 'Bird Homes', 'Nest,Aviary,Roost,Coop', 'Burrow,Warren,Sett', 'Hive,Den,Lair'),
    ],
    two: [
      D('Dinosaurs', 'Meat Eaters', 'Tyrannosaurus,Velociraptor,Allosaurus,Spinosaurus', 'Triceratops,Stegosaurus,Brachiosaurus'),
      D('Arctic Life', 'Polar Animals', 'Polar Bear,Walrus,Narwhal,Arctic Fox', 'Reindeer,Snowy Owl,Lemming'),
      D('Rodents', 'Gnawers', 'Mouse,Rat,Squirrel,Beaver', 'Capybara,Porcupine,Chinchilla'),
      D('Australian Wildlife', 'Marsupials', 'Kangaroo,Koala,Wombat,Wallaby', 'Emu,Platypus,Dingo'),
    ] },

  { title: 'Food & Drink',
    three: [
      T('Food Groups', 'Fruit', 'Apples', 'Gala,Fuji,Braeburn,Pink Lady', 'Banana,Mango,Grape', 'Grain,Meat,Dairy'),
      T('Drinks', 'Hot Drinks', 'Coffee', 'Latte,Espresso,Mocha,Cappuccino', 'Tea,Cocoa,Chai', 'Juice,Soda,Water'),
      T('Chilled Aisle', 'Dairy Products', 'Cheese', 'Cheddar,Brie,Gouda,Feta', 'Milk,Butter,Yogurt', 'Eggs,Bacon,Sausage'),
      T('Italian Food', 'Italian Staples', 'Pasta', 'Penne,Fusilli,Linguine,Ravioli', 'Risotto,Gnocchi,Polenta', 'Pizza,Lasagne,Bruschetta'),
      T('Dessert Table', 'Baked Sweets', 'Cakes', 'Sponge,Gateau,Cupcake,Brownie', 'Pie,Tart,Cobbler', 'Sorbet,Tiramisu,Trifle'),
      T('Pantry', 'Seasonings', 'Spices', 'Cumin,Paprika,Turmeric,Nutmeg', 'Basil,Oregano,Thyme', 'Flour,Sugar,Oil'),
      T('Greengrocer', 'Vegetables', 'Root Vegetables', 'Carrot,Parsnip,Turnip,Beetroot', 'Broccoli,Spinach,Leek', 'Strawberry,Peach,Cherry'),
      T('Snacks', 'Nuts and Seeds', 'Nuts', 'Almond,Cashew,Walnut,Pecan', 'Sesame,Sunflower,Pumpkin Seed', 'Crisps,Popcorn,Pretzel'),
      T('Fishmonger', 'Shellfish', 'Crustaceans', 'Prawn,Lobster,Crayfish,Langoustine', 'Mussel,Oyster,Scallop', 'Salmon,Tuna,Cod'),
      T('Breakfast', 'Cooked Breakfast', 'Egg Dishes', 'Omelette,Frittata,Quiche,Shakshuka', 'Toast,Beans,Hash Brown', 'Cereal,Porridge,Granola'),
    ],
    two: [
      D('Sauce Shelf', 'Table Sauces', 'Ketchup,Mustard,Mayonnaise,Pesto', 'Gravy,Guacamole,Hummus'),
      D('Kitchen Skills', 'Cooking Methods', 'Bake,Grill,Simmer,Poach', 'Chop,Whisk,Knead'),
      D('Fruit Bowl', 'Citrus', 'Orange,Lemon,Lime,Grapefruit', 'Pineapple,Papaya,Melon'),
      D('Hot Food', 'Fast Food', 'Burger,Hot Dog,Nuggets,Fries', 'Kebab,Wrap,Sandwich'),
    ] },

  { title: 'Music Room',
    three: [
      T('Orchestra', 'String Instruments', 'Bowed Strings', 'Violin,Cello,Viola,Double Bass', 'Harp,Banjo,Mandolin', 'Timpani,Cymbals,Triangle'),
      T('Classical Music', 'Composers', 'Baroque Composers', 'Bach,Handel,Vivaldi,Telemann', 'Mozart,Chopin,Brahms', 'Symphony,Opera,Concerto'),
      T('Wind Instruments', 'Woodwind', 'Reed Instruments', 'Oboe,Clarinet,Bassoon,Saxophone', 'Flute,Piccolo,Recorder', 'Trumpet,Trombone,Tuba'),
      T('Percussion', 'Drums', 'Hand Drums', 'Bongo,Conga,Djembe,Tabla', 'Snare,Bass Drum,Tom-tom', 'Maracas,Tambourine,Xylophone'),
      T('Keyboard World', 'Keyboard Instruments', 'Piano Types', 'Grand,Upright,Baby Grand,Player', 'Organ,Synthesizer,Accordion', 'Keytar,Harpsichord,Celesta'),
      T('Singing', 'Voice Types', 'Female Voices', 'Soprano,Mezzo,Alto,Contralto', 'Tenor,Baritone,Bass', 'Choir,Solo,Duet'),
      T('Music Genres', 'Popular Genres', 'Rock Styles', 'Punk,Grunge,Metal,Indie', 'Pop,Hip-hop,Reggae', 'Jazz,Blues,Folk'),
      T('Dance', 'Ballroom', 'Latin Dances', 'Salsa,Rumba,Samba,Cha-cha', 'Waltz,Tango,Foxtrot', 'Ballet,Tap,Breakdance'),
      T('Reading Music', 'Music Notation', 'Note Values', 'Crotchet,Quaver,Minim,Semibreve', 'Clef,Stave,Bar Line', 'Allegro,Adagio,Presto'),
      T('Live Gig', 'Band', 'Band Members', 'Singer,Guitarist,Drummer,Bassist', 'Roadie,Manager,Producer', 'Stage,Encore,Setlist'),
    ],
    two: [
      D('Music Tech', 'Recording Gear', 'Microphone,Mixer,Amplifier,Headphones', 'Speaker,Turntable,Metronome'),
      D('Listening Formats', 'Physical Formats', 'Vinyl,Cassette,CD,Minidisc', 'MP3,Streaming,Podcast'),
      D('Song Parts', 'Song Structure', 'Verse,Chorus,Hook,Intro', 'Lyrics,Melody,Harmony'),
      D('Folk Instruments', 'Celtic Instruments', 'Bagpipes,Fiddle,Bodhran,Tin Whistle', 'Ukulele,Harmonica,Sitar'),
    ] },

  { title: 'Game On',
    three: [
      T('Sports', 'Ball Games', 'Racket Sports', 'Tennis,Squash,Badminton,Padel', 'Football,Cricket,Rugby', 'Swimming,Cycling,Archery'),
      T('Combat Sports', 'Fighting Sports', 'Martial Arts', 'Judo,Karate,Aikido,Kendo', 'Boxing,Wrestling,Fencing', 'Ring,Gloves,Knockout'),
      T('Olympic Games', 'Athletics', 'Track Events', 'Sprint,Hurdles,Marathon,Relay', 'Javelin,Discus,Shot Put', 'Torch,Podium,Rings'),
      T('Water Sports', 'Sea Sports', 'Surf Sports', 'Surfing,Bodyboarding,Windsurfing,Kitesurfing', 'Sailing,Diving,Snorkelling', 'Rowing,Water Polo,Canoeing'),
      T('Tabletop Games', 'Board Games', 'Classic Boards', 'Chess,Monopoly,Scrabble,Cluedo', 'Draughts,Backgammon,Ludo', 'Poker,Bridge,Rummy'),
      T('Pub Games', 'Pub Sports', 'Cue Sports', 'Snooker,Pool,Billiards,Carom', 'Darts,Skittles,Quoits', 'Dominoes,Cribbage,Bingo'),
      T('Gaming', 'Video Games', 'Retro Games', 'Tetris,Pac-Man,Pong,Asteroids', 'Minecraft,Fortnite,Zelda', 'Joystick,Controller,Console'),
      T('Chess Club', 'Chess Set', 'Chess Pieces', 'Bishop,Rook,Pawn,Knight', 'Chessboard,Chess Clock,Score Sheet', 'Checkmate,Stalemate,Castling'),
      T('Winter Games', 'Ice Sports', 'Sliding Sports', 'Luge,Bobsled,Skeleton,Toboggan', 'Curling,Ice Hockey,Figure Skating', 'Skiing,Snowboarding,Biathlon'),
      T('Match Day', 'Prizes', 'Medals', 'Gold,Silver,Bronze,Platinum', 'Trophy,Cup,Shield', 'Referee,Umpire,Linesman'),
    ],
    two: [
      D('Sports Equipment', 'Protective Gear', 'Helmet,Goggles,Gum Shield,Shin Pads', 'Racket,Whistle,Stopwatch'),
      D('Golf', 'Golf Clubs', 'Driver,Putter,Wedge,Iron', 'Tee,Bunker,Birdie'),
      D('Stadium', 'Stadium Parts', 'Pitch,Terraces,Dugout,Scoreboard', 'Turnstile,Floodlights,Tunnel'),
      D('Extreme Sports', 'Air Sports', 'Skydiving,Paragliding,Hang Gliding,Bungee', 'Parkour,Rock Climbing,Zip Line'),
    ] },

  { title: 'Around Town',
    three: [
      T('Buildings', 'Homes', 'House Types', 'House,Flat,Bungalow,Cottage', 'Mansion,Castle,Palace', 'School,Hospital,Library'),
      T('Shopping', 'Shopping Places', 'Small Shops', 'Bakery,Pharmacy,Florist,Butcher', 'Market,Mall,Kiosk', 'Receipt,Basket,Trolley'),
      T('Civic Life', 'Public Services', 'Emergency Services', 'Police,Fire Brigade,Ambulance,Coastguard', 'Post Office,Council,Courthouse', 'Town Hall,Mayor,Registry'),
      T('Parks', 'Park Features', 'Playground Equipment', 'Swing,Slide,Seesaw,Roundabout', 'Pond,Bench,Fountain', 'Bandstand,Kite,Picnic'),
      T('Eating Out', 'Restaurants', 'Casual Dining', 'Cafe,Diner,Bistro,Canteen', 'Takeaway,Food Truck,Buffet', 'Menu,Waiter,Bill'),
      T('Entertainment', 'Fun Venues', 'Culture Spots', 'Museum,Gallery,Theatre,Opera House', 'Cinema,Arcade,Bowling', 'Zoo,Aquarium,Funfair'),
      T('Roads', 'Streets', 'Road Types', 'Avenue,Lane,Boulevard,Crescent', 'Alley,Cul-de-sac,Highway', 'Pavement,Kerb,Gutter'),
      T('Public Spaces', 'Street Fixtures', 'Street Furniture', 'Lamppost,Bin,Bollard,Postbox', 'Bus Shelter,Phone Box,Signpost', 'Statue,Monument,Plaque'),
      T('Local Workers', 'Tradespeople', 'Building Trades', 'Plumber,Electrician,Carpenter,Bricklayer', 'Mechanic,Locksmith,Roofer', 'Postman,Barber,Milkman'),
      T('Faith', 'Places of Worship', 'Christian Buildings', 'Cathedral,Chapel,Abbey,Basilica', 'Mosque,Temple,Synagogue', 'Priest,Imam,Rabbi'),
    ],
    two: [
      D('Banking', 'Money Matters', 'Deposit,Loan,Balance,Interest', 'Cash Machine,Mortgage,Savings'),
      D('Transport Hub', 'Bus Station', 'Bus Stop,Taxi Rank,Tram Stop,Ticket Office', 'Car Park,Port,Airport'),
      D('Medical Care', 'Hospital Wards', 'Maternity,Surgery,Casualty,Paediatrics', 'Nurse,Surgeon,Stretcher'),
      D('Schooldays', 'Classroom', 'Desk,Blackboard,Chalk,Register', 'Assembly,Homework,Uniform'),
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
// Difficulty: EVERY level has exactly 8 independent groups. Only the mix of 2-level and 3-level groups changes.
//   2-level group = 7 tiles, 3-level group = 10 tiles   ->   tiles = 7 x two + 10 x three
// ---------------------------------------------------------------------------
const GROUPS_PER_BOARD = 8;
const LEVEL_SPECS = {
  1: { two: 8, three: 0 },
  2: { two: 6, three: 2 },
  3: { two: 4, three: 4 },
  4: { two: 2, three: 6 },
  5: { two: 0, three: 8 },
};
Object.keys(LEVEL_SPECS).forEach((k) => {
  const s = LEVEL_SPECS[k];
  s.tiles = s.two * 7 + s.three * 10;
  s.rows = Math.ceil(s.tiles / 4);
});

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
function compose(level, pack, recent) {
  const spec = LEVEL_SPECS[level] || LEVEL_SPECS[2];
  recent = recent || new Set();
  const attempt = (packs, avoidRecent) => {
    for (let i = 0; i < 60; i++) {
      const used = new Set(), picked = new Set();
      const threes = pickPieces(packs, 'd3', spec.three, used, picked, recent, avoidRecent);
      if (!threes) continue;
      const twos = pickPieces(packs, 'd2', spec.two, used, picked, recent, avoidRecent);
      if (!twos) continue;
      return threes.concat(twos);
    }
    return null;
  };
  const titles = PACKS.map((p) => p.title);
  const one = pack && pack !== 'mixed' && POOL[pack] ? [pack] : null;
  let picks = null;
  if (one) picks = attempt(one, true) || attempt(one, false);
  if (!picks) picks = attempt(titles, true) || attempt(titles, false);
  if (!picks) throw new Error('Could not build a board for level ' + level);
  const packsUsed = new Set(picks.map((p) => p.pack));
  return { title: packsUsed.size === 1 ? picks[0].pack : 'Mixed Board', roots: shuffled(picks).map((p) => p.root) };
}

function validate() {
  const problems = [];
  const globalSeen = new Map();
  PACKS.forEach((p) => {
    if (!Array.isArray(p.three) || p.three.length < GROUPS_PER_BOARD) problems.push('Pack "' + p.title + '" needs at least ' + GROUPS_PER_BOARD + ' three-level groups so a single-pack Chaos board can be built');
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
  Object.keys(LEVEL_SPECS).forEach((lv) => {
    const sp = LEVEL_SPECS[lv];
    if (sp.two + sp.three !== GROUPS_PER_BOARD) problems.push('Level ' + lv + ' must have exactly ' + GROUPS_PER_BOARD + ' groups');
  });
  if (!problems.length) {
    Object.keys(LEVEL_SPECS).forEach((lv) => {
      ['mixed'].concat(PACKS.map((p) => p.title)).forEach((pk) => {
        for (let i = 0; i < 5; i++) {
          try {
            const b = compose(Number(lv), pk, new Set());
            const tiles = b.roots.reduce((n, r) => n + measure(r).leaves, 0);
            if (b.roots.length !== GROUPS_PER_BOARD || tiles !== LEVEL_SPECS[lv].tiles) throw new Error('wrong group or tile count');
          } catch (e) { problems.push('Level ' + lv + ' / ' + pk + ': ' + e.message); break; }
        }
      });
    });
  }
  return problems;
}

module.exports = { PACKS, POOL, measure, validate, compose, LEVEL_SPECS, GROUPS_PER_BOARD };
