import { mapPackTileMap } from 'kenney-assets/map-pack'

// import * as assets2d from 'kenney-assets'
// export const spritesheets: Spritesheet[] = Object.entries(assets2d).map(([key, value]) => ({
//   name: value.name,
//   image: value.image,
//   sprites: value.sprites,
//   styles: value.styles,
// }))

export const spritesheets: Spritesheet[] = [
  // {
  //   name: 'map_pack',
  //   image: '/assets/map_pack/map_pack.sprite.png',
  //   sprites: [],
  // },
  {
    name: 'map_pack',
    image: mapPackTileMap.source,
    sprites: mapPackTileMap.sprites,
  },
]

export const getSpritesheet = (name: string): Spritesheet | undefined => {
  return spritesheets.find((spritesheet) => spritesheet.name === name)
}

export const getSprite = (spritesheet: Spritesheet, name: string): Sprite | undefined => {
  return spritesheet.sprites.find((sprite) => sprite.name === name)
}
