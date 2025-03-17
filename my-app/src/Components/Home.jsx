import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import "../Styles/Home.css";
import { IoIosArrowDown } from "react-icons/io";
import * as THREE from "three";
// Import ThreeGlobe differently to avoid the dependency on three/addons
import ThreeGlobe from "three-globe";
import GlobeImg from "../Assets/Images/Globe4.jpg";
import CarImage from "../Assets/Images/Background.png";
import CarService from "../Assets/Images/Car-Service.png";
import blockchainTransaction from "../Assets/Images/Blockchain-Transaction.png";
import drivingLogo from "../Assets/Images/Car-Sharing.png";

function Home() {
  const globeContainerRef = useRef(null);
  const [globeError, setGlobeError] = useState(false);

  useEffect(() => {
    if (!globeContainerRef.current) return;

    try {
      // Store a reference to the current DOM node to use in cleanup
      const currentGlobeContainer = globeContainerRef.current;

      // Set up scene, camera, and renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        currentGlobeContainer.offsetWidth / currentGlobeContainer.offsetHeight,
        0.1,
        1000
      );
      camera.position.z = 400;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(
        currentGlobeContainer.offsetWidth,
        currentGlobeContainer.offsetHeight
      );
      currentGlobeContainer.appendChild(renderer.domElement);

      // Create and configure the globe with texture
      const globe = new ThreeGlobe().globeImageUrl(GlobeImg);

      // arc data
      const arcsData = [
        {
          startLat: 37.7749,
          startLng: -122.4194,
          endLat: 40.7128,
          endLng: -74.006,
          color: "#FF0000",
        }, // San Francisco to New York
        {
          startLat: 34.0522,
          startLng: -118.2437,
          endLat: 51.5074,
          endLng: -0.1278,
          color: "#00FF00",
        }, // Los Angeles to London
        {
          startLat: 35.6895,
          startLng: 139.6917,
          endLat: -33.8688,
          endLng: 151.2093,
          color: "#0000FF",
        }, // Tokyo to Sydney
      ];

      // Add arcs to globe
      globe
        .arcsData(arcsData)
        .arcColor("color")
        .arcAltitudeAutoScale(0.5)
        .arcStroke(0.5)
        .arcDashLength(0.5)
        .arcDashGap(4)
        .arcDashAnimateTime(2000);

      scene.add(globe);

      // Add ambient and directional light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        globe.rotation.y += 0.001;
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        if (!currentGlobeContainer) return;

        camera.aspect =
          currentGlobeContainer.offsetWidth /
          currentGlobeContainer.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(
          currentGlobeContainer.offsetWidth,
          currentGlobeContainer.offsetHeight
        );
      };

      window.addEventListener("resize", handleResize);

      // Clean up on component unmount
      return () => {
        window.removeEventListener("resize", handleResize);
        if (renderer && currentGlobeContainer) {
          renderer.dispose();
          if (currentGlobeContainer.contains(renderer.domElement)) {
            currentGlobeContainer.removeChild(renderer.domElement);
          }
        }
      };
    } catch (error) {
      console.error("Error initializing globe:", error);
      setGlobeError(true);
    }
  }, []);

  return (
    <>
      <Header />
      <div className="HomeMainComponent">
        <div className="HomeInnerComponent">
          <div className="Home-Content">
            <div className="Home-Content-Left">
              <h1>Chain Ride</h1>
              <p>
                A decentralized, blockchain-based ride-booking platform designed
                to give riders and drivers control, transparency, and security
                in every journey.
              </p>
              <div className="home-buttons">
                <div className="driver-section">
                  <h3>For Drivers</h3>
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
                  <h3>For Riders</h3>
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
            <h1>About Us</h1>
            <div className="Part2-Para-Container">
              <p className="Part2-Para">
                Chain Ride is a decentralized, blockchain-based ride-booking
                platform designed to give riders and drivers control,
                transparency, and security in every journey. Powered by
                decentralized technology, BlockRide is a decentralized,
                blockchain-based ride-booking platform designed to give riders
                and drivers control, transparency, and security in every
                journey. Powered by decentralized technology, BlockRide connects
                riders directly with drivers without relying on traditional
                intermediaries, reducing costs and ensuring fair compensation
                for drivers connects riders directly with drivers without
                relying on traditional intermediaries, reducing costs and
                ensuring fair compensation for drivers.
              </p>
            </div>
            <div
              className="Globe-Container"
              ref={globeContainerRef}
              style={{ width: "100%", height: "500px" }}
            >
              {globeError && (
                <div
                  style={{
                    color: "white",
                    textAlign: "center",
                    paddingTop: "200px",
                  }}
                >
                  Unable to load 3D globe visualization. Please try refreshing
                  the page.
                </div>
              )}
            </div>
          </div>
          <div className="Part3ServicesContainer">
            <h2>Our Services</h2>
            <div className="ServicesContainer">
              <div className="Car-Serivce">
                <img
                  className="Car-Serivce-img"
                  src={CarService}
                  alt="Car Service"
                />
                <p className="Car-Serivce-text">Car Booking</p>
              </div>
              <div className="Car-Serivce">
                <img
                  className="Car-Serivce-img"
                  src={blockchainTransaction}
                  alt="Blockchain Transaction"
                />
                <p className="Car-Serivce-text">Blockchain</p>
              </div>
              <div className="Car-Serivce">
                <img
                  className="Car-Serivce-img"
                  src={drivingLogo}
                  alt="Driving"
                />
                <p className="Car-Serivce-text">Driving</p>
              </div>
            </div>
            <div className="Part4ContactContainer"></div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
