Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id: 'hexxen-1733', name: 'HeXXen 1733'}, 'force'); // erzwingen, sonst könnte ein System eingestellt sein, das die Hexxenwürfel nicht kennt.

  dice3d.addColorset({
    name: 'hexxen',
    description: 'Hexxen',
    category: 'Colors',
    foreground: '#000',
    background: '#5b8a1c',
    outline: '#88cc28',
    edge: '#49431d',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: 'hexxen-blut',
    description: 'Hexxen Blutwürfel',
    category: 'Colors',
    foreground: '#000',
    background: '#d13923',
    outline: '#8b5047',
    edge: '#8b5047',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: 'hexxen-seg',
    description: 'Hexxen Segnungswürfel',
    category: 'Colors',
    foreground: '#000',
    background: '#ddc517',
    outline: '#928316',
    edge: '#928316',
    texture: 'none',
    material: 'plastic'
  });
  dice3d.addColorset({
    name: 'hexxen-fluch',
    description: 'Hexxen Fluchwürfel',
    category: 'Colors',
    foreground: '#fff',
    background: '#8f5e3f',
    outline: '#e7dc0e',
    edge: '#6d4730',
    texture: 'none',
    material: 'plastic'
  });

  dice3d.addDicePreset({
    type: "dhh", // Hexxen
    // labels: ['*', '', '', '', 'h', 'h'],
    labels: [
      'modules/special-dice-roller/public/images/hex/hesprit.png',
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/herfolg.png',
      'modules/special-dice-roller/public/images/hex/herfolg.png'
    ],
    colorset: 'hexxen',
    modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhg", // Gamemaster
    // labels: ['', '', '', 'h', 'h', 'h'],
    labels: [
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/hblank.png',
      'modules/special-dice-roller/public/images/hex/herfolg.png',
      'modules/special-dice-roller/public/images/hex/herfolg.png',
      'modules/special-dice-roller/public/images/hex/herfolg.png'
    ],
    colorset: 'hexxen',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhj", // Janus
    // labels: ['', '', '', 'j', 'j', 'j'],
    labels: [
      'modules/special-dice-roller/public/images/hex/jblank.png',
      'modules/special-dice-roller/public/images/hex/jblank.png',
      'modules/special-dice-roller/public/images/hex/jblank.png',
      'modules/special-dice-roller/public/images/hex/jdoppelkopf.png',
      'modules/special-dice-roller/public/images/hex/jdoppelkopf.png',
      'modules/special-dice-roller/public/images/hex/jdoppelkopf.png'
    ],
    colorset: 'hexxen-seg',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhs", // Segnung
    // labels: ['*', '*', '', 'h', 'h', 'hh'],
    labels: [
      'modules/special-dice-roller/public/images/hex/sesprit.png',
      'modules/special-dice-roller/public/images/hex/sesprit.png',
      'modules/special-dice-roller/public/images/hex/sblank.png',
      'modules/special-dice-roller/public/images/hex/serfolg.png',
      'modules/special-dice-roller/public/images/hex/serfolg.png',
      'modules/special-dice-roller/public/images/hex/sdoppelerfolg.png'
    ],
    colorset: 'hexxen-seg',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhb", // Blut
    // labels: ['', 'b', 'b', 'bb', 'bb', 'bbb'],
    labels: [
      'modules/special-dice-roller/public/images/hex/bblank.png',
      'modules/special-dice-roller/public/images/hex/beins.png',
      'modules/special-dice-roller/public/images/hex/beins.png',
      'modules/special-dice-roller/public/images/hex/bzwei.png',
      'modules/special-dice-roller/public/images/hex/bzwei.png',
      'modules/special-dice-roller/public/images/hex/bdrei.png'
    ],
    colorset: 'hexxen-blut',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhe", // Elixir
    // labels: ['1', '2', '3', '4', '5', '3'],
    labels: [
      'modules/special-dice-roller/public/images/hex/eeins.png',
      'modules/special-dice-roller/public/images/hex/ezwei.png',
      'modules/special-dice-roller/public/images/hex/edrei.png',
      'modules/special-dice-roller/public/images/hex/evier.png',
      'modules/special-dice-roller/public/images/hex/efuenf.png',
      'modules/special-dice-roller/public/images/hex/edrei.png'
    ],
    colorset: 'hexxen',
    // modelFile: "systems/hexxen-1733/img/elixier_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhf", // Fluch
    // labels: ['1', '2', '3', '4', '5', '3'],
    labels: [
      'modules/special-dice-roller/public/images/hex/feins.png',
      'modules/special-dice-roller/public/images/hex/fzwei.png',
      'modules/special-dice-roller/public/images/hex/fdrei.png',
      'modules/special-dice-roller/public/images/hex/fvier.png',
      'modules/special-dice-roller/public/images/hex/ffuenf.png',
      'modules/special-dice-roller/public/images/hex/fdrei.png'
    ],
    colorset: 'hexxen-fluch',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
});

