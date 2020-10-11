/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

const { duplicate } = require('./utils.js');

function diffDB(type, oldDB, newDB) {
  console.info(`  ${type} ...`);

  oldDB = oldDB || []; // in case of first creation
  if (null === newDB) {
    console.info('    Nothing to compare to.');
    return { msg: 'Nothing to compare to.' };
  }
  else if (!Array.isArray(oldDB) || !Array.isArray(newDB)) {
    console.error('    Bad data type(s)!');
    error = true;
    return { msg: 'Bad data type(s)!' };
  }

  // duplicate data structures (deep copy) and sort by ID
  let o = duplicate(oldDB).sort(_sortByID);
  let n = duplicate(newDB).sort(_sortByID);

  // extract new and removed entries
  let added = [], removed = [], oldIdx = 0;
  n = n.reduce((keep, el) => {
    if (oldIdx < o.length && el._id > o[oldIdx]._id) {
      // removed (o[oldIdx] not in n)
      do {
        removed.push(o[oldIdx]);
        o.splice(oldIdx, 1);
      } while (oldIdx < o.length && el._id > o[oldIdx]._id);
    }
    if (oldIdx >= o.length || el._id < o[oldIdx]._id) {
      // new in n
      added.push(el);
    }
    else {
      // contained in both, keep
      keep.push(el);
      oldIdx++;
    }
    return keep;
  }, []);
  // handle additional entries in o (must have been removed)
  while (oldIdx < o.length) {
    removed.push(o[oldIdx]);
    o.splice(oldIdx, 1);
  }

  // compare (and reduce) remaining entries
  n = n.reduce((out, el, idx) => {
    _diffEntry(type, o[idx], el);
    if (Object.keys(el).filter(e => ! e.startsWith('=')).length > 0) {
      out.push(el);
    }
    return out;
  }, []);

  // FIXME: increment @rev if neccessary

  // compact added and removed
  _compact(added);
  _compact(removed);

  return { added: added, modified: n, removed: removed };
}
exports.diffDB = diffDB;

function _sortByID(a, b) {
  return a._id < b._id ? -1 : (a._id > b._id ? 1 : 0);
}

function _diffEntry(type, o, n) {
  if (! o instanceof Object || ! n instanceof Object) {
    return;
  }

  // remove all that is identical from n
  // and add properties that are different from o to n as "!key"
  Object.keys(n).forEach(key => {
    if (o[key] === n[key]) {
      if (['_id', 'name'].includes(key)) {
        n[`=${key}`] = n[key];
      }
    }
    else if (Array.isArray(o[key]) && Array.isArray(n[key])) {
      // TODO: tbd. (Workaround JSON.stringify ersetzen)
      if (JSON.stringify(o[key]) !== JSON.stringify(n[key])) {
        n[`-${key}`] = o[key];
        n[`+${key}`] = n[key];
      }
    }
    else if (o[key] instanceof Object && n[key] instanceof Object) {
      _diffEntry(type, o[key], n[key]);
      Object.keys(o[key]).forEach(key2 => {
        n[key][`-${key2}`] = o[key][key2];
      });
      if (Object.keys(n[key]).filter(e => ! e.startsWith('=')).length > 0) {
        n[`>${key}`] = n[key];
      }
    }
    else {
      n[`-${key}`] = o[key];
      n[`+${key}`] = n[key];
    }
    delete n[key];
    delete o[key];
  });
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

