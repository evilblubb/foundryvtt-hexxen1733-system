/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class JaegerSheet extends HexxenActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "sheet", "actor", "jaeger"],
      template: Hexxen.basepath + "templates/jaeger-sheet.html",
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


  /* -------------------------------------------- */

  /** @override */
  getData() {
    // get duplicated data
    const data = super.getData();

    // contains (from BaseEntitySheet)
    //   entity: any; (copy of this.actor.data; data only, not the Actor instance)
    //   owner: boolean;
    //   limited: boolean;
    //   options: any;
    //   editable: boolean;
    //   cssClass: string;
    // (from ActorSheet)
    //   actor: any; (alias for entity)
    //   data: any; (alias for actor.data; inner data)
    //   items: any; (alias for actor.items; data only, not the Item instance; sorted, contains all subtypes)

    // header resources
    let hres = {}
    for( let key of [ "segnungen", "ideen", "coups" ] ) {
      // FIXME: temporärer Code bis zur Änderung der Datenstruktur im Actor
      hres[key] = {value: data.data.resources[key]};
      // hres[key] = data.data.resources[key];
    }
    // FIXME: temporärer Code bis zur Änderung der Datenstruktur im Actor
    hres["segnungen"].label = "Segnungen";
    hres["segnungen"].max = 5;
    hres["ideen"].label = "Ideen [=WIS]";
    hres["ideen"].default = data.data.attributes.WIS.value;
    hres["coups"].label = "Coups [=ATH]";
    hres["coups"].default = data.data.attributes.ATH.value;
    data["header-resources"] = hres;
    
    let mot = this.actor.itemTypes.motivation; // returns items, not data
    mot = mot.length > 0 ? mot[0].data : undefined; 
    if (mot) {
      data.data.core["motivation"] = mot.name;
      // FIXME: HTML aus MCE behandeln
      data.data.core["motivation-bonus"] = mot.data.summary ? $(mot.data.summary)[0].innerText : "";
      data.data.core["motivation-id"] = mot._id;
    }
    let role = this.actor.itemTypes.role; // returns items, not data
    switch (role.length) {
      case 3: 
        data.data.core["rolle-3"] = role[2].data.name;
        data.data.core["rolle-3-id"] = role[2].data._id;
        // no break
      case 2: 
        data.data.core["rolle-2"] = role[1].data.name;
        data.data.core["rolle-2-id"] = role[1].data._id;
        // no break
      case 1: 
        data.data.core["rolle-1"] = role[0].data.name;
        data.data.core["rolle-1-id"] = role[0].data._id;
        // no break
      default:
        data.data.core["rolle-3-hint"] = data.data.core.level < 7 ? "Verfügbar ab Level 7" : "Rolle verfügbar";
        data.data.core["rolle-2-hint"] = data.data.core.level < 2 ? "Verfügbar ab Level 2" : "Rolle verfügbar";
        data.data.core["rolle-1-hint"] = data.data.core.level < 1 ? "Verfügbar ab Level 1" : "Rolle verfügbar";
    }

    data.stypes = { "idmg": "Innerer Schaden", "odmg": "Äußerer Schaden", "mdmg": "Malusschaden", "ldmg": "Lähmungsschaden" };
    for ( let state of Object.values(data.data.states) ) {
      state.type = data.stypes[state.type];
    }

    // FIXME: gehört teilweise in den Jaeger!
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

    // FIXME: gehört teilweise in den Jaeger!
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

    // TODO: data.items filtern, sobald alle anderen subtypen abgehandelt
    
    return data;
  }

  // FIXME: gehört in den Jaeger
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
  async _renderInner(data, options={}) {
    let html = await super._renderInner(data, options);

    // FIXME: ist _renderInner() oder _replaceHTML() besser?? Sonst Problem: Zugang zu html beim ersten Öffnen
    // Aktualisiere Zustände, die keine Form-Elemente sind
    // oder in activateListener(), foundry macht das auch
    this._updateState(html.find(".eh .controls")[0], "eh", options);
    this._updateState(html.find(".mh .controls")[0], "mh", options);
    this._updateState(html.find(".odmg .controls")[0], "odmg", options);
    this._updateState(html.find(".idmg .controls")[0], "idmg", options);
    this._updateState(html.find(".mdmg .controls")[0], "mdmg", options);
    this._updateState(html.find(".ldmg .controls")[0], "ldmg", options);

    return html;
  }

  _updateState(el, key, options={}) {
    // FIXME: geht so nur für resources
    // FIXME: auf korrelierendes INPUT type=hidden umstellen
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Add roll listener
    // FIXME: permissions??
    if (game.user.isGM || this.actor.owner) {
      html.find(".sheet-header .attributes").on("click", ".roll", this._onClickRoll.bind(this));
      html.find(".skills").on("click", ".li-control", this._onClickRoll.bind(this));
      html.find(".combat").on("click", ".li-control", this._onClickRoll.bind(this));
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      // TODO: Überprüfungen
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      // TODO: Überprüfungen
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // +/- Buttons
    // Segnungen, Ideen, Coups
    html.find(".sheet-header .inc-btn").hover(HexxenIncDecHelper.onHoverPlusMinus.bind(this));
    html.find(".sheet-header .inc-btn").on("click", ".control", HexxenIncDecHelper.onClickPlusMinus.bind(this));
    html.find(".sheet-header .set-default").on("click", HexxenIncDecHelper.onClickPlusMinus.bind(this));
    // Erste Hilfe, Mag. Heilung, Elixire
    html.find(".states .top").on("click", ".control", HexxenIncDecHelper.onClickPlusMinus.bind(this));
  }

  /* -------------------------------------------- */

  async _onClickRoll(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;

    const type = a.dataset.type;
    const key = a.parentNode.dataset.key;

    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // console.log(event);

    // shift or ctrl click --> delegate
    if ( event.originalEvent.shiftKey || event.originalEvent.ctrlKey ) {
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
      if (target.schaden) label += ` (SCH +${target.schaden})`;
    }

    ChatMessage.create({speaker: { actor: this.actor._id }, content: "/hex " + rolls + "h # " + label });
  }

  /* -------------------------------------------- */

  // FIXME: ungültige Eingaben in numerischen Textfeldern filtern

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
