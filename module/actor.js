

class HexxenActor extends Actor {

  constructor(...args) {
    super(...args);

    // The actor is either created with it's saved data or with the associated tempate data.
    // Entity.constructor calls this.initialize() which calls this.prepareData() before and after 
    // this.prepareEmbeddedEntities().
  }
  
  // This is here to complete the picture, but should not be overridden.
  // /** @override */
  // _onUpdate(data, options, userId, context) {
  //   // Manipulate data updates before they get processed.
  //   // IMPORTANT: the updates are already merged into the actor data.
  //   // There should be no reasons to manipulate here, as prepareData() gets called during update.
  //   super._onUpdate(data, options, userId, context);
  // }

  /**
   * @override
   *
   * Prepare data for the Entity whenever the instance is first created or later updated.
   * This method can be used to derive any internal attributes which are computed in a formulaic manner.
   * For example, in a d20 system - computing an ability modifier based on the value of that ability score.
   */
	prepareData() {
    super.prepareData();

    // called twice during creation, before and after this.prepareEmbeddedEntities().

    const actor = this.data;

    // check data version and migrate data if neccessary.
    const version = this.getFlag(CONFIG.Hexxen.scope, "editMode");
    // if ()
    

    // Abgeleitete Basisdaten für Jaeger berechnen
    if ("character" === actor.type) {
      // Max-Werte für Basis- und Puffer-LEP berechnen
      actor.data.health.min = -10;
      actor.data.health.max = 7 + actor.data.attributes.KKR.value + actor.data.attributes.WIL.value + actor.data.skills["Unempfindlichkeit"].value;
      actor.data.power.min = 0;
      actor.data.power.max = 10;
      
      // INI, PW und AP berechnen
      actor.data.calc = actor.data.calc || {};
      actor.data.calc.ini = actor.data.attributes.SIN.value + actor.data.attributes.GES.value + actor.data.skills["Reflexe"].value;    
      actor.data.calc.pw = actor.data.calc.pw || 1;    
      actor.data.calc.ap = 6 - actor.data.calc.pw;    
    }
  }

  /** @override */
  prepareEmbeddedEntities() {
    // Create Item objects for the items in the actor data structure.
    super.prepareEmbeddedEntities();
  }

  // Workflow for collection items:
  // ActorSheet._onDrop(): Fallunterscheidung Itemherkunft
  //   `--> Actor.importItemFromCollection(): lädt Entity aus der Compendium-Collection
  //          `--> callback_1
  //
  // (callback_1) 
  //   `--> Actor.createOwnedItem(): Zuordung zu Entity-Collection "OwnedItems" des Actors
  //          `--> Actor.createEmbeddedEntity(): Auskopplung Token
  //                 `--> Entity.createEmbeddedEntity(): Entity "speichern" und verteilen
  //                        `--> callback_2
  //
  // (callback_2): je Client, selbst direkt, die anderen werden über Entity Socket Listener angetriggert
  //   `--> Entity.<static>_handleCreateEmbeddedEntity() 
  //          `--> Actor.collection.push(): Fügt Rohdaten in Actor.data.<collection> ein
  //          `--> Actor._onCreateEmbeddedEntity(): je Entity
  //                 `--> Item.createOwned(): Erzeugt das eigentliche Item und fügt es zur Actor.items hinzu
  //          `--> Entity._onModifyEmbeddedEntity(): 1x pro Batch
  //                 `--> Actor.prepareData()

  // Compendium: CONFIG.<metadata.entity>.entityClass
  // Items:      CONFIG.Item.entityClass
  // Actor:      prepareEmbeddedEntities() bzw. _onCreateEmbeddedEntity()

  // Plan:
  // CONST.COMPENDIUM_ENTITY_TYPES
  // CONFIG.<Typ>.*


  importItemFromCollection(collection, entryId) {
    super.importItemFromCollection(collection, entryId);
  }

  async createOwnedItem(itemData, options = {}) {
    super.createOwnedItem(itemData, options);
  }

  async createEmbeddedEntity(...args) {
    super.createEmbeddedEntity(...args);
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();
    const shorthand = game.settings.get("worldbuilding", "macroShorthand");

    // Re-map all attributes onto the base roll data
    if ( !!shorthand ) {
      for ( let [k, v] of Object.entries(data.attributes) ) {
        if ( !(k in data) ) data[k] = v.value;
      }
      delete data.attributes;
    }

    // Map all items data using their slugified names
    data.items = this.data.items.reduce((obj, i) => {
      let key = i.name.slugify({strict: true});
      let itemData = duplicate(i.data);
      if ( !!shorthand ) {
        for ( let [k, v] of Object.entries(itemData.attributes) ) {
          if ( !(k in itemData) ) itemData[k] = v.value;
        }
        delete itemData["attributes"];
      }
      obj[key] = itemData;
      return obj;
    }, {});
    return data;
  }

  /** @override */
  async update(data, options={}) {
    // Manipulate data updates before they get sent out.
    super.update(data, options);
  }
}