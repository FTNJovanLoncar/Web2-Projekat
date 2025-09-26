using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web2_proj.Dto
{
    public enum QuestionType
    {
        SingleChoice4,   // 4 radio buttons, 1 correct
        MultipleChoice4, // 4 checkboxes, multiple correct
        TrueFalse,       // 2 radio buttons, 1 correct
        TextAnswer       // Textbox answer
    }

    public enum QuizDifficulty
    {
        Easy,
        Medium,
        Hard
    }

    [Table("Quizzes")]
    public class QuizDto
    {
        public int Id { get; set; }
        public string Title { get; set; }

        public QuizDifficulty Difficulty { get; set; }

        /// <summary>
        /// Time limit in minutes
        /// </summary>
        public int TimeLimitMinutes { get; set; }

        public List<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
    }

    public class QuestionDto
    {
        public int Id { get; set; }
        public string Text { get; set; } // The actual question text
        public QuestionType Type { get; set; }
        public List<OptionDto> Options { get; set; } = new List<OptionDto>();

        // For text-based answers
        public string CorrectTextAnswer { get; set; }
    }

    public class OptionDto
    {
        public int Id { get; set; }
        public string Text { get; set; } // Answer text
        public bool IsCorrect { get; set; } // Which options are correct
    }
}
