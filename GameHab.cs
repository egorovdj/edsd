using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace edsd
{
    [Authorize]
    public class GameHab : Hub
    {
        static Dictionary<string, Gamer> gamers = new Dictionary<string, Gamer>();
        static Dictionary<string, Game> games = new Dictionary<string, Game>();
        static Dictionary<string, int> hands = new Dictionary<string, int> { { "rock", 0 }, { "paper", 1 }, { "scissors", 2 }, { "lizard", 3 }, { "spock", 4 } };
        static Rule[,] rules = new Rule[5, 5]{
            { new Rule { Result = 0, Message = "in a draw" }, new Rule { Result = -1, Message = "paper wraps rock" }, new Rule { Result = 1, Message = "rock breaks scissors" }, new Rule { Result = 1, Message = "a rock crushes a lizard" }, new Rule { Result = -1, Message = "spock vaporizes rock" } },
            { new Rule { Result = 1, Message = "paper wraps the stone" }, new Rule { Result = 0, Message = "in a draw" }, new Rule { Result = -1, Message = "scissors cut paper" }, new Rule { Result = -1, Message = "lizard eats paper" }, new Rule { Result = 1, Message = "paper sets up spock" } },
            { new Rule { Result = -1, Message = "rock breaks scissors" }, new Rule { Result = 1, Message = "scissors cut paper" }, new Rule { Result = 0, Message = "in a draw" }, new Rule { Result = 1, Message = "scissors cut off the lizard's head" }, new Rule { Result = -1, Message = "spock breaks the scissors" } },
            { new Rule { Result = -1, Message = "a rock crushes a lizard" }, new Rule { Result = 1, Message = "lizard eats paper" }, new Rule { Result = -1, Message = "scissors cut off the lizard's head" }, new Rule { Result = 0, Message = "in a draw" }, new Rule { Result = 1, Message = "the lizard poisons spock" } },
            { new Rule { Result = 1, Message = "spock vaporizes rock" }, new Rule { Result = -1, Message = "paper sets up spock" }, new Rule { Result = 1, Message = "spock breaks the scissors" }, new Rule { Result = -1, Message = "the lizard poisons spock" }, new Rule { Result = 0, Message = "in a draw" } }
        };
        public async void Invite(string UserName)
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(UserName))
                await Clients.Client(gamers[UserName].ConnectionId).SendAsync("Invite", SelfName);
        }
        public async void Accept(string UserName)
        {
            if (gamers.ContainsKey(UserName))
            {
                string SelfName = Context.User.Identity.Name;
                await Clients.Clients(gamers[UserName].ConnectionId, gamers[SelfName].ConnectionId).SendAsync("Accept", SelfName, UserName);
                // Preparing the game
                string GameId = Guid.NewGuid().ToString().ToUpper();
                Game game = new Game { FirstPlayer = UserName, SecondPlayer = SelfName, FirstPlayerCount = 0, SecondPlayerCount = 0, GameId = GameId };
                games.Add(GameId, game);
                gamers[UserName].GameId = GameId;
                gamers[SelfName].GameId = GameId;
                //await Clients.Client(gamers[UserName].ConnectionId).SendAsync("Accept", SelfName, false);
                //await Clients.Client(gamers[SelfName].ConnectionId).SendAsync("Accept", UserName, true);
                //await Clients.All.SendAsync("InGame", gamers);
                //System.Threading.Thread.Sleep(5000);
                //await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("Start");
            }
        }
        public async void Start()
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName) && gamers[SelfName].GameId != null)
            {
                // Preparing the game
                string GameId = gamers[SelfName].GameId;
                await Clients.All.SendAsync("InGame", gamers);
            }
        }
        public async void StartInvite()
        {
            //System.Threading.Thread.Sleep(5000);
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName) && gamers[SelfName].GameId != null)
            {
                string GameId = gamers[SelfName].GameId;
                games[GameId].FirstPlayerMove = null;
                games[GameId].SecondPlayerMove = null;
                await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("Start");
            }
        }
        public async void DidNot(string UserName)
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(UserName))
                await Clients.Client(gamers[UserName].ConnectionId).SendAsync("DidNot", SelfName);
        }
        public async void StopGame()
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName) && gamers[SelfName].GameId != null)
            {
                string GameId = gamers[SelfName].GameId;
                if (gamers.ContainsKey(games[GameId].FirstPlayer)) gamers[games[GameId].FirstPlayer].GameId = null;
                if (gamers.ContainsKey(games[GameId].SecondPlayer)) gamers[games[GameId].SecondPlayer].GameId = null;
                var lastGame = games[GameId];
                games.Remove(GameId);
                await Clients.All.SendAsync("StopGame", gamers, lastGame);
            }
        }
        public async void Move(string hand)
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName) && gamers[SelfName].GameId != null)
            {
                bool isFirst = false;
                int FirstPlayerMove = -1;
                int SecondPlayerMove = -1;
                string GameId = gamers[SelfName].GameId;
                if (games[GameId].FirstPlayer == SelfName)
                {
                    games[GameId].FirstPlayerMove = hand;
                    FirstPlayerMove = hands[hand];
                    isFirst = true;
                }
                if (games[GameId].SecondPlayer == SelfName)
                {
                    games[GameId].SecondPlayerMove = hand;
                    SecondPlayerMove = hands[hand];
                }
                if (games[GameId].FirstPlayerMove != null && games[GameId].SecondPlayerMove != null)
                {
                    if (isFirst) SecondPlayerMove = hands[games[GameId].SecondPlayerMove];
                    else FirstPlayerMove = hands[games[GameId].FirstPlayerMove];

                    var message = rules[FirstPlayerMove, SecondPlayerMove].Message;
                    var result = rules[FirstPlayerMove, SecondPlayerMove].Result;
                    if (result > 0) games[GameId].FirstPlayerCount++;
                    if (result < 0) games[GameId].SecondPlayerCount++;
                    int maxCount = Math.Max(games[GameId].FirstPlayerCount, games[GameId].SecondPlayerCount);
                    games[GameId].FirstPlayerMove = null;
                    games[GameId].SecondPlayerMove = null;
                    await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("GameRound", message, result, games[GameId].FirstPlayer, games[GameId].SecondPlayer, maxCount);
                }
            }
        }
        public async void Timeout()
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName) && gamers[SelfName].GameId != null)
            {
                bool isFirst = false;
                string GameId = gamers[SelfName].GameId;
                if (games[GameId].FirstPlayer == SelfName)
                {
                    games[GameId].FirstPlayerMove = "timeout";
                    isFirst = true;
                }
                if (games[GameId].SecondPlayer == SelfName)
                {
                    games[GameId].SecondPlayerMove = "timeout";
                }
                if (games[GameId].FirstPlayerMove == "timeout" && games[GameId].SecondPlayerMove == "timeout")
                {
                    games[GameId].FirstPlayerMove = null;
                    games[GameId].SecondPlayerMove = null;
                    System.Threading.Thread.Sleep(5000);
                    await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("Start");
                    return;
                }
                if (games[GameId].FirstPlayerMove != null && games[GameId].SecondPlayerMove != null)
                {
                    var message = "A timeout occurred!";
                    var result = isFirst ? -1 : 1;
                    if (!isFirst) games[GameId].FirstPlayerCount++;
                    if (isFirst) games[GameId].SecondPlayerCount++;
                    int maxCount = Math.Max(games[GameId].FirstPlayerCount, games[GameId].SecondPlayerCount);
                    games[GameId].FirstPlayerMove = null;
                    games[GameId].SecondPlayerMove = null;
                    await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("GameRound", message, result, games[GameId].FirstPlayer, games[GameId].SecondPlayer, maxCount);
                }
            }
        }
        public override async Task OnConnectedAsync()
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName)) gamers[SelfName] = new Gamer { ConnectionId = Context.ConnectionId, GameId = null };
            else gamers.Add(SelfName, new Gamer { ConnectionId = Context.ConnectionId, GameId = null });
            await Clients.All.SendAsync("InGame", gamers);
            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            string SelfName = Context.User.Identity.Name;
            if (gamers.ContainsKey(SelfName))
            {
                string GameId = gamers[SelfName].GameId;
                if (games.ContainsKey(GameId)) {
                    bool isFirst = games[GameId].FirstPlayer == SelfName;
                    var message = "The enemy ignominiously left the field of battle!";
                    var result = isFirst ? -1 : 1;
                    if (!isFirst) games[GameId].FirstPlayerCount += 5;
                    if (isFirst) games[GameId].SecondPlayerCount += 5;
                    int maxCount = Math.Max(games[GameId].FirstPlayerCount, games[GameId].SecondPlayerCount);
                    games[GameId].FirstPlayerMove = null;
                    games[GameId].SecondPlayerMove = null;
                    await Clients.Clients(gamers[games[GameId].FirstPlayer].ConnectionId, gamers[games[GameId].SecondPlayer].ConnectionId).SendAsync("GameRound", message, result, games[GameId].FirstPlayer, games[GameId].SecondPlayer, maxCount);
                    gamers.Remove(SelfName);
                }
                else
                {
                    gamers.Remove(SelfName);
                    await Clients.All.SendAsync("InGame", gamers);
                }
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
    public class Gamer
    {
        public string ConnectionId { get; set; }
        public string GameId { get; set; }
    }
    public class Game
    {
        public string GameId { get; set; }
        public string FirstPlayer { get; set; }
        public string SecondPlayer { get; set; }
        public string FirstPlayerMove { get; set; }
        public string SecondPlayerMove { get; set; }
        public int FirstPlayerCount { get; set; }
        public int SecondPlayerCount { get; set; }
    }
    public class Rule
    {
        public int Result { get; set; }
        public string Message { get; set; }
    }
}
