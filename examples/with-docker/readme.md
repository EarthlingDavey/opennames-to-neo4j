## What does the package do?

The package is to automate the download and import of OpenNames data to a neo4j database.

## Use

1. Sign up for API access at https://osdatahub.os.uk/

## Local development

This repository includes:

1. node folder for the nodejs source.
2. neo4j folder for config and logs.
3. docker-compose.yml to create node and neo4j containers for use during development only.

To start local development you have a choice:

1. Use the neo4j database as described in docker-compose.yml.
2. Use an existing neo4j database

## Docker neo4j database

1. Download docker and run `docker-compose up neo4j`
2. Check neo4j is running correctly - Use Neo4j Desktop and add remote connection

   ```
    url: bolt://localhost:7687
    user: neo4j
    password: pass
   ```

3. Copy `.env.sample` to `.env` - you don't need to edit the default values.

Hints:

1. To stop the service, use ctrl + c.
2. You may start it as a background task with `docker-compose up -d neo4j`
3. To stop the background task use `docker-compose stop neo4j`
4. Check neo4j logs in `noe4j/logs`

## Existing neo4j database

1. Copy `.env.sample` to `.env`
2. Replace the default connection url and credentials with yours.

## Starting node

1. docker-compose up node
