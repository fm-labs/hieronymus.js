import type { GameConfig } from '@fmlabs/world'
import { GameResourcesManager } from '@fmlabs/world'
import { Game } from '@fmlabs/world'
import { GridSystem } from '@fmlabs/world'
import { TileMapSystem } from '@fmlabs/world'
import { InputSystem } from '@fmlabs/world'
import { TileMapEditorSystem } from '@fmlabs/world'
import { InfoSystem } from '@fmlabs/world'
import awsgraphWorldBuilder from './awsgraph.world.ts'
import { CameraSystem } from '@fmlabs/world'
import { AwsInventoryItemFull } from 'cloudia-common'
import { GraphSystem } from './GraphSystem.ts'
import { GridLinesSystem } from '@fmlabs/world'
import { MechDemoSystem } from '@fmlabs/world'

const fetchData = async (url: string): Promise<AwsGraphData> => {
  return await fetch(url).then((response) => {
    return response.json()
  })
}

export const awsgraphGameLauncher = async (app: HTMLDivElement) => {
  const urlParams = new URLSearchParams(window.location.search)
  const inventoryUrl = urlParams.get('inventory') || '/aws/graph/awsgraph.json'
  const graphData: AwsGraphData = await fetchData(inventoryUrl)
  console.log('AWS Graph data:', graphData)

  // Init gamec
  const config: GameConfig = { id: 'aws', name: 'AWS Inventory Game' }
  const game = new Game(app, config)

  game.addSystem(new InputSystem(game))
  game.addSystem(new CameraSystem(game))
  //game.addSystem(new GamepadInputSystem())
  //game.addSystem(new HeroSystem(game))

  if (inventoryUrl) {
    const tileMap = await awsgraphWorldBuilder(game, graphData)
    game.addSystem(new GridLinesSystem(game, tileMap))
    game.addSystem(new TileMapSystem(game, tileMap))
    game.addSystem(new GraphSystem(game, graphData))
    game.addSystem(new GridSystem(game, tileMap))
    game.addSystem(new InfoSystem(game))
    //game.addSystem(new MechDemoSystem(game, tileMap))
  } else {
    throw new Error('No inventory URL provided')
  }

  //game.addSystem(new WebUiSystem(game, tileMap))

  return game
}
