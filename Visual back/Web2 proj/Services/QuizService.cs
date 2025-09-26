using Microsoft.EntityFrameworkCore;
using System.Runtime.CompilerServices;
using Web2_proj.Infrastructure;
using Web2_proj.Interfaces;
using Web2_proj.Models;
using System.Collections.Generic;
using System.Threading.Tasks;


namespace Web2_proj.Services
{
    public class QuizService : IQuizService
    {
        private readonly DbContextt _dbContext;

        public QuizService(DbContextt dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<Quiz>> GetAllQuiz()
        {
            return await _dbContext.Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .ToListAsync();
        }

        public async Task<Quiz> GetQuizById(int id)
        {
            return await _dbContext.Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .FirstOrDefaultAsync(q => q.Id == id);
        }

        public async Task<AnswerQuiz> GetAnswerQuizById(int id)
        {
            return await _dbContext.GetAnswerQuiz(id);
        }

        public async Task<Quiz> AddQuizAsync(Quiz quiz)
        {
            await _dbContext.AddQuiz(quiz); // <- now awaited

            return await _dbContext.Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .FirstOrDefaultAsync(q => q.Id == quiz.Id);
        }


        public async Task<AnswerQuiz> AddAnswerQuiz(AnswerQuiz answerQuiz)
        {
            await _dbContext.AddAnswerQuiz(answerQuiz);

            return answerQuiz; // or query back with includes if needed
        }

        public async Task<List<AnswerQuiz>> GetResultAnswerName(string name)
        {
            return await _dbContext.GetUserAnswers(name);
        }

        public async Task<List<AnswerQuiz>> GetGlobalAnswersId(int id)
        {
            return await _dbContext.GetGlobalAnswers(id);
        }

        public async Task DeleteQuizId(int id)
        {
            var quiz = await _dbContext.Quizs.FindAsync(id);

            if (quiz != null)
            {
                _dbContext.Quizs.Remove(quiz);
                await _dbContext.SaveChangesAsync();
            }
        }

    }
}
