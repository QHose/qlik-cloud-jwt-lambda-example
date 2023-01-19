const express = require("express");
const https = require("https");
const app = express();
const fs = require("fs");
const config = require("./config");
const token = require("./token");
const { v4: uuidv4 } = require("uuid");
const generator = require("./selfSignedCerts");
const configureTenant = require("./configureTenant").configureTenant;

// app.use(express.static(__dirname)); //use if you need to load resources from some server directories


// create https vrowser certificates for testing 
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
  res.send('This tool is now setting up Qlik Sense Cloud -'+config.tenantDomain+'- with a JWT IdP')

});

// app.get("/setup"), (req,res) => {
//   console.log('server request to setup Qlik Sense SaaS...')
//   // await configureTenant();
//   res.send('This tool is now setting up Qlik Sense Cloud with a JWT endpo')
//   res.end();

// }






