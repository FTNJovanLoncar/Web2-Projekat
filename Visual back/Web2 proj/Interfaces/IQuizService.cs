using Web2_proj.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Web2_proj.Interfaces
{
    public interface IQuizService
    {
        Task<Quiz> AddQuizAsync(Quiz quiz);

        Task<List<Quiz>> GetAllQuiz();

        Task<Quiz> GetQuizById(int id);

        Task<AnswerQuiz> AddAnswerQuiz(AnswerQuiz answerQuiz);

        Task<AnswerQuiz> GetAnswerQuizById(int id);

        Task<List<AnswerQuiz>> GetResultAnswerName(string name);

        Task<List<AnswerQuiz>> GetGlobalAnswersId(int id);

        Task DeleteQuizId(int id);
    }
}
