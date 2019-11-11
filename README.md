# serverless-aws-nodejs-typescript

Just an up-to-date [TypeScript template](https://github.com/serverless/serverless/tree/master/lib/plugins/create/templates/aws-nodejs-typescript) for the [Serverless Framework](https://github.com/serverless/serverless) with support for offline usage.

## Pre-requisites

Install the `serverless` CLI.

```shell
$ npm install -g serverless
```

Once it is done, run `sls help` from the terminal to confirm installation.

## Usage

Clone the repository and install the dependencies.

```shell
$ git clone --depth=1 https://github.com/mesaugat/serverless-aws-nodejs-typescript.git <api-name>
$ cd <api-name>
$ npm install
$ rm -rf .git
```

## Local Development

From the root of the directory.

```shell
$ sls offline
```

For setting up AWS credentials and deploying a function, check the official [docs](https://serverless.com/framework/docs/providers/aws/).

## License

[MIT](LICENSE)
