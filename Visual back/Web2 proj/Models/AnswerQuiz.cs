using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Web2_proj.Models
{
    [Table("AnswerQuiz")] 
    public class AnswerQuiz
    {
        [Key]
        public int Id { get; set; }

        public int QuizId { get; set; }  // FK to the original Quiz

        [Required]
        public string Username { get; set; }

        // Navigation property for answered questions
        public List<AnswerQuestion> Questions { get; set; } = new();
    }

    [Table("AnswerQuestions")] 
    public class AnswerQuestion
    {
        [Key]
        public int Id { get; set; }

        public int QuestionId { get; set; }  // FK to the original Question

        public string UserTextAnswer { get; set; }

        // Navigation property for selected options
        public List<AnswerOption> Options { get; set; } = new();

        public int AnswerQuizId { get; set; }  // FK back to AnswerQuiz
        public AnswerQuiz AnswerQuiz { get; set; }
    }

    [Table("AnswerOptions")]  
    public class AnswerOption
    {
        [Key]
        public int Id { get; set; }

        public int OptionId { get; set; }  // FK to original Option
        public bool Selected { get; set; }

        public int AnswerQuestionId { get; set; }  // FK back to AnswerQuestion
        public AnswerQuestion AnswerQuestion { get; set; }
    }
}
