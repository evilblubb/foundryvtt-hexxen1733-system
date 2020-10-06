/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const _symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = new Set();

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

function validateID(id, len = _len) {
  return id.match(`^[${_symbols}]{${len}}$`);
}

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

exports.generateID = generateID;
exports.validateID = validateID;
exports.isUniqueID = isUniqueID;
