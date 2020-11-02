const path = require("path");
const core = require("@aws-cdk/core");
const lambda = require("@aws-cdk/aws-lambda");
const s3 = require("@aws-cdk/aws-s3");
const lambdaEventSources = require("@aws-cdk/aws-lambda-event-sources");
const dynamodb = require('@aws-cdk/aws-dynamodb');
const ssm = require('@aws-cdk/aws-ssm');

class FacebookGroupify extends core.Construct {
  constructor(scope, id) {
    super(scope, id);

    const bucket = new s3.Bucket(this, id, {
      bucketName: FacebookGroupify.name.toLowerCase()
    });
    const ssmParams = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'SecureParamaters', {
      parameterName: "/FacebookGroupify/*",
    });
    const linkCleaner = new lambda.Function(this, "LinkCleaner", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-LinkCleaner`,
      description: 'Strips Youtube and Spotify ID\'s from URLs',
      code: lambda.Code.fromAsset(path.join(__dirname, "../resources")),
      handler: 'functions/LinkCleaner/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(linkCleaner);
    linkCleaner.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
        events: [ s3.EventType.OBJECT_CREATED ],
        filters: [ { prefix: 'links/' } ] 
    }));
    ssmParams.grantRead(linkCleaner)
    
    const youtubeTitleFetcher = new lambda.Function(this, "YoutubeTitleFetcher", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-YoutubeTitleFetcher`,
      description: 'Fetches the titles of youtube videos',
      code: lambda.Code.fromAsset(path.join(__dirname, "../resources")),
      handler: 'functions/YoutubeTitleFetcher/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(youtubeTitleFetcher);
    youtubeTitleFetcher.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
        events: [ s3.EventType.OBJECT_CREATED ],
        filters: [ { prefix: 'ids/youtube/' } ] 
    }));
    ssmParams.grantRead(youtubeTitleFetcher)
    
    const youtubeTitleToSpotifyId = new lambda.Function(this, "YoutubeTitleToSpotifyId", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-YoutubeTitleToSpotifyId`,
      description: 'Searches Youtube titles in Spotify',
      code: lambda.Code.fromAsset(path.join(__dirname, "../resources")),
      handler: 'functions/YoutubeTitleToSpotifyId/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(youtubeTitleToSpotifyId);
    youtubeTitleToSpotifyId.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
        events: [ s3.EventType.OBJECT_CREATED ],
        filters: [ { prefix: 'titles/youtube/' } ] 
    }));
    ssmParams.grantRead(youtubeTitleToSpotifyId)

    const spotifyPlaylistUpdater = new lambda.Function(this, "SpotifyPlaylistUpdater", {
      runtime: lambda.Runtime.NODEJS_10_X,
      functionName: `${FacebookGroupify.name}-SpotifyPlaylistUpdater`,
      description: 'Inserts found songs into Spotify playlists',
      code: lambda.Code.fromAsset(path.join(__dirname, "../resources")),
      handler: 'functions/SpotifyPlaylistUpdater/index.handler',
      timeout: core.Duration.seconds(300),
    });
    bucket.grantReadWrite(spotifyPlaylistUpdater);
    spotifyPlaylistUpdater.addEventSource(new lambdaEventSources.S3EventSource(bucket, {
        events: [ s3.EventType.OBJECT_CREATED ],
        filters: [ { prefix: 'ids/spotify/' } ] 
    }));
    ssmParams.grantRead(spotifyPlaylistUpdater)

    const table = new dynamodb.Table(this, `${FacebookGroupify.name}-DuplicateTable`, {
      tableName: `${FacebookGroupify.name}-DuplicateTable`,
      partitionKey: { 
        name: 'PlaylistId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'TrackId',
        type: dynamodb.AttributeType.STRING
      }
    });
    table.grantReadWriteData(spotifyPlaylistUpdater);
  }
}

module.exports = { FacebookGroupify }
