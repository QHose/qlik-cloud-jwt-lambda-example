# Embed Qlik Sense sheet with anonymous users using a JWT created locally (server side of your web server)

An example web page using JSON web tokens to process authorization to a Qlik Cloud tenant using JWT to insert the dummy user/group memberships to simulate anonymous users.Beaware that anonymous usages in currently not available in Qlik Cloud (as opposed to Client Managed where you could create an anon virtual proxy)

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

if you want to login users from your SaaS platform instead you just need to modify the code to get the actual users and his group membership and paste it here (`server.js`):

![image](https://user-images.githubusercontent.com/12411165/213189940-02177fe1-106f-4761-92aa-cf62ffd4f544.png)




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
- if you don't know how to create a certificate pair, go to [the integration provisioning demo](https://integration.qlik.com/?selection=WFamgeSCsaWk3B4ws), scroll down, and press the green button, "generate keys" ![image](https://user-images.githubusercontent.com/12411165/213187436-f5eaa69c-586b-4714-9d49-479bab1b2c54.png)

- on the next slide you can also try to login to your tenant first, before you do the "more difficult stuff". Make sure you make a web integration id (whitelist: https://integrationdemo1.qlik.com)
- if the IFrame loads Qlik content, but you get `No permission to open the app.` you need to set access rights for the space for the group or user. (beaware that you first have to login with an user and groups before you can assign them to a space.)
![image](https://user-images.githubusercontent.com/12411165/213187239-4557c872-ce0c-4e03-b542-a6fb4a73b3a9.png)

![image](https://user-images.githubusercontent.com/12411165/213195488-f287cce9-a6a6-4982-a29c-6d5d42021297.png)


