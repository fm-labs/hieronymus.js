export class GamepadInputSystem implements IGameSystem {
  public name = 'GamepadInputSystem'
  private game!: IGame
  private lastInputTime = 0
  private gamepads: Gamepad[] = []

  public onLoad(game: IGame) {
    console.log('GamepadInputSystem.onLoad')
    this.game = game
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

  public update(delta: number) {
    const now = Date.now()
    if (this.lastInputTime && now - this.lastInputTime < 200) return
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
    console.log(`Gamepad connected: ${gamepad.id}`)
    this.game.eventbus.emit('gamepad.connected', gamepad)
  }

  // Function to handle gamepad disconnections
  private handleGamepadDisconnected(event: GamepadEvent) {
    const gamepad = event.gamepad
    console.log(`Gamepad disconnected: ${gamepad.id}`)
    this.game.eventbus.emit('gamepad.disconnected', gamepad)
  }

  // Function to update gamepad state
  public updateGamepadState(gamepad: Gamepad) {
    const stickThreshold = 0.2 // Adjust this threshold as needed
    const buttons = gamepad.buttons

    // Check left stick for directional controls
    const stickX = gamepad.axes[0]
    const stickY = gamepad.axes[1]

    if (stickX < -stickThreshold) {
      console.log('Left pressed')
    } else if (stickX > stickThreshold) {
      console.log('Right pressed')
    }

    if (stickY < -stickThreshold) {
      console.log('Up pressed')
    } else if (stickY > stickThreshold) {
      console.log('Down pressed')
    }

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
        console.log(`Button ${i} pressed`)
      }
    }
  }
}
