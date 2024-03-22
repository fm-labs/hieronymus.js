export abstract class AbstractGameSystem {
  protected readonly _game: IGame

  protected constructor(_game: IGame) {
    this._game = _game
  }
}
