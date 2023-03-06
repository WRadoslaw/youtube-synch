# Youtube-Synch

The Youtube-Synch node is used for youtube's creator onboarding and replicating their content automatically on Joystream. This service does periodic syncing the videos from a youtube channel to a Joystream channel.

## Required Stack

- Docker
- aws cli
- yarn
- nodejs

# Buildings the Youtube-Synch node

- Install dependencies
  `yarn`
- Build the project
  `yarn build`

# Running the Youtube-Synch node

## prerequisites

- A channel collaborator account should be setup on the Joystream network. This collaborator account will be used to replicate youtube videos to the Joystream network
- An App (metaprotocol) should be created on the Joystream network. This app will be used for adding videos attribution information to synced videos. The app `name` & a string `accountSeed` should be provided in the `config.yml` file. On how to create an app on the Joystream network, see [documentation](https://github.com/Joystream/joystream/blob/apps-metaprotocol/cli/README.md#joystream-cli-appscreateapp)

## Configuration

### Config file

All the configuration values required by Youtube-Synch node are provided via a single configuration file (either `yml` or `json`).

The path to the configuration will be (ordered from highest to lowest priority):

- The value of `--configPath` flag provided when running a command, _or_
- The value of `CONFIG_PATH` environment variable, _or_
- `config.yml` in the current working directory by default

### ENV variables

All configuration values can be overridden using environment variables, which may be useful when running the youtube-synch node as docker service.

To determine environment variable name based on a config key, for example `endpoints.queryNode`, use the following formula:

- convert `pascalCase` field names to `SCREAMING_SNAKE_CASE`: `endpoints.queryNode` => `ENDPOINTS.QUERY_NODE`
- replace all dots with `__`: `ENDPOINTS.QUERY_NODE` => `ENDPOINTS__QUERY_NODE`
- add `YT__SYNCH__` prefix: `ENDPOINTS__QUERY_NODE` => `YT__SYNCH__ENDPOINTS__QUERY_NODE`

In case of arrays or `oneOf` objects (ie. `keys`), the values must be provided as json string, for example `YT_SYNCH__JOYSTREAM__CHANNEL_COLLABORATOR__ACCOUNT='[{"mnemonic":"escape naive annual throw tragic achieve grunt verify cram note harvest problem"}]'`.

In order to unset a value you can use one of the following strings as env variable value: `"off"` `"null"`, `"undefined"`, for example: `YT_SYNCH__LOGS__FILE="off"`.

For more environment variable examples see the configuration in [docker-compose.yml](./docker-compose.yml).

## Setting Up DynamoDB

Youtube-synch service uses DynamoDB to persist the state of all the channel that are being synced & their videos. The Youtube-synch node works with both the local instance of dynamoDB and cloud-based AWS instance.
For running a local instance of dynamodb, this is useful is useful for testing & development purposes, follow the steps below:

### Local DynamoDB

- `yarn dynamodb:start` to start the local instance of dynamoDB.
- Also if you want to use the local instance of dynamoDB, you need to set the following environment variable:
  - `YT_SYNCH__AWS__ENDPOINT` to `http://localhost:4566`

### AWS DynamoDB

For using AWS dynamodb, generate AWS credentials (Access Key & Secret Key) for the user that has access to the DynamoDB table from the AWS Console.

Next there are two options, either you can provide the credentials in the `~/.aws/credentials` file or you can provide them as environment variables or in config file.

- For configuring these credentials in the `~/.aws/credentials` file using `aws configure` CLI command
- For configuring these credentials as environment variables, set the following environment variables:
  - `YT_SYNCH__AWS__CREDENTIALS__ACCESS_KEY_ID`
  - `YT_SYNCH__AWS__CREDENTIALS__SECRET_ACCESS_KEY`

## Running the node

Youtube-synch service can be run as a nodejs program or as a docker container. The service depends on the above described configurations so please make sure to configure the env vars/config file before running the node.

To run Youtube-synch service as nodejs program, run `yarn start`

For running Youtube-synch service as a docker container, run `docker-compose up -d` at root of the project. This will start the service in the background.

# Doing Unauthorized replication/syncing of Youtube Channel's videos on joystream

There is a CLI command for doing unauthorized replication/syncing of Youtube Channel's videos on joystream. For more information see
[addUnauthorizedChannelForSyncing](./src/cli/docs/addUnauthorizedChannelForSyncing.md)
