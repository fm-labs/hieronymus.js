import type { GameComponentProperties, IGameComponent } from '@fmlabs/world'
import {
  AbstractGameComponent,
  IsoCubeComponent,
  SpriteComponent,
  IsoTextComponent,
} from '@fmlabs/world'
import { TextComponent } from '@fmlabs/world'

export interface ContainerComponentProps extends GameComponentProperties {
  tileSize: number
  offset?: { x: number; y: number }
  animated?: boolean
  hostId?: string
  container?: any // container data
}

export class ContainerComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: ContainerComponentProps

  public static readonly defaultProperties: ContainerComponentProps = {
    tileSize: 64,
    offset: { x: 0, y: 0 },
    animated: false,
    container: undefined,
  }

  public readonly componentType: string = 'Container'
  public readonly name: string
  public readonly container: any

  private readonly _component: IGameComponent
  private readonly _component2: IGameComponent
  private readonly _labelComponent: IGameComponent
  private readonly _iconComponent: IGameComponent

  private _progress: number = 0
  private _textVisible: boolean = false

  constructor(properties: ContainerComponentProps) {
    super({
      ...ContainerComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'ContainerComponent'
    this.container = properties.container || {}

    const isHealthy = this.container?.State?.Health?.Status === 'healthy'
    const isUnhealthy = this.container?.State?.Health?.Status === 'unhealthy'

    this._component = new IsoCubeComponent({
      tileSize: this.properties.tileSize,
      width: this.properties.tileSize / 2,
      depth: 16,
      //text: 'M4',
      lineDash: [1, 0],
    })

    this._component2 = new IsoCubeComponent({
      tileSize: this.properties.tileSize,
      width: this.properties.tileSize / 3,
      depth: 16,
      elevation: 0,
      //text: 'M4',
      lineDash: [4, 2],
    })

    let label =
      properties.label ||
      properties?.container?.Name.substring(1) ||
      properties?.container?.Id ||
      'no-name'
    if (isUnhealthy) {
      label += ' (unhealthy)'
    }
    this._labelComponent = new IsoTextComponent({
      text: label,
      font: '10px Tektur',
      orientation: 'vertical',
      skewOrientation: 'upright',
      color: 'rgb(0,255,255)',
    })

    // const min = 1
    // const max = 9
    // //const randomId = Math.floor(Math.random() * (max - min + 1)) + min
    // const randomId = 1
    // const _sprite = new SpriteComponent({
    //   tileSize: this.properties.tileSize,
    //   spriteId: randomId,
    //   data: {},
    // })
    // this._labelComponent = _sprite
    let iconText = ''
    if (isHealthy) {
      iconText = '💚'
    } else if (isUnhealthy) {
      iconText = '⚠️'
    } else if (this.container?.State?.Status !== 'running') {
      iconText = '❌'
      if (this.container?.State?.ExitCode && this.container?.State?.ExitCode !== 0) {
        iconText = '💀'
      }
    }

    this._iconComponent = new TextComponent({
      text: iconText,
      font: '14px Tektur',
      orientation: 'horizontal',
      color: 'rgb(0,255,255)',
    })
  }

  setTextVisible(visible: boolean) {
    this._textVisible = visible
  }

  setPosition(x: number, y: number): this {
    const _cx = x - this.properties.tileSize / 8
    const _cy = y - this.properties.tileSize / 4

    if (this._component && this._component.setPosition) {
      this._component.setPosition(x, y)
    }
    if (this._component2 && this._component2.setPosition) {
      this._component2.setPosition(x, y)
    }
    if (this._labelComponent && this._labelComponent.setPosition) {
      this._labelComponent.setPosition(x + 7, y + this.properties.tileSize / 4)

      // // horizontal
      // this._textComponent.setPosition(
      //   x - this.properties.tileSize - 25,
      //   y + this.properties.tileSize / 4 - 7,
      // )
    }
    if (this._iconComponent && this._iconComponent.setPosition) {
      this._iconComponent.setPosition(_cx, _cy) // - this.properties.tileSize / 8)
    }
    return super.setPosition(x, y)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // const offsetX = this.properties.offset?.x || 0
    // const offsetY = this.properties.offset?.y || 0
    // const x = this.x
    // const y = this.y
    // if (x === undefined || y === undefined) return
    if (this._component && this._component.draw) {
      this._component.draw(ctx)
    }
    if (this._component2 && this._component2.draw) {
      this._component2.draw(ctx)
    }
    if (this._textVisible && this._labelComponent && this._labelComponent.draw) {
      this._labelComponent.draw(ctx)
    }
    if (this._iconComponent && this._iconComponent.draw) {
      this._iconComponent.draw(ctx)
    }
  }

  update(deltaTime: number): void {
    if (!this.properties.animated) {
      return
    }

    this._progress += deltaTime / 3000 // one bob cycle every 3 seconds
    if (this._progress > 1) this._progress = 0

    // smooth up and down
    const elevation = 8 + Math.sin(this._progress * Math.PI * 2) * 16
    if (this._component2 && (this._component2 as IsoCubeComponent).properties) {
      ;(this._component2 as IsoCubeComponent).properties.elevation = elevation
    }
  }
}
