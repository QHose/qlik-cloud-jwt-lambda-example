#TLDR
This page contains the explanation belonging to [this github project](https://github.com/QHose/qlik-cloud-localserver-jwt-IFrame). If you download and run the project you it can setup/configure Qlik Sense SaaS (demo2) and show a sheet embedded via an IFrame (demo1)

# Introduction
An example web page using JSON web tokens to process authorization to a Qlik Cloud tenant using JWT to insert the (dummy) user/group memberships to simulate anonymous users. Beaware that anonymous usages in currently not available in Qlik Cloud (as opposed to Client Managed where you could create an anon virtual proxy). 

>You can also connect to your own identity software, and just get the userID and group memberships and inject it into the JWT token. 

# Introduction of use cases
This software can
* demo1: Present you a simple HTML page in which a sheet is embedded from a SaaS tenant you configured in the `.env` file.
* demo2: Setup your "empty" SaaS tenant by inserting some groups and creating an Idp. Used as preparation for demo1.

# Run the code demo 1
- update the .env file in the project root directory with your credentials. (If it isn't there it will be created for you the first time you run the server. Next you can edit it.) ![image](https://user-images.githubusercontent.com/12411165/214322813-81d1a544-98d8-433f-80f5-5d7b3092e4b4.png)

- update your [qlik tenant web integration id](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/mc-adminster-web-integrations.htm) to include `https://localhost:3000`
- If you don't run demo2: Publish an app in a space, make a note of the app id and the sheet id (view in browser url bar) and insert into the `.env` file.
- Only needed if you did not yet create an IdP and already have groups in your system: Create an Oauth client (see below)
- go to project source directory in powershell/cmd and run `npm install` and next  `node server.js`
- Open your browser and view https://localhost:3000/
- Tip: use [httptoolkit](https://httptoolkit.com/) tool to view the network traffic

# Run the code for demo2
> Run this code if you want your tenant to be automically setup to work with JWT for this demo.

Code parts below taken from [qlik.dev](https://qlik.dev/tutorials/configure-a-tenant). After you started your server with `node server.js` go to `https://localhost:3000/setup` this will trigger the API calls to connect to your tenant specified in the `.env` file.

If you like this tool can automatically
- Enable auto creation of groups if the user logs in (you need this because you first have to login with the user and his groups, before you can assign a group to a space)
- Set user entitlement assignment behavior (analyser, professional...)
- Configure an identity provider
- Configure authorization using JSON web tokens, it wlil add groups to the tenant by loggin in as user with those groups. This ensures the groups from your IdP are now known to Qlik and you can assign them in spaces. 
- Create the shared space
- Upload a demo sales app to this shared space
- Add a group to a shared space with the consumer role (this ensures your "anon group" can see things inside a space)

The output of the tool in the console will look like this: 
![image](https://user-images.githubusercontent.com/12411165/214327802-0ffe220c-05d1-4fe4-9ab0-b6dfc8b83b55.png)


# The authentication flow in the source code for demo1

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





# issues
- if you get 'Origin has not been granted access' you need to copy your hostname in the [web integration id of Qlik Cloud](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/mc-adminster-web-integrations.htm). 
- unable to decode jwt: your certificates are not ok. (sometimes and issue with line breaks, see above for the resolution), or you need to update your signing package (jsonwebtoken). 
- if you don't know how to create a certificate pair, go to [the integration provisioning demo](https://integration.qlik.com/?selection=WFamgeSCsaWk3B4ws), scroll down, and press the green button, "generate keys" ![image](https://user-images.githubusercontent.com/12411165/213187436-f5eaa69c-586b-4714-9d49-479bab1b2c54.png)

- on the next slide you can also try to login to your tenant first, before you do the "more difficult stuff". Make sure you make a web integration id (whitelist: https://integrationdemo1.qlik.com)
- if the IFrame loads Qlik content, but you get `No permission to open the app.` you need to set access rights for the space for the group or user. (beaware that you first have to login with an user and groups before you can assign them to a space.)
![image](https://user-images.githubusercontent.com/12411165/213187239-4557c872-ce0c-4e03-b542-a6fb4a73b3a9.png)

![image](https://user-images.githubusercontent.com/12411165/213195488-f287cce9-a6a6-4982-a29c-6d5d42021297.png)

# Succesful flow result for demo1

![image](https://user-images.githubusercontent.com/12411165/213196317-adda1917-0bb9-4d22-9bb1-3c38526cc4a7.png)

so in the log you will first see a 401, the user does not have a cookie, so request a token, send it to the jwt-session endpoint using a POST, receive a cookie, and open the IFrame.


# Create tenant specific OAUTH client

* Follow the [steps](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Admin/mc-create-oauth-client.htm) to create a `web` OAUTH client, select the option `Allow Machine-to-Machine (M2M)`. Skip step 6: Leave the redirect fields empty. Click Copy to clipboard to save the client ID and client secret for later use. Store the client secret in a secure location. Click Done.
* next you have to edit your new OAUTH client, and set the `consent method` to `trusted`. You have two options for consent: Required and Trusted. 


# Create OAuth client via MyQlik

* go to `https://account.myqlik.qlik.com/account`
* Create Oauth client ![image](https://user-images.githubusercontent.com/12411165/213698119-e396da53-908a-4529-80d4-f152648a0943.png)
* Copy and save the values in the project root .env file ![image](https://user-images.githubusercontent.com/12411165/213698370-7187ee47-44af-4023-b3b9-d21ead85e969.png)
![Uploading image.png…]()


