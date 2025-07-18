import { AnimatedSpriteComponent, AnimatedSpriteComponentProps } from './AnimatedSpriteComponent.ts'

type MovementDirection = 'up' | 'down' | 'left' | 'right'

export interface IsoCharacterComponentProps extends AnimatedSpriteComponentProps {
  tilesheetName: string // Base tilesheet name, e.g., 'mech'
  movementSpeed?: number
  movementDirection?: MovementDirection
  ttl?: number // Time to live in milliseconds
}

class IsoCharacterComponent extends AnimatedSpriteComponent {
  declare properties: IsoCharacterComponentProps

  public static readonly defaultProperties: Partial<IsoCharacterComponentProps> = {
    ...AnimatedSpriteComponent.defaultProperties,
    movementSpeed: 1,
    movementDirection: 'down',
  }

  public readonly componentType: string = 'IsoCharacter'

  private _spawnTime: number = Date.now()
  private _baseTilesheetName: string
  private _lastMove: number = 0
  private _moves: number = 0

  constructor(properties: IsoCharacterComponentProps) {
    const baseTilesheetName = properties.tilesheetName
    const movementDirection = properties.movementDirection || 'down'
    const tilesheetName = `${baseTilesheetName}-${movementDirection}`
    const constructedProperties: IsoCharacterComponentProps = {
      ...IsoCharacterComponent.defaultProperties,
      ...properties,
      tilesheetName: tilesheetName,
    }
    super(constructedProperties)
    this._baseTilesheetName = baseTilesheetName
  }

  update(deltaTime: number): void | boolean | null {
    super.update(deltaTime)

    const ttl = this.properties.ttl
    if (ttl && Date.now() - this._spawnTime > ttl) {
      console.log(`IsoCharacterComponent expired after ${ttl}ms`)
      return null // Indicate that this component should be removed
    }

    const speed = this.properties.movementSpeed
    const direction = this.properties.movementDirection

    if (speed && direction) {
      const now = Date.now()
      if (now - this._lastMove < 100 / speed) {
        return false
      }

      if (direction === 'up') {
        this.y -= speed
        this.x += speed * 2
      } else if (direction === 'down') {
        this.y += speed
        this.x -= speed * 2
      } else if (direction === 'left') {
        this.x -= speed * 2
        this.y -= speed
      } else if (direction === 'right') {
        this.x += speed * 2
        this.y += speed
      }

      this._lastMove = Date.now()
      this._moves++

      if (this._moves > 100) {
        this._moves = 0
        // choose a new random direction
        const directions = ['up', 'down', 'left', 'right']
        const newDirection = directions[
          Math.floor(Math.random() * directions.length)
        ] as MovementDirection
        //console.log(`New direction: ${newDirection}`)
        this.properties.movementDirection = newDirection
        this.applyTilesheet(this._baseTilesheetName + `-${newDirection}`)
      }
    }
  }
}

export default IsoCharacterComponent
