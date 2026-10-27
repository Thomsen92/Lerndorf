const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../assets/collection');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'card-acquisition.json')));
const byId = new Map(catalog.cards.map(c => [c.id, c]));
const rewards = catalog.passCardRewards;
const expectedTiers = [...Array.from({length:20}, (_,i) => i+1),25,30,35,40];
assert.equal(byId.size, 50);
assert.deepEqual(rewards.map(r => r.tier), expectedTiers);
assert.equal(rewards.filter(r => r.cardIds.length === 1).length, 13);
assert.equal(rewards.filter(r => r.cardIds.length === 2).length, 11);
const passIds = rewards.flatMap(r => r.cardIds);
assert.equal(passIds.length, 35);
assert.equal(new Set(passIds).size, 35);
for (const row of rewards) for (const id of row.cardIds) {
  const card = byId.get(id);
  assert.ok(['normal','rare'].includes(card.rarity));
  assert.deepEqual(card.acquisition, {source:'learnpass',tier:row.tier,additionalToCoins:true,uniquePerPlayer:true});
}
const chestIds = catalog.acquisitionPolicy.chest.cardIds;
assert.equal(chestIds.length, 15);
assert.equal(new Set(chestIds).size, 15);
for (const id of chestIds) {
  const card = byId.get(id);
  assert.ok(['epic','legendary'].includes(card.rarity));
  assert.equal(card.acquisition.source, 'season-chest');
  assert.equal(card.acquisition.uniquePerPlayer, true);
  assert.ok(!passIds.includes(id));
}
assert.equal(new Set([...passIds,...chestIds]).size, 50);
assert.equal(catalog.acquisitionPolicy.duplicates, false);
assert.equal(catalog.acquisitionPolicy.ownershipLimit, 1);
assert.equal(catalog.acquisitionPolicy.chest.excludeOwnedBeforeDraw, true);
assert.equal(catalog.acquisitionPolicy.chest.cardHitRate, null);
assert.equal(catalog.acquisitionPolicy.chest.rarityWeights, null);
assert.deepEqual(catalog.cards.filter(c=>c.rarity==='legendary').map(c=>c.id), ['highlight-halloween-card']);
assert.equal(catalog.almanacCover.requiresCardOwnership, false);
assert.deepEqual(manifest.policy, catalog.acquisitionPolicy);
assert.deepEqual(manifest.passRewards, rewards);
assert.equal(manifest.seasonId, '2026-11-halloween');
console.log('PASS: 50 unique assignments; 35 Pass cards on 24 coin tiers; 15 Epic/Legendary chest cards; ownership limit 1; no invented chances. This validates metadata, not a live backend.');
