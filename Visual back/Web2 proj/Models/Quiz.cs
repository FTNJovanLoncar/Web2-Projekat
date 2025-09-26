using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;


namespace Web2_proj.Models
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
    public class Quiz
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; }

        public QuizDifficulty Difficulty { get; set; }

        /// <summary>
        /// Time limit in minutes
        /// </summary>
        public int TimeLimitMinutes { get; set; }

        public List<Question> Questions { get; set; } = new List<Question>();
    }

    [Table("Questions")]
    public class Question
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Text { get; set; } // The actual question text

        public QuestionType Type { get; set; }

        public List<Option> Options { get; set; } = new List<Option>();

        // For text-based answers
        public string CorrectTextAnswer { get; set; }

        // Foreign key to Quiz
        public int QuizId { get; set; }
        public Quiz Quiz { get; set; }
    }

    [Table("Options")]
    public class Option
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Text { get; set; } // Answer text

        public bool IsCorrect { get; set; } // Which options are correct

        // Foreign key to Question
        public int QuestionId { get; set; }
        public Question Question { get; set; }
    }
}
