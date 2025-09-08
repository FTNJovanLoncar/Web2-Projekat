using Microsoft.AspNetCore.Mvc;
using Web2_proj.Models;
using Web2_proj.Services;
using System.Threading.Tasks;
using Web2_proj.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Web2_proj.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/quizzes")]
    public class QuizController : ControllerBase
    {
        private readonly IQuizService _quizService;

        public QuizController(IQuizService quizService)
        {
            _quizService = quizService;
        }

        [HttpPost]
        public async Task<IActionResult> AddQuiz([FromBody] Quiz quiz)
        {
            if (quiz == null || quiz.Questions == null || quiz.Questions.Count == 0)
            {
                return BadRequest(new { error = "Invalid quiz data" });
            }

            var result = await _quizService.AddQuizAsync(quiz);
            return Ok(result);
        }
    }
}
