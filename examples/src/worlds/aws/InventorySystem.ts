import type { IGame, IGameSystem } from '@fmlabs/world'
import { AbstractGameSystem } from '@fmlabs/world'
import { AwsInventoryItemFull } from 'cloudia-common'

const awsAccountIds = new Set<string>([
  '042427660686',
  '080763232051',
  '177345470674',
  '421445461222',
  '665944621425',
  '703382906122',
])

export class InventorySystem extends AbstractGameSystem implements IGameSystem {
  public name = 'InventorySystem'
  private readonly inventoryDiv: HTMLDivElement
  private readonly popupDiv: HTMLDivElement
  private isPopupVisible = false
  //private dirty = true
  private readonly _inventory: AwsInventoryItemFull[] = []

  constructor(game: IGame, awsInventory: AwsInventoryItemFull[]) {
    super(game)

    this._inventory = awsInventory

    const inventoryDiv = document.createElement('div')
    inventoryDiv.id = 'inventoryDiv'
    inventoryDiv.style.position = 'absolute'
    inventoryDiv.style.top = '5px'
    inventoryDiv.style.right = '5px'
    inventoryDiv.style.width = '320px'
    inventoryDiv.style.height = '100vh'
    inventoryDiv.style.overflowX = 'auto'
    inventoryDiv.style.overflowY = 'auto'
    inventoryDiv.style.fontFamily = 'monospace'
    inventoryDiv.style.fontSize = '9px'
    inventoryDiv.style.color = 'rgb(231,255,0)'
    inventoryDiv.style.opacity = '1'
    inventoryDiv.style.zIndex = '999999'
    inventoryDiv.style.backgroundColor = 'rgb(69,69,69)'
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
    popupDiv.style.top = '5px'
    popupDiv.style.left = '5px'
    popupDiv.style.maxWidth = '333px'
    popupDiv.style.maxHeight = '444px'
    popupDiv.style.overflowX = 'auto'
    popupDiv.style.overflowY = 'scroll'

    this.popupDiv = popupDiv
    this.popupDiv.addEventListener('click', () => {
      this.hidePopup()
    })
  }

  public onLoad() {
    console.log('InventorySystem.onLoad')

    // register mouseover / mouseout event to pause / resume the game loop
    this.inventoryDiv.addEventListener('mouseover', () => {
      if (this._game.pause) {
        this._game?.pause()
      }
      console.log('InventorySystem.onMouseOver')
    })
    this.inventoryDiv.addEventListener('mouseout', () => {
      if (this._game.resume) {
        this._game?.resume()
      }
      console.log('InventorySystem.onMouseOut')
    })

    this._game.$container.appendChild(this.inventoryDiv)
    this._game.$container.appendChild(this.popupDiv)

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

    this._game.eventbus.on('grid.cellClick', (cell) => {
      console.log('InventorySystem grid.cellClick', cell)
      const col = cell?.col
      const row = cell?.row
      this._game.data?.nodes?.find((node: any) => {
        if (node.pos.x === col && node.pos.y === row) {
          console.log('Found node for cell', node)
          this.showPopup(`<pre>${JSON.stringify(node, null, 2)}</pre>`)
        }
      })
    })
  }

  public onUnload() {
    console.log('InventorySystem.onUnload')
  }

  public start() {
    console.log('InventorySystem.start')
  }

  public stop() {
    console.log('InventorySystem.stop')
  }

  public async tick() {
    this.draw()
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

  private hidePopup() {
    this.popupDiv.style.display = 'none'
  }

  public draw() {
    const rows = []
    for (const accountId of awsAccountIds) {
      const url = `/?world=aws&inventory=/aws/data/${accountId}.json`
      rows.push(
        `<tr style="background-color: #444;">
        <td colspan="2" style="text-align: left;">
          <a href="${url}">Account: ${accountId}</a>
        </td>
      </tr>`,
      )
    }

    for (let i = 0; i < this._inventory.length; i++) {
      const item = this._inventory[i]
      rows.push(
        `<tr>
        <td>${item.resource_type}</td>
        <td>${item.name}</td>
      </tr>`,
      )
    }

    this.inventoryDiv.innerHTML = `
<div style="overflow-y: scroll"><table><tbody>${rows.join('\n')}</tbody></table></div>
`
  }
}
