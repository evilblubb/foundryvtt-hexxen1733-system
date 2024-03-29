﻿/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

class HexxenEntityHelper {

  static addCustomFlag(data) {
    if ("array" !== typeof(data)) data = [data];
    data.forEach(d => {
      d.flags = {};
      d.flags[Hexxen.scope] = { custom: true };
    });
    return data;
  }
}
class HexxenDOMHelper {

  static deriveActorFromEvent(event) {
    const app = this.deriveAppFromEvent(event);
    // TODO: ownedItems??
    const actor = app?.actor || undefined;
    return actor;
  }

  static deriveAppFromEvent(event) {
    const appEl = event.target.closest(".app");
    const appId = appEl ? appEl.dataset.appid : undefined;
    const app = appId ? ui.windows[appId] : undefined;
    return app;
  }

  static calcSheetBodyHeight(html) {
    const sheetBody = html.find(".sheet-body");
    if (!sheetBody.length) return;
    const windowHeader = html.find(".window-header").outerHeight(true);
    const sheetHeader = html.find(".sheet-header").outerHeight(true);
    const sheetTabs = html.find(".sheet-tabs").outerHeight(true);
    const bodyHeight = html.innerHeight() - windowHeader - sheetHeader - sheetTabs;
    sheetBody.outerHeight(bodyHeight, true);
  }
}

class HexxenIncDecHelper {

  /**
   * Static callback helper function to work with {{inc-btn}} and similar templates.
   * Shows/hides the +/- buttons on mouseenter/mouseleave.
   *
   * The buttons are expected to be contained in an element with class ".controls",
   * which has to be a child of the element the callback is registered on.
   * The buttons are expected to be hidden by default.
   *
   * Example:
   *
   * html.find(".inc-btn").hover(HexxenIncDecHelper.onHoverPlusMinus.bind(this));
   *
   * <div class="inc-btn">
   *   <input ... >
   *   <div class="controls">
   *     <a class="control ..." data-action="increase">...</a>
   *     <a class="control ..." data-action="decrease">...</a>
   *   </div>
   * </div>
   *
   * @param {MouseEvent} event    The mouseenter/mouseleave event
   */
  static onHoverPlusMinus(event) {
    event.preventDefault();
    const target = $(event.currentTarget).find(".controls");
    if ( event.type === "mouseenter" ) {
      target.show();
    } else {
      target.hide();
    }
  }

  /**
   * Static callback helper function for onClick events to increment/decrement a value
   * or set it to default.
   * The callback function expects the originating element to contain the attribute "data-action"
   * with a value of either "increase", "decrease" or "default". The originating element or one of
   * it's parents must also contain the attribute "data-key", which must identify the element to be
   * modified.
   * The target element must have a 'name' attribute corresponding to the 'data-key' value. It must
   * also have a 'data-dtype' attribute with value "Number". When using with the "default" action,
   * the target element must also have a 'data-default' attribute.
   *
   * The originating element does not necessarily have to be an <a> element. It is recommended for
   * the "data-key" attribute to not be too far up the tree to avoid side-effects.
   *
   * Example:
   *
   * html.find(".inc-btn").on("click", ".control", HexxenIncDecHelper.onClickPlusMinus.bind(this));
   *
   * <div class="..." data-key="data.resources.coups">
   *   <input class="..." name="data.resources.coups" ... data-default="5" data-dtype="Number" />
   *   <a class="..." data-action="increase">...</a>
   *   <a class="..." data-action="decrease">...</a>
   * </div>
   *
   * @param {MouseEvent} event    The originating left click event
   */
  static onClickPlusMinus(event) {
    if (! (this instanceof FormApplication)) {
      console.log(this);
    }

    event.preventDefault();
    const el = event.currentTarget;

    // validate "data-action"
    const actions = ["increase", "decrease", "default"];
    const action = el.dataset.action;
    if (!action || !actions.includes(action)) {
      console.warn("Error in template: The invoking element must have the attribute 'data-action' with one of the following values: [%s]",
        actions.join(", "), $(el).parents(), event);
      return;
    }

    // validate "data-key"
    const parentEl = el.closest("[data-key]");
    const key = parentEl ? parentEl.dataset.key : undefined;
    const targetEl = key ? HexxenIncDecHelper._findTarget(parentEl, key) : undefined;
    if (!parentEl || !targetEl || "Number" !== targetEl.dataset.dtype) {
      console.warn("Error in template: A parent of the invoking element must have the attribute 'data-key' and also contain the target element with this name and 'data-dtype'=='Number'.",
        $(el).parents(), event);
      return;
    }

    // get current value
    // TODO: Ermittlung des Werts ist abhängig vom Typ des Elements
    const value = Number.parseInt(targetEl.value); // getProperty(this.actor.data, key); // returns undefined if key does not exist
    if (isNaN(value)) {
      console.warn("Error in template: Bad value.", targetEl, $(el).parents(), event);
      return;
    }

    // modify target element
    if ("default" === action) {
      const defval = targetEl.dataset.default ? Number.parseInt(targetEl.dataset.default) : undefined;
      if (isNaN(defval)) {
        console.warn("Error in template: Bad default value.", targetEl, $(el).parents(), event)
      }
      // TODO: Änderung des Werts ist abhängig vom Typ des Elements
      targetEl.value = defval;
    } else {
      // no min/max handling here, this will be done in actor
      const inc = "increase" === action ? 1 : -1;
      // TODO: Änderung des Werts ist abhängig vom Typ des Elements
      targetEl.value = value + inc;
    }

    // maybe invoke submit
    if (this.options.submitOnChange) {
      return this._onSubmit(event);
    }
  }

  /**
   * Helper function for use in onClickPlusMinus callback.
   * TODO: Beschreibung vervollständigen, falls Funktion erhalten bleibt.
   *
   * @param {HTMLElement} parentEl
   * @param {String} key
   */
  static _findTarget(parentEl, key) {
    // TODO: evtl. integrieren, abhängig von den value spezifischen Anpassungen, die oben noch gemacht werden müssen.
    // TODO: div[data-edit] berücksichtigen
    return $(parentEl).find(`input[name="${key}"]`)[0];
  }
}

class HexxenCompendiumHelper {

  static preloadIndexes() {
    const packs = game.packs.entries.filter(el => el.index.length === 0);
    packs.forEach(pack => pack.getIndex());
  }

  /**
   * Wrapper for use as a listener.
   *
   * @param {Event} event
   */
  static onClickOpenCompendium(event) {
    HexxenCompendiumHelper.openCompendium(event.currentTarget.dataset.type);
  }

  /**
   * Helper callback function. Opens compendia of a certain Item subtype.
   * To match, a compendium has to be of entity-type "Item" and it's name must contain "-<type>".
   *
   * @param {String} type       Subtype of the items.
   */
  static openCompendium(type) {
    const packs = game.packs.entries.filter(el => el.metadata.name.indexOf(`-${type}`) != -1);
    // TODO: besser mit mehreren passenden Compendien umgehen
    if (packs.length) {
      packs.forEach(pack => {
        pack.render(true);
      });
    }
    else {
      ui.notifications.info(`Kein passendes Compendium gefunden.`);
    }
  }

  /**
   * Wrapper for use as a listener.
   *
   * @param {Event} event
   */
  static onClickOpenPower(event) {
    HexxenCompendiumHelper.openEntity("power", event.currentTarget.dataset.lookup);
  }

  // TODO: zur Zeit ungenutzt. (via foundry listener)
  // TODO: doc
  static async openEntity(type, name) {
    console.log(arguments);
    //foundry.js:14288
    const pack = game.packs.get("hexxen-1733.hexxen-power");
    if ( !pack.index.length ) await pack.getIndex();
    const entry = pack.index.find(i => (i.name === name));
    const entity = entry ? await pack.getEntity(entry._id) : null;
    return entity ? entity.sheet.render(true) : false;
  }
}

class HexxenAppAlignmentHelper {

  static get ALIGNMENT_SETTING_KEY() { return "appAlignment" }

  static registerSettings() {
    game.settings.register(Hexxen.scope, HexxenAppAlignmentHelper.ALIGNMENT_SETTING_KEY, {
      name: "Dialog Alignment",
      hint: "Arranges Item dialogs to improve their visibility (not putting them into the exact same position).",
      scope: "client",
      config: true,
      default: "onCreate",
      type: String,
      choices: { never: "Never", onCreate: "On Create", always: "Always" }
    });
  }

  static get choice() {
    return game.settings.get(Hexxen.scope, HexxenAppAlignmentHelper.ALIGNMENT_SETTING_KEY);
  }

  static get enabled() {
    const choice = HexxenAppAlignmentHelper.choice;
    return "never" !== choice;
  }

  static install() {
    HexxenAppAlignmentHelper._fvttFn = TextEditor._onClickEntityLink;
    TextEditor._onClickEntityLink = HexxenAppAlignmentHelper._onClickEntityLink;
  }

  static async _onClickEntityLink(event) {
    // IMPORTANT: this function is called in the context of an Application instance,
    // therefore "this" will point to that instance!
    const ret = await HexxenAppAlignmentHelper._fvttFn.bind(this)(event);
    if (ret) HexxenAppAlignmentHelper.align(ret, event);
    return ret;
  }

  static align(app, event) {
    if (HexxenAppAlignmentHelper.enabled && app instanceof ItemSheet) {
      if ("onCreate" === HexxenAppAlignmentHelper.choice && app._element !== null) return;
      const caller = HexxenDOMHelper.deriveAppFromEvent(event);
      if (caller) {
        const callerOffset = caller.element.offset();
        let indentLeft = 0, indentTop = 0;
        if (caller instanceof ActorSheet) {
          indentLeft = -300;
          indentTop = 100;
        } else if (caller instanceof ItemSheet) {
          indentLeft = callerOffset.left > 50 ? 50 : 0;
        } else {
          return;
        }
        const left = callerOffset.left + indentLeft;
        app.position.left = Math.max(0, left);
        app.position.top = caller.element.find(".window-content").offset().top + indentTop - 2; // compensate for top margin
      }
    }
  }
}

class HexxenSpecialCommandHelper {

  static inject() {
    const oldCreateInlineRolls = TextEditor._createInlineRoll;
    TextEditor._createInlineRoll = ((match, command, formula, closing, ...args) => {
      // TODO: auf Templates umstellen
      // TODO: Rechte?
      // TODO: durch custom chat commands ersetzbar??
      if ("/hex " === command) {
        // split formula
        const parts = HexxenRollHelper.splitHints(formula);
        const modifier = Number(parts.modifier) || '';
        const sign = modifier ? (modifier < 0 ? ' - ' : ' + ') : '';
        const s = document.createElement('span');
        s.innerHTML = `${parts.flavour ? parts.flavour + ': ' : ''}`;
        const a = document.createElement('a');
        a.classList.add('hexxen', 'hex-roll');
        a.title = 'Würfeln';
        a.dataset.message = formula;
        a.innerHTML = `<i class="fas fa-dice"></i> ${parts.nameOrFormula}${sign}${modifier ? Math.abs(modifier) : ''}`;
        s.appendChild(a);
        return s;
      }
      else if ("/hp " === command) {
        // split formula
        const parts = HexxenRollHelper.splitHints(formula);
        const modifier = Number(parts.modifier) || '';
        const sign = modifier ? (modifier < 0 ? ' - ' : ' + ') : '';
        const a = document.createElement('a');
        a.classList.add('hexxen', 'hex-prompt');
        a.title = 'Im Chat anzeigen';
        a.dataset.message = formula;
        a.innerHTML = `<i class="fas fa-comments"></i> ${parts.flavour ? parts.flavour + ': ' : ''}<i class="fas fa-dice"></i> ${parts.nameOrFormula}${sign}${modifier ? Math.abs(modifier) : ''}`;
        return a;
      }
      else if ("/hc " === command) {
        const a = document.createElement('a');
        a.classList.add('hexxen', 'hex-chat');
        a.title = 'Im Chat anzeigen';
        a.dataset.message = formula;
        a.innerHTML = `<i class="fas fa-comments"></i> ${formula}`;
        return a;
      }
      else {
        return oldCreateInlineRolls(match, command, formula, closing, ...args);
      }
    });

    $("body").on("click", "a.hex-roll", (event) => {
      const actor = HexxenDOMHelper.deriveActorFromEvent(event);
      const message = event.currentTarget.dataset.message;
      HexxenRollHelper.roll(actor, message, {event: event});
    });

    $("body").on("click", "a.hex-prompt", (event) => {
      const actor = HexxenDOMHelper.deriveActorFromEvent(event);
      const speaker = ChatMessage.getSpeaker({actor: actor, token: actor ? actor.token : undefined});
      const message = event.currentTarget.dataset.message;
      // TODO: message modifizierbar machen? shift-/ctrl-Click
      // TODO: Überprüfungen und Rechte?

      // TODO: Prüfung notwendig, oder reicht speaker=undefined??
      if (speaker) {
        ChatMessage.create({ speaker: speaker, content: `[[/hex ${message}]]` });
      } else {
        ChatMessage.create({ content: `[[/hex ${message}]]` });
      }
    });

    $("body").on("click", "a.hex-chat", (event) => {
      const actor = HexxenDOMHelper.deriveActorFromEvent(event);
      const speaker = ChatMessage.getSpeaker({actor: actor, token: actor ? actor.token : undefined});
      const message = event.currentTarget.dataset.message;
      // TODO: Überprüfungen und Rechte?

      if (speaker) {
        ChatMessage.create({ speaker: speaker, content: message });
      } else {
        ChatMessage.create({ content: message });
      }
    });
  }
}
