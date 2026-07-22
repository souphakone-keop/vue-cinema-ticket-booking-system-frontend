<script setup>
import { ref, onMounted } from "vue";
import { http } from "../../lib/http";

const bookings = ref([]);
const movieTitles = ref({});
const loading = ref(true);
const error = ref("");

const statusBadge = (status) => {
    switch ((status || "").toUpperCase()) {
        case "CONFIRMED":
            return "badge-success";
        case "PENDING":
            return "badge-warning";
        case "EXPIRED":
            return "badge-ghost";
        case "CANCELLED":
            return "badge-error";
        default:
            return "badge-ghost";
    }
};

function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// `showtime_start_time` is the wall-clock time an admin typed into the
// bulk-create form — the backend stores it verbatim with a "Z" suffix, it
// isn't a true UTC instant. Formatting with the browser's local timezone
// would shift the displayed hour by the viewer's UTC offset, so read the
// UTC fields directly instead of using `formatDateTime` above (which is
// correct for `created_at`, a genuine server timestamp).
function formatShowtime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

const fetchTickets = async () => {
    loading.value = true;
    error.value = "";
    try {
        const res = await http.get("/bookings/me");
        const rawBookings = res.data.bookings || (Array.isArray(res.data) ? res.data : []);

        // Show the most recently booked tickets first regardless of what
        // order the backend returns them in.
        bookings.value = [...rawBookings].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // The booking response doesn't include the movie title — resolve it
        // client-side from showtime_id -> movie_id -> title so tickets don't
        // just show "Hall 1, 6pm" with no indication of what's playing.
        try {
            const [showtimesRes, moviesRes] = await Promise.all([
                http.get("/showtimes"),
                http.get("/movies"),
            ]);
            const showtimes = showtimesRes.data.showtimes || (Array.isArray(showtimesRes.data) ? showtimesRes.data : []);
            const movies = moviesRes.data.movies || (Array.isArray(moviesRes.data) ? moviesRes.data : []);

            const map = {};
            for (const booking of bookings.value) {
                const showtime = showtimes.find((s) => s.id === booking.showtime_id);
                const movie = showtime && movies.find((m) => m.id === showtime.movie_id);
                if (movie) map[booking.id] = movie.title;
            }
            movieTitles.value = map;
        } catch {
            // Non-critical — tickets still render without the movie title.
        }
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchTickets);
</script>

<template>
    <div class="min-h-screen bg-black text-white px-8 py-12">
        <h1 class="text-3xl font-bold">My Tickets</h1>
        <p class="text-gray-400 mt-1">Your booking history.</p>

        <div v-if="loading" class="flex justify-center py-20">
            <span class="loading loading-spinner loading-lg text-red-600"></span>
        </div>

        <div v-else-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 max-w-xl mt-10">
            <span>⚠️ {{ error }}</span>
        </div>

        <div v-else-if="bookings.length === 0" class="text-center py-20 text-gray-400">
            <div class="text-6xl mb-4">🎟️</div>
            <p class="text-lg">No data found.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            <div v-for="booking in bookings" :key="booking.id"
                class="card bg-neutral-900 border border-neutral-800">
                <div class="card-body p-6">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-bold">
                                {{ movieTitles[booking.id] || booking.hall_name || "Booking" }}
                            </h2>
                            <p class="text-sm text-gray-400 mt-0.5">
                                🎦 {{ booking.hall_name || "—" }}
                            </p>
                        </div>

                        <span class="badge badge-sm" :class="statusBadge(booking.status)">
                            {{ booking.status || "UNKNOWN" }}
                        </span>
                    </div>

                    <div class="divider my-3"></div>

                    <div class="space-y-1.5 text-sm">
                        <p class="text-gray-300">
                            🕒 {{ formatShowtime(booking.showtime_start_time) }}
                        </p>
                        <p class="text-gray-300">
                            💺 Seats: <span class="font-medium text-white">{{ (booking.seat_codes || []).join(", ") || "—" }}</span>
                        </p>
                        <p class="text-gray-300">
                            🧾 Booked: {{ formatDateTime(booking.created_at) }}
                        </p>
                    </div>

                    <div class="divider my-3"></div>

                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-400">Total</span>
                        <span class="text-lg font-bold text-red-500">{{ booking.total_price ?? 0 }}THB</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
