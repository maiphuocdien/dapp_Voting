// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AttendanceRegistry {
    struct Session {
        uint256 id;
        string courseCode;
        string title;
        uint256 startTime;
        uint256 endTime;
        address instructor;
        bool active;
    }

    uint256 public nextSessionId;
    mapping(uint256 => Session) private sessions;
    mapping(uint256 => mapping(address => bool)) private attended;
    mapping(uint256 => address[]) private attendees;

    event SessionCreated(
        uint256 indexed sessionId,
        string courseCode,
        string title,
        uint256 startTime,
        uint256 endTime,
        address indexed instructor
    );
    event AttendanceMarked(uint256 indexed sessionId, address indexed student, uint256 timestamp);
    event SessionClosed(uint256 indexed sessionId, uint256 timestamp);

    modifier onlyInstructor(uint256 sessionId) {
        require(sessions[sessionId].instructor == msg.sender, "Not session instructor");
        _;
    }

    function createSession(
        string calldata courseCode,
        string calldata title,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 sessionId) {
        require(bytes(courseCode).length > 0, "Course code required");
        require(bytes(title).length > 0, "Title required");
        require(startTime < endTime, "Invalid time range");
        require(endTime > block.timestamp, "End must be in future");

        sessionId = nextSessionId;
        sessions[sessionId] = Session({
            id: sessionId,
            courseCode: courseCode,
            title: title,
            startTime: startTime,
            endTime: endTime,
            instructor: msg.sender,
            active: true
        });

        nextSessionId += 1;

        emit SessionCreated(sessionId, courseCode, title, startTime, endTime, msg.sender);
    }

    function markAttendance(uint256 sessionId) external {
        Session storage target = sessions[sessionId];
        require(target.instructor != address(0), "Session not found");
        require(target.active, "Session closed");
        require(block.timestamp >= target.startTime, "Session not started");
        require(block.timestamp <= target.endTime, "Session ended");
        require(!attended[sessionId][msg.sender], "Already marked");

        attended[sessionId][msg.sender] = true;
        attendees[sessionId].push(msg.sender);

        emit AttendanceMarked(sessionId, msg.sender, block.timestamp);
    }

    function closeSession(uint256 sessionId) external onlyInstructor(sessionId) {
        Session storage target = sessions[sessionId];
        require(target.active, "Session already closed");
        target.active = false;
        emit SessionClosed(sessionId, block.timestamp);
    }

    function getSession(uint256 sessionId) external view returns (Session memory) {
        Session memory target = sessions[sessionId];
        require(target.instructor != address(0), "Session not found");
        return target;
    }

    function didAttend(uint256 sessionId, address student) external view returns (bool) {
        return attended[sessionId][student];
    }

    function getAttendeeCount(uint256 sessionId) external view returns (uint256) {
        return attendees[sessionId].length;
    }

    function getAttendees(uint256 sessionId) external view returns (address[] memory) {
        return attendees[sessionId];
    }
}
