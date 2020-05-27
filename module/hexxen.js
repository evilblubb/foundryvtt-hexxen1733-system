﻿/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// TODO: wie ist der Namespace??
class Hexxen {
  static get scope() {
    return game.data.system.id;
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
    // TODO Fehlermeldung in UI
    console.error(...args);
  }
}
  
/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing HeXXen 1733 System`);

	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
	  formula: "@calc.ini",
    decimals: 0
  };
  CONFIG.Hexxen = Hexxen;
  
  // FIXME: richtiger Platz??
  Handlebars.registerHelper("dyn-input", function(options) {
    // TODO: besser actor.getFlag, aber dazu muss zuerst das Actor-Objekt ermittelt werden 
    // (actor ist nur das äußere Datenelement von Actor)
    const flags = options.data.root.actor.flags[CONFIG.Hexxen.scope] || {};
    const editMode = flags.editMode || false;
    let name = [ options.hash.path, options.hash.key ];
    if ( options.hash.target ) name.push( options.hash.target);
    name = name.join(".");
    
    // FIXME: Überarbeiten: u.a. id="foo" für <label for="foo"> bereitstellen
    // FIXME: Template erstellen statt SafeString
    if (editMode) {
      return new Handlebars.SafeString(`<input class="${options.hash.class}" type="text" name="${name}" value="${options.hash.value}" data-dtype="Number"/>`);
    } else { // game mode
      return new Handlebars.SafeString(`<span class="${options.hash.class}">${options.hash.value}</span>`);
    }
  });
  // FIXME: richtiger Platz??
  Handlebars.registerHelper("inc-btn", function(options) {
    // FIXME: Template erstellen statt SafeString
    return new Handlebars.SafeString(`
      <div class="inc-btn">
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
  Actors.registerSheet("simple", SimpleActorSheet, { types: ["npc"] });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, { makeDefault: true });

  // Register system settings
  game.settings.register("worldbuilding", "macroShorthand", {
    name: "Shortened Macro Syntax",
    hint: "Enable a shortened macro syntax which allows referencing attributes directly, for example @str instead of @attributes.str.value. Disable this setting if you need the ability to reference the full attribute model, for example @attributes.str.label.",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });
});
