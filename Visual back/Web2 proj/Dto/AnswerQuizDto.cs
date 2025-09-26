using System.Collections.Generic;

namespace Web2_proj.DTOs
{
    public class AnswerQuizDto
    {
        public int QuizId { get; set; }
        public string Username { get; set; }
        public List<AnswerQuestionDto> Questions { get; set; } = new();
    }

    public class AnswerQuestionDto
    {
        public int QuestionId { get; set; }
        public string UserTextAnswer { get; set; }
        public List<AnswerOptionDto> Options { get; set; } = new();
    }

    public class AnswerOptionDto
    {
        public int OptionId { get; set; }
        public bool Selected { get; set; }
    }
}
