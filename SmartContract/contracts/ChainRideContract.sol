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
    
    // Mappings
    mapping(uint256 => Driver) public drivers;
    mapping(address => uint256) public driverAddressToId;
    mapping(uint256 => Client) public clients;
    mapping(address => uint256) public clientAddressToId;
    mapping(uint256 => Ride) public rides;
    mapping(uint256 => Passenger) public passengers;
    mapping(uint256 => RideRequest) public rideRequests;
    
    // Arrays to keep track of all entities
    uint256[] public allDriverIds;
    uint256[] public allClientIds;
    uint256[] public allRideIds;
    uint256[] public allPassengerIds;
    
    // Events
    event DriverRegistered(uint256 indexed driverId, address indexed walletAddress);
    event ClientRegistered(uint256 indexed clientId, address indexed walletAddress);
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
    
    function getTotalDrivers() public view returns (uint256) {
        return driverIdCounter - 1;
    }
    
    function getTotalClients() public view returns (uint256) {
        return clientIdCounter - 1;
    }
}
