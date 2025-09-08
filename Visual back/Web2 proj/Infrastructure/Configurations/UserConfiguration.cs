using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Web2_proj.Models;



namespace Web2_proj.Infrastructure.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id)
                .HasColumnName("UserId")
                .ValueGeneratedOnAdd();

            builder.Property(x => x.Name).IsRequired().HasMaxLength(30);

            builder.HasIndex(x => x.Email).IsUnique();

            builder.HasIndex(x => x.Name).IsUnique(); // ensure Name is unique
        }
    }
}
