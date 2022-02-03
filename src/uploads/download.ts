import express from "express";
import { StorageConfigEntry } from "./config";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { constants } from "fs";
import debug from "debug";
import chalk from "chalk";
//import { Attachment, AttachmentModel } from "src/db/models/attachmentModel";
import { fileURLToPath } from "url";
import { Attachment } from "@prisma/client";
import { db } from "src/server";

const log = debug("gridless:media");

export async function viewFileEndpoint(req: express.Request, res: express.Response, next: express.NextFunction) {
  //if (!checkScope(req.user, Scopes.ContentAttachmentsUpload)) return res.send(401);
  // this endpoint requires no login or scopes B)

  const store = globalThis.staticConfig.get("storage").toJSON().find((v,i,a) => v.id == req.params["index"]) as StorageConfigEntry;
  if (!store) return res.status(500).send("Media store not found");

  if (store.type == "local") {
    try {
      await fs.access(store.path+"/"+req.params["filename"])
    } catch(e) {
      if (e["code"] == "ENOENT") {
        return res.sendStatus(404);
      } else {
        log(chalk`{bold.red ERROR} {red at media view endpoint}: Permission denied to access file from store {bold ${store.id}}: ${req.params[""]}`);
        return next("gridless:mediastoreblocked");
      }
    }
    // the file is there and I can get to it! let's go
    const attachment: Partial<Attachment> = await db.attachment.findFirst({
      where: req.query["id"] ? {snowflake: req.query["id"] as string ?? "fuck"} : {OR: [{optimized_file: req.params["filename"]}, {original_file: req.params["filename"]}]},
    });
    //await AttachmentModel.findOne(req.query["id"] ? {snowflake: req.query["id"]} : {$or: [{optimized_file: req.params["filename"]}, {original_file: req.params["filename"]}]}, {original_mime_type: 1, filename: 1});
    res.setHeader("Cache-Control", "public, max-age=2629800, immutable");
    const file = createReadStream(store.path+"/"+req.params["filename"]);
    const type = attachment.original_mime_type ?? express.static.mime.lookup(attachment.filename)[0];
    res.type(type);
    if (req.path.includes("media/view") && type != "text/html") res.setHeader("Content-Disposition", "inline");
    else res.setHeader("Content-Disposition", "attachment; filename=\""+attachment.filename+"\"");
    file.pipe(res);
    //file.once("end", () => res.end());
  } else {
    return res.sendStatus(404);
  }
}