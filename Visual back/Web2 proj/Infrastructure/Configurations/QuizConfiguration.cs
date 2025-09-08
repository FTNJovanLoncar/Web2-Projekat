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

            // One Quiz has many Questions
            builder.HasMany(x => x.Questions)
                .WithOne()
                .HasForeignKey("QuizId")
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
                .IsRequired();

            // One Question has many Options
            builder.HasMany(x => x.Options)
                .WithOne()
                .HasForeignKey("QuestionId")
                .OnDelete(DeleteBehavior.Cascade);
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
