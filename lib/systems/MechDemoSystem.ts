import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { ComponentManager } from '../kernel/ComponentManager.ts'
import IsoCharacterComponent from '../components/IsoCharacterComponent.ts'
import { isometricGridToScreen, isometricScreenToGrid } from '../utils/gridutil.ts'
import IsoCharacterComponent2 from '../components/IsoCharacterComponent2.ts'

export class MechDemoSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'MechDemoSystem'

  private readonly tileMap: ITileMap
  private _spawnTimer: any = undefined
  private _spawnTimer2: any = undefined
  //private _objects: number[] = []

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)
    this.tileMap = tileMap
  }

  public onLoad() {
    console.log('MechDemoSystem.onLoad')
  }

  public onUnload() {
    console.log('MechDemoSystem.onUnload')
  }

  // private spawnCharacter() {
  //   console.log('MechDemoSystem spawn timer')
  //   // kill a random object if we have more than 10
  //   // if (this._objects.length > 100) {
  //   //   const idx = Math.floor(Math.random() * this._objects.length)
  //   //   const objectToRemove = this._objects[idx]
  //   //   //console.log('Removing object:', objectToRemove, this._objects.length)
  //   //   this.tileMap.removeObject(5, objectToRemove)
  //   //   this._objects.splice(idx, 1)
  //   // }
  //
  //   const randCol = Math.floor(Math.random() * this.tileMap.columns)
  //   const randRow = Math.floor(Math.random() * this.tileMap.rows)
  //   const randSpeed = Math.random() * 0.5 + 1 // random speed between 1 and 3
  //   const randTtl = Math.floor(Math.random() * 50000) + 15000 // random ttl between 15 and 50 seconds
  //   const randElevation = Math.floor(Math.random() * 30) // random elevation between 0 and 30
  //
  //   const object = new IsoCharacterComponent({
  //     tilesheetName: 'mech',
  //     tileSize: this.tileMap.tileWidth,
  //     speed: 2 * randSpeed,
  //     movementSpeed: randSpeed,
  //     movementDirection: undefined,
  //     ttl: randTtl, // ttl in ms
  //     elevation: randElevation,
  //   })
  //
  //   // If no target position is set, choose a new random target position
  //   const randomX = Math.random() * this._game.width // Assuming a canvas width of 800
  //   const randomY = Math.random() * this._game.height // Assuming a canvas height of 600
  //   //this.setTargetPosition(randomX, randomY)
  //   object.setTargetPosition(randomX, randomY)
  //
  //   const objectId = this.tileMap.addObjectAtGridPos(5, randCol, randRow, object)
  // }

  private spawnCharacter2() {
    const randId = Date.now() % 1000
    const character2 = new IsoCharacterComponent2({
      name: 'hero-character-' + randId,
      tileSize: this.tileMap.tileWidth,
      tilesheetName: 'mech',
      speed: 7,
      //movementSpeed: 1.5,
      //movementDirection: 'down',
      ttl: 20000,
    })

    const randomCol = Math.floor(Math.random() * this.tileMap.columns)
    const randomRow = Math.floor(Math.random() * this.tileMap.rows)
    const spawnPos = { col: randomCol, row: randomRow }
    //const spawnPos = { col: 5, row: 6 }
    const targetPos = { col: 12, row: 6 }
    const character2Id = this.tileMap.addObjectAtGridPos(3, spawnPos.col, spawnPos.row, character2)
    //this._objects.push(character2Id)
    //
    // const randomTargetCol = Math.floor(Math.random() * this.tileMap.columns)
    // const randomTargetRow = Math.floor(Math.random() * this.tileMap.rows)
    // const character2TargetPos = isometricGridToScreen(
    //   randomTargetCol,
    //   randomTargetRow,
    //   this.tileMap.tileWidth,
    // )
    //
    const object = this.tileMap.components.get(character2Id) as IsoCharacterComponent2
    // object.setTargetPosition(character2TargetPos.x, character2TargetPos.y)
    object.moveLeft(100)
    object.moveDown(100)
    object.moveRight(100)
    object.moveUp(100)
    object.moveToGridPosition(targetPos.col, targetPos.row)
  }

  public start() {
    console.log('MechDemoSystem.start')

    //this.spawnCharacter.bind(this)
    this.spawnCharacter2.bind(this)
    //this._spawnTimer = window.setInterval(() => this.spawnCharacter(), 5000)
    //this.spawnCharacter()
    this._spawnTimer2 = window.setInterval(() => this.spawnCharacter2(), 15000)
    this.spawnCharacter2()

    // this._game.eventbus.on('rerender', () => {
    //   this.dirty = true
    // })

    // this._game.eventbus.on('mouse.dblclick', (event: any) => {
    //   console.log('MechDemoSystem mouse doubleclick', event)
    //
    //   // find the component with name 'hero-character'
    //   const components = this.tileMap.components as ComponentManager
    //   const hero = components.findByName('hero-character')
    //   if (hero) {
    //     console.log('Hero component found:', hero)
    //     // center the camera on the hero
    //     this._game.camera.zoom = 1
    //     this._game.camera.offset.x = hero.x - this._game.width / 2
    //     this._game.camera.offset.y = hero.y - this._game.height / 2
    //   } else {
    //     console.warn('Hero component not found')
    //   }
    // })
  }

  public stop() {
    console.log('MechDemoSystem.stop')
    if (this._spawnTimer) {
      clearInterval(this._spawnTimer)
      this._spawnTimer = undefined
    }
  }

  //public async tick(deltaTime: number) {}
  //public draw() {}
}
