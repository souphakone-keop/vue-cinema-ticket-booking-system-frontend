<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { renderGoogleButton } from "../../composables/useGoogleAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const error = ref("");
const showSuccess = ref(false);
const googleBtn = ref(null);
const googleError = ref("");

const handleGoogleCredential = async (idToken) => {
    googleError.value = "";
    try {
        const res = await axios.post(`${API_BASE}/auth/google`, {
            id_token: idToken,
        });

        if (res.data?.token) {
            localStorage.setItem("token", res.data.token);
        }
        if (res.data?.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
        }

        router.push("/");
    } catch (err) {
        googleError.value = err.response?.data?.error || err.message;
    }
};

onMounted(() => {
    if (googleBtn.value) {
        renderGoogleButton(googleBtn.value, handleGoogleCredential);
    }
});

const register = async () => {
    error.value = "";

    if (password.value !== confirmPassword.value) {
        error.value = "Passwords do not match";
        return;
    }

    if (password.value.length < 6) {
        error.value = "Password must be at least 6 characters";
        return;
    }

    submitting.value = true;
    try {
        await axios.post(`${API_BASE}/users`, {
            name: name.value,
            email: email.value,
            password: password.value,
        });
        showSuccess.value = true;
        setTimeout(() => {
            router.push("/login");
        }, 1800);
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div
        class="min-h-screen bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center">
        <!-- Dark Overlay -->
        <div class="min-h-screen bg-black/75 flex items-center justify-center px-4 py-10">
            <div class="card w-full max-w-md bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-sm">
                <div class="card-body p-8">
                    <!-- Logo -->
                    <div class="flex justify-center mb-5">
                        <div
                            class="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center text-3xl shadow-lg">
                            🎬
                        </div>
                    </div>

                    <!-- Title -->
                    <div class="text-center">
                        <h1 class="text-3xl font-bold text-white">
                            Create Account
                        </h1>

                        <p class="mt-2 text-gray-400">
                            Join us and start booking your favorite movies.
                        </p>
                    </div>

                    <!-- Register Form -->
                    <form class="space-y-5 mt-8" @submit.prevent="register">
                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Full Name</span>
                            </label>

                            <input v-model="name" type="text" placeholder="John Doe" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Email</span>
                            </label>

                            <input v-model="email" type="email" placeholder="you@example.com" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Password</span>
                            </label>

                            <input v-model="password" type="password" placeholder="********" required minlength="6"
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Confirm Password</span>
                            </label>

                            <input v-model="confirmPassword" type="password" placeholder="********" required
                                minlength="6"
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div v-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2">
                            <span>⚠️ {{ error }}</span>
                        </div>

                        <button type="submit" :disabled="submitting"
                            class="btn w-full bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                            {{ submitting ? "Creating..." : "Create Account" }}
                        </button>
                    </form>

                    <div class="divider text-gray-500 my-6">
                        OR
                    </div>

                    <!-- Google Register -->
                    <div v-if="googleError"
                        class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2 mb-3">
                        <span>⚠️ {{ googleError }}</span>
                    </div>

                    <div ref="googleBtn" class="flex justify-center"></div>

                    <!-- Login -->
                    <router-link to="/login">
                        <div class="text-center mt-6">
                        <p class="text-gray-400">
                            Already have an account?
                        </p>

                        <a class="text-red-500 hover:text-red-400 font-semibold">
                            Sign In
                        </a>
                    </div>
                    </router-link>
                    
                </div>
            </div>
        </div>

        <!-- Success Popup -->
        <Transition name="fade">
            <div v-if="showSuccess"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                <Transition name="pop" appear>
                    <div v-if="showSuccess"
                        class="card w-full max-w-sm bg-neutral-900 border border-neutral-800 shadow-2xl">
                        <div class="card-body items-center text-center p-8">
                            <div
                                class="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-green-500" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-white">
                                Registered Successfully!
                            </h3>

                            <p class="mt-2 text-gray-400 text-sm">
                                Redirecting you to the login page...
                            </p>

                            <span class="loading loading-dots loading-md text-red-600 mt-4"></span>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.pop-enter-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-enter-from {
    opacity: 0;
    transform: scale(0.85) translateY(10px);
}
</style>