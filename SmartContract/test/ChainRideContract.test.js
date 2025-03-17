const ChainRideContract = artifacts.require("ChainRideContract");
const truffleAssert = require("truffle-assertions");

contract("ChainRideContract", (accounts) => {
  const driverAccount = accounts[1];
  const clientAccount = accounts[2];
  const clientAccount2 = accounts[3];

  let chainRideInstance;

  before(async () => {
    chainRideInstance = await ChainRideContract.deployed();
  });

  describe("Driver Registration and Details", () => {
    it("should register a driver with extended details", async () => {
      const name = "John Doe";
      const email = "john@example.com";
      const phone = "123-456-7890";
      const carModel = "Toyota Camry";
      const licensePlate = "ABC123";
      const carColor = "Blue";

      const result = await chainRideInstance.registerDriver(
        name,
        email,
        phone,
        carModel,
        licensePlate,
        carColor,
        { from: driverAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "DriverRegistered", (ev) => {
        return ev.walletAddress === driverAccount;
      });

      // Get driver ID from mapping
      const driverId = await chainRideInstance.driverAddressToId(driverAccount);
      assert.notEqual(driverId.toNumber(), 0, "Driver ID should not be 0");

      // Get driver details
      const driver = await chainRideInstance.drivers(driverId);
      assert.equal(driver.name, name, "Driver name should match");
      assert.equal(driver.email, email, "Driver email should match");
      assert.equal(driver.phone, phone, "Driver phone should match");
      assert.equal(driver.carModel, carModel, "Car model should match");
      assert.equal(
        driver.licensePlate,
        licensePlate,
        "License plate should match"
      );
      assert.equal(driver.carColor, carColor, "Car color should match");
      assert.equal(
        driver.walletAddress,
        driverAccount,
        "Driver wallet address should match"
      );
      assert.equal(driver.isActive, true, "Driver should be active");
    });

    it("should update driver location", async () => {
      const latitude = 37123456; // 37.123456 (scaled by 1e6)
      const longitude = -122654321; // -122.654321 (scaled by 1e6)
      const locationName = "San Francisco";

      const driverId = await chainRideInstance.driverAddressToId(driverAccount);

      const result = await chainRideInstance.updateDriverLocation(
        latitude,
        longitude,
        locationName,
        { from: driverAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "DriverLocationUpdated", (ev) => {
        return (
          ev.driverId.toNumber() === driverId.toNumber() &&
          ev.latitude.toNumber() === latitude &&
          ev.longitude.toNumber() === longitude
        );
      });

      // Get updated driver details
      const driver = await chainRideInstance.drivers(driverId);
      assert.equal(
        driver.currentLocation.latitude.toString(),
        latitude.toString(),
        "Latitude should match"
      );
      assert.equal(
        driver.currentLocation.longitude.toString(),
        longitude.toString(),
        "Longitude should match"
      );
      assert.equal(
        driver.currentLocation.name,
        locationName,
        "Location name should match"
      );
    });

    it("should get total drivers", async () => {
      const totalDrivers = await chainRideInstance.getTotalDrivers();
      assert.isAtLeast(
        totalDrivers.toNumber(),
        1,
        "Total drivers should be at least 1"
      );
    });
  });

  describe("Client Registration and Details", () => {
    it("should register a client with extended details", async () => {
      const name = "Jane Smith";
      const email = "jane@example.com";
      const phone = "987-654-3210";

      const result = await chainRideInstance.registerClient(
        name,
        email,
        phone,
        { from: clientAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "ClientRegistered", (ev) => {
        return ev.walletAddress === clientAccount;
      });

      // Get client ID from mapping
      const clientId = await chainRideInstance.clientAddressToId(clientAccount);
      assert.notEqual(clientId.toNumber(), 0, "Client ID should not be 0");

      // Get client details
      const client = await chainRideInstance.clients(clientId);
      assert.equal(client.name, name, "Client name should match");
      assert.equal(client.email, email, "Client email should match");
      assert.equal(client.phone, phone, "Client phone should match");
      assert.equal(
        client.walletAddress,
        clientAccount,
        "Client wallet address should match"
      );
      assert.equal(client.isActive, true, "Client should be active");
    });

    it("should update client location", async () => {
      const latitude = 34567890; // 34.567890 (scaled by 1e6)
      const longitude = -118765432; // -118.765432 (scaled by 1e6)
      const locationName = "Los Angeles";
      const destLatitude = 32123456; // 32.123456 (scaled by 1e6)
      const destLongitude = -117654321; // -117.654321 (scaled by 1e6)
      const destLocationName = "San Diego";

      const clientId = await chainRideInstance.clientAddressToId(clientAccount);

      const result = await chainRideInstance.updateClientLocation(
        latitude,
        longitude,
        locationName,
        destLatitude,
        destLongitude,
        destLocationName,
        { from: clientAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "ClientLocationUpdated", (ev) => {
        return (
          ev.clientId.toNumber() === clientId.toNumber() &&
          ev.latitude.toNumber() === latitude &&
          ev.longitude.toNumber() === longitude
        );
      });

      // Get updated client details
      const client = await chainRideInstance.clients(clientId);
      assert.equal(
        client.currentLocation.latitude.toString(),
        latitude.toString(),
        "Latitude should match"
      );
      assert.equal(
        client.currentLocation.longitude.toString(),
        longitude.toString(),
        "Longitude should match"
      );
      assert.equal(
        client.currentLocation.name,
        locationName,
        "Location name should match"
      );
      assert.equal(
        client.destination.latitude.toString(),
        destLatitude.toString(),
        "Destination latitude should match"
      );
      assert.equal(
        client.destination.longitude.toString(),
        destLongitude.toString(),
        "Destination longitude should match"
      );
      assert.equal(
        client.destination.name,
        destLocationName,
        "Destination name should match"
      );
    });

    it("should get total clients", async () => {
      const totalClients = await chainRideInstance.getTotalClients();
      assert.isAtLeast(
        totalClients.toNumber(),
        1,
        "Total clients should be at least 1"
      );
    });
  });

  describe("Ride Creation and Management", () => {
    let rideId;

    it("should create a ride", async () => {
      const startLatitude = 37123456; // 37.123456 (scaled by 1e6)
      const startLongitude = -122654321; // -122.654321 (scaled by 1e6)
      const startLocationName = "San Francisco";
      const destLatitude = 34567890; // 34.567890 (scaled by 1e6)
      const destLongitude = -118765432; // -118.765432 (scaled by 1e6)
      const destLocationName = "Los Angeles";
      const pickupLatitude = 37123000; // 37.123000 (scaled by 1e6)
      const pickupLongitude = -122654000; // -122.654000 (scaled by 1e6)
      const pickupLocationName = "SF Downtown";
      const availableSeats = 3;
      const price = web3.utils.toWei("0.01", "ether");
      const departureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const distance = 600000; // 600 km in meters
      const duration = 21600; // 6 hours in seconds

      const driverId = await chainRideInstance.driverAddressToId(driverAccount);

      const result = await chainRideInstance.createRide(
        startLatitude,
        startLongitude,
        startLocationName,
        destLatitude,
        destLongitude,
        destLocationName,
        pickupLatitude,
        pickupLongitude,
        pickupLocationName,
        availableSeats,
        price,
        departureTime,
        distance,
        duration,
        { from: driverAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "RideCreated", (ev) => {
        rideId = ev.rideId.toNumber();
        return (
          ev.driverId.toNumber() === driverId.toNumber() &&
          ev.price.toString() === price.toString()
        );
      });

      // Get ride details
      const ride = await chainRideInstance.rides(rideId);
      assert.equal(
        ride.driverId.toNumber(),
        driverId.toNumber(),
        "Driver ID should match"
      );
      assert.equal(
        ride.driverWalletAddress,
        driverAccount,
        "Driver wallet address should match"
      );
      assert.equal(
        ride.startLocation.name,
        startLocationName,
        "Start location name should match"
      );
      assert.equal(
        ride.destination.name,
        destLocationName,
        "Destination name should match"
      );
      assert.equal(
        ride.pickupPoint.name,
        pickupLocationName,
        "Pickup location name should match"
      );
      assert.equal(
        ride.availableSeats,
        availableSeats,
        "Available seats should match"
      );
      assert.equal(
        ride.price.toString(),
        price.toString(),
        "Price should match"
      );
      assert.equal(ride.status, "active", "Ride status should be active");
      assert.equal(ride.distance.toNumber(), distance, "Distance should match");
      assert.equal(ride.duration.toNumber(), duration, "Duration should match");
    });

    it("should request a ride", async () => {
      // Register another client
      await chainRideInstance.registerClient(
        "Bob Johnson",
        "bob@example.com",
        "555-123-4567",
        { from: clientAccount2 }
      );

      const clientId = await chainRideInstance.clientAddressToId(
        clientAccount2
      );

      const result = await chainRideInstance.requestRide(rideId, {
        from: clientAccount2,
      });

      // Check event was emitted
      truffleAssert.eventEmitted(result, "RideRequested", (ev) => {
        return (
          ev.rideId.toNumber() === rideId &&
          ev.clientId.toNumber() === clientId.toNumber()
        );
      });

      // Get ride requests
      const requestIds = await chainRideInstance.getRideRequests(rideId);
      assert.isTrue(
        requestIds.length > 0,
        "Ride should have at least one request"
      );
    });

    it("should accept a ride request", async () => {
      // Get ride requests
      const requestIds = await chainRideInstance.getRideRequests(rideId);
      const requestId = requestIds[0].toNumber();

      const clientId = await chainRideInstance.clientAddressToId(
        clientAccount2
      );

      const result = await chainRideInstance.acceptRideRequest(
        rideId,
        requestId,
        { from: driverAccount }
      );

      // Check event was emitted
      truffleAssert.eventEmitted(result, "RideRequestAccepted", (ev) => {
        return (
          ev.rideId.toNumber() === rideId &&
          ev.clientId.toNumber() === clientId.toNumber()
        );
      });

      // Get ride passengers
      const passengerIds = await chainRideInstance.getRidePassengers(rideId);
      assert.isTrue(
        passengerIds.length > 0,
        "Ride should have at least one passenger"
      );
    });

    it("should start a ride", async () => {
      const result = await chainRideInstance.startRide(rideId, {
        from: driverAccount,
      });

      // Check event was emitted
      truffleAssert.eventEmitted(result, "RideStarted", (ev) => {
        return ev.rideId.toNumber() === rideId;
      });

      // Get ride details
      const ride = await chainRideInstance.rides(rideId);
      assert.equal(
        ride.status,
        "in_progress",
        "Ride status should be in_progress"
      );
    });

    it("should complete a ride", async () => {
      const result = await chainRideInstance.completeRide(rideId, {
        from: driverAccount,
      });

      // Check event was emitted
      truffleAssert.eventEmitted(result, "RideCompleted", (ev) => {
        return ev.rideId.toNumber() === rideId;
      });

      // Get ride details
      const ride = await chainRideInstance.rides(rideId);
      assert.equal(ride.status, "completed", "Ride status should be completed");
    });
  });

  describe("Nearby Drivers", () => {
    it("should find nearby drivers", async () => {
      const latitude = 37123456; // 37.123456 (scaled by 1e6)
      const longitude = -122654321; // -122.654321 (scaled by 1e6)
      const radiusMeters = 10000000; // 10,000 km - use a very large radius to ensure we find the driver

      const nearbyDriverIds = await chainRideInstance.getNearbyDrivers(
        latitude,
        longitude,
        radiusMeters
      );

      // We should find at least one driver (the one we registered)
      assert.isTrue(
        nearbyDriverIds.length > 0,
        "Should find at least one nearby driver"
      );
    });
  });

  describe("Active Rides", () => {
    it("should get active rides", async () => {
      // Create another active ride
      const startLatitude = 37123456;
      const startLongitude = -122654321;
      const startLocationName = "San Francisco";
      const destLatitude = 34567890;
      const destLongitude = -118765432;
      const destLocationName = "Los Angeles";
      const pickupLatitude = 37123000;
      const pickupLongitude = -122654000;
      const pickupLocationName = "SF Downtown";
      const availableSeats = 2;
      const price = web3.utils.toWei("0.02", "ether");
      const departureTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      const distance = 600000;
      const duration = 21600;

      await chainRideInstance.createRide(
        startLatitude,
        startLongitude,
        startLocationName,
        destLatitude,
        destLongitude,
        destLocationName,
        pickupLatitude,
        pickupLongitude,
        pickupLocationName,
        availableSeats,
        price,
        departureTime,
        distance,
        duration,
        { from: driverAccount }
      );

      const activeRideIds = await chainRideInstance.getActiveRides();
      assert.isTrue(
        activeRideIds.length > 0,
        "Should have at least one active ride"
      );
    });
  });
});
