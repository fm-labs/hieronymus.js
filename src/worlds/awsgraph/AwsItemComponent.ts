import {
  AbstractGameComponent,
  IsoCubeComponent,
  SpriteComponent,
  IsoTextComponent,
} from '../../../lib'

export interface AwsItemComponentProps extends GameComponentProperties {
  tileSize: number
  offset?: { x: number; y: number }
}

export class AwsItemComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: AwsItemComponentProps

  public static readonly defaultProperties: AwsItemComponentProps = {
    tileSize: 64,
    offset: { x: 0, y: 0 },
  }

  public readonly componentType: string = 'AwsItem'
  public readonly name: string

  private _component: IGameComponent
  private _component2: IGameComponent
  private _textComponent: IGameComponent
  private _labelComponent: IGameComponent

  private _progress: number = 0

  constructor(properties: AwsItemComponentProps) {
    super({
      ...AwsItemComponent.defaultProperties,
      ...properties,
    })
    this.name = properties.name || 'AwsItemComponent'

    this._component = new IsoCubeComponent({
      tileSize: this.properties.tileSize,
      width: this.properties.tileSize / 2,
      depth: 32,
      //text: 'M4',
      lineDash: [1, 0],
    })

    this._component2 = new IsoCubeComponent({
      tileSize: this.properties.tileSize,
      width: this.properties.tileSize / 3,
      depth: 16,
      elevation: 64,
      //text: 'M4',
      lineDash: [4, 2],
    })

    this._textComponent = new IsoTextComponent({
      text: properties.name || 'XXX',
      font: '10px Arial',
      orientation: 'vertical',
      skewOrientation: 'upright',
      color: 'rgb(18,27,27)',
    })

    const min = 1
    const max = 9
    const randomId = Math.floor(Math.random() * (max - min + 1)) + min
    const _sprite = new SpriteComponent({
      tileSize: this.properties.tileSize,
      spriteId: randomId,
      data: {},
    })
    this._labelComponent = _sprite
  }

  setPosition(x: number, y: number): this {
    if (this._component && this._component.setPosition) {
      this._component.setPosition(x, y)
    }
    if (this._component2 && this._component2.setPosition) {
      this._component2.setPosition(x, y)
    }
    if (this._textComponent && this._textComponent.setPosition) {
      this._textComponent.setPosition(x + 7, y + this.properties.tileSize / 4)

      // // horizontal
      // this._textComponent.setPosition(
      //   x - this.properties.tileSize - 25,
      //   y + this.properties.tileSize / 4 - 7,
      // )
    }
    if (this._labelComponent && this._labelComponent.setPosition) {
      this._labelComponent.setPosition(x, y) // - this.properties.tileSize / 8)
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
    if (this._textComponent && this._textComponent.draw) {
      this._textComponent.draw(ctx)
    }
    if (this._labelComponent && this._labelComponent.draw) {
      this._labelComponent.draw(ctx)
    }
  }

  update(deltaTime: number): void {
    this._progress += deltaTime / 3000 // one bob cycle every 3 seconds
    if (this._progress > 1) this._progress = 0

    // smooth up and down
    const elevation = 4 + Math.sin(this._progress * Math.PI * 2) * 16
    if (this._component2 && (this._component2 as IsoCubeComponent).properties) {
      ;(this._component2 as IsoCubeComponent).properties.elevation = elevation
    }
  }
}
