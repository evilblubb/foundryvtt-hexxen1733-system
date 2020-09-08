/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const fs = require('fs');

const vttSystemName = "hexxen-1733";
const packPrefix = "hexxen";
const HEXXEN_JAEGER_ICON = `systems/${vttSystemName}/img/Siegel-Rabe-small.png`;
const HEXXEN_EXPRIT_ICON = `systems/${vttSystemName}/img/Siegel-Esprit-small.png`;
const HEXXEN_AUSBAU_ICON = `systems/${vttSystemName}/img/Siegel-Ausbaukraft-small.png`;;
const HEXXEN_DEFAULT_ICON = HEXXEN_JAEGER_ICON;
const input = {};
const output = {};

const filesIn = {
  "motivation": "motivation.json",
  "power": "power.json",
  "role": "role.json",
  "profession": "profession.json"
};
const filesOut = {
  "motivation": "motivation.db",
  "power": "power.db",
  "role": "role.db",
  "profession": "profession.db"
};

let error = false;

const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = [];

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

function walk(type, data, path, regEx, checkFn, extras) {
  if (data["@target"]) {
    regEx = data["@target"];
  }
  new Map(Object.entries(data)).forEach((value, key) => {
    if ("@target" === key) {
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

function checkItem(type, item, path, checks) {
  checks.ids = (checks.ids || 0) + checkIDs(item, path);
  checks.sources = (checks.sources || 0) + checkSources(item, path);
  checks.todo = (checks.todo || 0) + checkTodo(item, path);
  checks.refs = (checks.refs || 0) + checkRefs(item, path);
  checks.tags = (checks.tags || 0) + checkTags(item, path);
  // TODO: weitere Prüfungen auf Vollständigkeit
}

function checkIDs(data, path="") {
  let count = 0;

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value.hasOwnProperty("_id")) {
        const id = value._id;
        if (!id.match(`^[${_sym}]{${_len}}$`)) {
          delete value._id;
          count++;
          console.warn(`  @_ID:${path}/${key}: Invalid id found! Will be randomly created!`);
        } else if (generatedIDs.includes(id)){
          delete value._id;
          count++;
          console.warn(`  @_ID:${path}/${key}: Duplicate id found! Will be randomly created!`);
        } else {
          generatedIDs.push(id);
        }
      } else {
        count++;
        console.warn(`  @_ID:${path}/${key}: No id found! Will be randomly created!`);
      }
      // Sonderfall: _ids von Ausbaukraft-Features
      if (path.match(/ausbau$/)) {
        const featureKeys = [ "stammeffekt", "geselle", "experte", "meister" ];
        featureKeys.forEach(fKey => {
          if ("stammeffekt" === fKey) {
            count += checkIDs({ "stammeffekt": value.stammeffekt }, `${path}/${key}`);
          } else {
            count += checkIDs(value[fKey], `${path}/${key}/${fKey}`);
          }
        });
      }
    }
  }
  return count;
}

function checkSources(data, path="") {
  let count = 0;

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      const sources = value.references;
      if (!sources || sources.length == 0) {
        count++;
        console.warn(`  @SOURCE:${path}/${key}: No source references found!`);
      }
      else {
        const filtered = sources.filter(source => "Wiki" === source.source);
        if (filtered.length == 0) {
          count++;
          console.error(`  @SOURCE:${path}/${key}: No "Scriptorium Wiki" references found!`);
        }
        else if (sources.length - filtered.length == 0) {
          count++;
          console.warn(`  @SOURCE:${path}/${key}: No book or other source references found!`);
        }
      }
    }
  }
  return count;
}

function checkTodo(data, path="") {
  let count = 0;
  if (data.hasOwnProperty("@todo")) {
    count++;
    console.info(`  @TODO\:${path}: ${data["@todo"]}`);
  }
  for (const key in data) {
    if ("@todo" !== key && data.hasOwnProperty(key)) {
      const value = data[key];
      if (typeof(value) === "object") {
        count += checkTodo(value, `${path}/${key}`);
      }
    }
  }
  return count;
}

function checkRefs(data, path="") {
  let count = 0;
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (typeof(value) === "object") {
        count += checkRefs(value, `${path}/${key}`);
      } else if (typeof(value) === "string") {
        count += _findRefs(value, `${path}/${key}`);
      }
    }
  }
  return count;
}

function _findRefs(data, path="") {
  if (!data || typeof(data) !== "string") return 0;
  const regEx = /\[(.*?)\]/g;
  const iterator = data.matchAll(regEx);
  const matches = [];
  for (const match of iterator) {
    matches.push(match[1]);
  }
  if (matches && matches.length) {
    console.info(`  @REF:${path}: ${matches}`);
    return matches.length;
  }
  return 0;
}

function checkTags(data, path="") {
  let count = 0;
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value.hasOwnProperty("tags")) {
        count++;
        console.info(`  @TAG\:${path}/${key}: ${value.tags}`);
      }

      // Sonderfall: Ausbaukraft-Features
      if (path.match(/ausbau$/)) {
        const featureKeys = [ "stammeffekt", "geselle", "experte", "meister" ];
        featureKeys.forEach(fKey => {
          if ("stammeffekt" === fKey) {
            count += checkTags({ "stammeffekt": value.stammeffekt }, `${path}/${key}`);
          } else {
            count += checkTags(value[fKey], `${path}/${key}/${fKey}`);
          }
        });
      }
    }
  }
  return count;
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
  out._id = item._id || generateID(16);
  out.name = item.name;
  out.permission = { "default": 0 };
  out.type = type;
  out.data = {};
  out.data.references = item.references || [];
  out.data.description = _convertMultilineText(item.description) || ""; // TODO: Refs konvertieren
  out.data.summary = _convertMultilineText(item.summary) || ""; // TODO: Refs konvertieren
  if (item.create) out.data.create = _convertRefs(item.create); // no multi-paragraph support for now
  if (item.upkeep) out.data.upkeep = item.upkeep;

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
  }

  if (item.tags) out.data.tags = item.tags;
  out.flags = {};
  out.flags[vttSystemName] = { compendium: { pack: getPackName(type), id: out._id, nameC: out.name, "data-revision": item["@rev"] }};
  out.img = item.img || out.img || HEXXEN_DEFAULT_ICON;
  return extras ? [ out, ...extras ] : [ out ];
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
  if (item.type) out.data.type = item.type;
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

 // preload files
for (const key in filesIn) {
  if (filesIn.hasOwnProperty(key)) {
    const type = key;
    const file = filesIn[type];

    console.log(`Loading ${file} ...`);
    try {
      const data = JSON.parse(fs.readFileSync(`${__dirname}/packs/${file}`, "utf8"));
      if (data.content) {
        input[type] = data;
      } else {
        input[type] = {};
        input[type].content = data;
      }
    }
    catch (err) {
      console.error(err);
      error = true;
    }
  }
}
if (error) {
  console.error("Errors occured, exiting.");
  return false;
}
console.log(`Loading done.\n`);

// validate files
for (const key in input) {
  if (input.hasOwnProperty(key)) {
    const type = key;
    const file = filesIn[type];
    const data = input[type].content;
    const checks = {};

    console.log(`Validating ${type} ...`);
    // handle files with global structure elements
    if (data["@target"]) {
      walk(type, data, file, null, checkItem, checks);
    }
    else {
      checkItem(type, data, file, checks);
    }

    input[type].checks = checks;
    // TODO: Abbruch entscheiden
  }
}
if (error) {
  console.error("Errors occured, exiting.");
  return false;
}
console.log(`Validating done.\n`);

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
    if (data["@target"]) {
      walk(type, data, file, null, convertList, content);
    }
    else {
      convertList(type, data, file, content);
    }

    output[type].content = content;
    output[type].checks = input[type].checks;
  }
}
console.log(`Converting done.\n`);

// create db files
const dryRun = false;
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
