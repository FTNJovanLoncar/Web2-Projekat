using System.Security.Claims;
using System.Threading.Tasks;
using Web2_proj.Models;


namespace Web2_proj.Interfaces
{
    public interface ILiveQuiz
    {
        string CreateRoom(int quizId, string createdBy, int timePerQuestionSec, int countdownSec);
        Task JoinAsync(string roomCode, string username, string connectionId);
        Task LeaveAsync(string roomCode, string username, string connectionId);
        Task StartAsync(string roomCode, ClaimsPrincipal startedBy);
        Task SubmitAnswerAsync(string roomCode, string username, int questionId, LiveAnswerPayload payload);
        Task LockAsync(string roomCode, bool locked);
        Task KickAsync(string roomCode, string username);
        Task PauseAsync(string roomCode);
        Task ResumeAsync(string roomCode);
        Task SkipAsync(string roomCode);
        Task ExtendTimeAsync(string roomCode, int extraSeconds);
        Task StopAsync(string roomCode); 

    }
}
