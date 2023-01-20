const https = require("https");
const axios = require("axios");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const enigma = require("enigma.js");
const schema = require("enigma.js/schemas/12.612.0");
const WebSocket = require("ws");

// load local config file with all Qlik Sense settings

const config = require("./config");

var SOURCE_TENANT = config.tenantDomain;
var TARGET_TENANT = config.tenantDomain; //In a multitenant setup you will copy stuff from the source to the target tenant for each customer
var TARGET_TENANT_ID = "";
var CLIENT_ID = config.clientId
var CLIENT_SECRET = config.clientSecret;
var SHARED_SPACE_ID = "";
var MANAGED_SPACE_ID = "";
var ISSUER = "OEMPartnername";
var PUBLIC_CERTIFICATE = fs.readFileSync("./public.key", "utf8");
var KEY_ID = "AnyValueIsOk1";
var SOURCE_ACCESS_TOKEN = ""; 
var TARGET_ACCESS_TOKEN = "";

  //configure tenant https://qlik.dev/tutorials/configure-a-tenant

exports.configureTenant = async function () {
  console.log("configuring tenant: "+TARGET_TENANT);

  try {
    var tenantId = await getTenantId(TARGET_TENANT, jwt);
    console.log("🚀 ~ file: configureTenant.js:34 ~ tentantId", tentantId)
  } catch (error) {
    console.error('Login with JWT is not succesful');
  }
  

//   await autoCreationOfGroups();
//   await setUserEntitlement();

//   //Configure an identity provider
//   await createJWTConfiguration();
  // // Add groups to the tenant
  // //WAIT FOR IDP CREATION ISSUE TO BE RESOLVED.
  // await addGroupsToTenant();
};



async function getJWTToken() {
  console.log("🚀 ~ file: configureTenant.js:32 ~ getJWTToken ~ getJWTToken");
  //login as an existing tenant admin user by getting its IdP subject from https://bies.eu.qlikcloud.com/console/users/allusers
  // Name  Martijn Biesbroek
  // Email martijn.biesbroek@qlik.com
  // User ID  qZ8d6-kH_dA7kqEEwcGHOXz3oEzmQ1dT
  // IdP subject  auth0|a08D000000kgjwSIAQ

  const sub = config.IdPSubject;
  const email = config.tenantAdminEmail;
  const name = email.substring(0, email.indexOf("@"));
  // const groups = ['']; Optional claim/field, we asume here that this user already exists in your Tenant

  const jwt = token.generate(
    config.IdPSubject,
    name,
    config.tenantAdminEmail,
    []
  );
  SOURCE_ACCESS_TOKEN = jwt;
  TARGET_ACCESS_TOKEN = jwt;

  return jwt;
}

async function jwtLogin(token) {
    var response =  await axios({
      method: 'post',
      url: `https://${config.tenantDomain}/login/jwt-session?qlik-web-integration-id=${config.qlikWebIntegrationId}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "qlik-web-integration-id": config.qlikWebIntegrationId
      }
    });
    console.log(response.headers['cookie']); // check the cookie in headers
}



async function createJWTConfiguration() {
  TARGET_TENANT_ID = await getTenantId(TARGET_TENANT, TARGET_ACCESS_TOKEN);
  console.log(
    "🚀 ~ file: configureTenant.js:45 ~ createJWTConfiguration ~ TARGET_TENANT_ID",
    TARGET_TENANT_ID
  );
  var data = {
    tenantIds: [TARGET_TENANT_ID],
    provider: "external",
    protocol: "jwtAuth",
    interactive: false,
    active: true,
    description: "JWT IdP for deferred authentication to my application",
    options: {
      jwtLoginEnabled: true,
      issuer: ISSUER,
      staticKeys: [
        {
          kid: KEY_ID,
          pem: PUBLIC_CERTIFICATE,
        },
      ],
    },
  };
  console.log(
    "🚀 ~ file: main.js ~ line 73 ~ createJWTConfiguration ~ data",
    JSON.stringify(data)
  );

  return await makePostCall(
    TARGET_TENANT,
    TARGET_ACCESS_TOKEN,
    "/api/v1/identity-providers",
    data
  );
}

async function getTenantId(tenant, token) {
  TARGET_TENANT_ID = await makeGetCall(tenant, token, "/api/v1/users/me");
  TARGET_TENANT_ID = TARGET_TENANT_ID.id;
  return TARGET_TENANT_ID;
}

async function autoCreationOfGroups() {
  var data = [
    {
      op: "replace",
      path: "/autoCreateGroups",
      value: true,
    },
    {
      op: "replace",
      path: "/syncIdpGroups",
      value: true,
    },
  ];
  return await makePatchCall(
    TARGET_TENANT,
    TARGET_ACCESS_TOKEN,
    "/api/v1/groups/settings",
    data
  );
}

async function setUserEntitlement() {
  var data = {
    autoAssignProfessional: false,
    autoAssignAnalyzer: true,
  };
  await makePutCall(
    TARGET_TENANT,
    TARGET_ACCESS_TOKEN,
    "/api/v1/licenses/settings",
    data
  );
}

// Simplified HTTP Request calls

async function makePostCall(tenantUrl, token, path, body) {
  console.log("_______________________________________________");
  console.log(
    "🚀  makePostCall ",
    tenantUrl + path + " - " + JSON.stringify(body)
  );
  try {
    const response = await axios.post("https://" + tenantUrl + path, body, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log(
      "🚀 ~ file: main.js ~ makePostCall ~" + path + ": response.data",
      response.data
    );
    return response.data;
  } catch (error) {
    console.error("🚀 ~ file: main.js ~ make post call ~ error", error);
  }
}

async function makePutCall(tenantUrl, token, path, body) {
  console.log(
    "🚀  makePostCall ",
    tenantUrl + path + " - " + JSON.stringify(body)
  );
  try {
    const response = await axios.put("https://" + tenantUrl + path, body, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log(
      "🚀 ~ file: main.js ~ makePutCall ~ response.data",
      response.data
    );
    return response.data;
  } catch (error) {
    console.error("🚀 ~ file: main.js ~ make put call ~ error", error);
  }
}

async function makePatchCall(tenantUrl, token, path, body) {
  // console.log("🚀  makePatchCall ", tenantUrl + path + ' - ' + JSON.stringify(body));
  try {
    const response = await axios.patch("https://" + tenantUrl + path, body, {
      headers: {
        Authorization: "Bearer " + token,
        withCredentials: true,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    // console.log("🚀 ~ file: main.js ~ ~ makePatchCall ~ response.data", response)
    return;
  } catch (error) {
    console.error("🚀 ~ file: main.js ~ make patch call ~ error", error);
  }
}

async function makeGetCall(tenantUrl, token, path) {
  try {
    const response = await axios.get("https://" + tenantUrl + path, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    // console.log("🚀 ~ file: main.js ~ line 48 ~ makeGetCall ~ response", response.data)
    return response.data;
  } catch (error) {
    console.error("🚀 ~ file: main.js ~ line 47 ~ makeGetCall ~ error: "+path, error);
  }
}
