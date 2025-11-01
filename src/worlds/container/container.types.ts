type ContainerApi = {
  get: (path: string) => Promise<any>
  post: (path: string, data: any) => Promise<any>
  login: (username: string, password: string) => Promise<any>
  logout: () => void
  // helpers
  getContainerHosts: () => Promise<any>
  getContainerHostContainers: (hostId: string) => Promise<any>
}
