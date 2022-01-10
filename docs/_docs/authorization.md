---
title: Authorize Clients
---
# Authorize Clients
This document will guide you to create an application in the developer panel and use it to authenticate a client.

## Prerequisites
* A Gridless server to use, such as Aqua at `example.org`.
* You must be logged in to create applications. If you are not, Gridless will prompt you to log in.

## Create an Application
1. At your Gridless server, open your browser to `/_gridless/developers`. (If you're using `example.org`, browse to `https://example.org/_gridless/developers`.)
2. Click the "New" button in the top-right corner.
3. Input your client's name and select "Client" as the type. Bots are not yet supported.
4. Click "Create" to create your app.
5. Click on the app on the left side of your screen to see its information. This is where your client ID can be found.

## Authorization Code Method
1. Using your application's client ID from the developer panel at `/_gridless/developers`, make a POST request from your client app with the following format:
```
/_gridless/authorize?client_id=AQUA-CLIENTID&scopes=SCOPES&response_type=code
```
  If it succeeds, it should return a JSON object, containing your authentication code as the value of `code`.
  * Scopes are comma-separated, no spaces. The scopes you can use are documented in [Scopes](./scopes/).
2. Send the user to a browser with the URL:
```
/_gridless/authorize?client_id=AQUA-CLIENTID&code=AUTHCODE&grant_type=code
```
  If the user accepts the authorization, it should tell them to return to the app.
3. From your client, make a POST request:
```
/_gridless/claimtoken?client_id=AQUA-CLIENTID&code=AUTHCODE
```
  If it succeeds, it should return a JSON object with your token as the value of `token`.

## Errors
When performing the `claimtoken` step, you may encounter the following errors:
* `Client ID does not exist.`
* `APPNAMEHERE is a bot. Bot authorization is not supported yet.`
* `No authorization code given.`
* (A JWT error. I didn't program these so I don't know them.)
* `A user is not currently authorizing this app` -- This may happen when a user denies your request. Or you formatted it wrong.