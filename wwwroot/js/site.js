// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your Javascript code.
$(() => {
    window.alert = (message) => {
        $('#PromiseAlert .modal-body p').html(message);
        var PromiseAlert = $('#PromiseAlert').modal({
            keyboard: false,
            backdrop: 'static'
        }).modal('show');
        return new Promise(function (resolve, reject) {
            PromiseAlert.on('hidden.bs.modal', resolve);
        });
    };
    window.confirm = (message) => {
        $('#PromiseConfirm .modal-body p').html(message);
        var PromiseConfirm = $('#PromiseConfirm').modal({
            keyboard: false,
            backdrop: 'static'
        }).modal('show');
        let confirm = false;
        $('#PromiseConfirm .btn-success').on('click', e => {
            confirm = true;
        });
        return new Promise(function (resolve, reject) {
            PromiseConfirm.on('hidden.bs.modal', (e) => {
                resolve(confirm);
            });
        });
    };
    window.prompt = (message) => {
        $('#PromisePrompt .modal-body label').html(message);
        var PromisePrompt = $('#PromisePrompt').modal({
            keyboard: false,
            backdrop: 'static'
        }).modal('show');
        $('#PromisePromptInput').focus();
        let prmpt = null;
        $('#PromisePrompt .btn-success').on('click', e => {
            prmpt = $('#PromisePrompt .modal-body input').val();
        });
        return new Promise(function (resolve, reject) {
            PromisePrompt.on('hidden.bs.modal', (e) => {
                resolve(prmpt);
            });
        });
    };

    $('#controlUnit button').on('click', async function (e) {
        let thet = $(this);
        this.blur();
        thet.siblings().find('i').removeClass('fas').addClass('far');
        thet.find('i').removeClass('fas').addClass('far');
        if (await confirm(`You chose <strong>${this.dataset.action}</strong>. Respond with this move?`)) thet.find('i').toggleClass('fas', 'far');
    });
    $('#users a.dropdown-item').on('click', async function (e) {
        e.preventDefault();
        let thet = $(this);
        if (thet.find('i').hasClass('text-danger')) await alert(`The user is not in the game!`);
        else if (document.getElementById('SelfName').value.trim() == this.textContent.trim()) await alert(`You don't have to play with yourself!`);
        else {
            hubConnection.invoke('invite', this.textContent.trim());
            await alert(`A request for the game was sent to the user <a href='mailto:${this.textContent}'>${this.textContent}</a>. We are waiting for his response...`);
        }
    });
    $('header a:not(#users a), footer a').on('click', async function (e) {
        if (document.getElementById('SelfName').value.trim() && location.pathname == '/') {
            let target = $(`<div id="linkHidden" style="display:none">${e.currentTarget.outerHTML}</div>`)
            e.preventDefault();
            if (await confirm(`Do you really want to leave the game?`)) {
                $('body').append(target);
                $('#linkHidden > *')[0].click();
            }
        }
    });
    const hubConnection = new signalR.HubConnectionBuilder()
        .withUrl("/game", { transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling | signalR.HttpTransportType.ServerSentEvents})
        .build();

    hubConnection.on("invite", async function (un) {
        if (await confirm(`Does <a href='mailto:${un}'>${un}</a> invite you to play?`)) {
        }
    });
    hubConnection.on("login", function (gamers) {
        for (let el of $('#users .dropdown-item')) {
            let un = el.textContent.trim();
            if (gamers[un]) el.innerHTML = `<i class="fas fa-user-check text-success"></i> ${un}`;
            else el.innerHTML = `<i class="fas fa-user-minus text-danger"></i> ${un}`;
        }
    });
    hubConnection.on("logout", function (gamers) {
        for (let el of $('#users .dropdown-item')) {
            let un = el.textContent.trim();
            if (gamers[un]) el.innerHTML = `<i class="fas fa-user-check text-success"></i> ${un}`;
            else el.innerHTML = `<i class="fas fa-user-minus text-danger"></i> ${un}`;
        }
    });

    hubConnection.start();
});
