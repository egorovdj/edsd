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

    if (document.getElementById('SelfName').value.trim() && location.pathname == '/') {
        var timer = () => {
            let progress = document.getElementById('progress');
            timer.counter = 30;
            timer.reset();
            timer.interval = setInterval(() => {
                if (--timer.counter < 0) {
                    if (!timer.prevent) {
                        hubConnection.invoke('Timeout').catch(errorNotify);
                        alert('You allowed a timeout!')
                    }
                    timer.reset();
                    return;
                }
                if (timer.counter == 20) {
                    progress.classList.remove('bg-success');
                    progress.classList.add('bg-warning');
                }
                if (timer.counter == 10) {
                    progress.classList.remove('bg-warning');
                    progress.classList.add('bg-danger');
                }
                progress.style.width = `${(30 - timer.counter) / 30 * 100}%`;
                progress.ariaValuenow = timer.counter;
                progress.textContent = timer.counter;
            }, 1000);
        }
        timer.reset = () => {
            let progress = document.getElementById('progress');
            clearInterval(timer.interval);
            timer.counter = 30;
            progress.style.width = '0%';
            progress.className = "progress-bar bg-success";
            progress.ariaValuenow = "0";
            progress.textContent = "0";
            delete timer.prevent;
        }
        $('#controlUnit button').on('click', async function (e) {
            let thet = $(this);
            this.blur();
            thet.siblings().find('i').removeClass('fas').addClass('far');
            thet.find('i').removeClass('fas').addClass('far');
            if (await confirm(`You chose <strong>${this.dataset.action}</strong>. Respond with this move?`)) {
                thet.find('i').toggleClass('fas', 'far');
                hubConnection.invoke('Move', this.dataset.action).catch(errorNotify);
                timer.prevent = true;
            }
        });
        $('#users a.dropdown-item').on('click', async function (e) {
            e.preventDefault();
            let thet = $(this);
            if (thet.find('i').hasClass('text-danger')) await alert(`The user is not in the game!`);
            else if (thet.find('i').hasClass('text-secondary')) await alert(`The user is playing!`);
            else if (document.getElementById('SelfName').value.trim() == this.textContent.trim()) await alert(`You don't have to play with yourself!`);
            else {
                hubConnection.invoke('invite', this.textContent.trim()).catch(errorNotify);
                await alert(`A request for the game was sent to the user <a href='mailto:${this.textContent}'>${this.textContent}</a>. We are waiting for his response...`);
            }
        });

        var errorNotify = async function (err) {
            if (document.getElementById('SelfName').value.trim() && location.pathname == '/') {
                alert(err.toString());
                return console.error(err.toString());
            }
        }
        $('header a:not(#users a), footer a').on('click', async function (e) {
            if (document.getElementById('SelfName').value.trim() && location.pathname == '/') {
                let target = $(`<div id="linkHidden" style="display:none">${e.currentTarget.outerHTML}</div>`)
                e.preventDefault();
                if (await confirm(`Do you really want to leave the game?`)) {
                    hubConnection.completeClose(new Error("Manual stop"));
                    $('body').append(target);
                    $('#linkHidden > *')[0].click();
                }
            }
        });

        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl("/game", { transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling | signalR.HttpTransportType.ServerSentEvents })
            .withAutomaticReconnect()
            .build();

        hubConnection.on("invite", async function (un) {
            if (await confirm(`Does <a href='mailto:${un}'>${un}</a> invite you to play?`)) {
                hubConnection.invoke('Accept', un).catch(errorNotify);
            }
            else hubConnection.invoke('DidNot', un).catch(errorNotify);
        });
        var enemysName = null;
        var initH2;
        hubConnection.on("Accept", async function (self, un) {
            $('#PromiseAlert button').click();
            enemysName = un;
            let h2 = $('main h2');
            initH2 = h2.html();
            if (self != document.getElementById('SelfName').value.trim()) {
                h2.html(`Playing with <small>${un}</small>`);
                await alert(`The user <a href='mailto:${un}'>${un}</a>: I accepted the call...`);
                hubConnection.invoke('Start').catch(errorNotify);
            }
            else {
                h2.html(`Playing with <small>${self}</small>`);
                hubConnection.invoke('StartInvite').catch(errorNotify);
            }
        });
        hubConnection.on("Start", async function () {
            $('#PromiseAlert button').click();
            document.querySelector('#users .dropdown-toggle').disabled = true;
            timer();
        });
        hubConnection.on("GameRound", async function (message, result, first, second, maxCount) {
            let res;
            result = first == document.getElementById('SelfName').value.trim() ? result : -result;
            switch (result) {
                case 1:
                    res = 'You won!';
                    break;
                case -1:
                    res = "You've lost!";
                    break;
                case 0:
                    res = 'Draw!';
                    break;
            }
            timer.reset();
            setTimeout(() => {
                if (maxCount >= 5) hubConnection.invoke('StopGame').catch(errorNotify);
                else hubConnection.invoke('StartInvite').catch(errorNotify);
            }, 3000);
            await alert(`<h3>Result of the game round:</h3><p>${message}</p><p>${res}</p>`);
            let log = $('main .row div:last');
            log.append(`<hr/><p>${message}</p><p>${res}</p>`)
        });
        hubConnection.on("StopGame", async function (gamers, game) {
            let self = document.getElementById('SelfName').value.trim();
            if (self == game.firstPlayer || self == game.secondPlayer) {
                $('#PromiseAlert button').click();
                await alert(`<h3>Result of the game:</h3><p>The user <a href='mailto:${game.firstPlayer}'>${game.firstPlayer}</a>${game.firstPlayerCount > game.secondPlayerCount ? ' win the game' : ' lost the game'}! Has ${game.firstPlayerCount} wins.</p>
<p>The user <a href='mailto:${game.secondPlayer}'>${game.secondPlayer}</a>${game.firstPlayerCount < game.secondPlayerCount ? ' win the game' : ' lost the game'}! Has ${game.secondPlayerCount} wins.</p>`);
                $('main h2').html(initH2);
                $('main .row div:last').html('');
                document.querySelector('#users .dropdown-toggle').disabled = false;
            }
            for (let el of $('#users .dropdown-item')) {
                let un = el.textContent.trim();
                if (gamers[un] && gamers[un].gameId) el.innerHTML = `<i class="fas fa-user-lock text-secondary"></i> ${un}`;
                else if (gamers[un]) el.innerHTML = `<i class="fas fa-user-check text-success"></i> ${un}`;
                else el.innerHTML = `<i class="fas fa-user-minus text-danger"></i> ${un}`;
            }
        });
        hubConnection.on("DidNot", async function (un) {
            $('#PromiseAlert button').click();
            await alert(`The user <a href='mailto:${un}'>${un}</a> refused to play the game...`);
        });
        hubConnection.on("InGame", function (gamers) {
            for (let el of $('#users .dropdown-item')) {
                let un = el.textContent.trim();
                if (gamers[un] && gamers[un].gameId) el.innerHTML = `<i class="fas fa-user-lock text-secondary"></i> ${un}`;
                else if (gamers[un]) el.innerHTML = `<i class="fas fa-user-check text-success"></i> ${un}`;
                else el.innerHTML = `<i class="fas fa-user-minus text-danger"></i> ${un}`;
            }
        });

        hubConnection.start().then(function () {
        }).catch(errorNotify);
    }
});
