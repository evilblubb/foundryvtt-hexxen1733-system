/**
 * HeXXen Roller Application
 * @type {FormApplication}
 * @param entity {Entity}      The Entity object for which the sheet is being configured
 * @param options {Object}     Additional Application options
 */
class HexxenRoller extends FormApplication {

  constructor(entity, options, hints={}) {
    super(entity, options);
    this.hints = hints;
  }
  
	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "roller"],
      id: "roller",
      template: "systems/hexxen-1733/templates/roller.html",
      width: 400,
    });
  }

  /* -------------------------------------------- */

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return "HeXXen Roller Tool";
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    let data = super.getData() // object == entity, options == options
    data.hints = this.hints;
    data.data = {};
    
    data.type = this.hints.type;
    let key = this.hints.key;
    data.key = key;
    data.label = key;
    data.modifier = 0;
    data.value = 0;
    
    if ("attribute" === this.hints.type) {
      let attribute = data.object.data.attributes[key]
      data.value = attribute.value;
      data.label = attribute.label;
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

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    event.preventDefault();
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

