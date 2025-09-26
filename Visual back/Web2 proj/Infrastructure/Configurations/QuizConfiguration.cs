using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Web2_proj.Models;

namespace Web2_proj.Infrastructure.Configurations
{
    public class QuizConfiguration : IEntityTypeConfiguration<Quiz>
    {
        public void Configure(EntityTypeBuilder<Quiz> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("QuizId")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Title)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.Difficulty)
                .IsRequired()
                .HasConversion<int>(); // store enum as int

            builder.Property(x => x.TimeLimitMinutes)
                .IsRequired();

            // One Quiz has many Questions (cascade delete here)
            builder.HasMany(x => x.Questions)
                   .WithOne(q => q.Quiz) // specify navigation property
                   .HasForeignKey(q => q.QuizId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class QuestionConfiguration : IEntityTypeConfiguration<Question>
    {
        public void Configure(EntityTypeBuilder<Question> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("QuestionId")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Text)
                .IsRequired()
                .HasMaxLength(300);

            builder.Property(x => x.Type)
                .IsRequired()
                .HasConversion<int>();

            builder.Property(x => x.CorrectTextAnswer)
                .HasMaxLength(500);

            // One Question has many Options (no cascade delete)
            builder.HasMany(x => x.Options)
                .WithOne(o => o.Question)
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade); // ✅ delete options when question is deleted
        }
    }

    public class OptionConfiguration : IEntityTypeConfiguration<Option>
    {
        public void Configure(EntityTypeBuilder<Option> builder)
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .HasColumnName("OptionId")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Text)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.IsCorrect)
                .IsRequired();
        }
    }
}
