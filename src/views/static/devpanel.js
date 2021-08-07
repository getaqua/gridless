const $BOTQUERY = (id) => ({
    "query": `query {
    bot(id: "${id}") {
        name
        avatarUrl
        clientId
    }
}`});
const $APPQUERY = (id) => ({
    "query": `query {
    application(id: "${id}") {
        name
        avatarUrl
        clientId
    }
}`});
const $LISTQUERY = {
    "query": `query {
    allApplications {
        id
        name
        avatarUrl
    }
    allBots {
        id
        name
        avatarUrl
    }
}`};
//var editModal = new bootstrap.Modal(document.getElementById('editModal'))
$.ajax("/_gridless/developers", {
    method: "POST",
    data: JSON.stringify($LISTQUERY),
    contentType: "application/json; charset=UTF-8",
    dataType: 'json',
}).then((d, s, response) => {
    console.log(response.responseJSON);
    const _bots = response.responseJSON["data"]["allBots"];
    for (const _bot_i in _bots) {
        const bot = _bots[_bot_i];
        $("#botList").append(`<div class="devpg-app-identity" data-bot-id="${bot.id}">
            <div style="background-image: url('${bot.avatarUrl || ""}')" class="devpg-avatar m-2 d-inline-block"></div>
            <div class="ctx-1 d-inline-block m-2">
                <h4>${bot.name || "How is this bot not named, seriously"}</h4>
            </div>
        </div>`)
    }
    const _apps = response.responseJSON["data"]["allApplications"];
    for (const _app_i in _apps) {
        const app = _apps[_app_i];
        $("#appList").append(`<div class="devpg-app-identity" data-app-id="${app.id}">
            <div style="background-image: url('${app.avatarUrl || ""}')" class="devpg-avatar m-2 d-inline-block"></div>
            <div class="ctx-1 d-inline-block m-2">
                <h4>${app.name || "How is this app not named, seriously"}</h4>
            </div>
        </div>`)
    }
}).then((_) => $(".devpg-app-identity").on("click", (ev) => {
    console.log(ev);
    const botId = $(ev.currentTarget).data("bot-id") || "";
    const appId = $(ev.currentTarget).data("app-id") || "";
    if (botId != "") {
        $.ajax("/_gridless/developers", {
            method: "POST",
            data: JSON.stringify($BOTQUERY(botId)),
            contentType: "application/json; charset=UTF-8",
            dataType: 'json',
        }).then((d, s, response) => {
            if (response.status != 200) throw response.statusText;
            console.log(response.responseJSON);
            //TODO: open a modal with this data
        })
    } else if (appId != "") {
        $.ajax("/_gridless/developers", {
            method: "POST",
            data: JSON.stringify($APPQUERY(appId)),
            contentType: "application/json; charset=UTF-8",
            dataType: 'json',
        }).then((d, s, response) => {
            if (response.status != 200) throw response.statusText;
            console.log(response.responseJSON);
            editThingDialog(response.responseJSON["data"]["application"])
            //TODO: open a modal with this data
        })
    }
}));

function editThingDialog(app) {
    $("#editModal .ctx-name").text(app.name);
    $("#editModalName").val(app.name);
    try { $("#editModalAvatar").val(app.avatarUrl).removeClass("ctx-rm") }
    catch (_) { $("#editModalAvatar").addClass("ctx-rm") };
    $("#editModalClientId").val(app.clientId);
    $("#editModal .ctx-submit").off('click');
    $("#editModal .ctx-submit").one('click', (_) => {
        // TODO: update app accordingly
    })
    //editModal.show()
    jQuery("#editModal").modal('show');
}

$("#newApplicationModalSubmit").on("click", (event) => {
    const AppName = $("#newApplicationModalName").val();
    const AppAvatar = $("#newApplicationModalAvatar").val();
    $.ajax("/_gridless/developers", {
        method: "POST",
        data: JSON.stringify({
            "query": `mutation {\n` +
                `    newApplication(data: {\n` +
                `        name: "${AppName.replace('"', "&quot;")}"\n` +
                `        avatarUrl: "${AppAvatar.replace('"', "&quot;")}"\n` +
                `    }) {\n` +
                `        id\n` +
                `    }\n` +
                `}`
        }),
        contentType: "application/json; charset=UTF-8",
        dataType: 'json',
    }).then((d, s, response) => {
        if (response.responseJSON["data"]["newApplication"]["id"])
            location.reload();
    })
});