/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

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

  get level() {
    return this.data.data.level.value;
  }

  /** @override */
  initialize() {
    // TODO: Check if actor data have to be migrated, otherwise immediately call super.initialize()
    // FIXME: issue FVTT#3107, FVTT#3407
    HexxenUpdateQueue.enqueue(async () => {
      await this._migrateData();
      // TODO: vorgelagerte Prüfung (z.B. _needToMigrate())

      super.initialize();
    });
  }

  // TODO: wann genau wird _onCreate() aufgerufen
  // /** @override */
  // _onCreate(data, options, userId) {
  //   // console.info("created actor", this.data.name);
  //   super._onCreate(data, options, userId);
  // }

  // /** @override */
  // async update(data, options={}) {
  //   // Manipulate data updates before they get sent out.
  //   super.update(data, options);
  // }

  /**
   * This is called whenever update data are sent by the server.
   * IMPORTANT: the updates are already merged into the actor data.
   * This is called before prepareData() gets called during update.
   * Could be useful to override when there is a need to react on specific updates.
   */
  // /** @override */
  // _onUpdate(data, options, userId, context) {
  //   super._onUpdate(data, options, userId, context);
  // }

  /**
   * @override
   * Prepare data for the Entity whenever the instance is first created or later updated.
   * This method can be used to derive any internal attributes which are computed in a formulaic manner.
   */
	prepareData() {
    super.prepareData();

    // called twice during creation, before and after this.prepareEmbeddedEntities().

    const actor = this.data;

    // Abgeleitete Basisdaten für Jaeger berechnen
    if ("character" === this.type) {
      // TODO: evtl. But in Foundry: Import entfernt die alten Actor-Daten nicht.
      // TODO: evtl. Bug in Foundry bzgl. template.json und entfernte Attribute
      // deshalb hier entfernen um Datenstruktur sauber zu halten
      delete actor.data["biography"];
      delete actor.data["states-text"];
      delete actor.data["skills-text"];
      delete actor.data["powers-text"];
      delete actor.data["combat-text"];
      delete actor.data["items-text"];

      // Max-Werte für Basis- und Puffer-LEP berechnen
      // TODO: automatisieren (rules)
      actor.data.health.min = -10;
      actor.data.health.max = 7 + actor.data.attributes.KKR.value
                                + actor.data.attributes.WIL.value
                                + actor.data.skills["Unempfindlichkeit"].value
                                + actor.data.temp["lep-bonus"];
      actor.data.power.min = 0;
      actor.data.power.max = 10;

      // INI, PW und AP berechnen
      // TODO: automatisieren (rules)
      actor.data.ini.value = actor.data.attributes.SIN.value
                                + actor.data.attributes.GES.value
                                + actor.data.skills["Reflexe"].value
                                + actor.data.temp["ini-bonus"];
      actor.data.calc = actor.data.calc || {};
      actor.data.calc.ap = 6 - actor.data.temp.pw
                                + actor.data.temp["ap-bonus"];

      // Motivation/Roles/Profession vorbereiten
      // TODO: automatisieren (rules)
      actor.data.motivation.available = true;
      actor.data["role-1"].available = true;
      actor.data["role-2"].available = this.level >= 2;
      actor.data["role-3"].available = this.level >= 7;
      actor.data.profession.available = this.level >= 2;

      // FIXME: items verlinken
    }
  }

  // get motivation() {
  //   const m = this.data.items.filter(i => "motivation" === i.type);
  //   return m.length > 0 ? m[0] : undefined;
  // }

  /** @override */
  prepareEmbeddedEntities() {
    // Create Item objects for the items in the actor data structure.
    super.prepareEmbeddedEntities();
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
        // TODO: render des sheets aufgrund des delete unterdrücken, überflüssig
        await this.deleteEmbeddedEntity("OwnedItem", remove);
        // TODO: id eintragen
      }
      else if ("role" === newItemData.type) {
        // TODO: check if an additional role is allowed (Lv. 1/2/7)
        // TODO: check for duplicates
        const level = this.level;
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
      // TODO: Jägerkräfte behandeln
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

    // TODO: temporäre Modifikation, um SCs bei gleicher INI Vorrang vor NSCs zu geben.
    if ("character" === this.type) {
      data.ini.value += 0.1;
    }

    // TODO: temporärer Konvertierungscode für INI bei NPCs, durch migration ersetzen
    if ("character" !== this.type) {
      data.ini = data.ini || {};
      data.ini.value = data.calc.ini;
    }

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
    // console.info("Processing", this.isToken ? "Token" : "", this.data.name); // FIXME: entfernen

    // TODO: auf Loop (wie bei Items) umstellen

    // early actors did not have a "_data-revision" attribute (but is added through the template),
    // so check for "core" and "calc" which do not appear in later revisions
    const legacy = (this.data.data.core !== undefined) && (this.data.data.calc !== undefined);
    const revision = legacy ? 0 : this.data.data["_data-revision"];

    // TODO: vorgelagerte Prüfung (z.B. _needToMigrate())
    // TODO: handle tokens
    if (this.isToken) return;

    // to avoid multiple migration runs, migration is only done by gamemaster
    if (!game.user.isGM) return; //TODO: Hinweis für Spieler, dass Actor noch nicht migriert.

    if ("character" === this.type) {

      switch (revision) {
        case 0: {
          // FIXME: log entfernen
          console.info("migrate", this.data.name, duplicate(this.data));
          const updates = {}, remove = {};

          // FIXME: ifs verwenden
          updates["data.health.min"] = 0; // calculated
          updates["data.health.max"] = 0; // calculated
          updates["data.power.max"] = 0; // calculated

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
          remove["data.power"] = {
            "-=min": null
          };

          // FIXME: erster update (setFlag ruft update auf) schlägt fehl, da game.actors nicht definiert ist.
          console.log(this.name, "update 1");
          await this.setFlag(Hexxen.scope, "data-revision", 1); // update will fail (error: collection not defined)
          console.log(this.name, "update 2");
          await this.update(updates);
          console.log(this.name, "update 3");
          await this.update(remove);

          // FIXME: log entfernen
          console.info("after migrate", this.data.name, duplicate(this.data));
          // continue
        }
        case 1:
        default:
      }
    }

  }

}
