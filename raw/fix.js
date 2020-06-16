const fs = require('fs');

const list = ["motivation", "role", "profession"];
for (const key in list) {
  if (list.hasOwnProperty(key)) {
    const type = list[key];

    const content = fs.readFileSync(`${__dirname}/packs/${type}.json`, "utf8");
    const data = JSON.parse(content);

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const item = data[key];
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
    }
  
    fs.writeFileSync(`${__dirname}/packs/${type}.json`, JSON.stringify(data), "utf8");
  }
}

