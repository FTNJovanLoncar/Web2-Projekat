using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;

namespace Web2_proj.Models
{
    public class User
    {
        public int Id { get; set; }  // primary key

        public string Name { get; set; }

        public string Email { get; set; }

        public string Password { get; set; }

        public string Image { get; set; }

        public string Role { get; set; }
    }
}
