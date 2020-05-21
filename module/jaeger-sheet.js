/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class JaegerSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "sheet", "actor", "jaeger"],
      template: "systems/" + CONFIG.Hexxen.scope + "/templates/jaeger-sheet.html", // FIXME basepath klären
      width: 700,
      height: 720,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills"}],
      scrollY: [ ".biography.scroll-y", ".states.scroll-y", ".skills.scroll-y", ".powers.scroll-y", 
        ".combat.scroll-y", ".items.scroll-y" ]
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
    let canConfigure = this.options.editable && (game.user.isGM || this.actor.owner);
    if (canConfigure) {
      buttons = [
        {
          label: (!!this.actor.getFlag(CONFIG.Hexxen.scope, "editMode")) ? "To Game Mode" : "To Edit Mode",
          class: "configure-edit",
          icon: "fas fa-" + (!!this.actor.getFlag(CONFIG.Hexxen.scope, "editMode") ? "dice" : "edit"),
          onclick: ev => this._onToggleEdit(ev)
        }
      ].concat(buttons);
    }
    return buttons
  }
  
  _onToggleEdit(event) {
    event.preventDefault();
    
    let mode = !!this.actor.getFlag(CONFIG.Hexxen.scope, "editMode") || false; // FIXME !! und || redundant?
    // toggle mode
    mode = !mode;

    // save changed flag (also updates inner part of actor sheet)
    // FIXME scope könnte nicht existieren, dann problematisch
    this.actor.setFlag(CONFIG.Hexxen.scope, "editMode", mode);

    // update button
    // FIXME was passiert remote?
    event.target.childNodes[0].className = "fas fa-" + (mode ? "dice" : "edit");
    event.target.childNodes[1].textContent = mode ? "To Game Mode" : "To Edit Mode";
  }


  /** @override */
  getData() {
    const data = super.getData();
    
    data.stypes = { "idmg": "Innerer Schaden", "odmg": "Äußerer Schaden", "mdmg": "Malusschaden", "ldmg": "Lähmungsschaden" };
    for ( let state of Object.values(data.data.states) ) {
      state.type = data.stypes[state.type];
    }
   
    // FIXME gehört teilweise in den Jaeger!
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
    
    // FIXME gehört teilweise in den Jaeger!
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
  
  // FIXME gehört in den Jaeger
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

    // Add roll listener
    // FIXME permissions??
    if (game.user.isGM || this.actor.owner) {
      html.find(".sheet-header .attributes").on("click", ".roll", this._onClickRoll.bind(this));
      html.find(".skills").on("click", ".li-control", this._onClickRoll.bind(this));
      html.find(".combat").on("click", ".li-control", this._onClickRoll.bind(this));
    }

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
    html.find(".sheet-header .resource").on("click", ".control", this._onClickPlusMinus.bind(this));
    html.find(".erste-hilfe").on("click", ".control", this._onClickStateToggle.bind(this));
    html.find(".einfluesse").on("click", ".control", this._onClickStateToggle.bind(this));
  }

  /** @override */
  async _renderInner(data, options={}) {
    let html = await super._renderInner(data, options);
    
    // FIXME ist _renderInner() oder _replaceHTML() besser?? Sonst Problem: Zugang zu html beim ersten Öffnen
    // Aktualisiere Zustände, die keine Form-Elemente sind
    this._updateState(html.find(".eh .controls")[0], "eh", options);
    this._updateState(html.find(".mh .controls")[0], "mh", options);
    this._updateState(html.find(".odmg .controls")[0], "odmg", options);
    this._updateState(html.find(".idmg .controls")[0], "idmg", options);
    this._updateState(html.find(".mdmg .controls")[0], "mdmg", options);
    this._updateState(html.find(".ldmg .controls")[0], "ldmg", options);
    
    return html;
  }
  
  _updateState(el, key, options={}) {
    // FIXME geht so nur für resources
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
    const bodyHeight = position.height - 255;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /**
   * Callback for click events on +/- mimic to adjust actor data.
   * The callback function expects the originating element to contain
   * the attribute "data-action" with a value of either "increase" or
   * "decrease". The originating element or one of it's parents must
   * also contain the attribute "data-key", which must identify the
   * actors data element to be modified. 
   * 
   * The originating element does not necessarily have to be an <a> element.
   * It is recommended for the "data-key" attribute to not be too far up
   * the tree to avoid side-effects.
   * 
   * Example:
   * <div class="..." data-key="data.resources.coups">
   *   ...
   *   <a class="..." data-action="increase">...</a>
   *   <a class="..." data-action="decrease">...</a>
   * </div>
   * 
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickPlusMinus(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // identify "data-action" and "data-key"
    const action = a.dataset.action;
    const targetEl = a.closest("[data-key]");

    if (!action || !targetEl) {
      console.log("Error in template: Can't identify required 'data-action' or 'data-key'. Ignoring event.", event);
      return;
    }

    // validate action
    if (! ["increase", "decrease"].includes(action) ) {
      console.log("Error in template: Invalid 'data-action': '%s' Ignoring event.", action);
      return;
    }
    // validate key
    const target = targetEl.dataset.key;
    const inc = "increase" === action ? 1 : -1;
    
    // modify actor data
    let e = this.form.elements[target];
    let value = Number(e.value) + inc;
    let updates = {};
    updates[target] = value;
    this.actor.update( updates );
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
    ChatMessage.create({speaker: { actor: this.actor._id }, content: "/hex " + rolls + "h # " + label });
//    await this._onSubmit(event); // FIXME klären
  }
  
  // TODO entfernen, wird wohl nicht mehr benötigt
  async _onClickSkillControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    if ( action === "roll" ) {
      const skill = a.parentNode.dataset.skill;
      let rolls = this.getSkillRolls(skill);
      console.log(skill + "-Probe: /hex " + rolls + "h");
      ChatMessage.create({speaker: { actor: this.actor._id }, content: "/hex " + rolls + "h # " + label });
      //      await this._onSubmit(event); // FIXME klären
   }
  }
  
  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

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