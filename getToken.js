const { google } = require("googleapis");

async function getAccessToken() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();

  console.log("ACCESS TOKEN:\n", accessTokenResponse.token);
}

getAccessToken();
