import { AbstractGameSystem } from './AbstractGameSystem.ts'

export class GamepadSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'GamepadInputSystem'
  private lastInputTime = 0
  private gamepads: Gamepad[] = []

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('GamepadInputSystem.onLoad')
  }

  public onUnload() {
    console.log('GamepadInputSystem.onUnload')
  }

  public start() {
    console.log('GamepadInputSystem.start')

    this.gamepads = navigator.getGamepads() as Gamepad[]

    // Check for gamepad support
    if ('GamepadEvent' in window) {
      window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this))
      window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this))
    }
  }

  public stop() {
    console.log('GamepadInputSystem.stop')
  }

  public async tick(delta: number) {
    const now = Date.now()
    if (this.lastInputTime && now - this.lastInputTime < 50) return // throttle
    //console.log('GamepadInputSystem.update', delta)

    this.gamepads = navigator.getGamepads() as Gamepad[]
    for (const gamepad of this.gamepads) {
      if (gamepad) {
        this.updateGamepadState.bind(this)(gamepad)
      }
    }
    this.lastInputTime = now
  }

  // public draw() {
  //   console.log('GamepadInputSystem.draw')
  // }

  // Function to handle gamepad connections
  private handleGamepadConnected(event: GamepadEvent) {
    const gamepad = event.gamepad
    console.log(`[gamepad.connected] Gamepad ID: ${gamepad.id}`)
    this._game.eventbus.emit('gamepad.connected', gamepad)
  }

  // Function to handle gamepad disconnections
  private handleGamepadDisconnected(event: GamepadEvent) {
    const gamepad = event.gamepad
    console.log(`[gamepad.disconnected] Gamepad ID: ${gamepad.id}`)
    this._game.eventbus.emit('gamepad.disconnected', gamepad)
  }

  // Function to update gamepad state
  public updateGamepadState(gamepad: Gamepad) {
    const stickThreshold = 0.2 // Adjust this threshold as needed
    const buttons = gamepad.buttons

    // Check left stick for directional controls
    const stickX = gamepad.axes[0]
    const stickY = gamepad.axes[1]

    if (stickX < -stickThreshold) {
      console.log('[gamepad] Left')
    } else if (stickX > stickThreshold) {
      console.log('[gamepad] Right')
    }

    if (stickY < -stickThreshold) {
      console.log('[gamepad] Up')
    } else if (stickY > stickThreshold) {
      console.log('[gamepad] Down')
    }

    const stick = {
      stickLeft: stickX < -stickThreshold,
      stickRight: stickX > stickThreshold,
      stickUp: stickY < -stickThreshold,
      stickDown: stickY > stickThreshold,
    }

    if (stick.stickLeft || stick.stickRight || stick.stickUp || stick.stickDown) {
      this._game.eventbus.emit('gamepad.stickChange', stick)
    }

    // const {
    //   0: buttonA,
    //   1: buttonB,
    //   2: buttonX,
    //   3: buttonY,
    //   4: leftBumper,
    //   5: rightBumper,
    //   6: leftTrigger,
    //   7: rightTrigger,
    //   8: select,
    //   9: start,
    //   10: leftStick,
    //   11: rightStick,
    //   12: up,
    //   13: down,
    //   14: left,
    //   15: right,
    //   16: home,
    // } = buttons

    // // Check A and B buttons
    // if (buttons[0].pressed) {
    //   console.log('A button pressed')
    // }
    //
    // if (buttons[1].pressed) {
    //   console.log('B button pressed')
    // }

    // Check other buttons
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].pressed) {
        console.log(`[gamepad] Button ${i} pressed`)
        this._game.eventbus.emit('gamepad.buttonPress', { button: i, state: 'pressed' })
      }
    }
  }
}
