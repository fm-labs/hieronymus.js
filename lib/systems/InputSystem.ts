import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class InputSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'InputSystem'

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('InputSystem.onLoad')
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
    // console.log('InputSystem.draw')
  }

  private handleKeyboardDownEvent(e: KeyboardEvent) {
    console.log('key down', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)
    this._game.eventbus.emit('keyboard.keyDown', e)
  }

  private handleKeyboardUpEvent(e: KeyboardEvent) {
    this._game.eventbus.emit('keyboard.keyUp', e)
  }
}
