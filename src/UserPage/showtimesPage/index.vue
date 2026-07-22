<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { http } from "../../lib/http";

const route = useRoute();
const router = useRouter();

const todayDate = new Date().toISOString().slice(0, 10);

const movie = ref(null);
const showtimes = ref([]);
const loading = ref(true);
const error = ref("");
const selectedDate = ref(todayDate);

// `start_time` is a wall-clock value stored verbatim with a fake "Z"
// suffix (see formatDateTime below) — its literal digits are the intended
// time, not a true UTC instant. To compare it against "now" without the
// same timezone drift, re-express "now" the same way: take the browser's
// real local wall-clock reading and stamp it as if it were UTC, so both
// sides of the comparison live in the same fake-UTC space.
function isPastShowtime(startTime) {
    if (!startTime) return false;
    const now = new Date();
    const nowAsFakeUtc = Date.UTC(
        now.getFullYear(), now.getMonth(), now.getDate(),
        now.getHours(), now.getMinutes(), now.getSeconds()
    );
    return new Date(startTime).getTime() < nowAsFakeUtc;
}

// Showtimes on the selected day that haven't already started, sorted
// earliest first.
const filteredShowtimes = computed(() =>
    showtimes.value
        .filter((s) => s.start_time?.slice(0, 10) === selectedDate.value && !isPastShowtime(s.start_time))
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
);

const fetchShowtimes = async () => {
    loading.value = true;
    error.value = "";
    try {
        // No GET /movies/:id or /movies/:id/showtimes endpoint exists — the
        // real API is a flat GET /showtimes?movie_id=... plus a full movie
        // list to look up the title/genre from.
        const [showtimesRes, moviesRes] = await Promise.all([
            http.get("/showtimes", { params: { movie_id: route.params.movieId } }),
            http.get("/movies"),
        ]);

        showtimes.value = showtimesRes.data.showtimes || (Array.isArray(showtimesRes.data) ? showtimesRes.data : []);

        const movies = moviesRes.data.movies || (Array.isArray(moviesRes.data) ? moviesRes.data : []);
        movie.value = movies.find((m) => m.id === route.params.movieId) || null;
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchShowtimes);

// `start_time` is the wall-clock time an admin typed into the bulk-create
// form — the backend stores it verbatim with a "Z" suffix, it isn't a true
// UTC instant. Formatting with the browser's local timezone would shift
// the displayed hour by the viewer's UTC offset, so read the UTC fields
// directly instead.
function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
}

function selectShowtime(showtime) {
    router.push({ name: "seats", params: { showtimeId: showtime.id } });
}
</script>

<template>
    <div class="min-h-screen bg-black text-white px-8 py-12">
        <button class="btn btn-dark btn-sm text-gray-400 mb-6" @click="router.back()">
            ← Back
        </button>

        <h1 class="text-3xl font-bold">
            {{ movie?.title || "Select a Showtime" }}
        </h1>
        <p class="text-gray-400 mt-1" v-if="movie?.genre">
            {{ movie.genre }}<span v-if="movie.duration_min"> · {{ movie.duration_min }} min</span>
        </p>

        <div class="mt-8">
            <label class="label">
                <span class="label-text text-gray-400">Date</span>
            </label>
            <input v-model="selectedDate" type="date" :min="todayDate"
                class="input input-bordered bg-neutral-900 border-neutral-700 text-white w-full max-w-[220px]" />
        </div>

        <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div v-for="n in 6" :key="n" class="h-20 rounded-xl bg-neutral-800 animate-pulse"></div>
        </div>

        <div v-else-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 max-w-xl mt-10">
            <span>⚠️ {{ error }}</span>
        </div>

        <div v-else-if="filteredShowtimes.length === 0" class="text-center py-20 text-gray-400">
            <div class="text-6xl mb-4">🕒</div>
            <p class="text-lg">No data found.</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <button v-for="showtime in filteredShowtimes" :key="showtime.id"
                class="card bg-neutral-900 border border-neutral-800 hover:border-red-600 hover:-translate-y-0.5 transition text-left"
                @click="selectShowtime(showtime)">
                <div class="card-body p-5">
                    <p class="font-semibold">{{ formatDateTime(showtime.start_time) }}</p>
                    <p class="text-sm text-gray-400 mt-1" v-if="showtime.hall_name">
                        🎦 {{ showtime.hall_name }}
                    </p>
                    <p class="text-sm text-red-500 font-medium mt-2" v-if="showtime.price">
                        {{ showtime.price }}THB
                    </p>
                </div>
            </button>
        </div>
    </div>
</template>
