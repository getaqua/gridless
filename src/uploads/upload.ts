import express from "express";
import { createHash } from "crypto";
import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import { checkScope } from "src/auth/permissions";
import { ILoggedIn, Scopes } from "src/auth/UserModel";
import { LocalStorageConfigEntry } from "./config";
import { AttachmentModel } from "src/db/models/attachmentModel";
import { ExtSnowflakeGenerator } from "extended-snowflake";
import { Stream } from "stream";
import formidable, { File } from 'formidable';
import { ReadStream } from "fs";

const esg = new ExtSnowflakeGenerator(0);

export async function uploadFileEndpoint(req: express.Request & {user?: ILoggedIn}, res: express.Response, next: express.NextFunction) {
    if (!checkScope(req.user, Scopes.ContentAttachmentsUpload)) return res.send(401);
    //if (!req.query["flow"]) return res.send(400);
    // if (!(await getEffectivePermissions(
        //     await UserModel.findById(req.user.userId),
        //     await getFlow(req.query["flow"].toString())
        // )).post) return null;
        // Only local storage is supported at this time.
        // A random working storage, fitting any given criteria,
    // will be chosen as the upload target at a later point.
    const target = globalThis.staticConfig.get("storage").toJSON().find((v,i,a) => v.type == "local") as LocalStorageConfigEntry ?? {type: "local", id: "local", path: "/tmp/aqua"};
    var type = req.header("Content-Type");
    const tempname = esg.next();
    const uploadpath = target.path+"/UPLOADING__"+tempname;

    // Multipart formdata responses are not yet supported, as they have to be parsed.
    // When they do become supported, it will first check for a field named "file",
    // and if that doesn't exist it'll look for the first field that isn't
    // multipart/form-data.
    if (type.startsWith("multipart/form-data")) {
        const form = formidable({
            maxFileSize: 15 *1024*1024,
            uploadDir: target.path,
            filename: (_, ext, __, ___) => "UPLOADING__"+tempname,
            maxFields: 1
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }
        });

        form.on("file", (name, file) => type = file.mimetype);
        await new Promise<void>((resolve, reject) => {
            form.once("end", resolve);
            form.once("error", reject);
        });
    } else {
        // start piping the thing
        const outfile = createWriteStream(uploadpath);
        req.on('readable', () => {
            var data;

            while (data = req.read()) {
                outfile.write(data);
            }
        });
        await onStreamEnd(req);
    }

    if (req.header("Content-Length") == "0") return res.status(400).type("json").send({error: "Empty files cannot be uploaded."});

    
    var ogfilename = /(?:;[ ]?|^)filename="(.*)"/.exec(req.header("Content-Disposition") ?? "")?.[1];
    if (ogfilename == null) {
        ogfilename = "file." + express.static.mime.extension(type);
    }
    const extension = /\.(?:tar\.)?.[a-zA-Z0-9\-]+/.exec(ogfilename) ?? "bin";    
    
    // TODO: optimize if the server has imagemagick or ffmpeg installed, depending on the MIME type
    //var file = buffer;
    
    var _hash = createHash("sha512");
    const _hashInStream = createReadStream(uploadpath);
    _hashInStream.pipe(_hash);
    const hash = _hash.digest("hex");
    //await onStreamEnd(_hash);
    
    //const index = (globalThis.staticConfig.get("storage") as YAMLSeq).items.find((v,i,a) => v.toJSON().id == target.id);

    await AttachmentModel.create({
        filename: ogfilename,
        original_file: hash+extension,
        original_mime_type: type,
        index: target.id,
        app: req.user?.appId,
        user: req.user?.userId
    });

    // TODO TOO: check if it exists and skip rewriting the file
    //await fs.writeFile(target.path+"/"+hash+extension, file);
    await fs.rename(uploadpath, target.path+"/"+hash+extension);
    const url = "/_gridless/media/view/"+target.id+"/"+hash+extension;

    return res.status(201).type("json").send({url});

    //next(501)
}
function onStreamEnd(stream: Stream) {
    return new Promise<void>(function(resolve, reject) {
        stream.on('end', () => resolve());
        stream.on('error', reject); // or something like that. might need to close `hash`
    });
}