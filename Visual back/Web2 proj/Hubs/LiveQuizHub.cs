// Hubs/LiveQuizHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;
using Web2_proj.Interfaces;
using Web2_proj.Models;

namespace Web2_proj.Hubs
{
    [Authorize] // require JWT for hub connection
    public class LiveQuizHub : Hub
    {
        private readonly ILiveQuiz _orchestrator;
        public LiveQuizHub(ILiveQuiz orchestrator) => _orchestrator = orchestrator;

        [Authorize(Roles = "admin")] public Task Lock(string roomCode, bool locked) => _orchestrator.LockAsync(roomCode, locked);
        [Authorize(Roles = "admin")] public Task Kick(string roomCode, string username) => _orchestrator.KickAsync(roomCode, username);
        [Authorize(Roles = "admin")] public Task Pause(string roomCode) => _orchestrator.PauseAsync(roomCode);
        [Authorize(Roles = "admin")] public Task Resume(string roomCode) => _orchestrator.ResumeAsync(roomCode);
        [Authorize(Roles = "admin")] public Task Skip(string roomCode) => _orchestrator.SkipAsync(roomCode);
        [Authorize(Roles = "admin")] public Task ExtendTime(string roomCode, int extraSeconds) => _orchestrator.ExtendTimeAsync(roomCode, extraSeconds);
        [Authorize(Roles = "admin")] public Task Stop(string roomCode) => _orchestrator.StopAsync(roomCode);

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var roomCode = Context.Items.TryGetValue("roomCode", out var v) ? v as string : null;
            var username = GetUsername();
            if (!string.IsNullOrEmpty(roomCode) && !string.IsNullOrEmpty(username))
            {
                try
                {
                    await _orchestrator.LeaveAsync(roomCode, username, Context.ConnectionId);
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
                }
                catch (Exception ex)
                {
                    // don't rethrow on disconnect
                    Console.WriteLine($"[LiveQuizHub] LeaveAsync error: {ex.Message}");
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        [Authorize(Roles = "admin")]
        public Task<string> CreateRoom(int quizId, int timePerQuestionSec, int countdownSec)
        {
            try
            {
                var code = _orchestrator.CreateRoom(quizId, GetUsername(), timePerQuestionSec, countdownSec);
                return Task.FromResult(code);
            }
            catch (Exception ex)
            {
                throw new HubException($"CreateRoom: {ex.Message}");
            }
        }

        public async Task Join(string roomCode)
        {
            try
            {
                Context.Items["roomCode"] = roomCode;
                await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
                await _orchestrator.JoinAsync(roomCode, GetUsername(), Context.ConnectionId);
            }
            catch (Exception ex)
            {
                throw new HubException($"Join: {ex.Message}");
            }
        }

        [Authorize(Roles = "admin")]
        public Task Start(string roomCode)
        {
            try
            {
                return _orchestrator.StartAsync(roomCode, Context.User);
            }
            catch (Exception ex)
            {
                throw new HubException($"Start: {ex.Message}");
            }
        }

        public Task SubmitAnswer(string roomCode, int questionId, LiveAnswerPayload payload)
        {
            try
            {
                return _orchestrator.SubmitAnswerAsync(roomCode, GetUsername(), questionId, payload);
            }
            catch (Exception ex)
            {
                throw new HubException($"SubmitAnswer: {ex.Message}");
            }
        }

        private string GetUsername()
        {
            return Context.User?.FindFirst(ClaimTypes.Name)?.Value
                ?? Context.User?.Identity?.Name
                ?? Context.User?.FindFirst("unique_name")?.Value
                ?? Context.User?.FindFirst("name")?.Value
                ?? Context.User?.FindFirst("sub")?.Value
                ?? "unknown";
        }
    }
}
