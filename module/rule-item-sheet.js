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
class RuleItemSheet extends ItemSheet {

  constructor(...args) {
    super(...args);

    if (this.compendium) {
      // inject additional class to enable compendium-specific styles
      this.options.classes.push("compendium");
    } else if (!this.actor) {
      this.options.classes.push("world");
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
    // Falls Tweak: this.actor ist nicht allgemein verfügbar!
    const prefix = this.compendium ? "[Compendium] " : (!this.actor ? "[World] " : "");
    return `${prefix}${super.title}`;
  }

  /** @override */
  setPosition(options={}) {
    // TODO: nach HexxenItemSheet verschieben (Mixin? - ActorSheet)
    // IMPORTANT: when used with Popout-Addon, position might not contain the correct dimensions!
    const position = super.setPosition(options);
    HexxenDOMHelper.calcSheetBodyHeight(this.element);
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

  get MARKER() { return {"stammeffekt": "S", "geselle": "G", "experte": "E", "meister": "M"}; }

  /** @override */
  getData() {
    const data = super.getData();
    data.actor = this.actor;
    data.name = data.item.data.name || data.item.name; // TODO: via Item?
    data.img = data.item.img; // TODO: basepath??
    data.type = this.localizeType(data.item.type); // motivation/role/profession/power
    if ("profession" === data.item.type && data.item.data.type) {
      data.type = this.localizeType(data.item.data.type); // meisterprofession
    }
    data.compendium = this.compendium;

    // TODO: besser ins Item? Dadurch auch für Markierung in Übersichtslisten nutzbar
    data.warnings = {};
    data.warnings.deprecated = this.item.getFlag(Hexxen.scope, "deprecated");
    data.warnings.bad = this.item.getFlag(Hexxen.scope, "badCompendiumId");
    data.warnings.update = this.item.getFlag(Hexxen.scope, "update");
    // const custom = this.item.getFlag(Hexxen.scope, "custom");
    // const modified = this.item.getFlag(Hexxen.scope, "modified");
    if (!data.warnings.deprecated && !data.warnings.bad && !data.warnings.update) delete data.warnings;

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

    // prepare powers and features
    if ( ["role", "profession"].includes(data.item.type) ) {
      this._preparePowers(data, data.data.powers);
    }

    if ("power" === data.item.type && data.data.features) {
      this._prepareFeatures(data, data.data.features);
    }

    return data;
  }

  _preparePowers(data, powers) {
    // TODO: Filter code für gelernte Kräfte gehört in den Actor
    const learned = this.actor ? this.actor.data.items.filter(i => i.type === "power") : [];
    data.powers = { "jaeger": [], "esprit": [], "ausbau": [] };

    powers.forEach(power => {
      // filter by type
      data.powers[power.type].push(power);

      // mark learned powers
      if (this.actor && learned.filter(i => i.data.name === power.name).length != 0) {
        power.learned = true;
      }
      if ("ausbau" === power.type) {
        this._prepareFeatures(data, power.features);
      }
    });

    // sort filtered lists
    Object.values(data.powers).forEach(p => p.sort((a,b) => a.name.localeCompare(b.name)));
  }

  _prepareFeatures(data, features) {
    // TODO: Filter code für gelernte Kräfte gehört in den Actor
    const learned = this.actor ? this.actor.data.items.filter(i => i.type === "power") : [];
    if ("power" === data.item.type) data.features = { "S": [], "G": [], "E": [], "M": [] };

    features.forEach(feature => {
      feature.marker = this.MARKER[feature.type];
      if (data.features) data.features[feature.marker].push(feature);

      if (this.actor && learned.filter(i => i.data.name === feature.name).length != 0) {
        feature.learned = true;
      }
      // TODO: Voraussetzung prüfen
      if (false) {
        feature.locked = true;
      }
    });
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

    // TODO: name Updates behandeln, falls Änderung erlaubt
    // TODO: img ändern, falls erlaubt

    if ("motivation" === this.item.data.type) {

    }

    // Update the Item
    return this.object.update(formData);
  }
}
