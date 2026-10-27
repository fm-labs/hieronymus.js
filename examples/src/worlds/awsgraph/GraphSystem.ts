import type { IGame, IGameSystem } from '@fmlabs/world'
import { AbstractGameSystem } from '@fmlabs/world'

const awsAccountIds = new Set<string>([
  '042427660686',
  '080763232051',
  '177345470674',
  '421445461222',
  '665944621425',
  '703382906122',
])

export class GraphSystem extends AbstractGameSystem implements IGameSystem {
  public name = 'GraphSystem'
  private readonly graphDiv: HTMLDivElement
  private readonly popupDiv: HTMLDivElement
  private isPopupVisible = false
  //private dirty = true
  private readonly _graph: AwsGraphData = { nodes: [], edges: [] }

  constructor(game: IGame, awsGraph: AwsGraphData) {
    super(game)

    this._graph = awsGraph

    const graphDiv = document.createElement('div')
    graphDiv.id = 'graphDiv'
    graphDiv.style.position = 'absolute'
    graphDiv.style.top = '5px'
    graphDiv.style.right = '5px'
    graphDiv.style.width = '320px'
    graphDiv.style.height = '100vh'
    graphDiv.style.overflowX = 'auto'
    graphDiv.style.overflowY = 'auto'
    graphDiv.style.fontFamily = 'monospace'
    graphDiv.style.fontSize = '9px'
    graphDiv.style.color = 'rgb(231,255,0)'
    graphDiv.style.opacity = '1'
    graphDiv.style.zIndex = '999999'
    graphDiv.style.backgroundColor = 'rgb(69,69,69)'
    this.graphDiv = graphDiv

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
    console.log('GraphSystem.onLoad')

    // register mouseover / mouseout event to pause / resume the game loop
    this.graphDiv.addEventListener('mouseover', () => {
      if (this._game.pause) {
        this._game?.pause()
      }
      console.log('GraphSystem.onMouseOver')
    })
    this.graphDiv.addEventListener('mouseout', () => {
      if (this._game.resume) {
        this._game?.resume()
      }
      console.log('GraphSystem.onMouseOut')
    })

    //this._game.$container.appendChild(this.graphDiv)
    this._game.$container.appendChild(this.popupDiv)

    // this._game.$container.addEventListener('mousemove', (e: MouseEvent) => {
    //   //console.log('mousemove', e)
    //   this.mousePos = { x: e.clientX, y: e.clientY }
    // })
    //
    // this._game.eventbus.on('graph.draw', (event) => {
    //   const graphName = event?.graph || 'unknown'
    //   const metricsKey = `${graphName}DrawCounter`
    //   this.metrics[metricsKey] = event?.drawCounter || 0
    // })

    this._game.eventbus.on('grid.cellClick', (cell) => {
      console.log('GraphSystem grid.cellClick', cell)
      const col = cell?.col
      const row = cell?.row
      this._game.data?.nodes?.find((node: any) => {
        if (node.pos[0] === col && node.pos[1] === row) {
          console.log('Found node for cell', node)
          this.setSelectedNode(node)
          this.showPopup(`<pre>${JSON.stringify(node, null, 2)}</pre>`)

          // Highlight node in graphDiv
          const nodeLink = this.graphDiv.querySelector(`a[href="#item-${node.id}"]`)
          if (nodeLink) {
            nodeLink.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      })
    })

    // add event listener to graphDiv links
    this.graphDiv.addEventListener('click', (e) => {
      console.log('GraphSystem.onClick')
      const target = e.target as HTMLElement
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#item-')) {
        e.preventDefault()
        const nodeId = target.getAttribute('href')?.replace('#item-', '')
        console.log('GraphSystem.onClick nodeId=', nodeId)
        if (!nodeId) return
        const node = this._graph.nodes.find((n) => String(n.id) === String(nodeId))
        console.log('GraphSystem.onClick nodeId=', nodeId, node, this._graph.nodes)
        if (node) {
          this.setSelectedNode(node as any)
          this.showPopup(`<pre>${JSON.stringify(node, null, 2)}</pre>`)
        }
      }
    })
  }

  private selectedNode: any | null = null

  private setSelectedNode(node: string) {
    this.selectedNode = node
    //this._game.eventbus.emit('node.selected', { nodeId })
  }

  public onUnload() {
    console.log('GraphSystem.onUnload')
  }

  public start() {
    console.log('GraphSystem.start')
  }

  public stop() {
    console.log('GraphSystem.stop')
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
      const url = `/?world=awsgraph&graph=/aws/graph/${accountId}.awsgraph.json`
      rows.push(
        `<tr style="background-color: #444;">
        <td colspan="2" style="text-align: left;">
          <a href="${url}">Account: ${accountId}</a>
        </td>
      </tr>`,
      )
    }

    // selected
    if (this.selectedNode) {
      rows.push(
        `<tr style="background-color: #2266AA;">
        <td colspan="2" style="text-align: left;">
          Selected: ${this.selectedNode.id} (${this.selectedNode.label})
        </td>
      </tr>`,
      )
    }

    for (let i = 0; i < this._graph.nodes.length; i++) {
      const item = this._graph.nodes[i]
      rows.push(
        `<tr style="${item.id === this.selectedNode?.id ? 'background-color: #2266AA;' : ''}">
        <td><a href="#item-${item.id}">${item.id}</a></td>
        <td style="break-inside: auto; overflow-wrap: anywhere;">${item.label}</td>
      </tr>`,
      )
    }

    this.graphDiv.innerHTML = `
<div style="overflow-y: scroll"><table><tbody>${rows.join('\n')}</tbody></table></div>
`
  }
}
