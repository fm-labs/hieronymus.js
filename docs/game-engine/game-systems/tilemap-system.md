# TileMapSystem

```typescript
game.addSystem(new TileMapSystem(game, tileMap, canvas?))
```

## Synopsis

The TileMapSystem updates and renders a [TileMap](../game-world.md). It draws to its own canvas
(`#worldCanvas`), which is created unless one is passed in, and appended to the game container in `onLoad()`.

## Tick

On every tick:

1. **Update** – for every layer, `update(deltaTime)` is called on each component.
   If `update()` returns `null`, the component is removed (`tileMap.removeObject()`), so this only works
   for components on OBJECT layers.
2. **Draw** – the canvas is reset, translated by `-camera.offset` and scaled by `camera.zoom`.
   Then the layers are drawn in layer id order:

   - **TILE layers** are drawn column by column, then row by row.
   - **OBJECT layers** are drawn in the order of their `data` list.

   Every `component.draw(ctx)` call is wrapped in `ctx.save()` / `ctx.restore()`.

3. Emits `system.draw` with `{ system: 'TileMapSystem', context, drawCounter }`
   (number of drawn components), which the InfoSystem shows.

Everything is redrawn every frame; there is no dirty tracking or culling of off-screen components.

## Layers

### Tile layer

- Each cell references one component (a sprite, tile or shape) by id, `0` means empty.
- The render position is computed from the cell when the component is placed and never changes.

### Object layer

- Holds a list of component ids.
- The render position is stored in the component (`x`, `y`) and can be changed at any time.

See [Game World](../game-world.md#layers) for the layer API and
[Game Assets](../game-assets.md) for spritesheets vs. tilesheets.

## Events

| Listens to | Action              |
| ---------- | ------------------- |
| `resize`   | Resizes the canvas. |

| Emits         | Payload                            |
| ------------- | ---------------------------------- |
| `system.draw` | `{ system, context, drawCounter }` |
