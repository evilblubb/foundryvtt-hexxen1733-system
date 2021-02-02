/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`${Hexxen.logPrefix}Initializing system`);

  // Register Handlebars helper for use in HTML templates
  HexxenHandlebarsHelper.registerHelpers();

  // Inject system logo and register listener to show an About dialog
  HexxenLogo.inject();

	// Define custom classes
  CONFIG.Actor.entityClass = HexxenActor;
  CONFIG.Item.entityClass = HexxenItem;
  CONFIG.Dice.rolls.push(HexxenRoll);
  CONFIG.Dice.terms.hh = HexxenDie;
  CONFIG.Dice.terms.hg = GamemasterDie;
  CONFIG.Dice.terms.hj = JanusDie;
  CONFIG.Dice.terms.hs = SegnungsDie;
  CONFIG.Dice.terms.hb = BlutDie;
  CONFIG.Dice.terms.he = ElixierDie;
  CONFIG.Dice.terms.hf = FluchDie;

  // Registering translation keys for Actors and Items
  Object.assign(CONFIG.Actor.typeLabels, {
    'character': 'HEXXEN.ACTORTYPE.character',
    'npc-leader': 'HEXXEN.ACTORTYPE.npc-leader',
    'npc-bande': 'HEXXEN.ACTORTYPE.npc-mob'
  });
  Object.assign(CONFIG.Item.typeLabels, {
    'item': 'HEXXEN.ITEMTYPE.item',
    'motivation': 'HEXXEN.ITEMTYPE.motivation',
    'npc-power': 'HEXXEN.ITEMTYPE.npc-power',
    'power': 'HEXXEN.ITEMTYPE.power',
    'profession': 'HEXXEN.ITEMTYPE.profession',
    'regulation': 'HEXXEN.ITEMTYPE.regulation',
    'role': 'HEXXEN.ITEMTYPE.role'
  });

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("hexxen", JaegerSheet, {
    label: game.i18n.localize('HEXXEN.PC-Sheet.Title'),
    types: ["character"],
    makeDefault: true
  });
  Actors.registerSheet("hexxen", NpcLeaderSheet, {
    label: game.i18n.localize('HEXXEN.NPC-Sheet.TitleLeaderDeprecated'),
    types: ["npc-leader"],
    makeDefault: true
  });
  Actors.registerSheet("hexxen", NpcBandeSheet, {
    label: game.i18n.localize('HEXXEN.NPC-Sheet.TitleMobDeprecated'),
    types: ["npc-bande"],
    makeDefault: true
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, {
    label: game.i18n.localize('HEXXEN.Item-Sheet.Title'),
    types: ["item"],
    makeDefault: true
  });
  Items.registerSheet("hexxen", RuleItemSheet, {
    label: game.i18n.localize('HEXXEN.RuleItem-Sheet.Title'),
    types: ["role", "profession", "motivation", "power", "regulation", "npc-power"],
    makeDefault: true
  });

  // Configure initiative for CombatTracker
	CONFIG.Combat.initiative = {
	  formula: "@ini.value",
    decimals: 1 // TODO: 0, sobald SC INI Vorrang im CombatTracker
  };

  // preload some images
  Hexxen.preload(
    `${Hexxen.basepath}/img/Hex_Pokerkarte_front_hell.png`,
    `${Hexxen.basepath}/img/Rabenkasten_oben_small_braun.png`,
    `${Hexxen.basepath}/img/Rabenkasten_weit_unten_small_braun.png`
  );

  // Register callbacks for macro creation
  Hooks.on('hotbarDrop', HexxenRollHelper.createMacro);

  // Inject application alignment code into FVTT event listener (entity-link)
  HexxenAppAlignmentHelper.registerSettings();
  HexxenAppAlignmentHelper.install();

  // Inject custom roll command
  HexxenSpecialCommandHelper.inject();

  console.log(`${Hexxen.logPrefix}Initialization done`);
});

Hooks.once("ready", async function() {
  console.log(`${Hexxen.logPrefix}Ready Hook called`);

  HexxenRollHelper.checkSystemReqirements();

  // preload compendium indexes
  HexxenCompendiumHelper.preloadIndexes();

  console.log(`${Hexxen.logPrefix}Ready Hook done`);
});

Hooks.once('diceSoNiceReady', (dice3d) => {
  dice3d.addSystem({id: 'hexxen-1733', name: 'HeXXen 1733'}, 'force'); // erzwingen, sonst könnte ein System eingestellt sein, das die Hexxenwürfel nicht kennt.

  dice3d.addColorset({
    name: 'hexxen',
    description: 'Hexxen',
    category: 'Colors',
    foreground: '#000',
    background: '#5b8a1c',
    outline: '#88cc28',
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
    labels: ['*', '', '', '', 'h', 'h'],
    colorset: 'hexxen',
    modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhg", // Gamemaster
    labels: ['', '', '', 'h', 'h', 'h'],
    colorset: 'hexxen',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhj", // Janus
    labels: ['', '', '', 'j', 'j', 'j'],
    colorset: 'hexxen-seg',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhs", // Segnung
    colorset: 'hexxen-seg',
    labels: ['*', '*', '', 'h', 'h', 'hh'],
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhb", // Blut
    labels: ['', 'b', 'b', 'bb', 'bb', 'bbb'],
    colorset: 'hexxen-blut',
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhe", // Elixir
    labels: ['1', '2', '3', '4', '5', '3'],
    // colorset: '',
    modelFile: "systems/hexxen-1733/img/elixier_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
  dice3d.addDicePreset({
    type: "dhf", // Fluch
    colorset: 'hexxen-fluch',
    labels: ['1', '2', '3', '4', '5', '3'],
    // modelFile: "systems/hexxen-1733/img/player_dice.gltf",
    system: "hexxen-1733"
  }, "d6");
});


class Hexxen {
  static get scope() {
    return game.system.id;
  }

  static get basepath() {
    // TODO: evtl. so machen: https://stackoverflow.com/questions/2255689/how-to-get-the-file-path-of-the-currently-executing-javascript-code/2255727
    return "/systems/" + Hexxen.scope + "/";
  }

  static get title() {
    return game.system.data.title;
  }

  static get logPrefix() {
    return `${this.title} | `;
  }

  static preload() {
    for (let i = 0; i < arguments.length; i++) {
      const img = arguments[i];
      console.log(`${Hexxen.logPrefix}Preloading ${img}`)
      const image = new Image();
      image.src = img;
    };
  }
}

class HexxenLogo {

  static inject() {
    // use jQuery to inject the logo into the DOM
    $("<a class='hexxen-logo'><img id='hexxen-logo' src='" + Hexxen.basepath + "img/HeXXen1733_scriptorium_small_outline.png' height='65px' /></a>")
        .insertAfter("img#logo");

    // TODO: eigenes left, #navigation left und #loading left/width dynamisch berechnen? Aktuell fix in hexxen.css eingetragen.

    $($.find("a.hexxen-logo")).on("click", () => { new HexxenAbout().render(true); } );
  }
}

class HexxenAbout extends Application {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "about"],
      id: "hexxen-about",
      title: "About Game System " + Hexxen.title,
      template: Hexxen.basepath + "templates/about.html",
      "hx-basepath": Hexxen.basepath,
      width: 600,
      height: 450
    });
  }

  getData() {
    return  { options: this.options };
  }
}
