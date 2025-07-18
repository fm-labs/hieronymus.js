import { AbstractGameComponent } from './AbstractGameComponent.ts'
import { FILL_COLORS, STROKE_COLORS } from '../constants.ts'

export interface IsoCylinderComponentProps extends GameComponentProperties {
  radius: number
  depth: number
  tileSize: number
}

export class IsoCylinderComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoCylinderComponentProps
  public readonly componentType: string = 'IsoCylinder'

  public static readonly defaultProperties: IsoCylinderComponentProps = {
    x: 0,
    y: 0,
    radius: 16,
    depth: 16,
    tileSize: 32,
  }

  constructor(properties: IsoCylinderComponentProps) {
    super({ ...IsoCylinderComponent.defaultProperties, ...properties })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.properties.x
    const y = this.properties.y
    if (x === undefined || y === undefined) return

    const radius = this.properties.radius
    const depth = this.properties.depth
    const tileSize = this.properties.tileSize

    //ctx.beginPath()
    //ctx.arc(x, y, this.properties.radius, 0, 2 * Math.PI)
    //ctx.closePath()

    const centerX = x
    const centerY = y + tileSize / 2 / 2

    const radiusX = radius // Horizontal radius
    const radiusY = radius / 2 // Vertical radius

    ctx.setLineDash([3, 3])

    // Draw the bottom ellipse
    ctx.translate(centerX, centerY) // Translate to center of shape
    ctx.beginPath()
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.strokeStyle = STROKE_COLORS[0] // Set the stroke color
    ctx.stroke() // Draw the ellipse outline
    ctx.fillStyle = FILL_COLORS[0] // Set the fill color
    ctx.fill()

    // Draw the top ellipse
    ctx.translate(0, -depth) // Translate to center of shape
    ctx.beginPath()
    ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.strokeStyle = STROKE_COLORS[1] // Set the stroke color
    ctx.stroke() // Draw the ellipse outline
    ctx.fillStyle = FILL_COLORS[1] // Set the fill color
    ctx.fill()

    // Draw the vertical line
    ctx.translate(0, depth) // Translate to center of shape
    ctx.beginPath()
    ctx.moveTo(-radiusX, 0)
    ctx.lineTo(-radiusX, -depth)

    ctx.moveTo(radiusX, 0)
    ctx.lineTo(radiusX, -depth)

    ctx.moveTo(0, radiusY)
    ctx.lineTo(0, -radiusY)

    ctx.closePath()
    ctx.strokeStyle = STROKE_COLORS[2] // Set the stroke color
    ctx.stroke() // Draw the ellipse outline
  }

  update(deltaTime: number): void {}
}
