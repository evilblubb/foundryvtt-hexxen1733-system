/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class JaegerSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "sheet", "actor", "jaeger"],
      template: "systems/" + CONFIG.Hexxen.scope + "/templates/jaeger-sheet.html", // FIXME basepath kl‰ren
      width: 700,
      height: 720,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${super.title} (Lv. ${this.actor.data.data.core.level})`;
  }

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    let canConfigure = this.options.editable && (game.user.isGM || (this.actor.owner && game.user.isTrusted));
    if (canConfigure) {
      buttons = [
        {
          label: "Edit",
          class: "configure-edit",
          icon: "fas fa-edit",
          onclick: ev => this._onToggleEdit(ev)
        }
      ].concat(buttons);
    }
    return buttons
  }
  
  _onToggleEdit(event) {
    event.preventDefault();
    
    let mode = !!this.actor.getFlag(CONFIG.Hexxen.scope, "editMode") || false; // FIXME !! und || redundant?
    // FIXME this.object.setFlag vgl. foundry:18320/9981
    this.actor.setFlag(CONFIG.Hexxen.scope, "editMode", !mode);
    // this.entity.data.flags.editMode = !mode;
  }


  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for ( let attr of Object.values(data.data.attributes) ) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    
    data.stypes = { "idmg": "Innerer Schaden", "odmg": "√Ñu√üerer Schaden", "mdmg": "Malusschaden", "ldmg": "L√§hmungsschaden" };
    for ( let state of Object.values(data.data.states) ) {
      state.type = data.stypes[state.type];
    }
   
    // Skills aufbereiten
    data.data.skills = data.data.skills || {}; // sicherstellen, dass skills existiert
    for ( let skill of Object.values(data.data.skills) ) {
      let attrKey = skill.attribute;
      let attr = data.data.attributes[attrKey]; // undefined falls nicht existent
      let extra = (attrKey === "SIN" || attrKey === "WIS" || attrKey === "WIL") ? " (I)" : " (C)";
      let value = attr ? attr.value : 0;
      skill.attrValue = value;
      skill.attrLabel = attr ? attr.label : "unbekanntes Attribut";
      skill.summe = Number(skill.value) + Number(value);
      skill.label += extra;
    }
    
    //Kampfskills aufbereiten
    data.data.combat = data.data.combat || {};
    for ( let skill of Object.values(data.data.combat) ) {
      let attrKey = skill.attribute;
      let attr = data.data.attributes[attrKey]; // undefined falls nicht existent
      let extra = (attrKey === "SIN" || attrKey === "WIS" || attrKey === "WIL") ? " (I)" : " (C)";
      let value = attr ? attr.value : 0;
      skill.attrValue = value;
      skill.attrLabel = attr ? attr.label : "unbekanntes Attribut";
      skill.summe = Number(skill.value) + Number(value);
      skill.label += extra;
    }
    
    return data;
  }
  
  getSkillRolls(key) {
    let data = this.entity.data;
    let skill = data.data.skills[key] || data.data.combat[key];
    let attr = data.data.attributes[skill.attribute]; // undefined falls nicht existent
    let value = attr ? attr.value : 0;
    let rolls = Number(skill.value) + Number(value);
    return rolls;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Add or Remove Attribute
    //html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
    // Add roll listener
    html.find(".sheet-header .resource").on("click", ".control", this._onClickPlusMinus.bind(this));
    html.find(".sheet-header .attributes").on("click", ".roll", this._onClickRoll.bind(this));
    html.find(".erste-hilfe").on("click", ".control", this._onClickStateToggle.bind(this));
    html.find(".einfluesse").on("click", ".control", this._onClickStateToggle.bind(this));
    html.find(".skills").on("click", ".li-control", this._onClickRoll.bind(this));
    html.find(".combat").on("click", ".li-control", this._onClickRoll.bind(this));
  }

  /** @override */
  async _renderInner(data, options={}) {
    let html = await super._renderInner(data, options);
    
    // FIXME ist _renderInner() besser??
    // Aktualisiere Zust√§nde, die keine Form-Elemente sind
    this._updateState(html.find(".eh .controls")[0], "eh", options);
    this._updateState(html.find(".mh .controls")[0], "mh", options);
    this._updateState(html.find(".odmg .controls")[0], "odmg", options);
    this._updateState(html.find(".idmg .controls")[0], "idmg", options);
    this._updateState(html.find(".mdmg .controls")[0], "mdmg", options);
    this._updateState(html.find(".ldmg .controls")[0], "ldmg", options);
    
    return html;
  }
  
  _updateState(el, key, options={}) {
    // FIXME geht so nur f√ºr resources
    const curent = this.actor.data.data.resources[key];
    const max = el.childElementCount;

    for (let i = 0; i < max; i++) {
      el.children[i].dataset.action = i < curent ? "decrease" : "increase";
      let cl = el.children[i].children[0].classList;
      if (i < curent) {
        cl.remove("fa-inverse"); // wird schwarz
      } else {
        cl.add("fa-inverse"); // wird weiss
      }
    }
  }  

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 252;
    sheetBody.css("height", bodyHeight);
    return position;
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
  
  async _onClickPlusMinus(event) {
    event.preventDefault();
    
    const a = event.currentTarget;
    const action = a.dataset.action;
    const inc = "increase" === action ? 1 : -1;
    const target = a.parentNode.dataset.key;
    const form = this.form;
    
    let e = form.elements["data.resources." + target];
    e.value = Number(e.value) + inc;
  }

  async _onClickStateToggle(event) {
    event.preventDefault();
    
    const a = event.currentTarget;
    const action = a.dataset.action;
    const inc = "increase" === action ? 1 : -1;
    const parent = a.parentNode;
    const max = parent.childElementCount; // FIXME [key].max ??
    const key = parent.parentNode.dataset.key; // FIXME besser rekursiv suchen

    let curent = this.actor.data.data.resources[key] + inc;
    curent = curent < 0 ? 0 : (curent > max ? max : curent);
    
    let update = {};
    let res = `data.resources.${key}`;
    update[res] = curent;
    this.actor.update(update); // FIXME kann man das kompakter schreiben??
  }
  
  async _onClickRoll(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    
    const type = a.dataset.type;
    const key = a.parentNode.dataset.key;
    
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    console.log(event);
    
    // shift or ctrl click --> delegate
    if ( event.originalEvent.shiftKey || event.originalEvent.ctrlKey ) {
      console.log("Roller for " + type + " " + key);
      new HexxenRoller(this.actor, /* options */ {
        top: this.position.top + 40,
        left: this.position.left + ((this.position.width - 400) / 2)
      }, /* hints */ {
        type: type,
        key: key
      }).render(true);
      return;
    }

    let rolls = 0;
    let label = "";
    if ( action === "roll" && type === "attribute" ) {
      rolls = attrs[key].value;
      label = attrs[key].label;
    }
    else {
      rolls = this.getSkillRolls(key);
      let target = this.object.data.data.skills[key] || this.object.data.data.combat[key];
      label = target.label;
    }
    
    console.log(label + "-Probe: /hex " + rolls + "h");
    ui.chat.processMessage("/hex " + rolls + "h");
//    await this._onSubmit(event); // FIXME kl‰ren
  }
  
  async _onClickSkillControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    if ( action === "roll" ) {
      const skill = a.parentNode.dataset.skill;
//      console.log(event);
//      console.log("I'm rolling, rolling, rolling ... " + skill);
      let rolls = this.getSkillRolls(skill);
      console.log(skill + "Probe: /hex " + rolls + "h");
      ui.chat.processMessage("/hex " + rolls + "h");
//      await this._onSubmit(event); // FIXME kl‰ren
   }
  }
  
  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    /*
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim(); // FIXME gibt es nicht mehr
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
    */
    
    // Update the Actor
    return this.object.update(formData);
  }
}

/**
 * An important step is to register your sheet so it can be used
 */
Actors.registerSheet("hexxen", JaegerSheet, {
  types: ["character"], // Use this sheet for all types of actors, or just a specific type?
  makeDefault: true     // Make this sheet the default choice for these types of actors?
});