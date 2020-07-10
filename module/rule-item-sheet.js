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
    return super.title + " (" + this.item.data.type.capitalize() + ")";
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

  /** @override */
  getData() {
    const data = super.getData();
    data.type = data.item.type.capitalize();
    data.img = data.item.img; // TODO: basepath??

    if ("motivation" === data.item.type) {

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
