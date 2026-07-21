<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const showLogoutModal = ref(false);
const currentUser = ref(null);
const name = ref("");
const avatarUrl = ref("");

const logout = () => {
    showLogoutModal.value = false;

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
};

onMounted(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
        currentUser.value = JSON.parse(raw);
        name.value = currentUser.value.name || "";
        avatarUrl.value = currentUser.value.avatar_url || "";
    }
});

function onAvatarError(event) {
    event.target.style.display = "none";
    event.target.nextElementSibling?.classList.remove("hidden");
}
</script>

<template>
    <!-- Navbar -->
    <div class="navbar bg-black/90 backdrop-blur sticky top-0 z-50 px-8">
        <!-- Logo -->
        <div class="flex-1">
            <RouterLink to="/" class="text-3xl font-extrabold text-red-600 hover:text-red-500 transition">
                🎬 Souphakone-Cinema 
            </RouterLink>
        </div>

        <!-- Menu -->
        <div class="flex items-center gap-3">
            <RouterLink to="/" class="btn btn-ghost text-white hover:bg-neutral-800">
                Home
            </RouterLink>

<RouterLink to="/my-ticket" class="btn btn-ghost text-white hover:bg-neutral-800">
                My Tickets
            </RouterLink>

            <!-- User Dropdown -->
            <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="cursor-pointer">
                    <div class="avatar" :class="{ placeholder: !avatarUrl }">
                        <div
                            class="w-10 rounded-full ring ring-red-600 ring-offset-2 ring-offset-black hover:scale-105 transition bg-neutral-800 text-white flex items-center justify-center">
                            <img v-if="avatarUrl" :src="avatarUrl" alt="User Avatar" @error="onAvatarError" />
                            <span v-else class="text-sm font-semibold">
                                {{ (name || "?").charAt(0).toUpperCase() }}
                            </span>
                            <span class="hidden text-sm font-semibold">
                                {{ (name || "?").charAt(0).toUpperCase() }}
                            </span>
                        </div>
                    </div>
                </div>

                <ul tabindex="0"
                    class="dropdown-content z-[100] menu p-2 shadow-xl bg-neutral-900 rounded-box w-64 border border-neutral-700 mt-3">
                    <li class="menu-title text-white">
                        <span>{{ name || "Account" }}</span>
                    </li>

                    <li>
                        <RouterLink to="/profile">
                            👤 Profile
                        </RouterLink>
                    </li>


                    <li>
                        <RouterLink to="/my-ticket">
                            🎟 My Tickets
                        </RouterLink>
                    </li>

                    <div class="divider my-1"></div>

                    <li>
                        <button class="text-red-500 hover:bg-red-600 hover:text-white" @click="showLogoutModal = true">
                            🚪 Sign Out
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Logout Modal -->
    <dialog class="modal" :class="{ 'modal-open': showLogoutModal }">
        <div class="modal-box bg-neutral-900 border border-neutral-700 text-white">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-3xl">
                    🚪
                </div>

                <div>
                    <h3 class="text-xl font-bold">
                        Sign Out
                    </h3>

                    <p class="text-sm text-gray-400">
                        Logout Confirmation
                    </p>
                </div>
            </div>

            <div class="py-6">
                <p class="text-gray-300">
                    Are you sure you want to sign out of your account?
                </p>

                <p class="text-sm text-gray-500 mt-2">
                    You will need to sign in again to access your account.
                </p>
            </div>

            <div class="modal-action">
                <button class="btn btn-dark text-white" @click="showLogoutModal = false">
                    Cancel
                </button>

                <button class="btn bg-red-600 hover:bg-red-700 border-none text-white" @click="logout">
                    Sign Out
                </button>
            </div>
        </div>

        <form method="dialog" class="modal-backdrop" @click="showLogoutModal = false">
            <button>close</button>
        </form>
    </dialog>
</template>

<style scoped>
 
</style>