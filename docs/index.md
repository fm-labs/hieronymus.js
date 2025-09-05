# Welcome


!!! info "Lorem ipsum"

    Lorem ipsum dolor sit amet, consectetur
    adipiscing elit. Nulla et euismod nulla.
    Curabitur feugiat, tortor non consequat
    finibus, justo purus auctor massa, nec
    semper lorem quam in massa.



## Quick Start

```javascript
const app = document.querySelector < HTMLDivElement > ('#app')

const resources = new GameResourcesManager()
// init spritesheets
await resources.loadSpritesheet(
  'fm_iso_buildings',
  '/assets/sprites/fm_iso_buildings/fm_iso_buildings.png',
  1,
)
await resources.loadSpritesheet(
  'fm_iso_pyramids',
  '/assets/sprites/fm_iso_pyramids/fm_iso_pyramids.png',
  32,
)
// init tilesets
await resources.loadTilesheet('mech-up', '/assets/sprites/mechanoid/Walk_Body_045.png', 6, 4, 64)
await resources.loadTilesheet('mech-left', '/assets/sprites/mechanoid/Walk_Body_135.png', 6, 4)
await resources.loadTilesheet('mech-down', '/assets/sprites/mechanoid/Walk_Body_225.png', 6, 4)
await resources.loadTilesheet('mech-right', '/assets/sprites/mechanoid/Walk_Body_315.png', 6, 4)
// init font resources
await resources.loadFont('BungeeSpice', '/assets/fonts/Bungee_Spice/BungeeSpice-Regular.ttf')
await resources.loadFont('Tektur', '/assets/fonts/Tektur/Tektur-VariableFont_wdth,wght.ttf')

// Init game
const gameConfig = { name: 'My Game' }
const game = new Game(app, gameConfig, worldMap, resources)

game.addSystem(new DebugSystem())
game.addSystem(new GridSystem(game))
game.addSystem(new TileMapSystem(game))
game.addSystem(new HeroSystem(game))
game.addSystem(new InputSystem(game))
game.addSystem(new GamepadSystem())
game.addSystem(new TileMapEditorSystem(game))
game.addSystem(new InfoSystem(game))

await game.run()

```
