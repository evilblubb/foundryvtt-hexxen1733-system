/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const { input } = require('../buildDBs.js'); // TODO: falls möglich eliminieren
const { validateID, isUniqueID } = require('./utils.js');

let error;

/**
 *
 * @param {String} type
 * @param {Array<Object>} items
 * @returns [Object, boolean] Results, Errors
 */
function checkItems(type, items) {
  // main loop
  const checkResults = { ids: 0, sources: 0, todos: 0, refs: 0, tags: 0, struct: {} };
  error = false;

  if (Array.isArray(items)) {
    items.forEach( (item, idx) => checkItem(type, item, [type, idx].join('/'), checkResults) );
    return [checkResults, error];
  }
  else {
    throw new TypeError(`  ${type}: [@@] Unsupported type "${typeof(items)}"! Expected "array".`);
  }
}
exports.checkItems = checkItems;

function checkItem(type, item, path, checkResults) {
  // validate source data
  // expect item to be an object with property name
  // TODO: Auf Objekt prüfen?
  if (item === null || item === undefined) return;
  path = item["@path"] || [path, item.name].join('/'); // fallback

  // common checks
  checkResults.ids += checkID(item, path);
  // TODO: Prüfung der references via schema
  checkResults.sources += checkSources(item, path);
  checkResults.todos += checkTodo(item, path);
  // FIXME: temp. deaktiviert
  // checks.refs += checkRefs(item, path);
  // checks.tags += checkTags(item, path);

  // match powers and attacks in npc.json
  if ("npc" === type) {
    item.attacks.forEach(attack => _matchAttack(attack, [path, "attacks", attack.name].join('/')));
    item.powers.forEach(power => _matchPower(power, [path, "powers", power.name].join('/')));
  }

  // TODO: weitere Prüfungen auf Vollständigkeit
};

function checkID(item, path="") {
  // The important step here is to check for duplicate IDs.
  let count = 0;

  // TODO: Syntax via Schema prüfen
  // FIXME: generierte IDs bereits hier einfügen??

  if (item.hasOwnProperty("_id")) {
    const id = item._id;
    if (!validateID(id)) {
      item._id = "";
      count++;
      console.warn(`  ${path}: [_ID] Invalid id found! Will be randomly created!`);
    } else if (!isUniqueID(id, true)){
      item._id = "";
      count++;
      console.warn(`  ${path}: [_ID] Duplicate id found! Will be randomly created!`);
    }
  } else {
    count++;
    console.error(`  ${path}: [_ID] No id found! Will be randomly created!`);
  }
  return count;
}

function checkSources(item, path="") {
  let count = 0;
  const sources = item.references;

  // TODO: reicht hier die Prüfung via Schema?

  if (!Array.isArray(sources) || sources.length == 0) {
      // FIXME: error setzen
      count++;
    console.error(`  ${path}: [SOURCE] No source references found!`);
  }
  else {
    const filtered = sources.filter(source => "Wiki" === source.source);
    if (filtered.length == 0) {
      // FIXME: error setzen
      count++;
      console.error(`  ${path}: [SOURCE] No "Regel-Wiki" references found!`);
    }
    else if (sources.length - filtered.length == 0) {
      count++;
      console.warn(`  ${path}: [SOURCE] No book or other source references found!`);
    }
  }
  return count;
}

function checkTodo(item, path="") {
  let count = 0;


  if (item.hasOwnProperty("@todo")) {
    count++;
    console.info(`  ${path}: [TODO] ${item["@todo"]}`);
  }

  // recursively search object
  for (const key in item) {
    if (!key.startsWith('@') && item.hasOwnProperty(key)) {
      const value = item[key];
      if (typeof(value) === "object" && value !== null) {
        count += checkTodo(value, [path, key, value.name].join('/'));
      }
    }
  }
  return count;
}

function checkRefs(item, path="") {
  let count = 0;

  for (const key in item) {
    if (!key.startsWith('@') && item.hasOwnProperty(key)) {
      const value = item[key];
      if (typeof(value) === "object" && value !== null) {
        count += checkRefs(value, [path, key, value.name].join('/'));
      } else if (typeof(value) === "string") {
        count += _findRefs(value, [path, key].join('/'));
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
    // TODO: Treffer abgleichen
    console.info(`  ${path}: [REFS] ${matches}`);
    return matches.length;
  }
  return 0;
}

function checkTags(data, path="") {
  let count = 0;

  if (data.hasOwnProperty("tags")) {
    count = Array.isArray(data.tags) ? data.tags.length : 1;
    console.info(`  ${path}: [TAGS] ${data.tags}`);
  }
  return count;
}

function _matchAttack(attack, path) {
  const regEx = /^([N|F123]+): +(Angriff|Erfolge) ([0-9]+), ?Schaden (\+?[0-9*]+)(?: ?(.*))?$/;
  // FIXME: +x Schaden aussortieren

  if (attack.raw === null || attack.raw === undefined) {
    console.warn(`  ${path}: [ATTACK] No raw property!`);
    return;
  }

  const matches = attack.raw.match(regEx);
  if (!matches) {
    console.warn(`  ${path}: [ATTACK] Can't parse "${attack.raw}"`);
  }
  // else {
  //   matches.shift(); console.info(` ${path}: [ATTACK] ${attack.raw} --> ${matches}`);
  // }
}

function _matchPower(power, path) {
  // FIXME: Strukturbehandlung
  const powers = input["npc-power"].flattened;
  let found = false;
  // FIXME: Duplikate??
  powers.forEach(p => {
    if (p.name === power.name) found = true;
  });
  if (!found) console.warn(`  ${path}: [POWER] Can't map "${power.name}".`);
}

