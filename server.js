const express = require("express");
const axios = require('axios');
const https = require("https");
const app = express();
const fs = require("fs");
const config = require("./config");
const token = require("./token");
const { v4: uuidv4 } = require("uuid");
const generator = require("./certificateCreator");
const configureTenant = require("./configureTenant").configureTenant;

// app.use(express.static(__dirname)); //use if you need to load resources from some server directories


// create public private key pair for JWT and IdP creation
generator.generateCertPair();
// create https browser certificates for testing on https local
const cert = generator.generateCert({altNameIPs: ["127.0.0.1", "127.0.0.2"], validityDays: 2});


//run the HTTPS server
https
  .createServer(
		// Provide the private and public key to the server by reading each
		// file's content with the readFileSync() method.
    {
      key: cert.privateKey,
      cert: cert.cert,
    },
    app
  )
  .listen(3000, () => {
    console.log("server is runing at port 3000 using HTTPS");
  });



app.get("/", (req, res) => {
  console.log('server received get for landing page')
  let landingPage = fs.readFileSync("./index.html", "utf8");
  res.write(landingPage);
  res.end();
});

app.get("/config", (req, res) => {
  res.json(config);
  res.end();
});

app.get("/token", (req, res) => {
  const uuid = uuidv4();
  const sub = `sub_${uuid}`;
  const name = 'Anonymous user'
  const email = `${uuid}@anonymoususer.anon`;
  const groups = ['anonymous'];
  
  const genT = token.generate(sub, name, email, groups);
  res.json({ token: genT });
});



app.get("/setup", async (req, res) => {
  console.log('server request to setup Qlik Sense SaaS...')
  await configureTenant();
  res.send('This tool has finsished setting up Qlik Sense Cloud -'+config.tenantDomain+'- with a JWT IdP, and uploaded some user groups')

});


const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function setup() {
  try {
    const response = await axios.get('https://localhost:3000/setup', { httpsAgent: agent });
    console.log(response.data);
  } catch (err) {
    console.error(err);
  }
}

// setup(); activate if you want it to run the setup each time the nodejs server starts...


const envFields = {
  qlikWebIntegrationId: "q53JKnG6HxRKeSeDdUK88_pDo5mmGUQC",
  tenantDomain: "bies.eu.qlikcloud.com",
  appId: "c8133385-b9bf-4b27-af62-1faf52db8f1a",
  sheetId: "XkgjPf",
  issuer: "myIssuer",
  keyid: "myKeyId",
  tenantAdminEmail: "martijn.biesbroek@qlik.com",
  IdPSubject: "auth0|a08D000000kgjwSIAQ",
  clientId: "",
  clientSecret: ""
};

const envFile = ".env";

if (!fs.existsSync(envFile)) {
    let envVars = Object.keys(envFields).map(key => `${key}=${envFields[key]}`);
    fs.writeFileSync(envFile, envVars.join("\n"), { flag: "w" });
    console.log(".env file created successfully.")
} else {
    console.log(".env file already exists.")
}

