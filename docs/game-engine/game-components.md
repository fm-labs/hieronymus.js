# Game Components

A component is a renderable object in the game world: a tile, a sprite, a shape, a label or a character.
Components are stored in the tile map's `ComponentManager` and referenced by id from the map's layers
(see [Game World](game-world.md)).

## IGameComponent

```typescript
interface IGameComponent {
  componentType: string // e.g. 'Sprite', used for save/restore
  x: number // world position (set by the tile map when placed)
  y: number
  properties?: GameComponentProperties // { name?, ttl?, [key: string]: any }
  update?: (deltaTime: number) => void | boolean | null
  draw?: (ctx: CanvasRenderingContext2D) => void
  setPosition: (x: number, y: number) => void
}
```

The `TileMapSystem` calls, on every tick:

1. `update(deltaTime)` on every component of every layer. If it returns **`null`** the component is removed
   from its layer and from the component manager. This is how a component with a `ttl` removes itself.
2. `draw(ctx)` on every component, wrapped in `ctx.save()` / `ctx.restore()`.
   The context is already translated and scaled by the camera, so components draw in world coordinates.

## Writing a component

Extend `AbstractGameComponent`. It stores `properties`, `x` and `y` and implements
`setPosition()` / `getPosition()`.

```typescript
export class DotComponent extends AbstractGameComponent implements IGameComponent {
  public readonly componentType = 'Dot'

  constructor(properties: { radius: number; color?: string }) {
    super(properties)
  }

  update(deltaTime: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.properties.color ?? 'red'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.properties.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

To make a custom component restorable from a dump, it must also be added to
`ComponentManager.createComponent()`.

## Built-in components

| Component                                                                   | `componentType` | Key properties                                                                                                                                                  |
| --------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TileComponent`                                                             | `Tile`          | `width`, `height`, `color`, `backgroundColor`, `borderColor`, `text`                                                                                            |
| `SpriteComponent`                                                           | `Sprite`        | `tileSize`, `spriteId` (global sprite id, see [Game Assets](game-assets.md))                                                                                    |
| `AnimatedSpriteComponent`                                                   |                 | `tileSize`, `tilesheetName`, `startIdx`, `endIdx`, `speed`, `loop`, `autoPlay`, `ttl`, `elevation`                                                              |
| `IsoCubeComponent`                                                          | `IsoCube`       | `tileSize`, `width`, `depth`, `elevation`, `text`, `offset`, `lineDash`                                                                                         |
| `IsoCylinderComponent`                                                      | `IsoCylinder`   | `tileSize`, `radius`, `depth`                                                                                                                                   |
| `IsoHexagonComponent`                                                       | `IsoHexagon`    | `tileSize`, `sideLength`, `depth`                                                                                                                               |
| `IsoTextComponent`                                                          | `Text`          | `text`, `font`, `color`, `orientation`, `skewOrientation`, `offset`                                                                                             |
| `IsoImageComponent`                                                         |                 | `tileSize`, `imageName`, `scale`, `orientation` (`floor`, `left-wall`, `right-wall`)                                                                            |
| `IsoCharacterComponent`                                                     |                 | Animated character. `tilesheetName` is a base name; the tilesheet `<name>-<direction>` (`up`/`down`/`left`/`right`) is used for the current movement direction. |
| `TextComponent`, `LineComponent`, `GenericComponent`, `MovingTileComponent` |                 | Experimental / used by individual worlds.                                                                                                                       |

Components exported from the library entry point: `AbstractGameComponent`, `AnimatedSpriteComponent`,
`GenericComponent`, `IsoCubeComponent`, `IsoCylinderComponent`, `IsoHexagonComponent`, `IsoImageComponent`,
`IsoTextComponent`, `SpriteComponent`, `TileComponent`. The others are imported from `lib/components/*` directly.
