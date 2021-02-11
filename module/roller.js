/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/**
 * TODO: doc
 */
class HexxenRollHelper {

  static checkSystemReqirements() {
    // special-dice-roller
    const foundry = game.data.version;
    const sdr = game.modules.get("special-dice-roller");
    if (sdr && sdr.active) {
      const version = sdr.data.version;
      // Foundry 0.6.5 and higher --> 0.11.2 or higher
      if (isNewerVersion(foundry, "0.6.4") && !isNewerVersion(version, "0.11.1")) {
        if (game.user.isGM) {
          ui.notifications.error("Kein kompatibles Würfeltool gefunden! Seit \"Foundry 0.6.5\" wird mindestens Version \"0.11.2\" des Add-On \"special-dice-roller\" benötigt.",
                                  {permanent: true});
        }
        return;
      }
      // Foundry up to 0.6.4 --> 0.11.0 or higher
      else {
        if (!isNewerVersion(version, "0.11")) { // 0.11.0 is newer than 0.11
          if (game.user.isGM) {
            ui.notifications.error("Kein kompatibles Würfeltool gefunden! Es wird mindestens Version \"0.11.0\" des Add-On \"special-dice-roller\" benötigt.",
                                    {permanent: true});
          }
          return;
        }
      }

      this.delegate = HexxenSpecialDiceRollerHelper;
    } else if (false) {
      // TODO: dice-so-nice??
    } else {
      if (game.user.isGM) {
        ui.notifications.error("Kein kompatibles Würfeltool gefunden! Stellen Sie sicher, dass das Add-On \"special-dice-roller\" installiert und in der Welt aktiviert ist.",
                                {permanent: true});
      }
    }
  }

  static createMacro(hotbar, data, slot) {
    if (data.type === 'HexxenRoll') {
      data.type = 'Macro';
      // FIXME: hints aufteilen --> options
      data.data = {
        name: data.data.key,
        type: 'script',
        command: `HexxenRollHelper.roll('${data.actorId}', { event: window.event, type: '${data.data.type}', key: '${data.data.key}', prompt: false });`
      }
    }
  }

  static resolveActor(actorHint) {
    if (actorHint instanceof Actor) {
      return actorHint;
    }
    // TODO: tokens auf canvas prüfen?
    let actor = game.actors.get(actorHint);
    if (actor) return actor;
    actor = game.actors.getName(actorHint);
    if (actor) return actor;

    // fallback
    return ChatMessage.getSpeakerActor(ChatMessage.getSpeaker());
  }

  static splitHints(formula) {
    // expecting formulaOrName|bonus#flavour
    const parts1 = formula.split('#', 2).map(p => p.trim());
    const parts2 = parts1[0].split('|').map(p => p.trim());
    // TODO: mehrere Optionen
    return { nameOrFormula: parts2[0], modifier: parts2[1], flavour: parts1[1] };
  }

  static _getHintType(nameOrFormula) {
    // TODO: auf Items umstellen, sobald SC umgestellt
    // vorerst über template testen
    const template = game.system.template.Actor.character;
    const types = ['attributes', 'skills', 'combat'];
    for (const type of types) {
      // vergleiche mit keys und labels
      for (const key in template[type]) {
        if (key === nameOrFormula || template[type][key].label === nameOrFormula) {
          switch (type) {
            case 'attributes': return 'attribute';
            case 'skills': return 'skill';
          }
          return type;
        }
      }
    }
    // kein Name, teste Formel
    if(this._testFormula(nameOrFormula)) {
      return 'formula';
    }
    return false;
  }

  static _getKey(nameOrFormula) {
    // vorerst über template testen
    const template = game.system.template.Actor.character;
    const types = ['attributes', 'skills', 'combat'];
    for (const type of types) {
      // vergleiche mit keys und labels
      for (const key in template[type]) {
        if (key === nameOrFormula) {
          return nameOrFormula;
        } else if (template[type][key].label === nameOrFormula) {
          return key;
        }
      }
    }
    return nameOrFormula;
  }

  static _testFormula(formula) {
    return this.delegate?.__testFormula(formula) || false;
  }

  static __testFormula(formula) {
    throw "The delegate has to override __testFormula(...)";
  }

  /**
   *
   * @param {String|Actor} actor Name oder ID des Actors oder Actor-Objekt oder Token?
   * @param {String|Object} hints key: Name der Fertigkeit
   *                       type: (optional) Typ der Fertigkeit
   * TODO: Rest sollte nach options verschoben werden
   *                       event: (optional) MouseEvent
   *                       showDialog: (opional) Würfeldialog, default: false
   */
  static roll(actor, hints={}, options={}) {
    actor = this.resolveActor(actor);
    // TODO: actor aus event ableiten?
    // TODO: user mit mehreren Charakteren
    if (!actor) {
      ui.notifications.error("Kein Token ausgewählt!");
      return false;
    }

    // TODO: Berechtigung? und andere Prüfungen?

    if ('string' === typeof(hints)) {
      // CASE 1: Attribut oder Fertigkeit (name|bonus#flavour)
      // CASE 2: Formel (formula#flavour)
      // ELSE:   nicht verarbeitbar --> Fehlermeldung
      const parts = this.splitHints(hints);
      parts.type = this._getHintType(parts.nameOrFormula);

      if (!parts.type) {
        ui.notifications.error("Würfelwurf kann nicht interpretiert werden!");
        return false;
      }
      if ('formula' === parts.type) {
        parts.formula = parts.nameOrFormula;
        // TODO: ctrl-click
        return this.rollToChat(actor, parts.formula, parts.flavour, options);
      }
      else {
        parts.name = parts.nameOrFormula;
        parts.key = this._getKey(parts.nameOrFormula);
        if ('character' !== actor.type) {
          ui.notifications.error("Das Würfeln von Fertigkeiten wird aktuell nur von Spieler-Charakteren unterstützt!");
          return false;
          }
        hints = { key: parts.key, type: parts.type, modifier: parts.modifier };
      }
    }

    // TODO: Tunnelung durch HexxenRoller ersetzen
    const ev = options.event || hints.event;
    if (ev && ev.type === 'click') {
      hints.prompt = hints.prompt || ev.shiftKey || ev.ctrlKey;
    }
    const roller = new HexxenRoller(actor, {}, hints);
    if (hints.prompt === true) {
      roller.render(true);
    }
    else {
      roller.roll();
    }
  }

  static rollToChat(actor, roll={}, flavour=null, options={}) {
    if (!this.delegate) {
      ui.notifications.error("Kein kompatibles Würfeltool gefunden!");
      return false;
    }
    // TODO: Umleitung über WürfelTool-Dialog implementieren (options.showDialog: true)
    return this.delegate._rollToChat(actor, roll, flavour, options);
  }

  static _rollToChat(actor, roll={}, flavour=null, options={}) {
    throw "The delegate has to override _rollToChat(...)";
  }
}

class HexxenSpecialDiceRollerHelper extends HexxenRollHelper {

  static __testFormula(formula) {
    // FIXME: noch zu implementieren
    return true;
  }

  static _rollToChat(actor, roll={}, flavour=null, options={}) {
    const roller = game.specialDiceRoller.heXXen;

    let empty = true;
    let command = "/hex ";
    if ("string" === typeof(roll)) {
      empty = false;
      command += roll;
    } else if ("object" === typeof(roll)) {
      for ( let die of Object.keys(roll) ) {
        let count = roll[die];
        if ( count > 0 ) {
          empty = false;
          command += count;
          command += die;
        }
      }
    }

    if (empty) return false;

    if (flavour) {
      command += ` # ${flavour}`;
    }

    const speaker = ChatMessage.getSpeaker({actor: actor, token: actor ? actor.token : undefined});
    const message = roller.rollCommand(command);

    SDRRoll.create('roll', { content: message } ).toMessage( { speaker: speaker }, { rollMode: game.settings.get('core', 'rollMode') } );

    return {}; // TODO: result und chatId zurückgeben
  }
}

// FIXME: alte HexxenRoll objekte umschreiben
class SDRRoll extends Roll {

  constructor(formula, data={}) {
    super(formula, data);
  }

  /** @override */
  static create(...args) {
    return new SDRRoll(...args);
  }

  /** @override TODO: momentan überspringen */
  _identifyTerms(formula, {step=0}={}) {
    return [];
  }

  /** @override TODO: momentan überspringen */
  static cleanFormula(terms) {
    return terms;
  }

  _mapFace(face, key) {
    switch(face) {
      case '0':  // ERFOLG
        switch(key) {
          case 'h': return this._oneOf([5,6]);
          case 'g': return this._oneOf([4,5,6]);
          case 's': return this._oneOf([4,5]);
          default: return 5;
        }
      case '1':  // ESPRITSTERN
        switch(key) {
          case 'h': return 1;
          case 's': return this._oneOf([1,2]);
          default: return 1;
        }
      case '2':  // LEER
        switch(key) {
          case 'h': return this._oneOf([2,3,4]);
          case 'g': return this._oneOf([1,2,3]);
          case 'j': return this._oneOf([1,2,3]);
          case 's': return 3;
          case 'b': return 1;
          default: return 3;
        }
      case '3': return this._oneOf([4,5,6]); // BONUS
      case '4': return this._oneOf([4,5,6]); // MALUS
      case '5': return 6; // DOPPELERFOLG
      case '6': return this._oneOf([2,3]); // BLUT_EINS
      case '7': return this._oneOf([4,5]); // BLUT_ZWEI
      case '8': return 6; // BLUT_DREI
      case '9': return 1; // ELIXIR_EINS
      case '10': return 2; // ELIXIR_ZWEI
      case '11': return this._oneOf([3,6]); // ELIXIR_DREI
      case '12': return 4; // ELIXIR_VIER
      case '13': return 5; // ELIXIR_FUENF
      case '14': return 1; // FLUCH_EINS
      case '15': return 2; // FLUCH_ZWEI
      case '16': return this._oneOf([3,6]); // FLUCH_DREI
      case '17': return 4; // FLUCH_VIER
      case '18': return 5; // FLUCH_FUENF
      default: throw 'unbekannte Face';
    }
  }

  _oneOf(set) {
    if (!Array.isArray(set)) return set;
    const count = set.length;
    return set[Math.floor(Math.random()*count)];
  }

  /** @override TODO: momentan nur rolled setzen */
  evaluate({minimize=false, maximize=false}={}) {
    // TODO: temp. Extraktionscode
    const rollHtml = $(this.data.content);
    const rolls = {h:[], '+':[], '-':[], s:[], b:[], e:[], f:[]};
    rollHtml.find('input[data-face]').each((i, el) => {
      const die = el.dataset.die;
      const face = el.dataset.face;
      switch (die) {
        case '0': rolls.h.push(face); break;
        case '1': rolls['+'].push(face); break;
        case '2': rolls['-'].push(face); break;
        case '3': rolls.s.push(face); break;
        case '4': rolls.b.push(face); break;
        case '5': rolls.e.push(face); break;
        case '6': rolls.f.push(face); break;
      }
      // this._addToTerm(die, face);
    });
    // console.log(rolls);
    // Fake formula
    const formula = [];
    for (const key in rolls) {
      if (rolls[key].length > 0) {
        const die = ((key) => {
          switch (key) {
            case 'h': return 'dhh';
            case 'g': return 'dhg';
            case '+': return 'dhj';
            case '-': return 'dhm';
            case 's': return 'dhs';
            case 'b': return 'dhb';
            case 'e': return 'dhe';
            case 'f': return 'dhf';
          }
        })(key);
        formula.push(`${rolls[key].length}${die}`);
      }
    }
    this._formula = formula.join('+');
    // console.log(this._formula);

    // fake terms
    for (const key in rolls) {
      if (rolls[key].length > 0) {
        const results = [];
        for (const face of rolls[key]) {
          results.push({active: true, result: this._mapFace(face, key)});
        }
        const dt = ((key) => {
          switch (key) {
            case 'h': return HexxenDie;
            case 'g': return GamemasterDie;
            case '+': return JanusBonusDie;
            case '-': return JanusMalusDie;
            case 's': return SegnungsDie;
            case 'b': return BlutDie;
            case 'e': return ElixierDie;
            case 'f': return FluchDie;
          }
        })(key).fromResults({number: results.length}, results);
        // TODO: Die flavour
        if (key === '-') dt.options.colorset = 'black';
        this.terms.push(dt);
        this.terms.push('+');
      }
    }
    if (this.terms.length > 0) {
      this.terms.pop();
    }
    // console.log(this.terms);

    // paste generated HTML into results array because of JSON serialization
    this.results = [ this.data.content ]; // FIXME:
    this._rolled = true;
    return this;
  }

  // _addToTerm(die, face) {

  // }

  /** @override */
  async render(chatOptions = {}) {
    // FIXME: implementieren
    return chatOptions.isPrivate ? "" : this.results[0];
    // TODO: eigenes Template
  }

  static fromData(data) {
    return super.fromData(data);
  }
}

class HexxenRoll extends Roll {
  constructor(formula, data={}) {
    // FIXME: Hexxenformeln umschreiben
    // FIXME: unbekannte Würfel
    super(formula, data);
  }

  /** @override */
  evaluate({minimize=false, maximize=false}={}) {
    const ret = super.evaluate(...arguments);
    this._total = this.hexxenTotal;
    return ret;
  }

  /** @override */
  _safeEval(expression) {
    // FIXME: implementieren
    // FIXME: reguläre Würfe
    // FIXME: gemischte Würfe
    this.hexxenTotal = HexxenRollResult.cleanString(expression, true);
    return 0;
  }

  // FIXME: modifizierte Kopie aus Foundry, Alternativ: super aufrufen und HTML manipulieren
  async render(chatOptions = {}) {
    const html = await super.render(...arguments);
    return $(html).find('.dice-total').text(this.total).end().prop('outerHTML');
    ;
  }
  /** @override 0.7.9 */
  // async render(chatOptions = {}) {
  //   chatOptions = mergeObject({
  //     user: game.user._id,
  //     flavor: null,
  //     template: this.constructor.CHAT_TEMPLATE,
  //     blind: false
  //   }, chatOptions);
  //   const isPrivate = chatOptions.isPrivate;

  //   // Execute the roll, if needed
  //   if (!this._rolled) this.roll();

  //   // Define chat data
  //   const chatData = {
  //     formula: isPrivate ? "???" : this._formula,
  //     flavor: isPrivate ? null : chatOptions.flavor,
  //     user: chatOptions.user,
  //     tooltip: isPrivate ? "" : await this.getTooltip(),
  //     total: isPrivate ? "?" : this.total // FIXME: Foundry verwendet Math.round!!
  //   };

  //   // Render the roll display template
  //   return renderTemplate(chatOptions.template, chatData);
  // }
}

// FIXME: Aufruf aus hexxen.js
// Manipulate DiceTerm.matchTerm() to allow for two-digit denominations starting with 'h'
// Wichtig: Muss bereits in init erfolgen! Sonst können Probleme beim Rekonstruieren der ChatMeldungen auftreten!
Hooks.once('init', () => {
  // FIXME: auf Änderungen in Foundry prüfen (Stand 0.7.9)
  // static matchTerm(expression, {imputeNumber=true}={}) {
  //   const rgx = new RegExp(`^([0-9]+)${imputeNumber ? "?" : ""}[dD]([A-z]|[0-9]+)${DiceTerm.MODIFIERS_REGEX}${DiceTerm.FLAVOR_TEXT_REGEX}`);
  //   const match = expression.match(rgx);
  //   return match || null;
  // }

  /* @override 0.7.9 */
  DiceTerm.matchTerm = (expression, {imputeNumber=true}={}) => {
    const rgx = new RegExp(`^([0-9]+)${imputeNumber ? "?" : ""}[dD]([hH][A-z]|[A-z]|[0-9]+)${DiceTerm.MODIFIERS_REGEX}${DiceTerm.FLAVOR_TEXT_REGEX}`);
    const match = expression.match(rgx);
    return match || null;
  };
});

class HexxenRollResult {
  static cleanString(result, isRoll=false) {
    if ('string' !== typeof(result)) return result;
    if (result.length === 0) return 0;

    const order = '+-*bef';
    const regex = RegExp(`\\d${isRoll?'+':'*'}[+\\-\\*bef]`, 'g'); // FIXME: schon terms bereinigen??
    let parts = result.match(regex)||[];
    parts = parts.reduce((r,p) => { let cnt=parseInt(p)||1; p=p.length>1?p.charAt(p.length-1):p; r[p]||=0; r[p]+=cnt; return r; }, {});
    const keys = Object.keys(parts).sort((a,b) => order.indexOf(a) - order.indexOf(b));
    return keys.reduce((r,k) => { return `${r} ${parts[k]}${k}` }, '');
    // FIXME: 0 Ergebnisse
    // FIXME: negative Erfolge
  }

}

class HexxenTerm extends DiceTerm {
  constructor(termData ) {
    termData.faces=6;
    super(termData);
  }

  static LABELS = ['?', '?', '?', '?', '?', '?'];
  static IMGS = [];

  /** @override */
  roll({minimize=false, maximize=false}={}) {
    const roll = super.roll(...arguments);
    roll.count = this.constructor.LABELS[roll.result-1]; // FIXME: activeDice??
    return roll;
  }

  /** @override */
  get total() {
    const total = super.total;
    if ('string' === typeof(total)) return HexxenRollResult.cleanString(total.substring(1));
    return total;
  }

  /** @override */
  static getResultLabel(result) {
    const imgPath = 'modules/special-dice-roller/public/images/hex'; // FIXME: via config
    // FIXME: empty img
    const img = this.IMGS[result-1];
    return `<img src="${imgPath}/${img}" />`;
    // FIXME: min/max-Farben und border entfernen (template?)
    // FIXME: Würfelgröße

    // FIXME: bei simple: &nbsp; ersetzen
  }
}

class HexxenDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hh';
  /** @override */
  static LABELS = ['*', '', '', '', '+', '+'];
  /** @override */
  static IMGS = ['hesprit.png', 'hblank.png', 'hblank.png', 'hblank.png', 'herfolg.png', 'herfolg.png'];
}

class GamemasterDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hg';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['hblank.png', 'hblank.png', 'hblank.png', 'herfolg.png', 'herfolg.png', 'herfolg.png'];
  // FIXME: Farbe?
}

class JanusBonusDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hj';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['jblank.png', 'jblank.png', 'jblank.png', 'jdoppelkopf.png', 'jdoppelkopf.png', 'jdoppelkopf.png'];
}

class JanusMalusDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hm';
  /** @override */
  static LABELS = ['', '', '', '-', '-', '-'];
  /** @override */
  static IMGS = ['jblank.png', 'jblank.png', 'jblank.png', 'jdoppelkopf.png', 'jdoppelkopf.png', 'jdoppelkopf.png'];
  // FIXME: Farbe?
}

class SegnungsDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hs';
  /** @override */
  static LABELS = ['*', '*', '', '+', '+', '++'];
  /** @override */
  static IMGS = ['sesprit.png', 'sesprit.png', 'sblank.png', 'serfolg.png', 'serfolg.png', 'sdoppelerfolg.png'];
}

class BlutDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hb';
  /** @override */
  static LABELS = ['', 'b', 'b', 'bb', 'bb', 'bbb'];
  /** @override */
  static IMGS = ['bblank.png', 'beins.png', 'beins.png', 'bzwei.png', 'bzwei.png', 'bdrei.png'];
}

class ElixierDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'he';
  /** @override */
  static LABELS = ['1e', '2e', '3e', '4e', '5e', '3e'];
  /** @override */
  static IMGS = ['eeins.png', 'ezwei.png', 'edrei.png', 'evier.png', 'efuenf.png', 'edrei.png'];
}

class FluchDie extends HexxenTerm {
  /** @override */
  static DENOMINATION = 'hf';
  /** @override */
  static LABELS = ['1f', '2f', '3f', '4f', '5f', '3f'];
  /** @override */
  static IMGS = ['feins.png', 'fzwei.png', 'fdrei.png', 'fvier.png', 'ffuenf.png', 'fdrei.png'];
}


/**
 * HeXXen Roller Application
 * @type {FormApplication}
 * @param entity {Entity}      The Entity object for which the sheet is being configured
 * @param options {Object}     Additional Application options
 */
class HexxenRoller extends FormApplication {

  constructor(entity=null, options={}, hints={}) {
    super(entity, options);
    this.hints = hints;
    if (!hints.key) {
      this.options.closeOnSubmit = false;
    }
  }

	static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["hexxen", "roller"],
      id: "roller",
      template: Hexxen.basepath + "templates/roller.html",
      width: 300,
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get id() {
    return "roller-" + this.appId;
  }

  /**
   * Add the Entity name into the window title
   * @type {String}
   */
  get title() {
    return "HeXXen Würfel Tool";
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    let data = super.getData() // object == entity, options == options
    data.hints = this.hints;

    let type = this.hints.type;
    let key = this.hints.key;
    let modifier = Number(this.hints.modifier) || 0;
    data.manual = key ? false : true;

    let result = {};
    data.data = result;
    let dice = { "h": { label: "Hexxen", count: 0 },
                 "+": { label: "Bonus", count: 0 },
                 "-": { label: "Malus", count: 0 },
                 "s": { label: "Segnung", count: 0 },
                 "b": { label: "Blut", count: 0 },
                 "e": { label: "Elixir", count: 0 },
                 "f": { label: "Fluch", count: 0 }
                };
    result.dice = dice;

    result.type = type;
    result.key = key;
    result.label = key;
    result.modifier = 0;
    result.value = 0;


    if ("attribute" === type) {
      let attribute = data.object.data.attributes[key]
      result.value = attribute.value;
      result.dice.h.count = attribute.value;
      result.label = attribute.label;
    }
    else if ("skill" === type) {
      let skill = data.object.data.skills[key]
      let attribute = data.object.data.attributes[skill.attribute]
      let rolls = Number(skill.value) + Number(attribute.value);
      result.value = rolls;
      result.dice.h.count = rolls;
      result.label = skill.label;
    }
    else if ("combat" === type) {
      let combat = data.object.data.combat[key]
      let attribute = data.object.data.attributes[combat.attribute]
      let rolls = Number(combat.value) + Number(attribute.value);
      result.value = rolls;
      result.dice.h.count = rolls;
      result.label = combat.label;
      if (combat.schaden) result.label += ` (SCH +${combat.schaden})`; // TODO: könnte sich mit modifier überschneiden
    }

    if (modifier < 0) {
      result.label += modifier;
      result.dice['-'].count -= modifier; // require positive count
    }
    else if (modifier > 0) {
      result.label += `+${modifier}`;
      result.dice['+'].count += modifier;
    }

    return data;

/*     const entityName = this.object.entity;
    const config = CONFIG[entityName];
    const type = this.object.data.type || CONST.BASE_ENTITY_TYPE;
    const classes = Object.values(config.sheetClasses[type]);
    const defcls = classes.find(c => c.default);
    return {
      entityName: entityName,
      isGM: game.user.isGM,
      object: duplicate(this.object.data),
      options: this.options,
      sheetClass: this.object.getFlag("core", "sheetClass"),
      sheetClasses: classes.map(c => c.id),
      defaultClass: defcls ? defcls.id : null
    }
 */  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dice").on("click", ".control", this._onClickPlusMinus.bind(this));
  }

  async _onClickPlusMinus(event) {
    event.preventDefault();

    const a = event.currentTarget;
    const action = a.dataset.action;
    const inc = "increase" === action ? 1 : -1;
    const target = a.parentNode.dataset.key;
    const form = this.form;

    let e = form.elements["dice." + target];
    e.value = Number(e.value) + inc;
  }

  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  async _updateObject(event, formData) {
    event.preventDefault();

    const roll = {};
    for ( let key of Object.keys(formData) ) {
      if ( key.startsWith("dice.") ) {
        const die = key.substr(5);
        // TODO: Workaround für negative Zähler
        const count = Math.abs(formData[key]);
        roll[die] = count;
      }
    }
    HexxenRollHelper.rollToChat(this.object, roll, formData.comment);

/*     const original = this.getData();

    // De-register the current sheet class
    const sheet = this.object.sheet;
    await sheet.close();
    this.object._sheet = null;
    delete this.object.apps[sheet.appId];

    // Update world settings
    if ( game.user.isGM && (formData.defaultClass !== original.defaultClass) ) {
      const setting = await game.settings.get("core", "sheetClasses") || {};
      mergeObject(setting, {[`${this.object.entity}.${this.object.data.type}`]: formData.defaultClass});
      await game.settings.set("core", "sheetClasses", setting);
    }

    // Update the Entity-specific override
    if ( formData.sheetClass !== original.sheetClass ) {
      await this.object.setFlag("core", "sheetClass", formData.sheetClass);
    }

    // Re-draw the updated sheet
    this.object.sheet.render(true);
 */  }

  roll() {
    const data = this.getData();
    const roll = {};
    for ( let die of Object.keys(data.data.dice) ) {
      // TODO: Workaround für negative Zähler
      const count = Math.abs(data.data.dice[die].count);
      roll[die] = count;
    }
    HexxenRollHelper.rollToChat(this.object, roll, data.data.label);
  }

  /* -------------------------------------------- */
  /*  Configuration Methods
  /* -------------------------------------------- */

  /**
   * Initialize the configured Sheet preferences for Entities which support dynamic Sheet assignment
   * Create the configuration structure for supported entities
   * Process any pending sheet registrations
   * Update the default values from settings data
   */
  static initializeSheets() {

/*     // Create placeholder entity/type mapping
    const entities = [Actor, Item];
    for ( let ent of entities ) {
      const types = this._getEntityTypes(ent);
      CONFIG[ent.name].sheetClasses = types.reduce((obj, type) => {
        obj[type] = {};
        return obj;
      }, {});
    }

    // Register any pending sheets
    this._pending.forEach(p => {
      if ( p.action === "register" ) this._registerSheet(p);
      else if ( p.action === "unregister" ) this._unregisterSheet(p);
    });
    this._pending = [];

    // Update default sheet preferences
    const defaults = game.settings.get("core", "sheetClasses");
    this._updateDefaultSheets(defaults)
 */  }

  /* -------------------------------------------- */

  /**
   * Register a sheet class as a candidate which can be used to display entities of a given type
   * @param {Entity} entityClass      The Entity for which to register a new Sheet option
   * @param {String} scope            Provide a unique namespace scope for this sheet
   * @param {Application} sheetClass  A defined Application class used to render the sheet
   * @param {Object} options          Additional options used for sheet registration
   */
  static registerSheet(entityClass, scope, sheetClass, {types=[], makeDefault=false}={}) {
/*     const id = `${scope}.${sheetClass.name}`;
    const config = {entityClass, id, sheetClass, types, makeDefault};

    // If the game is ready, register the sheet with the configuration object, otherwise add to pending
    if ( (game instanceof Game) && game.ready ) this._registerSheet(config);
    else {
      config["action"] = "register";
      this._pending.push(config);
    }
  */ }

  static _registerSheet({entityClass, id, sheetClass, types, makeDefault}={}) {
/*     types = this._getEntityTypes(entityClass, types);
    let classes = CONFIG[entityClass.name].sheetClasses;
    for ( let t of types ) {
      classes[t][id] = {
        id: id,
        cls: sheetClass,
        default: makeDefault
      };
    }
 */  }

  /* -------------------------------------------- */

  /**
   * Unregister a sheet class, removing it from the list of available Applications to use for an Entity type
   * @param {Entity} entityClass      The Entity for which to register a new Sheet option
   * @param {String} scope            Provide a unique namespace scope for this sheet
   * @param {Application} sheetClass  A defined Application class used to render the sheet
   * @param {Array} types             An Array of types for which this sheet should be removed
   */
  static unregisterSheet(entityClass, scope, sheetClass, {types=[]}={}) {
/*     const id = `${scope}.${sheetClass.name}`;
    const config = {entityClass, id, types};

    // If the game is ready remove the sheet directly, otherwise remove from pending
    if ( (game instanceof Game) && game.ready ) this._unregisterSheet(config);
    else {
      config["action"] = "unregister";
      this._pending.push(config);
    }
 */  }

  static _unregisterSheet({entityClass, id, types}={}) {
/*     types = this._getEntityTypes(entityClass, types);
    let classes = CONFIG[entityClass.name].sheetClasses;
    for ( let t of types ) {
      delete classes[t][id];
    }
 */  }

  /* -------------------------------------------- */

  static _getEntityTypes(entityClass, types=[]) {
/*     if ( types.length ) return types;
    const systemTypes = game.system.entityTypes[entityClass.name];
    return systemTypes.length ? systemTypes : [CONST.BASE_ENTITY_TYPE];
 */  }

  /* -------------------------------------------- */

  /**
   * Update the currently default Sheets using a new core world setting
   * @param {Object} setting
   * @private
   */
  static _updateDefaultSheets(setting) {
/*     if ( !Object.keys(setting).length ) return;
    const entities = [Actor, Item];
    for ( let ent of entities ) {
      let classes = CONFIG[ent.name].sheetClasses;
      let defaults = setting[ent.name];
      if ( !defaults ) continue;

      // Update default preference for registered sheets
      for ( let [type, sheetId] of Object.entries(defaults) ) {
        const sheets = Object.values(classes[type]);
        let requested = sheets.find(s => s.id === sheetId);
        if ( requested ) sheets.forEach(s => s.default = s.id === sheetId);
      }

      // Close and de-register any existing sheets
      ent.collection.entities.forEach(e => {
        Object.values(e.apps).forEach(e => e.close());
        e.apps = {};
      });
    }
 */  }
}

