

class HexxenItem extends Item {

  constructor(...args) {
    super(...args);
  }

  get name() {
    // take name from data section in preference to entity name
    return this.data.data.name || super.name;
  }

}
