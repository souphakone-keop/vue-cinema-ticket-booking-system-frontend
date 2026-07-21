<script setup>
import { ref, computed, onMounted } from "vue";
import { adminHttp } from "../../lib/http";

const stats = ref({
    movies: 0,
    showtimes: 0,
    users: 0,
    bookings: 0,
});
const loading = ref(true);

const adminUser = computed(() => {
    try {
        return JSON.parse(localStorage.getItem("admin_user") || "null");
    } catch {
        return null;
    }
});

const cards = computed(() => [
    {
        label: "Movies",
        value: stats.value.movies,
        icon: "🎞️",
        to: "/admin/movies",
        iconBg: "bg-gradient-to-br from-red-100 to-red-50",
    },
    {
        label: "Showtimes",
        value: stats.value.showtimes,
        icon: "🕒",
        to: "/admin/showtimes",
        iconBg: "bg-gradient-to-br from-sky-100 to-sky-50",
    },
    {
        label: "Users",
        value: stats.value.users,
        icon: "👥",
        to: "/admin/users",
        iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-50",
    },
    {
        label: "Bookings",
        value: stats.value.bookings,
        icon: "🎟️",
        to: "/admin/bookings",
        iconBg: "bg-gradient-to-br from-amber-100 to-amber-50",
    },
]);

const quickActions = [
    { label: "Add Movie", icon: "➕", to: "/admin/movies" },
    { label: "Schedule Showtimes", icon: "🕒", to: "/admin/showtimes" },
    { label: "View Bookings", icon: "🎟️", to: "/admin/bookings" },
    { label: "Audit Logs", icon: "📜", to: "/admin/audit-logs" },
];

const fetchStats = async () => {
    loading.value = true;
    try {
        const [moviesRes, showtimesRes, usersRes, bookingsRes] = await Promise.allSettled([
            adminHttp.get("/movies"),
            adminHttp.get("/showtimes"),
            adminHttp.get("/users"),
            adminHttp.get("/admin/bookings"),
        ]);

        const count = (res, key) => {
            if (res.status !== "fulfilled") return 0;
            const data = res.value.data;
            if (Array.isArray(data)) return data.length;
            if (Array.isArray(data?.[key])) return data[key].length;
            return 0;
        };

        stats.value.movies = count(moviesRes, "movies");
        stats.value.showtimes = count(showtimesRes, "showtimes");
        stats.value.users = count(usersRes, "users");
        stats.value.bookings = count(bookingsRes, "bookings");
    } finally {
        loading.value = false;
    }
};

onMounted(fetchStats);
</script>

<template>
    <div class="p-8">
        <h1 class="text-2xl font-bold text-slate-900">
            Welcome back{{ adminUser?.name ? `, ${adminUser.name.split(" ")[0]}` : "" }} 👋
        </h1>
        <p class="mt-1 text-slate-500">
            Here's what's happening with your cinema system today.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            <RouterLink v-for="card in cards" :key="card.label" :to="card.to"
                class="card bg-white border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-red-200 transition-all">
                <div class="card-body p-5 flex-row items-center justify-between">
                    <div>
                        <p class="text-slate-500 text-sm">{{ card.label }}</p>
                        <p class="text-3xl font-bold text-slate-900 mt-1">
                            <span v-if="loading" class="loading loading-spinner loading-sm text-red-600"></span>
                            <template v-else>{{ card.value }}</template>
                        </p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" :class="card.iconBg">
                        {{ card.icon }}
                    </div>
                </div>
            </RouterLink>
        </div>

        <div class="mt-10">
            <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</h2>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <RouterLink v-for="action in quickActions" :key="action.label" :to="action.to"
                    class="card bg-white border border-slate-200 hover:border-red-300 hover:shadow-md transition-all">
                    <div class="card-body p-5 items-center text-center gap-2">
                        <span class="text-2xl">{{ action.icon }}</span>
                        <span class="text-sm font-medium text-slate-700">{{ action.label }}</span>
                    </div>
                </RouterLink>
            </div>
        </div>
    </div>
</template>
