
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

        public void AddQuiz(Quiz quiz)
        {
            Quizs.Add(quiz);
            SaveChanges();
        }
    }
}
