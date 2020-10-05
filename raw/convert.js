/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const fs = require('fs');
const checkItems = require('./build/validate.js');

const vttSystemName = "hexxen-1733";
const packPrefix = "hexxen";
const HEXXEN_JAEGER_ICON = `systems/${vttSystemName}/img/Siegel-Rabe-small.png`;
const HEXXEN_EXPRIT_ICON = `systems/${vttSystemName}/img/Siegel-Esprit-small.png`;
const HEXXEN_AUSBAU_ICON = `systems/${vttSystemName}/img/Siegel-Ausbaukraft-small.png`;
const HEXXEN_DEFAULT_ICON = HEXXEN_JAEGER_ICON;
const input = {};
const output = {};
exports.input = input;

const filesIn = {
  "regulation": "regulation.json",
  "motivation": "motivation.json",
  "power": "power.json",
  "role": "role.json",
  "profession": "profession.json",
  // "items": "items.json",
  // "kleidung": "kleidung.json",
  // "reittiere": "reittiere.json",
  // "skillitems": "skillitems.json",
  "npc-power": "npc-power.json",
  "npc": "npc.json"
};
const filesOut = {
  "regulation": "regulation.db",
  "motivation": "motivation.db",
  "power": "power.db",
  "role": "role.db",
  "profession": "profession.db",
  "npc-power": "npc-power.db"
};

let dryRun = false;
let pauseAfterStep = true; // Wichtig: setzt die Verwendung des internen Terminals voraus!
let error = false;

const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = [];
exports._sym = _sym;
exports._len = _len;
exports.generatedIDs = generatedIDs;


function exitOnError() {
  if (error) {
    console.error("Errors occured, exiting.");
    process.exit(1);
  }
}

function pause() {
  if (pauseAfterStep) {
    process.stdin.setRawMode(true);
    while (process.stdin.read());
    console.info('Pausing, press any key to continue.');
    return new Promise((resolve, reject) => {
      process.stdin.once("readable", data => {
        resolve();
        process.stdin.setRawMode(false);
      });
    });
  }
}

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

function generateID(count = _len) {
  let str;

  do {
    str = '';

    for(let i = 0; i < count; i++) {
        str += _sym[Math.floor(Math.random() * (_sym.length))];
    }
  } while (generatedIDs.includes(str));

  generatedIDs.push(str);
  return str;
}

// TODO: durch flatten ersetzen
function walk(type, data, path, regEx, checkFn, extras) {
  if (data["@target"]) {
    regEx = data["@target"];
  } else if (data["@map"]) {
    regEx = "^.*$";
    // FIXME: category einschleifen
  }
  new Map(Object.entries(data)).forEach((value, key) => {
    if (["@target", "@map"].includes(key)) {
      // ignore
    } else if (key.match(regEx)) {
      checkFn(type, value, `${path}/${key}`, extras);
    }
    else if (typeof(value) === "object") {
      walk(type, value, `${path}/${key}`, regEx, checkFn, extras);
    }
    else {
      console.error(`  @@:${path}/${key}: No target key found!`);
    }
  });
}

function _flatten(type, data, path, mappings = {}, clues = []) {
  // TODO: @all, @items implementieren, um alle enthaltenen Elemente mit properties befüllen zu können
  // TODO: @map Ziel-Properties müssen definiert sein (in Schema)
  // FIXME: mit @target umgehen, solange power.json alte Struktur hat
  if (!Array.isArray(data) && typeof(data) === "object" && (clues.length || data.hasOwnProperty("@map"))) {
    // if exists, @map overrides remaining clues completely
    // make sure clues is always an array AND use a copy of clues
    clues = data.hasOwnProperty("@map") ? [].concat(data["@map"]) : clues.map(c => c);
    const clue = clues.shift(); // clue might be undefined if array is empty
    const m = Object.assign({}, mappings); // make a copy of mappings before modifying it
    let out = [];

    Object.keys(data)
    .filter(k => !["@map", "@target"].includes(k))
    .forEach(k => {
      // recursive call with extended mapping
      if (clue) m[clue] = k;
      out = out.concat(_flatten(type, data[k], [path, k].join('/'), m, clues));
    });

    return out;
  }
  else if (typeof(data) === "object") {
    // inject mappings
    if (Array.isArray(data)) {
      return data.map((el, idx) => { return _inject(type, el, [path, idx, el.name].join('/'), mappings)}).flat(); // flatten nested arrays
    } else {
      return _inject(type, data, path, mappings);
    }
  }
  else {
    if (typeof(data) !== 'object') {
      throw new TypeError(`All elements have to be of type Array or Object! Found "${path}" to be of type ${typeof(data)}`);
    }
    return data;
  }
}

function _inject(type, data, path, mappings) {
  // Note: @input is a reference to the original data structure
  //       @path shows the original path to this data
  // A shallow copy should be sufficient.
  const ret = Object.assign({ "@input": data, "@path": path }, mappings, data);

  // handle special cases
  if ('power' === type && 'ausbau' === ret.type) {
    // process ret instead of data to be able to modify ret
    return _splitAusbaukraft(type, ret, path, mappings);
  }
  return ret;
}

function _splitAusbaukraft(type, data, path, mappings) {
  // TODO: Sonderfall Ausbaukrafteffekte
  const featureKeys = [ "stammeffekt", "geselle", "experte", "meister" ];
  const m = Object.assign({}, mappings); // make a copy of mappings before modifying it
  const ret = [ data ];
  featureKeys.forEach(fKey => {
    m.subtype = fKey;
    if ("stammeffekt" === fKey) {
      ret.push(_extractAusbaukraftFeature(type, data.stammeffekt, data, [path, fKey].join('/'), m));
    } else {
      Object.keys(data[fKey]).forEach(key => {
        ret.push(_extractAusbaukraftFeature(type, data[fKey][key], data, [path, fKey, key].join('/'), m));
      });
    }
  });
return ret;
}

function _extractAusbaukraftFeature(type, data, power, path, mappings) {
  // references aus Ausbaukraft übernehmen, um Fehlmeldungen bei der Quellenangabenprüfung zu vermeiden
  const ret = Object.assign({ "@input": data, "@power": power, "@path": path, references: power.references }, mappings, data);
  return ret;
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

function convertList(type, data, path, content) {
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const item = data[key];
      console.log(`  Converting ${item.name} ...`);
      const out = convertItem(type, item, key, path);
      content.push(...out);
    }
  }
}

function convertItem(type, item, key, path) {
  const out = {};
  let extras = undefined; // in case item produces more than one db item

  // basic properties
  out._id = item._id || generateID(16);
  out.type = type;
  out.name = item.name;

  // basic data properties
  out.data = { "_template-revision": null, name: null };
  out.data.description = _convertMultilineText(item.description) || ""; // TODO: Refs konvertieren
  out.data.summary = _convertMultilineText(item.summary) || ""; // TODO: Haben alle eine summary? Refs konvertieren
  if (item.tags) out.data.tags = item.tags; // TODO: oder leeres Array??
  if (item.create) out.data.create = _convertRefs(item.create); // no multi-paragraph support for now
  if (item.upkeep) out.data.upkeep = item.upkeep;

  // custom properties
  if ("item" === type) {
    out.data["_template-revision"] = 1;
  } else if ("motivation" === type) {
    out.data["_template-revision"] = 1;
  } else if ("role" === type) {
    out.data["_template-revision"] = 1;
    _convertRoleItem(type, item, key, path, out);
  } else if ("profession" === type) {
    out.data["_template-revision"] = 1;
    _convertProfessionItem(type, item, key, path, out);
  } else if ("power" === type) {
    out.data["_template-revision"] = 1;
    extras = _convertPowerItem(type, item, key, path, out);
  } else if ("npc-power" === type) {
    out.data["_template-revision"] = 1;
    _convertNpcPowerItem(type, item, key, path, out);
  } else if ("regulation" === type) {
    out.data["_template-revision"] = 1;
    _convertRegulationItem(type, item, key, path, out);
  }

  // final basic properties, just to keep a nice human-readable order
  out.data.references = item.references || [];

  out.img = item.img || out.img || HEXXEN_DEFAULT_ICON;
  out.flags = {};
  out.flags[vttSystemName] = { compendium: { pack: getPackName(type), id: out._id, nameC: out.name, "data-revision": item["@rev"] }};
  out.permission = { "default": 0 };

  return extras ? [ out, ...extras ] : [ out ];
}

function _convertRegulationItem(type, item, key, path, out) {
  out.data.name = item.name;
  if (item.abbr) {
    out.name = `${out.name} (${item.abbr})`;
  }
  out.data.summary = null;
}

function _convertNpcPowerItem(type, item, key, path, out) {
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

function _convertPowerItem(type, item, key, path, out) {
  const pathArray = path.split('/');

  let extras = undefined;
  const subtype = pathArray[3]; // jaeger/esprit/ausbau
  const originType = pathArray[1];
  const rawName = pathArray[2];
  const o = input[originType].content || input[originType]; // Liste der Rollen/Professionen
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
  if ("ausbau" === pathArray[pathArray.length-1]) {
    out.data.features = [];
    extras = [];

    // stammeffekt/geselle/experte/meister
    const featureKeys = [ "stammeffekt", "geselle", "experte", "meister" ];
    featureKeys.forEach(fKey => {
      new Map(Object.entries("stammeffekt" === fKey ? { stammeffekt: item[fKey] } : item[fKey])).forEach((value, lKey) => {
        const extra = convertItem("power", value, lKey, `${path}/${key}/${fKey}`)[0];
        if (extra) {
          const feature = {};
          feature.name = extra.data.name;
          feature.nameC = extra.name;
          feature.id = extra._id;
          feature.pack = getPackName(extra.type);
          feature.type = fKey;
          out.data.features.push(feature);

          extra.img = HEXXEN_AUSBAU_ICON;
          extra.data.subtype = fKey; // stammeffekt/geselle/experte/meister
          extra.data.references = item.references;
          extra.data.origin.power = {};
          extra.data.origin.power.type = subtype;
          extra.data.origin.power.name = out.data.name; // Name der Ausbaukraft
          extra.data.origin.power.nameC = out.name; // Name der Ausbaukraft (Kompendium)
          extra.data.origin.power.pack = getPackName("power"); // Name des Kompendium
          extra.data.origin.power.id = out._id; // ID der Ausbaukraft (Kompendium)
          extras.push(extra);
        }
      });
    });
  }

  return extras;
}

function _convertRoleItem(type, item, key, path, out) {
  out.data.powers = _getPowers(type, key, path);
}

function _convertProfessionItem(type, item, key, path, out) {
  if (item.type) out.data.type = item.type; // FIXME: type===meisterprofession in masterprofession=true umwandeln
  out.data.qualification = item.qualification; // TODO: Refs konvertieren
  out.data.powers = _getPowers(type, key, path);
}

function _getPowers(type, role) {
  const out = [];
  const powers = input.power.content;
  const set = powers[type][role];
  if (! set) {
    console.error(`  Jägerkräfte für Rolle ${role} nicht gefunden!`);
    return [];
  }
  const o = input[type].content || input[type]; // Liste der Rollen/Professionen
  const originName = o[role].name; // Name der Rolle/Profession

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




/********************
 * main code        *
 ********************/


async function main() {

  // preload files
  for (const key in filesIn) {
    if (filesIn.hasOwnProperty(key)) {
      const type = key;
      const file = filesIn[type];

      console.log(`Loading ${file} ...`);
      try {
        const data = JSON.parse(fs.readFileSync(`${__dirname}/packs/${file}`, "utf8"));
        input[type] = {};
        if (data.content) { // TODO: deprecated
          input[type].content = data.content;
          console.warn("  Deprecated file format!");
        } else if (data["@content"]) {
          input[type].content = data["@content"];
        } else { // TODO: deprecated
          input[type].content = data;
          console.warn("  Deprecated file format!");
        }
      }
      catch (err) {
        console.error(err);
        error = true;
      }
    }
  }
  exitOnError();
  console.log(`Loading done.\n`);
  await pause();

  // load old compendiums for comparision
  // FIXME: tbd.

  // flatten files (process @map properties)
  Object.keys(input).forEach(type => {
    const file = filesIn[type];

    console.log(`Flattening ${file} ...`);
    input[type].flattened = _flatten(type, input[type].content, file);
  });
  exitOnError();
  console.log(`Flattening done.\n`);
  await pause();

  // validate files
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = filesIn[type];
      const data = input[type].content;
      const checks = { struct: {} };

      console.log(`Validating ${type} ...`);
      // handle files with global structure elements
      if (data["@target"] || data["@map"]) {
        walk(type, data, file, null, checkItems, checks);
      }
      else {
        checkItems(type, data, file, checks);
      }

      input[type].checks = checks;
      // TODO: Abbruch entscheiden
    }
  }
  exitOnError();
  console.log(`Validating done.\n`);
  await pause();

  // convert files
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = filesIn[type];
      const data = input[type].content;

      output[type] = {}
      const content = [];
      console.log(`Converting ${type} ...`);

      // handle files with global structure elements
      if (data["@target"] || data["@map"]) {
        walk(type, data, file, null, convertList, content);
      }
      else {
        convertList(type, data, file, content);
      }

      output[type].content = content;
      output[type].checks = input[type].checks;
    }
  }
  exitOnError();
  console.log(`Converting done.\n`);
  await pause();

  // create structure.json
  const struct = {};
  for (const key in input) {
    struct[key] = input[key].checks.struct;
  }
  try {
    fd = fs.openSync(`${__dirname}/structure.json`, 'w'); // alte Datei überschreiben
    fs.appendFileSync(fd, JSON.stringify(struct), 'utf8');
    fs.appendFileSync(fd, '\n', 'utf8');
  } catch (err) {
    /* Handle the error */
    console.error(err);
  } finally {
    if (fd !== undefined)
    fs.closeSync(fd);
  }

  // create db files
  if (dryRun) {
    console.warn("DryRun, no DB creation.")
  }

  for (const key in output) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = filesOut[type] || null;
      const data = output[type].content;

      if (!dryRun && file) {
        console.log(`Creating ${file} ...`);
        let fd;
        try {
          fd = fs.openSync(`${__dirname}/../packs/${type}.db`, 'w'); // alte Datei überschreiben

          data.forEach(item => {
            fs.appendFileSync(fd, JSON.stringify(item), 'utf8');
            fs.appendFileSync(fd, '\n', 'utf8');
          });
        } catch (err) {
          /* Handle the error */
          console.error(err);
        } finally {
          if (fd !== undefined)
          fs.closeSync(fd);
        }
        console.log(`  ${data.length} entries created.`);
      }
      else {
        console.warn(`Skipping ${type}.`);
      }

      with (output[type].checks) {
        if (ids) {
          console.warn(`  Missing ${ids} IDs! Created new random IDs!`);
        }
        if (sources) {
          console.warn(`  Missing ${sources} source references!`);
        }
        if (todo) {
          console.info(`  ${todo} TODOs pending!`);
        }
        if (refs) {
          console.info(`  ${refs} unmatched item refs found!`);
        }
        if (tags) {
          console.info(`  ${tags} unmatched tags!`);
        }
      }
    }
  }

  console.log(`Done.`);
  await pause();

}

// run main function
main();
