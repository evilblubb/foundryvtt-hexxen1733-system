/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class RuleItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["hexxen", "sheet", "rule"],
			template: Hexxen.basepath + "templates/rule-item-sheet.html",
			width: 520,
			height: 450,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
      // TODO: Scrollbars
		});
  }

  /* -------------------------------------------- */

  get title() {
    // TODO: nach HexxenItemSheet verschieben??
    // TODO: localize
    // TODO: Markierung Compendium-Eintrag wäre ein Kandidat für ein TweakVTT Modul
    const compendium = this.compendium ? "[Compendium] " : "";
    return `${compendium}${super.title} (${this.locType})`;
  }

  /** @override */
  setPosition(options={}) {
    // TODO: nach HexxenItemSheet verschieben (Mixin? - ActorSheet)
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const windowHeader = this.element.find(".window-header").css("height");
    const sheetHeader = this.element.find(".sheet-header").css("height");
    const sheetTabs = this.element.find(".sheet-tabs").css("height");
    const bodyHeight = position.height - Number.parseInt(windowHeader) - Number.parseInt(sheetHeader) - Number.parseInt(sheetTabs);
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  // TODO: nach HexxenItemSheet verschieben
  get actor() {
    return this.object.options.actor || null;
  }

  get locType() {
    return this.localizeType(this.item.data.type);
  }

  localizeType(type) {
    if ("role" === type) {
      type = "Rolle";
    } else if ("power" === type) {
      type = "Jägerkraft";
    } else if ("jaeger" === type) {
      type = "Allgemeine Jägerkraft";
    } else if ("esprit" === type) {
      type = "Espritkraft";
    } else if ("ausbau" === type) {
      type = "Ausbaukraft";
    } else if ("geselle" === type) {
      type = "Geselleneffekt";
    } else if ("experte" === type) {
      type = "Experteneffekt";
    } else if ("meister" === type) {
      type = "Meistereffekt";
    } else {
      type = type.capitalize();
    }
    return type
  }

  // TODO: nach HexxenItemSheet verschieben
  get compendium() {
    return this.object.compendium || null;
  }

  /** @override */
  getData() {
    const data = super.getData();
    data.actor = this.actor;
    data.compendium = this.compendium;

    data.type = data.item.type.capitalize();
    data.img = data.item.img; // TODO: basepath??

    // origin data for sheet header
    data.origin = [];
    if (data.data.origin) data.origin.push(data.data.origin.name);
    if (data.data.subtype) {
      data.origin.push(data.data.origin.power.name);
      data.origin.push(this.localizeType(data.data.subtype));
    } else if (data.data.type) {
      data.origin.push(this.localizeType(data.data.type));
    }
    data.origin = data.origin.join(" / ");

    if (data.data.create){
      data.data.create = TextEditor.enrichHTML(data.data.create);
    }

    if ( ["role", "profession"].includes(data.item.type) ) {
      const marker = {"stammeffekt": "S", "geselle": "G", "experte": "E", "meister": "M"};
      const powers = data.data.powers;
      powers.forEach(power => {
        const learned = this.actor ? this.actor.data.items.filter(i => i.type === "power") : []; // TODO: power statt skill
        if (this.actor && learned.filter(i => i.name === power.name).length != 0) {
          power.learned = true;
        }
        // TODO: schon gelernt?
        if ("ausbau" === power.type) {
          power.features.forEach(feature => {
            if (this.actor && learned.filter(i => i.name === feature.name) != 0) {
              feature.learned = true;
            }
            feature.marker = marker[feature.type];
          });
        }
      });
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // html.find("a[data-action='open']").on("click", HexxenCompendiumHelper.onClickOpenPower);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if ("motivation" === this.item.data.type) {

    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    if ("motivation" === this.item.data.type) {

    }

    // Update the Item
    return this.object.update(formData);
  }
}
