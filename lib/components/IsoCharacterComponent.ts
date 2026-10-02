import { AnimatedSpriteComponent, AnimatedSpriteComponentProps } from './AnimatedSpriteComponent'
import { calculateIsoWaypoints, calculateWaypoints, getDirection } from '../utils/gridpathutil'

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
    movementSpeed: 0,
    movementDirection: undefined,
  }

  public readonly componentType: string = 'IsoCharacter'

  private _spawnTime: number = Date.now()
  private _baseTilesheetName: string
  private _lastMove: number = 0
  private _moves: number = 0

  private _targetX?: number
  private _targetY?: number
  private _waypoints: { x: number; y: number }[] = []
  private _waypointIndex: number = 0

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

  setPosition(x: number, y: number): this {
    super.setPosition(x, y)
    this.updateWaypoints()
    return this
  }

  setTargetPosition(x: number, y: number): void {
    this._targetX = x
    this._targetY = y
    console.log(
      `IsoCharacterComponent set target position to (${this.x}, ${this.y}) -> (${x}, ${y})`,
    )
    this.updateWaypoints()
  }

  private updateWaypoints(): void {
    const x = this._targetX
    const y = this._targetY
    if (x === undefined || y === undefined) {
      this._waypoints = []
      this._waypointIndex = 0
      return
    }

    const waypoints = calculateIsoWaypoints({ x: this.x, y: this.y }, { x, y })
    console.log('Updated waypoints', x, y, waypoints)
    this._waypoints = waypoints
    this._waypointIndex = 0
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
      //this._moves++
      // if (this._moves > 100) {
      //   this._moves = 0
      //   // choose a new random direction
      //   const directions = ['up', 'down', 'left', 'right']
      //   const newDirection = directions[
      //     Math.floor(Math.random() * directions.length)
      //   ] as MovementDirection
      //   //console.log(`New direction: ${newDirection}`)
      //   this.properties.movementDirection = newDirection
      //   this.applyTilesheet(this._baseTilesheetName + `-${newDirection}`)
      // }
    }

    // If a target position is set, move towards it
    if (this._targetX !== undefined && this._targetY !== undefined) {
      const dx = this._targetX - this.x
      const dy = this._targetY - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      const treshold = 12

      // if (distance < treshold) {
      //   // Reached the target position
      //   this.x = this._targetX
      //   this.y = this._targetY
      //   this._targetX = undefined
      //   this._targetY = undefined
      //   this.properties.movementSpeed = 0
      // } else
      if (this._waypointIndex < this._waypoints.length) {
        // Move towards the next waypoint
        const waypoint = this._waypoints[this._waypointIndex]
        const waypointDx = waypoint.x - this.x
        const waypointDy = waypoint.y - this.y
        const waypointDistance = Math.sqrt(waypointDx * waypointDx + waypointDy * waypointDy)

        const moveSpeed = speed || 1 // Default speed if not set
        const direction = getDirection({ x: this.x, y: this.y }, waypoint)
        if (direction) {
          // Update the movement direction based on the waypoint
          this.properties.movementDirection = direction
          this.properties.movementSpeed = moveSpeed
        }

        if (waypointDistance < treshold) {
          // Reached the current waypoint, move to the next one
          console.log(
            `Reached waypoint ${this._waypointIndex} at (${waypoint.x}, ${waypoint.y}), moving to next waypoint.`,
          )
          this._waypointIndex++
          if (this._waypointIndex >= this._waypoints.length) {
            // No more waypoints, stop moving
            this._targetX = undefined
            this._targetY = undefined
            this.properties.movementSpeed = 0
            this.properties.movementDirection = undefined
            console.log('Reached the final waypoint, stopping movement.')
          }
        } else {
          // Move towards the current waypoint
          //const moveSpeed = speed || 1 // Default speed if not set
          //this.x += (waypointDx / waypointDistance) * moveSpeed
          //this.y += (waypointDy / waypointDistance) * moveSpeed
          // console.log(
          //   'Next waypoint:',
          //   waypoint,
          //   'Distance to waypoint:',
          //   waypointDistance,
          //   'Direction:',
          //   direction,
          // )
          //this.properties.movementSpeed = moveSpeed
          //this.properties.movementDirection = direction
        }
      } else {
        // Move towards the target position
        //const angle = Math.atan2(dy, dx)
        //const dir = this.properties.movementDirection

        // Update the movement direction based on the target position angle on the isometric grid
        // console.log(
        //   `Moving towards target: (${this._targetX}, ${this._targetY}) from (${this.x}, ${this.y}) with angle ${angle}`,
        // )
        // angle between the character and the target position in degrees
        //const dangle = Math.atan2(dy, dx) * (180 / Math.PI)
        //const dangleOffset = 45

        // const offset = 0.45
        // const upAngle = Math.PI * 2 - offset // Angle threshold for up direction
        // const rightAngle = Math.PI - offset // Angle threshold for right direction
        // const downAngle = Math.PI / 2 - offset // Angle threshold for down direction
        // const leftAngle = Math.PI / 4 - offset // Angle threshold for left direction
        //
        // console.log(
        //   `Target angle: ${angle}, Up: ${upAngle}, Right: ${rightAngle}, Down: ${downAngle}, Left: ${leftAngle}`,
        // )

        // //this.x += Math.cos(angle) * speed
        // //this.y += Math.sin(angle) * speed
        // if (Math.abs(dx) < treshold && Math.abs(dy) < treshold) {
        //   // Close enough to the target position, stop moving
        //   this.x = this._targetX
        //   this.y = this._targetY
        //   this._targetX = undefined
        //   this._targetY = undefined
        //   this.properties.movementSpeed = 0
        // } else if (Math.abs(dx) > treshold) {
        //   if (dx > 0) {
        //     this.properties.movementDirection = 'right'
        //   } else if (dx < 0) {
        //     this.properties.movementDirection = 'left'
        //   }
        // } else if (Math.abs(dy) > treshold) {
        //   if (dy > 0) {
        //     this.properties.movementDirection = 'down'
        //   } else if (dy < 0) {
        //     this.properties.movementDirection = 'up'
        //   }
        // }

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal movement
          if (dx > 0) {
            this.properties.movementDirection = 'right'
          } else {
            this.properties.movementDirection = 'left'
          }
        } else {
          // Vertical movement
          if (dy > 0) {
            this.properties.movementDirection = 'down'
          } else {
            this.properties.movementDirection = 'up'
          }
        }

        // if (dx < 0 && dy > 0) {
        //   this.properties.movementDirection = 'left'
        // } else if (dx > 0 && dy > 0) {
        //   this.properties.movementDirection = 'up'
        // } else if (dx > 0 && dy < 0) {
        //   this.properties.movementDirection = 'right'
        // } else if (dx < 0 && dy < 0) {
        //   this.properties.movementDirection = 'down'
        // }
      }

      if (this.properties.movementDirection !== undefined) {
        this.applyTilesheet(this._baseTilesheetName + `-${this.properties.movementDirection}`)
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

    // Draw the target position if set
    const targetColor = 'rgba(201,0,232,0.98)' // Target position color
    if (this._targetX !== undefined && this._targetY !== undefined) {
      ctx.beginPath()
      ctx.arc(this._targetX, this._targetY, 5, 0, Math.PI * 2)
      ctx.fillStyle = targetColor
      ctx.fill()
      ctx.closePath()

      // Write the delta position
      const deltaX = this._targetX - this.x
      const deltaY = this._targetY - this.y
      const angle = Math.atan2(deltaY, deltaX)
      const dangle = angle * (180 / Math.PI) // Convert angle to degrees
      ctx.font = '12px Arial'
      ctx.fillStyle = targetColor
      ctx.fillText(
        `ΔX: ${deltaX.toFixed(2)}, ΔY: ${deltaY.toFixed(2)}, Angle: ${angle.toFixed(2)} / ${dangle}`,
        this._targetX + 10,
        this._targetY - 10,
      )

      // Draw a line to the target position
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.lineTo(this._targetX, this._targetY)
      ctx.strokeStyle = targetColor
      ctx.stroke()
      ctx.closePath()

      // // Draw a line from the character to the deltaX offset position
      // ctx.beginPath()
      // ctx.moveTo(this.x + deltaX, this.y)
      // ctx.lineTo(this._targetX, this._targetY)
      // ctx.strokeStyle = 'green'
      // ctx.stroke()
      // ctx.closePath()
      //
      // // Draw a line from the character to the deltaY offset position
      // ctx.beginPath()
      // ctx.moveTo(this.x, this.y)
      // ctx.lineTo(this._targetX, this._targetY - deltaY)
      // ctx.strokeStyle = targetColor
      // ctx.stroke()
      // ctx.closePath()

      // Draw a dot for each waypoint
      this._waypoints.forEach((waypoint) => {
        ctx.beginPath()
        ctx.arc(waypoint.x, waypoint.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,0,0,0.65)'
        ctx.fill()
        ctx.closePath()
      })

      // Draw the waypoints as lines
      if (this._waypoints.length > 0) {
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        this._waypoints.forEach((waypoint) => {
          ctx.lineTo(waypoint.x, waypoint.y)
        })
        ctx.strokeStyle = 'rgba(255,235,0,0.65)'
        ctx.stroke()
        ctx.closePath()
      }
    }
  }
}

export default IsoCharacterComponent
