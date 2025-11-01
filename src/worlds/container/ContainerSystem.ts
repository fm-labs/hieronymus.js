import {
  AbstractGameSystem,
  IsoHexagonComponent,
  SpriteComponent,
  IsoTextComponent,
  TileMap,
} from '../../../lib'
import { ContainerComponent } from './ContainerComponent.ts'

const buildContainerIframeUrl = (hostId: string, containerId: string): string => {
  return `http://localhost:1420/containers/${hostId}/container/${containerId}`
}

export class ContainerSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'ContainerSystem'
  private readonly inventoryDiv: HTMLDivElement
  private readonly popupDiv: HTMLDivElement
  private readonly menuDiv: HTMLDivElement

  private isPopupVisible = false
  private isMenuVisible = false

  //private dirty = true
  private readonly _api: ContainerApi
  private readonly _tileMap: ITileMap

  private _hostsInventory: any[] = [] // host[]
  private _containerInventoryMap: Map<string, any[]> = new Map() // hostId -> containers[]
  private readonly _hostLayerMap: Map<string, number> = new Map() // hostId -> layerIdx

  private _updateTimer: number | null = null
  private _activeComponent: IGameComponent | null = null

  constructor(game: IGame, worldMap: ITileMap, api: any) {
    super(game)
    this._api = api
    this._tileMap = worldMap

    const inventoryDiv = document.createElement('div')
    inventoryDiv.id = 'inventoryDiv'
    inventoryDiv.style.position = 'absolute'
    inventoryDiv.style.top = '0'
    inventoryDiv.style.right = '0'
    inventoryDiv.style.paddingRight = '1em'
    inventoryDiv.style.width = '280px'
    inventoryDiv.style.height = '100vh'
    inventoryDiv.style.maxHeight = '100vh'
    inventoryDiv.style.overflowX = 'auto'
    inventoryDiv.style.overflowY = 'auto'
    inventoryDiv.style.fontFamily = 'monospace'
    inventoryDiv.style.fontSize = '9px'
    inventoryDiv.style.color = 'rgb(231,255,0)'
    inventoryDiv.style.opacity = '1'
    inventoryDiv.style.zIndex = '99999'
    inventoryDiv.style.textAlign = 'right'
    //inventoryDiv.style.backgroundColor = 'rgb(69,69,69)'
    inventoryDiv.style.backgroundImage =
      'linear-gradient(to left, black, rgba(0,0,0,0.8) 10%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)'
    //inventoryDiv.style.backgroundImage =
    //  'linear-gradient(to bottom left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%);'
    this.inventoryDiv = inventoryDiv

    const popupDiv = document.createElement('div')
    popupDiv.id = 'popupDiv'
    popupDiv.style.position = 'absolute'
    popupDiv.style.display = 'none'
    popupDiv.style.padding = '0.1rem'
    popupDiv.style.fontFamily = 'monospace'
    popupDiv.style.fontSize = '10px'
    popupDiv.style.color = 'rgb(231,255,0)'
    popupDiv.style.backgroundColor = 'rgba(0,0,0,0.8)'
    popupDiv.style.border = '1px solid rgb(231,255,0)'
    popupDiv.style.borderRadius = '4px'
    popupDiv.style.zIndex = '1000000'
    popupDiv.style.backgroundColor = 'rgb(69,69,69)'
    popupDiv.style.top = '0x'
    popupDiv.style.left = '0'
    popupDiv.style.width = '40vw'
    popupDiv.style.height = '100vh'
    popupDiv.style.overflowX = 'auto'
    popupDiv.style.overflowY = 'scroll'
    // make the popupDiv resizable by the user
    popupDiv.style.resize = 'both'

    this.popupDiv = popupDiv
    this.popupDiv.addEventListener('click', () => {
      this.hidePopup()
    })

    const menuDiv = document.createElement('div')
    menuDiv.id = 'menuDiv'
    menuDiv.style.position = 'absolute'
    menuDiv.style.bottom = '5px'
    menuDiv.style.right = '5px'
    menuDiv.style.fontFamily = 'monospace'
    menuDiv.style.fontSize = '10px'
    menuDiv.style.color = 'rgb(231,255,0)'
    menuDiv.style.backgroundColor = 'rgba(0,0,0,0.5)'
    menuDiv.style.padding = '5px'
    menuDiv.style.borderRadius = '4px'
    menuDiv.style.zIndex = '1000000'
    menuDiv.innerHTML = `
      <button id="refreshContainersButton">Refresh Containers</button>
    `
    const refreshContainersButton = menuDiv.querySelector<HTMLButtonElement>(
      '#refreshContainersButton',
    )
    refreshContainersButton?.addEventListener('click', async () => {
      console.log('Refresh Containers button clicked')
      await this.updateHosts()
      this.draw()
    })
    this.menuDiv = menuDiv
  }

  public onLoad() {
    console.log('ContainerSystem.onLoad')

    // INVENTORY DIV
    // register mouseover / mouseout event to pause / resume the game loop
    this.inventoryDiv.addEventListener('mouseover', (e) => {
      // make sure the mouse is really over the inventoryDiv
      if (e.relatedTarget && this.inventoryDiv.contains(e.relatedTarget as Node)) {
        return
      }
      this._game.pause()
      console.log('ContainerSystem.onMouseOver')
    })
    this.inventoryDiv.addEventListener('mouseout', (e) => {
      // make sure the mouse is really over the inventoryDiv
      if (e.relatedTarget && this.inventoryDiv.contains(e.relatedTarget as Node)) {
        return
      }
      //this._game.resume()
      setTimeout(() => this._game.resume(), 50)
      console.log('ContainerSystem.onMouseOut')
    })

    // POPUP DIV
    // register mouseover / mouseout event to pause / resume the game loop
    this.popupDiv.addEventListener('mouseover', (e) => {
      // check if mouse is over the popupDiv
      if (e.relatedTarget && this.popupDiv.contains(e.relatedTarget as Node)) {
        return
      }
      this._game.pause()
      console.log('ContainerSystem.onMouseOver')
    })
    this.popupDiv.addEventListener('mouseout', (e) => {
      // check if mouse is over the popupDiv
      if (e.relatedTarget && this.popupDiv.contains(e.relatedTarget as Node)) {
        return
      }
      //this._game.resume()
      setTimeout(() => this._game.resume(), 50)
      console.log('ContainerSystem.onMouseOut')
    })

    this._game.$container.appendChild(this.inventoryDiv)
    this._game.$container.appendChild(this.popupDiv)
    this._game.$container.appendChild(this.menuDiv)

    // this._game.$container.addEventListener('mousemove', (e: MouseEvent) => {
    //   //console.log('mousemove', e)
    //   this.mousePos = { x: e.clientX, y: e.clientY }
    // })
    //
    // this._game.eventbus.on('inventory.draw', (event) => {
    //   const inventoryName = event?.inventory || 'unknown'
    //   const metricsKey = `${inventoryName}DrawCounter`
    //   this.metrics[metricsKey] = event?.drawCounter || 0
    // })

    this._game.eventbus.on('grid.cellHover', (cell) => {
      console.log('ContainerSystem grid.cellHover', cell)
      const col = cell?.col
      const row = cell?.row

      const component: ContainerComponent | null = this.findContainerComponentAt(col, row)
      if (component) {
        console.log('Found component for cell', component)

        //this.showPopup(`<pre>${JSON.stringify(component?.data, null, 2)}</pre>`)
        component.setTextVisible(true)
        setTimeout(() => {
          component.setTextVisible(false)
        }, 5000)
      }
    })

    this._game.eventbus.on('grid.cellClick', (cell) => {
      console.log('ContainerSystem grid.cellClick', cell)
      const col = cell?.col
      const row = cell?.row

      // const tilemap: TileMap = this._tileMap as TileMap
      // this._hostLayerMap.forEach((layerId: number) => {
      //   console.log('Checking layer', layerId + 1, 'for cell', col, row)
      //   const component: ContainerComponent | undefined = tilemap.getTile(
      //     layerId + 1,
      //     col,
      //     row,
      //   ) as ContainerComponent
      //   if (component) {
      //     console.log('Found component for cell', component)
      //     this.showPopup(`<pre>${JSON.stringify(component?.data, null, 2)}</pre>`)
      //   }
      // })
      const component: ContainerComponent | null = this.findContainerComponentAt(col, row)
      if (component) {
        console.log('Found component for cell', component)
        //this.showPopup(`<pre>${JSON.stringify(component?.data, null, 2)}</pre>`)
        const containerIframeUrl = buildContainerIframeUrl(
          component.properties?.hostId || '',
          component.properties?.container?.Id || '',
        )
        console.log('Container iframe url:', containerIframeUrl)
        if (containerIframeUrl) {
          this.showPopupIframe(containerIframeUrl)
        }

        if (this._activeComponent && this._activeComponent !== component) {
          if (this._activeComponent instanceof ContainerComponent) {
            this._activeComponent.setTextVisible(false)
          }
        }
        this._activeComponent = component
      }
    })

    this.initHosts()
    this._updateTimer = window.setInterval(async () => {
      await this.updateHosts()
    }, 30000)
  }

  private findContainerComponentAt = (col: number, row: number): ContainerComponent | null => {
    const tilemap: TileMap = this._tileMap as TileMap
    const _components: ContainerComponent[] = []

    this._hostLayerMap.forEach((layerId: number) => {
      //console.log('Checking layer', layerId + 1, 'for cell', col, row)
      const component: ContainerComponent | undefined = tilemap.getTile(
        layerId + 1,
        col,
        row,
      ) as ContainerComponent
      if (component) {
        console.log('Found component for cell', component)
        //this.showPopup(`<pre>${JSON.stringify(component?.data, null, 2)}</pre>`)
        //return component
        _components.push(component)
        return
      }
    })
    return _components ? _components[0] : null
  }

  private initHosts = async () => {
    const containerHosts: any[] = await this._api.getContainerHosts()
    console.log(containerHosts)
    for (let h = 0; h < containerHosts.length; h++) {
      const host = containerHosts[h]
      const hostLayerIdx = 10 + h * 3
      this._hostLayerMap.set(host.id, hostLayerIdx)
      this._tileMap.addLayer(hostLayerIdx, {
        name: `Host_Underground_${host.id}`,
        type: 'TILE',
        data: [],
      })
      this._tileMap.addLayer(hostLayerIdx + 1, {
        name: `Host_Tiles_${host.id}`,
        type: 'TILE',
        data: [],
      })
      this._tileMap.addLayer(hostLayerIdx + 2, {
        name: `Host_Objects_${host.id}`,
        type: 'OBJECT',
        data: [],
      })
    }
    this._hostsInventory = containerHosts
    this.draw() // draw info panel
    await this.updateHosts()
  }

  private updateHosts = async () => {
    for (let h = 0; h < this._hostsInventory.length; h++) {
      const host = this._hostsInventory[h]
      console.log('Updating host:', host.id)
      let hostContainers: any[]
      try {
        hostContainers = await this._api.getContainerHostContainers(host.id)
      } catch (e) {
        hostContainers = []
        console.error('Failed to fetch containers for host', host.id, e)
      }
      this._containerInventoryMap.set(host.id, hostContainers)

      const layerIdx = this._hostLayerMap.get(host.id)
      await this.renderContainerHostWorld({
        index: h,
        layerIdx: layerIdx!,
        host: host,
        containers: hostContainers,
      })
      this.draw() // redraw info panel
    }

    this.draw() // redraw info panel
    console.log('Updating container world')
  }

  private renderContainerHostWorld = async (hostData: {
    index: number
    layerIdx: number
    host: any
    containers: any[]
  }) => {
    const containerInventory: any[] = hostData?.containers || []
    const host = hostData.host

    const idx = hostData.index
    const undergroundLayerIdx = hostData.layerIdx
    const buildingLayerIdx = undergroundLayerIdx + 1
    const objectLayerIdx = undergroundLayerIdx + 2

    // console.log(
    //   'Render Container Host Layer:',
    //   host.id,
    //   idx,
    //   undergroundLayerIdx,
    //   containerInventory.length,
    // )
    this._tileMap.clearLayer(undergroundLayerIdx)
    this._tileMap.clearLayer(buildingLayerIdx)
    this._tileMap.clearLayer(objectLayerIdx)

    //let rowNr = 0 + worldMap.activeCellPos[0]
    //let colNr = 0 + worldMap.activeCellPos[1]
    const rowNrStart = undergroundLayerIdx - 10
    const rowNr = rowNrStart
    let colNr = 0

    //console.log('Adding host tile at', layerIdx, colNr, rowNr)
    this._tileMap.addTile(
      buildingLayerIdx,
      colNr,
      rowNr,
      new IsoHexagonComponent({
        tileSize: this._tileMap.tileWidth,
        depth: 16,
        sideLength: this._tileMap.tileWidth / 3,
      }),
    )
    this._tileMap.addTile(
      buildingLayerIdx,
      colNr,
      rowNr,
      new SpriteComponent({
        tileSize: this._tileMap.tileWidth,
        spriteId: 7,
        data: {},
      }),
    )
    colNr++

    //console.log(containerInventory)
    containerInventory.forEach((container: any) => {
      let tileColor = 'rgb(219,136,237)'
      const status = container?.State?.Status?.toLowerCase() || 'unknown'
      if (status === 'running') {
        tileColor = 'rgb(136,237,149)'
      } else if (status === 'exited') {
        tileColor = 'rgb(237,136,136)'
      }

      this._tileMap.createTile(undergroundLayerIdx, colNr, rowNr, { backgroundColor: tileColor })
      //console.log('Adding container tile at', idx, colNr, rowNr, 'Status:', status)
      this._tileMap.addTile(
        buildingLayerIdx,
        colNr,
        rowNr,
        new ContainerComponent({
          tileSize: this._tileMap.tileWidth,
          width: this._tileMap.tileWidth / 2,
          depth: 32,
          //text: 'M4',
          animated: container?.State?.Status?.toLowerCase() === 'running',
          container: container,
          hostId: host.id,
        }),
      )

      colNr++
      // if (colNr >= 6) {
      //   colNr = 1
      //   rowNr++
      // }
    })

    this._tileMap.addObjectAtGridPos(
      objectLayerIdx,
      0, // col
      rowNrStart,
      new IsoTextComponent({
        text: `${host.id}`,
        font: '24px Tektur',
        orientation: 'horizontal',
        skewOrientation: 'flat',
        color: 'rgb(231,255,255)',
      }),
    )

    //worldMap.activeCellPos = [rowNr, colNr]
    // move active cell position down by 1 row and reset column to 0
    //worldMap.activeCellPos[0] += 2
    //worldMap.activeCellPos[1] = 0
  }

  public onUnload() {
    console.log('ContainerSystem.onUnload')
    if (this._updateTimer) {
      window.clearInterval(this._updateTimer)
      this._updateTimer = null
    }
  }

  public start() {
    console.log('ContainerSystem.start')
  }

  public stop() {
    console.log('ContainerSystem.stop')
  }

  public async tick() {
    //we draw only on demand
    //this.draw()
  }

  private showPopup(html: string) {
    if (this.isPopupVisible) {
      this.hidePopup()
      this.isPopupVisible = false
    }

    //this.popupDiv.style.left = `${x + 10}px`
    //this.popupDiv.style.top = `${y + 10}px`
    this.popupDiv.innerHTML = html
    this.popupDiv.style.display = 'block'
    this.isPopupVisible = true
  }

  private showPopupIframe(url: string) {
    if (this.isPopupVisible) {
      this.hidePopup()
      this.isPopupVisible = false
    }

    this.popupDiv.innerHTML = `<div>
      <div style="cursor: pointer; text-align: right">Close</div>
      <iframe src="${url}" style="width:100%; height:100vh; border:none;"></iframe>
    </div>`
    this.popupDiv.style.display = 'block'
    this.isPopupVisible = true
  }

  private hidePopup() {
    this.popupDiv.style.display = 'none'
  }

  public draw() {
    const rows = []
    // for (const hostId of hostIds) {
    //   const url = `/?world=container&host=${hostId}`
    //   rows.push(
    //     `<tr style="background-color: #444;">
    //     <td colspan="2" style="text-align: left;">
    //       <a href="${url}">Account: ${hostId}</a>
    //     </td>
    //   </tr>`,
    //   )
    // }

    for (let i = 0; i < this._hostsInventory.length; i++) {
      const host = this._hostsInventory[i]
      rows.push(
        `<tr>
          <td style="text-decoration: underline">${host.id} 🐳</td>
        </tr>`,
      )
      const _containers = this._containerInventoryMap.get(host.id) || []
      _containers.forEach((container: any) => {
        const status = container?.State?.Status || 'unknown'
        rows.push(
          `<tr style="">
            <td style="padding-left: 10px;">
              <span>${container?.State?.Health?.Status === 'healthy' ? '💚' : ''}</span>
              <span>${container?.State?.Health?.Status === 'unhealthy' ? '❤️‍🩹' : ''}</span>
              <span>${container?.Name || 'unnamed'} 📦</span>
            </td>
            <td>${status}</td>
          </tr>`,
        )
      })
    }

    this.inventoryDiv.innerHTML = `
<div style="margin: auto; text-align: right">╭∩╮( •̀_•́ )╭∩╮</div>
<div style="overflow-y: scroll; max-height: 70%"><table style="width: 100%"><tbody>${rows.join('\n')}</tbody></table>
</div>
`
  }
}
