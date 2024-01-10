export class EntityManager implements IEntityManager {
  private readonly _entities: Map<number, GameEntity> = new Map()
  private _nextId = 1

  constructor() {}

  add(component: IGameComponent, nextId?: number): number {
    this._nextId++
    if (nextId) {
      if (nextId < this._nextId) throw new Error('nextId must be greater than previous')
      this._nextId = nextId
    }

    const entity: GameEntity = {
      id: this._nextId,
      component,
    }
    this._entities.set(entity.id, entity)
    return this._nextId
  }

  get(id: number): GameEntity | undefined {
    return this._entities.get(id) || undefined
  }

  set(id: number, entity: GameEntity): void {
    entity.id = id
    this._entities.set(id, entity)
  }

  // create(entity: GameEntityDescription): IGameEntity {
  //   let _entity: IGameEntity = entity
  //   switch (entity.type) {
  //     case 'tile':
  //       _entity = new TileEntity(entity.properties)
  //       break
  //     case 'text':
  //       _entity = new TextEntity(entity.properties)
  //       break
  //     default:
  //       throw new Error(`Unknown entity type: ${entity.type}`)
  //   }
  //   return _entity
  // }

  // load(entities: GameEntityDescription[]): Record<number, IGameEntity> {
  //   const result: Record<number, IGameEntity> = {}
  //   for (const entity of entities) {
  //     const _entity = this.create(entity)
  //     this._entities.set(this._nextId, _entity)
  //     result[this._nextId] = _entity
  //   }
  //   return result
  // }
}
