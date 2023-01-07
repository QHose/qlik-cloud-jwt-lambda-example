const express = require("express");
const app = express();
const fs = require("fs");
const config = require("./config");
const token = require("./token");
const { v4: uuidv4 } = require("uuid");

app.use(express.static(__dirname));

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
  const name = sub;
  const email = `${uuid}@anonymoususer.anon`;
  const groups = ['anonymous'];
  
  const genT = token.generate(sub, name, email, groups);
  

  res.json({ token: genT });

});

//create a server object:
app.listen(3000); //the server object listens on port 8080
