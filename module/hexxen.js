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
    decimals: 1 // TODO: 0, sobald SC INI Vorrang im CombatTracker
  };

  Handlebars.registerHelper('isDefined', function(value) {
    // Caution: in case of (isDefined foo.bar): if foo === null --> value === null
    return value !== undefined && value !== null;
  });

  Handlebars.registerHelper('repeat', function(context, options) {
    let out = "";
    for (let i=0; i<context; i++) {
      out += options.fn(this);
    }
    return out;
  });

  // TODO: preload some images

  // FIXME: richtiger Platz??
  Handlebars.registerHelper("dyn-input", function(options) {
    // TODO: besser actor.gameMode, aber dazu muss zuerst das Actor/Token-Objekt ermittelt werden
    // (actor ist nur das äußere Datenelement von Actor)
    const flags = options.data.root.actor.flags[Hexxen.scope] || {};
    // TODO: editMode umstellen
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
    options.hash.class = options.hash.class || "";
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
  CONFIG.Item.entityClass = HexxenItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
//  Actors.registerSheet("simple", SimpleActorSheet, { types: ["npc"] });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, { types: ["item"], makeDefault: true });
  Items.registerSheet("hexxen", RuleItemSheet, { types: ["role", "profession", "motivation", "power"], makeDefault: true });

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
    HexxenRollHelper.rollToChat(speaker, message); // TODO: rollCommand und flavour trennen?
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

  // TODO: Verschiebung Pause-Markierer wäre ein Kandidat für ein TweakVTT Modul
  // Register system settings
  game.settings.register("hexxen-1733", "pausePosition", {
    name: "Game Pause Indicator Position",
    hint: "Adjust position of game pause indicator.",
    scope: "client",
    config: true,
    default: "fvtt",
    type: String,
    choices: { fvtt: "FVTT default", centered: "Centered" },
    onChange: pos => ui.pause.render()
  });
});

Hooks.once("ready", async function() {
  HexxenRollHelper.checkSystemReqirements();
});

// TODO: Verschiebung Pause-Markierer wäre ein Kandidat für ein TweakVTT Modul (inkl. CSS und Konfiguration)
Hooks.on("renderPause", async function() {
  const pos = game.settings.get("hexxen-1733", "pausePosition");
  if (pos === "vtt") return;

  let app = $.find("#pause");
  if (app && app[0]) {
    app = app[0];
    app.classList.add(`hexxen-${pos}`);
  }
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
