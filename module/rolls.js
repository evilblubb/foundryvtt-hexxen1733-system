/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

/**
 * Hilfsklasse für Würfelspezifische Einstellungen
 */
class HexxenRollSettings {

  static get USE_SDR_SETTING_KEY() { return 'useSdr' }
  static get DICESET_SETTING_KEY() { return 'diceSet' }
  static get DICESIZE_SETTING_KEY() { return 'diceSize' }

  static registerSettings() {
    const sdr = game.modules.get("special-dice-roller");
    game.settings.register(Hexxen.scope, this.USE_SDR_SETTING_KEY, {
      name: 'Special Dice Roller',
      hint: '[BETA] Nutzung von Special Dice Roller reaktivieren, falls Probleme mit internem Würfelmechanismus auftreten.',
      scope: 'world',
      config: sdr && sdr.active,
      type: Boolean,
      default: false,
      onChange: this._updateSDR
    });

    game.settings.register(Hexxen.scope, this.DICESET_SETTING_KEY, {
      name: 'Würfelset',
      hint: 'Wähle ein Würfelset für die Anzeige von Würfelergebnissen im Chat.',
      scope: 'client',
      config: true,
      type: String,
      choices: { 'rendered': 'Modern', 'pics': 'Holzwürfel' },
      default: 'rendered',
      onChange: this._rerenderChat
    });

    game.settings.register(Hexxen.scope, this.DICESIZE_SETTING_KEY, {
      name: 'Würfelgröße',
      hint: 'Wähle ein Würfelgröße für die Anzeige von Würfelergebnissen im Chat.',
      scope: 'client',
      config: true,
      type: String,
      choices: { '24': 'klein (24x24)', '32': 'mittel (32x32)', '40': 'groß (40x40)' },
      default: '32',
      onChange: this._updateChatDiceSize
    });
    // set dice size to user setting
    this._updateChatDiceSize(game.settings.get(Hexxen.scope, this.DICESIZE_SETTING_KEY));

    // FIXME: Button oder Hinweis für DSN-Settings
  }

  static _updateSDR(data) {
    HexxenRollHelper.checkSystemReqirements();
  }

  static get SDR() {
    const sdr = game.modules.get("special-dice-roller");
    return sdr && sdr.active && game.settings.get(Hexxen.scope, this.USE_SDR_SETTING_KEY);
  }

  static _rerenderChat(data) {
    game.messages.forEach(m => { if (m.isRoll) ui.chat.updateMessage(m); } );
    // FIXME: DSN aktualisieren??
    // TODO: update DSN-Presets falls weitere Dicesets?
  }

  static _updateChatDiceSize(data) {
    // TODO: alte Zeile entfernen, falls vorhanden
    $('head').find('#hexxen-styles').append(`.hexxen .roll { --hexxen-chat-dice-size: ${data}px;  }\n`);
  }

  static get diceImgPath() {
    return `${Hexxen.basepath}/img/dice/${game.settings.get(Hexxen.scope, this.DICESET_SETTING_KEY)}`;
  }

  // TODO: zusätzliche DiceSets durch Module registrierbar machen
}


class HexxenRollHelper {
  static checkSystemReqirements() {
    // FIXME: deaktivieren, sobald SDR nicht mehr gebraucht wird
    // special-dice-roller
    const foundry = game.data.version;
    const sdr = game.modules.get("special-dice-roller");
    if (!HexxenRollSettings.SDR) {
      this.delegate = HexxenFoundryRollHelper;
    } else if (sdr && sdr.active) {
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

  static processChatCommand(chatlog, message, chatData) {
    if (message.startsWith('/hex ')) {
      this.roll(chatData?.speaker?.actor, message.substr(4));
      return false;
    }
    return true;
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

  static injectTwoCharacterDiceTermPatch() {
    // Manipulate DiceTerm.matchTerm() to allow for two-character denominations starting with 'h'
    // Wichtig: Muss bereits in init erfolgen! Sonst können Probleme beim Rekonstruieren der ChatMeldungen auftreten!

    // FIXME: auf Änderungen in Foundry prüfen (Stand 0.7.9)
    // static matchTerm(expression, {imputeNumber=true}={}) {
    //   const rgx = new RegExp(`^([0-9]+)${imputeNumber ? "?" : ""}[dD]([A-z]|[0-9]+)${DiceTerm.MODIFIERS_REGEX}${DiceTerm.FLAVOR_TEXT_REGEX}`);
    //   const match = expression.match(rgx);
    //   return match || null;
    // }

    /* @override 0.7.9 */
    DiceTerm.matchTerm = (expression, {imputeNumber=true}={}) => {
      const rgx = new RegExp(`^([0-9]+)${imputeNumber ? "?" : ""}[dD]([hHrR][A-z]|[A-z]|[0-9]+)${DiceTerm.MODIFIERS_REGEX}${DiceTerm.FLAVOR_TEXT_REGEX}`);
      const match = expression.match(rgx);
      return match || null;
    };
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

class HexxenFoundryRollHelper extends HexxenRollHelper {

  static __testFormula(formula) {
    // FIXME: noch zu implementieren
    return true;
  }

  static _rollToChat(actor, roll={}, flavour=null, options={}) {
    let empty = true;
    let command = ''; // "/hex ";
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

    const speaker = ChatMessage.getSpeaker({actor: actor, token: actor ? actor.token : undefined});

    // FIXME: 2ter Parameter sollte actor sein!
    HexxenRoll.create(command, { content: command } ).toMessage( { speaker: speaker, flavor: flavour }, { rollMode: game.settings.get('core', 'rollMode') } );

    return {}; // TODO: result und chatId zurückgeben
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

class HexxenRollResult {

  constructor(result) {
    Object.assign(this, this.constructor._splitAndMergeResultString(result));
  }

  static fromResult(result) {
    return new this(result);
  }

  static HEXXEN_RESULTS_REGEX = RegExp(`\\[\\d*[+\\-\\*bef]\\]`, 'g');
  static HEXXEN_RESULTS_SORT_ORDER = '+-*bef';

  static _splitAndMergeResultString(result) {
    if (result instanceof this) return result;
    if ('string' !== typeof(result)) throw 'Falscher Datentyp'; // TODO: i18n

    const regex = this.HEXXEN_RESULTS_REGEX;
    let parts = result.match(regex)||[];
    parts = parts.reduce((r,p) => {
      p = p.substr(1, p.length-2);
      let cnt = parseInt(p) || 1;
      let sym = p.length > 1 ? p.charAt(p.length-1) : p;
      r[sym] ||= 0;
      r[sym] += cnt;
      return r;
    }, {});
    return parts;
  }

  static sort(keys) {
    const order = this.HEXXEN_RESULTS_SORT_ORDER;
    keys = keys.sort((a,b) => order.indexOf(a.charAt(0)) - order.indexOf(b.charAt(0))); // TODO: flavors berücksichtigen (z.B. 'b:1')
    return keys;
  }

  toString() {
    const keys = this.constructor.sort(Object.keys(this));
    const total = keys.map(k => `[${this[k]}${k}]`).join('');
    return total || '[]';
  }
}

class HexxenTerm extends DiceTerm {
  static LABELS = ['?', '?', '?', '?', '?', '?'];
  static IMGS = [];
  static DICE_IMG = 0;

  static _getCount(result) {
    result = this.getResultLabel(result);
    // TODO: verallgemeinern
    switch (result) {
      case '++': result = '2+'; break;
      case 'bb': result = '2b'; break;
      case 'bbb': result = '3b'; break;
    }
    return HexxenRollResult.fromResult(`[${result}]`); // TODO: activeDice bei rerolls??
  }

  /** @override */
  roll({minimize=false, maximize=false}={}) {
    const roll = super.roll(...arguments);
    // set count, so total() will add count instead of result
    roll.count = this.constructor._getCount(roll.result);
    return roll;
  }

  /** @override */
  get total() {
    let total = super.total; // sums up count --> Number, if vanilla roll; String, if hexxen roll.
    if ('string' !== typeof(total)) return total;
    // if string, there is a leading '0' which must be removed
    total = total.substring(1);
    return HexxenRollResult.fromResult(total);
  }

  /** @override */
  toJSON() {
    const json = super.toJSON();
    // remove count from results (is redundant to result)
    json.results.forEach(r => delete r.count);
    return json;
  }

  /** @override */
  static fromResults(options, results) {
    // re-evaluate count
    results.forEach(r => r.count = this._getCount(r.result));
    return super.fromResults(options, results);
  }

  /** @override */
  static getResultLabel(result) {
    return this.LABELS[result-1];
  }

  static getResultImage(result) {
    const imgPath = this.path;
    const img = this.IMGS[result-1];
    if (!img) throw 'Für Würfelseite {result} ist kein Bild definiert!'; // TODO: i18n
    return `${imgPath}/${img}`;
  }

  static findClassByTerm(term) {
    return CONFIG.Dice.terms[term?.substr(1)];
  }

  static getDiceImage() {
    const imgPath = this.path;
    const img = this.IMGS[this.DICE_IMG];
    if (!img) throw 'Für Würfel {dice} ist kein Bild definiert!'; // TODO: i18n
    return `${imgPath}/${img}`;
  }
}

class HexxenRoll extends Roll {
  constructor(formula, data={}) {
    const [_formula, cap] = HexxenRoll._convertHexxenTerms(formula);
    super(_formula, data);

    const [vanilla, hexxen, other] = this._termTypes(this.terms);

    // FIXME: flags und original Formel merken?

    // check for unsupported combinations
    if (hexxen && vanilla) throw 'Hexxenwürfel und Augenwürfel können nicht kombiniert werden!'; // TODO: i18n
    if (hexxen && other) throw 'Hexxenwürfel können nur mit "+" verkettet werden!'; // TODO: i18n

    if (hexxen) {
      this.terms = this._cleanupTerms(this.terms, cap);
      this._formula = this.constructor.cleanFormula(this.terms);
      // FIXME: in Hexxensyntax rückkonvertieren?
    }
    // TODO: unbekannte Würfel, Fehlermeldungen verbessern
  }

  static HEXXEN_DICE_SORT_ORDER = 'hgjmsbef';
  static HEXXEN_DICE = '[hg\\+\\-sbef]';
  static HEXXEN_TERM = `(?:\\d*${this.HEXXEN_DICE}(?:\\[(.*?)\\])?)`;
  static HEXXEN_MATCH_REGEX = new RegExp(`^${this.HEXXEN_TERM}+!?$`, 'i');
  static HEXXEN_SPLIT_REGEX = new RegExp(this.HEXXEN_TERM, 'gi');
  static HEXXEN_DICE_REGEX = new RegExp(this.HEXXEN_DICE, 'i');

  static _convertHexxenTerms(formula) {
    let cap = false;
    if ('string' === typeof(formula)) {
      cap = true;
      if (formula.endsWith('!')) {
        cap = false;
        formula = formula.substr(0, formula.length-1); // remove '!'
      }
      // check if it's regular syntax or hexxen syntax
      if (formula.match(this.HEXXEN_MATCH_REGEX)) {
        let parts = formula.match(this.HEXXEN_SPLIT_REGEX);
        // rewrite parts
        parts = parts.map(p => {
          // prefix with 1 if term has no number
          p = Number.isNaN(Number.parseInt(p)) ? `1${p}` : p;
          p = p.replace(this.HEXXEN_DICE_REGEX, match => {
            switch (match) {
              case '+': return 'dhj';
              case '-': return 'dhm';
              default: return `dh${match}`;
            }
          });
          return p;
        });
        // FIXME: sortieren --> _cleanupTerms?
        return [parts.join('+'), cap];
      }
    }
    return [formula, cap];
  }

  _termTypes(terms) {
    let vanilla = false, hexxen = false, other = false;
    let partial = false;
    terms.forEach(t => {
      if (partial) { // target of a nested roll
        if (typeof(t) === 'string') {
          if (t.startsWith('dh')) hexxen = true;
          else if (t.startsWith('dc')) ; // FIXME: noch zu klären hexxen = true;
          else if (t.startsWith('d')) vanilla = true;
        }
        partial = false;
      }
      else if (t instanceof HexxenTerm) hexxen = true;
      else if (t instanceof DiceTerm && t.constructor.DENOMINATION === 'c') ; // FIXME: noch zu klären
      else if (t instanceof DiceTerm) vanilla = true;
      else if (t instanceof Roll) partial = true; // nested roll e.g. (1d4)dhh // FIXME: Roll untersuchen
      else if (t instanceof DicePool) ;
      else if (t !== '+') other = true;
    });
    return [vanilla, hexxen, other];
  }

  _cleanupTerms(terms, cap) {
    let sort = true;
    // merge identical non-flavoured terms
    // and remove '+' operators
    terms = terms.reduce((ret, t) => {
      if (t === '+') return ret;
      if (t instanceof Roll) sort = false; // FIXME: das kann auch cap beeinflussen! // TODO: prüfen, ob doch irgendwie sortieren möglich ist
      if (t instanceof HexxenTerm && !t.flavor) {
        const tf = ret.find(t0 => (t0 instanceof t.constructor) && !t0.flavor);
        if (tf) {
          tf.number += t.number;
          return ret;
        }
      }
      ret.push(t);
      return ret;
    }, []);

    // sort FIXME: Problem mit DicePools
    // if (sort) {
    //   const fn = (t) => { return this.constructor.HEXXEN_DICE_SORT_ORDER.indexOf(t.constructor.DENOMINATION.charAt(1)) };
    //   terms = terms.sort((a, b) => { fn(a) - fn(b) });
    // }

    // FIXME: besser erst in step 1 (während evaluate)
    if (cap) {
      const janus = [];
      let jidx = -1;
      terms = terms.reduce((ret, t, i) => {
        if (t instanceof JanusBonusDie || t instanceof JanusMalusDie) {
          janus.push(t);
          if (jidx === -1) jidx = ret.push(null) - 1; // push placeholder and remember position
        } else {
          ret.push(t);
        }
        return ret;
      }, []);
      if (janus.length === 1) {
        terms[jidx] = janus[0]; // only one term
        terms[jidx].options.number = terms[jidx].number; // FIXME: bleibt das erhalten?
        terms[jidx].number = Math.min(CONFIG.Hexxen.BONUS_CAP, terms[jidx].number); // apply cap
      }
      else if (janus.length > 1) {
        const bonus = [];
        const malus = [];
        janus.forEach(t => {
          if (t instanceof JanusBonusDie) bonus.push(t);
          else malus.push(t);
        });
        const bonusCount = bonus.reduce((ret, t) => {
          ret += t.number;
          // FIXME: flavor
          return ret;
        }, 0);
        const malusCount = malus.reduce((ret, t) => {
          ret += t.number;
          // FIXME: flavor
          return ret;
        }, 0);
        const count = Math.min(CONFIG.Hexxen.BONUS_CAP, bonusCount) - Math.min(CONFIG.Hexxen.BONUS_CAP, malusCount);
        const dice = count < 0 ? JanusMalusDie : JanusBonusDie;
        const d = new dice({number: Math.abs(count)});
        // FIXME: flavor
        terms[jidx] = d;
      }
      // FIXME: cap/nocap
      // FIXME: Einfluss von nested Roll Objekten

    }

    // re-add '+' operators after HexxenTerms or Strings starting with 'dh' // FIXME: auch 'dr'
    terms = terms.reduce((ret, t) => {
      const prev = ret.length > 0 && ret[ret.length-1];
      if (prev && ( prev instanceof HexxenTerm || (typeof(prev) === 'string' && prev.startsWith('dh') ))) ret.push('+');
      ret.push(t);
      return ret;
    }, []);
    return terms;
  }

  /** @override */
  evaluate({minimize=false, maximize=false}={}) {
    // super.evaluate() calls _safeEval() but expects it to return a Number.
    // As a hexxen roll isn't just a single number, the total has to be bypassed
    // (via this._hexxenTotal) TODO: bessere Lösung suchen
    this._hexxenTotal = undefined;
    const ret = super.evaluate(...arguments);
    // As this.hexxenTotal isn't persistant, copy it to this._total now.
    if (this._hexxenTotal !== undefined) {
      this._total = this._hexxenTotal;
      delete this._hexxenTotal;
    }
    return ret;
  }

  /** @override */
  _safeEval(expression) {
    // _safeEval() is called from evaluate() but it expects a Number as return value.
    // As a hexxen roll isn't just a single number, the total has to be bypassed
    // (via this._hexxenTotal) TODO: bessere Lösung suchen
    // FIXME: könnte Probleme bereiten bei foundry.js:7984 _splitParentheticalTerms
    // FIXME: wäre dann aber ein geklammerter Ausdruck
    if (expression.indexOf('[') !== -1) { // FIXME: geht hier auch Typprüfung?
      this._hexxenTotal = HexxenRollResult.fromResult(expression);
      // return something that is a number, will be replaced later on.
      return 0;
    }
    else
      return super._safeEval(expression);
  }

  /** @override */
  toJSON() {
    const json = super.toJSON();
    // remove redundant values
    delete json.results;
    delete json._total;

    return json;
  }

  /** @override */
  static fromData(data) {
    const roll = super.fromData(data);
    // re-evaluate results and _total
    roll.results = roll.terms.map(t => {
      const total = t.total;
      return total ? total : t;
    });
    const total = roll._safeEval(roll.results.join(" "));
    roll._total = roll._hexxenTotal ? roll._hexxenTotal : total;
    delete roll._hexxenTotal;

    return roll;
  }

  /** @override 0.7.9 */
  async render(chatOptions = {}) {
    chatOptions = mergeObject({
      user: game.user._id,
      flavor: null,
      template: this.constructor.CHAT_TEMPLATE,
      blind: false
    }, chatOptions);
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if (!this._rolled) this.roll();

    if (isPrivate) return "";

    // Define chat data
    const chatData = {
      formula: await this.renderDice(this._formula),
      flavor: chatOptions.flavor,
      user: chatOptions.user,
      tooltip: await this.getTooltip(), // TODO: erst beim Aufklappen generieren
      total: await this.renderTotal(this.total) // FIXME: totalize unterdrücken falls "!"
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  async getTooltip() {
    const parts = [];
    for (const d of this.dice) {
      const cls = d.constructor;
      const hexxen = HexxenTerm.isPrototypeOf(cls);
      parts.push({
        formula: await this.renderDice(d.expression),
        total: hexxen ? await this.renderTotal(d.total, true) : d.total, // FIXME: totalize unterdrücken falls "!"
        faces: d.faces,
        flavor: d.flavor,
        rolls: d.results.map(r => {
          const hasSuccess = r.success !== undefined;
          const hasFailure = r.failure !== undefined;
          const isMax = !hexxen && r.result === d.faces;
          const isMin = !hexxen && r.result === 1;
          return {
            result: (hexxen ? `<img src="${cls.getResultImage(r.result)}" />` : cls.getResultLabel(r.result)), // TODO: HTML ins Template verschieben
            classes: [
              cls.name.toLowerCase(),
              "d" + (hexxen ? 'h' : d.faces),
              r.success ? "success" : null,
              r.failure ? "failure" : null,
              r.rerolled ? "rerolled" : null,
              r.exploded ? "exploded" : null,
              r.discarded ? "discarded" : null,
              !(hasSuccess || hasFailure) && isMin ? "min" : null,
              !(hasSuccess || hasFailure) && isMax ? "max" : null
            ].filter(c => c).join(" ")
          }
        })
      });
    }
    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { parts });
  }

  renderDice(formula) {
    return formula.replace(/(dh\w)/g, (match, p1, offset, string) => { // FIXME: ResourceCoins??
      const cls = HexxenTerm.findClassByTerm(p1);
      if (HexxenTerm.isPrototypeOf(cls)) return `<img src="${cls.getDiceImage()}" title="${cls.name}" />`; // FIXME: i18n label

      return `[${p1}]`;
    });
  }

  renderTotal(total, semiTotal=false, totalize=true) {
    if (! (total instanceof HexxenRollResult)) return total;

    if (totalize && total['-'] !== undefined) {
      total['+'] = (total['+'] || 0) - total['-'];
      delete total['-'];
    }
    if (!semiTotal && total['+'] === undefined) total['+'] = 0; // FIXME: welche Symbole anzeigen, obwohl 0

    const parts = HexxenRollResult.sort(Object.keys(total)).reduce((r, k) => {
      r.push({symbol: k, count: total[k]});
      return r;
    }, []);

    const SYMBOLS = CONFIG.Hexxen.ROLL_RESULT_SYMBOLS;
    parts.forEach(p => {
      const imgPath = SYMBOLS[p.symbol].path;
      const label = SYMBOLS[p.symbol].label;
      if (imgPath) { p.img = imgPath; }
      if (label) { p.label = label; }
    });
    return renderTemplate(this.constructor.ROLL_TOTAL_TEMPLATE, {parts: parts, semiTotal: semiTotal});
  }
}


class HexxenDiceTerm extends HexxenTerm {
  constructor(termData) {
    termData.faces=6;
    super(termData);
  }

  static get path() {
    return HexxenRollSettings.diceImgPath; // FIXME: in CONFIG ablegen?
  }
}

class HexxenResourceTerm extends HexxenTerm {
  constructor(termData) {
    termData.faces=2;
    super(termData);
  }

  static get path() {
    return '/systems/hexxen-1733/img/resources'; // FIXME: in CONFIG ablegen?
  }
}

class HexxenDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hh';
  /** @override */
  static LABELS = ['*', '', '', '', '+', '+'];
  /** @override */
  static IMGS = ['hesprit.png', 'hblank.png', 'hblank.png', 'hblank.png', 'herfolg.png', 'herfolg.png'];
  static DICE_IMG = 5;
}

class GamemasterDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hg';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['gmblank.png', 'gmblank.png', 'gmblank.png', 'gmerfolg.png', 'gmerfolg.png', 'gmerfolg.png'];
  static DICE_IMG = 5;
}

class JanusBonusDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hj';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['jbblank.png', 'jbblank.png', 'jbblank.png', 'jbdoppelkopf.png', 'jbdoppelkopf.png', 'jbdoppelkopf.png'];
  static DICE_IMG = 5;
}

class JanusMalusDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hm';
  /** @override */
  static LABELS = ['', '', '', '-', '-', '-'];
  /** @override */
  static IMGS = ['jmblank.png', 'jmblank.png', 'jmblank.png', 'jmdoppelkopf.png', 'jmdoppelkopf.png', 'jmdoppelkopf.png'];
  static DICE_IMG = 5;
}

class SegnungsDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hs';
  /** @override */
  static LABELS = ['*', '*', '', '+', '+', '++'];
  /** @override */
  static IMGS = ['sesprit.png', 'sesprit.png', 'sblank.png', 'serfolg.png', 'serfolg.png', 'sdoppelerfolg.png'];
  static DICE_IMG = 5;
}

class BlutDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hb';
  /** @override */
  static LABELS = ['', 'b', 'b', 'bb', 'bb', 'bbb'];
  /** @override */
  static IMGS = ['bblank.png', 'beins.png', 'beins.png', 'bzwei.png', 'bzwei.png', 'bdrei.png'];
  static DICE_IMG = 2;
}

class ElixierDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'he';
  /** @override */
  static LABELS = ['1e', '2e', '3e', '4e', '5e', '3e'];
  /** @override */
  static IMGS = ['eeins.png', 'ezwei.png', 'edrei.png', 'evier.png', 'efuenf.png', 'edrei.png'];
  static DICE_IMG = 0;
}

class FluchDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hf';
  /** @override */
  static LABELS = ['1f', '2f', '3f', '4f', '5f', '3f'];
  /** @override */
  static IMGS = ['feins.png', 'fzwei.png', 'fdrei.png', 'fvier.png', 'ffuenf.png', 'fdrei.png'];
  static DICE_IMG = 0;
}

class ImminenceCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'rx';
  /** @override */
  static LABELS = ['X', 'X'];
  /** @override */
  static IMGS = ['bedrohung.png', 'bedrohung.png'];
}

class CoupCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'rc';
  /** @override */
  static LABELS = ['C', 'C'];
  /** @override */
  static IMGS = ['coup.png', 'coup.png'];
}

class IdeaCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'ri';
  /** @override */
  static LABELS = ['I', 'I'];
  /** @override */
  static IMGS = ['idee.png', 'idee.png'];
}

class BlessingCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'rs';
  /** @override */
  static LABELS = ['S', 'S'];
  /** @override */
  static IMGS = ['segnung.png', 'segnung.png'];
}

class RageCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'rr';
  /** @override */
  static LABELS = ['R', 'R'];
  /** @override */
  static IMGS = ['rage.png', 'rage.png'];
}

class AmbitionCoin extends HexxenResourceTerm {
  /** @override */
  static DENOMINATION = 'ra';
  /** @override */
  static LABELS = ['A', 'A'];
  /** @override */
  static IMGS = ['ambition.png', 'ambition.png'];
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

  /** @override */
  async render(chatOptions = {}) {
    // FIXME: implementieren
    return chatOptions.isPrivate ? "" : this.results[0];
    // TODO: eigenes Template
  }
}
