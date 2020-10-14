/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/** Data structure containing the game template data. */
const templates = {};
/** Data structure containing all the raw and intermediate data. */
const input = {};
/** Data structure containing the generated compendium data. */
const output = {};
// exports have to be done before any requires, as they might be required inside the other scripts
exports.templates = templates;
exports.input = input;

const fs = require('fs');
const { CompendiumFiles } = require('./build/utils.js');
const { checkItems } = require('./build/validate.js');
const { convertItems } = require('./build/convert.js');
const { diffDB } = require('./build/diff.js');

const BASE_DIR = __dirname;
const LOG_DIR = BASE_DIR;
const RAW_DATA_DIR = `${BASE_DIR}/packs`;
const COMPENDIUM_DIR = `${BASE_DIR}/../packs`;
const TEMPLATE_PATH = `${BASE_DIR}/../template.json`;
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

function _importTemplates(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    templates.raw = raw;
    // FIXME: check syntax with schema
  }
  catch (err) {
    if ('ENOENT' === err.code) {
      console.warn(`  No such file: ${file}`);
    } else {
      console.error(err);
      error = true;
    }
  }
}

function _expandTemplates() {
  const tEntities = ['Actor', 'Item'];
  const raw = templates.raw;

  // check for core elements
  // FIXME: wird durch schema-Check ersetzt
  tEntities.forEach(el => {
    if (!raw.hasOwnProperty(el) || !Array.isArray(raw[el].types)) {
      console.error(`  Missing "${el}.types" or not an array!`);
      error = true;
    }
  });
  if (error) return;

  // expand types
  tEntities.forEach(entity => {
    templates[entity] = {};
    const types = raw[entity].types;
    types.forEach(type => {
      const r = raw[entity][type];
      const t = {};
      if (r.hasOwnProperty('templates')) {
        r.templates.forEach(tp => {
          Object.assign(t, raw[entity].templates[tp]);
        });
      }
      Object.assign(t, r);
      delete t.templates;
      templates[entity][type] = t;
    })
  });
}

function _importRawData(type, path, file) {
  if (file) {
    console.info(`  ${file} ...`);

    try {
      const data = JSON.parse(fs.readFileSync(`${path}/${file}`, "utf8"));
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
        console.warn(`    No such file: ${path}/${file}`);
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

function _importDB(type, path, file) {
  if (file) {
    console.info(`  ${file} ...`);
    const ret = [];

    try {
      const data = fs.readFileSync(`${path}/${file}`, "utf8");
      const lines = data.split(/[\r\n]/);
      lines.forEach(line => {
        if (line) ret.push(JSON.parse(line));
      });
      return ret;
    }
    catch (err) {
      if ('ENOENT' === err.code) {
        console.warn(`    No such file: ${path}/${file}`);
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

function exportJSON(data, file) {
  try {
    fd = fs.openSync(file, 'w'); // alte Datei überschreiben
    fs.appendFileSync(fd, JSON.stringify(data, null, 2), 'utf8');
    fs.appendFileSync(fd, '\n', 'utf8');
  } catch (err) {
    /* Handle the error */
    error = true;
    console.error(err);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
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

  // FIXME: besser aus __flatten aufrufen, da _inject nicht zwingend aufgerufen wird!
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

  // prepare input and output
  types.forEach(type => {
    input[type] = {};
    output[type] = {};
  });

  console.info('Loading entity templates ...');
  _importTemplates(TEMPLATE_PATH);
  _expandTemplates();
  exitOnError();
  console.info('Loading done.\n');
  await pause();

  // load old compendiums for comparision
  console.info('Loading previous DBs for comparison ...');
  types.forEach(type => input[type].db = _importDB(type, COMPENDIUM_DIR, files[type].db));
  exitOnError();
  console.info('Loading done.\n');
  await pause();

  // load raw data
  console.info('Loading raw data ...');
  types.forEach(type => Object.assign(input[type], _importRawData(type, RAW_DATA_DIR, files[type].in)));
  exitOnError();
  console.info('Loading done.\n');
  await pause();

  // FIXME: validate with schema (on raw data)

  // flatten files (process @map properties)
  console.info('Flattening raw content data ...');
  types.forEach(type => input[type].flattened = _flatten(type, input[type].content, files[type].in)); // FIXME: wird path wirklich gebraucht?
  exitOnError();
  console.info('Flatten done.\n');
  await pause();

  // FIXME: check for duplicates (identical name)

  // FIXME: analyze structure (extract from check)

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
    [output[type].content, err] = convertItems(type, input[type].flattened);
    error |= err;
  });
  exitOnError();
  console.info(`Conversion done.\n`);
  await pause();

  // FIXME: sicherstellen, dass output kein undefined enthält!

  console.info('Comparing with previous DB content.');
  const diff = {};
  types.forEach(type => {
    let err;
    [input[type].diff, err] = diffDB(type, input[type].db, output[type].content);
    error |= err;
    diff[type] = input[type].diff;
  });
  exportJSON(diff, `${LOG_DIR}/diff.json`);
  exitOnError();
  console.info('Comparation done.\n');
  await pause();

  // FIXME: increment @rev in generated output if neccessary (Auch in input??)

  // create structure.json FIXME: auslagern und direkt nach Strukturanalyse aufrufen
  const struct = {};
  for (const key in input) {
    struct[key] = input[key].checks.struct;
  }
  try {
    fd = fs.openSync(`${LOG_DIR}/structure.json`, 'w'); // alte Datei überschreiben
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
          fd = fs.openSync(`${COMPENDIUM_DIR}/${file}`, 'w'); // alte Datei überschreiben

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
