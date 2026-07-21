<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const showLogoutModal = ref(false);

const adminUser = computed(() => {
    try {
        return JSON.parse(localStorage.getItem("admin_user") || "null");
    } catch {
        return null;
    }
});

const navItems = [
    { to: "/admin", label: "Dashboard", icon: "📊", exact: true },
    { to: "/admin/movies", label: "Movies", icon: "🎞️" },
    { to: "/admin/showtimes", label: "Showtimes", icon: "🕒" },
    { to: "/admin/bookings", label: "Bookings", icon: "🎟️" },
    { to: "/admin/users", label: "Users", icon: "👥" },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: "📜" },
];

const isActive = (item) =>
    item.exact ? route.path === item.to : route.path.startsWith(item.to);

const currentPage = computed(() => navItems.find(isActive) || navItems[0]);

const confirmLogout = () => {
    showLogoutModal.value = false;
    router.push("/admin/logout");
};
</script>

<template>
    <div class="min-h-screen bg-slate-50 text-slate-800 flex">
        <!-- Sidebar -->
        <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div class="h-16 flex items-center px-6 border-b border-slate-200">
                <RouterLink to="/admin" class="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                    <span
                        class="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-base shadow-sm shadow-red-200">🎬</span>
                    <span>Admin Panel</span>
                </RouterLink>
            </div>

            <nav class="flex-1 px-3 py-5 space-y-1">
                <p class="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Menu
                </p>

                <RouterLink v-for="item in navItems" :key="item.to" :to="item.to"
                    class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    :class="isActive(item)
                        ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'">
                    <span class="text-base">{{ item.icon }}</span>
                    {{ item.label }}
                </RouterLink>
            </nav>

            <div class="p-3 border-t border-slate-200">
                <div class="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50">
                    <div class="avatar placeholder">
                        <div
                            class="w-9 h-9 rounded-full ring-2 ring-red-500 ring-offset-2 ring-offset-white bg-red-100 text-red-700 flex items-center justify-center">
                            <img v-if="adminUser?.avatar_url" :src="adminUser.avatar_url" :alt="adminUser?.name"
                                class="w-full h-full rounded-full object-cover" />
                            <span v-else class="text-sm font-semibold leading-none">
                                {{ (adminUser?.name || "?").charAt(0).toUpperCase() }}
                            </span>
                        </div>
                    </div>

                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold truncate text-slate-900">
                            {{ adminUser?.name || "Admin" }}
                        </p>
                        <p class="text-xs text-slate-500 truncate">
                            {{ adminUser?.email || "admin@cinema.com" }}
                        </p>
                    </div>
                </div>

                <button
                    class="btn btn-sm w-full mt-2 bg-white hover:bg-red-600 hover:text-white border border-slate-200 hover:border-red-600 text-slate-600 transition-colors"
                    @click="showLogoutModal = true">
                    🚪 Sign Out
                </button>
            </div>
        </aside>

        <!-- Content -->
        <div class="flex-1 flex flex-col min-w-0">
            <header class="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
                <div class="flex items-center gap-2 text-sm">
                    <span class="text-slate-400">Admin</span>
                    <span class="text-slate-300">/</span>
                    <span class="font-semibold text-slate-900">{{ currentPage.label }}</span>
                </div>

             
            </header>

            <main class="flex-1 overflow-y-auto">
                <router-view />
            </main>
        </div>

        <!-- Logout Modal -->
        <dialog class="modal" :class="{ 'modal-open': showLogoutModal }">
            <div class="modal-box bg-white text-slate-800">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-3xl">
                        🚪
                    </div>

                    <div>
                        <h3 class="text-xl font-bold">
                            Sign Out
                        </h3>

                        <p class="text-sm text-slate-500">
                            Logout Confirmation
                        </p>
                    </div>
                </div>

                <div class="py-6">
                    <p class="text-slate-600">
                        Are you sure you want to sign out of the admin panel?
                    </p>
                </div>

                <div class="modal-action">
                    <button class="btn btn-dark" @click="showLogoutModal = false">
                        Cancel
                    </button>

                    <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="confirmLogout">
                        Sign Out
                    </button>
                </div>
            </div>

            <form method="dialog" class="modal-backdrop" @click="showLogoutModal = false">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
