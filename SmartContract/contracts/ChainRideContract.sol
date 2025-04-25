// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainRideContract {
    // Counter for IDs
    uint256 private driverIdCounter = 1;
    uint256 private clientIdCounter = 1;
    uint256 private rideIdCounter = 1;
    uint256 private requestIdCounter = 1;
    
    // Structs
    struct Driver {
        uint256 id;
        address walletAddress;
        string name;
        string email;
        string phone;
        string carModel;
        string licensePlate;
        string carColor;
        bool isActive;
        uint256 timestamp;
    }
    
    struct Client {
        uint256 id;
        address walletAddress;
        string name;
        string email;
        string phone;
        bool isActive;
        uint256 timestamp;
    }
    
    struct RideRequest {
        uint256 id;
        uint256 clientId;
        address clientWalletAddress;
        string status; // "pending", "accepted", "rejected"
        uint256 requestedAt;
    }
    
    struct Ride {
        uint256 id;
        uint256 driverId;
        address driverWalletAddress;
        string startLocation;
        string destination;
        uint8 availableSeats;
        uint256 price; // In wei per passenger
        string status; // "active", "in_progress", "completed", "cancelled"
        uint256 createdAt;
        uint256 departureTime; // Unix timestamp
        uint256[] passengerIds;
        uint256[] requestIds;
    }
    
    struct Passenger {
        uint256 id;
        uint256 clientId;
        address clientWalletAddress;
        string status; // "confirmed", "completed"
        bool paid;
    }
    
    // New struct to return ride details (fixing stack too deep)
    struct RideDetails {
        uint256 id;
        uint256 driverId;
        address driverWalletAddress;
        string startLocation;
        string destination;
        uint8 availableSeats;
        uint256 price;
        string status;
        uint256 createdAt;
        uint256 departureTime;
        uint256[] passengerIds;
        uint256[] requestIds;
    }
    
    // Add a new struct for rating
    struct Rating {
        uint256 id;
        uint256 rideId;
        uint256 driverId;
        uint256 clientId;
        uint8 score; // Rating score from 1-5
        uint256 timestamp;
    }
    
    // Mappings
    mapping(uint256 => Driver) public drivers;
    mapping(address => uint256) public driverAddressToId;
    mapping(uint256 => Client) public clients;
    mapping(address => uint256) public clientAddressToId;
    mapping(uint256 => Ride) public rides;
    mapping(uint256 => Passenger) public passengers;
    mapping(uint256 => RideRequest) public rideRequests;
    
    // Add new mapping to track rides per client
    mapping(uint256 => uint256[]) private clientRides; // clientId => rideIds
    
    // Add mapping for ratings
    mapping(uint256 => Rating) public ratings;
    uint256 private ratingCount = 0;
    
    // Add driver rating tracking
    mapping(uint256 => uint256) private driverTotalRatings; // Total sum of all ratings
    mapping(uint256 => uint256) private driverRatingCount; // Count of ratings received
    
    // Arrays to keep track of all entities
    uint256[] public allDriverIds;
    uint256[] public allClientIds;
    uint256[] public allRideIds;
    uint256[] public allPassengerIds;
    
    // Events
    event DriverRegistered(uint256 indexed driverId, address indexed walletAddress);
    event DriverUpdated(uint256 indexed driverId, address indexed walletAddress);
    event ClientRegistered(uint256 indexed clientId, address indexed walletAddress);
    event ClientUpdated(uint256 indexed clientId, address indexed walletAddress);
    event RideCreated(uint256 indexed rideId, uint256 indexed driverId, uint256 price);
    event RideRequested(uint256 indexed rideId, uint256 indexed clientId, uint256 requestId);
    event RideRequestAccepted(uint256 indexed rideId, uint256 indexed clientId);
    event RideRequestRejected(uint256 indexed rideId, uint256 indexed clientId);
    event RideStarted(uint256 indexed rideId);
    event RideCompleted(uint256 indexed rideId);
    event RideCancelled(uint256 indexed rideId);
    event PaymentReceived(uint256 indexed rideId, uint256 indexed clientId, uint256 amount);
    // New event for ride confirmation by a passenger
    event RideConfirmed(uint256 indexed rideId, uint256 indexed clientId, uint256 amount);
    event RatingSubmitted(uint256 ratingId, uint256 rideId, uint256 driverId, uint256 clientId, uint8 score);
    
    // Modifiers
    modifier onlyDriver(uint256 _driverId) {
        require(driverAddressToId[msg.sender] == _driverId, "Not authorized");
        _;
    }
    
    modifier rideExists(uint256 _rideId) {
        require(_rideId > 0 && _rideId < rideIdCounter, "Ride does not exist");
        _;
    }
    
    // Driver functions
    function registerDriver(
        string memory _name,
        string memory _email,
        string memory _phone,
        string memory _carModel,
        string memory _licensePlate,
        string memory _carColor
    ) public returns (uint256) {
        require(driverAddressToId[msg.sender] == 0, "Driver already registered");
        
        uint256 newDriverId = driverIdCounter++;
        Driver storage newDriver = drivers[newDriverId];
        newDriver.id = newDriverId;
        newDriver.walletAddress = msg.sender;
        newDriver.name = _name;
        newDriver.email = _email;
        newDriver.phone = _phone;
        newDriver.carModel = _carModel;
        newDriver.licensePlate = _licensePlate;
        newDriver.carColor = _carColor;
        newDriver.isActive = true;
        newDriver.timestamp = block.timestamp;
        
        driverAddressToId[msg.sender] = newDriverId;
        allDriverIds.push(newDriverId);
        
        emit DriverRegistered(newDriverId, msg.sender);
        return newDriverId;
    }
    
    // Update driver information
    function updateDriver(
        string memory _name,
        string memory _email,
        string memory _phone,
        string memory _carModel,
        string memory _licensePlate,
        string memory _carColor
    ) public returns (bool) {
        uint256 driverId = driverAddressToId[msg.sender];
        require(driverId > 0, "Driver not registered");
        
        Driver storage driver = drivers[driverId];
        require(driver.walletAddress == msg.sender, "Only driver can update their own profile");
        
        driver.name = _name;
        driver.email = _email;
        driver.phone = _phone;
        driver.carModel = _carModel;
        driver.licensePlate = _licensePlate;
        driver.carColor = _carColor;
        
        emit DriverUpdated(driverId, msg.sender);
        
        return true;
    }
    
    // Client functions
    function registerClient(
        string memory _name,
        string memory _email,
        string memory _phone
    ) public returns (uint256) {
        require(clientAddressToId[msg.sender] == 0, "Client already registered");
        
        uint256 newClientId = clientIdCounter++;
        Client storage newClient = clients[newClientId];
        newClient.id = newClientId;
        newClient.walletAddress = msg.sender;
        newClient.name = _name;
        newClient.email = _email;
        newClient.phone = _phone;
        newClient.isActive = true;
        newClient.timestamp = block.timestamp;
        
        clientAddressToId[msg.sender] = newClientId;
        allClientIds.push(newClientId);
        
        emit ClientRegistered(newClientId, msg.sender);
        return newClientId;
    }
    
    // Update client information
    function updateClient(
        string memory _name,
        string memory _email,
        string memory _phone
    ) public returns (bool) {
        uint256 clientId = clientAddressToId[msg.sender];
        require(clientId > 0, "Client not registered");
        
        Client storage client = clients[clientId];
        require(client.walletAddress == msg.sender, "Only client can update their own profile");
        
        client.name = _name;
        client.email = _email;
        client.phone = _phone;
        
        // Consider adding a ClientUpdated event here
        emit ClientUpdated(clientId, msg.sender);
        
        return true;
    }
    
    // Ride functions
    function createRide(
        string memory _startLocation,
        string memory _destination,
        uint8 _availableSeats,
        uint256 _price,
        uint256 _departureTime
    ) public returns (uint256) {
        uint256 driverId = driverAddressToId[msg.sender];
        require(driverId > 0, "Driver not registered");
        
        uint256 newRideId = rideIdCounter++;
        Ride storage newRide = rides[newRideId];
        newRide.id = newRideId;
        newRide.driverId = driverId;
        newRide.driverWalletAddress = msg.sender;
        newRide.startLocation = _startLocation;
        newRide.destination = _destination;
        newRide.availableSeats = _availableSeats;
        newRide.price = _price;
        newRide.status = "active";
        newRide.createdAt = block.timestamp;
        newRide.departureTime = _departureTime;
        
        allRideIds.push(newRideId);
        
        emit RideCreated(newRideId, driverId, _price);
        return newRideId;
    }
    
    function requestRide(uint256 _rideId) public rideExists(_rideId) returns (uint256) {
        uint256 clientId = clientAddressToId[msg.sender];
        require(clientId > 0, "Client not registered");
        
        Ride storage ride = rides[_rideId];
        require(bytes(ride.status).length > 0, "Ride does not exist");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("active")), "Ride is not active");
        require(ride.availableSeats > 0, "No available seats");
        
        // Check if client has already requested this ride
        for (uint i = 0; i < ride.requestIds.length; i++) {
            RideRequest storage existingRequest = rideRequests[ride.requestIds[i]];
            if (existingRequest.clientId == clientId) {
                require(
                    keccak256(bytes(existingRequest.status)) == keccak256(bytes("rejected")),
                    "Already requested or accepted for this ride"
                );
            }
        }
        
        // Create new request
        uint256 newRequestId = requestIdCounter++;
        RideRequest storage newRequest = rideRequests[newRequestId];
        newRequest.id = newRequestId;
        newRequest.clientId = clientId;
        newRequest.clientWalletAddress = msg.sender;
        newRequest.status = "pending";
        newRequest.requestedAt = block.timestamp;
        
        ride.requestIds.push(newRequestId);
        
        emit RideRequested(_rideId, clientId, newRequestId);
        return newRequestId;
    }
    
    function acceptRideRequest(uint256 _rideId, uint256 _requestId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driverWalletAddress, "Only ride driver can accept requests");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("active")), "Ride is not active");
        require(ride.availableSeats > 0, "No available seats");
        
        RideRequest storage request = rideRequests[_requestId];
        require(keccak256(bytes(request.status)) == keccak256(bytes("pending")), "Request is not pending");
        
        // Update request status
        request.status = "accepted";
        
        // Create passenger
        uint256 newPassengerId = allPassengerIds.length + 1;
        Passenger storage newPassenger = passengers[newPassengerId];
        newPassenger.id = newPassengerId;
        newPassenger.clientId = request.clientId;
        newPassenger.clientWalletAddress = request.clientWalletAddress;
        newPassenger.status = "confirmed";
        newPassenger.paid = false;
        
        ride.passengerIds.push(newPassengerId);
        ride.availableSeats--;
        allPassengerIds.push(newPassengerId);
        
        // Add this ride to the client's rides mapping
        clientRides[request.clientId].push(_rideId);
        
        emit RideRequestAccepted(_rideId, request.clientId);
    }
    
    function rejectRideRequest(uint256 _rideId, uint256 _requestId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driverWalletAddress, "Only ride driver can reject requests");
        
        RideRequest storage request = rideRequests[_requestId];
        require(keccak256(bytes(request.status)) == keccak256(bytes("pending")), "Request is not pending");
        
        // Update request status
        request.status = "rejected";
        
        emit RideRequestRejected(_rideId, request.clientId);
    }
    
    function startRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driverWalletAddress, "Only ride driver can start the ride");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("active")), "Ride is not active");
        
        ride.status = "in_progress";
        
        emit RideStarted(_rideId);
    }
    
    // Modified completeRide: Marks the ride as "completed"
    // and the actual fund transfer is handled in confirmRide.
    function completeRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driverWalletAddress, "Only ride driver can complete the ride");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("in_progress")), "Ride is not in progress");
        
        ride.status = "completed";
        
        emit RideCompleted(_rideId);
    }
    
    // Confirm ride completion by a passenger.
    // The passenger sends the exact ride price; upon confirmation,
    // the funds are transferred to the driver.
    function confirmRide(uint256 _rideId) public payable rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(keccak256(bytes(ride.status)) == keccak256(bytes("completed")), "Ride must be completed first");
        
        // Verify that the sender is a passenger for this ride
        bool isPassenger = false;
        uint256 passengerIdFound;
        for (uint i = 0; i < ride.passengerIds.length; i++) {
            uint256 pid = ride.passengerIds[i];
            Passenger storage passenger = passengers[pid];
            if (passenger.clientWalletAddress == msg.sender) {
                require(!passenger.paid, "Payment already confirmed");
                isPassenger = true;
                passengerIdFound = pid;
                break;
            }
        }
        require(isPassenger, "Caller is not a passenger of this ride");
        
        // Ensure the correct payment amount is sent (price per passenger)
        require(msg.value == ride.price, "Incorrect payment amount");
        
        // Mark the passenger as having confirmed payment
        passengers[passengerIdFound].paid = true;
        passengers[passengerIdFound].status = "confirmed";
        
        // Transfer funds to the driver's wallet
        payable(ride.driverWalletAddress).transfer(msg.value);
        
        emit RideConfirmed(_rideId, passengers[passengerIdFound].clientId, ride.price);
    }
    
    // New function: Get detailed ride information as a single struct to avoid stack too deep error.
    function getRideDetails(uint256 _rideId) public view rideExists(_rideId) returns (RideDetails memory) {
        Ride storage ride = rides[_rideId];
        RideDetails memory details = RideDetails({
            id: ride.id,
            driverId: ride.driverId,
            driverWalletAddress: ride.driverWalletAddress,
            startLocation: ride.startLocation,
            destination: ride.destination,
            availableSeats: ride.availableSeats,
            price: ride.price,
            status: ride.status,
            createdAt: ride.createdAt,
            departureTime: ride.departureTime,
            passengerIds: ride.passengerIds,
            requestIds: ride.requestIds
        });
        return details;
    }
    
    function cancelRide(uint256 _rideId) public rideExists(_rideId) {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driverWalletAddress, "Only ride driver can cancel the ride");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("active")), "Ride cannot be cancelled at this stage");
        
        ride.status = "cancelled";
        
        emit RideCancelled(_rideId);
    }
    
    // Getter functions
    function getActiveRides() public view returns (uint256[] memory) {
        uint256[] memory activeRideIds = new uint256[](allRideIds.length);
        uint256 count = 0;
        
        for (uint i = 0; i < allRideIds.length; i++) {
            uint256 rideId = allRideIds[i];
            if (keccak256(bytes(rides[rideId].status)) == keccak256(bytes("active"))) {
                activeRideIds[count] = rideId;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = activeRideIds[i];
        }
        
        return result;
    }
    
    function getDriverRides(uint256 _driverId) public view returns (uint256[] memory) {
        uint256[] memory driverRideIds = new uint256[](allRideIds.length);
        uint256 count = 0;
        
        for (uint i = 0; i < allRideIds.length; i++) {
            uint256 rideId = allRideIds[i];
            if (rides[rideId].driverId == _driverId) {
                driverRideIds[count] = rideId;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = driverRideIds[i];
        }
        
        return result;
    }
    
    function getRideRequests(uint256 _rideId) public view rideExists(_rideId) returns (uint256[] memory) {
        return rides[_rideId].requestIds;
    }
    
    function getRidePassengers(uint256 _rideId) public view rideExists(_rideId) returns (uint256[] memory) {
        return rides[_rideId].passengerIds;
    }
    
    // Add function to get all rides for a client
    function getClientRides(uint256 _clientId) public view returns (uint256[] memory) {
        return clientRides[_clientId];
    }
    
    function getTotalDrivers() public view returns (uint256) {
        return driverIdCounter - 1;
    }
    
    function getTotalClients() public view returns (uint256) {
        return clientIdCounter - 1;
    }
    
    // Add the rating function
    function rateDriver(uint256 _rideId, uint8 _score) public {
        // Validate the score is between 1 and 5
        require(_score >= 1 && _score <= 5, "Rating must be between 1 and 5");
        
        // Get the ride details
        Ride storage ride = rides[_rideId];
        require(ride.id > 0, "Ride does not exist");
        require(keccak256(bytes(ride.status)) == keccak256(bytes("completed")), "Ride must be completed to rate");
        
        // Get the client ID
        uint256 clientId = clientAddressToId[msg.sender];
        require(clientId > 0, "Client not registered");
        
        // Check if client was a passenger on this ride
        bool isPassenger = false;
        for (uint256 i = 0; i < ride.passengerIds.length; i++) {
            Passenger storage passenger = passengers[ride.passengerIds[i]];
            if (passenger.clientId == clientId) {
                isPassenger = true;
                break;
            }
        }
        require(isPassenger, "Only passengers can rate a ride");
        
        // Check if client has already rated this ride
        for (uint256 i = 1; i <= ratingCount; i++) {
            if (ratings[i].rideId == _rideId && ratings[i].clientId == clientId) {
                revert("You have already rated this ride");
            }
        }
        
        // Create a new rating
        ratingCount++;
        ratings[ratingCount] = Rating({
            id: ratingCount,
            rideId: _rideId,
            driverId: ride.driverId,
            clientId: clientId,
            score: _score,
            timestamp: block.timestamp
        });
        
        // Update driver's total ratings and count
        driverTotalRatings[ride.driverId] += _score;
        driverRatingCount[ride.driverId]++;
        
        // Emit event
        emit RatingSubmitted(ratingCount, _rideId, ride.driverId, clientId, _score);
    }
    
    // Get average rating for a driver
    function getDriverRating(uint256 _driverId) public view returns (uint256, uint256) {
        require(_driverId > 0, "Driver ID must be greater than 0");
        require(drivers[_driverId].id > 0, "Driver does not exist");
        
        // If no ratings, return 0
        if (driverRatingCount[_driverId] == 0) {
            return (0, 0);
        }
        
        // Return average rating and count
        return (driverTotalRatings[_driverId], driverRatingCount[_driverId]);
    }
    
    // Get all ratings for a specific driver
    function getDriverRatings(uint256 _driverId) public view returns (uint256[] memory) {
        require(_driverId > 0, "Driver ID must be greater than 0");
        
        // Count how many ratings this driver has
        uint256 count = 0;
        for (uint256 i = 1; i <= ratingCount; i++) {
            if (ratings[i].driverId == _driverId) {
                count++;
            }
        }
        
        // Create array of the appropriate size
        uint256[] memory driverRatingIds = new uint256[](count);
        
        // Fill the array
        uint256 index = 0;
        for (uint256 i = 1; i <= ratingCount; i++) {
            if (ratings[i].driverId == _driverId) {
                driverRatingIds[index] = i;
                index++;
            }
        }
        
        return driverRatingIds;
    }
    
    // Get all ratings for a specific ride
    function getRideRatings(uint256 _rideId) public view returns (uint256[] memory) {
        require(_rideId > 0, "Ride ID must be greater than 0");
        
        // Count how many ratings this ride has
        uint256 count = 0;
        for (uint256 i = 1; i <= ratingCount; i++) {
            if (ratings[i].rideId == _rideId) {
                count++;
            }
        }
        
        // Create array of the appropriate size
        uint256[] memory rideRatingIds = new uint256[](count);
        
        // Fill the array
        uint256 index = 0;
        for (uint256 i = 1; i <= ratingCount; i++) {
            if (ratings[i].rideId == _rideId) {
                rideRatingIds[index] = i;
                index++;
            }
        }
        
        return rideRatingIds;
    }
}
