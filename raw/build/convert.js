/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const { input } = require('../buildDBs.js'); // TODO: falls möglich eliminieren
const { generateID } = require('./ids.js');

const vttSystemName = "hexxen-1733";
const packPrefix = "hexxen";
const HEXXEN_JAEGER_ICON = `systems/${vttSystemName}/img/Siegel-Rabe-small.png`;
const HEXXEN_EXPRIT_ICON = `systems/${vttSystemName}/img/Siegel-Esprit-small.png`;
const HEXXEN_AUSBAU_ICON = `systems/${vttSystemName}/img/Siegel-Ausbaukraft-small.png`;
const HEXXEN_DEFAULT_ICON = HEXXEN_JAEGER_ICON;

let error;

function convertItems(type, items) {
  error = false;

  if (Array.isArray(items)) {
    // TODO: try-catch??
    const content = items.map( (item, idx) => convertItem(type, item, [type, idx].join('/')) );
    return [{ content: content }, error];
  }
  else {
    throw new TypeError(`  ${type}: [@@] Unsupported type "${typeof(items)}"! Expected "array".`);
  }
}
exports.convertItems = convertItems;

function convertItem(type, item, path) {
  const out = {};

  // basic properties
  // FIXME: ID schon bei validierung generieren??
  out._id = item._id || generateID(16);
  out.type = type;
  out.name = item.name;

  // basic data properties
  out.data = {}; // FIXME: zurücknehmen { "_template-revision": 0, name: null };
  out.data.description = _convertMultilineText(item.description) || ""; // TODO: Refs konvertieren
  out.data.summary = _convertMultilineText(item.summary) || ""; // TODO: Haben alle eine summary? Refs konvertieren
  if (item.tags) out.data.tags = item.tags; // TODO: oder leeres Array??
  if (item.create) out.data.create = _convertRefs(item.create); // no multi-paragraph support for now
  if (item.upkeep) out.data.upkeep = item.upkeep;

  // custom properties
  if ("item" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
  } else if ("motivation" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
  } else if ("role" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
    _convertRoleItem(type, item, path, out);
  } else if ("profession" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
    _convertProfessionItem(type, item, path, out);
  } else if ("power" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
    extras = _convertPowerItem(type, item, path, out);
  } else if ("npc-power" === type) {
    out.data["_template-revision"] = 1;
    _convertNpcPowerItem(type, item, path, out);
  } else if ("regulation" === type) {
    // FIXME: zurücknehmen out.data["_template-revision"] = 1;
    _convertRegulationItem(type, item, path, out);
  }

  // final basic properties, just to keep a nice human-readable order
  out.data.references = item.references || [];

  out.img = item.img || out.img || HEXXEN_DEFAULT_ICON;
  out.flags = {};
  out.flags[vttSystemName] = { compendium: { pack: getPackName(type), id: out._id, nameC: out.name, "data-revision": item["@rev"] }};
  out.permission = { "default": 0 };

  return out;
}

function _convertRegulationItem(type, item, path, out) {
  out.data.name = item.name;
  if (item.abbr) {
    out.name = `${out.name} (${item.abbr})`;
  }
  out.data.summary = null;
}

function _convertNpcPowerItem(type, item, path, out) {
  out.data.name = item.name;
  out.data.type = item.type;
  if (item.type.endsWith("Bande")) {
    out.name = `${out.name} (Bande)`;
  }
  out.data.summary = null;
  out.data.syntax = item.syntax;
  out.data.target = item.target || ""; // TODO: nur bei Handlungen?
  out.data.cost = item.cost || ""; // TODO: nur bei Handlungen?

  // FIXME: Kategorien (Spezielle Kräfte)
  // FIXME: summary löschen??
  // FIXME: Handlung oder Eigenschaft
  // FIXME: anderes Icon!
}

function _convertPowerItem(type, item, path, out) {
  const pathArray = path.split('/');

  let extras = undefined;
  const subtype = item.type; // jaeger/esprit/ausbau
  const originType = item.originType;
  const rawName = item.origin;
  const o = input[originType].content; // Liste der Rollen/Professionen
  const originName = o[rawName].name; // Name der Rolle/Profession

  // modify icon
  out.img = "jaeger" === subtype ? HEXXEN_JAEGER_ICON :
            "esprit" === subtype ? HEXXEN_EXPRIT_ICON :
            "ausbau" === subtype ? HEXXEN_AUSBAU_ICON : HEXXEN_DEFAULT_ICON;

  // modify compendium name (add role)
  out.data.name = out.name;
  out.name = `${out.name} (${originName})`;
  out.data.type = subtype;
  out.data.origin = {};
  out.data.origin.type = originType;
  out.data.origin.name = originName;
  out.data.origin.nameC = originName;
  out.data.origin.pack = getPackName(originType);
  out.data.origin.id = getItemId(originType, rawName);

  // Ausbaufeatures
  // to avoid infinite loop check against last element, not [3]
  if ("ausbau" === subtype && !item.subtype) {
    out.data.features = [];
    extras = [];

    // stammeffekt/geselle/experte/meister
    const featureKeys = [ "stammeffekt", "geselle", "experte", "meister" ];
    featureKeys.forEach(fKey => {
      new Map(Object.entries("stammeffekt" === fKey ? { stammeffekt: item[fKey] } : item[fKey])).forEach((value, lKey) => {
          const feature = {};
          feature.name = value.name;
          feature.nameC = `${value.name} (${originName})`;
          feature.id = value._id;
          feature.pack = getPackName(type);
          feature.type = fKey;
          out.data.features.push(feature);

          // }
        });
      });
    }
    else if ("ausbau" === subtype && item.subtype) {
      out.data.subtype = item.subtype; // stammeffekt/geselle/experte/meister
      out.data.origin.power = {};
      out.data.origin.power.type = subtype;
      out.data.origin.power.name = item['@power'].name; // Name der Ausbaukraft
      out.data.origin.power.nameC = `${item['@power'].name} (${originName})`; // Name der Ausbaukraft (Kompendium)
      out.data.origin.power.pack = getPackName("power"); // Name des Kompendium
      out.data.origin.power.id = item['@power']._id; // ID der Ausbaukraft (Kompendium)
  }

  return extras;
}

function _convertRoleItem(type, item, path, out) {
  out.data.powers = _getPowers(type, item.name, path);
}

function _convertProfessionItem(type, item, path, out) {
  if (item.type) out.data.type = item.type; // FIXME: type===meisterprofession in masterprofession=true umwandeln
  out.data.qualification = item.qualification; // TODO: Refs konvertieren
  out.data.powers = _getPowers(type, item.name, path);
}

function _getPowers(type, name) {
  const out = [];
  const lname = Object.keys(input[type].content).find(key => !key.startsWith('@') && name === input[type].content[key].name);
  const powers = input.power.content;
  const set = powers[type][lname];
  if (! set) {
    console.error(`  Jägerkräfte für Rolle ${name} nicht gefunden!`);
    return [];
  }
  const o = input[type].content || input[type]; // Liste der Rollen/Professionen
  const originName = o[lname].name; // Name der Rolle/Profession

  new Map(Object.entries(set)).forEach((value, key) => {
    new Map(Object.entries(value)).forEach(value => {
      const power = { name: value.name, nameC: `${value.name} (${originName})`, id: value._id, pack: getPackName("power"), type: key };
      if ("ausbau" === key) {
        power.features = [];
        const stammeffekt = value.stammeffekt;
        power.features.push({name: stammeffekt.name, nameC: `${stammeffekt.name} (${originName})`, id: stammeffekt._id, pack: getPackName("power"), type: "stammeffekt"});
        const features = ["geselle", "experte", "meister"];
        features.forEach(feature => {
          new Map(Object.entries(value[feature])).forEach(value => {
            power.features.push({name: value.name, nameC: `${value.name} (${originName})`, id: value._id, pack: getPackName("power"), type: feature});
          });
        });
      }
      out.push(power);
    });
  });
  return out;
}


// Helper

function getPackName(type) {
  return `${vttSystemName}.${packPrefix}-${type}`;
}

function getItemId(type, nameC) {
  const pack = input[type];
  if (!pack) {
    console.error(`unknown type: ${type}`);
    return "";
  }
  const item = pack.content[nameC]; // TODO: packs mit höherer Hierarchietiefe
  if (!item) {
    console.error(`unknown item: ${type}/${nameC}`);
    return "";
  }

  return item._id;
}

function _convertMultilineText(text) {
  if (!text || typeof(text) !== "string") return text;
  const lines = text.split('\n');
  if (lines.length > 0) {
    text = lines.reduce((out, line) => {
      out += `<p>${line}</p>`;
      return out;
    }, "");
  }
  return text;
}

function _convertRefs(text) {
  if (!text || typeof(text) !== "string") return 0;
  const regEx = /\[(.*?)\]/g;
  text = text.replace(regEx, (match, p1, offset, string) => {
    return _replaceRef(p1);
  });
  return text;
}

function _replaceRef(ref) {
  if (ref.startsWith('!')) {
    // ignore !refs
    return `[${ref}]`;
  } else {
    // TODO: ref über lookup-Liste einem pack zuordnen
    return `@Compendium[${getPackName("items")}.${ref}]`;
  }
}
