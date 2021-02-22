/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class SimpleItemSheet extends ItemSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["worldbuilding", "sheet", "item"],
			template: `${Hexxen.basepath}/templates/item-sheet.html`,
			width: 520,
			height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
		});
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();

    if ("item" === data.type) {
      data.dtypes = ["String", "Number", "Boolean"];
      for ( let attr of Object.values(data.data.attributes) ) {
        attr.isCheckbox = attr.dtype === "Boolean";
      }
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    // TODO: nach HexxenItemSheet verschieben (Mixin? - ActorSheet)
    // IMPORTANT: when used with Popout-Addon, position might not contain the correct dimensions!
    const position = super.setPosition(options);
    HexxenDOMHelper.calcSheetBodyHeight(this.element);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if ("item" === this.object.data.type) {
      // Add or Remove Attribute
      html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    if ("item" === this.object.data.type) {
      // Handle the free-form attributes list
      const formAttrs = expandObject(formData).data.attributes || {};
      const attributes = Object.values(formAttrs).reduce((obj, v) => {
        let k = v["key"].trim();
        if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
        delete v["key"];
        obj[k] = v;
        return obj;
      }, {});

      // Remove attributes which are no longer used
      for ( let k of Object.keys(this.object.data.data.attributes) ) {
        if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
      }

      // Re-combine formData
      formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
        obj[e[0]] = e[1];
        return obj;
      }, {_id: this.object._id, "data.attributes": attributes});
    }

    // Update the Item
    return this.object.update(formData);
  }
}
