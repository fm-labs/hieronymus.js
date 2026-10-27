/**
 * A made-up inventory in the format of public/aws/data/*.json, so the world (and its tests) work
 * without real account data: one account, a three-tier VPC in eu-west-1 with a Client VPN, a default
 * VPC in us-east-1, some regional services and a CloudFront distribution.
 */
import type { InventoryItem } from './isoaws.inventory.ts'

export const SAMPLE_ACCOUNT = '123456789012'

const item = (
  region: string,
  type: string,
  id: string,
  properties: Record<string, any> = {},
  name = id,
): InventoryItem => ({
  account_id: SAMPLE_ACCOUNT,
  region_id: region,
  resource_type: type,
  resource_id: id,
  name,
  properties,
})

const tags = (name: string) => [{ Key: 'Name', Value: name }]

export function sampleInventory(): InventoryItem[] {
  const items: InventoryItem[] = []
  const eu = 'eu-west-1'
  const us = 'us-east-1'

  // the production VPC: three zones, four tiers
  items.push(
    item(eu, 'AWS::EC2::Vpc', 'vpc-prod', {
      CidrBlock: '10.20.0.0/16',
      IsDefault: false,
      Tags: tags('prod'),
    }),
  )
  const zones = ['a', 'b', 'c']
  const tiers = ['public', 'private', 'isolated', 'transit']
  tiers.forEach((tier, t) => {
    zones.forEach((z, i) => {
      const small = tier === 'transit'
      items.push(
        item(eu, 'AWS::EC2::Subnet', `subnet-${tier}-${z}`, {
          VpcId: 'vpc-prod',
          AvailabilityZone: `${eu}${z}`,
          CidrBlock: small ? `10.20.255.${i * 32}/27` : `10.20.${t * 8 + i * 2}.0/23`,
          AvailableIpAddressCount: small ? 24 : 507 - (t + 1) * (i + 3) * 9,
          MapPublicIpOnLaunch: tier === 'public',
          Tags: tags(`vpc/prod/${tier}Subnet${i + 1}`),
        }),
      )
    })
  })

  const instance = (id: string, subnet: string, type: string, state: string, name: string) =>
    item(eu, 'AWS::EC2::Instance', id, {
      InstanceType: type,
      State: { Name: state },
      SubnetId: subnet,
      PrivateIpAddress: `10.20.${id.length}.${id.charCodeAt(id.length - 1)}`,
      SecurityGroups: [{ GroupName: `${name}-sg`, GroupId: `sg-${id}` }],
      Tags: [
        ...tags(name),
        ...(name.startsWith('api') ? [{ Key: 'aws:autoscaling:groupName', Value: 'api-asg' }] : []),
      ],
    })
  items.push(
    instance('i-bastion', 'subnet-public-a', 't3.nano', 'running', 'bastion'),
    instance('i-api1', 'subnet-private-a', 't3.large', 'running', 'api/1'),
    instance('i-api2', 'subnet-private-b', 't3.large', 'running', 'api/2'),
    instance('i-api3', 'subnet-private-c', 't3.large', 'stopped', 'api/3'),
    instance('i-worker', 'subnet-private-b', 'm5.2xlarge', 'running', 'worker'),
    instance('i-jupyter', 'subnet-private-a', 't3.xlarge', 'stopped', 'jupyter'),
  )
  for (const id of ['i-api1', 'i-api2', 'i-api3', 'i-worker', 'i-worker', 'i-jupyter']) {
    items.push(
      item(eu, 'AWS::EC2::Volume', `vol-${items.length}`, {
        Attachments: [{ InstanceId: id }],
      }),
    )
  }
  items.push(
    item(eu, 'AWS::ECS::ContainerInstance', 'ci-worker', { ec2InstanceId: 'i-worker' }),
    item(eu, 'AWS::RDS::DBInstance', 'prod-db', {
      DBInstanceClass: 'db.r6g.large',
      Engine: 'postgres',
      EngineVersion: '15.4',
      DBInstanceStatus: 'available',
      AvailabilityZone: `${eu}b`,
      Endpoint: { Address: 'prod-db.example.eu-west-1.rds.amazonaws.com', Port: 5432 },
      AllocatedStorage: 200,
      StorageEncrypted: true,
      DBSubnetGroup: {
        Subnets: zones.map((z) => ({
          SubnetIdentifier: `subnet-isolated-${z}`,
          SubnetAvailabilityZone: { Name: `${eu}${z}` },
        })),
      },
    }),
    item(eu, 'AWS::EFS::FileSystem', 'fs-shared', {
      Name: 'shared',
      SizeInBytes: { Value: 42e9 },
      NumberOfMountTargets: 3,
    }),
    ...zones.map((z) =>
      item(eu, 'AWS::EFS::MountTarget', `fsmt-${z}`, {
        FileSystemId: 'fs-shared',
        SubnetId: `subnet-private-${z}`,
        IpAddress: `10.20.8.${z.charCodeAt(0)}`,
      }),
    ),
    item(eu, 'AWS::EC2::ClientVpnEndpoint', 'cvpn-endpoint-prod', {
      VpcId: 'vpc-prod',
      Status: { Code: 'available' },
      ClientCidrBlock: '172.16.0.0/22',
      VpnProtocol: 'openvpn',
      TransportProtocol: 'udp',
      VpnPort: 443,
      SplitTunnel: true,
      AuthenticationOptions: [{ Type: 'federated-authentication' }],
    }),
    ...zones.map((z) =>
      item(eu, 'AWS::EC2::ClientVpnTargetNetwork', `cvpn-assoc-${z}`, {
        AssociationId: `cvpn-assoc-${z}`,
        ClientVpnEndpointId: 'cvpn-endpoint-prod',
        TargetNetworkId: `subnet-transit-${z}`,
        Status: { Code: 'associated' },
      }),
    ),
    item(eu, 'AWS::Lambda::Function', 'vpc-indexer', {
      FunctionName: 'vpc-indexer',
      Runtime: 'python3.12',
      MemorySize: 512,
      Timeout: 60,
      VpcConfig: { SubnetIds: ['subnet-private-a', 'subnet-private-c'] },
    }),
  )
  for (const name of [
    'thumbnailer',
    'webhook',
    'log-retention',
    'cron-cleanup',
    'auth-trigger',
    'mailer',
    'exporter',
  ]) {
    items.push(
      item(eu, 'AWS::Lambda::Function', name, {
        FunctionName: name,
        Runtime: 'nodejs20.x',
        MemorySize: 256,
        Timeout: 30,
      }),
    )
  }
  for (const name of ['prod-assets', 'prod-uploads', 'prod-logs']) {
    items.push(item(eu, 'AWS::S3::Bucket', name, {}, name))
  }
  items.push(
    item(eu, 'AWS::SQS::Queue', `https://sqs.${eu}.amazonaws.com/${SAMPLE_ACCOUNT}/jobs`),
    item(eu, 'AWS::SQS::Queue', `https://sqs.${eu}.amazonaws.com/${SAMPLE_ACCOUNT}/jobs-dlq`),
  )

  // the default VPC in us-east-1, with one forgotten instance
  items.push(
    item(us, 'AWS::EC2::Vpc', 'vpc-default', { CidrBlock: '172.31.0.0/16', IsDefault: true }),
  )
  ;['a', 'b', 'c', 'd'].forEach((z, i) => {
    items.push(
      item(us, 'AWS::EC2::Subnet', `subnet-default-${z}`, {
        VpcId: 'vpc-default',
        AvailabilityZone: `${us}${z}`,
        CidrBlock: `172.31.${i * 16}.0/20`,
        AvailableIpAddressCount: 4091,
        MapPublicIpOnLaunch: true,
      }),
    )
  })
  items.push(
    item(us, 'AWS::EC2::Instance', 'i-legacy', {
      InstanceType: 't2.micro',
      State: { Name: 'stopped' },
      SubnetId: 'subnet-default-b',
      Tags: tags('legacy-ftp'),
    }),
    item(us, 'AWS::Lambda::Function', 'edge-redirect', {
      FunctionName: 'edge-redirect',
      Runtime: 'nodejs20.x',
    }),
    item(us, 'AWS::CloudFront::Distribution', 'E2SAMPLE', {
      DomainName: 'd111111abcdef8.cloudfront.net',
      Aliases: { Items: ['www.example.com'] },
      Status: 'Deployed',
      Enabled: true,
      HttpVersion: 'http2',
      Origins: { Items: [{ DomainName: 'prod-assets.s3.amazonaws.com' }] },
    }),
  )
  // not drawn, but counted in the HUD
  for (let i = 0; i < 12; i++) items.push(item(eu, 'AWS::IAM::Role', `role-${i}`))
  return items
}
