# Game World

The world is a `TileMap`: a fixed-size grid with a list of layers. Layers do not hold objects directly,
they hold **component ids** that point into the tile map's `ComponentManager`
(see [Game Components](game-components.md)).

## TileMap

```typescript
const tileMap = new TileMap({
  columns: 30,
  rows: 30,
  tileSize: 64,
  projection: 'isometric', // or 'orthogonal'
})
```

| Property          | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `columns`, `rows` | Grid size in cells.                                                             |
| `tileWidth`       | `tileSize`                                                                      |
| `tileHeight`      | `tileSize / 2` (also for orthogonal maps, where it is unused by the projection) |
| `projection`      | The grid projection, see below.                                                 |
| `layers`          | The layers, indexed by layer id.                                                |
| `components`      | The `ComponentManager` holding all components of the map.                       |

!!! warning
    `'dimetric'` is accepted by the `TileMapConfig` type and a `DimetricGridProjection` class exists,
    but `TileMap` does not support it yet and throws `Unsupported projection type`.

## Layers

Layers are added with an explicit numeric id. The id is also the draw order: layer 0 is drawn first.

```typescript
tileMap.addLayer(0, { name: 'Ground', type: 'TILE', data: [] })
tileMap.addLayer(1, { name: 'Buildings', type: 'TILE', data: [], depthSort: true })
tileMap.addLayer(2, { name: 'Characters', type: 'OBJECT', data: [], depthSort: true })
tileMap.addLayer(3, { name: 'Labels', type: 'OBJECT', data: [] })
```

`addLayer()` initializes `data`, so any value passed in is replaced.

### Draw order and depth sorting

Within a layer, components are drawn back to front (painter's algorithm), sorted by their screen `y` position.
For isometric maps `y` grows with `col + row`, so cells are drawn diagonal by diagonal;
for orthogonal maps they are drawn row by row. Objects are sorted by their **current** position every frame,
so moving objects are ordered correctly.

Layer order still wins over depth: a character on a later layer is always drawn over a building on an earlier one.
To let things pass behind each other across layers, set `depthSort: true` on those layers:

- All `depthSort` layers are merged and sorted together by `y`, and drawn at the position of the
  **first** `depthSort` layer.
- On equal `y`, components keep their layer order (and their order within the layer).
- Only use it for things that stand up from the ground (buildings, trees, characters).
  Flat layers (ground, roads) must not be depth-sorted, or ground tiles further down the screen
  would be drawn over the feet of characters standing above them.

The sort key is the component's anchor position (`x`, `y`) as set by the tile map / `setPosition()`,
so components should be anchored consistently relative to their cell.

### TILE layer

- `data` has one entry per cell (`columns × rows`, row-major, see `getCellIndex(col, row, columns)`).
- Each entry is a component id, or `0` for an empty cell.
- A tile's screen position is computed from its cell when it is placed and does not change.

```typescript
tileMap.addTile(0, col, row, new SpriteComponent({ tileSize: 64, spriteId: 1 })) // returns the component id
tileMap.assignTile(0, col, row, componentId) // put an existing component into a cell
tileMap.getTile(0, col, row) // -> IGameComponent | undefined
tileMap.resetTile(0, col, row) // empty the cell
```

`createTile(layerId, col, row, properties)` is deprecated; it creates a `TileComponent` from the given properties.

### OBJECT layer

- `data` is a plain list of component ids, drawn in list order.
- The object is placed at the screen position of a cell, but it can move freely afterwards (`setPosition()`).

```typescript
const id = tileMap.addObjectAtGridPos(1, col, row, component)
tileMap.findObjectsAtGridPos(1, col, row) // ids of objects whose position matches the cell
tileMap.removeObject(1, id)
```

### Other layer operations

```typescript
tileMap.getLayer(layerId)
tileMap.clearLayer(layerId)
tileMap.removeLayer(layerId) // note: splices the array, so ids of later layers shift
```

`layer.locked` and `layer.visible` are shown in the TileMap editor but are not yet evaluated when drawing.

## Saving and restoring

```typescript
const dump = tileMap.dump() // { config, resources: null, layers, components }
// components: [{ id, componentType, properties }]
```

The TileMap editor's **Save** button downloads this dump as `save.json`.

!!! warning "Restore is incomplete"
    `new TileMap(dump.config, dump.layers, dump.components)` recreates the components via
    `ComponentManager.restore()`, but the dump does not contain component positions (`x`, `y`),
    so restored components are drawn at `(0, 0)` until they are placed again.
    Only the types known to `ComponentManager.createComponent()` can be restored:
    `Tile`, `Text` (IsoText), `Sprite`, `IsoCube`, `IsoHexagon`, `IsoCylinder`.
    The editor's **Restore** button reads the file and emits `editor.restore`, but nothing handles it yet.

## Projections

A projection converts between grid cells and world (pre-camera) screen coordinates.

```typescript
interface IGrid2DProjection {
  mapGridToScreen(col: number, row: number): { x: number; y: number }
  mapScreenToGrid(x: number, y: number): { col: number; row: number }
  getGridDimensions(): { width: number; height: number }
}
```

| Projection | `mapGridToScreen(col, row)`                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| Orthogonal | `x = col · tileSize`, `y = row · tileSize`                                       |
| Isometric  | `x = (col − row) · tileWidth/2`, `y = (col + row) · tileHeight/2` (2:1 diamonds) |

The same math is available as functions in `utils/gridutil`:
`isometricGridToScreen`, `isometricScreenToGrid`, `orthogonalGridToScreen`, `orthogonalScreenToGrid`,
plus `getCellIndex`, `getGridPosFromIndex` and `findCellNeighbors`.

In an isometric map, cell `(0, 0)` is at `x = 0`, and the map extends to the left and right of it.

## Camera

The camera is stored on the game and applied by every drawing system:

```typescript
type Camera2D = {
  offset: { x: number; y: number }
  zoom: number
}
```

Drawing systems translate by `-camera.offset` and then scale by `camera.zoom`.
To convert a mouse position to a world position:

```typescript
const worldX = (mouseX + camera.offset.x) / camera.zoom
const worldY = (mouseY + camera.offset.y) / camera.zoom
```

The camera is controlled by the [CameraSystem](game-systems/camera-system.md).
