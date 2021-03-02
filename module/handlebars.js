/**
 * Implementation of the german RPG HeXXen 1733 (c) under the license of https://ulissesspiele.zendesk.com/hc/de/articles/360017969212-Inhaltsrichtlinien-f%C3%BCr-HeXXen-1733-Scriptorium.
 * Implementation based on the content of http://hexxen1733-regelwiki.de/
 * Author: Martin Brunninger
 * Software License: GNU GPLv3
 */

class HexxenHandlebarsHelper {

  static registerHelpers() {
    Handlebars.registerHelper('not', this._not);
    Handlebars.registerHelper('isDefined', this._isDefined);
    Handlebars.registerHelper('hasContent', this._hasContent);
    Handlebars.registerHelper('isNSC', this._isNSC);
    Handlebars.registerHelper('repeat', this._repeat);

    Handlebars.registerHelper("dyn-input", this._dynInput); // TODO: Helper vs. Partial (jaeger-sheet.html)
    Handlebars.registerHelper("inc-btn", this._incButton);
  }

  static _not(value) {
    // Caution: in case of (isDefined foo.bar): if foo === null --> value === null
    return !value;
  }

  /**
   * Usage: {{#if (isDefined foo.bar)}} {{/if}}
   * @param {*} value
   */
  static _isDefined(value) {
    // Caution: in case of (isDefined foo.bar): if foo === null --> value === null
    return value !== undefined && value !== null;
  }

  static _hasContent(value) {
    // Caution: in case of (isDefined foo.bar): if foo === null --> value === null
    return value !== undefined && value !== null;
  }

  static _isNSC(value) {
    return ['npc-power'].includes(value);
  }

  /**
   * Usage: {{#repeat 5}}foo.bar{{/repeat}}
   * @param {number} context
   * @param {Object} options
   */
  static _repeat(context, options) {
    let out = "";
    for (let i=0; i<context; i++) {
      out += options.fn(this);
    }
    return out;
  }

  /** TODO: doc */
  static _dynInput(options) {
    // TODO: besser actor.gameMode, aber dazu muss zuerst das Actor/Token-Objekt ermittelt werden
    // (actor ist nur das äußere Datenelement von Actor)
    const flags = options.data.root.actor.flags[Hexxen.scope] || {};
    // TODO: editMode umstellen
    const editMode = flags.editMode || false;
    let name = [ options.hash.path, options.hash.key ];
    if ( options.hash.target ) name.push( options.hash.target);
    name = name.join(".");

    // FIXME: Überarbeiten: u.a. id="foo" für <label for="foo"> bereitstellen
    // FIXME: Template erstellen statt SafeString
    if (editMode) {
      return new Handlebars.SafeString(`<input class="${options.hash.class}" type="text" name="${name}" value="${options.hash.value}" data-dtype="Number"/>`);
    } else { // game mode
      return new Handlebars.SafeString(`<div class="${options.hash.class}">${options.hash.value}</div>`);
    }
  }

  /** TODO: doc */
  static _incButton(options) {
    // FIXME: Template erstellen statt SafeString
    options.hash.class = options.hash.class || "";
    return new Handlebars.SafeString(`
      <div class="${options.hash.class} inc-btn">
          ${options.fn(this)}
          <div class="controls">
              <a class="control left" data-action="decrease"><i class="fas fa-minus"></i></a>
              <a class="control right" data-action="increase"><i class="fas fa-plus"></i></a>
          </div>
      </div>`);
  }
}