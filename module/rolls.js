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

  static get DICESET_SETTING_KEY() { return 'diceSet' }
  static get DICESIZE_SETTING_KEY() { return 'diceSize' }

  static registerSettings() {
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

  static _rerenderChat(data) {
    game.messages.forEach(m => { if (m.isRoll) ui.chat.updateMessage(m); } );
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
      const rgx = new RegExp(`^([0-9]+)${imputeNumber ? "?" : ""}[dD]([hH][A-z]|[A-z]|[0-9]+)${DiceTerm.MODIFIERS_REGEX}${DiceTerm.FLAVOR_TEXT_REGEX}`);
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

  static splitString(result) {
    if ('string' !== typeof(result)) return result; // FIXME: was machen
    if (result.length === 0) return 0;

    const regex = RegExp(`\\d+[+\\-\\*bef]?`, 'g'); // FIXME: Operatoren schon in terms bereinigen??
    let parts = result.match(regex)||[];
    parts = parts.reduce((r,p) => { let cnt=parseInt(p)||1; p=p.length>1?p.charAt(p.length-1):p; r[p]||=0; r[p]+=cnt; return r; }, {});
    return parts;
  }

  static cleanString(result, isRoll=false) {
    if ('string' !== typeof(result)) return result;
    if (result.length === 0) return 0;

    const order = '+-*bef';
    const regex = RegExp(`\\d${isRoll?'+':'*'}[+\\-\\*bef]`, 'g'); // FIXME: Operatoren schon in terms bereinigen??
    let parts = result.match(regex)||[];
    parts = parts.reduce((r,p) => { let cnt=parseInt(p)||1; p=p.length>1?p.charAt(p.length-1):p; r[p]||=0; r[p]+=cnt; return r; }, {});
    const keys = Object.keys(parts).sort((a,b) => order.indexOf(a) - order.indexOf(b));
    /*if (!isRoll) */return keys.reduce((r,k) => { return `${r} ${parts[k]}${k}` }, ''); // 16px;-2px
    // return keys.reduce((r,k) => { return `${r}&nbsp;&nbsp;<img src="${HexxenRollSettings.diceImgPath}/herfolg.png" style="width:20px; vertical-align:-3px;"/>&nbsp;${parts[k]}&nbsp;` }, '');
    // FIXME: 0 Ergebnisse
    // FIXME: negative Erfolge
  }

}

class HexxenTerm extends DiceTerm {
  static LABELS = ['?', '?', '?', '?', '?', '?'];
  static IMGS = [];

  /** @override */
  roll({minimize=false, maximize=false}={}) {
    const roll = super.roll(...arguments);
    // set count, so total() will add count instead of result
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
    const imgPath = this.path;
    const img = this.IMGS[result-1];
    // FIXME: empty img
    return `<img src="${imgPath}/${img}" />`;

    // FIXME: bei simple: &nbsp; ersetzen
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
    // FIXME: reguläre Würfe umleiten
    // FIXME: KEINE gemischte Würfe
    this.hexxenTotal = HexxenRollResult.cleanString(expression, true);
    return 0;
  }

  /** @override 0.7.9 */
  // Alternative:   return $(html).find('.dice-total').html(this.total).end().prop('outerHTML');
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
      formula: this._formula,
      flavor: chatOptions.flavor,
      user: chatOptions.user,
      tooltip: await this.getTooltip(),
      total: await this.renderTotal(this.total)
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  async getTooltip() {
    const parts = [];
    for (const d of this.dice) {
      const cls = d.constructor;
      parts.push({
        formula: d.expression,
        total: await this.renderTotal(d.total),
        faces: d.faces,
        flavor: d.flavor,
        rolls: d.results.map(r => {
          return {
            result: cls.getResultLabel(r.result),
            classes: [
              cls.name.toLowerCase(),
              r.rerolled ? "rerolled" : null,
              r.discarded ? "discarded" : null
            ].filter(c => c).join(" ")
          }
        })
      });
    }
    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { parts });
  }

  renderTotal(total) {
    const SYMBOLS = CONFIG.Hexxen.DICE_SYMBOLS;
    const split = HexxenRollResult.splitString(total);
    const parts = Object.keys(split).reduce((r, k) => {
      r.push({symbol: k, count: split[k]});
      return r;
    }, []);
    parts.forEach(p => {
      const imgPath = SYMBOLS[p.symbol].path;
      const label = SYMBOLS[p.symbol].label;
      if (imgPath) { p.img = imgPath; }
      if (label) { p.label = label; }
    });
    return renderTemplate(this.constructor.ROLL_TOTAL_TEMPLATE, {parts: parts});
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
}

class GamemasterDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hg';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['gmblank.png', 'gmblank.png', 'gmblank.png', 'gmerfolg.png', 'gmerfolg.png', 'gmerfolg.png'];
}

class JanusBonusDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hj';
  /** @override */
  static LABELS = ['', '', '', '+', '+', '+'];
  /** @override */
  static IMGS = ['jbblank.png', 'jbblank.png', 'jbblank.png', 'jbdoppelkopf.png', 'jbdoppelkopf.png', 'jbdoppelkopf.png'];
}

class JanusMalusDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hm';
  /** @override */
  static LABELS = ['', '', '', '-', '-', '-'];
  /** @override */
  static IMGS = ['jmblank.png', 'jmblank.png', 'jmblank.png', 'jmdoppelkopf.png', 'jmdoppelkopf.png', 'jmdoppelkopf.png'];
}

class SegnungsDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hs';
  /** @override */
  static LABELS = ['*', '*', '', '+', '+', '++'];
  /** @override */
  static IMGS = ['sesprit.png', 'sesprit.png', 'sblank.png', 'serfolg.png', 'serfolg.png', 'sdoppelerfolg.png'];
}

class BlutDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hb';
  /** @override */
  static LABELS = ['', 'b', 'b', 'bb', 'bb', 'bbb'];
  /** @override */
  static IMGS = ['bblank.png', 'beins.png', 'beins.png', 'bzwei.png', 'bzwei.png', 'bdrei.png'];
}

class ElixierDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'he';
  /** @override */
  static LABELS = ['1e', '2e', '3e', '4e', '5e', '3e'];
  /** @override */
  static IMGS = ['eeins.png', 'ezwei.png', 'edrei.png', 'evier.png', 'efuenf.png', 'edrei.png'];
}

class FluchDie extends HexxenDiceTerm {
  /** @override */
  static DENOMINATION = 'hf';
  /** @override */
  static LABELS = ['1f', '2f', '3f', '4f', '5f', '3f'];
  /** @override */
  static IMGS = ['feins.png', 'fzwei.png', 'fdrei.png', 'fvier.png', 'ffuenf.png', 'fdrei.png'];
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
