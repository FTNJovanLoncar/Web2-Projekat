
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Emit;
using System.Threading.Tasks;

using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

using Web2_proj;
using Web2_proj.Models;
using Web2_proj.Infrastructure.Configurations;

namespace Web2_proj.Infrastructure
{
    public class DbContextt : DbContext
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Quiz> Quizs { get; set; }
        public DbSet<AnswerQuiz> Answers { get; set; }

        public DbContextt(DbContextOptions options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            //Kazemo mu da pronadje sve konfiguracije u Assembliju i da ih primeni nad bazom
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(DbContextt).Assembly);
            modelBuilder.ApplyConfiguration(new UserConfiguration());
            modelBuilder.ApplyConfiguration(new QuizConfiguration());
            modelBuilder.ApplyConfiguration(new QuestionConfiguration());
            modelBuilder.ApplyConfiguration(new OptionConfiguration());
            modelBuilder.ApplyConfiguration(new AnswerQuizConfiguration());
        }

        public User GetUserById(string name)
        {
            return Users.FirstOrDefault(u => u.Name == name);
        }

        public void AddUser(User user)
        {
            Users.Add(user);
            SaveChanges();
        }

        public async Task AddQuiz(Quiz quiz)
        {
            Quizs.Add(quiz);
            await SaveChangesAsync();
        }

        public async Task<Quiz> GetQuiz(int id)
        {
            return await Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<AnswerQuiz> GetAnswerQuiz(int id)
        {
            return await Answers
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<List<AnswerQuiz>> GetUserAnswers(string name)
        {
            return await Answers
                .Include(aq => aq.Questions)
                    .ThenInclude(q => q.Options)
                .Where(aq => aq.Username == name)
                .ToListAsync();
        }

        public async Task<List<AnswerQuiz>> GetGlobalAnswers(int id)
        {
            return await Answers
                .Include(a => a.Questions)
                    .ThenInclude(q => q.Options)
                .Where(a => a.QuizId == id)
                .ToListAsync();                  
        }

        public async Task<List<Quiz>> GetQuizzes()
        {
            return await Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .ToListAsync();
        }

        public async Task AddAnswerQuiz(AnswerQuiz answer)
        {
            Answers.Add(answer);
            await SaveChangesAsync();
        }

        public async Task DeleteQuizId(int id)
        {
            var quiz = await Quizs
                .Include(q => q.Questions)
                    .ThenInclude(qst => qst.Options)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz != null)
            {
                // Remove options first
                foreach (var question in quiz.Questions)
                {
                    RemoveRange(question.Options);
                }

                // Remove questions
                RemoveRange(quiz.Questions);

                // Remove quiz
                Quizs.Remove(quiz);

                await SaveChangesAsync();
            }
        }




    }
}
