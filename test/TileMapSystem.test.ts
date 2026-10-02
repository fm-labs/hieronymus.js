import { describe, expect, it } from 'vitest'
import { TileMap } from '../lib/map/TileMap'
import { TileMapSystem } from '../lib/systems/TileMapSystem'
import type { IGame, IGameComponent, TileMapConfig } from '../lib/game.types'

/** A component that records its name in `drawn` when drawn. */
const makeComponent = (name: string, drawn: string[]): IGameComponent => ({
  componentType: 'Test',
  x: 0,
  y: 0,
  properties: { name },
  draw: () => drawn.push(name),
  setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  },
})

const fakeCtx = () =>
  ({
    reset: () => {},
    translate: () => {},
    scale: () => {},
    save: () => {},
    restore: () => {},
  }) as unknown as CanvasRenderingContext2D

const fakeGame = () =>
  ({
    camera: { offset: { x: 0, y: 0 }, zoom: 1 },
    eventbus: { on: () => {}, off: () => {}, emit: () => {} },
  }) as unknown as IGame

const setup = (projection: TileMapConfig['projection']) => {
  const tileMap = new TileMap({ columns: 4, rows: 4, tileSize: 64, projection })
  const canvas = { getContext: () => fakeCtx() } as unknown as HTMLCanvasElement
  const system = new TileMapSystem(fakeGame(), tileMap, canvas)
  const drawn: string[] = []
  const draw = () => {
    drawn.length = 0
    system.draw(fakeCtx())
    return [...drawn]
  }
  return { tileMap, system, drawn, draw }
}

describe('TileMapSystem draw order', () => {
  it('draws isometric tiles back-to-front by diagonal (col + row)', () => {
    const { tileMap, drawn, draw } = setup('isometric')
    tileMap.addLayer(0, { name: 'Buildings', type: 'TILE', data: [] })
    // added in an order that differs from the expected draw order
    tileMap.addTile(0, 0, 2, makeComponent('0,2', drawn)) // diagonal 2
    tileMap.addTile(0, 3, 3, makeComponent('3,3', drawn)) // diagonal 6
    tileMap.addTile(0, 1, 0, makeComponent('1,0', drawn)) // diagonal 1
    tileMap.addTile(0, 0, 0, makeComponent('0,0', drawn)) // diagonal 0

    expect(draw()).toEqual(['0,0', '1,0', '0,2', '3,3'])
  })

  it('draws orthogonal tiles row by row', () => {
    const { tileMap, drawn, draw } = setup('orthogonal')
    tileMap.addLayer(0, { name: 'Tiles', type: 'TILE', data: [] })
    tileMap.addTile(0, 0, 1, makeComponent('0,1', drawn))
    tileMap.addTile(0, 3, 0, makeComponent('3,0', drawn))
    tileMap.addTile(0, 1, 1, makeComponent('1,1', drawn))

    expect(draw()).toEqual(['3,0', '0,1', '1,1'])
  })

  it('sorts objects by their current y position', () => {
    const { tileMap, drawn, draw } = setup('isometric')
    tileMap.addLayer(0, { name: 'Objects', type: 'OBJECT', data: [] })
    const front = makeComponent('front', drawn)
    const back = makeComponent('back', drawn)
    tileMap.addObjectAtGridPos(0, 3, 3, front)
    tileMap.addObjectAtGridPos(0, 0, 0, back)
    expect(draw()).toEqual(['back', 'front'])

    // moving an object changes the order
    back.setPosition(0, 1000)
    expect(draw()).toEqual(['front', 'back'])
  })

  it('merges depthSort layers, so objects can pass behind tiles', () => {
    const { tileMap, drawn, draw } = setup('isometric')
    tileMap.addLayer(0, { name: 'Ground', type: 'TILE', data: [] })
    tileMap.addLayer(1, { name: 'Buildings', type: 'TILE', data: [], depthSort: true })
    tileMap.addLayer(2, { name: 'Objects', type: 'OBJECT', data: [], depthSort: true })
    tileMap.addLayer(3, { name: 'Overlay', type: 'OBJECT', data: [] })

    tileMap.addTile(0, 3, 3, makeComponent('ground', drawn))
    tileMap.addTile(1, 2, 2, makeComponent('building', drawn))
    tileMap.addObjectAtGridPos(2, 1, 1, makeComponent('behind', drawn))
    tileMap.addObjectAtGridPos(2, 3, 3, makeComponent('in-front', drawn))
    tileMap.addObjectAtGridPos(2, 2, 2, makeComponent('same-cell', drawn))
    tileMap.addObjectAtGridPos(3, 0, 0, makeComponent('overlay', drawn))

    expect(draw()).toEqual([
      'ground', // non-sorted layers keep their layer order
      'behind',
      'building', // ties keep layer order: tiles of layer 1 before objects of layer 2
      'same-cell',
      'in-front',
      'overlay',
    ])
  })

  it('keeps updating the remaining objects when one removes itself', async () => {
    const { tileMap, system } = setup('isometric')
    tileMap.addLayer(0, { name: 'Objects', type: 'OBJECT', data: [] })
    const updated: string[] = []
    const expiring = {
      ...makeComponent('expiring', []),
      update: () => (updated.push('expiring'), null),
    }
    const next = { ...makeComponent('next', []), update: () => void updated.push('next') }
    tileMap.addObjectAtGridPos(0, 0, 0, expiring)
    tileMap.addObjectAtGridPos(0, 1, 1, next)

    await system.tick(16)

    expect(updated).toEqual(['expiring', 'next'])
    expect(tileMap.layers[0].data).toHaveLength(1)
  })
})
