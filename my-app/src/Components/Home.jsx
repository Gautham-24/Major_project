import React from "react";
import Header from "./Header";
import "../Styles/Home.css";
import { IoIosArrowDown } from "react-icons/io";
import CarImage from "../Assets/Images/Background.png";

function Home() {
  return (
    <>
      <Header />
      <div className="HomeMainComponent">
        <div className="HomeInnerComponent">
          <div className="Home-Content">
            <div className="Home-Content-Left">
              <h1 style={{ textAlign: "left" }}>RideApp</h1>
              <p>
                A decentralized, blockchain-based ride-booking platform designed
                to give riders and drivers control, transparency, and security
                in every journey.
              </p>
              <div className="home-buttons">
                <div className="driver-section">
                  <h3 style={{ textAlign: "left" }}>For Drivers</h3>
                  <div className="button-group">
                    <a href="/DriverLogin" className="Home-Button">
                      Login as Driver
                    </a>
                    <a
                      href="/DriverRegistration"
                      className="Home-Button register-button"
                    >
                      Register as Driver
                    </a>
                  </div>
                </div>
                <div className="client-section">
                  <h3 style={{ textAlign: "left" }}>For Riders</h3>
                  <div className="button-group">
                    <a href="/ClientLogin" className="Home-Button">
                      Login as Rider
                    </a>
                    <a
                      href="/ClientRegistration"
                      className="Home-Button register-button"
                    >
                      Register as Rider
                    </a>
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
            <h1 style={{ textAlign: "center" }}>About Us</h1>
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
