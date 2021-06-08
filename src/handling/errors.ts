import chalk from "chalk";
import { ENOENT } from "constants";
import debug from "debug";

const error = debug("gridless:error");

export function errorHandler(err, req, res, next) {
  error(err?.message || chalk`{bold.red ERROR} {red at ${req.url || "an unknown URL"}}: ${err}`);
  // if (!req.url.includes("/_gridless")) {
  //   next(err);
  // }
  if (err == "gridless:notfound" || err == ENOENT || err == 404) {
    return res.status(404).render("genericerror.j2", {
      errorCode: "404",
      errorName: "Not Found",
      errorReason: "The resource you were looking for was not found.\n\n"+
      "* Check the documentation for acceptable endpoints.\n"+
      "* Make sure you're using the correct method.\n"+
      "* Make sure what you're looking for actually exists."
    });
  } else if (err == "gridless:deleted" || err == 410) {
    return res.status(410).render("genericerror.j2", {
      errorCode: "410",
      errorName: "Gone",
      errorReason: "The resource you were looking for was deleted."
    });
  } else if (err == "gridless:notoken" || err == 401) {
      return res.status(401).render("autherror.j2", {
        messages: ["You are not logged in."]
      });
  } else if (err == "gridless:invalidtoken") {
    return res.status(403).render("autherror.j2", {
      messages: ["Your token is invalid."]
    });
  } else if (err == "gridless:expiredtoken") {
    return res.status(401).render("autherror.j2", {
      messages: ["Your token has expired or has been revoked."]
    });
  } else if (err == "gridless:wrongtokentype") {
    return res.status(403).render("autherror.j2", {
      messages: ["You cannot access this resource with the type of token specified."]
    });
  } else next(err);
}