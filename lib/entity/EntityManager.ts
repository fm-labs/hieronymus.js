export class EntityManager implements IEntityManager {
  public readonly entities: IGameEntity[] = []
  private _nextId = 1

  constructor() {}

  add(entity: IGameEntity, nextId?: number): number {
    if (nextId) {
      if (nextId < this._nextId) throw new Error('nextId must be greater than previous')
      this._nextId = nextId
    } else {
      this._nextId++
    }
    this.entities[this._nextId] = entity
    return this._nextId
  }

  get(id: number): IGameEntity | undefined {
    return this.entities[id] || undefined
  }
}
