/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

class DSNHelper {
  static rollAllDice() {
    if (!game.dice3d) {
      ui.notifications.info(game.i18n.localize('HEXXEN.modules.noDiceSoNice'));
      return;
    }

    const hexxenDice = Object.keys(CONFIG.Dice.terms).filter(k => /^h[a-zA-Z]$/.test(k));
    const diceCount = hexxenDice.length * 6;

    if (game.settings.get('dice-so-nice', 'maxDiceNumber') < diceCount) {
      ui.notifications.info(game.i18n.format('HEXXEN.modules.warnDiceLimit', {count: diceCount}));
      return;
    }

    for (const dice of hexxenDice) {
      const rollData = {
        throws:[{
          dice:[
            { result: 1, type: `d${dice}`,vectors: [], options: {} },
            { result: 2, type: `d${dice}`,vectors: [], options: {} },
            { result: 3, type: `d${dice}`,vectors: [], options: {} },
            { result: 4, type: `d${dice}`,vectors: [], options: {} },
            { result: 5, type: `d${dice}`,vectors: [], options: {} },
            { result: 6, type: `d${dice}`,vectors: [], options: {} }
          ]
        }]
      };
      game.dice3d.show(rollData);
    }
  }

  static rollAllFaces(no2D = false) {
    if (!game.dice3d) {
      ui.notifications.info(game.i18n.localize('HEXXEN.modules.noDiceSoNice'));
      return;
    }
    const rollData = [
      {result:2,type: "dhh",vectors:[],options:{}},
      {result:5,type: "dhh",vectors:[],options:{}},
      {result:1,type: "dhh",vectors:[],options:{}},
      {result:1,type: "dhg",vectors:[],options:{}},
      {result:4,type: "dhg",vectors:[],options:{}},
      {result:1,type: "dhj",vectors:[],options:{}},
      {result:4,type: "dhj",vectors:[],options:{}},
      {result:1,type: "dhm",vectors:[],options:{}},
      {result:4,type: "dhm",vectors:[],options:{}},
      {result:3,type: "dhs",vectors:[],options:{}},
      {result:4,type: "dhs",vectors:[],options:{}},
      {result:6,type: "dhs",vectors:[],options:{}},
      {result:1,type: "dhs",vectors:[],options:{}},
      {result:1,type: "dhb",vectors:[],options:{}},
      {result:2,type: "dhb",vectors:[],options:{}},
      {result:4,type: "dhb",vectors:[],options:{}},
      {result:6,type: "dhb",vectors:[],options:{}},
      {result:1,type: "dhe",vectors:[],options:{}},
      {result:2,type: "dhe",vectors:[],options:{}},
      {result:3,type: "dhe",vectors:[],options:{}},
      {result:4,type: "dhe",vectors:[],options:{}},
      {result:5,type: "dhe",vectors:[],options:{}}
    ];
    if (!no2D) {
      rollData.push(...[
        {result:1,type: "dhf",vectors:[],options:{}},
        {result:2,type: "dhf",vectors:[],options:{}},
        {result:3,type: "dhf",vectors:[],options:{}},
        {result:4,type: "dhf",vectors:[],options:{}},
        {result:5,type: "dhf",vectors:[],options:{}}
      ]);
    }

    const diceCount = rollData.length;

    if (game.settings.get('dice-so-nice', 'maxDiceNumber') < diceCount) {
      ui.notifications.info(game.i18n.format('HEXXEN.modules.warnDiceLimit', {count: diceCount}));
      return;
    }

    game.dice3d.show({ throws:[{ dice: rollData }] });
  }
}

// FIXME: namen und beschreibungen übersetzen
Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id: 'hexxen-1733-3d', name: 'HeXXen 1733 3D-Wurfel'}, 'exclusive');
  dice3d.addSystem({id: 'hexxen-1733-pic', name: 'HeXXen 1733'}, 'exclusive');
  dice3d.addSystem({id: 'hexxen-1733-label', name: 'HeXXen 1733 Einfach'}, 'exclusive');

  dice3d.addColorset({
    name: 'hexxen-token',
    description: 'Hexxen Token',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#a3733b',
    outline: '#efd6ac',
    edge: '#332612',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${HexxenDie.DENOMINATION}`,
    description: 'Hexxen Spielerwürfel',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#4a663e',
    outline: '#846a75',
    edge: '#40461a',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${GamemasterDie.DENOMINATION}`,
    description: 'Hexxen Gamemasterwürfel',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#4a663e',
    outline: '#846a75',
    edge: '#40461a',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${JanusBonusDie.DENOMINATION}`,
    description: 'Hexxen Bonuswürfel',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#989898',
    outline: '#b4b4b4',
    edge: '#6d6d6d',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${JanusMalusDie.DENOMINATION}`,
    description: 'Hexxen Maluswürfel',
    category: 'HeXXen 1733',
    foreground: '#c5c5c5',
    background: '#535353',
    outline: '#6e6e6e',
    edge: '#5c5c5c',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${SegnungsDie.DENOMINATION}`,
    description: 'Hexxen Segnungswürfel',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#b6843c',
    outline: '#edcf8c',
    edge: '#7a4c14',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${BlutDie.DENOMINATION}`,
    description: 'Hexxen Blutwürfel',
    category: 'HeXXen 1733',
    foreground: '#000',
    background: '#c92f23',
    outline: '#f57067',
    edge: '#a4371f',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${ElixierDie.DENOMINATION}`,
    description: 'Hexxen Fluchwürfel',
    category: 'HeXXen 1733',
    foreground: '#fff',
    background: '#467195',
    outline: '#b4b9bd',
    edge: '#1d3550',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: `hexxen-${FluchDie.DENOMINATION}`,
    description: 'Hexxen Fluchwürfel',
    category: 'HeXXen 1733',
    foreground: '#fff',
    background: '#8f5e3f',
    outline: '#e7dc0e',
    edge: '#6d4730',
    texture: 'none',
    material: 'plastic'
  });

  // TODO: Spielerfarbe an den Würfelecken darstellen??

  const modelPath = 'systems/hexxen-1733/img/dice/3d';
  const models = {};
  models[HexxenDie.DENOMINATION] = 'player_dice.gltf';
  models[GamemasterDie.DENOMINATION] = 'gm_dice.gltf';
  models[JanusBonusDie.DENOMINATION] = 'janus_bonus_dice.gltf';
  models[JanusMalusDie.DENOMINATION] = 'janus_malus_dice.gltf';
  models[SegnungsDie.DENOMINATION] = 'blessing_dice.gltf';
  models[BlutDie.DENOMINATION] = 'blood_dice.gltf';
  models[ElixierDie.DENOMINATION] = 'elixir_dice.gltf';
  models[FluchDie.DENOMINATION] = 'elixir_dice.gltf'; // TODO: eigenes Fluch-Model??

  for (const system of ['3d', 'pic', 'label']) {

    for (const k of Object.keys(CONFIG.Dice.terms).filter(k => HexxenResourceTerm.isPrototypeOf(CONFIG.Dice.terms[k]))) {
      const term = CONFIG.Dice.terms[k];
      dice3d.addDicePreset({
        type: `d${term.DENOMINATION}`,
        labels: ['pic', '3d'].includes(system) ? term.IMGS.map(i => `${term.path}/${i}`) : term.LABELS,
        colorset: 'hexxen-token',
        // no 3D model
        system: `hexxen-1733-${system}`
      }, 'd2');
    }

    for (const k of Object.keys(CONFIG.Dice.terms).filter(k => HexxenDiceTerm.isPrototypeOf(CONFIG.Dice.terms[k]))) {
      const term = CONFIG.Dice.terms[k];
      const key = term.DENOMINATION;
      dice3d.addDicePreset({
        type: `d${key}`,
        labels: 'pic' === system ?  term.IMGS.map(i => `${term.path}/${i}`) : term.LABELS,
        colorset: `hexxen-${key}`,
        modelFile: '3d' === system ? `${modelPath}/${models[key]}` : undefined,
        system: `hexxen-1733-${system}`
      }, 'd6');
    }
  }
});
