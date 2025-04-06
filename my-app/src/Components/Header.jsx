import React from "react";
import "../Styles/Header.css";
import Logo from "../Assets/Images/Logo.png";
import { Link } from "react-router-dom";

function Header() {
  return (
    <div className="HeaderMainContainer">
      <div className="HeaderInnerContainer">
        <div className="HeaderLogo">
          <Link to="/Home">
            <img className="Header-Logo" src={Logo} alt="RideApp Logo" />
          </Link>
        </div>
        <nav className="Menu">
          <Link className="Login-Header" to="/Home">
            Home
          </Link>
          <Link className="Login-Header" to="/DriverLogin">
            Driver
          </Link>
          <Link className="Login-Header" to="/ClientLogin">
            Book Ride
          </Link>
          <Link className="Login-Header" to="#help">
            Help
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default Header;
