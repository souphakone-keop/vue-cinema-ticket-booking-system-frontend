<script setup>
import { ref, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

// Bulk create shouldn't schedule showtimes in the past.
const todayDate = new Date().toISOString().slice(0, 10);

const showtimes = ref([]);
const movies = ref([]);
const loading = ref(true);
const error = ref("");

const deleteTarget = ref(null);

const generateMessage = ref("");
const generateError = ref("");

const showBulkModal = ref(false);
const bulkSaving = ref(false);
const bulkForm = ref({
    movie_id: "",
    hall_name: "",
    start_date: "",
    end_date: "",
    daily_time: "",
    total_rows: 10,
    total_columns: 10,
    price: "",
});
const bulkResults = ref([]);

function movieTitle(movieId) {
    return movies.value.find((m) => m.id === movieId)?.title || movieId;
}

const fetchData = async () => {
    loading.value = true;
    error.value = "";
    try {
        const [showtimesRes, moviesRes] = await Promise.all([
            adminHttp.get("/showtimes"),
            adminHttp.get("/movies"),
        ]);
        const rawShowtimes = showtimesRes.data.showtimes || (Array.isArray(showtimesRes.data) ? showtimesRes.data : []);

        // Show the most recently created showtimes first regardless of what
        // order the backend returns them in.
        showtimes.value = [...rawShowtimes].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        movies.value = moviesRes.data.movies || (Array.isArray(moviesRes.data) ? moviesRes.data : []);
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);

const openBulkCreate = () => {
    bulkForm.value = {
        movie_id: movies.value[0]?.id || "",
        hall_name: "",
        start_date: "",
        end_date: "",
        daily_time: "",
        total_rows: 10,
        total_columns: 10,
        price: "",
    };
    bulkResults.value = [];
    generateMessage.value = "";
    generateError.value = "";
    showBulkModal.value = true;
};

const saveBulkShowtimes = async () => {
    error.value = "";
    generateMessage.value = "";
    generateError.value = "";
    bulkResults.value = [];

    if (Number(bulkForm.value.total_rows) > 26) {
        error.value = "Rows can't exceed 26 — seat generation only supports single-letter rows (A-Z).";
        return;
    }

    if (bulkForm.value.start_date < todayDate) {
        error.value = "Start date can't be in the past.";
        return;
    }

    if (bulkForm.value.end_date < bulkForm.value.start_date) {
        error.value = "End date can't be before the start date.";
        return;
    }

    bulkSaving.value = true;
    try {
        const payload = {
            movie_id: bulkForm.value.movie_id,
            hall_name: bulkForm.value.hall_name,
            daily_time: bulkForm.value.daily_time,
            start_date: bulkForm.value.start_date,
            end_date: bulkForm.value.end_date,
            total_rows: Number(bulkForm.value.total_rows) || 0,
            total_columns: Number(bulkForm.value.total_columns) || 0,
            price: Number(bulkForm.value.price) || 0,
        };

        const res = await adminHttp.post("/showtimes/bulk", payload);
        const results = res.data.results || [];
        bulkResults.value = results;

        const createdDays = results.filter((r) => !r.skipped);
        const skippedDays = results.filter((r) => r.skipped);

        generateMessage.value =
            `Created ${createdDays.length} day${createdDays.length === 1 ? "" : "s"}` +
            (skippedDays.length > 0 ? `, skipped ${skippedDays.length} (hall conflict).` : ".");

        // Bulk creation isn't all-or-nothing, and it only creates the
        // showtime rows — not seats — for each day that succeeded. Generate
        // seats for every day that wasn't skipped; best-effort per day.
        let seatFailures = 0;
        for (const day of createdDays) {
            if (!day.id) continue;
            try {
                await adminHttp.post(`/showtimes/${day.id}/seats/generate`);
            } catch {
                seatFailures++;
            }
        }

        if (seatFailures > 0) {
            generateError.value = `${seatFailures} showtime(s) were created but seat generation failed for them — use "Generate Seats" on those rows to retry.`;
        }

        showBulkModal.value = false;
        await fetchData();
    } catch (err) {
        // Unlike single-create, bulk never 409s as a whole request — hall
        // conflicts are reported per-day in `results` instead. Any error
        // here is a whole-request rejection (bad movie_id, malformed
        // daily_time/dates, or end_date before start_date).
        error.value = err.response?.data?.error || err.message;
    } finally {
        bulkSaving.value = false;
    }
};

const confirmDelete = (showtime) => {
    deleteTarget.value = showtime;
};

const deleteShowtime = async () => {
    if (!deleteTarget.value) return;
    try {
        await adminHttp.delete(`/showtimes/${deleteTarget.value.id}`);
        deleteTarget.value = null;
        await fetchData();
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
        deleteTarget.value = null;
    }
};

function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
</script>

<template>
    <div class="p-8">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900">Showtimes</h1>
                <p class="mt-1 text-slate-500">Schedule screenings for your movies.</p>
            </div>

            <div class="flex gap-2">
                <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" :disabled="movies.length === 0"
                    @click="openBulkCreate">
                    + Add Showtime
                </button>
            </div>
        </div>

        <div v-if="error" class="alert bg-red-50 border border-red-200 text-red-700 text-sm mt-6">
            <span>⚠️ {{ error }}</span>
        </div>

        <div v-if="!loading && movies.length === 0"
            class="alert bg-amber-50 border border-amber-200 text-amber-700 text-sm mt-6">
            <span>⚠️ Add a movie first before creating showtimes.</span>
        </div>

        <div v-if="generateMessage" class="alert bg-green-50 border border-green-200 text-green-700 text-sm mt-6">
            <span>✅ {{ generateMessage }}</span>
        </div>

        <div v-if="generateError" class="alert bg-red-50 border border-red-200 text-red-700 text-sm mt-6">
            <span>⚠️ {{ generateError }}</span>
        </div>

        <!-- Bulk Create Results Checklist -->
        <div v-if="bulkResults.length > 0" class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6">
            <div class="card-body p-5">
                <h3 class="font-semibold text-slate-900 text-sm">Bulk Create Results</h3>
                <ul class="mt-2 space-y-1.5 text-sm">
                    <li v-for="day in bulkResults" :key="day.date" class="flex items-center gap-2">
                        <span v-if="!day.skipped" class="text-green-600">✅</span>
                        <span v-else class="text-amber-600">⏭️</span>
                        <span class="text-slate-700">{{ day.date }}</span>
                        <span v-if="day.skipped" class="text-slate-500">— skipped ({{ day.reason }})</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="table min-w-[900px]">
                    <thead>
                        <tr class="text-slate-500 text-xs uppercase whitespace-nowrap bg-slate-50">
                            <th>Movie</th>
                            <th>Hall</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Seats</th>
                            <th>Price</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="7" class="text-center py-10">
                                <span class="loading loading-spinner loading-md text-red-600"></span>
                            </td>
                        </tr>

                        <tr v-else-if="showtimes.length === 0">
                            <td colspan="7" class="text-center py-10 text-slate-400">
                                No data found.
                            </td>
                        </tr>

                        <tr v-for="showtime in showtimes" :key="showtime.id" class="hover whitespace-nowrap">
                            <td class="font-medium text-slate-900">{{ movieTitle(showtime.movie_id) }}</td>
                            <td class="text-slate-600">{{ showtime.hall_name || "—" }}</td>
                            <td class="text-slate-600">{{ formatDateTime(showtime.start_time) }}</td>
                            <td class="text-slate-600">{{ formatDateTime(showtime.end_time) }}</td>
                            <td class="text-slate-600">
                                {{ showtime.total_rows }}×{{ showtime.total_columns }}
                            </td>
                            <td class="text-slate-700 font-medium">{{ showtime.price }}THB</td>
                            <td class="text-right">
                                <button class="btn btn-xs btn-ghost text-red-600" @click="confirmDelete(showtime)">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Bulk Create Modal -->
        <dialog class="modal" :class="{ 'modal-open': showBulkModal }">
            <div class="modal-box bg-white text-slate-800 max-w-lg">
                <h3 class="text-lg font-bold text-slate-900">Create Showtimes</h3>
                <p class="text-sm text-slate-500 mt-1">
                    Creates one showtime per day in the date range, all at the same time.
                </p>

                <form class="space-y-4 mt-4" @submit.prevent="saveBulkShowtimes">
                    <div>
                        <label class="label"><span class="label-text">Movie</span></label>
                        <select v-model="bulkForm.movie_id" required
                            class="select select-bordered w-full bg-gray-100 text-gray-900">
                            <option v-for="movie in movies" :key="movie.id" :value="movie.id">
                                {{ movie.title }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="label"><span class="label-text">Hall Name</span></label>
                        <input v-model="bulkForm.hall_name" type="text" required placeholder="Cinema 1"
                            class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="label"><span class="label-text">Start Date</span></label>
                            <input v-model="bulkForm.start_date" type="date" :min="todayDate" required
                                class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>

                        <div>
                            <label class="label"><span class="label-text">End Date</span></label>
                            <input v-model="bulkForm.end_date" type="date" :min="bulkForm.start_date || todayDate"
                                required class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label class="label"><span class="label-text">Daily Time</span></label>
                        <input v-model="bulkForm.daily_time" type="time" required
                            class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="label"><span class="label-text">Rows (max 26)</span></label>
                            <input v-model="bulkForm.total_rows" type="number" min="1" max="26" required
                                class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>

                        <div>
                            <label class="label"><span class="label-text">Columns</span></label>
                            <input v-model="bulkForm.total_columns" type="number" min="1" required
                                class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>

                        <div>
                            <label class="label"><span class="label-text">Price</span></label>
                            <input v-model="bulkForm.price" type="number" min="0" step="0.01" required
                                class="input input-bordered w-full bg-gray-100 text-gray-900" />
                        </div>
                    </div>

                    <div class="modal-action">
                        <button type="button" class="btn btn-dark" @click="showBulkModal = false">
                            Cancel
                        </button>

                        <button type="submit" :disabled="bulkSaving"
                            class="btn bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                            <span v-if="bulkSaving" class="loading loading-spinner loading-sm"></span>
                            {{ bulkSaving ? "Creating..." : "Create Showtimes" }}
                        </button>
                    </div>
                </form>
            </div>

            <form method="dialog" class="modal-backdrop" @click="showBulkModal = false">
                <button>close</button>
            </form>
        </dialog>

        <!-- Delete Confirm Modal -->
        <dialog class="modal" :class="{ 'modal-open': !!deleteTarget }">
            <div class="modal-box bg-white text-slate-800">
                <h3 class="text-lg font-bold text-slate-900">Delete Showtime</h3>
                <p class="mt-3 text-slate-600">
                    Are you sure you want to delete this showtime
                    (<span class="font-semibold">{{ movieTitle(deleteTarget?.movie_id) }}</span>,
                    {{ formatDateTime(deleteTarget?.start_time) }})? This cannot be undone.
                </p>

                <div class="modal-action">
                    <button class="btn btn-dark" @click="deleteTarget = null">Cancel</button>
                    <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="deleteShowtime">
                        Delete
                    </button>
                </div>
            </div>

            <form method="dialog" class="modal-backdrop" @click="deleteTarget = null">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
