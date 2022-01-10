---
title: Starting Gridless
---
# Starting Gridless
The following steps will start the Gridless server in development mode. A "release mode" has not been set up yet.

## Prerequisites
* A MongoDB server. For testing/development purposes, a local one using Docker should work.
<!-- TODO(bleonard252): show them what the heck this means, publish a docker-compose.yml, maybe. Speaking of, where's mine? -->

## Procedure
1. Clone the repository. You should have already done that.
```sh
git clone https://github.com/getaqua/gridless --depth=1 --branch=main
cd gridless
```
2. Create config.yaml. Use the contents of `config.yaml.example` as your guide, and fill it in as necessary.
3. Run `DEBUG=gridless:* yarn dev`. Wait for Gridless to tell you it's ready before doing anything; it shouldn't take too long.