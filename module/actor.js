﻿

class HexxenActor extends Actor {

  constructor(...args) {
    super(...args);

    // The actor is either created with it's saved data or with the associated template data.
    // Entity.constructor calls this.initialize() which calls this.prepareData() before and after
    // this.prepareEmbeddedEntities().
  }

  get type() {
    return this.data.type;
  }

  /** @override */
  initialize() {
    // Check if actor data have to be migrated
    this._migrateData();
    super.initialize();  
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
    if ("character" === this.type) {
      // Max-Werte für Basis- und Puffer-LEP berechnen
      // actor.data.health.min = -10;
      // actor.data.health.max = 7 + actor.data.attributes.KKR.value + actor.data.attributes.WIL.value + actor.data.skills["Unempfindlichkeit"].value;
      // actor.data.power.min = 0;
      // actor.data.power.max = 10;

      // INI, PW und AP berechnen
      // actor.data.calc = actor.data.calc || {};
      // actor.data.calc.ini = actor.data.attributes.SIN.value + actor.data.attributes.GES.value + actor.data.skills["Reflexe"].value;
      // actor.data.calc.pw = actor.data.calc.pw || 1;
      // actor.data.calc.ap = 6 - actor.data.calc.pw;
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
  async createEmbeddedEntity(embeddedName, newItemData, options={}) {
    if ("character" === this.type) {

      // TODO: Berechtigungen prüfen
      if ("motivation" === newItemData.type) {
        // remove old motivation(s) from data.items
        // TODO: oder nur blocken?
        const remove = this.data.items
            .filter( i => "motivation" === i.type )
            .map( i => i._id );
        // FIXME: render des sheets aufgrund des delete unterdrücken, überflüssig
        await this.deleteEmbeddedEntity("OwnedItem", remove);
        // TODO: id eintragen
      }
      else if ("role" === newItemData.type) {
        // TODO: check if an additional role is allowed (Lv. 1/2/7)
        // TODO: check for duplicates
        const level = this.data.data.core.level; // TODO: Datenstruktur
        const max = level >= 7 ? 3 : ( level >= 2 ? 2 : 1 );
        const roles = this.data.items
            .filter( i => "role" === i.type );
        if (roles.length >= max) { 
          ui.notifications.warn(`Es wurden bereits ${max} Rollen zugewiesen.`); // TODO: singular
          return; 
        }
        else if (roles.filter( i => i.name === newItemData.name).length) {
          ui.notifications.warn(`Die Rolle ${newItemData.name} ist bereits zugewiesen.`);
          return;
        }
        // TODO: id eintragen
      }
      else if ("profession" === newItemData.type) {
        const prof = this.data.items
            .filter( i => "profession" === i.type );
        if (prof.length >= 1) { 
          ui.notifications.warn(`Es wurde bereits eine Profession zugewiesen.`);
          return; 
        }
        // TODO: Voraussetzungen prüfen
        // TODO: id eintragen
      }
    } 

    super.createEmbeddedEntity(embeddedName, newItemData, options);
  }

  // TODO: delete --> id löschen

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

  async _migrateData() {
    const revision = this.getFlag(Hexxen.scope, "data-revision") || 0;
    
    if ("character" === this.type) {
      
      switch (revision) {
        case 0: {
          const updates = {}, remove = {};
          updates["data.level.value"] = this.data.data.core.level;
          updates["data.languages.0.value"] = this.data.data.core.sprachen; // FIXME: array???
          updates["data.vitiation.value"] = this.data.data.core.verderbnis;

          updates["data.temp.pw"] = this.data.data.calc.pw;

          updates["data.notes.biography.editor"] = this.data.data["biography"];
          updates["data.notes.states.editor"] = this.data.data["states-text"];
          updates["data.notes.skills.editor"] = this.data.data["skills-text"];
          updates["data.notes.powers.editor"] = this.data.data["powers-text"];
          updates["data.notes.combat.editor"] = this.data.data["combat-text"];
          updates["data.notes.items.editor"] = this.data.data["items-text"];

          // // identify motivation/role/profession itemId
          const mot = this.data.items.filter(i => "motivation" === i.type);
          if (mot.length > 0) {
            updates["data.motivation.itemId"] = mot[0]._id;
          }
          const role = this.data.items.filter(i => "role" === i.type);
          for (let i = 0; i < 3; i++) {
            if (role.length > i) {
              updates[`data.role-${i+1}.itemId`] = role[i]._id;
            }
          }
          const prof = this.data.items.filter(i => "profession" === i.type);
          if (prof.length > 0) {
            updates["data.profession.itemId"] = prof[0]._id;
          }

          remove["data"] = { 
            "-=core": null,
            "-=calc": null,
            "-=biography": null, 
            "-=states-text": null, 
            "-=skills-text": null, 
            "-=powers-text": null, 
            "-=combat-text": null, 
            "-=items-text": null
          };
          remove["data.health"] = { 
            "-=min": null,
            "-=max": null
          };
          remove["data.power"] = { 
            "-=min": null,
            "-=max": null
          };

          // TODO: klären, ob das so richtig ist. (bei setFlags am Ende fehlen die updates)
          await this.setFlag(Hexxen.scope, "data-revision", 1); // update flag first
          await this.update(updates);
          await this.update(remove);

          // continue
        }
        case 1:
        default:
      }
    }
    
  }

}
