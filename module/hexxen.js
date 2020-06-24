/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

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

  // FIXME: log, info, warn, error: der ursprüngliche Aufrufspunkt geht verloren
  static log(...args) {
    // TODO: deaktivierbar machen
    console.log(...args);
  }

  static info(...args) {
    console.info(...args);
  }

  static warn(...args) {
    // TODO: Warnmeldung in UI
    console.warn(...args);
  }

  static error(...args) {
    // TODO: Fehlermeldung in UI
    console.error(...args);
  }
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.info(`HeXXen 1733 | Initializing system`);

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
	  formula: "@ini.value",
    decimals: 0
  };

  Handlebars.registerHelper('isDefined', function (value) {
    return value !== undefined;
  });

  // TODO: preload some images

  // FIXME: richtiger Platz??
  Handlebars.registerHelper("dyn-input", function(options) {
    // TODO: besser actor.gameMode, aber dazu muss zuerst das Actor/Token-Objekt ermittelt werden
    // (actor ist nur das äußere Datenelement von Actor)
    const flags = options.data.root.actor.flags[Hexxen.scope] || {};
    const editMode = flags.editMode || false;
    let name = [ options.hash.path, options.hash.key ];
    if ( options.hash.target ) name.push( options.hash.target);
    name = name.join(".");

    // FIXME: Überarbeiten: u.a. id="foo" für <label for="foo"> bereitstellen
    // FIXME: Template erstellen statt SafeString
    if (editMode) {
      return new Handlebars.SafeString(`<input class="${options.hash.class}" type="text" name="${name}" value="${options.hash.value}" data-dtype="Number"/>`);
    } else { // game mode
      return new Handlebars.SafeString(`<div class="${options.hash.class}">${options.hash.value}</div>`);
    }
  });
  // FIXME: richtiger Platz??
  Handlebars.registerHelper("inc-btn", function(options) {
    // FIXME: Template erstellen statt SafeString
    return new Handlebars.SafeString(`
      <div class="${options.hash.class} inc-btn">
          ${options.fn(this)}
          <div class="controls">
              <a class="control left" data-action="decrease"><i class="fas fa-minus"></i></a>
              <a class="control right" data-action="increase"><i class="fas fa-plus"></i></a>
          </div>
      </div>`);
  });

	// Define custom Entity classes
  CONFIG.Actor.entityClass = HexxenActor;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
//  Actors.registerSheet("simple", SimpleActorSheet, { types: ["npc"] });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, { types: ["item"], makeDefault: true });
  Items.registerSheet("hexxen", RuleItemSheet, { types: ["role", "profession", "motivation","skills"], makeDefault: true });

  // Inject system logo
  // TODO: wohin mit solchen Sachen. Macht den Hook zu unübersichtlich.
  $("<a class='hexxen-logo'><img id='hexxen-logo' src='" + Hexxen.basepath + "img/HeXXen1733_scriptorium_small_outline.png' height='65px' /></a>")
      .insertAfter("img#logo");
  // TODO: eigenes left, #navigation left und #loading left/width dynamisch berechnen?
  $($.find("a.hexxen-logo")).on("click", () => { new HexxenAbout().render(true); } );

  // Inject custom roll command
  // TODO: wohin mit solchen Sachen. Macht den Hook zu unübersichtlich.
  const oldFn = TextEditor._replaceInlineRolls;
  TextEditor._replaceInlineRolls = ((match, command, formula, ...args) => {
    // TODO: auf Templates umstellen
    // TODO: Rechte?
    if ("/hex " === command) {
      return `<a class="hex-roll" title="Würfeln" data-message="${formula}"><i class="fas fa-dice"></i> ${formula}</a>`;
    } else if ("/hc " === command) {
      return `<a class="hex-chat" title="Im Chat anzeigen" data-message="${formula}"><i class="fas fa-comments"></i> ${formula}</a>`;
    } else {
      return oldFn(match, command, formula, ...args);
    }
  });
  $("body").on("click", "a.hex-roll", (event) => {
    let speaker = $(event.currentTarget).closest("div.app")[0].id.replace("actor-", "") || undefined;
    // TODO: HexxenRoller einbinden, sobald dieser an die Übergabe eines roll-Strings angepasst ist.
    // if ( event.originalEvent.shiftKey || event.originalEvent.ctrlKey ) {
    //   new HexxenRoller(undefined, /* options */ {
    //     top: this.position.top + 40,
    //     left: this.position.left + ((this.position.width - 400) / 2)
    //   }, /* hints */ {
    //     type: type,
    //     key: key
    //   }).render(true);
    //   return;
    // }

    // TODO: Tokens besser berücksichtigen (game.actors.get() berücksichtigt keine Tokens)
    // maybe a token, check for another -
    // FIXME: Verwendung in einem Item Sheet verursacht eine defekte Actor-ID, welche den Chat kaputt macht. (Foundry Bug #3056)
    let idx = speaker.lastIndexOf('-');
    speaker = idx === -1 ? speaker : speaker.substring(0, idx);
    const message = event.currentTarget.dataset.message;
    // TODO: Überprüfungen und Rechte?
    ChatMessage.create({speaker: { actor: speaker }, content: "/hex " + message });
  });
  $("body").on("click", "a.hex-chat", (event) => {
    let speaker = $(event.currentTarget).closest("div.app")[0].id.replace("actor-", "") || undefined;
    // TODO: Tokens besser berücksichtigen (game.actors.get() berücksichtigt keine Tokens)
    // maybe a token, check for another -
    let idx = speaker.lastIndexOf('-');
    speaker = idx === -1 ? speaker : speaker.substring(0, idx);
    const message = event.currentTarget.dataset.message;
    // TODO: Überprüfungen und Rechte?
    ChatMessage.create({speaker: { actor: speaker }, content: message });
  });

  // // Register system settings
  // game.settings.register("worldbuilding", "macroShorthand", {
  //   name: "Shortened Macro Syntax",
  //   hint: "Enable a shortened macro syntax which allows referencing attributes directly, for example @str instead of @attributes.str.value. Disable this setting if you need the ability to reference the full attribute model, for example @attributes.str.label.",
  //   scope: "world",
  //   type: Boolean,
  //   default: true,
  //   config: true
  // });
});

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
