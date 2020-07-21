const fs = require('fs');

const vttSystemName = "hexxen-1733";
const generatedIDs = [];
function generateID(count, k) {
  const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
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

function checkIDs(data, path="") {
  let count = 0;

  // TODO: Sonderfallbehandlung "powers": 2 Hauptkategorien

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value.hasOwnProperty("_id")) {
        const id = value._id;
        if (generatedIDs.includes(id)){
          delete value._id;
          count++;
          console.warn(`  @_ID:${path}/${key}: Duplicate id found! Will be randomly created!`);
        } else {
          generatedIDs.push(id);
        }
      } else {
        count++;
        console.warn(`  @_ID:${path}/${key}: No id found! Will be randomly created!`);
      }
    }
  }
  return count;
}

function checkSources(data, path="") {
  let count = 0;

  // TODO: Sonderfallbehandlung "powers": 2 Hauptkategorien

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      const sources = value.references;
      if (!sources || sources.length == 0) {
        count++;
        console.warn(`  @SOURCE:${path}/${key}: No source references found!`);
      }
      else {
        const filtered = sources.filter(source => "Wiki" === source.source);
        if (filtered.length == 0) {
          count++;
          console.error(`  @SOURCE:${path}/${key}: No "Scriptorium Wiki" references found!`);
        }
        else if (sources.length - filtered.length == 0) {
          count++;
          console.warn(`  @SOURCE:${path}/${key}: No book or other source references found!`);
        }
      }
    }
  }
  return count;
}

function checkTodo(data, path="") {
  let count = 0;
  if (data.hasOwnProperty("@todo")) {
    count++;
    console.info(`  @TODO\:${path}: ${data["@todo"]}`);
  };
  for (const key in data) {
    if ("@todo" !== key && data.hasOwnProperty(key)) {
      const value = data[key];
      if (value instanceof Object) {
        count += checkTodo(value, `${path}/${key}`);
      }
    }
  }
  return count;
}

function checkRefs(data, path="") {
  let count = 0;
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (value instanceof Object) {
        count += checkRefs(value, `${path}/${key}`);
      } else if (typeof(value) === "string") {
        count += _findRefs(value, `${path}/${key}`);
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
    console.info(`  @REF:${path}: ${matches}`);
    return matches.length;
  }
  return 0;
}

function convertItem(key, type, item) {
  const out = {};
  out._id = item._id || generateID(16);
  out.name = item.name;
  out.permission = { "default": 0 };
  out.type = type;
  out.data = {};
  out.data.references = item.references || [];
  out.data.description = _convertMultilineText(item.description) || "";
  out.data.summary = _convertMultilineText(item.summary) || "";
  out.flags = {};
  out.img = `systems/${vttSystemName}/img/Siegel-Rabe-small.png`;

  if ("role" === type) {
    _convertRoleItem(key, type, item, out);
  } else if ("profession" === type) {
    _convertProfessionItem(key, type, item, out);
  }

  return out;
}

function _convertMultilineText(text) {
  const lines = text.split('\n');
  if (lines.length > 0) {
    text = lines.reduce((out, line) => {
      out += `<p>${line}</p>`;
      return out;
    }, "");
  }
  return text;
}

function _convertRefs(text) {
  if (!text || typeof(text) !== "string") return 0;
  const regEx = /\[(.*?)\]/g;
  text = text.replace(regEx, (match, p1, offset, string) => {
    return _replaceRef(p1);
  });
  return text;
}

function _replaceRef(ref) {
  if (ref.startsWith('!')) {
    // ignore !refs
    return `[${ref}]`;
  } else {
    // TODO: ref über lookup-Liste einem pack zuordnen
    return `@Compendium[${vttSystemName}.hexxen-items.${ref}]`;
  }
}

function _convertRoleItem(key, type, item, out) {
  out.data.create = _convertRefs(item.create || ""); // no multi-paragraph support for now
  out.data.powers = getPowers(type, key);
}

function _convertProfessionItem(key, type, item, out) {
  out.data.powers = getPowers(type, key);
}

function getPowers(type, role) {
  const powers = input.power.content;
  const out = [];
  const set = powers[type][role];
  if (! set) {
    console.error(`  Jägerkräfte für Rolle ${role} nicht gefunden!`);
    return [];
  }
  new Map(Object.entries(set)).forEach((value, key) => {
    new Map(Object.entries(value)).forEach(value => {
      const power = { name: value.name, type: key };
      if ("aufbau" === key) {
        power.type = "ausbau"; // TODO: Fix für skills.json
        power.features = [];
        const stammeffekt = value.stammeffekt;
        power.features.push({name: stammeffekt.name, type: "stammeffekt"});
        const features = ["gesellen", "expert", "meister"];
        features.forEach(feature => {
          new Map(Object.entries(value[feature])).forEach(value => {
            let type = "";
            switch (feature) { // TODO: Fix für skills.json
              case "gesellen": type = "geselle"; break;
              case "expert": type = "experte"; break;
              default: type = feature;
            }
            power.features.push({name: value.name, type: type});
          });
        });
      }
      out.push(power);
    });
  });
  return out;
}

/********************
 * main code        *
 ********************/
const filesIn = {
  "motivation": "motivation.json",
  "power": "skills.json",
  "role": "role.json",
  "profession": "profession.json"
};
const filesOut = {
  "motivation": "motivation.db",
  // "power": "skills.db",
  "role": "role.db",
  "profession": "profession.db"
};
const input = {};
const output = {};
let error = false;

// preload files
for (const key in filesIn) {
  if (filesIn.hasOwnProperty(key)) {
    const type = key;
    const file = filesIn[type];

    console.log(`Loading ${file} ...`);
    try {
      const data = JSON.parse(fs.readFileSync(`${__dirname}/packs/${file}`, "utf8"));
      if (data.content) {
        input[type] = data;
      } else {
        input[type] = {};
        input[type].content = data;
      }
    }
    catch (err) {
      console.error(err);
      error = true;
    }
  }
}
if (error) {
  console.error("Errors occured, exiting.");
  return false;
}

// validate files
for (const key in input) {
  if (input.hasOwnProperty(key)) {
    const type = key;
    const file = filesIn[type];
    const data = input[type].content;
    const checks = {};

    console.log(`Validating ${type} ...`);
    checks.ids = checkIDs(data, file);
    checks.sources = checkSources(data, file);
    checks.todo = checkTodo(data, file);
    checks.refs = checkRefs(data, file);
    // TODO: weitere Prüfungen auf Vollständigkeit

    input[type].checks = checks;
    // TODO: Abbruch entscheiden
  }
}
if (error) {
  console.error("Errors occured, exiting.");
  return false;
}

// convert files
for (const key in input) {
  if (input.hasOwnProperty(key)) {
    const type = key;
    const data = input[type].content;

    if ("power" === type) {
      console.log("Skipping powers.");
      continue; // TODO: vorübergehend noch nicht konvertieren
    }

    output[type] = {}
    const content = [];
    console.log(`Converting ${type} ...`);
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const item = data[key];

        console.log(`  Converting ${item.name} ...`);
        const out = convertItem(key, type, item);
        content.push(out);
      }
    }
    output[type].content = content;
    output[type].checks = input[type].checks;
  }
}

// return 0;

// create db files
for (const key in output) {
  if (input.hasOwnProperty(key)) {
    const type = key;
    const file = filesOut[type] || null;
    const data = output[type].content;

    if (file) {
      console.log(`Creating ${file} ...`);
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
      console.log(`  ${data.length} entries created.`);
    }
    else {
      console.log(`Skipping ${file}.`);
      continue;
    }

    with (output[type].checks) {
      if (ids) {
        console.warn(`  Missing ${ids} IDs! Created new random IDs!`);
      }
      if (sources) {
        console.warn(`  Missing ${sources} source references!`);
      }
      if (todo) {
        console.info(`  ${todo} TODOs pending!`);
      }
    }
  }
}

console.log(`Done.`);
