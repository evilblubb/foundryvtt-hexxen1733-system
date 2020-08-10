

class HexxenItem extends Item {

  constructor(...args) {
    super(...args);
  }

  get name() {
    // take name from data section in preference to entity name
    return this.data.data.name || super.name;
  }

  /** @override */
  initialize() {
    // TODO: Check if actor data have to be migrated, otherwise immediately call super.initialize()
    // TODO: ist async/await hier notwenig?
    // FIXME: issue #3107
    setTimeout(async () => {
      await this._migrateData();
      super.initialize();
    }, 500);
  }

  async _migrateData() {
    // early actors did not have a "_data-revision" attribute (but is added through the template),
    // so check for "core" and "calc" which do not appear in later revisions
    const legacy = false; // FIXME: (this.data.data.core !== undefined) && (this.data.data.calc !== undefined);
    const revision = 0; // FIXME: legacy ? 0 : this.data.data["template-revision"];

    // TODO: vorgelagerte Prüfung (z.B. _needToMigrate())

    // to avoid multiple migration runs, migration is only done by gamemaster
    if (!game.user.isGM) return; //TODO: Hinweis für Spieler, dass Actor noch nicht migriert.

    if ("skills" === this.type) {

      switch (revision) {
        case 0: {
          // FIXME: log entfernen
          console.info("migrate", this.data.name, duplicate(this.data));
          const updates = {}, remove = {};

          updates["type"] = "power"; // FIXME: test
          // // FIXME: ifs verwenden
          // updates["data.health.min"] = 0; // calculated
          // updates["data.health.max"] = 0; // calculated
          // updates["data.power.max"] = 0; // calculated

          // updates["data.level.value"] = this.data.data.core.level;
          // updates["data.languages.0.value"] = this.data.data.core.sprachen; // FIXME: array???
          // updates["data.vitiation.value"] = this.data.data.core.verderbnis;

          // updates["data.temp.pw"] = this.data.data.calc.pw;

          // updates["data.notes.biography.editor"] = this.data.data["biography"];
          // updates["data.notes.states.editor"] = this.data.data["states-text"];
          // updates["data.notes.skills.editor"] = this.data.data["skills-text"];
          // updates["data.notes.powers.editor"] = this.data.data["powers-text"];
          // updates["data.notes.combat.editor"] = this.data.data["combat-text"];
          // updates["data.notes.items.editor"] = this.data.data["items-text"];

          // // // identify motivation/role/profession itemId
          // const mot = this.data.items.filter(i => "motivation" === i.type);
          // if (mot.length > 0) {
          //   updates["data.motivation.itemId"] = mot[0]._id;
          // }
          // const role = this.data.items.filter(i => "role" === i.type);
          // for (let i = 0; i < 3; i++) {
          //   if (role.length > i) {
          //     updates[`data.role-${i+1}.itemId`] = role[i]._id;
          //   }
          // }
          // const prof = this.data.items.filter(i => "profession" === i.type);
          // if (prof.length > 0) {
          //   updates["data.profession.itemId"] = prof[0]._id;
          // }

          // remove["data"] = {
          //   "-=core": null,
          //   "-=calc": null,
          //   "-=biography": null,
          //   "-=states-text": null,
          //   "-=skills-text": null,
          //   "-=powers-text": null,
          //   "-=combat-text": null,
          //   "-=items-text": null
          // };
          // remove["data.power"] = {
          //   "-=min": null
          // };

          // // FIXME: erster update (setFlag ruft update auf) schlägt fehl, da game.actors nicht definiert ist.
          // console.log(this.name, "update 1");
          // await this.setFlag(Hexxen.scope, "data-revision", 1); // update will fail (error: collection not defined)
          console.log(this.name, "update 2");
          await this.update(updates);
          // console.log(this.name, "update 3");
          // await this.update(remove);

          // // FIXME: log entfernen
          // console.info("after migrate", this.data.name, duplicate(this.data));
          // // continue
        }
        case 1:
        default:
      }
    }

  }
}
