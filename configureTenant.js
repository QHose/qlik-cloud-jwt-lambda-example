const request = require("request");
const https = require("https");
const axios = require("axios");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const enigma = require("enigma.js");
const schema = require("enigma.js/schemas/12.612.0");
const WebSocket = require("ws");
const token = require("./token");

// load local config file with all Qlik Sense settings

const config = require("./config");

var TARGET_TENANT = config.tenantDomain; //In a multitenant setup you will copy stuff from the source to the target tenant for each customer
var TARGET_TENANT_ID = "";
var TARGET_ACCESS_TOKEN = "";

//configure tenant https://qlik.dev/tutorials/configure-a-tenant
exports.configureTenant = async function () {
  console.log("configuring tenant: " + TARGET_TENANT);

  try {
    // Request an access token
    TARGET_ACCESS_TOKEN = await requestAccessToken(TARGET_TENANT);
    await getTenantId(TARGET_TENANT, TARGET_ACCESS_TOKEN);
    await autoCreationOfGroups();
    await setUserEntitlement();
    await createIdP();
    // Add groups to the tenant
    var jwt = await createJWTwithDummyGroups();
    await jwtLogin(jwt);
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log("Error", error.message);
    }
    console.log(error.config);
  }
};

async function requestAccessToken(tenantType) {
  console.log("🚀 ~ file: ~ requestAccessToken ~ tenantType", tenantType);
  try {
    const response = await axios.post(
      "https://" + tenantType + "/oauth/token",
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Failed to make first API call, this probably means that you dont have the correct OAUTH Credentials"
    );
  }
  // console.log("🚀 ~ file: main.js ~ line 44 ~ requestAccessToken ~ response", response)
}

async function createJWTwithDummyGroups() {
  const email = config.tenantAdminEmail;
  const name = email.substring(0, email.indexOf("@"));
  // const groups = ['']; Optional claim/field, we asume here that this user already exists in your Tenant, beaware not to overwrite them!

  //replace the groups here with your specific groups
  const jwt = token.generate(
    config.IdPSubject,
    "Initial load of the groups",
    config.tenantAdminEmail,
    ["Admin", "Finance", "Marketing", "Sales", "Anonymous"]
  );
  return jwt;
}

async function jwtLogin(token) {
  // console.log("🚀 ~ file: configureTenant.js:100 ~ jwtLogin ~ token", token);
  try {
    return await axios({
      method: "post",
      url: "https://" + config.tenantDomain + "/login/jwt-session",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log("Error", error.message);
    }
    console.log(error.config);
  }
}

async function createIdP() {
  TARGET_TENANT_ID = await getTenantId(TARGET_TENANT, TARGET_ACCESS_TOKEN);
  console.log("🚀  createIdP ~ TARGET_TENANT_ID", TARGET_TENANT_ID);

  const options = {
    method: "POST",
    url: "https://" + config.tenantDomain + "/api/v1/identity-providers",
    headers: {
      Accept: "application/json",
      "Content-type": "application/json",
      Authorization: "Bearer " + TARGET_ACCESS_TOKEN,
    },
    data: {
      provider: "external",
      interactive: false,
      active: true,
      protocol: "jwtAuth",
      tenantIds: ["50gbQ2Wm53V4vGUvIJ0MDrHHJtvByj0w"],
      options: {
        staticKeys: [
          {
            pem: fs.readFileSync("./public.pem", "utf8"),
            kid: config.keyid,
          },
        ],
        issuer: config.issuer,
      },
    },
  };

  try {
    const response = await axios(options);
    console.log(`!!!!!!!!!!!!!!!!!!!! IDP CREATED !!!!!!!!!!!!!!!!!!!!!! `,response.data);
  } catch (e) {
    //Ignore if it already exists....
    // console.log(e);
  }
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
    console.error(
      "🚀 ~ file: main.js ~ line 47 ~ makeGetCall ~ error: " + path,
      error
    );
  }
}
