import 'graphql-import-node';
import Mongoose from 'mongoose';
import express from 'express';
import * as yaml from 'yaml';
import * as fs from 'node:fs';
import * as _debug from  'debug';
import routes from './routes';

const log = _debug("gridless:initserver");
log("Starting database...");
const staticConfig = yaml.parseDocument(fs.readFileSync("./config.yaml").toString());

Mongoose.connect(`mongodb://${staticConfig.get("database.host")}:${staticConfig.get("database.port")}`, {
  autoIndex: true,
  poolSize: 50,
  bufferMaxEntries: 0,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
  dbName: staticConfig.get("database.data"),
}).catch((rejection) => {
  log(`ERROR: Database failed to connect!`)
  console.error(rejection);
});

const app = express();
app.use("/_gridless", routes);

const port = process.env.PORT || staticConfig.get("server.port") || 3000;
app.listen(port, () => {
  // if (err) {
  //   console.log(err);
  // }
  log('Gridless up! Running on port: ' + port);
});
