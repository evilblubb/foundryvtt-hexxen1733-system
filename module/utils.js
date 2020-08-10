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
      Hexxen.warn("Error in template: The invoking element must have the attribute 'data-action' with one of the following values: [%s]",
        actions.join(", "), $(el).parents(), event);
      return;
    }

    // validate "data-key"
    const parentEl = el.closest("[data-key]");
    const key = parentEl ? parentEl.dataset.key : undefined;
    const targetEl = key ? HexxenIncDecHelper._findTarget(parentEl, key) : undefined;
    if (!parentEl || !targetEl || "Number" !== targetEl.dataset.dtype) {
      Hexxen.warn("Error in template: A parent of the invoking element must have the attribute 'data-key' and also contain the target element with this name and 'data-dtype'=='Number'.",
        $(el).parents(), event);
      return;
    }

    // get current value
    // TODO: Ermittlung des Werts ist abhängig vom Typ des Elements
    const value = Number.parseInt(targetEl.value); // getProperty(this.actor.data, key); // returns undefined if key does not exist
    if (isNaN(value)) {
      Hexxen.warn("Error in template: Bad value.", targetEl, $(el).parents(), event);
      return;
    }

    // modify target element
    if ("default" === action) {
      const defval = targetEl.dataset.default ? Number.parseInt(targetEl.dataset.default) : undefined;
      if (isNaN(defval)) {
        Hexxen.warn("Error in template: Bad default value.", targetEl, $(el).parents(), event)
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
