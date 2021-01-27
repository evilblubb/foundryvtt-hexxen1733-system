/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const _symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = new Set();

class CompendiumFiles {
  constructor(type, hints={}) {
    this.type = type;
    this.hints = hints;
  }

  static deriveFromTypes(types) {
    if (!Array.isArray(types)) throw new TypeError('Expecting an array!');

    const ret = {};
    types.forEach(type => ret[type] = new this(type));
    return ret;
  }

  get in() {
    return this.hints.hasOwnProperty('in') ? this.hints.in : [this.type, '.json'].join('');
  }

  get db() {
    return this.hints.hasOwnProperty('db') ? this.hints.db : [this.type, '.db'].join('');
  }

  get out() {
    return this.hints.hasOwnProperty('out') ? this.hints.out : [this.type, '.db'].join('');
  }
}
exports.CompendiumFiles = CompendiumFiles;

function duplicate(data) {
  return JSON.parse(JSON.stringify(data));
}
exports.duplicate = duplicate;

function isEmpty(data) {
  if (typeof(data) === 'object') {
    if (Array.isArray(data)) {
      return data.filter(el => !isEmpty(el)).length === 0;
    }
    else {
      // FIXME: leere keys filtern
      return Object.keys(data).length === 0;
    }
  }
  else {
    return data === null || data === undefined;
  }
}
exports.isEmpty = isEmpty;

function generateID(count = _len) {
  let str;

  do {
    str = '';

    for(let i = 0; i < count; i++) {
      str += _symbols[Math.floor(Math.random() * (_symbols.length))];
    }
  } while (generatedIDs.has(str));

  generatedIDs.add(str);
  return str;
}
exports.generateID = generateID;

function validateID(id, len = _len) {
  return id.match(`^[${_symbols}]{${len}}$`);
}
exports.validateID = validateID;

/**
 * Checks id for uniqueness and adds it to internal set for further comparations, if wanted.
 *
 * @param {String} id The id to check.
 * @param {boolean} store true if storage is wanted
 */
function isUniqueID(id, store=false) {
  const included = generatedIDs.has(id);
  if (store) generatedIDs.add(id);
  return !included;
}
exports.isUniqueID = isUniqueID;
