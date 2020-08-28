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

	// Define custom Entity classes
  CONFIG.Actor.entityClass = HexxenActor;
  CONFIG.Item.entityClass = HexxenItem;

  // Register Handlebars helper for use in HTML templates
  HexxenHandlebarsHelper.registerHelpers();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("hexxen", JaegerSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("hexxen", NpcLeaderSheet, { types: ["npc-leader"], makeDefault: true });
  Actors.registerSheet("hexxen", NpcBandeSheet, { types: ["npc-bande"], makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, { types: ["item"], makeDefault: true });
  Items.registerSheet("hexxen", RuleItemSheet, { types: ["role", "profession", "motivation", "power"], makeDefault: true });

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

  // Inject system logo and register listener to show an About dialog
  HexxenLogo.inject();

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
