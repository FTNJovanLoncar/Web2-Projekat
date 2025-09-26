using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Web2_proj.Models;

namespace Web2_proj.Infrastructure.Configurations
{
    public class AnswerQuizConfiguration : IEntityTypeConfiguration<AnswerQuiz>
    {
        public void Configure(EntityTypeBuilder<AnswerQuiz> builder)
        {
            builder.ToTable("AnswerQuiz"); // <-- Explicitly set table name

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                   .HasColumnName("AnswerQuizId")
                   .ValueGeneratedOnAdd();

            builder.Property(x => x.Username)
                   .IsRequired()
                   .HasMaxLength(100);

            builder.HasMany(x => x.Questions)
                   .WithOne(q => q.AnswerQuiz)
                   .HasForeignKey(q => q.AnswerQuizId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.Property(x => x.QuizId)
                   .IsRequired();
        }
    }


    public class AnswerQuestionConfiguration : IEntityTypeConfiguration<AnswerQuestion>
    {
        public void Configure(EntityTypeBuilder<AnswerQuestion> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                   .HasColumnName("AnswerQuestionId")
                   .ValueGeneratedOnAdd();

            builder.Property(x => x.UserTextAnswer)
                   .HasMaxLength(500);

            builder.Property(x => x.QuestionId)
                   .IsRequired();

            builder.Property(x => x.AnswerQuizId)
                   .IsRequired();

            // One AnswerQuestion has many AnswerOptions (no cascade delete)
            builder.HasMany(x => x.Options)
                   .WithOne(o => o.AnswerQuestion)
                   .HasForeignKey(o => o.AnswerQuestionId)
                   .OnDelete(DeleteBehavior.Restrict); // avoid multiple cascade paths
        }
    }

    public class AnswerOptionConfiguration : IEntityTypeConfiguration<AnswerOption>
    {
        public void Configure(EntityTypeBuilder<AnswerOption> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                   .HasColumnName("AnswerOptionId")
                   .ValueGeneratedOnAdd();

            builder.Property(x => x.OptionId)
                   .IsRequired();

            builder.Property(x => x.Selected)
                   .IsRequired();

            builder.Property(x => x.AnswerQuestionId)
                   .IsRequired();
        }
    }
}
