/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

// FIXME: exports have to be done before any requires, as they might be required inside the other scripts
const input = {};
const output = {};
exports.input = input; // FIXME: vermeiden?

const fs = require('fs');
const { checkItems } = require('./build/validate.js');
const { convertList } = require('./build/convert.js');

// TODO: evtl. zusammen mit ID-Code in util.js auslagern, falls für fix.js interessant
class CompendiumFiles {
  constructor(type, hints={}) {
    this.type = type;
    this.hints = hints;
  }

  static deriveFrom(types) {
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
const files = CompendiumFiles.deriveFrom(types);
// FIXME: temporäre Abweichungen
files.npc = new CompendiumFiles('npc', {out: null}); // Erstellung der npc.db unterdrücken


let dryRun = true;
let pauseAfterStep = false; // Wichtig: setzt die Verwendung des internen Terminals voraus!
let error = false; // FIXME: errors aus Modulen abfragen


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

// TODO: durch flatten ersetzen (wird nur noch für convert verwendet)
function walk(type, data, path, regEx, checkFn, extras) {
  if (data["@target"]) {
    regEx = data["@target"];
  } else if (data["@map"]) {
    regEx = "^.*$";
    // FIXME: category einschleifen
  }
  new Map(Object.entries(data)).forEach((value, key) => {
    if (["@target", "@map"].includes(key)) {
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

function _flatten(type, data, path, mappings = {}, clues = []) {
  console.info(`  ${type} ...`);
  return __flatten(type, data, path, mappings, clues);
}

function __flatten(type, data, path, mappings = {}, clues = []) {
  // TODO: @all, @items implementieren, um alle enthaltenen Elemente mit properties befüllen zu können
  // TODO: @map Ziel-Properties müssen definiert sein (in Schema)
  // FIXME: mit @target umgehen, solange power.json alte Struktur hat
  if (!Array.isArray(data) && typeof(data) === "object" && (clues.length || data.hasOwnProperty("@map"))) {
    // if exists, @map overrides remaining clues completely
    // make sure clues is always an array AND use a copy of clues
    clues = data.hasOwnProperty("@map") ? [].concat(data["@map"]) : clues.map(c => c);
    const clue = clues.shift(); // clue might be undefined if array is empty
    const m = Object.assign({}, mappings); // make a copy of mappings before modifying it
    let out = [];

    Object.keys(data)
    .filter(k => !["@map", "@target"].includes(k))
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
      throw new TypeError(`All elements have to be of type Array or Object! Found "${path}" to be of type ${typeof(data)}`);
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
  types.forEach(type => input[type].flattened = _flatten(type, input[type].content, files[type].in));
  exitOnError();
  console.info('Flattening done.\n');
  await pause();



  // validate files
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = files[type].in;
      const data = input[type].flattened;
      const checks = { ids: 0, sources: 0, todos: 0, refs: 0, tags: 0, struct: {} }; // FIXME: auslagern

      console.info(`Validating ${type} ...`);
      input[type].checks = checks;

      checkItems(type, data, file, checks);

      // TODO: Abbruch entscheiden
    }
  }
  exitOnError();
  console.info(`Validating done.\n`);
  await pause();



  // convert files
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const type = key;
      const file = files[type].in;
      const data = input[type].content;

      output[type] = {};
      const content = [];
      console.info(`Converting ${type} ...`);

      // handle files with global structure elements
      if (data["@target"] || data["@map"]) {
        walk(type, data, file, null, convertList, content);
      }
      else {
        convertList(type, data, file, content);
      }

      output[type].content = content;
      output[type].checks = input[type].checks;
    }
  }
  exitOnError();
  console.info(`Converting done.\n`);
  await pause();



  // create structure.json FIXME: auslagern
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

      with (output[type].checks) {
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
