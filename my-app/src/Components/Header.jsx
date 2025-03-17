import React from "react";
import "../Styles/Header.css";
import Logo from "../Assets/Images/Logo.png";

function Header() {
  return (
    <>
      <div className="HeaderMainContainer">
        <div className="HeaderInnerContainer">
          <div className="HeaderLogo">
            <img className="Header-Logo" src={Logo} alt="ChainRide Logo" />
          </div>
          <div className="Menu">
            <a className="Login-Header" href="/Home">
              Home
            </a>
            <a className="Login-Header" href="/DriverLogin">
              Driver
            </a>
            <a className="Login-Header" href="/ClientLogin">
              Book Ride
            </a>
            <a className="Login-Header" href="#help">
              Help
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;
