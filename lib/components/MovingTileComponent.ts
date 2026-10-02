import type { GameComponentProperties, IGameComponent } from '../game.types'
import { AbstractGameComponent } from './AbstractGameComponent'

export interface MovingTileComponentProps extends GameComponentProperties {
  width: number
  height: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  text?: string
}

export class MovingTileComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: MovingTileComponentProps

  public static readonly defaultProperties: MovingTileComponentProps = {
    width: 32,
    height: 32,
    // visible: true,
    // opacity: 1,
    // rotation: 0,
    // scaleX: 1,
    // scaleY: 1,
    // anchorX: 0,
    // anchorY: 0,
    color: 'rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(0,0,0,0.5)',
    // borderWidth: 0,
    // borderRadius: 0,
    // shadowColor: 'rgba(0,0,0,0)',
    // shadowBlur: 0,
    // shadowOffsetX: 0,
    // shadowOffsetY: 0,
    // image: null,
    text: undefined,
    // font: null,
    // audio: null,
    // video: null,
    // children: [],
  }

  public readonly componentType: string = 'Tile'
  public readonly name: string

  private lastUpdateTime: number = 0
  private startPosition: { x: number; y: number } | null = null
  private moveDirection: 'right' | 'down' | 'left' | 'up' = 'right'

  constructor(properties: MovingTileComponentProps) {
    super({
      ...MovingTileComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'TileEntity'
    this.startPosition = null
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.x
    const y = this.y
    if (x === undefined || y === undefined) return

    const width = this.properties.width
    const height = this.properties.height
    const fillColor = this.properties.backgroundColor
    const strokeColor = this.properties.borderColor
    const text = this.properties.text
    const textColor = this.properties.color

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + width / 2, y + height / 2)
    ctx.lineTo(x, y + height)
    ctx.lineTo(x - width / 2, y + height / 2)
    ctx.closePath()

    // Fill the tile with a color
    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    // Stroke the tile with a border
    //ctx.strokeStyle = strokeColor
    //ctx.stroke()

    //ctx.fillStyle = 'rgba(255,0,0,0.92)'
    //ctx.fillText(`${x},${y}`, x, y)

    if (text) {
      if (textColor) {
        ctx.fillStyle = textColor
      }
      ctx.fillText(text, x - 10, y + height / 2)
    }
  }

  changeToNextDirection(): void {
    if (this.moveDirection === 'right') {
      this.moveDirection = 'down'
    } else if (this.moveDirection === 'down') {
      this.moveDirection = 'left'
    } else if (this.moveDirection === 'left') {
      this.moveDirection = 'up'
    } else if (this.moveDirection === 'up') {
      this.moveDirection = 'right'
    }
  }

  changeToNextRandomColor(): void {
    const colors = [
      'rgba(255,0,0,0.2)',
      'rgba(0,255,0,0.2)',
      'rgba(0,0,255,0.2)',
      'rgba(84,84,179,0.2)',
      'rgba(255,255,0,0.2)',
      'rgba(0,255,255,0.2)',
    ]

    const randomIndex = Math.floor(Math.random() * colors.length)
    this.properties.backgroundColor = colors[randomIndex]
  }

  update(deltaTime: number): void {
    const maxOffsetX = this.properties.width * 3
    const maxOffsetY = this.properties.height * 3
    const speed = 5 // pixels per update
    if (!this.startPosition) {
      this.startPosition = { x: this.x || 0, y: this.y || 0 }
    }

    // console.log(
    //   `MovingTileComponent update deltaTime: ${deltaTime} Move by ${(speed * deltaTime) / 1000}`,
    // )
    //this.x = (this.x || 0) + (speed * deltaTime) / 1000
    if (this.moveDirection === 'right') {
      this.x = (this.x || 0) + speed
      this.y = (this.y || 0) + speed / 2
    } else if (this.moveDirection === 'down') {
      this.x = (this.x || 0) + speed
      this.y = (this.y || 0) - speed / 2
    } else if (this.moveDirection === 'left') {
      this.x = (this.x || 0) - speed
      this.y = (this.y || 0) - speed / 2
    } else if (this.moveDirection === 'up') {
      this.x = (this.x || 0) - speed
      this.y = (this.y || 0) - speed / 2
    }

    // Reset position if it goes beyond maxOffset
    if (this.x - this.startPosition.x > maxOffsetX || this.x - this.startPosition.x < -maxOffsetX) {
      this.x = this.startPosition.x
      this.y = this.startPosition.y
      this.properties.width += 10
      this.properties.height += 10 / 2
      this.changeToNextDirection()
      this.changeToNextRandomColor()
    }
    if (this.y - this.startPosition.y > maxOffsetY || this.y - this.startPosition.y < -maxOffsetY) {
      this.x = this.startPosition.x
      this.y = this.startPosition.y
      this.properties.width -= 10
      this.properties.height -= 10 / 2
      this.changeToNextDirection()
      this.changeToNextRandomColor()
    }
  }
}
