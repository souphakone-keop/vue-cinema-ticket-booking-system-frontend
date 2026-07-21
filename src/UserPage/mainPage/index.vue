<script setup>

import NavBar from "../navBar/index.vue";

import Footer from "../footer/index.vue";

</script>

<template>
    <div class="min-h-screen bg-black text-white flex flex-col">
        <NavBar />
        <main class="flex-1">
            <router-view />
        </main>
        <Footer />
    </div>
</template>

<style scoped></style>