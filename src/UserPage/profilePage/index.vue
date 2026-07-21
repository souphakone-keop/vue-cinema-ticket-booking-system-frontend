<script setup>
import { ref, onMounted } from "vue";
import { http } from "../../lib/http";

const currentUser = ref(null);

const name = ref("");
const avatarUrl = ref("");
const infoSaving = ref(false);
const infoError = ref("");
const infoSuccess = ref(false);

const currentPassword = ref("");
const newPassword = ref("");
const confirmNewPassword = ref("");
const passwordSaving = ref(false);
const passwordError = ref("");
const passwordSuccess = ref(false);

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
}

const saveInfo = async () => {
    if (!currentUser.value) return;

    infoError.value = "";
    infoSuccess.value = false;
    infoSaving.value = true;
    try {
        const res = await http.put(`/users/${currentUser.value.id}`, {
            name: name.value,
            avatar_url: avatarUrl.value,
        });

        const updatedUser = res.data?.user || { ...currentUser.value, name: name.value, avatar_url: avatarUrl.value };
        currentUser.value = updatedUser;
        localStorage.setItem("user", JSON.stringify(updatedUser));

        infoSuccess.value = true;
        setTimeout(() => (infoSuccess.value = false), 3000);
    } catch (err) {
        infoError.value = err.response?.data?.error || err.message;
    } finally {
        infoSaving.value = false;
    }
};

const changePassword = async () => {
    if (!currentUser.value) return;

    passwordError.value = "";
    passwordSuccess.value = false;

    if (newPassword.value.length < 6) {
        passwordError.value = "New password must be at least 6 characters";
        return;
    }
    if (newPassword.value !== confirmNewPassword.value) {
        passwordError.value = "New passwords do not match";
        return;
    }

    passwordSaving.value = true;
    try {
        await http.put(`/users/${currentUser.value.id}`, {
            current_password: currentPassword.value,
            password: newPassword.value,
        });

        passwordSuccess.value = true;
        currentPassword.value = "";
        newPassword.value = "";
        confirmNewPassword.value = "";
        setTimeout(() => (passwordSuccess.value = false), 3000);
    } catch (err) {
        passwordError.value = err.response?.data?.error || err.message;
    } finally {
        passwordSaving.value = false;
    }
    
};
</script>

<template>
    <div class="min-h-screen bg-black text-white px-4 py-12 flex justify-center">
        <div class="w-full max-w-lg space-y-8">
            <div>
                <h1 class="text-3xl font-bold">Profile Settings</h1>
                <p class="text-gray-400 mt-1">Manage your account information.</p>
            </div>

            <!-- Profile Info Card -->
            <div class="card bg-neutral-900 border border-neutral-800">
                <div class="card-body p-8">
                    <div class="flex justify-center mb-6">
                        <div class="avatar">
                            <div class="w-24 h-24 rounded-full ring ring-red-600 ring-offset-4 ring-offset-neutral-900 bg-neutral-800 flex items-center justify-center text-3xl overflow-hidden">
                                <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="w-full h-full object-cover"
                                    @error="onAvatarError" />
                                <span v-else>👤</span>
                            </div>
                        </div>
                    </div>

                    <form class="space-y-5" @submit.prevent="saveInfo">
                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Full Name</span>
                            </label>

                            <input v-model="name" type="text" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Avatar Image URL</span>
                            </label>

                            <input v-model="avatarUrl" type="text" placeholder="https://example.com/avatar.jpg"
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Email</span>
                            </label>

                            <input :value="currentUser?.email" type="email" disabled
                                class="input w-full bg-neutral-800 border-neutral-700 text-gray-500" />
                        </div>

                        <div v-if="infoError" class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2">
                            <span>⚠️ {{ infoError }}</span>
                        </div>

                        <div v-if="infoSuccess" class="alert bg-neutral-900 border border-green-900/50 text-green-400 text-sm py-2">
                            <span>✅ Profile updated successfully</span>
                        </div>

                        <button type="submit" :disabled="infoSaving"
                            class="btn w-full bg-red-600 hover:bg-red-700 border-none text-white disabled:opacity-60">
                            <span v-if="infoSaving" class="loading loading-spinner loading-sm"></span>
                            {{ infoSaving ? "Saving..." : "Save Changes" }}
                        </button>
                    </form>
                </div>
            </div>

            <!-- Change Password Card -->
            <div class="card bg-neutral-900 border border-neutral-800">
                <div class="card-body p-8">
                    <h2 class="text-xl font-bold mb-1">Change Password</h2>
                    <p class="text-gray-400 text-sm mb-5">Update the password used to sign in.</p>

                    <form class="space-y-5" @submit.prevent="changePassword">
                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Current Password</span>
                            </label>

                            <input v-model="currentPassword" type="password" placeholder="********" required
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">New Password</span>
                            </label>

                            <input v-model="newPassword" type="password" placeholder="********" required minlength="6"
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div>
                            <label class="label">
                                <span class="label-text text-gray-300">Confirm New Password</span>
                            </label>

                            <input v-model="confirmNewPassword" type="password" placeholder="********" required
                                minlength="6"
                                class="input w-full bg-neutral-800 border-neutral-700 text-white placeholder:text-gray-500 focus:border-red-600" />
                        </div>

                        <div v-if="passwordError" class="alert bg-neutral-900 border border-red-900/50 text-red-400 text-sm py-2">
                            <span>⚠️ {{ passwordError }}</span>
                        </div>

                        <div v-if="passwordSuccess" class="alert bg-neutral-900 border border-green-900/50 text-green-400 text-sm py-2">
                            <span>✅ Password changed successfully</span>
                        </div>

                        <button type="submit" :disabled="passwordSaving"
                            class="btn w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white disabled:opacity-60">
                            <span v-if="passwordSaving" class="loading loading-spinner loading-sm"></span>
                            {{ passwordSaving ? "Updating..." : "Update Password" }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>
