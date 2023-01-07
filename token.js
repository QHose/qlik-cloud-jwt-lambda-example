const jsonWebToken = require("jsonwebtoken");
const fs = require("fs");
const config = require("./config");
const { v4: uuidv4 } = require("uuid");

const key = fs.readFileSync("./privatekey.pem", "utf8");

const methods = {
  generate: function (sub, name, email, groups = []) {
    // kid and issuer have to match with the IDP config and the audience has to be qlik.api/jwt-login-session

    const signingOptions = {
      keyid: config.keyid,
      algorithm: "RS256",
      issuer: config.issuer,
      expiresIn: "30s",
      notBefore: "-30s",
      audience: "qlik.api/login/jwt-session"
    };

    // These are the claims that will be accepted and mapped anything else will be ignored. sub, subtype and name are mandatory.
    
    const payload = {
      jti: uuidv4().toString(),
      sub: sub,
      subType: "user",
      name: name,
      email: email,
      email_verified: true,
      groups: groups
    };
    // console.log("🚀 ~ file: token.js:32 ~ key used to sign the JWT: ", key)

    const token = jsonWebToken.sign(payload, key, signingOptions);
    // console.log("🚀 ~ file: token.js:34 ~ payload", payload)
    return token;
  }
  } 


module.exports = methods;