export class InputSystem implements IGameSystem {
  public name = 'InputSystem'
  private game!: IGame
  private dirty = false

  public onLoad(game: IGame) {
    console.log('InputSystem.onLoad')
    this.game = game
  }

  public onUnload() {
    console.log('InputSystem.onUnload')
  }

  public start() {
    console.log('InputSystem.start')
    window.addEventListener('keydown', this.handleKeyboardDownEvent.bind(this))
    window.addEventListener('keyup', this.handleKeyboardUpEvent.bind(this))
  }

  public stop() {
    console.log('InputSystem.stop')
  }

  // public update() {
  //   console.log('InputSystem.update')
  // }

  public draw() {
    if (!this.dirty) return
    console.log('InputSystem.draw')
  }

  private handleKeyboardDownEvent(e: KeyboardEvent) {
    console.log('key down', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    this.game.eventbus.emit('keyDown', e)
  }

  private handleKeyboardUpEvent(e: KeyboardEvent) {
    this.game.eventbus.emit('keyUp', e)
  }
}
