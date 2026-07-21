<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.replace("/admin/login");
});
</script>

<template>
    <div class="min-h-screen bg-slate-100 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4 text-slate-800">
            <span class="loading loading-spinner loading-lg text-red-600"></span>
            <p class="text-slate-500">Signing out...</p>
        </div>
    </div>
</template>
