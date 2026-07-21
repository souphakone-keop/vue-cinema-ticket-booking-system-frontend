<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const router = useRouter();

const email = ref("");
const password = ref("");
const submitting = ref(false);
const error = ref("");

const login = async () => {
    error.value = "";
    submitting.value = true;
    try {
        const res = await axios.post(`${API_BASE}/auth/login`, {
            email: email.value,
            password: password.value,
        });

        const user = res.data?.user;
        if (user && user.role !== "ADMIN") {
            error.value = "This account does not have admin access.";
            return;
        }

        if (res.data?.token) {
            localStorage.setItem("admin_token", res.data.token);
        }
        if (user) {
            localStorage.setItem("admin_user", JSON.stringify(user));
        }

        router.push("/admin");
    } catch (err) {
        error.value = err.response?.data?.error || err.message;
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div class="card w-full max-w-md bg-white border border-slate-200 shadow-xl">
            <div class="card-body p-8">
                <!-- Logo -->
                <div class="flex justify-center mb-5">
                    <div
                        class="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center text-3xl shadow-lg">
                        🛡️
                    </div>
                </div>

                <!-- Title -->
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-slate-900">
                        Admin Login
                    </h1>

                    <p class="mt-2 text-slate-500">
                        Sign in to manage the cinema system.
                    </p>
                </div>

                <!-- Login Form -->
                <form class="space-y-5 mt-8" @submit.prevent="login">
                    <div>
                        <label class="label">
                            <span class="label-text text-slate-600">Email</span>
                        </label>

                        <input v-model="email" type="email" placeholder="admin@example.com" required
                            class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div>
                        <label class="label">
                            <span class="label-text text-slate-600">Password</span>
                        </label>

                        <input v-model="password" type="password" placeholder="********" required
                            class="input input-bordered w-full bg-gray-100 text-gray-900" />
                    </div>

                    <div v-if="error" class="alert bg-red-50 border border-red-200 text-red-700 text-sm py-2">
                        <span>⚠️ {{ error }}</span>
                    </div>

                    <button type="submit" :disabled="submitting"
                        class="btn w-full bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                        <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
                        {{ submitting ? "Signing in..." : "Login" }}
                    </button>
                </form>

                <div class="text-center mt-6">
                    <RouterLink to="/" class="text-sm text-slate-500 hover:text-slate-700">
                        ← Back to site 
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>
