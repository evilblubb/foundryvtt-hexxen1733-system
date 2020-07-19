const fs = require('fs');

const generated = [];
function generateID(count, k) {
  const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let str;

  do {
    str = '';

    for(let i = 0; i < count; i++) {
        str += _sym[Math.floor(Math.random() * (_sym.length))];
    }
  } while (generated.includes(str));

  generated.push(str);
  return str;
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
  }
}

function getPowers(type, role) {
  const powers = input.skills;
  const out = [];
  const set = powers[type][role];
  if (! set) {
    console.error(`Jägerkräfte für Rolle ${role} nicht gefunden!`);
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

function convertItem(key, type, item) {
  const out = {};
  out._id = generateID(16);
  out.name = item.name;
  out.permission = { "default": 0 };
  out.type = type;
  out.data = {};
  out.data.references = item.references || [];
  out.data.description = item.description || "";
  out.data.summary = item.summary || "";
  out.flags = {};
  out.img = "systems/hexxen-1733/img/Siegel-Rabe-small.png";

  if ("role" === type) {
    _convertRoleItem(key, type, item, out);
  } else if ("profession" === type) {
    _convertProfessionItem(key, type, item, out);
  }

  return out;
}

function _convertRoleItem(key, type, item, out) {
  out.data.create = item.create || "";
  out.data.powers = getPowers(type, key);
}

function _convertProfessionItem(key, type, item, out) {
  out.data.powers = getPowers(type, key);
}

/********************
 * main code        *
 ********************/

 // preload files
const filesIn = { "motivation": "motivation", "skills": "power", "role": "role", "profession": "profession" };
const input = {};
let error = false;
for (const key in filesIn) {
  if (filesIn.hasOwnProperty(key)) {
    const file = key;

    console.log(`Loading ${file}.json ...`);
    try {
      const data = JSON.parse(fs.readFileSync(`${__dirname}/packs/${file}.json`, "utf8"));
      input[file] = data;
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
    const file = key;
    const data = input[key].content || input[key];
    const type = filesIn[key];

    console.log(`Validating ${file}.json ...`);
    const todo = checkTodo(data, `${file}.json`);
    const refs = checkRefs(data, `${file}.json`);
    // TODO: weitere Prüfungen auf Vollständigkeit
    if (todo > 0) console.log(`  ${todo} TODO(s) found!`);
  }
}
if (error) {
  console.error("Errors occured, exiting.");
  return false;
}

// convert files
for (const key in input) {
  if (input.hasOwnProperty(key)) {
    const file = key;
    const data = input[key].content || input[key];
    const type = filesIn[key];

    if ("power" === type) continue; // TODO: vorübergehend noch keine DB erzeugen

    console.log(`Converting ${type} ...`);
    let fd;
    try {
      fd = fs.openSync(`${__dirname}/../packs/${type}.db`, 'w'); // alte Datei überschreiben

      let i = 0;
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const item = data[key];
          console.log(`Converting   ${item.name} ...`);

          const out = convertItem(key, type, item);

          fs.appendFileSync(fd, JSON.stringify(out), 'utf8');
          fs.appendFileSync(fd, '\n', 'utf8');
        }
      }

    } catch (err) {
      /* Handle the error */
      console.error(err);
    } finally {
      if (fd !== undefined)
        fs.closeSync(fd);
    }

  }
}

console.log(`Done.`);
