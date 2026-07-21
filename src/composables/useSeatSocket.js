import { API_BASE } from "../lib/http";

// Connects to the live seat map for a showtime and calls onSeatUpdate(seatId,
// status) whenever the backend broadcasts a change (lock/unlock/booked/
// reaper-expired). Returns a close() function to tear the socket down.
export function connectSeatSocket(showtimeId, onSeatUpdate) {
    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/ws/showtimes/${showtimeId}`;
    let socket = null;
    let closedByCaller = false;
    let retryTimer = null;

    function connect() {
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.seat_id && data.status) {
                    onSeatUpdate(data.seat_id, data.status);
                }
            } catch {
                // Ignore malformed frames instead of crashing the seat map.
            }
        };

        socket.onclose = () => {
            if (!closedByCaller) {
                // Backend/network hiccup — retry so the map doesn't go stale.
                retryTimer = setTimeout(connect, 3000);
            }
        };
    }

    connect();

    return function close() {
        closedByCaller = true;
        clearTimeout(retryTimer);
        socket?.close();
    };
}
