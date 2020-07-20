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
    // TODO: localize
    let type = "";
    if ("role" === this.item.data.type) {
      type = "Rolle";
    } else {
      type = this.item.data.type.capitalize();
    }
    return `${super.title} (${type})`;
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

    if ( ["role", "profession"].includes(data.item.type) ) {
      const marker = {"stammeffekt": "S", "geselle": "G", "experte": "E", "meister": "M"};
      const powers = data.data.powers;
      powers.forEach(power => {
        const learned = this.actor ? this.actor.data.items.filter(i => i.type === "skills") : []; // TODO: power statt skill
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
