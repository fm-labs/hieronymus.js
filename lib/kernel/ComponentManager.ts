import { TileComponent, TileComponentProps } from '../components/TileComponent.ts'
import { TextComponent, TextComponentProps } from '../components/TextComponent.ts'
import { IsoCubeComponent, IsoCubeComponentProps } from '../components/IsoCubeComponent.ts'
import { SpriteComponent, SpriteComponentProps } from '../components/SpriteComponent.ts'
import { IsoHexagonComponent, IsoHexagonComponentProps } from '../components/IsoHexagonComponent.ts'
import {
  IsoCylinderComponent,
  IsoCylinderComponentProps,
} from '../components/IsoCylinderComponent.ts'

export class ComponentManager implements IComponentManager {
  private readonly _components: Map<number, IGameComponent> = new Map()
  private _lastId = 0

  constructor() {}

  add(component: IGameComponent, nextId?: number): number {
    const _nextId = nextId || this._lastId + 1
    //console.log(`Adding component with ID ${_nextId} of type ${component.componentType}`)
    if (_nextId < this._lastId) throw new Error('nextId must be greater than previous')

    this._components.set(_nextId, component)
    return (this._lastId = _nextId)
  }

  get(id: number): IGameComponent | undefined {
    return this._components.get(id) || undefined
  }

  set(id: number, c: IGameComponent): void {
    this._components.set(id, c)
  }

  remove(id: number): void {
    if (!this._components.has(id)) {
      throw new Error(`Component with ID ${id} does not exist`)
    }
    this._components.delete(id)
  }

  findByName(name: string): IGameComponent | undefined {
    for (const component of this._components.values()) {
      if (component?.properties?.name === name) {
        return component
      }
    }
    return undefined
  }

  all(): { [key: number]: IGameComponent } {
    const result: { [key: number]: IGameComponent } = {}
    for (const [key, value] of this._components.entries()) {
      result[key] = value
    }
    return result
  }

  dump(): any {
    const dump: any[] = []
    for (const [key, value] of this._components.entries()) {
      dump.push({
        id: key,
        componentType: value.componentType,
        properties: value.properties,
      })
    }
    return dump
  }

  restore(dump: any[]): void {
    this._components.clear()
    this._lastId = 1

    for (const c of dump) {
      const component = this.createComponent(c.componentType, c.properties)
      if (component) {
        //component.setPosition(c.properties.x || 0, c.properties.y || 0)
        this._components.set(c.id, component)
        this._lastId = Math.max(this._lastId, c.id + 1)
      } else {
        throw new Error(`Failed to create component of type ${c.componentType}`)
      }
    }
  }

  createComponent(componentType: string, data: any): IGameComponent {
    const properties: GameComponentProperties = {
      x: data.x || 0,
      y: data.y || 0,
      name: data.name || componentType + new Date().getTime(),
      data: data.data || {},
    }
    switch (componentType) {
      case 'Tile':
        return new TileComponent(properties as TileComponentProps)
      case 'Text':
        return new TextComponent(properties as TextComponentProps)
      case 'Sprite':
        return new SpriteComponent(properties as SpriteComponentProps)
      case 'IsoCube':
        return new IsoCubeComponent(properties as IsoCubeComponentProps)
      case 'IsoHexagon':
        return new IsoHexagonComponent(properties as IsoHexagonComponentProps)
      case 'IsoCylinder':
        return new IsoCylinderComponent(properties as IsoCylinderComponentProps)
      default:
        throw new Error(`Unknown component type: ${componentType}`)
    }
  }
}
