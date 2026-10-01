import { AbstractGameSystem } from './AbstractGameSystem.ts'
import { getGridPosFromIndex } from '../utils/gridutil.ts'
import { SpriteComponent } from '../components/SpriteComponent.ts'
import GameAssets from '../kernel/GameAssets.ts'

export class TileMapEditorSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'TileMapEditorSystem'
  private uiDiv!: HTMLDivElement
  private controlsDiv!: HTMLDivElement
  private dirty = true

  private cols: number
  //private rows: number
  //private tileSize: number

  //private _hoveredCellIdx: number | undefined
  //private _hoverTimer: any | undefined

  private _selectedCellIdx: number | undefined
  private _selectedLayerIdx: number | undefined
  private _selectedSpriteIdx: number | undefined
  private _selection: IMapSelection | undefined
  private readonly tileMap: ITileMap

  private _editorMode: 'select' | 'draw' = 'select'

  constructor(game: IGame, tileMap: ITileMap) {
    super(game)

    this.tileMap = tileMap
    this.cols = this.tileMap.columns
    //this.rows = this.tileMap.rows
    //this.tileSize = this.tileMap.tileWidth

    this.handleCellClick = this.handleCellClick.bind(this)
  }

  public onLoad() {
    console.log('WebUiSystem.onLoad')

    const uiCanvas = document.createElement('canvas')
    //const uiCtx = uiCanvas.getContext('2d')!
    uiCanvas.width = this._game.width
    uiCanvas.height = this._game.height

    const uiDiv = document.createElement('div')
    uiDiv.id = 'uiDiv'
    uiDiv.style.position = 'absolute'
    uiDiv.style.top = '0px'
    uiDiv.style.left = '0px'
    uiDiv.style.width = '320px'
    uiDiv.style.height = '100vh'
    uiDiv.style.overflowY = 'scroll'
    //uiDiv.style.pointerEvents = 'none'
    //uiDiv.style.display = 'flex'
    //uiDiv.style.flexDirection = 'row'
    uiDiv.style.backgroundColor = 'rgba(30,30,30,0.9)'
    //uiDiv.style.border = '1px solid rgba(215,6,6,0.5)'
    this.uiDiv = uiDiv
    this._game.$container.appendChild(uiDiv)

    const controlsDiv = document.createElement('div')
    controlsDiv.id = 'controlsDiv'
    controlsDiv.style.zIndex = '10000'
    controlsDiv.style.position = 'absolute'
    controlsDiv.style.top = '0px'
    controlsDiv.style.right = '0px'
    controlsDiv.style.width = '320px'
    controlsDiv.style.height = '100vh'
    controlsDiv.style.overflowY = 'scroll'
    //controlsDiv.style.pointerEvents = 'none'
    //controlsDiv.style.display = 'flex'
    //controlsDiv.style.flexDirection = 'row'
    controlsDiv.style.backgroundColor = 'rgba(37,36,36,0.8)'
    //controlsDiv.style.border = '1px solid rgba(215,6,6,0.5)'

    this.controlsDiv = controlsDiv
    this._game.$container.appendChild(controlsDiv)
  }

  public onUnload() {
    console.log('WebUiSystem.onUnload')
  }

  public start() {
    console.log('WebUiSystem.start')

    this._game.eventbus.on('grid.cellClick', this.handleCellClick)
  }

  public stop() {
    console.log('WebUiSystem.stop')

    this._game.eventbus.off('grid.cellClick', this.handleCellClick)
  }

  public async tick() {
    //console.log('WebUiSystem.update')
    // Update the UI if needed
    if (this._game.frameCount % 60 === 0 || this.dirty) {
      this.dirty = true
      this.draw()
    }
  }

  private handleCellClick(cellEvent: { index: number; col: number; row: number }) {
    console.log('WebUiSystem.handleCellClick', cellEvent, this._editorMode)

    if (this._editorMode === 'draw') {
      this._selectedCellIdx = cellEvent.index
      if (
        this._selectedSpriteIdx !== undefined &&
        this._selectedCellIdx !== undefined &&
        this._selectedLayerIdx !== undefined
      ) {
        // add sprite component to layer
        console.log(
          'add sprite component to layer',
          this._selectedLayerIdx,
          this._selectedSpriteIdx,
        )
        const _component = new SpriteComponent({
          spriteId: this._selectedSpriteIdx,
          //spriteImage: this._game.resources.sprites[this._selectedSpriteIdx], // deprecated
          tileSize: this.tileMap.tileWidth,
        })

        if (this.tileMap.layers[this._selectedLayerIdx].type === 'TILE') {
          this.tileMap.addTile(this._selectedLayerIdx, cellEvent.col, cellEvent.row, _component)
        } else {
          this.tileMap.addObjectAtGridPos(
            this._selectedLayerIdx,
            cellEvent.col,
            cellEvent.row,
            _component,
          )
        }
      } else if (this._selectedSpriteIdx !== undefined && !this._selectedLayerIdx) {
        console.warn('No layer selected, cannot add sprite to cell')
        alert('No layer selected, cannot add sprite to cell')
      }
    }

    this.dirty = true
  }

  public draw() {
    if (!this.dirty) return
    console.log('WebUiSystem.draw')

    const spriteWidth = 48
    const spriteHeight = 48

    this.uiDiv.innerHTML = ''

    const spritesContainer = document.createElement('div')
    spritesContainer.style.display = 'flex'
    spritesContainer.style.flexDirection = 'row'
    spritesContainer.style.flexWrap = 'wrap'
    spritesContainer.style.width = 320 + 'px'
    //spritesContainer.style.height = 100 + '%'
    spritesContainer.style.borderTop = '5px solid blue'

    console.log('GameAssets.sprites', GameAssets.sprites)

    Object.entries(GameAssets.sprites).forEach((entry) => {
      const spriteIdx = parseInt(entry[0])
      const { x, y, width, height, imageName, name } = entry[1]
      const spriteCanvas = document.createElement('canvas')
      spriteCanvas.width = spriteWidth
      spriteCanvas.height = spriteHeight
      spriteCanvas.style.position = 'relative'
      const spriteCanvasCtx = spriteCanvas.getContext('2d')!
      spriteCanvasCtx.drawImage(
        GameAssets.getImage(imageName),
        x,
        y,
        width,
        height,
        0,
        0,
        spriteWidth,
        spriteHeight,
      )

      const spriteDiv = document.createElement('div')
      spriteDiv.title = `${imageName} ${name} (${x}, ${y})`
      spriteDiv.style.width = `${spriteWidth}px`
      spriteDiv.style.height = `${spriteHeight}px`
      spriteDiv.style.border = '1px solid rgba(255,255,255,1)'
      spriteDiv.style.borderWidth = '0 1px 1px 0'
      spriteDiv.dataset.spriteIndex = spriteIdx.toString()
      //spriteDiv.dataset.spriteSheetName = spriteImage.url.toString()

      spriteDiv.onclick = (ev) => {
        //const $el = ev.target as HTMLDivElement
        const spriteIdx = parseInt(spriteDiv.dataset.spriteIndex!)
        if (spriteIdx === this._selectedSpriteIdx) {
          console.log('deselect sprite', spriteIdx)
          this._selectedSpriteIdx = undefined
          this._game.eventbus.emit('editor.spriteDeselect', { index: spriteIdx })
        } else {
          console.log('selectedSpriteIdx is now', spriteIdx, ev)
          this._selectedSpriteIdx = spriteIdx
          this._game.eventbus.emit('editor.spriteSelect', { index: spriteIdx })
        }

        this.dirty = true
        this.draw()

        ev.preventDefault()
        ev.stopPropagation()
      }
      if (this._selectedSpriteIdx === spriteIdx) {
        //spriteDiv.style.border = '2px solid red'
        //spriteDiv.style.borderColor = 'rgba(72,255,0,0.8)'
        spriteDiv.style.backgroundColor = 'rgba(72,255,0,0.8)'
      }
      const spriteImg = document.createElement('img')
      spriteImg.src = spriteCanvas.toDataURL('image/png')
      spriteDiv.appendChild(spriteImg)
      //spriteDiv.appendChild(spriteCanvas)
      spritesContainer.appendChild(spriteDiv)
    })
    this.uiDiv.appendChild(spritesContainer)
    if (this._editorMode !== 'draw') {
      //this.uiDiv.style.display = 'none'
      //this.uiDiv.style.visibility = 'hidden'
    } else {
      this.uiDiv.style.display = 'block'
      this.uiDiv.style.visibility = 'visible'
    }

    // controls
    this.controlsDiv.innerHTML = ''

    // Dump
    const buttonDump = document.createElement('button')
    buttonDump.textContent = 'Dump'
    buttonDump.onclick = () => {
      console.log('Dump')
      const jsonString = JSON.stringify(this.tileMap.dump(), null, 2)
      console.log(jsonString)
    }
    this.controlsDiv.appendChild(buttonDump)

    // Save
    const buttonSave = document.createElement('button')
    buttonSave.textContent = 'Save'
    buttonSave.onclick = () => {
      console.log('save')
      const jsonString = JSON.stringify(this.tileMap.dump(), null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'save.json' // Name of the file to be downloaded
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url) // Clean up the URL object

      this._game.eventbus.emit('editor.save', {
        tilemapJson: jsonString,
      })
    }
    this.controlsDiv.appendChild(buttonSave)

    // Restore
    const inputRestoreFile = document.createElement('input')
    inputRestoreFile.type = 'file'
    inputRestoreFile.accept = '.json'
    inputRestoreFile.style.display = 'none'
    inputRestoreFile.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files![0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const jsonString = event.target?.result as string
        console.log('restore', jsonString)
        const json = JSON.parse(jsonString)
        this._game.eventbus.emit('editor.restore', { tilemapJson: json })
        //this.tileMap.restore(json)
        console.warn('Restoring tilemap from JSON is not implemented yet')
      }
      reader.readAsText(file)
    }
    const buttonRestore = document.createElement('button')
    buttonRestore.textContent = 'Restore'
    buttonRestore.onclick = () => {
      //console.log('restore')
      //this._game.eventbus.emit('editor.restore', {})
      inputRestoreFile.click()
    }
    this.controlsDiv.appendChild(inputRestoreFile)
    this.controlsDiv.appendChild(buttonRestore)

    this.controlsDiv.appendChild(document.createElement('hr'))

    // Cam Reset
    const buttonCamReset = document.createElement('button')
    buttonCamReset.textContent = 'Reset camera'
    buttonCamReset.onclick = () => {
      console.log('reset camera')
      this._game.eventbus.emit('camera.reset', {})
    }
    this.controlsDiv.appendChild(buttonCamReset)

    // Cam Center
    const buttonCamCenter = document.createElement('button')
    buttonCamCenter.textContent = 'Center camera'
    buttonCamCenter.onclick = () => {
      console.log('center camera')
      this._game.eventbus.emit('camera.center', {})
    }
    this.controlsDiv.appendChild(buttonCamCenter)

    this.controlsDiv.appendChild(document.createElement('hr'))

    const buttonSelectCell = document.createElement('button')
    buttonSelectCell.textContent = 'Select Mode'
    buttonSelectCell.onclick = () => {
      console.log('select cell')
      this._editorMode = 'select'
      this._game.eventbus.emit('editor.set_mode', { mode: 'select' })
    }
    this.controlsDiv.appendChild(buttonSelectCell)

    const buttonDrawCell = document.createElement('button')
    buttonDrawCell.textContent = 'Draw Mode'
    buttonDrawCell.onclick = () => {
      console.log('select cell')
      this._editorMode = 'draw'
      this._game.eventbus.emit('editor.set_mode', { mode: 'draw' })
    }
    this.controlsDiv.appendChild(buttonDrawCell)

    this.controlsDiv.appendChild(document.createElement('hr'))

    // CELL
    const headingCell = document.createElement('div')
    headingCell.textContent = `Selected Cell: ${this._selectedCellIdx}`
    this.controlsDiv.appendChild(headingCell)

    if (this._selectedCellIdx !== undefined) {
      const gridPos = getGridPosFromIndex(this._selectedCellIdx, this.cols)
      const screenPos = this.tileMap.projection.mapGridToScreen(gridPos.col, gridPos.row)
      const cellInfo = document.createElement('div')
      cellInfo.innerHTML = `CellIdx: ${this._selectedCellIdx}`
      cellInfo.innerHTML += `<br />GridPos: ${gridPos.col},${gridPos.row}`
      cellInfo.innerHTML += `<br />ScreenPos: ${screenPos.x},${screenPos.y}`
      this.controlsDiv.appendChild(cellInfo)
    }

    // const cellLayerInfo = document.createElement('div')
    // if (this._selectedCellIdx !== undefined && this._selectedLayerIdx !== undefined) {
    //   const layerIdx = this._selectedLayerIdx
    //   const layer = this.tileMap.layers[layerIdx]
    //   if (layer.type === 'TILE') {
    //     // the data array contains component IDs where the index is the cell index
    //     const componentId = layer.data[this._selectedCellIdx] || undefined
    //     if (componentId !== undefined) {
    //       cellLayerInfo.textContent = `Components: ${componentId}`
    //       //   const component = this.tileMap.components.get(componentId)
    //       //   if (component) {
    //       //     cellLayerInfo.title = JSON.stringify(component.properties, null, 2)
    //       //   }
    //     }
    //   } else if (layer.type === 'OBJECT') {
    //     // the data array contains component IDs where the index is arbitrary
    //     // we need to find the component ID for the selected cell by checking the grid position
    //     // against the screen position of the cell
    //     const gridPos = getCellCordsFromIndex(this._selectedCellIdx, this.cols)
    //     const componentIds: number[] = this.tileMap.findObjectsAtGridPos(
    //       layerIdx,
    //       gridPos.col,
    //       gridPos.row,
    //     )
    //     // componentIds.forEach((componentId) => {
    //     //   const component = this.tileMap.components.get(componentId)
    //     //   if (component) {
    //     //     cellLayerInfo.textContent += `Selected: ${componentId}`
    //     //     cellLayerInfo.title += JSON.stringify(component.properties, null, 2) + '\n'
    //     //   }
    //     // })
    //     cellLayerInfo.textContent += `Layer Component ID: ${componentIds.join(',')}`
    //   } else {
    //     cellLayerInfo.textContent = `Layer type ${layer.type} not supported for cell selection`
    //     cellLayerInfo.title = 'Only TILE and OBJECT are supported for cell selection'
    //   }
    //   this.controlsDiv.appendChild(cellLayerInfo)
    // }

    const buttonCellClear = document.createElement('button')
    buttonCellClear.textContent = 'Clear'
    buttonCellClear.onclick = () => {
      console.log('clear cell')
      this._game.eventbus.emit('editor.clear_cell', { index: this._selectedCellIdx })
      this._selectedCellIdx = undefined
      this.dirty = true
    }
    this.controlsDiv.appendChild(buttonCellClear)

    this.controlsDiv.appendChild(document.createElement('hr'))

    // LAYERS
    const headingLayers = document.createElement('div')
    headingLayers.textContent = 'Layers'
    this.controlsDiv.appendChild(headingLayers)

    const layerInfo = document.createElement('div')
    layerInfo.textContent = `LayerIdx: ${this._selectedLayerIdx}`
    this.controlsDiv.appendChild(layerInfo)

    this.tileMap.layers.forEach((layer: TileMapLayer, layerIdx) => {
      const layerDiv = document.createElement('div')
      layerDiv.style.display = 'flex'
      layerDiv.style.flexDirection = 'row'
      layerDiv.style.justifyContent = 'flex-start'
      layerDiv.style.marginBottom = '5px'
      layerDiv.style.padding = '2px 0'
      layerDiv.style.borderBottom = '1px solid rgba(255,0,255,0.8)'
      layerDiv.style.fontSize = '12px'

      const layerIcons = document.createElement('div')
      layerIcons.style.display = 'flex'
      layerIcons.style.flexDirection = 'row'
      layerIcons.style.justifyContent = 'flex-start'

      const layerLock = document.createElement('div')
      layerLock.textContent = layer.locked ? '🔒' : '🔓'
      layerLock.title = layer.locked ? 'Layer is locked' : 'Layer is unlocked'
      layerIcons.appendChild(layerLock)

      const layerVisible = document.createElement('div')
      layerVisible.textContent = layer.visible ? '👁️' : '👁️‍🗨️'
      layerVisible.title = layer.visible ? 'Layer is visible' : 'Layer is hidden'
      layerIcons.appendChild(layerVisible)

      const layerName = document.createElement('div')
      layerName.style.fontSize = '12px'
      layerName.textContent = `${layer.name} (${layer.type}) - ${layer.data.filter((d) => d !== 0).length} comp`

      const buttonSelectLayer = document.createElement('button')
      buttonSelectLayer.textContent = 'Select'
      buttonSelectLayer.onclick = (e) => {
        console.log('select layer', layer.name)
        this._selectedLayerIdx = layerIdx
        this._game.eventbus.emit('editor.select_layer', { layer: layer.name })
        this.dirty = true
        e.stopPropagation()
        e.preventDefault()
      }

      layerDiv.appendChild(buttonSelectLayer)
      layerDiv.appendChild(layerIcons)
      layerDiv.appendChild(layerName)

      this.controlsDiv.appendChild(layerDiv)
    })

    this.dirty = false
  }
}
