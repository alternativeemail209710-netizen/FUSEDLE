/**
 * FUSEDLE puzzle library - MULTI-LEVEL FUSION TREES
 *
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
      if (m.levels < 2) problems.push('"' + t.name + '": only ' + m.levels + ' level - needs 2 or more');
    } catch (e) { problems.push(e.message); }
  }));
  return problems;
}

// Flat list the server picks from.
const ALL = [];
PACKS.forEach((p) => p.trees.forEach((root) => ALL.push(Object.assign({ pack: p.title, root }, measure(root)))));

module.exports = { PACKS, ALL, measure, validate };
