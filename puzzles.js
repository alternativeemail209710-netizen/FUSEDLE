/**
 * FUSEDLE puzzle library - MULTI-LEVEL FUSION TREES
 *
 * A board has a fixed number of starting tiles per difficulty (16, 20, 24, 28, 32 = 4 columns x 4 to 8 rows).
 * It holds one or more top-level groups; every board has at least one chain that is 4 levels deep. Plain groups of 4 words
 * (the classic game) sit next to fusion chains: a found group becomes a NEW tile that joins other tiles for the next level.
 * Every group ("node") has EXACTLY 4 children. A child is either
 *   - a plain word  (it becomes a starting tile on the board), or
 *   - another group (it only exists once players have fused it).
 *
 * Example:
 *   N('Transportation', N('Car','Ford','Toyota','Honda','BMW'), 'Boat','Plane','Train')
 *
 *   Level 1:  Ford + Toyota + Honda + BMW  ->  fuse into a NEW tile "Car"  (new tile number)
 *   Level 2:  that "Car" tile + Boat + Plane + Train  ->  "Transportation"  (puzzle done)
 *
 * "Levels" = how many fusions deep the chain goes (Car -> Transportation is 2 levels).
 * The server checks this file when it starts (see validate() at the bottom).
 */
'use strict';

const N = (name, ...kids) => ({ name, kids });

const PACKS = [
  { title: 'Getting Around', trees: [
    // 2 levels, 7 tiles
    N('Transportation', N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'), 'Boat', 'Plane', 'Train'),
    // 2 levels, 10 tiles
    N('Ways to Get Around',
      N('Aircraft', 'Jet', 'Glider', 'Helicopter', 'Blimp'),
      N('Ship', 'Ferry', 'Yacht', 'Liner', 'Tanker'),
      'Bicycle', 'Skateboard'),
    // 3 levels, 10 tiles
    N('Transport',
      N('Land Transport', N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'), 'Bus', 'Tram', 'Bicycle'),
      'Boat', 'Plane', 'Rocket'),
    // 3 levels, 22 tiles
    N('Travel',
      N('Road Travel', N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'), 'Bus', 'Motorbike', 'Scooter'),
      N('Sea Travel', N('Ship', 'Ferry', 'Yacht', 'Liner', 'Tanker'), 'Canoe', 'Kayak', 'Raft'),
      N('Air Travel', N('Aircraft', 'Jet', 'Glider', 'Helicopter', 'Blimp'), 'Balloon', 'Drone', 'Parachute'),
      'Train'),
    // more fusion chains
    N('Heavy Vehicles', N('Truck', 'Lorry', 'Tipper', 'Trailer', 'Semi'), 'Tractor', 'Bulldozer', 'Crane'),
    // classic groups of 4 (level 1)
    N('Fuels', 'Petrol', 'Diesel', 'Kerosene', 'Ethanol'),
    N('Car Parts', 'Bonnet', 'Boot', 'Bumper', 'Exhaust'),
    N('Road Signs', 'Stop', 'Yield', 'Detour', 'Zebra'),
    N('Airport', 'Runway', 'Terminal', 'Hangar', 'Control Tower'),
    N('Ship Parts', 'Deck', 'Hull', 'Anchor', 'Mast'),
    N('Bike Parts', 'Pedal', 'Saddle', 'Chain', 'Spoke'),
    N('Railway', 'Platform', 'Sleeper', 'Signal', 'Carriage'),
    N('Journey Words', 'Voyage', 'Trek', 'Commute', 'Excursion'),
    // deep chains (4 levels): 13, 16 and 16 tiles
    N('Transportation', N('Land Transport', N('Road Vehicle', N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'), 'Bus', 'Truck', 'Motorbike'), 'Train', 'Tram', 'Bicycle'), 'Boat', 'Plane', 'Rocket'),
    N('Vehicles', N('Water Vehicle', N('Boat', N('Ship', 'Ferry', 'Yacht', 'Liner', 'Tanker'), 'Canoe', 'Kayak', 'Raft'), 'Submarine', 'Hovercraft', 'Jet Ski'), N('Aircraft', 'Jet', 'Glider', 'Helicopter', 'Blimp'), 'Bicycle', 'Skateboard'),
    N('Transport Hub', N('Transit', N('Railway Line', N('Train Types', 'Steam', 'Bullet', 'Maglev', 'Freight'), 'Platform', 'Signal', 'Sleeper'), 'Bus Stop', 'Taxi Rank', 'Tram Stop'), N('Airport Zone', 'Runway', 'Terminal', 'Hangar', 'Control Tower'), 'Port', 'Car Park'),
  ]},
  { title: 'Animal Kingdom', trees: [
    N('Pets', N('Dog', 'Poodle', 'Beagle', 'Collie', 'Husky'), 'Rabbit', 'Hamster', 'Goldfish'),
    N('Farm Animals',
      N('Poultry', 'Chicken', 'Duck', 'Turkey', 'Goose'),
      N('Pig', 'Sow', 'Boar', 'Piglet', 'Hog'),
      'Sheep', 'Goat'),
    // 3 levels, 10 tiles
    N('Living Things',
      N('Animal', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Insect'),
      'Plant', 'Fungus', 'Bacteria'),
    // 4 levels, 13 tiles
    N('Life on Earth',
      N('Animal',
        N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'),
        'Insect', 'Spider', 'Worm'),
      'Plant', 'Fungus', 'Bacteria'),
    // more fusion chains
    N('Wild Animals', N('Big Cat', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'), 'Elephant', 'Giraffe', 'Hippo'),
    // 4 levels, 13 tiles
    N('Planet Earth', N('Land', N('Highlands', N('Mountain', 'Everest', 'Alps', 'Andes', 'Rockies'), 'Hill', 'Cliff', 'Plateau'), 'Desert', 'Forest', 'Island'), 'Ocean', 'River', 'Lake'),
    N('Big Cats', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'),
    N('Birds of Prey', 'Eagle', 'Falcon', 'Hawk', 'Owl'),
    N('Ocean Life', 'Octopus', 'Squid', 'Crab', 'Starfish'),
    N('Reptiles', 'Gecko', 'Iguana', 'Cobra', 'Crocodile'),
    N('Bugs', 'Beetle', 'Ant', 'Wasp', 'Dragonfly'),
    N('Baby Animals', 'Kitten', 'Puppy', 'Calf', 'Cub'),
    N('Animal Homes', 'Nest', 'Burrow', 'Hive', 'Den'),
    N('Primates', 'Gorilla', 'Chimp', 'Orangutan', 'Baboon'),
    // deep chains (4 levels): 16, 19 and 16 tiles
    N('All Life', N('Animal', N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'), 'Insect', 'Spider', 'Worm'), N('Plant', 'Fern', 'Moss', 'Oak', 'Rose'), 'Fungus', 'Bacteria'),
    N('Biosphere', N('Animal', N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'), 'Insect', 'Spider', 'Worm'), N('Plant', 'Fern', 'Moss', 'Oak', 'Rose'), N('Fungus', 'Mushroom', 'Yeast', 'Mould', 'Truffle'), 'Bacteria'),
    N('Safari', N('Wild Animals', N('Predators', N('Big Cats', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'), 'Wolf', 'Crocodile', 'Hyena'), 'Elephant', 'Giraffe', 'Hippo'), N('Primates', 'Gorilla', 'Chimp', 'Orangutan', 'Baboon'), 'Jeep', 'Binoculars'),
  ]},
  { title: 'Food & Drink', trees: [
    N('Fruit', N('Apple', 'Gala', 'Fuji', 'Braeburn', 'Jazz'), 'Banana', 'Mango', 'Grape'),
    N('Food',
      N('Pasta', 'Penne', 'Fusilli', 'Linguine', 'Ravioli'),
      N('Cheese', 'Cheddar', 'Brie', 'Gouda', 'Feta'),
      'Bread', 'Rice'),
    // 3 levels, 10 tiles
    N('Drinks',
      N('Hot Drinks', N('Coffee', 'Latte', 'Espresso', 'Mocha', 'Cappuccino'), 'Tea', 'Cocoa', 'Chai'),
      'Juice', 'Soda', 'Water'),
    // 3 levels, 16 tiles
    N('Food Groups',
      N('Fruit', N('Apple', 'Gala', 'Fuji', 'Braeburn', 'Jazz'), 'Banana', 'Mango', 'Grape'),
      N('Dairy', N('Cheese', 'Cheddar', 'Brie', 'Gouda', 'Feta'), 'Milk', 'Butter', 'Yogurt'),
      'Grain', 'Meat'),
    // more fusion chains
    N('Dessert Table', N('Cake', 'Sponge', 'Carrot Cake', 'Gateau', 'Cupcake'), 'Pie', 'Ice Cream', 'Custard'),
    N('Spices', 'Cumin', 'Paprika', 'Turmeric', 'Nutmeg'),
    N('Vegetables', 'Carrot', 'Broccoli', 'Spinach', 'Leek'),
    N('Nuts', 'Almond', 'Cashew', 'Walnut', 'Pecan'),
    N('Breakfast', 'Pancake', 'Omelette', 'Cereal', 'Porridge'),
    N('Desserts', 'Brownie', 'Trifle', 'Sorbet', 'Tiramisu'),
    N('Cooking Methods', 'Bake', 'Grill', 'Steam', 'Poach'),
    N('Sauces', 'Ketchup', 'Mustard', 'Mayonnaise', 'Pesto'),
    N('Seafood', 'Prawn', 'Salmon', 'Lobster', 'Mussel'),
    // deep chains (4 levels): 13, 19, 16 and 16 tiles
    N('Food', N('Fresh Produce', N('Fruit', N('Citrus', 'Orange', 'Lemon', 'Lime', 'Grapefruit'), 'Apple', 'Banana', 'Mango'), 'Carrot', 'Lettuce', 'Onion'), 'Bread', 'Cheese', 'Rice'),
    N('Supermarket', N('Fresh Produce', N('Fruit', N('Citrus', 'Orange', 'Lemon', 'Lime', 'Grapefruit'), 'Apple', 'Banana', 'Mango'), 'Carrot', 'Lettuce', 'Onion'), N('Dairy', 'Milk', 'Butter', 'Yogurt', 'Cream'), N('Grain', 'Wheat', 'Oats', 'Barley', 'Rye'), 'Meat'),
    N('Menu', N('Drinks', N('Hot Drinks', N('Coffee', 'Latte', 'Espresso', 'Mocha', 'Cappuccino'), 'Tea', 'Cocoa', 'Chai'), 'Juice', 'Soda', 'Water'), N('Dessert', 'Cake', 'Pie', 'Trifle', 'Sorbet'), 'Starter', 'Main'),
    N('Kitchen', N('Cooking Ingredients', N('Pantry', N('Spices', 'Cumin', 'Paprika', 'Turmeric', 'Nutmeg'), 'Flour', 'Sugar', 'Salt'), 'Egg', 'Butter', 'Oil'), N('Cooking Methods', 'Bake', 'Grill', 'Steam', 'Poach'), 'Pot', 'Pan'),
  ]},
  { title: 'Music Room', trees: [
    N('Instruments', N('Drum', 'Snare', 'Bongo', 'Timpani', 'Conga'), 'Violin', 'Flute', 'Trumpet'),
    N('Orchestra',
      N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'),
      N('Brass', 'Trumpet', 'Trombone', 'Tuba', 'Cornet'),
      'Woodwind', 'Percussion'),
    // 3 levels, 10 tiles
    N('Music',
      N('Classical', N('Composer', 'Mozart', 'Bach', 'Beethoven', 'Chopin'), 'Symphony', 'Opera', 'Concerto'),
      'Jazz', 'Rock', 'Pop'),
    // 3 levels, 13 tiles
    N('Classical Music',
      N('Composer', 'Mozart', 'Bach', 'Beethoven', 'Chopin'),
      N('Orchestra', N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'), 'Brass', 'Woodwind', 'Percussion'),
      'Symphony', 'Opera'),
    // more fusion chains
    N('Band', N('Guitar', 'Acoustic', 'Electric', 'Bass', 'Slide'), 'Drums', 'Keyboard', 'Microphone'),
    // 4 levels, 13 tiles
    N('Entertainment', N('Music', N('Instruments', N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'), 'Trumpet', 'Flute', 'Piano'), 'Jazz', 'Rock', 'Opera'), 'Cinema', 'Theatre', 'Circus'),
    N('Music Terms', 'Tempo', 'Chord', 'Rhythm', 'Melody'),
    N('Singing Voices', 'Soprano', 'Alto', 'Tenor', 'Baritone'),
    N('Keyboard Instruments', 'Piano', 'Organ', 'Synthesizer', 'Accordion'),
    N('Dance Styles', 'Waltz', 'Tango', 'Salsa', 'Ballet'),
    N('Sheet Music', 'Clef', 'Stave', 'Sharp', 'Rest'),
    N('Music Venues', 'Stage', 'Studio', 'Arena', 'Auditorium'),
    N('Tempo Markings', 'Allegro', 'Adagio', 'Presto', 'Largo'),
    N('Band Lineup', 'Singer', 'Guitarist', 'Drummer', 'Bassist'),
    // deep chains (4 levels): 13 and 16 tiles
    N('Sound', N('Music', N('Instrument', N('Drum', 'Snare', 'Bongo', 'Timpani', 'Conga'), 'Piano', 'Guitar', 'Flute'), 'Song', 'Opera', 'Hymn'), 'Noise', 'Silence', 'Echo'),
    N('Concert', N('Performers', N('Orchestra', N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'), 'Brass', 'Woodwind', 'Percussion'), 'Soloist', 'Choir', 'Band'), N('Venue', 'Hall', 'Arena', 'Studio', 'Stadium'), 'Ticket', 'Encore'),
  ]},
  { title: 'Game On', trees: [
    N('Sports', N('Martial Arts', 'Judo', 'Karate', 'Aikido', 'Kendo'), 'Tennis', 'Golf', 'Rugby'),
    N('Olympic Games',
      N('Water Sports', 'Rowing', 'Surfing', 'Diving', 'Sailing'),
      N('Athletics', 'Sprint', 'Hurdles', 'Marathon', 'Javelin'),
      'Boxing', 'Gymnastics'),
    // 3 levels, 10 tiles
    N('All Sports',
      N('Ball Games', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'),
      'Swimming', 'Cycling', 'Archery'),
    // 3 levels, 16 tiles
    N('Sport',
      N('Ball Games', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'),
      N('Combat Sports', N('Martial Arts', 'Judo', 'Karate', 'Aikido', 'Kendo'), 'Boxing', 'Wrestling', 'Fencing'),
      'Swimming', 'Cycling'),
    // more fusion chains
    N('Games', N('Board Game', 'Chess', 'Monopoly', 'Scrabble', 'Cluedo'), 'Poker', 'Darts', 'Snooker'),
    N('Board Games', 'Chess', 'Monopoly', 'Scrabble', 'Cluedo'),
    N('Card Games', 'Poker', 'Bridge', 'Rummy', 'Snap'),
    N('Sports Equipment', 'Racket', 'Helmet', 'Goggles', 'Whistle'),
    N('Video Games', 'Minecraft', 'Tetris', 'Fortnite', 'Zelda'),
    N('Chess Pieces', 'Bishop', 'Rook', 'Pawn', 'Knight'),
    N('Winter Sports', 'Skiing', 'Curling', 'Luge', 'Bobsled'),
    N('Sports Officials', 'Referee', 'Umpire', 'Linesman', 'Judge'),
    N('Trophies', 'Medal', 'Cup', 'Trophy', 'Shield'),
    // deep chains (4 levels): 13, 16 and 19 tiles
    N('Leisure', N('Sport', N('Ball Game', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'), 'Swimming', 'Cycling', 'Archery'), 'Chess', 'Poker', 'Darts'),
    N('Olympics', N('Summer Events', N('Athletics', N('Track', 'Sprint', 'Hurdles', 'Marathon', 'Relay'), 'Javelin', 'Discus', 'Shot Put'), 'Swimming', 'Gymnastics', 'Rowing'), N('Winter Events', 'Skiing', 'Curling', 'Luge', 'Bobsled'), 'Torch', 'Medal'),
    N('Pastimes', N('Sport', N('Ball Game', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'), 'Swimming', 'Cycling', 'Archery'), N('Board Games', 'Chess', 'Monopoly', 'Scrabble', 'Cluedo'), N('Card Games', 'Poker', 'Bridge', 'Rummy', 'Snap'), 'Darts'),
  ]},
  { title: 'Around Town', trees: [
    N('Buildings', N('Home', 'House', 'Flat', 'Bungalow', 'Cottage'), 'School', 'Hospital', 'Library'),
    N('Town Life',
      N('Shops', 'Bakery', 'Pharmacy', 'Florist', 'Butcher'),
      N('Public Transport', 'Tram', 'Bus', 'Metro', 'Ferry'),
      'Park', 'Museum'),
    // 3 levels, 10 tiles
    N('Town Centre',
      N('Shopping', N('Shops', 'Bakery', 'Pharmacy', 'Florist', 'Butcher'), 'Market', 'Mall', 'Kiosk'),
      'Library', 'Cinema', 'Museum'),
    // 3 levels, 16 tiles
    N('Downtown',
      N('Shopping', N('Shops', 'Bakery', 'Pharmacy', 'Florist', 'Butcher'), 'Market', 'Mall', 'Kiosk'),
      N('Entertainment', N('Culture', 'Museum', 'Library', 'Gallery', 'Theatre'), 'Cinema', 'Arcade', 'Bowling'),
      'Station', 'Bank'),
    // more fusion chains
    N('Parks', N('Playground', 'Swing', 'Slide', 'Seesaw', 'Roundabout'), 'Pond', 'Bench', 'Fountain'),
    N('Street Furniture', 'Bench', 'Lamppost', 'Bin', 'Bollard'),
    N('Roads', 'Avenue', 'Lane', 'Boulevard', 'Crescent'),
    N('Emergency Services', 'Police', 'Fire Brigade', 'Ambulance', 'Coastguard'),
    N('Banking', 'Deposit', 'Loan', 'Balance', 'Interest'),
    N('Local Workers', 'Postman', 'Plumber', 'Barber', 'Mechanic'),
    N('Eateries', 'Cafe', 'Diner', 'Bistro', 'Canteen'),
    N('Places of Worship', 'Church', 'Mosque', 'Temple', 'Synagogue'),
    N('In the Park', 'Fountain', 'Playground', 'Pond', 'Bandstand'),
    // deep chains (4 levels): 13, 16 and 19 tiles
    N('City', N('Downtown', N('Shopping Street', N('Shops', 'Bakery', 'Pharmacy', 'Florist', 'Butcher'), 'Market', 'Mall', 'Kiosk'), 'Library', 'Cinema', 'Museum'), 'Park', 'Station', 'Bank'),
    N('Town', N('Community', N('Public Services', N('Emergency Services', 'Police', 'Fire Brigade', 'Ambulance', 'Coastguard'), 'Post Office', 'Council', 'Courthouse'), 'School', 'Church', 'Market'), N('Homes', 'House', 'Flat', 'Bungalow', 'Cottage'), 'Park', 'Bridge'),
    N('Neighbourhood', N('Local Area', N('Dining Out', N('Eateries', 'Cafe', 'Diner', 'Bistro', 'Canteen'), 'Takeaway', 'Food Truck', 'Buffet'), 'Gym', 'Salon', 'Launderette'), N('Roads', 'Avenue', 'Lane', 'Boulevard', 'Crescent'), N('Homes', 'House', 'Flat', 'Bungalow', 'Cottage'), 'Park'),
  ]},
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

function validate() {
  const problems = [];
  PACKS.forEach((p) => p.trees.forEach((t) => {
    try {
      const m = measure(t);
      const seen = new Set();
      m.words.concat(m.names).forEach((x) => {
        if (seen.has(lc(x))) problems.push('"' + t.name + '": duplicate word/group name "' + x + '"');
        seen.add(lc(x));
      });
    } catch (e) { problems.push(e.message); }
  }));
  return problems;
}

// Flat list the server picks from.
const ALL = [];
PACKS.forEach((p) => p.trees.forEach((root) => ALL.push(Object.assign({ pack: p.title, root }, measure(root)))));

// ---------------------------------------------------------------------------
// Building a board: a FIXED number of starting tiles per difficulty (4 columns x N rows)
// ---------------------------------------------------------------------------
// tiles = starting tiles, roots = how many top-level groups the board has (one of these numbers is picked per round).
// EVERY level contains at least one fusion chain that is MIN_DEPTH (4) levels deep.
// (A group of 4 words is a tree with 1 level; a tree with G groups in total has 3*G+1 words.)
const LEVEL_SPECS = {
  1: { tiles: 16, rows: 4, roots: [1] },       // 4 x 4: one deep chain fills the whole board
  2: { tiles: 20, rows: 5, roots: [2] },       // 4 x 5
  3: { tiles: 24, rows: 6, roots: [3] },       // 4 x 6
  4: { tiles: 28, rows: 7, roots: [4] },       // 4 x 7
  5: { tiles: 32, rows: 8, roots: [2, 5] },    // 4 x 8: either two huge chains or five groups
};
const MIN_DEPTH = 4;
const keysOf = (p) => p.words.concat(p.names).map(lc);
const shuffled = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Returns { title, roots:[tree, ...] } - no word or group name repeats anywhere on the board, the tile count is exact,
// and at least one group is a MIN_DEPTH-level chain. `recent` (a Set of group names) is avoided when possible.
function compose(level, pack, recent) {
  const spec = LEVEL_SPECS[level] || LEVEL_SPECS[2];
  recent = recent || new Set();
  const attempt = (pool, avoidRecent) => {
    for (let i = 0; i < 600; i++) {
      const R = spec.roots[Math.floor(Math.random() * spec.roots.length)];
      const picks = [], used = new Set(); let remaining = spec.tiles, ok = true;
      for (let slot = 0; slot < R; slot++) {
        const slotsLeft = R - slot - 1;
        const c = shuffled(pool).find((p) =>
          (slot > 0 || p.levels >= MIN_DEPTH) &&                  // the first group is always a deep chain
          p.leaves + 4 * slotsLeft <= remaining &&                // leave room for the other groups
          (slotsLeft > 0 || p.leaves === remaining) &&            // the last group makes the count exact
          !picks.includes(p) && !(avoidRecent && recent.has(p.root.name)) &&
          keysOf(p).every((x) => !used.has(x)));
        if (!c) { ok = false; break; }
        picks.push(c); keysOf(c).forEach((x) => used.add(x)); remaining -= c.leaves;
      }
      if (ok && remaining === 0) return picks;
    }
    return null;
  };
  const inPack = pack && pack !== 'mixed' ? ALL.filter((p) => p.pack === pack) : null;
  let picks = null;
  if (inPack) picks = attempt(inPack, true) || attempt(inPack, false);
  if (!picks) picks = attempt(ALL, true) || attempt(ALL, false);
  if (!picks) throw new Error('Could not build a board for level ' + level);
  const packs = new Set(picks.map((p) => p.pack));
  return { title: packs.size === 1 ? picks[0].pack : 'Mixed Board', roots: shuffled(picks).map((p) => p.root) };
}

module.exports = { PACKS, ALL, measure, validate, compose, LEVEL_SPECS };
