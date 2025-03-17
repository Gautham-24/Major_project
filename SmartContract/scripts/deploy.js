const ChainRideContract = artifacts.require("ChainRideContract");

module.exports = async function (callback) {
  try {
    // Get accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    console.log("Available accounts:", accounts);

    // Deploy the contract
    console.log("Deploying ChainRideContract...");
    const chainRideContract = await ChainRideContract.deployed();
    console.log("ChainRideContract deployed at:", chainRideContract.address);

    // Register some drivers and clients for testing
    console.log("\nRegistering test drivers and clients...");

    // Register drivers
    const driver1 = accounts[1];
    const driver2 = accounts[2];

    const driver1Result = await chainRideContract.registerDriver({
      from: driver1,
    });
    const driver1Id = driver1Result.logs[0].args.driverId.toNumber();
    console.log(
      `Driver 1 registered with ID: ${driver1Id} and address: ${driver1}`
    );

    const driver2Result = await chainRideContract.registerDriver({
      from: driver2,
    });
    const driver2Id = driver2Result.logs[0].args.driverId.toNumber();
    console.log(
      `Driver 2 registered with ID: ${driver2Id} and address: ${driver2}`
    );

    // Register clients
    const client1 = accounts[3];
    const client2 = accounts[4];

    const client1Result = await chainRideContract.registerClient({
      from: client1,
    });
    const client1Id = client1Result.logs[0].args.clientId.toNumber();
    console.log(
      `Client 1 registered with ID: ${client1Id} and address: ${client1}`
    );

    const client2Result = await chainRideContract.registerClient({
      from: client2,
    });
    const client2Id = client2Result.logs[0].args.clientId.toNumber();
    console.log(
      `Client 2 registered with ID: ${client2Id} and address: ${client2}`
    );

    // Update driver locations
    console.log("\nUpdating driver locations...");

    // Toronto coordinates (scaled by 1e6 for the contract)
    const torontoLat = 43.65107 * 1000000;
    const torontoLng = -79.347015 * 1000000;

    await chainRideContract.updateDriverLocation(
      torontoLat,
      torontoLng,
      "Toronto Downtown",
      { from: driver1 }
    );
    console.log(`Driver 1 location updated to Toronto Downtown`);

    // Montreal coordinates (scaled by 1e6 for the contract)
    const montrealLat = 45.508888 * 1000000;
    const montrealLng = -73.561668 * 1000000;

    await chainRideContract.updateDriverLocation(
      montrealLat,
      montrealLng,
      "Montreal Downtown",
      { from: driver2 }
    );
    console.log(`Driver 2 location updated to Montreal Downtown`);

    // Update client locations
    console.log("\nUpdating client locations...");

    // Ottawa coordinates (scaled by 1e6 for the contract)
    const ottawaLat = 45.424721 * 1000000;
    const ottawaLng = -75.695 * 1000000;

    // Kingston coordinates (scaled by 1e6 for the contract)
    const kingstonLat = 44.230687 * 1000000;
    const kingstonLng = -76.481323 * 1000000;

    await chainRideContract.updateClientLocation(
      ottawaLat,
      ottawaLng,
      "Ottawa Downtown",
      kingstonLat,
      kingstonLng,
      "Kingston Downtown",
      { from: client1 }
    );
    console.log(`Client 1 location updated from Ottawa to Kingston`);

    // Vancouver coordinates (scaled by 1e6 for the contract)
    const vancouverLat = 49.282729 * 1000000;
    const vancouverLng = -123.120738 * 1000000;

    // Calgary coordinates (scaled by 1e6 for the contract)
    const calgaryLat = 51.04427 * 1000000;
    const calgaryLng = -114.062019 * 1000000;

    await chainRideContract.updateClientLocation(
      vancouverLat,
      vancouverLng,
      "Vancouver Downtown",
      calgaryLat,
      calgaryLng,
      "Calgary Downtown",
      { from: client2 }
    );
    console.log(`Client 2 location updated from Vancouver to Calgary`);

    // Create some ride offers
    console.log("\nCreating ride offers...");

    // Toronto to Ottawa ride
    const torontoToOttawaResult = await chainRideContract.createRide(
      torontoLat,
      torontoLng,
      "Toronto Downtown",
      ottawaLat,
      ottawaLng,
      "Ottawa Downtown",
      torontoLat,
      torontoLng,
      "Toronto Downtown",
      2, // available seats
      web3.utils.toWei("0.05", "ether"), // price in wei
      Math.floor(Date.now() / 1000) + 3600, // departure time (1 hour from now)
      450000, // distance in meters
      16200, // duration in seconds
      { from: driver1 }
    );

    const ride1Id = torontoToOttawaResult.logs[0].args.rideId.toNumber();
    console.log(`Ride 1 created with ID: ${ride1Id} from Toronto to Ottawa`);

    // Montreal to Quebec City ride
    const quebecCityLat = 46.813878 * 1000000;
    const quebecCityLng = -71.207981 * 1000000;

    const montrealToQuebecResult = await chainRideContract.createRide(
      montrealLat,
      montrealLng,
      "Montreal Downtown",
      quebecCityLat,
      quebecCityLng,
      "Quebec City Downtown",
      montrealLat,
      montrealLng,
      "Montreal Downtown",
      3, // available seats
      web3.utils.toWei("0.04", "ether"), // price in wei
      Math.floor(Date.now() / 1000) + 7200, // departure time (2 hours from now)
      250000, // distance in meters
      10800, // duration in seconds
      { from: driver2 }
    );

    const ride2Id = montrealToQuebecResult.logs[0].args.rideId.toNumber();
    console.log(
      `Ride 2 created with ID: ${ride2Id} from Montreal to Quebec City`
    );

    // Request rides
    console.log("\nRequesting rides...");

    await chainRideContract.requestRide(ride1Id, { from: client1 });
    console.log(`Client 1 requested Ride 1`);

    await chainRideContract.requestRide(ride2Id, { from: client2 });
    console.log(`Client 2 requested Ride 2`);

    console.log("\nDeployment and setup completed successfully!");

    callback();
  } catch (error) {
    console.error("Error during deployment:", error);
    callback(error);
  }
};
