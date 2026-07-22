<script setup>
import { ref, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

const bookings = ref([]);
const loading = ref(true);
const error = ref("");

const filters = ref({
    user_id: "",
    showtime_id: "",
    status: "",
    from: "",
    to: "",
});

const statusBadge = (status) => {
    switch ((status || "").toUpperCase()) {
        case "CONFIRMED":
            return "badge-success";
        case "EXPIRED":
            return "badge-warning";
        case "CANCELLED":
            return "badge-error";
        case "PENDING":
            return "badge-ghost";
        default:
            return "badge-ghost";
    }
};

const fetchBookings = async () => {
    loading.value = true;
    error.value = "";
    try {
        const params = Object.fromEntries(
            Object.entries(filters.value).filter(([, value]) => value)
        );
        const res = await adminHttp.get("/admin/bookings", { params });
        const rawBookings = res.data.bookings || (Array.isArray(res.data) ? res.data : []);

        // Show the most recent bookings first regardless of what order the
        // backend returns them in.
        bookings.value = [...rawBookings].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchBookings);

function resetFilters() {
    filters.value = { user_id: "", showtime_id: "", status: "", from: "", to: "" };
    fetchBookings();
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
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
// UTC fields directly instead of using `formatDate` above (which is
// correct for `created_at`, a genuine server timestamp).
function formatShowtime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
}
</script>

<template>
    <div class="p-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">Bookings</h1>
            <p class="mt-1 text-slate-500">View bookings across the system.</p>
        </div>

        <!-- Filters -->
        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6">
            <div class="card-body p-5">
                <form class="grid grid-cols-2 md:grid-cols-5 gap-3 items-end" @submit.prevent="fetchBookings">
                    <div>
                        <label class="label py-1"><span class="label-text text-xs">User ID</span></label>
                        <input v-model="filters.user_id" type="text" placeholder="user id"
                            class="input input-bordered input-sm w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label py-1"><span class="label-text text-xs">Showtime ID</span></label>
                        <input v-model="filters.showtime_id" type="text" placeholder="showtime id"
                            class="input input-bordered input-sm w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label py-1"><span class="label-text text-xs">Status</span></label>
                        <select v-model="filters.status" class="select select-bordered select-sm w-full bg-gray-100 text-gray-900">
                            <option value="">Any</option>
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="CANCELLED">CANCELLED</option>
                        </select>
                    </div>

                    <div>
                        <label class="label py-1"><span class="label-text text-xs">From</span></label>
                        <input v-model="filters.from" type="date" class="input input-bordered input-sm w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label py-1"><span class="label-text text-xs">To</span></label>
                        <input v-model="filters.to" type="date" class="input input-bordered input-sm w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div class="col-span-2 md:col-span-5 flex gap-2 justify-end">
                        <button type="button" class="btn btn-sm bg-slate-700 hover:bg-slate-800 border-none text-white" @click="resetFilters">
                            Clear
                        </button>
                        <button type="submit" class="btn btn-sm bg-red-600 hover:bg-red-700 border-none text-white">
                            Apply Filters
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div v-if="error" class="alert bg-red-50 border border-red-200 text-red-700 text-sm mt-6">
            <span>⚠️ {{ error }}</span>
        </div>

        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="table min-w-[1080px]">
                    <thead>
                        <tr class="text-slate-500 text-xs uppercase whitespace-nowrap bg-slate-50">
                            <th>Booking</th>
                            <th>User</th>
                            <th>Showtime</th>
                            <th>Hall</th>
                            <th>Seats</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="8" class="text-center py-10">
                                <span class="loading loading-spinner loading-md text-red-600"></span>
                            </td>
                        </tr>

                        <tr v-else-if="bookings.length === 0">
                            <td colspan="8" class="text-center py-10 text-slate-400">
                                No data found.
                            </td>
                        </tr>

                        <tr v-for="booking in bookings" :key="booking.id" class="hover whitespace-nowrap">
                            <td class="font-mono text-xs text-slate-500">{{ booking.id }}</td>
                            <td>
                                <p class="text-slate-900 font-medium">{{ booking.user_name || booking.user_id }}</p>
                                <p class="text-slate-500 text-xs">{{ booking.user_email }}</p>
                            </td>
                            <td class="text-slate-600">{{ formatShowtime(booking.showtime_start_time) }}</td>
                            <td class="text-slate-600">{{ booking.hall_name || "—" }}</td>
                            <td class="text-slate-600">
                                {{ (booking.seat_codes || []).join(", ") || (booking.seat_ids || []).length }}
                            </td>
                            <td class="text-slate-700 font-medium">{{ booking.total_price ?? 0 }}THB</td>
                            <td>
                                <span class="badge badge-sm" :class="statusBadge(booking.status)">
                                    {{ booking.status || "UNKNOWN" }}
                                </span>
                            </td>
                            <td class="text-slate-500 text-xs">{{ formatDate(booking.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
