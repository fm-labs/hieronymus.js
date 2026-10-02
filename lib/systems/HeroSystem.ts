import type {
  IGame,
  IGameSystem,
  GamepadStickChangeEvent,
  GamepadButtonChangeEvent,
  MoveDirection,
} from '../game.types'
import { randomColor } from '../utils/colorutil'
import { AbstractGameSystem } from './AbstractGameSystem'
import IsoCharacterComponent2 from '../components/IsoCharacterComponent2'

export class HeroSystem extends AbstractGameSystem implements IGameSystem {
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
  private heroCanvas!: HTMLCanvasElement
  private heroCtx!: CanvasRenderingContext2D
  private characterComponent!: IsoCharacterComponent2

  constructor(game: IGame) {
    super(game)
  }

  public onLoad() {
    console.log('HeroSystem.onLoad')

    const heroCanvas = document.createElement('canvas')
    heroCanvas.id = 'heroCanvas'
    heroCanvas.width = this._game.width
    heroCanvas.height = this._game.height
    this.heroCanvas = heroCanvas
    this.heroCtx = heroCanvas.getContext('2d')!
    this._game.$container.appendChild(this.heroCanvas)

    this.characterComponent = new IsoCharacterComponent2({
      name: 'hero-character',
      tileSize: 64,
      tilesheetName: 'mech',
      speed: 7,
      movementSpeed: 1.5,
      movementDirection: 'down',
      //ttl: 20000,
      elevation: 0,
      autoPlay: true,
    })

    this.handleKeyboardDownEvent = this.handleKeyboardDownEvent.bind(this)
    this.handleGamepadStickChange = this.handleGamepadStickChange.bind(this)
    this.handleGamepadButtonChangeEvent = this.handleGamepadButtonChangeEvent.bind(this)

    this._game.eventbus.on('keyboard.keydown', this.handleKeyboardDownEvent)
    this._game.eventbus.on('gamepad.stickChange', this.handleGamepadStickChange)
    this._game.eventbus.on('gamepad.buttonPress', this.handleGamepadButtonChangeEvent)

    this._game.eventbus.on('resize', (event: any) => {
      console.log('resize tilemap', event)
      this.heroCanvas.width = event.width
      this.heroCanvas.height = event.height
    })
  }

  public onUnload() {
    console.log('HeroSystem.onUnload')
    this._game.eventbus.off('keyboard.keydown', this.handleKeyboardDownEvent)
    this._game.eventbus.off('gamepad.stickChange', this.handleGamepadStickChange)
    this._game.eventbus.off('gamepad.buttonPress', this.handleGamepadButtonChangeEvent)
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
    console.log('[hero]', e.key, e.code, e.altKey, e.ctrlKey, e.shiftKey)

    switch (e.code) {
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
    console.log('[hero] button event', e)

    if (e.button === 0) {
      this.hero.speed += 2
    } else if (e.button === 1) {
      this.hero.speed -= 2
    } else if (e.button === 2) {
      this.hero.color = randomColor()
    } else if (e.button === 4) {
      this.characterComponent.setElevation(
        (this.characterComponent.properties?.elevation || 0) + 20,
      )
    } else if (e.button === 5) {
      this.characterComponent.setElevation(
        (this.characterComponent.properties?.elevation || 0) - 10,
      )
    } else if (e.button === 9) {
      // center hero on screen
      //this._game.camera.offset.x = 0 //this._game.width / 2 - this.hero.width / 2
      //this._game.camera.offset.y = 0 //this._game.height / 2 - this.hero.height / 2
      this._game.camera.offset.x = -this.hero.x
      this._game.camera.offset.y = -this.hero.y
    }
    console.log('[hero] speed:', this.hero.speed)
  }

  public move(direction?: MoveDirection) {
    const movementDelta = 1 / 10
    const speed = this.hero.speed

    switch (direction) {
      case 'left':
        this.hero.x -= speed * movementDelta
        this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'left'
        this.hero.moving = true
        this.characterComponent.setMovementDirection('right')

        this._game.camera.offset.x -= speed * movementDelta
        this._game.camera.offset.y -= (speed * movementDelta) / 2
        break
      case 'right':
        this.hero.x += speed * movementDelta
        this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'right'
        this.hero.moving = true
        this.characterComponent.setMovementDirection('left')

        this._game.camera.offset.x += speed * movementDelta
        this._game.camera.offset.y += (speed * movementDelta) / 2
        break
      case 'up':
        this.hero.x += speed * movementDelta
        this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'up'
        this.hero.moving = true
        this.characterComponent.setMovementDirection('up')

        this._game.camera.offset.x += speed * movementDelta
        this._game.camera.offset.y -= (speed * movementDelta) / 2
        break
      case 'down':
        this.hero.x -= speed * movementDelta
        this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'down'
        this.hero.moving = true
        this.characterComponent.setMovementDirection('down')

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
    //this.hero.x = this._game.width / 2 - this.hero.width / 2
    //this.hero.y = this._game.height / 2 - this.hero.height / 2
    this.hero.x = 300
    this.hero.y = 300

    //const gridWidth = this._game.worldMap.projection.getGridDimensions().width
    //const gridHeight = this._game.worldMap.projection.getGridDimensions().height

    //this._game.camera.offset.x = -Math.max(gridWidth, canvasWidth) / 2 + canvasWidth / 2
    //this._game.camera.offset.y = -Math.max(gridHeight, canvasHeight) / 2 + gridHeight / 2

    this.characterComponent.setPosition(this.hero.x, this.hero.y)
  }

  public stop() {
    console.log('HeroSystem.stop')
  }

  public async tick(deltaTime: number) {
    //console.log('HeroSystem.update')
    //if (Math.max(deltaTime, 300) <= 300) return

    //this.hero.color = randomColor()
    this._game.eventbus.emit('hero.update', this.hero)
    this.dirty = true

    this.characterComponent.setPosition(this.hero.x, this.hero.y)
    this.characterComponent.update(deltaTime)
    this.draw(this.heroCtx)
  }

  public draw(heroCtx: CanvasRenderingContext2D) {
    const hero = this.hero
    //console.log('HeroSystem.draw', hero)

    heroCtx.reset()
    heroCtx.clearRect(0, 0, heroCtx.canvas.width, heroCtx.canvas.height)

    heroCtx.save()
    //heroCtx.translate(heroCanvas.width / 2 - this.hero.width / 2, -this.hero.height / 2)
    //const projectionOffsetX = this._game.worldMap.projection.getProjectionOffset()
    const cameraOffsetX = this._game.camera.offset.x
    const cameraOffsetY = this._game.camera.offset.y
    heroCtx.translate(-cameraOffsetX, -cameraOffsetY)

    // heroCtx.fillStyle = '#ff0000'
    // heroCtx.fillRect(hero.x, hero.y, hero.width, hero.height)

    // draw a dot and coordinates at the hero position
    // heroCtx.fillStyle = hero.color
    // heroCtx.beginPath()
    // heroCtx.arc(heroCtx.canvas.width / 2, heroCtx.canvas.height / 2, 10, 0, Math.PI * 2)
    // heroCtx.fill()
    // heroCtx.fillText(
    //   `(${Math.round(heroCtx.canvas.width / 2)}, ${Math.round(heroCtx.canvas.height / 2)})`,
    //   heroCtx.canvas.width / 2,
    //   heroCtx.canvas.height / 2,
    // )

    heroCtx.fillStyle = 'rgba(255,255,255,0.46)'
    heroCtx.font = '10px Arial'
    const text = `(${Math.round(this.hero.x)}, ${Math.round(this.hero.y)})`
    heroCtx.fillText(text, this.hero.x, this.hero.y + 30)

    //this.characterComponent.x = hero.x
    //this.characterComponent.y = hero.y
    //this.characterComponent.moveLeft(100)

    this.characterComponent.draw(heroCtx)
    heroCtx.restore()

    // // draw a dot on the center of the screen / canvas
    // heroCtx.fillStyle = 'rgba(0,217,255,0.8)'
    // heroCtx.beginPath()
    // heroCtx.arc(heroCtx.canvas.width / 2, heroCtx.canvas.height / 2, 5, 0, Math.PI * 2)
    // heroCtx.fill()
    // heroCtx.closePath()
    // heroCtx.fillText(
    //   `(${Math.round(heroCtx.canvas.width / 2)}, ${Math.round(heroCtx.canvas.height / 2)})`,
    //   heroCtx.canvas.width / 2,
    //   heroCtx.canvas.height / 2,
    // )
    //
    // // draw line from center of screen to hero position
    // heroCtx.strokeStyle = 'rgba(0,255,0,0.5)'
    // heroCtx.beginPath()
    // heroCtx.moveTo(heroCtx.canvas.width / 2, heroCtx.canvas.height / 2)
    // heroCtx.lineTo(hero.x - cameraOffsetX, hero.y - cameraOffsetY)
    // heroCtx.stroke()
    // heroCtx.closePath()

    // mainCtx.drawImage(
    //   heroCanvas,
    //   0, //this._game.width / 2 - gridWidth / 2,
    //   0, //this._game.height / 2 - gridHeight / 2,
    // )

    this.dirty = false
  }
}
