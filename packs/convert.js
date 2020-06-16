const fs = require('fs');

const list = ["motivation", "role", "profession"];
for (const key in list) {
  if (list.hasOwnProperty(key)) {
    const type = list[key];

    const content = fs.readFileSync(`${__dirname}/${type}.json`, "utf8");
    const data = JSON.parse(content);
    
    let fd;
    try {
      fd = fs.openSync(`${__dirname}/${type}.db`, 'w'); // alte Datei überschreiben
    
      let i = 0;
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const item = data[key];
      
          const out = {};
          out._id = `${type}${++i}`; // TODO: Foundry-typische IDs erzeugen (16 Zeichen)
          out.name = item.name;
          out.permission = { "default": 0 };
          out.type = type;
          out.data = {};
          out.data.references = item.references;
          out.data.description = item.description;
          out.data.summary = item.summary;
          out.flags = {};
          out.img = "systems/hexxen-1733/img/Siegel-Rabe-small.png";
      
          fs.appendFileSync(fd, JSON.stringify(out), 'utf8');
          fs.appendFileSync(fd, '\n', 'utf8');
        }
      }
    
    } catch (err) {
      /* Handle the error */
      console.log(err);
    } finally {
      if (fd !== undefined)
        fs.closeSync(fd);
    }
    
  }
}

