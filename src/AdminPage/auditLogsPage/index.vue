<script setup>
import { ref, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

const logs = ref([]);
const loading = ref(true);
const error = ref("");

const filters = ref({
    user_id: "",
    event_type: "",
});

const eventTypes = [
    "BOOKING_SUCCESS",
    "BOOKING_TIMEOUT",
    "SEAT_RELEASED",
    "SYSTEM_ERROR",
];

const eventBadge = (type) => {
    switch (type) {
        case "BOOKING_SUCCESS":
            return "badge-success";
        case "BOOKING_TIMEOUT":
            return "badge-warning";
        case "SEAT_RELEASED":
            return "badge-info";
        case "SYSTEM_ERROR":
            return "badge-error";
        default:
            return "badge-ghost";
    }
};

const fetchLogs = async () => {
    loading.value = true;
    error.value = "";
    try {
        const params = Object.fromEntries(
            Object.entries(filters.value).filter(([, value]) => value)
        );
        const res = await adminHttp.get("/admin/audit-logs", { params });
        const rawLogs = res.data.audit_logs || res.data.logs || (Array.isArray(res.data) ? res.data : []);

        // Show the most recent events first regardless of what order the
        // backend returns them in.
        logs.value = [...rawLogs].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        loading.value = false;
    }
};

onMounted(fetchLogs);

function resetFilters() {
    filters.value = { user_id: "", event_type: "" };
    fetchLogs();
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
</script>

<template>
    <div class="p-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">Audit Logs</h1>
            <p class="mt-1 text-slate-500">System events for bookings and seat locks.</p>
        </div>

        <!-- Filters -->
        <div class="card bg-white border border-slate-200 rounded-2xl shadow-sm mt-6">
            <div class="card-body p-5">
                <form class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" @submit.prevent="fetchLogs">
                    <div>
                        <label class="label py-1"><span class="label-text text-xs">User ID</span></label>
                        <input v-model="filters.user_id" type="text" placeholder="user id"
                            class="input input-bordered input-sm w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label py-1"><span class="label-text text-xs">Event Type</span></label>
                        <select v-model="filters.event_type" class="select select-bordered select-sm w-full bg-gray-100 text-gray-900">
                            <option value="">Any</option>
                            <option v-for="type in eventTypes" :key="type" :value="type">{{ type }}</option>
                        </select>
                    </div>

                    <div class="flex gap-2 md:col-start-4 justify-end">
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
                <table class="table min-w-[840px]">
                    <thead>
                        <tr class="text-slate-500 text-xs uppercase whitespace-nowrap bg-slate-50">
                            <th>Event</th>
                            <th>Message</th>
                            <th>User ID</th>
                            <th>Booking ID</th>
                            <th>Seat ID</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="6" class="text-center py-10">
                                <span class="loading loading-spinner loading-md text-red-600"></span>
                            </td>
                        </tr>

                        <tr v-else-if="logs.length === 0">
                            <td colspan="6" class="text-center py-10 text-slate-400">
                                No data found.
                            </td>
                        </tr>

                        <tr v-for="log in logs" :key="log.id" class="hover whitespace-nowrap">
                            <td>
                                <span class="badge badge-sm" :class="eventBadge(log.event_type)">
                                    {{ log.event_type }}
                                </span>
                            </td>
                            <td class="text-slate-700">{{ log.message || "—" }}</td>
                            <td class="font-mono text-xs text-slate-500">{{ log.user_id || "—" }}</td>
                            <td class="font-mono text-xs text-slate-500">{{ log.booking_id || "—" }}</td>
                            <td class="font-mono text-xs text-slate-500">{{ log.seat_id || "—" }}</td>
                            <td class="text-slate-500 text-xs">{{ formatDate(log.created_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
