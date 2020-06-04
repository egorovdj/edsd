using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace edsd
{
    public class GameHab : Hub
    {
        static Dictionary<string, string> gamers = new Dictionary<string, string>();
        public async void Invite(string UserName)
        {
            if (gamers.ContainsKey(UserName))
                await this.Clients.Client(gamers[UserName]).SendAsync("Invite", Context.User.Identity.Name);
        }
        public override async Task OnConnectedAsync()
        {
            if (gamers.ContainsKey(Context.User.Identity.Name)) gamers[Context.User.Identity.Name]= Context.ConnectionId;
            else gamers.Add(Context.User.Identity.Name, Context.ConnectionId);
            await Clients.All.SendAsync("Login", gamers);
            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            if (gamers.ContainsKey(Context.User.Identity.Name)) gamers.Remove(Context.User.Identity.Name);
            await Clients.All.SendAsync("Logout", gamers);
            await base.OnDisconnectedAsync(exception);
        }
    }
}
