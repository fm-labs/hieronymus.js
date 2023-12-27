import { getCellIndex, getIsometricGridPosition } from '../../lib/kernel/util.ts'

export class InfoSystem implements IGameSystem {
  public name = 'InfoSystem'
  private game!: IGame
  private infoDiv!: HTMLDivElement

  public onLoad(game: IGame) {
    console.log('InfoSystem.onLoad')
    this.game = game

    const infoDiv = document.createElement('div')
    infoDiv.id = 'infoDiv'
    infoDiv.style.position = 'fixed'
    infoDiv.style.bottom = '10px'
    infoDiv.style.right = '10px'
    infoDiv.style.background = 'black'
    infoDiv.style.padding = '0.1rem'
    infoDiv.style.fontFamily = 'monospace'
    infoDiv.style.fontSize = '10px'
    this.infoDiv = infoDiv

    const systemDiv = document.createElement('div')
    systemDiv.id = 'systemDiv'
    systemDiv.style.position = 'absolute'
    systemDiv.style.top = '0px'
    systemDiv.style.right = '0px'
    systemDiv.style.width = '320px'
    systemDiv.style.height = '100vh'
    systemDiv.style.overflowX = 'ellipsis'
    systemDiv.style.overflowY = 'scroll'
    systemDiv.style.fontFamily = 'monospace'
    systemDiv.style.fontSize = '10px'
    systemDiv.style.color = 'rgba(211,211,211,0.93)'
    systemDiv.style.opacity = '0.8'

    const logDiv = document.createElement('div')
    logDiv.id = 'logDiv'
    systemDiv.appendChild(logDiv)

    this.game.$container.appendChild(infoDiv)
    //this.game.$container.appendChild(systemDiv)
  }

  public onUnload() {
    console.log('InfoSystem.onUnload')
  }

  public start() {
    console.log('InfoSystem.start')
    const mainCanvas = this.game.$canvas
    console.log('mainCanvas', mainCanvas)
    mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
  }

  public handleMouseMove(e: MouseEvent) {
    const mainCanvas = this.game.$canvas
    const rect = mainCanvas.getBoundingClientRect()

    const offsetX = mainCanvas.width / 2 /* - (this.game.rows / 2) * this.game.twidth */
    const offsetY = mainCanvas.height / 2 - (this.game.cols / 2) * this.game.theight
    const x = e.clientX - rect.left - offsetX
    const y = e.clientY - rect.top - offsetY

    const pos = getIsometricGridPosition(x, y, this.game.twidth)
    const index = getCellIndex(pos.col, pos.row, this.game.cols)
    //const tileInfo = index >= 0 ? this.game.getTilePath(tiles[index]) : null

    //console.log('handleMouseMove', x, y, index)
    if (this.infoDiv) {
      this.infoDiv.textContent = `Mouse: ${e.clientX.toFixed(2)},${e.clientY.toFixed(2)}
      CanvasMouse: ${x.toFixed(2)},${y.toFixed(2)}
      GRIDPOS: [${pos.col},${pos.row}]
    Hovered Tile Index: ${index}, Path: ${'?' /*JSON.stringify(tileInfo)*/}
    Last Clicked Tile Info: ${'?' /*JSON.stringify(lastClickedTileInfo)*/}`
    }
  }

  public stop() {
    console.log('InfoSystem.stop')
  }

  public update() {
    console.log('InfoSystem.update')
  }

  public draw() {
    console.log('InfoSystem.draw')
  }
}
