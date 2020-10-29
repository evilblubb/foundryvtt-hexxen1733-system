/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const fs = require('fs');

// für generateID()
const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = [];

const list = ["nsc"]; // ["power", "motivation", "role", "profession"];

for (const key in list) {
  if (list.hasOwnProperty(key)) {
    const type = list[key];

    const content = fs.readFileSync(`${__dirname}/packs/${type}.json`, "utf8");
    const json = JSON.parse(content);
    const data = json["@content"] || json.content || json;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const item = data[key];

        fixAttacksPowers(item);
        // walk(item, "_id", fixIDs);

        // fixReferences(item); // falsch formatierte references
      }
    }

    fs.writeFileSync(`${__dirname}/packs/${type}.json`, JSON.stringify(json), "utf8");
  }
}

function fixAttacksPowers(item) {
  ["attacks", "powers"].forEach(key => {
    const val = item[key];
    if (val && (val instanceof Object) && !(val instanceof Array)) {
      const replace = [];
      for (const k in val) {
        if (val.hasOwnProperty(k)) {
          const v = val[k];
          const n = Object.assign({ name: k }, v);
          replace.push(n);
        }
      }
      item[key] = replace;
    }
  });
}

function walk(item, key, fn) {
  if (typeof(item) !== "object") {
    return;
  }
  if (item.hasOwnProperty(key)) {
    fn(item);
  }
  new Map(Object.entries(item)).forEach(value => walk(value, key, fn));
}

function fixIDs(item) {
  if (item.hasOwnProperty("_id")) {
    if (! item._id.match(`^[${_sym}]{${_len}}$`)) {
      item._id = generateID();
    }
  }
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

// korrigiert falsch formatierte references
function fixReferences(item) {
  if (item.hasOwnProperty("references")) {
    const references = item.references;
    references.forEach(ref => {
      if (ref.page && ref.page.indexOf('|') != -1) {
        const parts = ref.page.split('|');
        delete ref.page;
        const newRef = {};
        newRef.source = parts[0].trim();
        newRef.page = parts[1].replace('Seite', '').trim();
        references.push(newRef);
      }
    });
  }
}

