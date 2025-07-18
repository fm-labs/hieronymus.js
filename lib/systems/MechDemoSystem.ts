import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { ComponentManager } from '../kernel/ComponentManager.ts'
import IsoCharacterComponent from '../components/IsoCharacterComponent.ts'

export class MechDemoSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'MechDemoSystem'

  private readonly tileMap: ITileMap
  private _spawnTimer: any = undefined
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

  public start() {
    console.log('MechDemoSystem.start')

    this._spawnTimer = window.setInterval(() => {
      console.log('MechDemoSystem spawn timer')
      // kill a random object if we have more than 10
      // if (this._objects.length > 100) {
      //   const idx = Math.floor(Math.random() * this._objects.length)
      //   const objectToRemove = this._objects[idx]
      //   //console.log('Removing object:', objectToRemove, this._objects.length)
      //   this.tileMap.removeObject(5, objectToRemove)
      //   this._objects.splice(idx, 1)
      // }

      const randCol = Math.floor(Math.random() * this.tileMap.columns)
      const randRow = Math.floor(Math.random() * this.tileMap.rows)
      const randSpeed = Math.random() * 2 + 1 // random speed between 1 and 3
      const randTtl = Math.floor(Math.random() * 50000) + 15000 // random ttl between 15 and 50 seconds

      const object = new IsoCharacterComponent({
        tilesheetName: 'mech',
        tileSize: this.tileMap.tileWidth,
        speed: 5 * randSpeed,
        movementSpeed: randSpeed,
        movementDirection: 'down',
        ttl: randTtl, // ttl in ms
      })
      const objectId = this.tileMap.addObjectAtGridPos(5, randCol, randRow, object)
    }, 5000)

    // this._game.eventbus.on('rerender', () => {
    //   this.dirty = true
    // })

    this._game.eventbus.on('mouse.dblclick', (event: any) => {
      console.log('MechDemoSystem mouse doubleclick', event)

      // find the component with name 'hero-character'
      const components = this.tileMap.components as ComponentManager
      const hero = components.findByName('hero-character')
      if (hero) {
        console.log('Hero component found:', hero)
        // center the camera on the hero
        this._game.camera.zoom = 1
        this._game.camera.offset.x = hero.x - this._game.width / 2
        this._game.camera.offset.y = hero.y - this._game.height / 2
      } else {
        console.warn('Hero component not found')
      }
    })
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
