/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

class HexxenItem extends Item {

  constructor(...args) {
    super(...args);
  }

  static async create(data, options={}) {
    // inject custom flag
    data = HexxenEntityHelper.addCustomFlag(data);
    return await super.create(data, options);
  }

  get name() {
    // take name from data section in preference to entity name
    return this.data.data.name || super.name;
  }

  /** @override */
  initialize() {
    // to avoid multiple migration runs, migration is only done by gamemaster
    // do not run for compendium items
    if (!this.compendium && game.user.isGM) {
      // TODO: Check if item data have to be migrated, otherwise immediately call super.initialize()
      // FIXME: issue FVTT#3107, FVTT#3407
      HexxenUpdateQueue.enqueue(async () => {
        await this._migrateData();
        // TODO: vorgelagerte Prüfung (z.B. _needToMigrate()) z.B. via globalem Setting mit Versionsnummer
        // Trigger zum Setzen der Versionsnummer über ready-Hook und leere update Queue

        super.initialize();
      });
    } else {
      //TODO: Hinweis für Spieler, dass noch nicht migriert. Evtl. Lock-Layer?
      super.initialize();
    }

  }

  // FIXME: vielleicht lässt sich in händisch erstellte Items ein "custom" Flag einfügen
  // TODO: sicherstellen, dass data.name existiert

  async _migrateData() {
    // console.info("Processing", this.options.actor?.name, "[Item]", this.data.name);

    let updates = null, remove = null;
    let org = duplicate(this.data);

    do {
      // process update data of previous loop
      if (updates !== null || remove !== null) {
        if (remove) await this.update(remove);
        if (updates) await this.update(updates);
        const updated = duplicate(this.data);
        console.info("Migrating", this.options.actor ? (this.options.actor.isToken ? "[Token] " : "") + this.options.actor.name : "",
                    "[Item] " + this.data.name,
                    "\nbefore", org, "\nupdates", updates, "\nremove", remove, "\nafter", updated);
        updates = null;
        remove = null;
        org = updated;
      }

      // No revision in data before 0.5.10, but added from template in 0.5.10 or later!
      // In 0.5.10 data["template-revision"] was added, but missed the leading "_". Replaced from template in 0.5.11 or later!
      // Starting from 0.5.11 data["_template-revision"] should contain the valid revision.
      if (this.data.data["template-revision"]) {
        updates = {};
        updates["data._template-revision"] = this.data.data["template-revision"];
        remove = {};
        remove["data"] = { "-=template-revision": null };
        continue;
      }

      // unfortunately there is no way in identifying legacy item (created before 0.5.11) due to automatic template migration
      const legacy = false;
      const revision = this.data.data["_template-revision"];
      const compendium = this.getFlag(Hexxen.scope, "compendium");
      const custom = this.getFlag(Hexxen.scope, "custom");

      if ("motivation" === this.type) {
        // currently no manual modification neccessary
      }
      else if ("role" === this.type) {
        // currently no manual modification neccessary
      }
      else if ("profession" === this.type) {
        // currently no manual modification neccessary
      }
      else if ("power" === this.type) {
        // currently no manual modification neccessary
      }
      // Item type skills was deprecated in 0.5.10 and replaced by type power for consistancy reasons.
      else if ("skills" === this.type) {
        // Change type and add property "origin" for compatibility reasons. Mark deprecated.
        updates = {};
        updates["type"] = "power";
        updates["data._template-revision"] = 1;
        updates["data.origin"] = {};
        updates[`flags.${Hexxen.scope}.deprecated`] = true;
        continue;
      }

      // update/deprecated-Marker für alte Items
      if (!compendium && !custom) {
        // if already flagged --> continue without further updates
        if (this.getFlag(Hexxen.scope, "deprecated") === true) continue;

        // no compendium data, no custom flag --> mark deprecated
        updates = {};
        updates[`flags.${Hexxen.scope}.deprecated`] = true;
        continue;
      }
      else if (custom) {
        // if custom flag is set --> no further checks
        continue;
      }
      else if (compendium) {
        // if already flagged --> continue without further updates
        if (this.getFlag(Hexxen.scope, "badCompendiumId") === true || this.getFlag(Hexxen.scope, "update") === true) continue;

        // get pack
        const pack = compendium.pack ? game.packs.get(compendium.pack) : undefined;
        const cItem = pack && compendium.id ? await pack.getEntry(compendium.id) : undefined;
        if (!cItem) {
          updates = {};
          updates[`flags.${Hexxen.scope}.badCompendiumId`] = true;
          continue;
        }

        // compare data revisions
        const cFlags = cItem.flags[Hexxen.scope];
        const dataRev = this.getFlag(Hexxen.scope, "compendium.data-revision");
        const cRev = cFlags.compendium["data-revision"];
        if (!dataRev || dataRev < cRev) {
          updates = {};
          updates[`flags.${Hexxen.scope}.update`] = true;
          // TODO: automatisch aktualisieren, falls keine Modifikationen vorhanden?
          continue;
        }

        // up-to-date --> continue without further updates
        continue;
      }

    } while (updates || remove);
  }
}
