using Web2_proj.Infrastructure;
using Web2_proj.Interfaces;
using Web2_proj.Models;

namespace Web2_proj.Services
{
    public class QuizService : IQuizService
    {
        private readonly DbContextt _dbContext;

        public QuizService(DbContextt dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Quiz> AddQuizAsync(Quiz quiz)
        {
            _dbContext.AddQuiz(quiz); // uses your existing DbContextt method
            return quiz;
        }
    }
}
