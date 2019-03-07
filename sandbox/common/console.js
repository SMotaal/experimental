//@ts-check
/// <references path="./types.d.ts" />

/**
 * @implements {Console}
 */
export class Console {

  /** @param {Console.Options<{container: T, location: U}>} options */
  constructor(realm) {
    ({container: this.container, location: this.location} = {... options});
  }

}
