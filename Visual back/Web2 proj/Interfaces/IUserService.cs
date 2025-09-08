using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Web2_proj.Dto;

namespace Web2_proj.Interfaces
{
    public interface IUserService
    {
        string Login(string email, string password);

        string Register(UserDto userDto);
    }
}
