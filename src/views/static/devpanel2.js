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
    "query": `query appQuery {
    application(id: "${id}") {
        name
        avatar_url
        type
        id
    }
    applicationClientId(id: "${id}")
}`
})
const listQuery = {
    "query": `query listQuery {
    allApplications {
        name
        id
        avatar_url
    }
}`}
const patchQuery = (id, data) => ({
    "query": `mutation PatchQuery($data: ApplicationPatch) {
    updateApplication(id: "${id}", data: $data) {
        id
    }
}`, "variables": {data: data}});
const deleteQuery = (id) => ({
    "query": `mutation DeleteQuery {
    deleteApplication(id: "${id}")
}`});

const listElement = document.getElementById("gr-app-list");
const listPage = document.getElementById("gr-app-list-page");
const detailsPage = document.getElementById("gr-app-details-page");
var selectedApp = "";
const inputs = {
    name: () => document.getElementById("grDetailsName"),
    avatar_url: () => document.getElementById("grDetailsAvatarUrl"),
    client_id: () => document.getElementById("grDetailsClientId")
};

var _justUpdated = [];
async function patchDetail(app, key, value, id) {
    const appId = selectedApp;
    let data = {};
    data[key] = value;
    // perform the query
    const res = await fetch("/_gridless/developers", {
        method: "POST",
        body: JSON.stringify(patchQuery(app, data)),
        credentials: "include",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        mode: 'cors',
    });
    if (res.ok) {
        if (_justUpdated.includes(id)) return;
        _justUpdated.push(id);
        await getApps();
        // tell the user that it was updated successfully
        document.getElementById(id).className += " is-valid";
        document.getElementById(id).parentElement.getElementsByClassName("invalid-feedback")[0].innerHTML = "Unknown error";
        await new Promise(resolve => setTimeout(resolve, 5000));
        document.getElementById(id).className = document.getElementById(id).className.replace(" is-valid", "");
        _justUpdated.splice(_justUpdated.indexOf(id));
    } else {
        console.error(res);
        document.getElementById(id).className += " is-invalid";
        document.getElementById(id).parentElement.getElementsByClassName("invalid-feedback")[0].innerHTML = "Error in updating: "+res.status+" "+res.statusText
        await new Promise(resolve => setTimeout(resolve, 20000));
        document.getElementById(id).className = document.getElementById(id).className.replace(" is-invalid", "");
    }
}

async function deleteApplication() {
    const appId = selectedApp;
    // perform the query
    const res = await fetch("/_gridless/developers", {
        method: "POST",
        body: JSON.stringify(deleteQuery(appId)),
        credentials: "include",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        mode: 'cors',
    });
    if (res.ok && (await res.json())["data"]["deleteApplication"]) {
        //showAlert("deleteSuccessAlert");
        await getApps();
        deselect();
    } else {
        window.alert("Deletion failed");
        console.log(res.json());
    }
}

async function appClick(ev) {
    const appId = ev.currentTarget.dataset.appId;
    const element = ev.currentTarget;
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
        const json = await res.json();
        const data = json["data"]["application"];
        //toggle buttons
        listElement.children.forEach((element) => element.className = element.className.replace(" active", ""))
        element.className += " active";
        selectedApp = data["id"];
        //toggle planel
        listPage.className = listPage.className.replace(" is-active", "");
        detailsPage.className += " is-active";
        //set up the inputs to do stuff
        inputs.name().value = data["name"];
        inputs.avatar_url().value = data["avatar_url"];
        inputs.client_id().value = json["data"]["applicationClientId"];
    } else {
        console.error(res);
        //turn it off! turn it off!
        deselect();
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
    return null;
    let instance = mdb.Alert.getInstance(document.getElementById(id));
    instance.show();
}

async function createApp() {
    if (!newAppInputs.type()) {alert("Type is required!"); return;}
    if (!newAppInputs.name()) {alert("Name is required!"); return;}
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
    if (res.ok) {
        await getApps();
    }
}

function deselect() {
    listElement.children.forEach((element) => element.className = element.className.replace(" active", ""))
    listPage.className = listPage.className.replace(" is-active", "");
    detailsPage.className = detailsPage.className.replace(" is-active", "");
}

var _isSyncing = false;
async function getApps() {
    if (_isSyncing) return;
    _isSyncing = true;
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
    if (selectedApp != "") listElement.querySelectorAll("[data-app-id=\""+selectedApp+"\"]").forEach((element) => element.className += " active");
    document.querySelectorAll("#gr-app-list>[data-app-id]").forEach((element) => element.addEventListener("click", appClick));
    _isSyncing = false;
}

getApps();