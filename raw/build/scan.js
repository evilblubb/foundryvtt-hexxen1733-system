/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

let error;

function scanItems(type, items) {
  const scan = { "__count": 0 };
  error = false;

  if (Array.isArray(items)) {
    items.forEach( (item, idx) => {
      scan["__count"]++;
      scanEntry(type, item, idx, [type, idx].join('/'), scan);
    });

    return [scan, error];
  }
  else {
    throw new TypeError(`  ${type}: [@@] Unsupported type "${typeof(items)}"! Expected "array".`);
  }
}
exports.scanItems = scanItems;

function scanEntry(type, data, key, path, struct) {
  const dtype = (data === null || data === undefined) ? "null" :
              typeof(data) !== "object" ? typeof(data) :
              data instanceof Array ? "array" : "object";
  switch (dtype) {
    case "object": {
      struct["__object"] = struct["__object"] || { "__count": 0 };
      struct["__object"]["__count"]++;
      for (const dkey in data) {
        if (data.hasOwnProperty(dkey) && !['@input', '@path'].includes(dkey)) {
          const value = data[dkey];
          struct["__object"][dkey] = struct["__object"][dkey] || { "__count": 0 };
          struct["__object"][dkey]["__count"]++;
          scanEntry(type, value, dkey, `${path}/${dkey}`, struct["__object"][dkey]);
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
        scanEntry(type, data[i], i, `${path}/${i}`, struct["__array"]);
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
      console.warn(`  ${path}: unhandled type: ${dtype}`)
    }
  }
}
