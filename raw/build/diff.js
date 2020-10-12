/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const { duplicate } = require('./utils.js');

let error;

function diffDB(type, oldDB, newDB) {
  console.info(`  ${type} ...`);

  error = false;

  oldDB = oldDB || []; // in case of first creation
  if (null === newDB) {
    const msg = 'Nothing to compare to.';
    console.info(`    ${msg}`);
    return [{ msg: msg }, error];
  }
  else if (!Array.isArray(oldDB) || !Array.isArray(newDB)) {
    error = true;
    const msg = 'Bad DB data type(s)!';
    console.error(`    ${msg}`);
    return [{ msg: msg }, error];
  }

  // content of the arrays is expected to be objects with property _id
  // _id is expected to always exist and always be valid
  if (!oldDB.every(el => _validDBElement(el)) || !newDB.every(el => _validDBElement(el))) {
    error = true;
    const msg = 'Unexpected DB content!';
    console.error(`    ${msg}`);
    return [{ msg: msg }, error];
  }

  // duplicate data structures (deep copy) and sort by ID
  let o = duplicate(oldDB).sort(_sortByID);
  let n = duplicate(newDB).sort(_sortByID);

  // extract new and removed entries
  let oldIdx = 0;
  const added = [], removed = [];
  const keep = n.reduce((k, el) => {
    while (oldIdx < o.length && el._id > o[oldIdx]._id) {
      // removed (o[oldIdx] not in n)
      removed.push(o[oldIdx]);
      o.splice(oldIdx, 1);
    }
    if (oldIdx >= o.length || el._id < o[oldIdx]._id) {
      // new in n
      added.push(el);
    }
    else {
      // contained in both, keep
      k.push(el);
      oldIdx++;
    }
    return k;
  }, []);
  // handle additional entries in o (must have been removed)
  while (oldIdx < o.length) {
    removed.push(o[oldIdx]);
    o.splice(oldIdx, 1);
  }

  // compare (and reduce) remaining entries
  const modified = keep.reduce((m, el, idx) => {
    _diffEntry(type, o[idx], el);
    if (Object.keys(el).filter(e => ! e.startsWith('=')).length > 0) {
      m.push(el);
    }
    return m;
  }, []);

  // compact added and removed
  _compact(added);
  _compact(removed);

  return [{ added: added, modified: modified, removed: removed }, error];
}
exports.diffDB = diffDB;

function _validDBElement(el) {
  return 'object' === typeof(el) && el.hasOwnProperty('_id') && el['_id'];
}

function _sortByID(a, b) {
  return a._id < b._id ? -1 : (a._id > b._id ? 1 : 0);
}

function _diffEntry(type, o, n) {
  // Just for precaution: treat non-objects to be different and do nothing here
  if (! o instanceof Object || ! n instanceof Object) {
    return;
  }

  // remove all that is identical from n
  // and add properties that are different from o to n as "(-|+|>)key"
  Object.keys(n).forEach(key => {
    if (Array.isArray(o[key]) && Array.isArray(n[key])) {
      const [added, modified, removed] = _diffArray(type, o[key], n[key]);
      if (removed.length > 0) {
        n[`-${key}`] = removed;
      }
      if (modified.length > 0) {
        n[`>${key}`] = modified;
      }
      if (added.length > 0) {
        n[`+${key}`] = added;
      }
    }
    else if (o[key] instanceof Object && n[key] instanceof Object) {
      // does never contain null
      _diffEntry(type, o[key], n[key]);
      Object.keys(o[key]).forEach(key2 => {
        n[key][`-${key2}`] = o[key][key2];
      });
      if (Object.keys(n[key]).filter(e => ! e.startsWith('=')).length > 0) {
        n[`>${key}`] = n[key];
      }
    }
    else if (o[key] === n[key]) {
      // should work for all non-object values
      // keep _id and name to be able to identify object in diff
      if (['_id', 'name'].includes(key)) {
        n[`=${key}`] = n[key];
      }
    }
    else {
      // FIXME: für null und andere "leere" Objekte verbessern??
      n[`-${key}`] = o[key];
      n[`+${key}`] = n[key];
    }
    delete n[key];
    delete o[key];
  });
}

function _diffArray(type, o, n) {
  let added = [], modified = [], removed = [];
  if (n.every(el => 'object' === typeof(el) && !Array.isArray(el)) && o.every(el => 'object' === typeof(el) && !Array.isArray(el))) {
    // try to match by first property in object

    n.forEach(el => {
      const key = el.hasOwnProperty('id') ? 'id' : Object.keys(el)[0];
      // TODO: Reihenfolge berücksichtigen?
      const oIdx = o.findIndex(el2 => 'object' === typeof(el2) && !Array.isArray(el2) && el[key] === el2[key]);
      const keyValue = el[key]; // preserve value
      if (oIdx === -1) {
        // not found in old, must be added
        added.push(el);
      }
      else {
        _diffEntry(type, o[oIdx], el);
        Object.keys(o[oIdx]).forEach(key2 => {
          el[`-${key2}`] = o[oIdx][key2];
        });
        if (Object.keys(el).filter(e => ! e.startsWith('=')).length > 0) {
          el[`=${key}`] = keyValue;
          // reorder properties
          Object.keys(el).filter(e => ! e.startsWith('=')).forEach(key => {
            const value = el[key];
            delete el[key];
            el[key] = value;
          })
          modified.push(el);
        }
        o.splice(oIdx, 1);
      }
    });
    removed = o;
  }
  // FIXME: unterschiedliche Typen
  else {
    // FIXME: weiter verfeinern
    //
    // TODO: tbd. (Workaround JSON.stringify ersetzen)
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      removed = o;
      added = n;
    }
  }

  return [added, modified, removed];
}

function _compact(arr) {
  arr.forEach(el => {
    Object.keys(el).forEach(key => {
      if (! ['_id', 'name'].includes(key)) {
        delete el[key];
      }
    });
  });
}

