import type { GameComponentProperties, IGameComponent } from '@fmlabs/hieronymus'
import { AbstractGameComponent } from '@fmlabs/hieronymus'
import { drawIsoBox } from '../isocity/isocity.draw.ts'
import { drawFaceRect, shadeHex } from '../isocasino/isocasino.draw.ts'
import { cellPoint, noise, TEAM_COLORS, type SoccerScene } from './isosoccer.draw.ts'

export type StructureKind = 'boards' | 'stand' | 'corner' | 'dugout' | 'floodlight'

export interface IsoSoccerStructureComponentProps extends GameComponentProperties {
  tileSize: number
  kind: StructureKind
  col: number
  row: number
  /**
   * Where the pitch is, seen from this cell: 'row' if it is towards +rows or -rows (a long side),
   * 'col' if towards +cols or -cols (behind a goal)
   */
  facing: 'row' | 'col'
  /** +1 if the pitch is towards larger rows / cols */
  towards: 1 | -1
  /** Stands: 0 is the front row */
  tier: number
  scene: SoccerScene
}

const AD_COLORS = ['#ffca28', '#e53935', '#1e88e5', '#212121', '#43a047', '#fb8c00']
const STEP = 8
const STEPS = 3

/** Ad boards, stands with a crowd, dugouts and floodlight masts; one cell each */
export class IsoSoccerStructureComponent extends AbstractGameComponent implements IGameComponent {
  declare properties: IsoSoccerStructureComponentProps

  public readonly componentType: string = 'IsoSoccerStructure'

  constructor(properties: IsoSoccerStructureComponentProps) {
    super(properties)
  }

  update(deltaTime: number): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    switch (this.properties.kind) {
      case 'boards':
        return this.drawBoards(ctx)
      case 'stand':
        return this.drawStand(ctx)
      case 'corner':
        return this.box(ctx, 0.5, 0.5, 1, 1, STEP * STEPS * 2 + 10, '#8d8a84')
      case 'dugout':
        return this.drawDugout(ctx)
      case 'floodlight':
        return this.drawFloodlight(ctx)
    }
  }

  /** A box centered at (c, r) in the cell, of cols x rows cells */
  private box(
    ctx: CanvasRenderingContext2D,
    c: number,
    r: number,
    cols: number,
    rows: number,
    height: number,
    color: string,
    elevation = 0,
  ) {
    const { tileSize } = this.properties
    const [x, y] = cellPoint(tileSize, this.x, this.y, c, r)
    drawIsoBox(ctx, tileSize, x, y, { cols, rows, height, color, elevation })
  }

  /** (along, across): along the side of the pitch, and away from it; 0..1 in the cell */
  private local(along: number, across: number): [number, number] {
    const { facing, towards } = this.properties
    const away = towards === 1 ? 1 - across : across
    return facing === 'row' ? [along, away] : [away, along]
  }

  private drawBoards(ctx: CanvasRenderingContext2D) {
    const { tileSize, col, row, facing } = this.properties
    // one sponsor every three cells
    const band = Math.floor((facing === 'row' ? col : row) / 3)
    const color = AD_COLORS[band % AD_COLORS.length]
    const [c, r] = this.local(0.5, 0.15)
    const cols = facing === 'row' ? 1 : 0.08
    const rows = facing === 'row' ? 0.08 : 1
    const height = tileSize * 0.16
    this.box(ctx, c, r, cols, rows, height, color)
    // a white logo stripe on the faces we can see
    const [x, y] = cellPoint(tileSize, this.x, this.y, c, r)
    const a = cellPoint(tileSize, x, y, -cols / 2, rows / 2, height)
    const b = cellPoint(tileSize, x, y, cols / 2, rows / 2, height)
    const d = cellPoint(tileSize, x, y, cols / 2, -rows / 2, height)
    if (facing === 'row') drawFaceRect(ctx, a, b, 0.2, 0.8, height * 0.35, height * 0.6, '#fafafa')
    else drawFaceRect(ctx, b, d, 0.2, 0.8, height * 0.35, height * 0.6, '#fafafa')
  }

  private drawStand(ctx: CanvasRenderingContext2D) {
    const { facing, tier } = this.properties
    const base = tier * STEP * STEPS
    const seat = facing === 'col' ? '#b71c1c' : '#37474f'
    // steps from the back (highest) to the front, so the front ones are drawn last
    for (let k = 0; k < STEPS; k++) {
      const across = 1 - (k + 0.5) / STEPS
      const [c, r] = this.local(0.5, across)
      const cols = facing === 'row' ? 1 : 1 / STEPS
      const rows = facing === 'row' ? 1 / STEPS : 1
      const height = base + (STEPS - k) * STEP
      this.box(ctx, c, r, cols, rows, height, k % 2 ? seat : shadeHex(seat, 0.08))
      this.drawFans(ctx, across, height, k)
    }
    if (tier === 1) {
      // the back wall of the stand
      const [c, r] = this.local(0.5, 0.97)
      const cols = facing === 'row' ? 1 : 0.06
      const rows = facing === 'row' ? 0.06 : 1
      this.box(ctx, c, r, cols, rows, base + STEPS * STEP + 14, '#9e9a92')
    }
  }

  /** A row of spectators on a step */
  private drawFans(ctx: CanvasRenderingContext2D, across: number, height: number, step: number) {
    const { tileSize, col, row, facing, scene } = this.properties
    const unit = tileSize / 64
    for (let i = 0; i < 4; i++) {
      // a few empty seats
      if (noise(col, row, step * 7 + i) < 0.12) continue
      const [c, r] = this.local((i + 0.5) / 4, across)
      const [x, y0] = cellPoint(tileSize, this.x, this.y, c, r, height)
      const jump =
        scene.cheer * Math.abs(Math.sin(scene.time * 9 + noise(col, row, i) * 6)) * 4 * unit
      const y = y0 - jump
      // home fans behind the goal, a mix on the main stand
      const home = facing === 'col' ? noise(col, row, i + 40) < 0.85 : noise(col, row, i + 40) < 0.5
      const team = TEAM_COLORS[home ? 0 : 1]
      const shirt = noise(col, row, i + 20) < 0.7 ? team.shirt : team.shorts
      ctx.fillStyle = shirt
      ctx.fillRect(x - 2 * unit, y - 6 * unit, 4 * unit, 5 * unit)
      ctx.beginPath()
      ctx.arc(x, y - 7.5 * unit, 1.8 * unit, 0, Math.PI * 2)
      ctx.fillStyle = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'][
        Math.floor(noise(col, row, i + 9) * 4)
      ]
      ctx.fill()
      if (scene.cheer > 0.3 && noise(col, row, i + 3) < 0.4) {
        // arms up
        ctx.fillStyle = shirt
        ctx.fillRect(x - 2.6 * unit, y - 10 * unit, 1 * unit, 4 * unit)
        ctx.fillRect(x + 1.6 * unit, y - 10 * unit, 1 * unit, 4 * unit)
      }
    }
  }

  private drawDugout(ctx: CanvasRenderingContext2D) {
    const { tileSize } = this.properties
    const h = tileSize * 0.22
    this.box(ctx, 0.5, 0.55, 1, 0.5, h * 0.35, '#263238')
    // a clear roof on two thin posts
    this.box(ctx, 0.5, 0.45, 1, 0.7, 2, '#90caf9', h)
    this.box(ctx, 0.05, 0.75, 0.05, 0.05, h, '#cfd8dc')
    this.box(ctx, 0.95, 0.75, 0.05, 0.05, h, '#cfd8dc')
  }

  private drawFloodlight(ctx: CanvasRenderingContext2D) {
    const { tileSize } = this.properties
    const height = tileSize * 3.2
    this.box(ctx, 0.5, 0.5, 0.5, 0.5, 12, '#757575')
    this.box(ctx, 0.5, 0.5, 0.12, 0.12, height, '#bdbdbd')
    // the lamp panel, and a few lamps
    this.box(ctx, 0.5, 0.5, 0.7, 0.7, 18, '#424242', height)
    const [x, y] = cellPoint(tileSize, this.x, this.y, 0.5, 0.5, height + 18)
    ctx.fillStyle = '#fffde7'
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillRect(x - 12 + i * 9, y + 4 + j * 6, 5, 3)
      }
    }
  }
}
