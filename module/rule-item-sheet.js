/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class RuleItemSheet extends ItemSheet {

  constructor(...args) {
    super(...args);

    if (this.compendium) {
      // inject additional class to enable compendium-specific styles
      this.options.classes.push("compendium");
    }
  }

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
    return `${compendium}${super.title}`;
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
    if (!type) return type;

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
    } else if ("meisterprofession" === type) {
      type = "Meisterprofession";
    } else {
      type = type.capitalize();
    }
    return type;
  }

  // TODO: nach HexxenItemSheet verschieben
  get compendium() {
    return this.object.compendium || null;
  }

  /** @override */
  getData() {
    const marker = {"stammeffekt": "S", "geselle": "G", "experte": "E", "meister": "M"};
    const data = super.getData();
    data.actor = this.actor;
    data.compendium = this.compendium;
    data.type = this.localizeType(data.item.type); // motivation/role/profession/power
    if ("profession" === data.item.type && data.item.data.type) {
      data.type = this.localizeType(data.item.data.type);
    }
    data.img = data.item.img; // TODO: basepath??

    // data.item.type: motivation/role/profession/power
    // data.type: localized(data.item.type)
    // data.data.type === data.item.data.type: jaeger/esprit/ausbau
    // data.data.subtype === data.item.data.subtype: stammeffekt/geselle/experte/meister

    // origin data for sheet header
    data.origin = [];
    if ("power" !== data.item.type) {
      data.origin.push(data.type);
    } else {
      if (data.data.subtype) {
        data.origin.push(this.localizeType(data.data.subtype)); // stammeffekt/geselle/experte/meister
        data.origin.push(`${this.localizeType(data.data.type)}: ${data.data.origin.power.name}`);
      } else {
        data.origin.push(this.localizeType(data.data.type)); // jaeger/esprit/ausbau
      }
      data.origin.push(data.data.origin.name);
    }
    data.origin = data.origin.join(" / ");

    if (data.data.create){
      data.data.create = TextEditor.enrichHTML(data.data.create);
    }

    if ( ["role", "profession"].includes(data.item.type) ) {
      const powers = data.data.powers;
      powers.forEach(power => {
        const learned = this.actor ? this.actor.data.items.filter(i => i.type === "power") : [];
        if (this.actor && learned.filter(i => i.name === power.name).length != 0) {
          power.learned = true;
        }
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

    if ("power" === data.item.type && data.data.features) {
      const learned = this.actor ? this.actor.data.items.filter(i => i.type === "power") : [];
      data.data.features.forEach(feature => {
        if (this.actor && learned.filter(i => i.name === feature.name) != 0) {
          feature.learned = true;
        }
        feature.marker = marker[feature.type];
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
