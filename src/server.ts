import 'graphql-import-node';
//import Mongoose, { ConnectOptions } from 'mongoose';
import { PrismaClient } from 'src/db/prisma/client';
import express from 'express';
import * as yaml from 'yaml';
import * as fs from 'fs';
import debug from  'debug';
import routes from './routes';
import cookieParser from 'cookie-parser';
import consolidate from 'consolidate';
import chalk from 'chalk';

const log = debug("gridless:initserver");

log("Reading config...");
export const staticConfig = yaml.parseDocument(fs.readFileSync("./config.yaml").toString());
globalThis.staticConfig = staticConfig;

log("Starting database...");
export var db: PrismaClient = new PrismaClient({
  rejectOnNotFound: false,
  //errorFormat: "pretty"
});

(async () => {
  // await Mongoose.connect(`mongodb://${staticConfig.get("database").get("username")}:${staticConfig.get("database").get("password")}@`+
  // `${staticConfig.get("database").get("host") || "127.0.0.1"}:${staticConfig.get("database").get("port") || "27017"}`, {
  //   autoIndex: true,
  //   bufferCommands: false,
  //   appName: "Gridless by Aqua",
  //   dbName: staticConfig.get("database").get("name") || "gridless"
  // }).catch((rejection) => {
  //   log(chalk`{bold.red ERROR}: Database failed to connect: ${rejection.message}`);
  //   //console.log(staticConfig.toJSON());
  //   process.exit(8);
  // }).then((mongoose) => {
  //   // Cache config
  //   getAuthConfig();
  //   log(chalk`{bold.green SUCCESS}! Database connected!`);
  // });
  try {
    await db.$connect();
  } catch(e) {
    log(chalk`{bold.red ERROR}: Database failed to connect: ${e.toString()}`);
    process.exit(8);
  }

  const app = express();
  // registerReact(app).catch((reason) => {
  //   if (reason.message.match("babel")) 
  //   log(chalk`{bold.yellow WARNING} {yellow in registerReact}: probably plugin related, nothing to worry about`);
  //   else log(chalk`{bold.red ERROR} {red in registerReact}: ${reason.message}`);
  // });
  app.engine('j2', consolidate.nunjucks);
  app.engine('nj', consolidate.nunjucks);
  app.set('view engine', 'j2');
  app.set('views', __dirname+ '/views');
  app.use("/_gridless", cookieParser(globalThis.staticConfig.get("auth").get("secret")), await routes());
  app.locals.sitename = globalThis.staticConfig.get("sitename") || "Aqua";
  // await graphql.start();
  // graphql.applyMiddleware({ app, path: "/_gridless/graphql" });

  const port = process.env.PORT || staticConfig.get("server.port") || 3000;
  app.listen(port, () => {
    // if (err) {
    //   console.log(err);
    // }
    log(chalk`Gridless {bold.green UP}! Running on port: ${port}`);
  });
})().then(() => log("Server shutting down!"));