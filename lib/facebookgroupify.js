const path = require('path');
const core = require('@aws-cdk/core');
const lambda = require('@aws-cdk/aws-lambda');
const s3 = require('@aws-cdk/aws-s3');
const lambdaEventSources = require('@aws-cdk/aws-lambda-event-sources');
const dynamodb = require('@aws-cdk/aws-dynamodb');
const ssm = require('@aws-cdk/aws-ssm');
const { DockerImageAsset } = require('@aws-cdk/aws-ecr-assets');
const ecs = require('@aws-cdk/aws-ecs');
const ec2 = require('@aws-cdk/aws-ec2');
const ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
const events = require('@aws-cdk/aws-events');

const APP_DIRECTORY = '../resources';

class FacebookGroupify extends core.Construct {
  constructor(scope, id) {
    super(scope, id);

    const bucket = new s3.Bucket(this, id, {
      bucketName: FacebookGroupify.name.toLowerCase(),
    });
    this.bucket = bucket;
    const ssmParams = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'SecureParamaters', {
      parameterName: '/FacebookGroupify/*',
    });
    this.ssmParams = ssmParams;

    const linkCleaner = new lambda.Function(this, 'LinkCleaner', {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-LinkCleaner`,
      description: 'Strips Youtube and Spotify ID\'s from URLs',
      code: lambda.Code.fromAsset(path.join(__dirname, APP_DIRECTORY)),
      handler: 'functions/LinkCleaner/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(linkCleaner);
    linkCleaner.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
      filters: [{ prefix: 'links/' }],
    }));
    ssmParams.grantRead(linkCleaner);

    const youtubeTitleFetcher = new lambda.Function(this, 'YoutubeTitleFetcher', {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-YoutubeTitleFetcher`,
      description: 'Fetches the titles of youtube videos',
      code: lambda.Code.fromAsset(path.join(__dirname, APP_DIRECTORY)),
      handler: 'functions/YoutubeTitleFetcher/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(youtubeTitleFetcher);
    youtubeTitleFetcher.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
      filters: [{ prefix: 'ids/youtube/' }],
    }));
    ssmParams.grantRead(youtubeTitleFetcher);

    const youtubeTitleToSpotifyId = new lambda.Function(this, 'YoutubeTitleToSpotifyId', {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-YoutubeTitleToSpotifyId`,
      description: 'Searches Youtube titles in Spotify',
      code: lambda.Code.fromAsset(path.join(__dirname, APP_DIRECTORY)),
      handler: 'functions/YoutubeTitleToSpotifyId/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(youtubeTitleToSpotifyId);
    youtubeTitleToSpotifyId.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
      filters: [{ prefix: 'titles/youtube/' }],
    }));
    ssmParams.grantRead(youtubeTitleToSpotifyId);

    const spotifyPlaylistUpdater = new lambda.Function(this, 'SpotifyPlaylistUpdater', {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-SpotifyPlaylistUpdater`,
      description: 'Inserts found songs into Spotify playlists',
      code: lambda.Code.fromAsset(path.join(__dirname, APP_DIRECTORY)),
      handler: 'functions/SpotifyPlaylistUpdater/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(spotifyPlaylistUpdater);
    spotifyPlaylistUpdater.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
      filters: [{ prefix: 'ids/spotify/' }],
    }));
    ssmParams.grantRead(spotifyPlaylistUpdater);

    const table = new dynamodb.Table(this, `${FacebookGroupify.name}-DuplicateTable`, {
      tableName: `${FacebookGroupify.name}-DuplicateTable`,
      partitionKey: {
        name: 'PlaylistId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'TrackId',
        type: dynamodb.AttributeType.STRING,
      },
    });
    table.grantReadWriteData(spotifyPlaylistUpdater);
    const cluster = new ecs.Cluster(this, 'Cluster', { });
    // Create the scheduled task
    this.scheduleScrape(cluster, '288793014548229', '3CcecGrE2ZZfWcRYx0seK2', 4);
    this.scheduleScrape(cluster, 'FourFourMag', '7dzrLIhOzsBTZApRHTRlUy', 4);
  }

  scheduleScrape(cluster, groupId, playlistId, minutes) {
    const scheduledTask = new ecsPatterns.ScheduledFargateTask(this, `ScheduledFargateTask-${groupId}-${playlistId}`, {
      cluster,
      scheduledFargateTaskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, `${APP_DIRECTORY}`)),
        memoryLimitMiB: 2048,
        cpu: 1024,
        environment: {
          GROUP_ID: groupId,
          PLAYLIST_ID: playlistId,
          RUN_LENGTH: minutes.toString(),
          BUCKET_NAME: this.bucket.bucketName,
        },
      },
      desiredTaskCount: 1,
      schedule: events.Schedule.rate(core.Duration.hours(24)),
    });
    this.bucket.grantReadWrite(scheduledTask.taskDefinition.taskRole);
    this.ssmParams.grantRead(scheduledTask.taskDefinition.taskRole);
    this.ssmParams.grantWrite(scheduledTask.taskDefinition.taskRole);
  }
}

module.exports = { FacebookGroupify };
