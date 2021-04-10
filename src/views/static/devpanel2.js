const appThing = (data) => `<button class="list-group-item ripple rounded" data-app-id="${data.id}">
<div class="gr-app-row">
    <img src="${data.avatar_url || "https://utulsa.edu/wp-content/uploads/2018/08/generic-avatar.jpg"}" class="gr-avatar">
    <h5 class="mb-1">${data.name || "How did this happen?"}</h5>
</div>
<div class="hover-overlay rounded">
    <div class="mask" style="background-color: rgba(0, 0, 0, 0.2)"></div>
</div>
</button>`
const appQuery = (id) => ({
    "query": `query {
    application(id: "${id}") {
        name
        avatar_url
        type
    }
}`
})
const listQuery = {
    "query": `query {
    allApplications {
        name
        id
        avatar_url
    }
}`}

const listElement = document.getElementById("gr-app-list");
const listPage = document.getElementById("gr-app-list-page");
const detailsPage = document.getElementById("gr-app-details-page");
const inputs = {};

async function appClick(ev) {
    const appId = ev.currentTarget.dataset.appId;
    const element = ev.currentTarget;
    console.warn(ev.currentTarget);
    // perform the query
    const res = await fetch("/_gridless/developers", {
        method: "POST",
        body: JSON.stringify(appQuery(appId)),
        credentials: "include",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        mode: 'cors',
    });
    // set the page
    if (res.ok) {
        //toggle buttons
        listElement.children.forEach((element) => element.className.replace(" active", ""))
        element.className += " active";
        //toggle planel
        listPage.className.replace(" is-active", "");
        detailsPage.className += " is-active";
        //TODO: set up the inputs to do stuff
    } else {
        console.error(res);
        //turn it off! turn it off!
        listElement.children.forEach((element) => element.className.replace(" active", ""))
        listPage.className.replace(" is-active", "");
        detailsPage.className.replace(" is-active", "");
    }
}

const newAppInputs = {
    name: () => document.getElementById("newAppModalName").value,
    //avatar_url: () => document.getElementById("newAppModalAvatarUrl").value,
    type: () => document.getElementById("newAppModalType__Client").checked ? "CLIENT"
        : document.getElementById("newAppModalType__Bot").checked ? "BOT"
        : null
}

function sanitizeInput(input) {
    return input
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\"');
}

function showAlert(id) {
    let instance = mdb.Alert.getInstance(document.getElementById(id));
    instance.show();
}

async function createApp() {
    if (!newAppInputs.type()) {alert("Type is required!"); return;}
    if (!newAppInputs.name()) {alert("NAme is required!"); return;}
    const res = await fetch("/_gridless/developers", {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        mode: 'cors',
        body: JSON.stringify({query: `mutation {
    newApplication(
        name: "${sanitizeInput(newAppInputs.name())}",
        type: ${sanitizeInput(newAppInputs.type())}
    ) {
        name
        type
    }
}`}),
        credentials: "include",
    });
}

async function getApps() {
    const res = await fetch("/_gridless/developers", {
        method: "POST",
        body: JSON.stringify(listQuery),
        credentials: "include",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        mode: 'cors',
    });
    const data = await res.json();
    listElement.innerHTML = "";
    for (var index in data["data"]["allApplications"]) {
        listElement.innerHTML += appThing(data["data"]["allApplications"][index]);
    }
    document.querySelectorAll("#gr-app-list>[data-app-id]").forEach((element) => element.addEventListener("click", appClick))
}

getApps();