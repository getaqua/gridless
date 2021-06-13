import { ILoggedIn } from "src/auth/UserModel";
import readJson from "read-package-json";

const systemResolver = {
    Query: {
        getSystemInfo: function (_, __, {auth}: {auth: ILoggedIn}): Promise<any> {
            return new Promise(async (resolve, reject) => {
                readJson("package.json", null, false, (err, data) => {
                    if (err) reject(err);
                    resolve({
                        version: data.version,
                        name: globalThis.staticConfig.get("sitename") ?? "Gridless by Aqua"
                    });
                });
            });
        }
    }
}

export default systemResolver;