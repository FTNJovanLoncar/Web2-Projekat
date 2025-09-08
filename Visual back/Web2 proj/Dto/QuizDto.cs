namespace Web2_proj.Dto
{

    public enum QuestionType
    {
        SingleChoice4,   // 4 radio buttons, 1 correct
        MultipleChoice4, // 4 radio buttons, multiple correct
        TrueFalse,       // 2 radio buttons, 1 correct
        TextAnswer       // Textbox answer
    }

    public class QuizDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public List<Question> Questions { get; set; } = new List<Question>();

    }

    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } // The actual question text
        public QuestionType Type { get; set; }
        public List<Option> Options { get; set; } = new List<Option>();

        // For text-based answers
        public string CorrectTextAnswer { get; set; }
    }

    public class Option
    {
        public int Id { get; set; }
        public string Text { get; set; } // Answer text
        public bool IsCorrect { get; set; } // Which options are correct
    }
}
