# qlik-cloud-jwt-lambda-example

An example web page using JSON web tokens to process authorization to a Qlik Cloud tenant using JWT to insert the user/group memberships.

# The authentication flow

- The anonymous user accesses the site with the embedded content from the Qlik Cloud tenant. 
    - (`server.js` - `app.get("/")`
- The site makes a request to verify if the user is currently signed in to the Qlik Cloud tenant.
    - `index.html` - `await qlikLogin()`;
    - `checkedLogged` makes a call to `await fetch(https://${TENANT}/api/v1/users/me)`
- If there is no existing session to the Qlik Cloud tenant, the site requests a JWT from the local token endpoint.
    - `server.js - app.get("/token")` called by
    - `index.html - await getJWTToken('/token')`
- The site accepts the token and requests a session cookie from the Qlik Cloud tenant's JWT session endpoint.    
- The user receives a cookie authorizing the site to render the iframe content from the Qlik Cloud tenant.
    - `renderSingleIframe in index.html`
    - `frameUrl = https://${TENANT}/single/?appid=${appId}&sheet=${sheetId}&opt=ctxmenu,currsel`

Please refer to the [complete tutorial on qlik.dev](https://qlik.dev/tutorials/embed-content-using-iframes-and-anonymous-access).

# JWT contents

check with [jwt.io](jwt.io), make sure you put in your private and public key, and make sure the signature is valid!

![image](https://user-images.githubusercontent.com/12411165/211025134-f46f77ad-46d3-451d-ba4c-8edb3f46216c.png)

# run the code
- update index.html, config.js with your credentials (use find replace)
- update your [qlik tenant web integration id](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/mc-adminster-web-integrations.htm) to include `https://localhost:3000`
- Publish an app in a space, make a note of the app id and the sheet id (view in browser url bar)
- go to project source directory in powershell/cmd and run `npm install` and next  `node server.js`
- open your browser and view https://localhost:3000/
- use httptoolkit tool to view the network traffic


# issues
- if you get 'Origin has not been granted access' you need to copy your hostname in the [web integration id of Qlik Cloud](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/mc-adminster-web-integrations.htm). 
- unable to decode jwt: your certificates are not ok. (sometimes and issue with line breaks, see above for the resolution), or you need to update your signing package (jsonwebtoken). 
- if you don't know how to create a certificate pair, go to [the integration provisioning demo](https://integration.qlik.com/?selection=WFamgeSCsaWk3B4ws), scroll down, and press the green button, "generate keys"
- on the next slide you can also try to login to your tenant first, before you do the "more difficult stuff". Make sure you make a web integration id (whitelist: https://integrationdemo1.qlik.com)
