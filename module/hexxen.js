/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${Hexxen.logPrefix}Initializing system`);

  // Register Handlebars helper for use in HTML templates
  HexxenHandlebarsHelper.registerHelpers();

  $('head').append('<style id="hexxen-styles"></style>');

  // Inject system logo and register listener to show an About dialog
  HexxenLogo.inject();

	// Define custom classes
  CONFIG.Actor.entityClass = HexxenActor;
  CONFIG.Item.entityClass = HexxenItem;

  HexxenRollSettings.registerSettings();
  // Manipulate DiceTerm.matchTerm() to allow for two-character denominations starting with 'h'
  // Wichtig: Muss bereits in init erfolgen! Sonst können Probleme beim Rekonstruieren der ChatMeldungen auftreten!
  HexxenRollHelper.injectTwoCharacterDiceTermPatch();
  // Assemble template paths
  HexxenRoll.TOOLTIP_TEMPLATE = Hexxen.basepath + "templates/dice/tooltip.html";
  // Register rolls and dice
  CONFIG.Dice.rolls.unshift(HexxenRoll);
  CONFIG.Dice.rolls.push(SDRRoll);
  CONFIG.Dice.terms.hh = HexxenDie;
  CONFIG.Dice.terms.hg = GamemasterDie;
  CONFIG.Dice.terms.hj = JanusBonusDie;
  CONFIG.Dice.terms.hm = JanusMalusDie;
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
