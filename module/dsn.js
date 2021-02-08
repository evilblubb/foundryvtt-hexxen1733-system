Hooks.once('diceSoNiceReady', (dice3d) => {
  const imgPath = 'modules/special-dice-roller/public/images/hex';
  const modelPath = 'systems/hexxen-1733/img/dice/3d';

  dice3d.addSystem({id: 'hexxen-1733-3d', name: 'HeXXen 1733 3D-Wurfel'}, 'exclusive');
  dice3d.addSystem({id: 'hexxen-1733-pic', name: 'HeXXen 1733'}, 'exclusive');
  dice3d.addSystem({id: 'hexxen-1733-label', name: 'HeXXen 1733 Einfach'}, 'exclusive');

  dice3d.addColorset({
    name: 'hexxen',
    description: 'Hexxen',
    category: 'HeXXen 1733',
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
    category: 'HeXXen 1733',
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
    category: 'HeXXen 1733',
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
    category: 'HeXXen 1733',
    foreground: '#fff',
    background: '#8f5e3f',
    outline: '#e7dc0e',
    edge: '#6d4730',
    texture: 'none',
    material: 'plastic'
  });

  // TODO: Spielerfarbe an den Würfelecken darstellen??

  for (system of ['3d', 'pic', 'label']) {
    dice3d.addDicePreset({
      type: `d${HexxenDie.DENOMINATION}`, // Hexxen
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/hesprit.png`, `${imgPath}/hblank.png`, `${imgPath}/hblank.png`,
        `${imgPath}/hblank.png`, `${imgPath}/herfolg.png`, `${imgPath}/herfolg.png`
      ] :
      ['*', '', '', '', '+', '+'],
      colorset: 'hexxen',
      modelFile: '3d' === system ? `${modelPath}/player_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${GamemasterDie.DENOMINATION}`, // Gamemaster
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/hblank.png`, `${imgPath}/hblank.png`, `${imgPath}/hblank.png`,
        `${imgPath}/herfolg.png`, `${imgPath}/herfolg.png`, `${imgPath}/herfolg.png`
      ] :
      ['', '', '', '+', '+', '+'],
      colorset: 'hexxen', // FIXME: angepasstes Farbset
      modelFile: '3d' === system ? `${modelPath}/gm_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${JanusBonusDie.DENOMINATION}`, // JanusBonus
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/jblank.png`, `${imgPath}/jblank.png`, `${imgPath}/jblank.png`,
        `${imgPath}/jdoppelkopf.png`, `${imgPath}/jdoppelkopf.png`, `${imgPath}/jdoppelkopf.png`
      ] :
      ['', '', '', '+', '+', '+'],
      colorset: 'hexxen-seg', // FIXME: angepasstes Farbset
      modelFile: '3d' === system ? `${modelPath}/janus_bonus_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${JanusMalusDie.DENOMINATION}`, // JanusMalus
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/jblank.png`, `${imgPath}/jblank.png`, `${imgPath}/jblank.png`,
        `${imgPath}/jdoppelkopf.png`, `${imgPath}/jdoppelkopf.png`, `${imgPath}/jdoppelkopf.png`
      ] :
      ['', '', '', '-', '-', '-'],
      colorset: 'hexxen-seg', // FIXME: angepasstes Farbset
      // TODO: Einstellung für unterschiedliche Würfelfarben Bonus/Malus
      modelFile: '3d' === system ? `${modelPath}/janus_malus_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${SegnungsDie.DENOMINATION}`, // Segnung
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/sesprit.png`, `${imgPath}/sesprit.png`, `${imgPath}/sblank.png`,
        `${imgPath}/serfolg.png`, `${imgPath}/serfolg.png`, `${imgPath}/sdoppelerfolg.png`
      ] :
      ['*', '*', '', '+', '+', '++'],
      colorset: 'hexxen-seg',
      modelFile: '3d' === system ? `${modelPath}/blessing_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${BlutDie.DENOMINATION}`, // Blut
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/bblank.png`, `${imgPath}/beins.png`, `${imgPath}/beins.png`,
        `${imgPath}/bzwei.png`, `${imgPath}/bzwei.png`, `${imgPath}/bdrei.png`
      ] :
      ['', 'b', 'b', 'bb', 'bb', 'bbb'],
      colorset: 'hexxen-blut',
      modelFile: '3d' === system ? `${modelPath}/blood_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${ElixierDie.DENOMINATION}`, // Elixier
      labels: 'pic' === system ?
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/eeins.png`, `${imgPath}/ezwei.png`, `${imgPath}/edrei.png`,
        `${imgPath}/evier.png`, `${imgPath}/efuenf.png`, `${imgPath}/edrei.png`
      ] :
      ['1e', '2e', '3e', '4e', '5e', '3e'],
      colorset: 'hexxen', // FIXME: angepasstes Farbset
      modelFile: '3d' === system ? `${modelPath}/elixir_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');

    dice3d.addDicePreset({
      type: `d${FluchDie.DENOMINATION}`, // Fluch
      labels: ['pic', '3d'].includes(system) ? // TODO: Fallback für 3D entfernen, sobald Modell vorhanden
      [
        // TODO: aus xxxDice abfragen
        `${imgPath}/feins.png`, `${imgPath}/fzwei.png`, `${imgPath}/fdrei.png`,
        `${imgPath}/fvier.png`, `${imgPath}/ffuenf.png`, `${imgPath}/fdrei.png`
      ] :
      ['1f', '2f', '3f', '4f', '5f', '3f'],
      colorset: 'hexxen-fluch',
      // modelFile: '3d' === system ? `${modelPath}/elixir_dice.gltf` : undefined,
      system: `hexxen-1733-${system}`
    }, 'd6');
  }
});
