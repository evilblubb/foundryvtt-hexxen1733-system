

export class Jaeger extends Actor {

  
  /**
   * @override
   *
   * Prepare data for the Entity whenever the instance is first created or later updated.
   * This method can be used to derive any internal attributes which are computed in a formulaic manner.
   * For example, in a d20 system - computing an ability modifier based on the value of that ability score.
   */
	prepareData() {
    super.prepareData();
    
    const actor = this.data;

    // Abgeleitete Basisdaten für Jaeger berechnen
    if ("character" === actor.type) {
      // Max-Werte für Basis- und Puffer-LEP berechnen
      actor.data.health.min = -10;
      actor.data.health.max = 7 + actor.data.attributes.KKR.value + actor.data.attributes.WIL.value + actor.data.skills["Unempfindlichkeit"].value;
      actor.data.power.min = 0;
      actor.data.power.max = 10;
      
      // INI, PW und AP berechnen
      actor.data.calc = actor.data.calc || {};
      actor.data.calc.ini = actor.data.attributes.SIN.value + actor.data.attributes.GES.value + actor.data.skills["Reflexe"].value;    
      actor.data.calc.pw = actor.data.calc.pw || 1;    
      actor.data.calc.ap = 6 - actor.data.calc.pw;    
    }
  }

  

  /** @override */
  getRollData() {
    const data = super.getRollData();
    const shorthand = game.settings.get("worldbuilding", "macroShorthand");

    // Re-map all attributes onto the base roll data
    if ( !!shorthand ) {
      for ( let [k, v] of Object.entries(data.attributes) ) {
        if ( !(k in data) ) data[k] = v.value;
      }
      delete data.attributes;
    }

    // Map all items data using their slugified names
    data.items = this.data.items.reduce((obj, i) => {
      let key = i.name.slugify({strict: true});
      let itemData = duplicate(i.data);
      if ( !!shorthand ) {
        for ( let [k, v] of Object.entries(itemData.attributes) ) {
          if ( !(k in itemData) ) itemData[k] = v.value;
        }
        delete itemData["attributes"];
      }
      obj[key] = itemData;
      return obj;
    }, {});
    return data;
  }
}