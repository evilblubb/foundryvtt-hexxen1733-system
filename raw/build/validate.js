const main = require('../convert.js');
const input = main.input;

function checkItems(type, items, path, checks) {
  // FIXME: Hauptschleife für "type" hier implementieren, nicht in den checkX()
  // FIXME: temp. deaktiviert
  checks.ids = (checks.ids || 0) + checkIDs(items, path);
  checks.sources = (checks.sources || 0) + checkSources(items, path);
  checks.todo = (checks.todo || 0) + checkTodo(items, path);
  checks.refs = 0; // (checks.refs || 0) + checkRefs(items, path);
  checks.tags = 0; // (checks.tags || 0) + checkTags(items, path);
  // FIXME: error entfernen
  // error = true;
  // TODO: weitere Prüfungen auf Vollständigkeit
  // Struktur von item erfassen
  scanItems(items, path, checks.struct);
};
module.exports = checkItems;

function checkIDs(data, path="") {
  let count = 0;

  // FIXME: id code auslagern und korrekt importieren

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value.hasOwnProperty("_id")) {
        const id = value._id;
        if (!id.match(`^[${main._sym}]{${main._len}}$`)) {
          delete value._id;
          count++;
          console.warn(`  @_ID:${path}/${key}: Invalid id found! Will be randomly created!`);
        } else if (main.generatedIDs.includes(id)){
          delete value._id;
          count++;
          console.warn(`  @_ID:${path}/${key}: Duplicate id found! Will be randomly created!`);
        } else {
          main.generatedIDs.push(id);
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
  if (null === data) return count;
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

function scanItems(data, path, struct) {
  if (typeof(data) !== "object") {
    error = true;
    console.error(`Unexpected type: ${typeof(data)}`);
  }

  struct["__count"] = struct["__count"] || 0;
  // ignore this layer for analysis, just count it
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      struct["__count"]++;
      scanEntry(value, key, `${path}/${key}`, struct);

      // match powers
      // FIXME: in anderer Phase ausführen
      if (path.startsWith("npc.json")) {
        value.attacks.forEach(attack => _matchAttack(attack, key, path));
        value.powers.forEach(power => _matchPower(power, key, path));
      }
    }
  }
}

function scanEntry(data, key, path, struct) {
  const type = (data === null || data === undefined) ? "null" :
              typeof(data) !== "object" ? typeof(data) :
              data instanceof Array ? "array" : "object";
  switch (type) {
    case "object": {
      struct["__object"] = struct["__object"] || { "__count": 0 };
      struct["__object"]["__count"]++;
      if (["attacks", "powers"].includes(key)) {
        struct["__object"]["__merged"] = struct["__object"]["__merged"] || { "__count": 0 };
      }
      for (const dkey in data) {
        if (data.hasOwnProperty(dkey)) {
          const value = data[dkey];
          struct["__object"][dkey] = struct["__object"][dkey] || { "__count": 0 };
          struct["__object"][dkey]["__count"]++;
          if (["attacks", "powers"].includes(key)) {
            struct["__object"]["__merged"]["__count"]++;
            scanEntry(value, dkey, `${path}/${dkey}`, struct["__object"]["__merged"]);
          } else {
            scanEntry(value, dkey, `${path}/${dkey}`, struct["__object"][dkey]);
          }
        }
      }
      break;
    }
    case "array": {
      struct["__array"] = struct["__array"] || { "__count": 0, "__min-length": 999999, "__max-length": 0 };
      struct["__array"]["__count"]++;
      struct["__array"]["__min-length"] = Math.min(struct["__array"]["__min-length"], data.length);
      struct["__array"]["__max-length"] = Math.max(struct["__array"]["__max-length"], data.length);
      for (let i = 0; i < data.length; i++) {
        scanEntry(data[i], null, `${path}/${i}`, struct["__array"]);
      }
      break;
    }
    case "string": {
      struct["__string"] = struct["__string"] || { "__count": 0 };
      struct["__string"]["__count"]++;
      if (["breed", "type", "strategy", "story", null].includes(key)) {
        struct["__string"][data] = struct["__string"][data] || { "__count": 0 };
        struct["__string"][data]["__count"]++;
      }
      break;
    }
    case "number": {
      struct["__number"] = struct["__number"] || { "__count": 0 };
      struct["__number"]["__count"]++;
      break;
    }
    case "boolean": {
      struct["__boolean"] = struct["__boolean"] || { "__count": 0, "__true": 0, "__false": 0 };
      struct["__boolean"]["__count"]++;
      struct["__boolean"][data ? "__true" : "__false"]++;
      break;
    }
    case "null": {
      struct["__null"] = struct["__null"] || { "__count": 0 };
      struct["__null"]["__count"]++;
      break;
    }
    default: {
      console.warn(`  ${path}: unhandled type: ${type}`)
    }
  }
}

function _matchAttack(attack, key, path) {
  const regEx = /^([N|F123]+): +(Angriff|Erfolge) ([0-9]+), ?Schaden (\+?[0-9*]+)(?: ?(.*))?$/;
  // FIXME: +x Schaden aussortieren
  if (attack.raw === null || attack.raw === undefined) { console.warn(`  ${path}/${key}: No raw property: ${attack.name}`); return; }
  const matches = attack.raw.match(regEx);
  if (!matches) console.warn(`  ${path}/${key}: Can't parse "${attack.raw}"`);
  // else { matches.shift(); console.info(` ${attack.raw} --> ${matches}`); }
}

function _matchPower(power, key, path) {
  // FIXME: Strukturbehandlung
  const powers = main.input["npc-power"].content;
  let found = false;
  Object.values(powers).forEach(category => {
    Object.values(category).forEach(p => {
      if (p.name === power.name) found = true;
    });
  });
  if (!found) console.warn(`  ${path}/${key}: Can't map ${power.name}.`);
}

