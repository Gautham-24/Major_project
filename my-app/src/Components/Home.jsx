import React from "react";
import Header from "./Header";
import "../Styles/Home.css";
import { IoIosArrowDown } from "react-icons/io";
import CarImage from "../Assets/Images/Background.png";
import { Link } from "react-router-dom";
import { FiUserPlus, FiLogIn } from "react-icons/fi";

function Home() {
  return (
    <>
      <Header />
      <div className="HomeMainComponent">
        <div className="HomeInnerComponent">
          <div className="Home-Content">
            <div className="Home-Content-Left">
              <h1 className="text-gradient">RideApp</h1>
              <p>
                A decentralized, blockchain-based ride-booking platform designed
                to give riders and drivers control, transparency, and security
                in every journey.
              </p>
              <div className="home-buttons">
                <div className="driver-section">
                  <h3>For Drivers</h3>
                  <div className="button-group">
                    <Link to="/DriverLogin" className="Home-Button">
                      <FiLogIn /> Login as Driver
                    </Link>
                    <Link
                      to="/DriverRegistration"
                      className="Home-Button register-button"
                    >
                      <FiUserPlus /> Register as Driver
                    </Link>
                  </div>
                </div>
                <div className="client-section">
                  <h3>For Riders</h3>
                  <div className="button-group">
                    <Link to="/ClientLogin" className="Home-Button">
                      <FiLogIn /> Login as Rider
                    </Link>
                    <Link
                      to="/ClientRegistration"
                      className="Home-Button register-button"
                    >
                      <FiUserPlus /> Register as Rider
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="Home-Content-Right">
              <img src={CarImage} className="HomeCar-Image" alt="Car" />
            </div>
          </div>
          <div className="Home-Symbol">
            <IoIosArrowDown className="Down-Arrow-1" />
            <IoIosArrowDown className="Down-Arrow-2" />
          </div>
          <div className="Part2MainContainer">
            <h1>About Us</h1>
            <div className="Part2-Para-Container">
              <p className="Part2-Para">
                RideApp is a decentralized, blockchain-based ride-booking
                platform designed to give riders and drivers control,
                transparency, and security in every journey. Powered by
                decentralized technology, RideApp connects riders directly with
                drivers without relying on traditional intermediaries, reducing
                costs and ensuring fair compensation for drivers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
