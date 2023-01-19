const jsonWebToken = require("jsonwebtoken");
const fs = require("fs");
const config = require("./config");
const { v4: uuidv4 } = require("uuid");

const key = fs.readFileSync("./privatekey.pem", "utf8");

const methods = {
  generate: function (sub, name, email, groups = []) {
    // kid and issuer have to match with the IDP config and the audience has to be qlik.api/jwt-login-session

    // The signing options
    // The required properties for the signing options of the JWT are as follows:

    // keyid - This is a value created or supplied previously with identity provider configuration. It can be a random string.
    // algorithm - The encryption algorithm to protect the JWT with the private key.
    // issuer - This is a value created or supplied previously with identity provider configuration. It can be a random string.
    // expiresIn - The date/time the JWT expires.
    // notBefore - the date/time before which the JWT MUST NOT be accepted for processing.
    // audience - A required value instructing the Qlik platform how to treat the received JWT.
    const signingOptions = {
      keyid: config.keyid,
      algorithm: "RS256",
      issuer: config.issuer,
      expiresIn: "30s",
      notBefore: "-30s",
      audience: "qlik.api/login/jwt-session"
    };


    // The required claims for a Qlik JWT payload are the following:

    // jti - (JWT ID) claim provides a unique identifier for the JWT.
    // iat - The issued at date of the JWT provided as a numeric timestamp.
    // sub - The main identifier (aka subject) of the user.
    // subType - The type of identifier the sub represents. In this case, user is the only applicable value.
    // name - The friendly name to apply to the user.
    // email - The email address of the user.
    // email_verified - A claim indicating to Qlik that the JWT source has verified that the email address belongs to the subject.

    // you will notice the payload below does not include all fields, that is because the jsonwebtoken library creates one for you including the singingoptions. Make sure the token on jwt.io looks properly.

    const payload = {
      jti: uuidv4().toString(),
      sub: sub, //load the groups from your local IdP if you want to use authenticated users instead of simulating anonymous access
      subType: "user",
      name: name,
      email: email,
      email_verified: true,
      groups: groups //load the groups from your local IdP if you want to use authenticated users instead of simulating anonymous access
    };

    const token = jsonWebToken.sign(payload, key, signingOptions);
    console.log("token.js sign jwt: signingOptions", signingOptions)
    console.log("token.js sign jwt: payload", payload)
    console.log('token.js sign jwt: token: ', token)
    return token;
  }
}


module.exports = methods;