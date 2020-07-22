const fs = require('fs');

// für generateID()
const _sym = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const _len = 16;
const generatedIDs = [];

const list = ["power"]; // ["motivation", "role", "profession"];

for (const key in list) {
  if (list.hasOwnProperty(key)) {
    const type = list[key];

    const content = fs.readFileSync(`${__dirname}/packs/${type}.json`, "utf8");
    const json = JSON.parse(content);
    const data = json.content || json;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const item = data[key];

        walk(item, "_id", fixIDs);

        // fixReferences(item); // falsch formatierte references
      }
    }

    fs.writeFileSync(`${__dirname}/packs/${type}.json`, JSON.stringify(json), "utf8");
  }
}

function walk(item, key, fn) {
  if (typeof(item) !== "object") {
    return;
  }
  if (item.hasOwnProperty(key)) {
    fn(item);
  }
  new Map(Object.entries(item)).forEach(value => walk(value, key, fn));
}

function fixIDs(item) {
  if (item.hasOwnProperty("_id")) {
    if (! item._id.match(`[${_sym}]{${_len}}`)) {
      item._id = generateID();
    }
  }
}

function generateID(count = _len) {
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

// korrigiert falsch formatierte references
function fixReferences(item) {
  if (item.hasOwnProperty("references")) {
    const references = item.references;
    references.forEach(ref => {
      if (ref.page && ref.page.indexOf('|') != -1) {
        const parts = ref.page.split('|');
        delete ref.page;
        const newRef = {};
        newRef.source = parts[0].trim();
        newRef.page = parts[1].replace('Seite', '').trim();
        references.push(newRef);
      }
    });
  }
}

