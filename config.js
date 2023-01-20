require('dotenv').config();
//Actual values are in .env file in the root folder
module.exports = {  
    // app config 
    qlikWebIntegrationId: process.env.qlikWebIntegrationId,
    tenantDomain: process.env.tenantDomain,
    appId: process.env.appId,
    sheetId: process.env.sheetId,    

    // generic jwt token config
    issuer: process.env.issuer,
    keyid: process.env.keyid,

    // userId used to make tenant configuration API calls, needs to have a tenant admin role assigned
    tenantAdminEmail: process.env.tenantAdminEmail,
    IdPSubject: process.env.IdPSubject,

    //used for the automatic server configuration using the /setup endpoint. 
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret
  };
  