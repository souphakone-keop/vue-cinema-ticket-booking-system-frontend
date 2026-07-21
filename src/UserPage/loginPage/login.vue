<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { renderGoogleButton } from "../../composables/useGoogleAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const router = useRouter();

const email = ref("");
const password = ref("");
const submitting = ref(false);
const error = ref("");
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

const login = async () => {
    error.value = "";
    submitting.value = true;
    try {
        const res = await axios.post(`${API_BASE}/auth/login`, {
            email: email.value,
            password: password.value,
        });

        if (res.data?.token) {
            localStorage.setItem("token", res.data.token);
        }
        if (res.data?.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
        }

        console.log(res.data.user);

        router.push("/");
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
        <div class="min-h-screen bg-black/75 flex items-center justify-center px-4">
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
                            Welcome Back
                        </h1>

                        <p class="mt-2 text-gray-400">
                            Sign in to continue booking your favorite movies.
                        </p>
                    </div>

                    <!-- Login Form -->
                    <form class="space-y-5 mt-8" @submit.prevent="login">
                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Email</span>
                            </label>

                            <input v-model="email" type="email" placeholder="you@example.com" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600 focus:outline-none" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Password</span>
                            </label>

                            <input v-model="password" type="password" placeholder="********" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600 focus:outline-none" />
                        </div>

                        <div v-if="error" class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2">
                            <span>⚠️ {{ error }}</span>
                        </div>

                        <div class="flex justify-between items-center text-sm">


                            <a href="#" class="text-red-500 hover:text-red-400 transition">
                                Forgot password?
                            </a>
                        </div>

                        <button type="submit" :disabled="submitting"
                            class="btn w-full bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                            {{ submitting ? "Signing in..." : "Login" }}
                        </button>
                    </form>

                    <div class="divider text-gray-500 my-6">
                        OR
                    </div>

                    <!-- Google Login -->
                    <div v-if="googleError"
                        class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2 mb-3">
                        <span>⚠️ {{ googleError }}</span>
                    </div>

                    <div ref="googleBtn" class="flex justify-center"></div>

                    <!-- Register -->
                    <router-link to="/register">
                        <div class="text-center mt-6">
                            <p class="text-gray-400">
                                Don't have an account?
                            </p>

                            <a class="text-red-500 hover:text-red-400 font-semibold">
                                Create an account
                            </a>
                        </div>
                    </router-link>

                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
input::placeholder {
    color: #737373;
}
</style>
