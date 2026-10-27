/**
 * The network model of the 'isoaws' world: raw AWS inventory items (as in public/aws/data/*.json)
 * grouped into accounts, regions, VPCs and subnets, with the resources that live in them.
 * Pure functions without engine dependencies, so they can be unit tested.
 */

/** One raw inventory record. Only the fields the world reads are typed. */
export type InventoryItem = {
  account_id: string
  region_id: string
  resource_type: string
  resource_id: string
  name?: string
  properties?: Record<string, any>
}

export type SubnetTier = 'public' | 'private' | 'isolated' | 'transit'

/** Things drawn as a building, in a subnet or in a region's service park */
export type ResourceKind =
  | 'instance'
  | 'database'
  | 'mount-target'
  | 'vpn-target'
  | 'vpc-lambda'
  | 'lambda'
  | 'bucket'
  | 'queue'
  | 'filesystem'
  | 'vpn-endpoint'
  | 'distribution'

export type Resource = {
  /** Unique in the model: '<kind>:<resource id>' */
  key: string
  kind: ResourceKind
  /** The AWS resource id, e.g. i-0f53671edd921a883 */
  id: string
  /** Name tag, function name, bucket name, ... or the id */
  name: string
  type: string
  account: string
  region: string
  /** The subnet it stands in, if any */
  subnetId?: string
  vpcId?: string
  /** running, stopped, available, ... */
  state?: string
  /** A few facts for the info pane, in display order */
  facts: Array<[string, string]>
  /** Keys of related resources, drawn as links when selected */
  links: string[]
  /** Kind specific numbers used for drawing, e.g. instance size or volume count */
  size: number
  volumes: number
  ecs: boolean
}

export type Subnet = {
  id: string
  name: string
  vpcId: string
  az: string
  cidr: string
  tier: SubnetTier
  /** Addresses in the CIDR block, minus the 5 AWS reserves */
  capacity: number
  available: number
  resources: Resource[]
}

export type Vpc = {
  id: string
  name: string
  cidr: string
  isDefault: boolean
  account: string
  region: string
  subnets: Subnet[]
  /** Client VPN endpoints attached to this VPC */
  gateways: Resource[]
}

export type District = {
  /** '<account>/<region>', or 'global' */
  key: string
  account: string
  region: string
  vpcs: Vpc[]
  /** Regional services outside the VPCs: functions, buckets, queues, file systems */
  services: Resource[]
}

export type NetworkModel = {
  accounts: string[]
  /** Account/region districts, global first */
  districts: District[]
  /** Every resource by key, including the ones in subnets */
  resources: Map<string, Resource>
  subnets: Map<string, Subnet>
  vpcs: Map<string, Vpc>
  /** Resource types that are in the inventory but not drawn, with their counts */
  hidden: Array<[string, number]>
  total: number
}

const TIER_ORDER: SubnetTier[] = ['public', 'private', 'isolated', 'transit']

/** Number of addresses in a CIDR block, e.g. 10.0.0.0/24 → 256 */
export function cidrSize(cidr: string): number {
  const bits = parseInt(cidr.split('/')[1] ?? '', 10)
  return Number.isFinite(bits) ? 2 ** (32 - bits) : 0
}

/** The value of a tag in AWS' [{ Key, Value }] lists */
export const tagValue = (tags: unknown, key: string): string | undefined =>
  Array.isArray(tags) ? tags.find((t) => t?.Key === key)?.Value : undefined

/**
 * Public, private, isolated or transit. CDK and most templates put it into the Name tag;
 * otherwise a subnet that gives instances a public address is public.
 */
export function subnetTier(name: string, mapPublicIp: boolean): SubnetTier {
  const lower = name.toLowerCase()
  for (const tier of ['isolated', 'transit', 'private', 'public'] as SubnetTier[]) {
    if (lower.includes(tier)) return tier
  }
  return mapPublicIp ? 'public' : 'private'
}

export const tierRank = (tier: SubnetTier) => TIER_ORDER.indexOf(tier)

/** Instance types as a number for the building height: nano 1 ... 2xlarge 7, 4xlarge+ 8 */
export function instanceSize(type: string): number {
  const size = type.split('.')[1] ?? ''
  const sizes = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge']
  const i = sizes.indexOf(size)
  return i >= 0 ? i + 1 : size.endsWith('xlarge') ? 8 : 4
}

/** Resource keys are unique across accounts and regions: function names, for example, are not */
export const resourceKey = (kind: ResourceKind, account: string, region: string, id: string) =>
  `${kind}:${account}/${region}/${id}`

const shortName = (name: string) => name.split('/').slice(-2).join('/')

const blankResource = (item: InventoryItem, kind: ResourceKind, name: string): Resource => ({
  key: resourceKey(kind, item.account_id, item.region_id, item.resource_id),
  kind,
  id: item.resource_id,
  name,
  type: item.resource_type,
  account: item.account_id,
  region: item.region_id,
  facts: [],
  links: [],
  size: 1,
  volumes: 0,
  ecs: false,
})

/** Build the network model from raw inventory items of one or more accounts */
export function buildNetworkModel(items: InventoryItem[]): NetworkModel {
  const resources = new Map<string, Resource>()
  const subnets = new Map<string, Subnet>()
  const vpcs = new Map<string, Vpc>()
  const districts = new Map<string, District>()
  const hidden = new Map<string, number>()
  const byType = (type: string) => items.filter((i) => i.resource_type === type)
  const props = (i: InventoryItem) => i.properties ?? {}

  const district = (account: string, region: string): District => {
    const key = region === 'global' ? 'global' : `${account}/${region}`
    let d = districts.get(key)
    if (!d) {
      d = { key, account: region === 'global' ? '' : account, region, vpcs: [], services: [] }
      districts.set(key, d)
    }
    return d
  }
  const add = (r: Resource) => {
    resources.set(r.key, r)
    return r
  }
  // the same record can be in an inventory twice
  const seen = (r: Resource) => resources.has(r.key)
  const place = (r: Resource, subnetId: string | undefined) => {
    const subnet = subnetId ? subnets.get(subnetId) : undefined
    if (!subnet) return false
    r.subnetId = subnet.id
    r.vpcId = subnet.vpcId
    subnet.resources.push(r)
    return true
  }

  // VPCs and their subnets
  for (const item of byType('AWS::EC2::Vpc')) {
    const p = props(item)
    const vpc: Vpc = {
      id: item.resource_id,
      name: tagValue(p.Tags, 'Name') ?? (p.IsDefault ? 'default' : item.resource_id),
      cidr: p.CidrBlock ?? '',
      isDefault: !!p.IsDefault,
      account: item.account_id,
      region: item.region_id,
      subnets: [],
      gateways: [],
    }
    vpcs.set(vpc.id, vpc)
    district(item.account_id, item.region_id).vpcs.push(vpc)
  }
  for (const item of byType('AWS::EC2::Subnet')) {
    const p = props(item)
    const vpc = vpcs.get(p.VpcId)
    if (!vpc) continue
    const name = tagValue(p.Tags, 'Name') ?? ''
    const capacity = Math.max(0, cidrSize(p.CidrBlock ?? '') - 5)
    const subnet: Subnet = {
      id: item.resource_id,
      // CDK names them '<stack>/<vpc>/publicSubnet1': the VPC is shown anyway
      name: name ? name.split('/').pop() ?? name : item.resource_id,
      vpcId: vpc.id,
      az: p.AvailabilityZone ?? '?',
      cidr: p.CidrBlock ?? '',
      tier: subnetTier(name, !!p.MapPublicIpOnLaunch),
      capacity,
      available: p.AvailableIpAddressCount ?? capacity,
      resources: [],
    }
    subnets.set(subnet.id, subnet)
    vpc.subnets.push(subnet)
  }

  // volumes and ECS container instances decorate the instances
  const volumes = new Map<string, number>()
  for (const item of byType('AWS::EC2::Volume')) {
    for (const a of props(item).Attachments ?? []) {
      volumes.set(a.InstanceId, (volumes.get(a.InstanceId) ?? 0) + 1)
    }
  }
  const ecsInstances = new Set(
    byType('AWS::ECS::ContainerInstance').map((i) => props(i).ec2InstanceId as string),
  )

  for (const item of byType('AWS::EC2::Instance')) {
    const p = props(item)
    const name = tagValue(p.Tags, 'Name')
    const r = blankResource(item, 'instance', name ? shortName(name) : item.resource_id)
    if (seen(r)) continue
    r.state = p.State?.Name
    r.size = instanceSize(p.InstanceType ?? '')
    r.volumes = volumes.get(item.resource_id) ?? 0
    r.ecs = ecsInstances.has(item.resource_id)
    r.facts = [
      ['Instance', item.resource_id],
      ['Type', p.InstanceType ?? '?'],
      ['State', r.state ?? '?'],
      ['Private IP', p.PrivateIpAddress ?? '–'],
      ['Public IP', p.PublicIpAddress ?? '–'],
      ['Volumes', String(r.volumes)],
      ['Security groups', (p.SecurityGroups ?? []).map((g: any) => g.GroupName).join(', ') || '–'],
    ]
    const asg = tagValue(p.Tags, 'aws:autoscaling:groupName')
    if (asg) r.facts.push(['Auto Scaling', asg])
    if (r.ecs) r.facts.push(['ECS', 'container instance'])
    if (place(r, p.SubnetId)) add(r)
  }

  for (const item of byType('AWS::RDS::DBInstance')) {
    const p = props(item)
    const r = blankResource(item, 'database', item.resource_id)
    if (seen(r)) continue
    r.state = p.DBInstanceStatus
    r.size = instanceSize((p.DBInstanceClass ?? '').replace(/^db\./, ''))
    const group = p.DBSubnetGroup?.Subnets ?? []
    // the instance lives in the subnet of its availability zone
    const home = group.find((s: any) => s.SubnetAvailabilityZone?.Name === p.AvailabilityZone)
    r.facts = [
      ['Engine', `${p.Engine ?? '?'} ${p.EngineVersion ?? ''}`],
      ['Class', p.DBInstanceClass ?? '?'],
      ['Status', r.state ?? '?'],
      ['Endpoint', p.Endpoint ? `${p.Endpoint.Address}:${p.Endpoint.Port}` : '–'],
      ['Multi-AZ', p.MultiAZ ? 'yes' : 'no'],
      ['Public', p.PubliclyAccessible ? 'yes' : 'no'],
      ['Storage', `${p.AllocatedStorage ?? '?'} GB${p.StorageEncrypted ? ', encrypted' : ''}`],
    ]
    r.links = group
      .map((s: any) => s.SubnetIdentifier)
      .filter((id: string) => id !== home?.SubnetIdentifier)
      .map((id: string) => `subnet:${id}`)
    if (place(r, home?.SubnetIdentifier ?? group[0]?.SubnetIdentifier)) add(r)
  }

  // EFS: the file system is regional, its mount targets stand in the subnets
  const fileSystems = new Map<string, Resource>()
  for (const item of byType('AWS::EFS::FileSystem')) {
    const p = props(item)
    const r = blankResource(item, 'filesystem', p.Name ?? item.resource_id)
    if (seen(r)) continue
    const bytes = p.SizeInBytes?.Value ?? 0
    r.facts = [
      ['File system', item.resource_id],
      ['Size', `${(bytes / 1e9).toFixed(1)} GB`],
      ['Mount targets', String(p.NumberOfMountTargets ?? '?')],
    ]
    fileSystems.set(item.resource_id, r)
    district(item.account_id, item.region_id).services.push(add(r))
  }
  for (const item of byType('AWS::EFS::MountTarget')) {
    const p = props(item)
    const fs = fileSystems.get(p.FileSystemId)
    const r = blankResource(item, 'mount-target', fs ? `${fs.name} mount` : item.resource_id)
    if (seen(r)) continue
    r.facts = [
      ['Mount target', item.resource_id],
      ['File system', p.FileSystemId ?? '?'],
      ['IP', p.IpAddress ?? '?'],
    ]
    if (fs) {
      r.links.push(fs.key)
      fs.links.push(r.key)
    }
    if (place(r, p.SubnetId)) add(r)
  }

  // Client VPN: the endpoint is the VPC's gate, the target networks are associated subnets
  for (const item of byType('AWS::EC2::ClientVpnEndpoint')) {
    const p = props(item)
    const r = blankResource(item, 'vpn-endpoint', item.resource_id)
    if (seen(r)) continue
    r.state = p.Status?.Code
    r.facts = [
      ['Endpoint', item.resource_id],
      ['Status', r.state ?? '?'],
      ['Client CIDR', p.ClientCidrBlock ?? '?'],
      ['Protocol', `${p.VpnProtocol ?? '?'} ${p.TransportProtocol ?? ''}/${p.VpnPort ?? ''}`],
      ['Split tunnel', p.SplitTunnel ? 'yes' : 'no'],
      ['Auth', (p.AuthenticationOptions ?? []).map((a: any) => a.Type).join(', ') || '?'],
    ]
    const vpc = vpcs.get(p.VpcId)
    if (vpc) {
      r.vpcId = vpc.id
      vpc.gateways.push(add(r))
    } else {
      district(item.account_id, item.region_id).services.push(add(r))
    }
  }
  for (const item of byType('AWS::EC2::ClientVpnRoute')) {
    const p = props(item)
    resources
      .get(resourceKey('vpn-endpoint', item.account_id, item.region_id, p.ClientVpnEndpointId))
      ?.facts.push(['Route', `${p.DestinationCidr} → ${p.TargetSubnet}`])
  }
  for (const item of byType('AWS::EC2::ClientVpnTargetNetwork')) {
    const p = props(item)
    const r = blankResource(item, 'vpn-target', 'VPN association')
    r.id = p.AssociationId ?? item.resource_id
    r.key = resourceKey('vpn-target', item.account_id, item.region_id, r.id)
    if (seen(r)) continue
    r.state = p.Status?.Code
    r.facts = [
      ['Association', r.id],
      ['Endpoint', p.ClientVpnEndpointId ?? '?'],
      ['Status', r.state ?? '?'],
    ]
    const endpoint = resources.get(
      resourceKey('vpn-endpoint', item.account_id, item.region_id, p.ClientVpnEndpointId),
    )
    if (endpoint) {
      r.links.push(endpoint.key)
      endpoint.links.push(r.key)
    }
    if (place(r, p.TargetNetworkId)) add(r)
  }

  for (const item of byType('AWS::Lambda::Function')) {
    const p = props(item)
    const subnetIds: string[] = p.VpcConfig?.SubnetIds ?? []
    const inVpc = subnetIds.some((id) => subnets.has(id))
    const r = blankResource(item, inVpc ? 'vpc-lambda' : 'lambda', p.FunctionName ?? item.name)
    if (seen(r)) continue
    r.facts = [
      ['Runtime', p.Runtime ?? p.PackageType ?? '?'],
      ['Memory', `${p.MemorySize ?? '?'} MB`],
      ['Timeout', `${p.Timeout ?? '?'} s`],
      ['Description', p.Description || '–'],
    ]
    if (inVpc) {
      // one function, several subnets: it stands in the first, and links to the others
      const [first, ...others] = subnetIds.filter((id) => subnets.has(id))
      r.links = others.map((id) => `subnet:${id}`)
      place(r, first)
      add(r)
    } else {
      district(item.account_id, item.region_id).services.push(add(r))
    }
  }

  for (const item of byType('AWS::S3::Bucket')) {
    const r = blankResource(item, 'bucket', item.name ?? item.resource_id)
    if (seen(r)) continue
    r.facts = [['Bucket', r.name]]
    district(item.account_id, item.region_id).services.push(add(r))
  }
  for (const item of byType('AWS::SQS::Queue')) {
    // the id is the queue URL
    const name = item.resource_id.split('/').pop() ?? item.resource_id
    const r = blankResource(item, 'queue', name)
    if (seen(r)) continue
    r.facts = [['Queue', name]]
    district(item.account_id, item.region_id).services.push(add(r))
  }

  // CloudFront is global; link each distribution to the buckets it serves (bucket names are unique)
  const buckets = new Map(
    [...resources.values()].filter((r) => r.kind === 'bucket').map((r) => [r.name, r]),
  )
  for (const item of byType('AWS::CloudFront::Distribution')) {
    const p = props(item)
    const aliases: string[] = p.Aliases?.Items ?? []
    const r = blankResource(item, 'distribution', aliases[0] ?? p.DomainName ?? item.resource_id)
    if (seen(r)) continue
    r.state = p.Status
    r.facts = [
      ['Distribution', item.resource_id],
      ['Domain', p.DomainName ?? '?'],
      ['Aliases', aliases.join(', ') || '–'],
      ['Status', `${p.Status ?? '?'}${p.Enabled === false ? ' (disabled)' : ''}`],
      ['HTTP', `${p.HttpVersion ?? '?'}, ${p.DefaultCacheBehavior?.ViewerProtocolPolicy ?? ''}`],
      ['WAF', p.WebACLId ? 'yes' : 'no'],
    ]
    for (const origin of p.Origins?.Items ?? []) {
      r.facts.push(['Origin', origin.DomainName])
      const bucket = buckets.get(String(origin.DomainName ?? '').split('.s3')[0])
      if (bucket && !r.links.includes(bucket.key)) {
        r.links.push(bucket.key)
        bucket.links.push(r.key)
      }
    }
    district(item.account_id, 'global').services.push(add(r))
  }
  // a database's subnet group may name subnets that are not in the inventory
  for (const r of resources.values()) {
    r.links = r.links.filter((key) => resources.has(key) || subnets.has(key.slice(7)))
  }

  const shown = new Set([
    'AWS::EC2::Vpc',
    'AWS::EC2::Subnet',
    'AWS::EC2::Volume',
    'AWS::ECS::ContainerInstance',
    'AWS::EC2::ClientVpnRoute',
    ...[...resources.values()].map((r) => r.type),
  ])
  for (const item of items) {
    if (!shown.has(item.resource_type)) {
      hidden.set(item.resource_type, (hidden.get(item.resource_type) ?? 0) + 1)
    }
  }

  // stable order: AZs, tiers and names, so the city looks the same on every load
  for (const vpc of vpcs.values()) {
    vpc.subnets.sort(
      (a, b) =>
        tierRank(a.tier) - tierRank(b.tier) ||
        a.az.localeCompare(b.az) ||
        a.cidr.localeCompare(b.cidr),
    )
  }
  const kindOrder: ResourceKind[] = [
    'distribution',
    'vpn-endpoint',
    'filesystem',
    'bucket',
    'queue',
    'lambda',
  ]
  const sorted = [...districts.values()].sort((a, b) =>
    a.key === 'global' ? -1 : b.key === 'global' ? 1 : a.key.localeCompare(b.key),
  )
  for (const d of sorted) {
    d.vpcs.sort((a, b) => Number(a.isDefault) - Number(b.isDefault) || a.cidr.localeCompare(b.cidr))
    d.services.sort(
      (a, b) =>
        kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.name.localeCompare(b.name),
    )
  }

  return {
    accounts: [...new Set(items.map((i) => i.account_id))].sort(),
    districts: sorted,
    resources,
    subnets,
    vpcs,
    hidden: [...hidden.entries()].sort((a, b) => b[1] - a[1]),
    total: items.length,
  }
}
