import { randomColor } from '../utils/colorutil.ts'

export class HeroSystem implements IGameSystem {
  public name = 'HeroSystem'
  private game!: IGame

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

  public onLoad(game: IGame) {
    console.log('HeroSystem.onLoad')
    this.game = game
    this.game.eventbus.on('keyboard.keyDown', this.handleKeyboardDownEvent.bind(this))
    this.game.eventbus.on('gamepad.stickChange', this.handleGamepadStickChange.bind(this))
    this.game.eventbus.on('gamepad.buttonPress', this.handleGamepadButtonChangeEvent.bind(this))

    // spawn hero in the middle of the grid
    this.hero.y = (this.game.rows * 128) / 2 / 2 // @todo: replace hard coded tile size
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

  private handleGamepadButtonChangeEvent(e: GamepadButtonChangeEvent) {}

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

  public move(direction?: MoveDirection) {
    const movementDelta = 1 / 30
    const speed = this.hero.speed

    switch (direction) {
      case 'left':
        this.hero.x -= speed * movementDelta
        this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'left'
        this.hero.moving = true
        break
      case 'right':
        this.hero.x += speed * movementDelta
        this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'right'
        this.hero.moving = true
        break
      case 'up':
        this.hero.x += speed * movementDelta
        this.hero.y -= (speed * movementDelta) / 2
        this.hero.direction = 'up'
        this.hero.moving = true
        break
      case 'down':
        this.hero.x -= speed * movementDelta
        this.hero.y += (speed * movementDelta) / 2
        this.hero.direction = 'down'
        this.hero.moving = true
        break
      default:
        this.hero.moving = false
        break
    }
  }

  public onUnload() {
    console.log('HeroSystem.onUnload')
  }

  public start() {
    console.log('HeroSystem.start')
  }

  public stop() {
    console.log('HeroSystem.stop')
  }

  public update(deltaTime: number) {
    //console.log('HeroSystem.update')

    if (Math.max(deltaTime, 1000) > 1000) {
      this.hero.color = randomColor()
    }
  }

  public draw(mainCtx: CanvasRenderingContext2D) {
    //console.log('HeroSystem.draw')

    const gridWidth = this.game.cols * 128
    const gridHeight = (this.game.rows * 128) / 2

    const heroCanvas = document.createElement('canvas')
    const heroCtx = heroCanvas.getContext('2d')!
    heroCanvas.width = gridWidth
    heroCanvas.height = gridHeight

    heroCtx.reset()
    heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height)

    heroCtx.save()
    heroCtx.translate(heroCanvas.width / 2 - this.hero.width / 2, -this.hero.height / 2)

    const hero = this.hero
    heroCtx.fillStyle = hero.color
    heroCtx.fillRect(hero.x, hero.y, hero.width, hero.height)

    mainCtx.drawImage(
      heroCanvas,
      this.game.width / 2 - gridWidth / 2,
      this.game.height / 2 - gridHeight / 2,
    )
    //mainCtx.drawImage(heroCanvas, this.game.width / 2, this.game.height / 2)
  }
}
