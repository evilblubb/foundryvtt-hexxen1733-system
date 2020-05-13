/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { SimpleActor } from "./actor.js";
import { Jaeger } from "./jaeger.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleActorSheet } from "./actor-sheet.js";

// TODO wie ist der Namespace??
class Hexxen {
  static get scope() {
    return game.data.system.id;
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
  
  // FIXME richtiger Platz??
  Handlebars.registerHelper("dyn-input", function(options) {
    // TODO besser actor.getFlag, aber dazu muss zuerst das Actor-Objekt ermittelt werden 
    // (actor ist nur das äußere Datenelement von Actor)
    const editMode = options.data.root.actor.flags[CONFIG.Hexxen.scope].editMode;
    
    // FIXME id für label bereitstellen
    if (editMode) {
      return `<input class="value" type="text" name="foo${}" value="${this.value}" />`;
    } else { // game mode
      return `<span class="value">${this.value}</span>`;
    }
  });

	// Define custom Entity classes
  CONFIG.Actor.entityClass = Jaeger;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("simple", SimpleActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("simple", SimpleItemSheet, {makeDefault: true});

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
