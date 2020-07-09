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

const powers = JSON.parse(fs.readFileSync(`${__dirname}/packs/skills.json`, "utf8"));
function getPowers(type, role) {
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

const list = ["motivation", "role", "profession"];
for (const key in list) {
  if (list.hasOwnProperty(key)) {
    const type = list[key];

    console.log(`Converting ${type} ...`);
    const content = fs.readFileSync(`${__dirname}/packs/${type}.json`, "utf8");
    const data = JSON.parse(content);

    let fd;
    try {
      fd = fs.openSync(`${__dirname}/../packs/${type}.db`, 'w'); // alte Datei überschreiben

      let i = 0;
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const item = data[key];
          console.log(`Converting   ${item.name} ...`);

          const out = {};
          out._id = generateID(16);
          out.name = item.name;
          out.permission = { "default": 0 };
          out.type = type;
          out.data = {};
          out.data.references = item.references;
          out.data.description = item.description;
          out.data.summary = item.summary;
          if ("role" === type || "profession" === type) {
            out.data.powers = getPowers(type, key);
          }
          out.flags = {};
          out.img = "systems/hexxen-1733/img/Siegel-Rabe-small.png";

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
