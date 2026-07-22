import { API_BASE } from "../lib/http";

// Connects to the live audit log stream and calls onLogCreated(log) whenever
// the backend broadcasts a newly-written audit log entry. Mirrors
// useSeatSocket.js's reconnect behavior. Returns a close() function to tear
// the socket down.
//
// Auth goes through a query param, not a header, because the browser
// WebSocket API can't set custom headers — the backend verifies the token
// and ADMIN role before upgrading the connection (403 otherwise).
export function connectAuditLogSocket(onLogCreated) {
    const token = localStorage.getItem("admin_token");
    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/ws/admin/audit-logs?token=${encodeURIComponent(token || "")}`;
    let socket = null;
    let closedByCaller = false;
    let retryTimer = null;

    function connect() {
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            try {
                const log = JSON.parse(event.data);
                if (log?.event_type) {
                    onLogCreated(log);
                }
            } catch {
                // Ignore malformed frames instead of crashing the log view.
            }
        };

        socket.onclose = () => {
            if (!closedByCaller) {
                // Backend/network hiccup — retry so the log view doesn't go stale.
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
