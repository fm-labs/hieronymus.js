# Game Assets

Assets are loaded through `game.resources` (a `GameResourcesManager`) and cached in `GameAssets`.

!!! note
    `GameAssets` is a **global static cache**, shared by all `Game` instances on the page.
    Components look up their images in `GameAssets` directly; `game.resources` only provides the loaders.

## Loading

```typescript
const resources = game.resources

await resources.loadImage('icon1', '/assets/images/icon1.png')
await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

await resources.loadSpritesheet(
  'fm_iso_buildings',                                        // name
  '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',   // image
  '/assets/sprites/fm_iso_buildings/fm_iso_buildings.json',  // atlas
  1,                                                         // optional: first global sprite id
)

await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4) // columns, rows
```

All loaders are `async` and reject if the image cannot be loaded.
Loading an image or font with a key that is already cached is a no-op (a warning is logged).

## Spritesheets

A spritesheet is an image plus a JSON atlas of arbitrarily sized sprites:

```json
{
  "sprites": [
    { "name": "powerplant02", "x": 0,   "y": 0, "width": 300, "height": 300 },
    { "name": "skyscraper02", "x": 300, "y": 0, "width": 300, "height": 300 }
  ]
}
```

Every sprite gets a **global sprite id (gid)**, assigned in atlas order starting at the next free id.
Pass `nextgid` to start a spritesheet at a fixed id, so that ids stay stable when other spritesheets change
(it must be greater than the last assigned id). The gid is what `SpriteComponent` expects as `spriteId`.

```typescript
GameAssets.getSprite(gid)       // { imageName, name, x, y, width, height }
GameAssets.getSpriteImage(gid)  // the spritesheet image
GameAssets.sprites              // all sprites by gid (used by the TileMap editor palette)
```

## Tilesheets

A tilesheet is an image divided into a fixed grid of equally sized tiles, used for animations.
Tile size is computed from the image size: `tileWidth = image.width / columns`, `tileHeight = image.height / rows`.

```typescript
GameAssets.getTilesheet('mech-down')       // { imageName, name, tileWidth, tileHeight, columns, rows }
GameAssets.getTilesheetImage('mech-down')
```

Tilesheet tiles are not registered as sprites. The `nextgid` parameter of `loadTilesheet()` only moves
the next free global sprite id.

## Comparison

|                       | Spritesheet       | Tilesheet                    |
|-----------------------|-------------------|------------------------------|
| Sprite size           | Arbitrary         | Fixed, computed from the grid |
| Sprite position       | JSON atlas        | Computed from the grid       |
| Sprite name           | JSON atlas        | –                            |
| Addressed by          | Global sprite id  | Tilesheet name + tile index  |

## Other caches

```typescript
GameAssets.getImage(key)   // throws if not loaded
GameAssets.getFont(key)
GameAssets.loadAudio(key, url) / GameAssets.getAudio(key) // not exposed on game.resources
```
