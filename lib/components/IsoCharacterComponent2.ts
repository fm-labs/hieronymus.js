import { AnimatedSpriteComponent, AnimatedSpriteComponentProps } from './AnimatedSpriteComponent.ts'
import { calculateIsoWaypoints, calculateWaypoints, getDirection } from '../utils/gridpathutil.ts'

type MovementDirection = 'up' | 'down' | 'left' | 'right'

export interface IsoCharacter2ComponentProps extends AnimatedSpriteComponentProps {
  tilesheetName: string // Base tilesheet name, e.g., 'mech'
  movementSpeed?: number
  movementDirection?: MovementDirection
  ttl?: number // Time to live in milliseconds
}

class IsoCharacter2Component extends AnimatedSpriteComponent {
  declare properties: IsoCharacter2ComponentProps

  public static readonly defaultProperties: Partial<IsoCharacter2ComponentProps> = {
    ...AnimatedSpriteComponent.defaultProperties,
    movementSpeed: 0,
    movementDirection: undefined,
  }

  public readonly componentType: string = 'IsoCharacter2'

  private _spawnTime: number = Date.now()
  private _baseTilesheetName: string
  private _lastMove: number = 0
  private _moves: number = 0

  private _targetX?: number
  private _targetY?: number
  //private _waypoints: { x: number; y: number }[] = []
  //private _waypointIndex: number = 0
  private _movementDirection?: MovementDirection

  constructor(properties: IsoCharacter2ComponentProps) {
    const baseTilesheetName = properties.tilesheetName
    const constructedProperties: IsoCharacter2ComponentProps = {
      ...IsoCharacter2Component.defaultProperties,
      ...properties,
      tilesheetName: baseTilesheetName + '-down',
    }
    super(constructedProperties)
    this._baseTilesheetName = baseTilesheetName
    this.setMovementDirection(properties.movementDirection || 'down')
  }

  setPosition(x: number, y: number): this {
    super.setPosition(x, y)
    //this.updateWaypoints()
    return this
  }

  setTargetPosition(x: number, y: number): this {
    this._targetX = x
    this._targetY = y
    console.log(
      `IsoCharacter2Component set target position to (${this.x}, ${this.y}) -> (${x}, ${y})`,
    )
    //this.updateWaypoints()
    return this
  }

  setMovementDirection(movementDirection: MovementDirection): this {
    const tilesheetName = `${this._baseTilesheetName}-${movementDirection}`
    this.applyTilesheet(tilesheetName)
    return this
  }

  public moveToGridPosition(col: number, row: number): void {
    // const targetPos = {
    //   x: (col - row) * (tileSize / 2),
    //   y: (col + row) * (tileSize / 4),
    // }
    // this.setTargetPosition(targetPos.x, targetPos.y)
  }

  public moveUp(distance: number): void {
    if (this.y === undefined) return
    this.setTargetPosition(this.x || 0, (this.y || 0) - distance)
  }

  public moveDown(distance: number): void {
    if (this.y === undefined) return
    this.setTargetPosition(this.x || 0, (this.y || 0) + distance)
  }

  public moveLeft(distance: number): void {
    if (this.x === undefined) return
    this.setTargetPosition((this.x || 0) - distance, this.y || 0)
  }

  public moveRight(distance: number): void {
    if (this.x === undefined) return
    this.setTargetPosition((this.x || 0) + distance, this.y || 0)
  }

  // private updateWaypoints(): void {
  //   const x = this._targetX
  //   const y = this._targetY
  //   if (x === undefined || y === undefined) {
  //     this._waypoints = []
  //     this._waypointIndex = 0
  //     return
  //   }
  //
  //   const waypoints = calculateIsoWaypoints({ x: this.x, y: this.y }, { x, y })
  //   console.log('Updated waypoints', x, y, waypoints)
  //   this._waypoints = waypoints
  //   this._waypointIndex = 0
  // }

  update(deltaTime: number): void | boolean | null {
    super.update(deltaTime)

    const ttl = this.properties.ttl
    if (ttl && Date.now() - this._spawnTime > ttl) {
      console.log(`IsoCharacterComponent expired after ${ttl}ms`)
      return null // Indicate that this component should be removed
    }

    // if target is not current position, move towards target
    if (this._targetX !== undefined && this._targetY !== undefined) {
      const dx = this._targetX - (this.x || 0)
      const dy = this._targetY - (this.y || 0)
      const distance = Math.sqrt(dx * dx + dy * dy)
      const speed = this.properties.movementSpeed || 0
      if (distance > 1 && speed > 0) {
        const moveX = ((dx / distance) * speed) / 1000
        const moveY = ((dy / distance) * speed) / 1000
        this.setPosition((this.x || 0) + moveX, (this.y || 0) + moveY)

        // Update movement direction and tilesheet if needed
        // const newDirection = getDirection(dx, dy)
        // if (newDirection && newDirection !== this.properties.movementDirection) {
        //   this.properties.movementDirection = newDirection
        //   this.properties.tilesheetName = `${this._baseTilesheetName}-${newDirection}`
        //   //this.resetAnimation()
        // }
      } else {
        // Reached target
        this.setPosition(this._targetX, this._targetY)
        this._targetX = undefined
        this._targetY = undefined
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    super.draw(ctx)

    // Draw a debug circle around the character
    ctx.beginPath()
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)' // Semi-transparent red
    ctx.stroke()
    ctx.closePath()
  }
}

export default IsoCharacter2Component
