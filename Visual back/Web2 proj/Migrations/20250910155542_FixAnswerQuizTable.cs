using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Web2_proj.Migrations
{
    /// <inheritdoc />
    public partial class FixAnswerQuizTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnswerQuiz",
                columns: table => new
                {
                    AnswerQuizId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuizId = table.Column<int>(type: "int", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnswerQuiz", x => x.AnswerQuizId);
                });

            migrationBuilder.CreateTable(
                name: "AnswerQuestions",
                columns: table => new
                {
                    AnswerQuestionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestionId = table.Column<int>(type: "int", nullable: false),
                    UserTextAnswer = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AnswerQuizId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnswerQuestions", x => x.AnswerQuestionId);
                    table.ForeignKey(
                        name: "FK_AnswerQuestions_AnswerQuiz_AnswerQuizId",
                        column: x => x.AnswerQuizId,
                        principalTable: "AnswerQuiz",
                        principalColumn: "AnswerQuizId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnswerOptions",
                columns: table => new
                {
                    AnswerOptionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OptionId = table.Column<int>(type: "int", nullable: false),
                    Selected = table.Column<bool>(type: "bit", nullable: false),
                    AnswerQuestionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnswerOptions", x => x.AnswerOptionId);
                    table.ForeignKey(
                        name: "FK_AnswerOptions_AnswerQuestions_AnswerQuestionId",
                        column: x => x.AnswerQuestionId,
                        principalTable: "AnswerQuestions",
                        principalColumn: "AnswerQuestionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnswerOptions_AnswerQuestionId",
                table: "AnswerOptions",
                column: "AnswerQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_AnswerQuestions_AnswerQuizId",
                table: "AnswerQuestions",
                column: "AnswerQuizId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnswerOptions");

            migrationBuilder.DropTable(
                name: "AnswerQuestions");

            migrationBuilder.DropTable(
                name: "AnswerQuiz");
        }
    }
}
