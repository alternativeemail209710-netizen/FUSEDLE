/**
 * FUSEDLE puzzle library - MULTI-LEVEL FUSION TREES (2-level and 3-level boards)
 *
 * A board has a fixed number of starting tiles per difficulty (16, 20, 24, 28, 32 = 4 columns x 4 to 8 rows).
 *   Difficulty 1 and 2  ->  every group on the board is a 2-level fusion chain
 *   Difficulty 3, 4, 5  ->  the board is built from 3-level fusion chains
 * Every group ("node") has EXACTLY 4 children. A child is either
 *   - a plain word  (it becomes a starting tile on the board), or
 *   - another group (it only exists once players have fused it).
 *
 * Example of a 2-level chain:
 *   N('Transportation', N('Car','Ford','Toyota','Honda','BMW'), 'Boat','Plane','Train')
 *   Level 1:  Ford + Toyota + Honda + BMW  ->  fuse into a NEW tile "Car"  (new tile number)
 *   Level 2:  that "Car" tile + Boat + Plane + Train  ->  "Transportation"  (group done)
 *
 * You can write trees of any depth in the lists below. The game automatically cuts them into their 1-, 2- and 3-level
 * pieces and uses the pieces that fit the difficulty (anything deeper than 3 levels is split, never used whole).
 * Each pack also has `umbrellas` (broad top names) and `extras` (loose words) that the game uses to assemble extra
 * 3-level chains, so boards keep their exact tile count. The server checks this file when it starts (see validate()).
 */
'use strict';

const N = (name, ...kids) => ({ name, kids });

const PACKS = [
  { title: 'Getting Around',
    umbrellas: ['Getting Around', 'Transport', 'Travel', 'On the Move', 'Journeys'],
    extras: ['Taxi', 'Subway', 'Cable Car', 'Rocket', 'Segway', 'Rickshaw', 'Sleigh', 'Gondola'],
    trees: [
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
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 13, 16 and 16 tiles
    N('Transportation', N('Land Transport', N('Road Vehicle', N('Car', 'Ford', 'Toyota', 'Honda', 'BMW'), 'Bus', 'Truck', 'Motorbike'), 'Train', 'Tram', 'Bicycle'), 'Boat', 'Plane', 'Rocket'),
    N('Vehicles', N('Water Vehicle', N('Boat', N('Ship', 'Ferry', 'Yacht', 'Liner', 'Tanker'), 'Canoe', 'Kayak', 'Raft'), 'Submarine', 'Hovercraft', 'Jet Ski'), N('Aircraft', 'Jet', 'Glider', 'Helicopter', 'Blimp'), 'Bicycle', 'Skateboard'),
    N('Transport Hub', N('Transit', N('Railway Line', N('Train Types', 'Steam', 'Bullet', 'Maglev', 'Freight'), 'Platform', 'Signal', 'Sleeper'), 'Bus Stop', 'Taxi Rank', 'Tram Stop'), N('Airport Zone', 'Runway', 'Terminal', 'Hangar', 'Control Tower'), 'Port', 'Car Park'),
  ]},
  { title: 'Animal Kingdom',
    umbrellas: ['Animal Kingdom', 'Wildlife', 'Nature', 'The Living World', 'Creatures'],
    extras: ['Panda', 'Kangaroo', 'Penguin', 'Dolphin', 'Koala', 'Otter', 'Sloth', 'Camel'],
    trees: [
    N('Pets', N('Dog', 'Poodle', 'Beagle', 'Collie', 'Husky'), 'Rabbit', 'Hamster', 'Goldfish'),
    N('Farm Animals',
      N('Poultry', 'Chicken', 'Duck', 'Turkey', 'Goose'),
      N('Pig', 'Sow', 'Boar', 'Piglet', 'Hog'),
      'Sheep', 'Goat'),
    // 3 levels, 10 tiles
    N('Living Things',
      N('Animal', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Insect'),
      'Plant', 'Fungus', 'Bacteria'),
    // 4 levels, 13 tiles (split automatically)
    N('Life on Earth',
      N('Animal',
        N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'),
        'Insect', 'Spider', 'Worm'),
      'Plant', 'Fungus', 'Bacteria'),
    // more fusion chains
    N('Wild Animals', N('Big Cat', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'), 'Elephant', 'Giraffe', 'Hippo'),
    // 4 levels, 13 tiles (split automatically)
    N('Planet Earth', N('Land', N('Highlands', N('Mountain', 'Everest', 'Alps', 'Andes', 'Rockies'), 'Hill', 'Cliff', 'Plateau'), 'Desert', 'Forest', 'Island'), 'Ocean', 'River', 'Lake'),
    N('Big Cats', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'),
    N('Birds of Prey', 'Eagle', 'Falcon', 'Hawk', 'Owl'),
    N('Ocean Life', 'Octopus', 'Squid', 'Crab', 'Starfish'),
    N('Reptiles', 'Gecko', 'Iguana', 'Cobra', 'Crocodile'),
    N('Bugs', 'Beetle', 'Ant', 'Wasp', 'Dragonfly'),
    N('Baby Animals', 'Kitten', 'Puppy', 'Calf', 'Cub'),
    N('Animal Homes', 'Nest', 'Burrow', 'Hive', 'Den'),
    N('Primates', 'Gorilla', 'Chimp', 'Orangutan', 'Baboon'),
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 16, 19 and 16 tiles
    N('All Life', N('Animal', N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'), 'Insect', 'Spider', 'Worm'), N('Plant', 'Fern', 'Moss', 'Oak', 'Rose'), 'Fungus', 'Bacteria'),
    N('Biosphere', N('Animal', N('Vertebrate', N('Mammal', 'Lion', 'Whale', 'Bat', 'Zebra'), 'Bird', 'Fish', 'Reptile'), 'Insect', 'Spider', 'Worm'), N('Plant', 'Fern', 'Moss', 'Oak', 'Rose'), N('Fungus', 'Mushroom', 'Yeast', 'Mould', 'Truffle'), 'Bacteria'),
    N('Safari', N('Wild Animals', N('Predators', N('Big Cats', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah'), 'Wolf', 'Crocodile', 'Hyena'), 'Elephant', 'Giraffe', 'Hippo'), N('Primates', 'Gorilla', 'Chimp', 'Orangutan', 'Baboon'), 'Jeep', 'Binoculars'),
  ]},
  { title: 'Food & Drink',
    umbrellas: ['Food & Drink', 'On the Menu', 'Kitchen Table', 'Meals', 'Feast'],
    extras: ['Pizza', 'Sushi', 'Soup', 'Salad', 'Honey', 'Noodles', 'Burger', 'Waffle'],
    trees: [
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
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 13, 19, 16 and 16 tiles
    N('Food', N('Fresh Produce', N('Fruit', N('Citrus', 'Orange', 'Lemon', 'Lime', 'Grapefruit'), 'Apple', 'Banana', 'Mango'), 'Carrot', 'Lettuce', 'Onion'), 'Bread', 'Cheese', 'Rice'),
    N('Supermarket', N('Fresh Produce', N('Fruit', N('Citrus', 'Orange', 'Lemon', 'Lime', 'Grapefruit'), 'Apple', 'Banana', 'Mango'), 'Carrot', 'Lettuce', 'Onion'), N('Dairy', 'Milk', 'Butter', 'Yogurt', 'Cream'), N('Grain', 'Wheat', 'Oats', 'Barley', 'Rye'), 'Meat'),
    N('Menu', N('Drinks', N('Hot Drinks', N('Coffee', 'Latte', 'Espresso', 'Mocha', 'Cappuccino'), 'Tea', 'Cocoa', 'Chai'), 'Juice', 'Soda', 'Water'), N('Dessert', 'Cake', 'Pie', 'Trifle', 'Sorbet'), 'Starter', 'Main'),
    N('Kitchen', N('Cooking Ingredients', N('Pantry', N('Spices', 'Cumin', 'Paprika', 'Turmeric', 'Nutmeg'), 'Flour', 'Sugar', 'Salt'), 'Egg', 'Butter', 'Oil'), N('Cooking Methods', 'Bake', 'Grill', 'Steam', 'Poach'), 'Pot', 'Pan'),
  ]},
  { title: 'Music Room',
    umbrellas: ['Music Room', 'Music World', 'Melody', 'Concert Hall', 'Making Music'],
    extras: ['Harmony', 'Album', 'Lyrics', 'Choir', 'Encore', 'Playlist', 'Vinyl', 'Karaoke'],
    trees: [
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
    // 4 levels, 13 tiles (split automatically)
    N('Entertainment', N('Music', N('Instruments', N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'), 'Trumpet', 'Flute', 'Piano'), 'Jazz', 'Rock', 'Opera'), 'Cinema', 'Theatre', 'Circus'),
    N('Music Terms', 'Tempo', 'Chord', 'Rhythm', 'Melody'),
    N('Singing Voices', 'Soprano', 'Alto', 'Tenor', 'Baritone'),
    N('Keyboard Instruments', 'Piano', 'Organ', 'Synthesizer', 'Accordion'),
    N('Dance Styles', 'Waltz', 'Tango', 'Salsa', 'Ballet'),
    N('Sheet Music', 'Clef', 'Stave', 'Sharp', 'Rest'),
    N('Music Venues', 'Stage', 'Studio', 'Arena', 'Auditorium'),
    N('Tempo Markings', 'Allegro', 'Adagio', 'Presto', 'Largo'),
    N('Band Lineup', 'Singer', 'Guitarist', 'Drummer', 'Bassist'),
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 13 and 16 tiles
    N('Sound', N('Music', N('Instrument', N('Drum', 'Snare', 'Bongo', 'Timpani', 'Conga'), 'Piano', 'Guitar', 'Flute'), 'Song', 'Opera', 'Hymn'), 'Noise', 'Silence', 'Echo'),
    N('Concert', N('Performers', N('Orchestra', N('Strings', 'Violin', 'Cello', 'Harp', 'Viola'), 'Brass', 'Woodwind', 'Percussion'), 'Soloist', 'Choir', 'Band'), N('Venue', 'Hall', 'Arena', 'Studio', 'Stadium'), 'Ticket', 'Encore'),
  ]},
  { title: 'Game On',
    umbrellas: ['Game On', 'Play Time', 'Sport and Play', 'Competition', 'Fun and Games'],
    extras: ['Coach', 'Goal', 'Score', 'Team', 'Match', 'Podium', 'Pitch', 'Fans'],
    trees: [
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
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 13, 16 and 19 tiles
    N('Leisure', N('Sport', N('Ball Game', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'), 'Swimming', 'Cycling', 'Archery'), 'Chess', 'Poker', 'Darts'),
    N('Olympics', N('Summer Events', N('Athletics', N('Track', 'Sprint', 'Hurdles', 'Marathon', 'Relay'), 'Javelin', 'Discus', 'Shot Put'), 'Swimming', 'Gymnastics', 'Rowing'), N('Winter Events', 'Skiing', 'Curling', 'Luge', 'Bobsled'), 'Torch', 'Medal'),
    N('Pastimes', N('Sport', N('Ball Game', N('Racket Sports', 'Tennis', 'Squash', 'Badminton', 'Padel'), 'Football', 'Cricket', 'Rugby'), 'Swimming', 'Cycling', 'Archery'), N('Board Games', 'Chess', 'Monopoly', 'Scrabble', 'Cluedo'), N('Card Games', 'Poker', 'Bridge', 'Rummy', 'Snap'), 'Darts'),
  ]},
  { title: 'Around Town',
    umbrellas: ['Around Town', 'City Life', 'Local Area', 'Urban Life', 'Main Street'],
    extras: ['Statue', 'Pavement', 'Traffic Light', 'Harbour', 'Square', 'Tower', 'Taxi', 'Cinema'],
    trees: [
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
    // source chains (4 levels, split automatically into 2- and 3-level pieces): 13, 16 and 19 tiles
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

// ---------------------------------------------------------------------------
// The piece pool: every group in the lists above (at any depth) that is 1, 2 or 3 levels deep, per pack.
// ---------------------------------------------------------------------------
const MAX_DEPTH = 3;
const POOL = {};   // pack title -> { d1:[], d2:[], d3:[], umbrellas:[], extras:[] }
const ALL = [];    // every piece (flat)
PACKS.forEach((p) => {
  const pool = { d1: [], d2: [], d3: [], umbrellas: p.umbrellas || [], extras: p.extras || [] };
  const seen = new Set();
  const visit = (node) => {
    let m;
    try { m = measure(node); } catch (e) { return; }
    if (m.levels <= MAX_DEPTH) {
      const sig = JSON.stringify(node);
      if (!seen.has(sig)) {
        seen.add(sig);
        const piece = Object.assign({ pack: p.title, root: node }, m);
        pool['d' + m.levels].push(piece);
        ALL.push(piece);
      }
    }
    node.kids.forEach((k) => { if (typeof k !== 'string') visit(k); });
  };
  p.trees.forEach(visit);
  POOL[p.title] = pool;
});

// ---------------------------------------------------------------------------
// Building a board: a FIXED number of starting tiles per difficulty (4 columns x N rows)
// ---------------------------------------------------------------------------
// A plan is a list of [levels, tiles] slots. A tree with G groups in total has 3*G+1 words, so a 2-level chain has
// 7, 10, 13 or 16 tiles and a 3-level chain has 10 or more. One of the plans is picked at random each round.
//   Difficulty 1 and 2: only 2-level chains.
//   Difficulty 4 and 5: only 3-level chains.
//   Difficulty 3: 24 tiles cannot be split into three-or-more 3-level chains (that needs at least 30 tiles), so it always has
//   a 3-level chain and the remaining tiles are made of one more 3-level chain plus a plain group, or two 2-level chains.
const LEVEL_SPECS = {
  1: { tiles: 16, rows: 4, plans: [[[2, 16]]] },
  2: { tiles: 20, rows: 5, plans: [[[2, 10], [2, 10]], [[2, 7], [2, 13]]] },
  3: { tiles: 24, rows: 6, plans: [[[3, 10], [2, 7], [2, 7]], [[3, 10], [3, 10], [1, 4]]] },
  4: { tiles: 28, rows: 7, plans: [[[3, 28]]] },
  5: { tiles: 32, rows: 8, plans: [[[3, 16], [3, 16]], [[3, 10], [3, 22]], [[3, 13], [3, 19]]] },
};
const keysOf = (p) => p.words.concat(p.names).map(lc);
const shuffled = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const pieceOf = (pack, root) => Object.assign({ pack, root }, measure(root));
const free = (p, used) => keysOf(p).every((x) => !used.has(x));

// Assemble a new group from loose parts of one pack. depth 2: an umbrella over 1-4 plain groups (+ loose words).
// depth 3: an umbrella over 1-4 two-level chains, plus plain groups / loose words, so the tile count is exact.
function assemble(pack, depth, leaves, used, recent, avoidRecent) {
  const pool = POOL[pack];
  if (!pool) return null;
  for (let i = 0; i < 250; i++) {
    let kids = [];
    if (depth === 2) {
      const s = (leaves - 4) / 3;
      if (!Number.isInteger(s) || s < 1 || s > 4) return null;
      const groups = shuffled(pool.d1).slice(0, s);
      const words = shuffled(pool.extras).slice(0, 4 - s);
      kids = groups.concat(words);
    } else if (depth === 3) {
      const a = 1 + Math.floor(Math.random() * 4);
      const b = Math.floor(Math.random() * (4 - a + 1));
      const c = 4 - a - b;
      kids = shuffled(pool.d2).slice(0, a).concat(shuffled(pool.d1).slice(0, b), shuffled(pool.extras).slice(0, c));
    } else return null;
    if (kids.length !== 4) continue;
    const pieces = kids.map((k) => (typeof k === 'string' ? null : (k.root ? k : null)));
    const total = kids.reduce((n, k) => n + (typeof k === 'string' ? 1 : k.leaves), 0);
    if (total !== leaves) continue;
    const local = new Set(used);
    let ok = true;
    kids.forEach((k) => {
      const keys = typeof k === 'string' ? [lc(k)] : keysOf(k);
      keys.forEach((x) => { if (local.has(x)) ok = false; local.add(x); });
    });
    if (!ok) continue;
    const name = shuffled(pool.umbrellas).find((u) => !local.has(lc(u)) && !(avoidRecent && recent.has(u)));
    if (!name) continue;
    const root = { name, kids: kids.map((k) => (typeof k === 'string' ? k : k.root)) };
    void pieces;
    const piece = pieceOf(pack, root);
    if (piece.levels !== depth || piece.leaves !== leaves || !free(piece, used)) continue;
    return piece;
  }
  return null;
}

// Find one tree for a slot [depth, leaves]: a ready-made piece, or an assembled one.
function fillSlot(packs, depth, leaves, used, picked, recent, avoidRecent) {
  const order = shuffled(packs);
  const tryReady = () => {
    for (const pk of order) {
      const c = shuffled(POOL[pk]['d' + depth]).find((p) =>
        p.leaves === leaves && !picked.includes(p.root.name) &&
        !(avoidRecent && recent.has(p.root.name)) && free(p, used));
      if (c) return c;
    }
    return null;
  };
  const tryAssemble = () => {
    if (depth < 2) return null;
    for (const pk of order) {
      const c = assemble(pk, depth, leaves, used, recent, avoidRecent);
      if (c) return c;
    }
    return null;
  };
  return Math.random() < 0.35 ? (tryAssemble() || tryReady()) : (tryReady() || tryAssemble());
}

// Returns { title, roots:[tree, ...] } - no word or group name repeats anywhere on the board, the tile count is exact,
// and every group has the number of levels that the difficulty asks for. `recent` (a Set of names) is avoided when possible.
function compose(level, pack, recent) {
  const spec = LEVEL_SPECS[level] || LEVEL_SPECS[2];
  recent = recent || new Set();
  const attempt = (packs, avoidRecent) => {
    for (let i = 0; i < 80; i++) {
      const plan = spec.plans[Math.floor(Math.random() * spec.plans.length)];
      const used = new Set(), picked = [], picks = [];
      let ok = true;
      // fill the deepest / biggest slots first so they get the pick of the pool
      const slots = plan.slice().sort((a, b) => b[0] - a[0] || b[1] - a[1]);
      for (const [depth, leaves] of slots) {
        const c = fillSlot(packs, depth, leaves, used, picked, recent, avoidRecent);
        if (!c) { ok = false; break; }
        picks.push(c); picked.push(c.root.name); keysOf(c).forEach((x) => used.add(x));
      }
      if (ok) return picks;
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
  PACKS.forEach((p) => {
    if (!Array.isArray(p.umbrellas) || p.umbrellas.length < 3) problems.push('Pack "' + p.title + '" needs at least 3 umbrellas names');
    if (!Array.isArray(p.extras) || p.extras.length < 6) problems.push('Pack "' + p.title + '" needs at least 6 extras words');
  });
  Object.keys(LEVEL_SPECS).forEach((lv) => {
    const sp = LEVEL_SPECS[lv];
    sp.plans.forEach((plan) => {
      const sum = plan.reduce((n, s) => n + s[1], 0);
      if (sum !== sp.tiles) problems.push('Level ' + lv + ': a plan adds up to ' + sum + ' tiles, not ' + sp.tiles);
    });
  });
  if (!problems.length) {
    // dry run: every difficulty must be buildable in every pack and in Mixed
    Object.keys(LEVEL_SPECS).forEach((lv) => {
      ['mixed'].concat(PACKS.map((p) => p.title)).forEach((pk) => {
        for (let i = 0; i < 5; i++) {
          try { compose(Number(lv), pk, new Set()); } catch (e) { problems.push('Level ' + lv + ' / ' + pk + ': ' + e.message); break; }
        }
      });
    });
  }
  return problems;
}

module.exports = { PACKS, ALL, POOL, measure, validate, compose, LEVEL_SPECS };
