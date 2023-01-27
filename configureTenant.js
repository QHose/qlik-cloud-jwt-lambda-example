const request = require("request");
const https = require("https");
const axios = require("axios");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const enigma = require("enigma.js");
const schema = require("enigma.js/schemas/12.612.0");
const WebSocket = require("ws");
const token = require("./token");
const dotenv = require("dotenv");

// load local config file with all Qlik Sense settings

const config = require("./config");

var TARGET_TENANT = config.tenantDomain; //In a multitenant setup you will copy stuff from the source to the target tenant for each customer
var TARGET_TENANT_ID = "";
var TARGET_ACCESS_TOKEN = "";
var MANAGED_SPACE_ID = "";
var MANAGED_SPACE_NAME = "Anon_managed";
var SHARED_SPACE_NAME = "Anon_shared";
var SHARED_SPACE_ID = "";
var STAGED_APP_ID = "";
var GROUP_ID_TO_BE_ASSIGNED = "";

//configure tenant https://qlik.dev/tutorials/configure-a-tenant
exports.configureTenant = async function () {
  console.log("configuring tenant: " + TARGET_TENANT);

  try {
    // Request an access token
    TARGET_ACCESS_TOKEN = await requestAccessToken(TARGET_TENANT);
    await getTenantId(TARGET_TENANT, TARGET_ACCESS_TOKEN);
    await autoCreationOfGroups();
    await setUserEntitlement(); //assign analyser or professional user license
    await createIdP();

    // Add groups to the tenant
    var jwt = await createJWTwithDummyGroups();
    await jwtLogin(jwt);
    await create_shared_space();
    await create_managed_space();
    await import_app();
   await getGroupId(process.env.groupForAnonUsers);
   await assignGroupToSpace(SHARED_SPACE_ID);
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

async function assignGroupToSpace(space_id){
  try {
    const response = await axios.post(`https://${TARGET_TENANT}/api/v1/spaces/${space_id}/assignments`, 
      {
        "type": "group",
        "assigneeId": GROUP_ID_TO_BE_ASSIGNED,
        "roles": ["consumer"]
      }
    , {
      headers: {
        Authorization: `Bearer ${TARGET_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(`INFO: The group with ID '${GROUP_ID_TO_BE_ASSIGNED}' has been assigned to the space with ID '${space_id}' with the 'consumer' role in tenant '${TARGET_TENANT}'.`);
  } catch (error) {
    // if (error.response.data.code === 'AssignmentConflict') {
    //   console.log(`INFO: The group with ID '${GROUP_ID_TO_BE_ASSIGNED}' is already assigned to the space with ID '${space_id}' in tenant '${TARGET_TENANT}'.`);
    // } else {
      console.log(`ERROR: Failed to assign group with ID '${GROUP_ID_TO_BE_ASSIGNED}' to the space with ID '${space_id}' in tenant '${TARGET_TENANT}. You probably already assigned the group before... `, error.response.data);
      process.exit(1);
    // }
  }
}


//https://qlik.dev/tutorials/deploy-a-qlik-sense-application-to-a-tenant#2-deploy-the-application-to-the-shared-space
//https://qlik.dev/apis/rest/apps#%23%2Fentries%2Fv1%2Fapps%2Fimport-post
async function import_app() {
  const filePath = "./24 Days of Visualization.qvf";
  const data = fs.readFileSync(filePath);

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: ${filePath} does not exist or is not accessible.`);
  }

  var config = {
    method: "post",
    url: `https://bies.eu.qlikcloud.com/api/v1/apps/import?mode=autoreplace&spaceId=${SHARED_SPACE_ID}`,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/octet-stream",
      Authorization: "Bearer " + TARGET_ACCESS_TOKEN,
    },
    data: data,
  };

  try {
    const response = await axios(config);
    STAGED_APP_ID = response.data.attributes.id;
    updateEnvFile();
    console.log(
      `🚀 App imported to ${SHARED_SPACE_NAME} and received id: `,
      STAGED_APP_ID
    );
  } catch (error) {
    console.log(error);
  }
}

//https://{{target_tenant}}.{{region}}.qlikcloud.com/api/v1/groups?filter=name eq "{{group}}"
async function getGroupId(name){
  var groups = await makeGetCall(TARGET_TENANT, TARGET_ACCESS_TOKEN, `/api/v1/groups?filter=name eq "${name}"`);
  console.log("🚀 ~ file: configureTenant.js:92 ~ getGroupId ~ ", groups)
  if (groups.data.length){
    GROUP_ID_TO_BE_ASSIGNED = groups.data[0].id;
    console.log("🚀 ~ file: configureTenant.js:125 ~ getGroupId ~ GROUP_ID_TO_BE_ASSIGNED", GROUP_ID_TO_BE_ASSIGNED)
  }
}
async function create_managed_space() {
  try {
    const managed_space_data = {
      name: MANAGED_SPACE_NAME,
      type: "managed",
    };
    const managed_space_config = {
      headers: {
        Authorization: `Bearer ${TARGET_ACCESS_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    const new_managed_space_response = await axios.post(
      `https://${TARGET_TENANT}/api/v1/spaces`,
      managed_space_data,
      managed_space_config
    );
    console.log(
      `INFO: Created the managed space '${MANAGED_SPACE_NAME}' with ID '${new_managed_space_response.data.id}' in tenant '${TARGET_TENANT}'.`
    );
    MANAGED_SPACE_ID = new_managed_space_response.data.id;
  } catch (error) {
    if (error.response.status == 409) {
      console.log("Space already exist, no need to create it...");
      return await getSpaceIdByName(MANAGED_SPACE_NAME);
    } else {
      console.log(
        `ERROR: Failed to create managed space ${MANAGED_SPACE_NAME}`,
        error
      );
    }
  }
}

async function create_shared_space() {
  try {
    const shared_space_data = {
      name: SHARED_SPACE_NAME,
      type: "shared",
    };
    const shared_space_config = {
      headers: {
        Authorization: `Bearer ${TARGET_ACCESS_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    const new_shared_space_response = await axios.post(
      `https://${TARGET_TENANT}/api/v1/spaces`,
      shared_space_data,
      -shared_space_config
    );
    console.log(
      `INFO: Created the shared space '${SHARED_SPACE_NAME}' with ID '${new_shared_space_response.data.id}' in tenant '${TARGET_TENANT}'.`
    );
    SHARED_SPACE_ID = new_shared_space_response.data.id;
  } catch (error) {
    // console.log(`ERROR: Failed to create shared space '${SHARED_SPACE_NAME}'.` );
    console.log("Space already exist, no need to create it...");
    SHARED_SPACE_ID = await getSpaceIdByName(SHARED_SPACE_NAME);
  }
}

async function getSpaceIdByName(spaceName) {
  try {
    var spaceResponse = await makeGetCall(
      TARGET_TENANT,
      TARGET_ACCESS_TOKEN,
      `/api/v1/spaces?filter=NAME eq "${spaceName}"`
    );
    var id = spaceResponse.data[0].id;
    console.log(`Space id fournd for ${spaceName} - ` + id);
    return id;
  } catch (error) {
    console.error(error.response.data);
  }
}

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
    console.log("🚀 ~ file: main.js ~ line 44 ~ requestAccessToken ~ response", response.data.access_token)
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Failed to make first API call, this probably means that you dont have the correct OAUTH Credentials"
    );
    console.error("URL called: "+error.response.config.url+" with the following parameters: "+error.response.config.data)
  }
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
    ["Admin", "Finance", "Marketing", "Sales", process.env.groupForAnonUsers]
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
    console.log(
      `!!!!!!!!!!!!!!!!!!!! IDP CREATED !!!!!!!!!!!!!!!!!!!!!! `,
      response.data
    );
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
    console.log(
      "🚀 makeGetCall ~ to url: ",
      response.config.url
      // response.config.headers
    );
    return response.data;
  } catch (error) {
    console.error(
      "🚀 ~ file: main.js ~ line 47 ~ makeGetCall ~ error: " + path,
      error
    );
  }
}

function updateEnvFile() {
  // Read the current environment variables from the .env file
  dotenv.config();

  // Update the value of the appId variable
  process.env.appId = STAGED_APP_ID;

  // Read the current environment variables from the .env file
  const data = fs.readFileSync(".env", "utf-8");

  // Replace the value of the specific variable in the file
  const newData = data.replace(/appId=(.*)/g, `appId=${STAGED_APP_ID}`);

  // Save the updated environment variables to the .env file
  fs.writeFileSync(".env", newData);
}
