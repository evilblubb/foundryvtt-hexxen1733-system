/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

// exports have to be done before any requires, as they might be required inside the other scripts
const input = {};
const output = {};
exports.input = input; // TODO: falls möglich vermeiden?

const fs = require('fs');
const { checkItems } = require('./build/validate.js');
const { convertItems } = require('./build/convert.js');

// TODO: evtl. zusammen mit ID-Code in util.js auslagern, falls für fix.js interessant
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

const types = [
  "regulation",
  "motivation",
  "power",
  "role",
  "profession",
  // "items",
  // "kleidung",
  // "reittiere",
  // "skillitems",
  "npc-power",
  "npc"
];
const files = CompendiumFiles.deriveFromTypes(types);
// FIXME: temporäre Abweichungen
files.npc = new CompendiumFiles('npc', {out: null}); // Erstellung der npc.db unterdrücken


let dryRun = true;
let pauseAfterStep = false; // Wichtig: setzt die Verwendung des internen Terminals voraus!
let error = false;


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

function _importRawData(type, file) {
  if (file) {
    console.info(`  ${file} ...`);

    try {
      const data = JSON.parse(fs.readFileSync(`${__dirname}/packs/${file}`, "utf8"));
      const ret = { raw: data };
      if (data.content) { // TODO: deprecated
        ret.content = data.content;
        console.warn("    Deprecated file format!");
      } else if (data["@content"]) {
        ret.content = data["@content"];
      } else { // TODO: deprecated
        ret.content = data;
        console.warn("    Deprecated file format!");
      }
      return ret;
    }
    catch (err) {
      if ('ENOENT' === err.code) {
        console.warn(`    No such file: ${__dirname}/packs/${file}`);
      } else {
        console.error(err);
        error = true;
      }
    }
  }
  else {
    console.info(`  skipping ${type} ...`);
  }

  // must always return a basic structure!
  return { raw: null, content: null };
}

function _importDB(type, file) {
  if (file) {
    console.info(`  ${file} ...`);
    const ret = [];

    try {
      const data = fs.readFileSync(`${__dirname}/../packs/${file}`, "utf8");
      const lines = data.split(/[\r\n]/);
      lines.forEach(line => {
        if (line) ret.push(JSON.parse(line));
      });
      return ret;
    }
    catch (err) {
      if ('ENOENT' === err.code) {
        console.warn(`    No such file: ${__dirname}/packs/${file}`);
      } else {
        console.error(err);
        error = true;
      }
    }
  } else {
    console.info(`  skipping ${type} ...`);
  }

  return null;
}

function _flatten(type, data, path, mappings = {}, clues = []) {
  console.info(`  ${type} ...`);
  return __flatten(type, data, path, mappings, clues);
}

function __flatten(type, data, path, mappings = {}, clues = []) {
  // TODO: @all, @items implementieren, um alle enthaltenen Elemente mit properties befüllen zu können
  // TODO: @map Ziel-Properties müssen definiert sein (in Schema)
  if (!Array.isArray(data) && typeof(data) === "object" && (clues.length || data.hasOwnProperty("@map"))) {
    // if exists, @map overrides remaining clues completely
    // make sure clues is always an array AND use a copy of clues
    clues = data.hasOwnProperty("@map") ? [].concat(data["@map"]) : clues.map(c => c);
    const clue = clues.shift(); // clue might be undefined if array is empty
    const m = Object.assign({}, mappings); // make a copy of mappings before modifying it
    let out = [];

    Object.keys(data)
    .filter(k => !["@map"].includes(k))
    .forEach(k => {
      // recursive call with extended mapping
      if (clue) m[clue] = k;
      out = out.concat(__flatten(type, data[k], [path, k].join('/'), m, clues));
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
      console.error(`    All elements have to be of type Array or Object! Found "${path}" to be of type ${typeof(data)}`);
      error = true;
      return null;
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

// special case
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
  // FIXME: weitere Modifikationen?
return ret;
}

// special case
function _extractAusbaukraftFeature(type, data, power, path, mappings) {
  // references aus Ausbaukraft übernehmen, um Fehlmeldungen bei der Quellenangabenprüfung zu vermeiden
  const ret = Object.assign({ "@input": data, "@power": power, "@path": path, references: power.references }, mappings, data);
  // FIXME: weitere Modifikationen?
  return ret;
}

// TODO: nach util.js auslagern
function _duplicate(data) {
  return JSON.parse(JSON.stringify(data));
}

function _sortByID(a, b) {
  return a._id < b._id ? -1 : (a._id > b._id ? 1 : 0);
}

function _diffDB(type, oldDB, newDB) {
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
  let o = _duplicate(oldDB).sort(_sortByID);
  let n = _duplicate(newDB).sort(_sortByID);

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


/********************
 * main code        *
 ********************/


async function main() {

  // load raw data
  console.info('Loading raw data ...');
  types.forEach(type => input[type] = _importRawData(type, files[type].in));
  exitOnError();
  console.info('Loading done.\n');
  await pause();

  // load old compendiums for comparision
  console.info('Loading previous DBs for comparison ...');
  types.forEach(type => input[type].db = _importDB(type, files[type].db));
  exitOnError();
  console.info('Loading done.\n');
  await pause();

  // flatten files (process @map properties)
  console.info('Flattening raw content data ...');
  types.forEach(type => input[type].flattened = _flatten(type, input[type].content, files[type].in)); // FIXME: wird path wirklich gebraucht?
  exitOnError();
  console.info('Flatten done.\n');
  await pause();

  // FIXME: validate with schema (on raw data)

  // FIXME: analyze structure (extract from check)

  // FIXME: check for duplicates (identical name)

  // validate flattened raw data
  console.info('Validating flattened content data ...');
  types.forEach(type => {
    let err;
    [input[type].checks, err] = checkItems(type, input[type].flattened);
    error |= err;
  });
  exitOnError();
  console.info(`Validation done.\n`);
  await pause();

  console.info('Converting flattened content data ...');
  types.forEach(type => {
    let err;
    [output[type], err] = convertItems(type, input[type].flattened);
    error |= err;
  });
  exitOnError();
  console.info(`Conversion done.\n`);
  await pause();

  // FIXME: sicherstellen, dass output kein undefined enthält!

  console.info('Comparing with previous DB content.');
  types.forEach(type => input[type].diff = _diffDB(type, input[type].db, output[type].content));
  exitOnError();
  console.info('Comparation done.\n');
  await pause();

  // create diff.json FIXME: auslagern und direkt nach Analyse aufrufen
  const diff = {};
  for (const key in input) {
    diff[key] = input[key].diff;
  }
  try {
    fd = fs.openSync(`${__dirname}/diff.json`, 'w'); // alte Datei überschreiben
    fs.appendFileSync(fd, JSON.stringify(diff), 'utf8');
    fs.appendFileSync(fd, '\n', 'utf8');
  } catch (err) {
    /* Handle the error */
    console.error(err);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  // FIXME: prettify json

  // create structure.json FIXME: auslagern und direkt nach Strukturanalyse aufrufen
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
    if (fd !== undefined) fs.closeSync(fd);
  }
  // FIXME: prettify json

  // FIXME: Änderungen an Input-Daten zurückschreiben
  // FIXME: prettify json

  // create db files
  if (dryRun) {
    console.warn("DryRun, no DB creation.")
  }

  for (const key in output) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = files[type].out || null;
      const data = output[type].content;

      if (!dryRun && file) {
        console.info(`Creating ${file} ...`);
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
        console.info(`  ${data.length} entries created.`);
      }
      else {
        console.warn(`Skipping ${type}.`);
        console.info(`  ${data.length} entries prepared.`);
      }
      if (input[type].diff) {
        const diff = input[type].diff;
        if (diff.msg) {
          console.error(`  Diff failed: ${diff.msg}`);
        } else {
          console.info(`  (${diff.modified.length} modified, ${diff.added.length} added, ${diff.removed.length} removed)`);
        }
      }

      with (input[type].checks) {
        if (ids) {
          console.warn(`  Missing ${ids} IDs! Created new random IDs!`);
        }
        if (sources) {
          console.warn(`  Missing ${sources} source references!`);
        }
        if (todos) {
          console.info(`  ${todos} TODOs pending!`);
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

  console.info(`Done.`);
  await pause();

}

// run main function
main();
