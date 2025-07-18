# Systems



## TileMap System

Uses `TileSheets` with `TileMap Layer Data` to render tiles.

A `TileSheet` is like a `SpriteSheet` with the difference, that the TileSheet has fixed sized sprites.

### Layers


#### Tile Layer

- Each cell is linked to a tile from a tilesheet
- The render position is calculated from cell position
- The render position never changes

#### Object Layer

- Each object is linked to a sprite from a spritesheet
- The render position is stored in the object state
- The render position / object state can be modified

### TileSheet


### Comparison of TileSheet and SpriteSheet

|                       | SpriteSheet       | TileSheet                 |
|-----------------------|-------------------|---------------------------|
| Sprite size           | Arbitrary         | Fixed tile size           |
| Sprite image position | JSON SpriteAtlas  | Calculated from tile size |
| Sprite name           | JSON SpriteAtlas  | -                         |
|                       |                   |                           |

