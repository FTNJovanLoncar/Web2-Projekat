import { NavLink } from "react-router-dom";
import PropTypes from 'prop-types'; // Import PropTypes


function Nav({ user, logout }) {
    return (
        <section>
            {user ? (
                <>
                    <NavLink to={"/"}>Home</NavLink>
                    <button onClick={() => logout()}>Logout</button>
                </>
            ) : (
                <>
                    <NavLink to={"/Login"}>Login</NavLink>
                </>
            )}
        </section>
    );
}

Nav.propTypes = {
    user: PropTypes.object,          // user can be an object OR null (null is automatically allowed)
    logout: PropTypes.func.isRequired, // logout should be a function
};

export default Nav;
