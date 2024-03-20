import { randomColor } from '../utils/colorutil.ts'
import { AbstractBaseSystem } from './AbstractBaseSystem.ts'

export class HeroSystem extends AbstractBaseSystem implements IGameSystem {
  public name = 'HeroSystem'

  private hero = {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    speed: 256,
    color: '#00ff00',
    direction: 'down',
    moving: false,
  }
  private dirty: boolean = true

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('HeroSystem.onLoad')
    this.handleKeyboardDownEvent = this.handleKeyboardDownEvent.bind(this)
    this.handleGamepadStickChange = this.handleGamepadStickChange.bind(this)
    this.handleGamepadButtonChangeEvent = this.handleGamepadButtonChangeEvent.bind(this)

    this._game.eventbus.on('keyboard.keyDown', this.handleKeyboardDownEvent)
    this._game.eventbus.on('gamepad.stickChange', this.handleGamepadStickChange)
    this._game.eventbus.on('gamepad.buttonPress', this.handleGamepadButtonChangeEvent)
  }

  public onUnload() {
    console.log('HeroSystem.onUnload')
    //this._game.eventbus.off('keyboard.keyDown', this.handleKeyboardDownEvent)
    //this._game.eventbus.off('gamepad.stickChange', this.handleGamepadStickChange)
    //this._game.eventbus.off('gamepad.buttonPress', this.handleGamepadButtonChangeEvent)
  }

  private handleGamepadStickChange(e: GamepadStickChangeEvent) {
    if (e.stickLeft) {
      console.log('left stick change', e)
      this.move('left')
    } else if (e.stickRight) {
      console.log('right stick change', e)
      this.move('right')
    } else if (e.stickUp) {
      console.log('up stick change', e)
      this.move('up')
    } else if (e.stickDown) {
      console.log('down stick change', e)
      this.move('down')
    }
  }

  private handleKeyboardDownEvent(e: KeyboardEvent) {
    console.log('[Hero]', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)

    switch (e.key) {
      case 'KeyA':
      case 'ArrowLeft':
        this.move('left')
        break
      case 'KeyD':
      case 'ArrowRight':
        this.move('right')
        break
      case 'KeyW':
      case 'ArrowUp':
        this.move('up')
        break
      case 'KeyS':
      case 'ArrowDown':
        this.move('down')
        break
      default:
        this.move(undefined)
        break
    }
  }

  private handleGamepadButtonChangeEvent(e: GamepadButtonChangeEvent) {
    console.log('button change', e)

    if (e.button === 0) {
      this.hero.speed += 64
    } else if (e.button === 1) {
      this.hero.speed -= 128
    } else if (e.button === 2) {
      this.hero.color = randomColor()
    } else if (e.button === 3) {
      this.hero.speed = 256
    }
  }

  public move(direction?: MoveDirection) {
    const movementDelta = 1 / 30
    const speed = this.hero.speed

    switch (direction) {
      case 'left':
        // this.hero.x -= speed * movementDelta
        // this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'left'
        this.hero.moving = true

        this._game.camera.offset.x -= speed * movementDelta
        this._game.camera.offset.y -= (speed * movementDelta) / 2
        break
      case 'right':
        // this.hero.x += speed * movementDelta
        // this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'right'
        this.hero.moving = true

        this._game.camera.offset.x += speed * movementDelta
        this._game.camera.offset.y += (speed * movementDelta) / 2
        break
      case 'up':
        // this.hero.x += speed * movementDelta
        // this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'up'
        this.hero.moving = true

        this._game.camera.offset.x += speed * movementDelta
        this._game.camera.offset.y -= (speed * movementDelta) / 2
        break
      case 'down':
        // this.hero.x -= speed * movementDelta
        // this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'down'
        this.hero.moving = true

        this._game.camera.offset.x -= speed * movementDelta
        this._game.camera.offset.y += (speed * movementDelta) / 2
        break
      default:
        this.hero.moving = false
        break
    }

    this._game.eventbus.emit('hero.move', this.hero)
  }

  public start() {
    console.log('HeroSystem.start')

    // spawn hero in the middle of the grid
    //const canvasWidth = this._game.$canvas.width
    //const canvasHeight = this._game.$canvas.height
    this.hero.x = this._game.$canvas.width / 2 - this.hero.width / 2
    this.hero.y = this._game.$canvas.height / 2 - this.hero.height / 2

    //const gridWidth = this._game.worldMap.projection.getGridDimensions().width
    //const gridHeight = this._game.worldMap.projection.getGridDimensions().height

    //this._game.camera.offset.x = -Math.max(gridWidth, canvasWidth) / 2 + canvasWidth / 2
    //this._game.camera.offset.y = -Math.max(gridHeight, canvasHeight) / 2 + gridHeight / 2
  }

  public stop() {
    console.log('HeroSystem.stop')
  }

  public update(deltaTime: number) {
    //console.log('HeroSystem.update')
    if (Math.max(deltaTime, 1000) <= 1000) return

    this.hero.color = randomColor()
    this._game.eventbus.emit('hero.update', this.hero)
    this.dirty = true
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    const hero = this.hero
    console.log('HeroSystem.draw', hero)

    //const tsize = this._game.worldMap.tileWidth
    //const gridWidth = this._game.worldMap.columns * tsize
    //const gridHeight = (this._game.worldMap.rows * tsize) / 2

    const heroCanvas = document.createElement('canvas')
    const heroCtx = heroCanvas.getContext('2d')!
    heroCanvas.width = mainCtx.canvas.width
    heroCanvas.height = mainCtx.canvas.height

    //heroCtx.reset()
    //heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height)

    //heroCtx.save()
    //heroCtx.translate(heroCanvas.width / 2 - this.hero.width / 2, -this.hero.height / 2)
    //const projectionOffsetX = this._game.worldMap.projection.getProjectionOffset()
    //const cameraOffsetX = this._game.camera.offset.x
    //const cameraOffsetY = this._game.camera.offset.y
    //heroCtx.translate(projectionOffsetX.x - cameraOffsetX, projectionOffsetX.y - cameraOffsetY)

    heroCtx.fillStyle = hero.color
    heroCtx.fillRect(hero.x, hero.y, hero.width, hero.height)

    mainCtx.drawImage(
      heroCanvas,
      0, //this._game.width / 2 - gridWidth / 2,
      0, //this._game.height / 2 - gridHeight / 2,
    )

    this.dirty = false
  }
}
