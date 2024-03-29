﻿/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

class JaegerSheet extends HexxenActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "sheet", "actor", "jaeger"],
      template: `${Hexxen.basepath}/templates/jaeger-sheet.html`,
      width: 700,
      height: 720,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills"}],
      scrollY: [ ".biography.scroll-y", ".states.scroll-y", ".skills.scroll-y", ".powers.scroll-y",
        ".combat.scroll-y", ".items.scroll-y" ],
      dragDrop: [
        {dragSelector: ".items-list .item", dropSelector: null},
        {dragSelector: ".roll", dropSelector: null}
      ]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${super.title} (Lv. ${this.actor.level})`;
  }

  /** @override */
  setPosition(options={}) {
    // TODO: nach HexxenActorSheet verschieben (Mixin? - ItemSheet)
    // IMPORTANT: when used with Popout-Addon, position might not contain the correct dimensions!
    const position = super.setPosition(options);
    HexxenDOMHelper.calcSheetBodyHeight(this.element);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // get duplicated data
    const out = super.getData();

    // contains (from BaseEntitySheet)
    //   entity: any; (copy of this.actor.data; data only, not the Actor instance)
    //   owner: boolean;
    //   limited: boolean;
    //   options: any;
    //   editable: boolean; (not read-only)
    //   cssClass: string;
    // (from ActorSheet)
    //   actor: any; (alias for entity)
    //   data: any; (alias for actor.data; inner data)
    //   items: any; (alias for actor.items; data only, not the Item instance; sorted, contains all subtypes)
    // (from HexxenActorSheet)
    //   editMode: boolean; (full set (true) or limited set (false) of form elements)

    // TODO: verallgemeinern (alle Items)
    out.actor.items.forEach(i => {
      i.data.description = i.data.summary ? i.data.summary : i.data.description;
    });

    // header resources
    let hres = {}
    for( let key of [ "ideen", "coups", "segnungen", "rage", "ambition", "quintessenz" ] ) {
      // TODO: temporärer Code bis zur Änderung der Datenstruktur im Actor
      hres[key] = {value: out.data.resources[key]};
      // hres[key] = data.data.resources[key];
    }
    // TODO: temporärer Code bis zur Änderung der Datenstruktur im Actor
    hres["ideen"].label = "Ideen";
    hres["ideen"].default = out.data.attributes.WIS.value + out.data.temp["idee-bonus"];
    hres["coups"].label = "Coups";
    hres["coups"].default = out.data.attributes.ATH.value + out.data.temp["coup-bonus"];
    hres["segnungen"].label = "Segnungen";
    hres["segnungen"].max = 5;
    hres["rage"].label = "Rage";
    hres["rage"].max = 5;
    hres["ambition"].label = "Ambitionen";
    hres["ambition"].max = 5;
    hres["quintessenz"].label = "Quintessenz";
    hres["quintessenz"].max = 5;
    out["header-resources"] = hres;

    // TODO: hints auf localize umstellen
    out.data.motivation["available-hint"] = "Keine Motivation ausgewählt";
    out.data.motivation["hint"] = "oops";
    // FIXME: das sollte (teilweise?) bereits im actor.prepare() passieren
    let mot = this.actor.itemTypes.motivation; // returns items, not data
    mot = mot.length > 0 ? mot[0].data : undefined;
    if (mot) {
      out.data.motivation.item = mot;
      out.data.motivation.bonus = mot.data.summary ? mot.data.summary : mot.data.description;
    }

    // TODO: hints auf localize umstellen
    out.data["role-1"]["available-hint"] = "Keine Rolle ausgewählt";
    out.data["role-1"]["hint"] = "oops";
    out.data["role-2"]["available-hint"] = "Keine Rolle ausgewählt";
    out.data["role-2"]["hint"] = "Verfügbar ab Jägerstufe 2";
    out.data["role-3"]["available-hint"] = "Keine Rolle ausgewählt";
    out.data["role-3"]["hint"] = "Verfügbar ab Jägerstufe 7";
    // FIXME: das sollte (teilweise?) bereits im actor.prepare() passieren
    let role = this.actor.itemTypes.role; // returns items, not data
    switch (role.length) {
      case 3:
        out.data["role-3"].item = role[2].data;
        // no break
      case 2:
        out.data["role-2"].item = role[1].data;
        // no break
      case 1:
        out.data["role-1"].item = role[0].data;
        // no break
      default:
    }

    // TODO: hints auf localize umstellen
    out.data.profession["available-hint"] = "Keine Profession ausgewählt";
    out.data.profession["hint"] = "Verfügbar ab Jägerstufe 2";
    // FIXME: das sollte (teilweise?) bereits im actor.prepare() passieren
    let prof = this.actor.itemTypes.profession;
    prof = prof.length > 0 ? prof[0].data : undefined;
    if (prof) {
      out.data.profession.item = prof;
    }

    // FIXME: temporary code until array annotation is identified
    const languages = {};
    languages.value = out.data.languages["0"].value;
    out.data.languages = languages;

    out.stypes = { "idmg": "Innerer Schaden", "odmg": "Äußerer Schaden", "mdmg": "Malusschaden", "ldmg": "Lähmungsschaden" };
    for ( let state of Object.values(out.data.states) ) {
      state.type = out.stypes[state.type];
    }

    // TODO: gehört teilweise in den Jaeger!
    // Skills aufbereiten
    out.data.skills = out.data.skills || {}; // sicherstellen, dass skills existiert
    for ( let skill of Object.values(out.data.skills) ) {
      let attrKey = skill.attribute;
      let attr = out.data.attributes[attrKey]; // undefined falls nicht existent
      let extra = (attrKey === "SIN" || attrKey === "WIS" || attrKey === "WIL") ? " (I)" : " (C)";
      let value = attr ? attr.value : 0;
      skill.attrValue = value;
      skill.attrLabel = attr ? attr.label : "unbekanntes Attribut";
      skill.summe = Number(skill.value) + Number(value);
      skill.label += extra;
    }

    // TODO: gehört teilweise in den Jaeger!
    //Kampfskills aufbereiten
    out.data.combat = out.data.combat || {};
    for ( let skill of Object.values(out.data.combat) ) {
      let attrKey = skill.attribute;
      let attr = out.data.attributes[attrKey]; // undefined falls nicht existent
      let extra = (attrKey === "SIN" || attrKey === "WIS" || attrKey === "WIL") ? " (I)" : " (C)";
      let value = attr ? attr.value : 0;
      skill.attrValue = value;
      skill.attrLabel = attr ? attr.label : "unbekanntes Attribut";
      skill.summe = Number(skill.value) + Number(value);
      skill.label += extra;
    }
    // TODO: Waffenfertigkeiten ggf. nach equipped sortieren

    // TODO: data.items filtern, sobald alle anderen subtypen abgehandelt
    out.actor.powers = out.actor.items.filter(i => { return "power" === i.type; });
    out.actor.items = out.actor.items.filter(i => { return "item" === i.type; });

    out.data.calc.ldmg_max = Math.min(out.data.calc.ap, 5);

    return out;
  }

  // TODO: gehört in den Jaeger
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

    // TODO: ist _renderInner() oder _replaceHTML() besser?? Sonst Problem: Zugang zu html beim ersten Öffnen
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
    // TODO: geht so nur für resources
    // TODO: auf korrelierendes INPUT type=hidden umstellen
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
  activateListeners(html) {
    super.activateListeners(html);

    // Add roll listener
    // TODO: permissions??
    if (game.user.isGM || this.actor.owner) {
      html.find(".skills .attributes").on("click", ".roll", this._onClickRoll.bind(this));
      html.find(".skills").on("click", ".li-control", this._onClickRoll.bind(this));
      html.find(".combat").on("click", ".li-control", this._onClickRoll.bind(this));
    }

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      // TODO: Überprüfungen
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      const app = item.sheet.render(true);
      HexxenAppAlignmentHelper.align(app, ev);
    });

    // Toggle description
    html.find('.items-list .item h4').on("click", ev => {
      // TODO: Zielelement sicherer identifizieren
      $(ev.currentTarget.nextElementSibling).toggle();
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Create OwnedItem
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    // TODO: Listener von class item-delete auf data-action delete umstellen, auch .html
    html.find('.item-delete').click(ev => {
      // TODO: Überprüfungen
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Item controls bei hover anzeigen
    // TODO: Hover Helper verallgemeinern
    //html.find(".item").hover(HexxenIncDecHelper.onHoverPlusMinus);
    html.find("a[data-action='select']").on("click", HexxenCompendiumHelper.onClickOpenCompendium);

    // +/- Buttons
    // Segnungen, Ideen, Coups
    html.find(".sheet-header .inc-btn").hover(HexxenIncDecHelper.onHoverPlusMinus.bind(this));
    html.find(".sheet-header .inc-btn").on("click", ".control", HexxenIncDecHelper.onClickPlusMinus.bind(this));
    html.find(".sheet-header .set-default").on("click", HexxenIncDecHelper.onClickPlusMinus.bind(this));
    // Erste Hilfe, Mag. Heilung, Elixire
    html.find(".states .res-boxes").on("click", ".control", HexxenIncDecHelper.onClickPlusMinus.bind(this));
  }

  /* -------------------------------------------- */

  // TODO: async notwendig?
  async _onItemCreate(event) {
    console.log(event);
    // TODO: unterschiedliche Typen auswählbar machen
    this.actor.createOwnedItem({name: "New Item", type: "item"}, {renderSheet: true});
  }

  async _onClickRoll(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;

    const type = a.dataset.type;
    const key = a.parentNode.dataset.key;

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

    this._handleRoll(action, type, key);
  }

  _handleRoll(action, type, key) {
    const attrs = this.object.data.data.attributes;
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

    HexxenRollHelper.rollToChat(this.actor, { h: rolls }, label);
  }

  _onDragStart(event) {
    if (event.target.classList.contains('roll'))
    {
      // Create drag data for an owned item
      const a = event.currentTarget;
      const action = a.dataset.action;

      const type = a.dataset.type;
      const key = a.parentNode.dataset.key;

      const dragData = {
        type: "HexxenRoll",
        actorId: this.actor.id,
        data: {type: type, key: key}
      };
      if (this.actor.isToken) {
        dragData.sceneId = canvas.scene.id;
        dragData.tokenId = this.actor.token.id;
      }

      // Set data transfer
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      return;
    }
    return super._onDragStart(event);
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // TODO: ungültige Eingaben in numerischen Textfeldern filtern (NaN oder null)
    for (const key in formData) {
      if (formData.hasOwnProperty(key)) {
        const data = formData[key];
        // if (data === null) formData[key] = 0; // TODO: Defaultwert?
        // else
        if (typeof(data) === "number" && isNaN(data)) {
          ui.notifications.warn(`Ungültige Eingabe für ${key}`); // TODO: was machen?
          // delete formData[key];
        }
      }
    }

    // TODO: temporary code until data structure change in actor
    if (formData.hasOwnProperty("data.languages.value")){
      formData["data.languages.0.value"] = formData["data.languages.value"];
      delete formData["data.languages.value"];
    }

    // Update the Actor
    return this.object.update(formData);
  }
}
