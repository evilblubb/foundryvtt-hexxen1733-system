/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/**
 * TODO: doc
 */
class HexxenRollHelper {

  static checkSystemReqirements() {
    // special-dice-roller
    const foundry = game.data.version;
    const sdr = game.modules.get("special-dice-roller");
    if (sdr && sdr.active) {
      const version = sdr.data.version;
      // Foundry 0.6.5 and higher --> 0.11.2 or higher
      if (isNewerVersion(foundry, "0.6.4") && !isNewerVersion(version, "0.11.1")) {
        if (game.user.isGM) {
          ui.notifications.error("Kein kompatibles Würfeltool gefunden! Seit \"Foundry 0.6.5\" wird mindestens Version \"0.11.2\" des Add-On \"special-dice-roller\" benötigt.",
                                  {permanent: true});
        }
        return;
      }
      // Foundry up to 0.6.4 --> 0.11.0 or higher
      else {
        if (!isNewerVersion(version, "0.11")) { // 0.11.0 is newer than 0.11
          if (game.user.isGM) {
            ui.notifications.error("Kein kompatibles Würfeltool gefunden! Es wird mindestens Version \"0.11.0\" des Add-On \"special-dice-roller\" benötigt.",
                                    {permanent: true});
          }
          return;
        }
      }

      this.delegate = HexxenSpecialDiceRollerHelper;
    } else if (false) {
      // TODO: dice-so-nice??
    } else {
      if (game.user.isGM) {
        ui.notifications.error("Kein kompatibles Würfeltool gefunden! Stellen Sie sicher, dass das Add-On \"special-dice-roller\" installiert und in der Welt aktiviert ist.",
                                {permanent: true});
      }
    }
  }

  static createMacro(hotbar, data, slot) {
    if (data.type === 'HexxenRoll') {
      data.type = 'Macro';
      data.data = {
        name: data.data.key,
        type: 'script',
        command: `HexxenRollHelper.roll('${data.actorId}', { type: '${data.data.type}', key: '${data.data.key}' });`
      }
    }
  }

  static roll(actorId, hints={}) {
    const actor = game.actors.get(actorId);
    // FIXME: if (actor) und andere Prüfungen
    // TODO: Tunnelung durch HexxenRoller ersetzen
    new HexxenRoller(actor, {}, hints).roll();
  }

  static rollToChat(actor, roll={}, flavour=null, options={}) {
    if (!this.delegate) {
      ui.notifications.error("Kein kompatibles Würfeltool gefunden!");
      return false;
    }
    // TODO: Umleitung über WürfelTool-Dialog implementieren (options.showDialog: true)
    return this.delegate._rollToChat(actor, roll, flavour, options);
  }
}

class HexxenSpecialDiceRollerHelper extends HexxenRollHelper {

  static _rollToChat(actor, roll={}, flavour=null, options={}) {
    const roller = game.specialDiceRoller.heXXen;

    let empty = true;
    let command = "/hex ";
    if ("string" === typeof(roll)) {
      empty = false;
      command += roll;
    } else if ("object" === typeof(roll)) {
      for ( let die of Object.keys(roll) ) {
        let count = roll[die];
        if ( count > 0 ) {
          empty = false;
          command += count;
          command += die;
        }
      }
    }

    if (empty) return false;

    if (flavour) {
      command += ` # ${flavour}`;
    }

    const speaker = ChatMessage.getSpeaker({actor: actor, token: actor ? actor.token : undefined});
    const message = roller.rollCommand(command);

    if (actor) {
      ChatMessage.create( { speaker: speaker, content: message } );
    } else {
      ChatMessage.create( { content: message } );
    }

    return {}; // TODO: result und chatId zurückgeben
  }
}

/**
 * HeXXen Roller Application
 * @type {FormApplication}
 * @param entity {Entity}      The Entity object for which the sheet is being configured
 * @param options {Object}     Additional Application options
 */
class HexxenRoller extends FormApplication {

  constructor(entity=null, options={}, hints={}) {
    super(entity, options);
    this.hints = hints;
    if (!hints.key) {
      this.options.closeOnSubmit = false;
    }
  }

	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "roller"],
      id: "roller",
      template: Hexxen.basepath + "templates/roller.html",
      width: 300,
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get id() {
    return "roller-" + this.appId;
  }

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return "HeXXen Würfel Tool";
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    let data = super.getData() // object == entity, options == options
    data.hints = this.hints;

    let type = this.hints.type;
    let key = this.hints.key;
    data.manual = key ? false : true;

    let result = {};
    data.data = result;
    let dice = { "h": { label: "Hexxen", count: 0 },
                 "+": { label: "Bonus", count: 0 },
                 "-": { label: "Malus", count: 0 },
                 "s": { label: "Segnung", count: 0 },
                 "b": { label: "Blut", count: 0 },
                 "e": { label: "Elixir", count: 0 },
                 "f": { label: "Fluch", count: 0 }
                };
    result.dice = dice;

    result.type = type;
    result.key = key;
    result.label = key;
    result.modifier = 0;
    result.value = 0;


    if ("attribute" === type) {
      let attribute = data.object.data.attributes[key]
      result.value = attribute.value;
      result.dice.h.count = attribute.value;
      result.label = attribute.label;
    }
    else if ("skill" === type) {
      let skill = data.object.data.skills[key]
      let attribute = data.object.data.attributes[skill.attribute]
      let rolls = Number(skill.value) + Number(attribute.value);
      result.value = rolls;
      result.dice.h.count = rolls;
      result.label = skill.label;
    }
    else if ("combat" === type) {
      let combat = data.object.data.combat[key]
      let attribute = data.object.data.attributes[combat.attribute]
      let rolls = Number(combat.value) + Number(attribute.value);
      result.value = rolls;
      result.dice.h.count = rolls;
      result.label = combat.label;
      if (combat.schaden) result.label += ` (SCH +${combat.schaden})`;
    }

    return data;

/*     const entityName = this.object.entity;
    const config = CONFIG[entityName];
    const type = this.object.data.type || CONST.BASE_ENTITY_TYPE;
    const classes = Object.values(config.sheetClasses[type]);
    const defcls = classes.find(c => c.default);
    return {
      entityName: entityName,
      isGM: game.user.isGM,
      object: duplicate(this.object.data),
      options: this.options,
      sheetClass: this.object.getFlag("core", "sheetClass"),
      sheetClasses: classes.map(c => c.id),
      defaultClass: defcls ? defcls.id : null
    }
 */  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dice").on("click", ".control", this._onClickPlusMinus.bind(this));
  }

  async _onClickPlusMinus(event) {
    event.preventDefault();

    const a = event.currentTarget;
    const action = a.dataset.action;
    const inc = "increase" === action ? 1 : -1;
    const target = a.parentNode.dataset.key;
    const form = this.form;

    let e = form.elements["dice." + target];
    e.value = Number(e.value) + inc;
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    event.preventDefault();

    const roll = {};
    for ( let key of Object.keys(formData) ) {
      if ( key.startsWith("dice.") ) {
        const die = key.substr(5);
        const count = formData[key];
        roll[die] = count;
      }
    }
    HexxenRollHelper.rollToChat(this.object, roll, formData.comment);

/*     const original = this.getData();

    // De-register the current sheet class
    const sheet = this.object.sheet;
    await sheet.close();
    this.object._sheet = null;
    delete this.object.apps[sheet.appId];

    // Update world settings
    if ( game.user.isGM && (formData.defaultClass !== original.defaultClass) ) {
      const setting = await game.settings.get("core", "sheetClasses") || {};
      mergeObject(setting, {[`${this.object.entity}.${this.object.data.type}`]: formData.defaultClass});
      await game.settings.set("core", "sheetClasses", setting);
    }

    // Update the Entity-specific override
    if ( formData.sheetClass !== original.sheetClass ) {
      await this.object.setFlag("core", "sheetClass", formData.sheetClass);
    }

    // Re-draw the updated sheet
    this.object.sheet.render(true);
 */  }

  roll() {
    const data = this.getData();
    const roll = {};
    for ( let die of Object.keys(data.data.dice) ) {
      const count = data.data.dice[die].count;
      roll[die] = count;
    }
    HexxenRollHelper.rollToChat(this.object, roll, data.data.label);
  }

  /* -------------------------------------------- */
  /*  Configuration Methods
  /* -------------------------------------------- */

  /**
   * Initialize the configured Sheet preferences for Entities which support dynamic Sheet assignment
   * Create the configuration structure for supported entities
   * Process any pending sheet registrations
   * Update the default values from settings data
   */
  static initializeSheets() {

/*     // Create placeholder entity/type mapping
    const entities = [Actor, Item];
    for ( let ent of entities ) {
      const types = this._getEntityTypes(ent);
      CONFIG[ent.name].sheetClasses = types.reduce((obj, type) => {
        obj[type] = {};
        return obj;
      }, {});
    }

    // Register any pending sheets
    this._pending.forEach(p => {
      if ( p.action === "register" ) this._registerSheet(p);
      else if ( p.action === "unregister" ) this._unregisterSheet(p);
    });
    this._pending = [];

    // Update default sheet preferences
    const defaults = game.settings.get("core", "sheetClasses");
    this._updateDefaultSheets(defaults)
 */  }

  /* -------------------------------------------- */

  /**
   * Register a sheet class as a candidate which can be used to display entities of a given type
   * @param {Entity} entityClass      The Entity for which to register a new Sheet option
   * @param {String} scope            Provide a unique namespace scope for this sheet
   * @param {Application} sheetClass  A defined Application class used to render the sheet
   * @param {Object} options          Additional options used for sheet registration
   */
  static registerSheet(entityClass, scope, sheetClass, {types=[], makeDefault=false}={}) {
/*     const id = `${scope}.${sheetClass.name}`;
    const config = {entityClass, id, sheetClass, types, makeDefault};

    // If the game is ready, register the sheet with the configuration object, otherwise add to pending
    if ( (game instanceof Game) && game.ready ) this._registerSheet(config);
    else {
      config["action"] = "register";
      this._pending.push(config);
    }
  */ }

  static _registerSheet({entityClass, id, sheetClass, types, makeDefault}={}) {
/*     types = this._getEntityTypes(entityClass, types);
    let classes = CONFIG[entityClass.name].sheetClasses;
    for ( let t of types ) {
      classes[t][id] = {
        id: id,
        cls: sheetClass,
        default: makeDefault
      };
    }
 */  }

  /* -------------------------------------------- */

  /**
   * Unregister a sheet class, removing it from the list of available Applications to use for an Entity type
   * @param {Entity} entityClass      The Entity for which to register a new Sheet option
   * @param {String} scope            Provide a unique namespace scope for this sheet
   * @param {Application} sheetClass  A defined Application class used to render the sheet
   * @param {Array} types             An Array of types for which this sheet should be removed
   */
  static unregisterSheet(entityClass, scope, sheetClass, {types=[]}={}) {
/*     const id = `${scope}.${sheetClass.name}`;
    const config = {entityClass, id, types};

    // If the game is ready remove the sheet directly, otherwise remove from pending
    if ( (game instanceof Game) && game.ready ) this._unregisterSheet(config);
    else {
      config["action"] = "unregister";
      this._pending.push(config);
    }
 */  }

  static _unregisterSheet({entityClass, id, types}={}) {
/*     types = this._getEntityTypes(entityClass, types);
    let classes = CONFIG[entityClass.name].sheetClasses;
    for ( let t of types ) {
      delete classes[t][id];
    }
 */  }

  /* -------------------------------------------- */

  static _getEntityTypes(entityClass, types=[]) {
/*     if ( types.length ) return types;
    const systemTypes = game.system.entityTypes[entityClass.name];
    return systemTypes.length ? systemTypes : [CONST.BASE_ENTITY_TYPE];
 */  }

  /* -------------------------------------------- */

  /**
   * Update the currently default Sheets using a new core world setting
   * @param {Object} setting
   * @private
   */
  static _updateDefaultSheets(setting) {
/*     if ( !Object.keys(setting).length ) return;
    const entities = [Actor, Item];
    for ( let ent of entities ) {
      let classes = CONFIG[ent.name].sheetClasses;
      let defaults = setting[ent.name];
      if ( !defaults ) continue;

      // Update default preference for registered sheets
      for ( let [type, sheetId] of Object.entries(defaults) ) {
        const sheets = Object.values(classes[type]);
        let requested = sheets.find(s => s.id === sheetId);
        if ( requested ) sheets.forEach(s => s.default = s.id === sheetId);
      }

      // Close and de-register any existing sheets
      ent.collection.entities.forEach(e => {
        Object.values(e.apps).forEach(e => e.close());
        e.apps = {};
      });
    }
 */  }
}

