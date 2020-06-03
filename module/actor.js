

class HexxenActor extends Actor {

  constructor(...args) {
    super(...args);

    // The actor is either created with it's saved data or with the associated tempate data.
    // Entity.constructor calls this.initialize() which calls this.prepareData() before and after 
    // this.prepareEmbeddedEntities().
  }

  /** @override */
  async update(data, options={}) {
    // Manipulate data updates before they get sent out.
    super.update(data, options);
  }

  // This is called whenever update data have been sent by the server.
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
    // const version = this.getFlag(Hexxen.scope, "version");
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

  // get 

  // get motivation() {
  //   const m = this.data.items.filter(i => "motivation" === i.type);
  //   return m.length > 0 ? m[0] : undefined;
  // }

  /** @override */
  prepareEmbeddedEntities() {
    // Create Item objects for the items in the actor data structure.
    super.prepareEmbeddedEntities();

    //TODO: anpassen sobald Struktur festgelegt.
    // vorläufig alle items in actor.items belassen, da sonst vermutlich Seiteneffekte.
    // this.items
    //     .filter(item => "motivation" === item.type)
    //     .forEach(item => this.motivation = item);
  }

  // TODO: Kopie aus Actor wieder entfernen
  // /** @override */
  // prepareEmbeddedEntities() {
  //   const prior = this.items;
  //   const items = new Collection();
  //   for ( let i of this.data.items ) {
  //     let item = null;

  //     // Update existing items
  //     if ( prior && prior.has(i._id ) ) {
  //       item = prior.get(i._id);
  //       item.data = i;
  //       item.prepareData();
  //     }

  //     // Construct new items
  //     else item = Item.createOwned(i, this);
  //     items.set(i._id, item);
  //   }

  //   // Assign Items to the Actor
  //   this.items = items;
  // }



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


  // TODO: Collections abhandeln
  importItemFromCollection(collection, entryId) {
    super.importItemFromCollection(collection, entryId);
  }

  // TODO: temporär für Breakpoint
  async createOwnedItem(itemData, options = {}) {
    super.createOwnedItem(itemData, options);
  }

  // TODO: temporär für Breakpoint
  async createEmbeddedEntity(embeddedName, data, options={}) {
    // TODO: Berechtigungen prüfen
    if ("motivation" === data.type) {
      // this.motivation = item;
      // remove old motivation(s) von data.items
      let remove = this.data.items
          .filter( i => "motivation" === i.type && i._id !== data._id )
          .map( i => i._id );
      // FIXME: render des sheets aufgrund des delete unterdrücken, überflüssig
      await this.deleteEmbeddedEntity("OwnedItem", remove);
    } //else {
    super.createEmbeddedEntity(embeddedName, data, options);
  }

  /** @override */
  async _onCreateEmbeddedEntity(embeddedName, child, options, userId) {
    super._onCreateEmbeddedEntity(embeddedName, child, options, userId);
    // TODO: Kopie aus Actor wieder entfernen
    // const item = Item.createOwned(child, this);
    // this.items.set(item.id, item);
    // //}
    // if (options.renderSheet && (userId === game.user._id)) {
    //   item.sheet.render(true, {
    //     renderContext: "create" + embeddedName,
    //     renderData: child
    //   });
    // }
  }

  _onDeleteEmbeddedEntity(embeddedName, child, options, userId) {
    // if ("item" === child.type) {
    super._onDeleteEmbeddedEntity(embeddedName, child, options, userId);
    // }
  }


  
  /** @override */
  getRollData() {
    const data = super.getRollData();
    // const shorthand = game.settings.get("worldbuilding", "macroShorthand");

    // // Re-map all attributes onto the base roll data
    // if ( !!shorthand ) {
    //   for ( let [k, v] of Object.entries(data.attributes) ) {
    //     if ( !(k in data) ) data[k] = v.value;
    //   }
    //   delete data.attributes;
    // }

    // // Map all items data using their slugified names
    // data.items = this.data.items.reduce((obj, i) => {
    //   if ("item" === i.type) {
    //     let key = i.name.slugify({strict: true});
    //     let itemData = duplicate(i.data);
    //     if ( !!shorthand ) {
    //       for ( let [k, v] of Object.entries(itemData.attributes) ) {
    //         if ( !(k in itemData) ) itemData[k] = v.value;
    //       }
    //       delete itemData["attributes"];
    //     }
    //     obj[key] = itemData;
    //   }
    //   return obj;
    // }, {});
    return data;
  }
}