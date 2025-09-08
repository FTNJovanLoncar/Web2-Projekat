using Web2_proj.Models;

namespace Web2_proj.Interfaces
{
    public interface IQuizService
    {
        Task<Quiz> AddQuizAsync(Quiz quiz);
    }
}
